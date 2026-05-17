import { asyncServices, formatCurrency } from '@/lib/buying-flow';
import { getDeliveryMilestoneTemplate } from '@/lib/delivery-milestones';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import type { DashboardNote } from '@/lib/dashboard-tasks';

type PaymentRow = {
  payment_id: string;
  service_slug: string;
  amount: number;
  status: string;
  buyer_email: string | null;
  buyer_name: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type ClientDeliveryRow = {
  id: string;
  payment_id: string;
  stage_name: string;
  stage_order: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type IntakeSubmissionRow = {
  id: string;
  payment_id: string;
  service_slug: string;
  form_data: Record<string, unknown>;
  cv_file_url: string | null;
  submitted_at: string;
  duplicate_attempt: boolean;
};

type DiagnosticRow = {
  id: string;
  email: string;
  archetype_name: string | null;
  lead_status: string | null;
  submitted_at: string;
};

type SentEmailRow = {
  to_email: string;
  subject: string;
  sent_at: string;
  template_id: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  linked_task_id: string | null;
  linked_lead_id: string | null;
  linked_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientMilestone = {
  id: string;
  stageName: string;
  stageOrder: number;
  completed: boolean;
  completedAt: string | null;
};

export type ClientRecord = {
  paymentId: string;
  buyerName: string;
  buyerEmail: string;
  serviceSlug: string;
  serviceName: string;
  amount: number;
  amountLabel: string;
  confirmedAt: string;
  milestones: ClientMilestone[];
  currentStage: string;
  currentStageOrder: number | null;
  completedCount: number;
  totalMilestones: number;
  isDelivered: boolean;
  deliveredAt: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  deadline: string | null;
  hasIntake: boolean;
  intake: IntakeSubmissionRow | null;
  archetype: string | null;
  diagnosticId: string | null;
  recentEmails: { subject: string; sentAt: string; templateId: string | null }[];
  notes: DashboardNote[];
};

const CLIENT_DELIVERY_SELECT =
  'id, payment_id, stage_name, stage_order, completed, completed_at, created_at';
const PAYMENT_SELECT =
  'payment_id, service_slug, amount, status, buyer_email, buyer_name, created_at, confirmed_at';
const INTAKE_SELECT =
  'id, payment_id, service_slug, form_data, cv_file_url, submitted_at, duplicate_attempt';
const NOTE_SELECT =
  'id, body, linked_task_id, linked_lead_id, linked_payment_id, created_at, updated_at';

function isMissingOptionalClientTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('client_deliveries') ||
        message.includes('sent_emails') ||
        message.includes('notes') ||
        message.includes('schema cache'))
  );
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function addWorkingDays(startDate: Date, days: number) {
  let count = 0;
  const date = new Date(startDate);

  while (count < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }

  return date;
}

function countWorkingDaysAfter(startDate: Date, endDate: Date) {
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }

  return count;
}

function normalizeMilestones(paymentId: string, serviceSlug: string, rows: ClientDeliveryRow[]) {
  const sourceRows = rows.length
    ? rows
    : (getDeliveryMilestoneTemplate(serviceSlug) || []).map((milestone) => ({
        id: `template-${paymentId}-${milestone.stageOrder}`,
        payment_id: paymentId,
        stage_name: milestone.stageName,
        stage_order: milestone.stageOrder,
        completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
      }));

  return sourceRows
    .map((row) => ({
      id: row.id,
      stageName: row.stage_name,
      stageOrder: Number(row.stage_order),
      completed: Boolean(row.completed),
      completedAt: row.completed_at || null,
    }))
    .sort((left, right) => left.stageOrder - right.stageOrder);
}

function normalizeNote(row: NoteRow): DashboardNote {
  return {
    id: row.id,
    body: row.body,
    linkedTaskId: row.linked_task_id || undefined,
    linkedLeadId: row.linked_lead_id || undefined,
    linkedPaymentId: row.linked_payment_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getClientSortBucket(client: ClientRecord) {
  if (client.isDelivered) return 3;
  if (!client.hasIntake) return 2;
  if (client.isOverdue) return 0;
  return 1;
}

function sortClients(left: ClientRecord, right: ClientRecord) {
  const leftBucket = getClientSortBucket(left);
  const rightBucket = getClientSortBucket(right);
  if (leftBucket !== rightBucket) return leftBucket - rightBucket;

  if (leftBucket === 0) return right.daysOverdue - left.daysOverdue;
  if (leftBucket === 1) {
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  }
  if (leftBucket === 3) {
    return new Date(right.deliveredAt || right.confirmedAt).getTime() - new Date(left.deliveredAt || left.confirmedAt).getTime();
  }

  return new Date(right.confirmedAt).getTime() - new Date(left.confirmedAt).getTime();
}

export function buildClientList(
  payments: PaymentRow[],
  deliveries: ClientDeliveryRow[],
  intakes: IntakeSubmissionRow[],
  diagnostics: DiagnosticRow[],
  sentEmails: SentEmailRow[],
  notes: NoteRow[] = []
) {
  const deliveriesByPayment = deliveries.reduce<Record<string, ClientDeliveryRow[]>>((acc, delivery) => {
    acc[delivery.payment_id] = [...(acc[delivery.payment_id] || []), delivery];
    return acc;
  }, {});
  const intakesByPayment = intakes.reduce<Record<string, IntakeSubmissionRow>>((acc, intake) => {
    if (!acc[intake.payment_id]) acc[intake.payment_id] = intake;
    return acc;
  }, {});
  const diagnosticsByEmail = diagnostics.reduce<Record<string, DiagnosticRow>>((acc, diagnostic) => {
    const email = normalizeEmail(diagnostic.email);
    if (email && !acc[email]) acc[email] = diagnostic;
    return acc;
  }, {});
  const emailsByAddress = sentEmails.reduce<Record<string, SentEmailRow[]>>((acc, email) => {
    const key = normalizeEmail(email.to_email);
    acc[key] = [...(acc[key] || []), email];
    return acc;
  }, {});
  const notesByPayment = notes.reduce<Record<string, DashboardNote[]>>((acc, note) => {
    if (!note.linked_payment_id) return acc;
    acc[note.linked_payment_id] = [...(acc[note.linked_payment_id] || []), normalizeNote(note)];
    return acc;
  }, {});

  return payments
    .map((payment) => {
      const service = asyncServices[payment.service_slug as keyof typeof asyncServices];
      const confirmedAt = payment.confirmed_at || payment.created_at;
      const paymentEmail = normalizeEmail(payment.buyer_email);
      const intake = intakesByPayment[payment.payment_id] || null;
      const intakeEmail = normalizeEmail(String(intake?.form_data?.email || ''));
      const buyerEmail = payment.buyer_email || String(intake?.form_data?.email || '');
      const diagnostic = diagnosticsByEmail[paymentEmail] || diagnosticsByEmail[intakeEmail] || null;
      const milestones = normalizeMilestones(
        payment.payment_id,
        payment.service_slug,
        deliveriesByPayment[payment.payment_id] || []
      );
      const completedCount = milestones.filter((milestone) => milestone.completed).length;
      const totalMilestones = milestones.length;
      const isDelivered = totalMilestones > 0 && completedCount === totalMilestones;
      const deliveredAt = milestones
        .map((milestone) => milestone.completedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || null;
      const currentMilestone = milestones.find((milestone) => !milestone.completed) || null;
      const deadline = service ? addWorkingDays(new Date(confirmedAt), service.deliveryDays).toISOString() : null;
      const deadlineEnd = deadline ? new Date(deadline) : null;
      if (deadlineEnd) deadlineEnd.setHours(23, 59, 59, 999);
      const isOverdue = Boolean(
        intake &&
          !isDelivered &&
          deadlineEnd &&
          deadlineEnd.getTime() < Date.now()
      );

      return {
        paymentId: payment.payment_id,
        buyerName:
          payment.buyer_name ||
          String(intake?.form_data?.fullName || '').trim() ||
          buyerEmail.split('@')[0] ||
          'Client',
        buyerEmail,
        serviceSlug: payment.service_slug,
        serviceName: service?.title || payment.service_slug,
        amount: Number(payment.amount || 0),
        amountLabel: formatCurrency(Number(payment.amount || 0)),
        confirmedAt,
        milestones,
        currentStage: currentMilestone?.stageName || (isDelivered ? 'Delivered' : 'Milestones not generated'),
        currentStageOrder: currentMilestone?.stageOrder || null,
        completedCount,
        totalMilestones,
        isDelivered,
        deliveredAt,
        isOverdue,
        daysOverdue: isOverdue && deadlineEnd ? countWorkingDaysAfter(deadlineEnd, new Date()) : 0,
        deadline,
        hasIntake: Boolean(intake),
        intake,
        archetype: diagnostic?.archetype_name || null,
        diagnosticId: diagnostic?.id || null,
        recentEmails: (emailsByAddress[paymentEmail] || emailsByAddress[intakeEmail] || [])
          .slice(0, 3)
          .map((email) => ({
            subject: email.subject,
            sentAt: email.sent_at,
            templateId: email.template_id || null,
          })),
        notes: notesByPayment[payment.payment_id] || [],
      } satisfies ClientRecord;
    })
    .sort(sortClients);
}

export async function listClientRecords() {
  const supabase = createSupabaseServiceClient();
  const paymentResult = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false })
    .limit(250);

  if (paymentResult.error) throw new Error(paymentResult.error.message);

  const payments = (paymentResult.data || []) as PaymentRow[];
  const paymentIds = payments.map((payment) => payment.payment_id);
  const emails = [...new Set(payments.map((payment) => normalizeEmail(payment.buyer_email)).filter(Boolean))];

  if (paymentIds.length === 0) return [];

  const [deliveryResult, intakeResult, diagnosticResult, sentEmailResult, noteResult] = await Promise.all([
    supabase.from('client_deliveries').select(CLIENT_DELIVERY_SELECT).in('payment_id', paymentIds),
    supabase
      .from('intake_submissions')
      .select(INTAKE_SELECT)
      .in('payment_id', paymentIds)
      .eq('duplicate_attempt', false)
      .order('submitted_at', { ascending: false }),
    emails.length
      ? supabase
          .from('diagnostic_submissions')
          .select('id, email, archetype_name, lead_status, submitted_at')
          .in('email', emails)
          .order('submitted_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    emails.length
      ? supabase
          .from('sent_emails')
          .select('to_email, subject, sent_at, template_id')
          .in('to_email', emails)
          .order('sent_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('notes')
      .select(NOTE_SELECT)
      .in('linked_payment_id', paymentIds)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (intakeResult.error) throw new Error(intakeResult.error.message);
  if (diagnosticResult.error) throw new Error(diagnosticResult.error.message);

  const deliveries =
    deliveryResult.error && isMissingOptionalClientTable(deliveryResult.error.message)
      ? []
      : ((deliveryResult.data || []) as ClientDeliveryRow[]);
  if (deliveryResult.error && deliveries.length === 0 && !isMissingOptionalClientTable(deliveryResult.error.message)) {
    throw new Error(deliveryResult.error.message);
  }

  const sentEmails =
    sentEmailResult.error && isMissingOptionalClientTable(sentEmailResult.error.message)
      ? []
      : ((sentEmailResult.data || []) as SentEmailRow[]);
  if (sentEmailResult.error && sentEmails.length === 0 && !isMissingOptionalClientTable(sentEmailResult.error.message)) {
    throw new Error(sentEmailResult.error.message);
  }

  const notes =
    noteResult.error && isMissingOptionalClientTable(noteResult.error.message)
      ? []
      : ((noteResult.data || []) as NoteRow[]);
  if (noteResult.error && notes.length === 0 && !isMissingOptionalClientTable(noteResult.error.message)) {
    throw new Error(noteResult.error.message);
  }

  return buildClientList(
    payments,
    deliveries,
    (intakeResult.data || []) as IntakeSubmissionRow[],
    (diagnosticResult.data || []) as DiagnosticRow[],
    sentEmails,
    notes
  );
}
