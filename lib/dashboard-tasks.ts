import { asyncServices } from '@/lib/buying-flow';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';

export const taskTypes = ['LEAD', 'DELIVERY', 'CONTENT', 'PERSONAL'] as const;
export const taskStatuses = ['todo', 'waiting', 'in_progress', 'done'] as const;
export const taskSortOptions = ['priority', 'dueDate', 'clientName'] as const;

export type TaskType = (typeof taskTypes)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskSort = (typeof taskSortOptions)[number];

export type DashboardNote = {
  id: string;
  body: string;
  linkedTaskId?: string;
  linkedLeadId?: string;
  linkedPaymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ManualTaskRecord = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  dueDate?: string;
  dueTime?: string;
  linkedLeadId?: string;
  linkedPaymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  subtitle: string;
  type: TaskType;
  status: TaskStatus;
  priority: number;
  dueDate?: string;
  dueTime?: string;
  clientName: string;
  leadId?: string;
  paymentId?: string;
  tags: string[];
  isManual: boolean;
  notes: DashboardNote[];
  createdAt?: string;
  updatedAt?: string;
};

const closedLeadStatuses = ['paid', 'not_a_fit', 'closed', 'archived'] as const;

function clampPriority(value: number) {
  return Math.max(0, Math.min(100, value));
}

function isClosedLead(submission: DiagnosticSubmission) {
  return closedLeadStatuses.includes(submission.lead_status as (typeof closedLeadStatuses)[number]);
}

function isTodayOrPast(value?: string | null, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  return date.getTime() <= todayEnd.getTime();
}

function isPast(value?: string | null, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime();
}

function isOlderThanHours(value: string | null, hours: number, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return now.getTime() - date.getTime() >= hours * 60 * 60 * 1000;
}

function addWorkingDaysIso(value: string | null | undefined, days: number) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  date.setHours(17, 0, 0, 0);
  return date.toISOString();
}

function getDueTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function buildTask(task: Omit<Task, 'priority' | 'dueTime'> & { priority: number }) {
  return {
    ...task,
    priority: clampPriority(task.priority),
    dueTime: getDueTime(task.dueDate),
  } satisfies Task;
}

export function getPaymentClientName(operation: ClientOperation) {
  return (
    operation.payment.buyer_name ||
    operation.intake?.form_data.fullName ||
    operation.payment.buyer_email ||
    'Client'
  );
}

function getLeadSubtitle(submission: DiagnosticSubmission) {
  return `${submission.archetype_payload?.service || 'Recommended route'} - ${submission.archetype_name}`;
}

function getDeliveryDueAt(operation: ClientOperation) {
  const deliveryDays = asyncServices[operation.payment.service_slug]?.deliveryDays || 5;
  return addWorkingDaysIso(operation.payment.confirmed_at || operation.payment.created_at, deliveryDays);
}

export function generateTasks(
  leads: DiagnosticSubmission[],
  clientOps: ClientOperation[],
  options: { contentSignal?: string; topArchetype?: string; now?: Date } = {}
) {
  const now = options.now || new Date();
  const tasks: Task[] = [];

  leads.forEach((lead) => {
    const clientName = lead.first_name || lead.email || 'Lead';
    const subtitle = getLeadSubtitle(lead);

    if (lead.lead_status === 'new' && !lead.last_contacted_at) {
      tasks.push(
        buildTask({
          id: `lead-first-follow-up-${lead.id}`,
          title: `${clientName} - Send first result follow-up`,
          subtitle,
          type: 'LEAD',
          status: 'todo',
          priority: 100,
          dueDate: lead.next_follow_up_at || lead.submitted_at,
          clientName,
          leadId: lead.id,
          tags: ['First follow-up', lead.archetype_name],
          isManual: false,
          notes: [],
          createdAt: lead.submitted_at,
          updatedAt: lead.updated_at || lead.submitted_at,
        })
      );
    }

    if (lead.next_follow_up_at && isTodayOrPast(lead.next_follow_up_at, now) && lead.lead_status !== 'contacted' && !isClosedLead(lead)) {
      tasks.push(
        buildTask({
          id: `lead-overdue-follow-up-${lead.id}`,
          title: `${clientName} - Follow-up overdue, contact now`,
          subtitle,
          type: 'LEAD',
          status: 'todo',
          priority: 100,
          dueDate: lead.next_follow_up_at,
          clientName,
          leadId: lead.id,
          tags: ['Overdue follow-up', lead.archetype_name],
          isManual: false,
          notes: [],
          createdAt: lead.submitted_at,
          updatedAt: lead.updated_at || lead.submitted_at,
        })
      );
    }

    if (lead.lead_status === 'contacted' && isOlderThanHours(lead.last_contacted_at, 48, now)) {
      tasks.push(
        buildTask({
          id: `lead-response-check-${lead.id}`,
          title: `${clientName} - Check for response`,
          subtitle,
          type: 'LEAD',
          status: 'waiting',
          priority: 80,
          dueDate: lead.next_follow_up_at || lead.last_contacted_at || lead.updated_at || lead.submitted_at,
          clientName,
          leadId: lead.id,
          tags: ['Response check', lead.archetype_name],
          isManual: false,
          notes: [],
          createdAt: lead.submitted_at,
          updatedAt: lead.updated_at || lead.submitted_at,
        })
      );
    }

    if (lead.lead_status === 'discovery_booked') {
      tasks.push(
        buildTask({
          id: `lead-discovery-prep-${lead.id}`,
          title: `${clientName} - Prep discovery call`,
          subtitle,
          type: 'LEAD',
          status: 'in_progress',
          priority: 90,
          dueDate: lead.next_follow_up_at || lead.updated_at || lead.submitted_at,
          clientName,
          leadId: lead.id,
          tags: ['Discovery prep', lead.archetype_name],
          isManual: false,
          notes: [],
          createdAt: lead.submitted_at,
          updatedAt: lead.updated_at || lead.submitted_at,
        })
      );
    }

    if (isClosedLead(lead)) {
      tasks.push(
        buildTask({
          id: `lead-closed-${lead.id}`,
          title: `${clientName} - ${lead.lead_status === 'paid' ? 'Moved to paid client' : 'Lead closed'}`,
          subtitle,
          type: 'LEAD',
          status: 'done',
          priority: 30,
          dueDate: lead.updated_at || lead.submitted_at,
          clientName,
          leadId: lead.id,
          tags: [lead.lead_status === 'paid' ? 'Paid client' : 'Closed lead', lead.archetype_name],
          isManual: false,
          notes: [],
          createdAt: lead.submitted_at,
          updatedAt: lead.updated_at || lead.submitted_at,
        })
      );
    }
  });

  clientOps.forEach((operation) => {
    const clientName = getPaymentClientName(operation);
    const dueDate = getDeliveryDueAt(operation);
    const subtitle = `${operation.serviceTitle} - ${operation.deliveryLabel}`;

    if (operation.payment.status !== 'confirmed') return;

    if (!operation.intake && operation.payment.delivery_status !== 'delivered' && operation.payment.delivery_status !== 'cancelled') {
      tasks.push(
        buildTask({
          id: `delivery-chase-intake-${operation.payment.payment_id}`,
          title: `${clientName} - Chase intake form`,
          subtitle,
          type: 'DELIVERY',
          status: 'waiting',
          priority: 95,
          dueDate: operation.payment.confirmed_at || operation.payment.created_at,
          clientName,
          paymentId: operation.payment.payment_id,
          tags: ['Intake pending', operation.serviceTitle],
          isManual: false,
          notes: [],
          createdAt: operation.payment.created_at,
          updatedAt: operation.payment.delivery_status_updated_at || operation.payment.confirmed_at || operation.payment.created_at,
        })
      );
    }

    if (operation.intake && operation.payment.delivery_status === 'not_started') {
      tasks.push(
        buildTask({
          id: `delivery-start-${operation.payment.payment_id}`,
          title: `${clientName} - Start delivery (${operation.serviceTitle})`,
          subtitle,
          type: 'DELIVERY',
          status: 'in_progress',
          priority: 90,
          dueDate,
          clientName,
          paymentId: operation.payment.payment_id,
          tags: ['Ready to start', operation.serviceTitle],
          isManual: false,
          notes: [],
          createdAt: operation.payment.created_at,
          updatedAt: operation.payment.delivery_status_updated_at || operation.payment.confirmed_at || operation.payment.created_at,
        })
      );
    }

    if (operation.payment.delivery_status === 'in_progress') {
      tasks.push(
        buildTask({
          id: `${isPast(dueDate, now) ? 'delivery-overdue' : 'delivery-continue'}-${operation.payment.payment_id}`,
          title: `${clientName} - ${isPast(dueDate, now) ? 'Overdue delivery' : 'Continue delivery'}`,
          subtitle,
          type: 'DELIVERY',
          status: 'in_progress',
          priority: isPast(dueDate, now) ? 100 : 85,
          dueDate,
          clientName,
          paymentId: operation.payment.payment_id,
          tags: [isPast(dueDate, now) ? 'Overdue delivery' : 'Active delivery', operation.serviceTitle],
          isManual: false,
          notes: [],
          createdAt: operation.payment.created_at,
          updatedAt: operation.payment.delivery_status_updated_at || operation.payment.confirmed_at || operation.payment.created_at,
        })
      );
    }

    if (operation.payment.delivery_status === 'delivered') {
      tasks.push(
        buildTask({
          id: `delivery-confirm-receipt-${operation.payment.payment_id}`,
          title: `${clientName} - Confirm receipt`,
          subtitle,
          type: 'DELIVERY',
          status: 'waiting',
          priority: 70,
          dueDate: operation.payment.delivered_at || operation.payment.delivery_status_updated_at || dueDate,
          clientName,
          paymentId: operation.payment.payment_id,
          tags: ['Receipt confirmation', operation.serviceTitle],
          isManual: false,
          notes: [],
          createdAt: operation.payment.created_at,
          updatedAt: operation.payment.delivery_status_updated_at || operation.payment.delivered_at || operation.payment.created_at,
        })
      );
    }

    if (operation.payment.delivery_status === 'cancelled') {
      tasks.push(
        buildTask({
          id: `delivery-cancelled-${operation.payment.payment_id}`,
          title: `${clientName} - Delivery closed`,
          subtitle,
          type: 'DELIVERY',
          status: 'done',
          priority: 20,
          dueDate: operation.payment.delivery_status_updated_at || operation.payment.created_at,
          clientName,
          paymentId: operation.payment.payment_id,
          tags: ['Closed delivery', operation.serviceTitle],
          isManual: false,
          notes: [],
          createdAt: operation.payment.created_at,
          updatedAt: operation.payment.delivery_status_updated_at || operation.payment.created_at,
        })
      );
    }
  });

  if (leads.length > 0) {
    tasks.push(
      buildTask({
        id: 'content-top-diagnostic-signal',
        title: `Audience - Record voice note on ${options.contentSignal || 'the strongest diagnostic signal'}`,
        subtitle: `${options.topArchetype || 'Diagnostic demand'} - content review signal`,
        type: 'CONTENT',
        status: 'todo',
        priority: 60,
        dueDate: now.toISOString(),
        clientName: 'Audience',
        tags: ['Content', 'Diagnostic signal'],
        isManual: false,
        notes: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    );
  }

  return tasks.sort((a, b) => b.priority - a.priority);
}

export function mergeTasks(
  derivedTasks: Task[],
  manualTasks: ManualTaskRecord[],
  notes: DashboardNote[],
  leads: DiagnosticSubmission[],
  clientOps: ClientOperation[]
) {
  const notesByTask = new Map<string, DashboardNote[]>();
  const notesByLead = new Map<string, DashboardNote[]>();
  const notesByPayment = new Map<string, DashboardNote[]>();

  notes.forEach((note) => {
    if (note.linkedTaskId) {
      notesByTask.set(note.linkedTaskId, [...(notesByTask.get(note.linkedTaskId) || []), note]);
    }

    if (note.linkedLeadId) {
      notesByLead.set(note.linkedLeadId, [...(notesByLead.get(note.linkedLeadId) || []), note]);
    }

    if (note.linkedPaymentId) {
      notesByPayment.set(note.linkedPaymentId, [...(notesByPayment.get(note.linkedPaymentId) || []), note]);
    }
  });

  const manual = manualTasks.map((task) => {
    const linkedLead = task.linkedLeadId ? leads.find((lead) => lead.id === task.linkedLeadId) : null;
    const linkedOperation = task.linkedPaymentId
      ? clientOps.find((operation) => operation.payment.payment_id === task.linkedPaymentId)
      : null;
    const clientName = linkedLead?.first_name || (linkedOperation ? getPaymentClientName(linkedOperation) : task.type === 'PERSONAL' ? 'Coach Kagiso' : 'Manual');
    const subtitle = linkedLead
      ? getLeadSubtitle(linkedLead)
      : linkedOperation
        ? `${linkedOperation.serviceTitle} - ${linkedOperation.deliveryLabel}`
        : task.type === 'PERSONAL'
          ? 'Personal workspace task'
          : 'Manual task';

    return {
      id: task.id,
      title: task.title,
      subtitle,
      type: task.type,
      status: task.status,
      priority: clampPriority(task.priority),
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      clientName,
      leadId: task.linkedLeadId,
      paymentId: task.linkedPaymentId,
      tags: ['Manual', task.type, ...(linkedLead ? [linkedLead.archetype_name] : []), ...(linkedOperation ? [linkedOperation.serviceTitle] : [])],
      isManual: true,
      notes: notesByTask.get(task.id) || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    } satisfies Task;
  });

  const derived = derivedTasks.map((task) => ({
    ...task,
    notes: [
      ...(task.leadId ? notesByLead.get(task.leadId) || [] : []),
      ...(task.paymentId ? notesByPayment.get(task.paymentId) || [] : []),
    ],
  }));

  return [...manual, ...derived].sort((a, b) => b.priority - a.priority);
}

export function sortTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    if (sort === 'clientName') {
      return a.clientName.localeCompare(b.clientName) || b.priority - a.priority;
    }

    if (sort === 'dueDate') {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || b.priority - a.priority;
    }

    return b.priority - a.priority || a.clientName.localeCompare(b.clientName);
  });
}
