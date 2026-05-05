import { asyncServices, formatCurrency, getDeadlineDate, type AsyncServiceSlug } from '@/lib/buying-flow';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const PAYMENT_SELECT =
  'payment_id, service_slug, amount, status, buyer_email, buyer_name, created_at, confirmed_at, intake_submitted_at, intake_reminder_sent_at, delivery_status, delivery_notes, delivered_at, delivery_status_updated_at';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type DeliveryStatus = 'not_started' | 'in_progress' | 'delivered' | 'cancelled';

export type PaymentRecord = {
  payment_id: string;
  service_slug: AsyncServiceSlug;
  amount: number;
  status: PaymentStatus;
  buyer_email: string | null;
  buyer_name: string | null;
  created_at: string;
  confirmed_at: string | null;
  intake_submitted_at: string | null;
  intake_reminder_sent_at: string | null;
  delivery_status: DeliveryStatus;
  delivery_notes: string | null;
  delivered_at: string | null;
  delivery_status_updated_at: string | null;
};

export type IntakeSubmissionRecord = {
  id: string;
  payment_id: string;
  service_slug: AsyncServiceSlug;
  form_data: Record<string, string>;
  cv_file_url: string | null;
  submitted_at: string;
  duplicate_attempt: boolean;
};

export type ClientOperation = {
  payment: PaymentRecord;
  intake: IntakeSubmissionRecord | null;
  serviceTitle: string;
  amountLabel: string;
  deliveryDueAt: string | null;
  deliveryState: 'failed' | 'waiting_for_intake' | 'ready' | 'in_progress' | 'due_soon' | 'overdue' | 'delivered' | 'cancelled';
  deliveryLabel: string;
  alertLabel: string | null;
};

function normalizeDeliveryStatus(value?: string | null): DeliveryStatus {
  if (value === 'in_progress' || value === 'delivered' || value === 'cancelled') return value;
  return 'not_started';
}

function normalizePayment(row: Partial<PaymentRecord>) {
  return {
    ...row,
    amount: Number(row.amount || 0),
    delivery_status: normalizeDeliveryStatus(row.delivery_status),
    delivery_notes: row.delivery_notes || null,
    delivered_at: row.delivered_at || null,
    delivery_status_updated_at: row.delivery_status_updated_at || null,
  } as PaymentRecord;
}

function isMissingDeliveryColumn(message?: string) {
  return Boolean(
    message &&
      ['delivery_status', 'delivery_notes', 'delivered_at', 'delivery_status_updated_at'].some((column) =>
        message.includes(column)
      )
  );
}

function addDaysIso(dateValue: string | null, days: number) {
  if (!dateValue) return null;
  return getDeadlineDate(days, new Date(dateValue)).toISOString();
}

export function getDeliveryState(operation: Pick<ClientOperation, 'payment' | 'intake' | 'deliveryDueAt'>) {
  const { payment, intake, deliveryDueAt } = operation;

  if (payment.status === 'failed') return 'failed';
  if (payment.delivery_status === 'cancelled') return 'cancelled';
  if (payment.delivery_status === 'delivered') return 'delivered';
  if (payment.delivery_status === 'in_progress') return 'in_progress';
  if (payment.status === 'confirmed' && !intake) return 'waiting_for_intake';
  if (!deliveryDueAt) return 'ready';

  const dueAt = new Date(deliveryDueAt).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (dueAt < now) return 'overdue';
  if (dueAt - now <= dayMs) return 'due_soon';
  return 'ready';
}

export function getDeliveryLabel(state: ClientOperation['deliveryState']) {
  const labels: Record<ClientOperation['deliveryState'], string> = {
    failed: 'Payment failed',
    waiting_for_intake: 'Waiting for intake',
    ready: 'Ready to work on',
    in_progress: 'In progress',
    due_soon: 'Due soon',
    overdue: 'Overdue',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return labels[state];
}

function getAlertLabel(operation: Pick<ClientOperation, 'payment' | 'intake' | 'deliveryState'>) {
  const { payment, deliveryState } = operation;

  if (deliveryState === 'overdue') return 'Delivery is overdue';
  if (deliveryState === 'due_soon') return 'Delivery due within 24h';
  if (deliveryState === 'waiting_for_intake') {
    const createdAt = new Date(payment.created_at).getTime();
    if (createdAt < Date.now() - 24 * 60 * 60 * 1000) return 'Paid, no intake after 24h';
    return 'Paid, intake still pending';
  }
  if (payment.status === 'failed') return 'Payment failed';
  return null;
}

export async function listClientOperations() {
  const supabase = createSupabaseServiceClient();

  const paymentResult = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(250);

  let paymentRows: unknown[] | null = paymentResult.data;
  let paymentError = paymentResult.error;

  if (paymentError && isMissingDeliveryColumn(paymentError.message)) {
    const legacyResult = await supabase
      .from('payments')
      .select(
        'payment_id, service_slug, amount, status, buyer_email, buyer_name, created_at, confirmed_at, intake_submitted_at, intake_reminder_sent_at'
      )
      .order('created_at', { ascending: false })
      .limit(250);

    paymentRows = legacyResult.data;
    paymentError = legacyResult.error;
  }

  if (paymentError) throw new Error(paymentError.message);

  const intakeResult = await supabase
    .from('intake_submissions')
    .select('id, payment_id, service_slug, form_data, cv_file_url, submitted_at, duplicate_attempt')
    .eq('duplicate_attempt', false)
    .order('submitted_at', { ascending: false })
    .limit(250);

  if (intakeResult.error) throw new Error(intakeResult.error.message);

  const intakes = ((intakeResult.data || []) as IntakeSubmissionRecord[]).reduce<Record<string, IntakeSubmissionRecord>>(
    (acc, intake) => {
      acc[intake.payment_id] = intake;
      return acc;
    },
    {}
  );

  return ((paymentRows || []) as Partial<PaymentRecord>[]).map((row) => {
    const payment = normalizePayment(row);
    const service = asyncServices[payment.service_slug];
    const intake = intakes[payment.payment_id] || null;
    const deliveryDueAt = addDaysIso(payment.confirmed_at || payment.created_at, service?.deliveryDays || 0);
    const deliveryState = getDeliveryState({ payment, intake, deliveryDueAt });

    return {
      payment,
      intake,
      serviceTitle: service?.title || payment.service_slug,
      amountLabel: formatCurrency(payment.amount),
      deliveryDueAt,
      deliveryState,
      deliveryLabel: getDeliveryLabel(deliveryState),
      alertLabel: getAlertLabel({ payment, intake, deliveryState }),
    } satisfies ClientOperation;
  });
}

export async function updatePaymentDeliveryStatus(
  paymentId: string,
  values: {
    delivery_status: DeliveryStatus;
    delivery_notes?: string | null;
  }
) {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('payments')
    .update({
      delivery_status: values.delivery_status,
      delivery_notes: values.delivery_notes || null,
      delivered_at: values.delivery_status === 'delivered' ? now : null,
      delivery_status_updated_at: now,
    })
    .eq('payment_id', paymentId);

  if (error) throw new Error(error.message);
}
