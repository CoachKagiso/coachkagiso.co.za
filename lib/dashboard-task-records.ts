import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  taskStatuses,
  taskTypes,
  type DashboardNote,
  type ManualTaskRecord,
  type TaskStatus,
  type TaskType,
} from '@/lib/dashboard-tasks';

const TASK_SELECT =
  'id, title, type, status, priority, due_date, due_time, linked_lead_id, linked_payment_id, created_at, updated_at';
const NOTE_SELECT =
  'id, body, linked_task_id, linked_lead_id, linked_payment_id, created_at, updated_at';

type ManualTaskRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: number | null;
  due_date: string | null;
  due_time: string | null;
  linked_lead_id: string | null;
  linked_payment_id: string | null;
  created_at: string;
  updated_at: string;
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

export type ManualTaskInput = {
  title: string;
  type: TaskType;
  status?: TaskStatus;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  linkedLeadId?: string | null;
  linkedPaymentId?: string | null;
};

export type ManualTaskUpdate = Partial<ManualTaskInput>;

export type NoteInput = {
  body: string;
  linkedTaskId?: string | null;
  linkedLeadId?: string | null;
  linkedPaymentId?: string | null;
};

function isMissingDashboardTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('relation "public.tasks" does not exist') ||
        message.includes('relation "public.notes" does not exist') ||
        message.includes("Could not find the table 'public.tasks'") ||
        message.includes("Could not find the table 'public.notes'"))
  );
}

export function isTaskType(value?: string | null): value is TaskType {
  return Boolean(value && taskTypes.includes(value as TaskType));
}

export function isTaskStatus(value?: string | null): value is TaskStatus {
  return Boolean(value && taskStatuses.includes(value as TaskStatus));
}

function normalizePriority(value?: number | null) {
  const numeric = Number(value || 50);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function normalizeTask(row: ManualTaskRow) {
  return {
    id: row.id,
    title: row.title,
    type: isTaskType(row.type) ? row.type : 'PERSONAL',
    status: isTaskStatus(row.status) ? row.status : 'todo',
    priority: normalizePriority(row.priority),
    dueDate: row.due_date || undefined,
    dueTime: row.due_time || undefined,
    linkedLeadId: row.linked_lead_id || undefined,
    linkedPaymentId: row.linked_payment_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies ManualTaskRecord;
}

function normalizeNote(row: NoteRow) {
  return {
    id: row.id,
    body: row.body,
    linkedTaskId: row.linked_task_id || undefined,
    linkedLeadId: row.linked_lead_id || undefined,
    linkedPaymentId: row.linked_payment_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies DashboardNote;
}

function cleanDate(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function cleanTime(value?: string | null) {
  return value && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null;
}

function taskPayload(values: ManualTaskInput | ManualTaskUpdate) {
  const payload: Record<string, string | number | null> = {};

  if ('title' in values && values.title !== undefined) payload.title = values.title.trim();
  if ('type' in values && values.type !== undefined) payload.type = values.type;
  if ('status' in values && values.status !== undefined) payload.status = values.status;
  if ('priority' in values && values.priority !== undefined) payload.priority = normalizePriority(values.priority);
  if ('dueDate' in values) payload.due_date = cleanDate(values.dueDate);
  if ('dueTime' in values) payload.due_time = cleanTime(values.dueTime);
  if ('linkedLeadId' in values) payload.linked_lead_id = values.linkedLeadId || null;
  if ('linkedPaymentId' in values) payload.linked_payment_id = values.linkedPaymentId || null;

  return payload;
}

export async function listManualTasks() {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('created_at', { ascending: false })
    .limit(250);

  if (result.error) {
    if (isMissingDashboardTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }

  return ((result.data || []) as ManualTaskRow[]).map(normalizeTask);
}

export async function listNotes() {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .order('created_at', { ascending: false })
    .limit(500);

  if (result.error) {
    if (isMissingDashboardTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }

  return ((result.data || []) as NoteRow[]).map(normalizeNote);
}

export async function createManualTask(values: ManualTaskInput) {
  const payload = taskPayload(values);
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('tasks')
    .insert(payload)
    .select(TASK_SELECT)
    .single();

  if (result.error) throw new Error(result.error.message);
  return normalizeTask(result.data as ManualTaskRow);
}

export async function updateManualTask(id: string, values: ManualTaskUpdate) {
  const payload = taskPayload(values);
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select(TASK_SELECT)
    .single();

  if (result.error) throw new Error(result.error.message);
  return normalizeTask(result.data as ManualTaskRow);
}

export async function deleteManualTask(id: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('tasks').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

export async function createNote(values: NoteInput) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('notes')
    .insert({
      body: values.body.trim(),
      linked_task_id: values.linkedTaskId || null,
      linked_lead_id: values.linkedLeadId || null,
      linked_payment_id: values.linkedPaymentId || null,
    })
    .select(NOTE_SELECT)
    .single();

  if (result.error) throw new Error(result.error.message);
  return normalizeNote(result.data as NoteRow);
}

export async function updateNote(id: string, body: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('notes')
    .update({ body: body.trim() })
    .eq('id', id)
    .select(NOTE_SELECT)
    .single();

  if (result.error) throw new Error(result.error.message);
  return normalizeNote(result.data as NoteRow);
}

export async function deleteNote(id: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('notes').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}
