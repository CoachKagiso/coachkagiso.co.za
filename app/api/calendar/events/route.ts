import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createManualTask } from '@/lib/dashboard-task-records';
import { getDiagnosticSubmissionById, isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { listMergedCalendarEvents } from '@/lib/dashboard-calendar';
import {
  createGoogleCalendarEvent,
  GoogleCalendarAuthError,
  GoogleCalendarConfigError,
} from '@/lib/google-calendar';
import type { DashboardCalendarEventPayload, DashboardCalendarEventType } from '@/lib/calendar-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const editableEventTypes: DashboardCalendarEventType[] = ['session', 'personal', 'content', 'masterclass', 'other'];

function isEditableEventType(value: string): value is DashboardCalendarEventType {
  return editableEventTypes.includes(value as DashboardCalendarEventType);
}

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(now.getDate() + 45);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function cleanDate(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function cleanTime(value?: string | null) {
  return value && /^\d{2}:\d{2}$/.test(value) ? value : '';
}

function addDaysToDateInput(date: string, days: number) {
  const value = new Date(`${date}T00:00:00+02:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function getPayload(body: Record<string, unknown>, key: string): DashboardCalendarEventPayload | { error: string } {
  const title = String(body.title || '').trim();
  const date = cleanDate(String(body.date || ''));
  const startTime = cleanTime(String(body.startTime || ''));
  const endTime = cleanTime(String(body.endTime || ''));
  const eventType = String(body.eventType || 'personal');

  if (!title) return { error: 'Event title is required.' };
  if (!date || !startTime || !endTime) return { error: 'Date, start time, and end time are required.' };
  if (!isEditableEventType(eventType)) return { error: 'Invalid event type.' };
  if (endTime <= startTime) return { error: 'End time must be after start time.' };

  return {
    key,
    title,
    date,
    startTime,
    endTime,
    eventType,
    description: String(body.description || '').trim(),
    linkedLeadId: body.linkedLeadId ? String(body.linkedLeadId) : null,
  };
}

async function createSessionFollowUpTask(payload: DashboardCalendarEventPayload) {
  if (payload.eventType !== 'session' || !payload.linkedLeadId) return;

  const lead = await getDiagnosticSubmissionById(payload.linkedLeadId).catch(() => null);
  if (!lead) return;

  await createManualTask({
    title: `Follow up: ${lead.first_name}`,
    type: 'LEAD',
    status: 'todo',
    priority: 80,
    dueDate: addDaysToDateInput(payload.date, 14),
    dueTime: payload.startTime,
    linkedLeadId: lead.id,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const defaultRange = getDefaultRange();
  const from = url.searchParams.get('from') || defaultRange.from;
  const to = url.searchParams.get('to') || defaultRange.to;
  const result = await listMergedCalendarEvents({ from, to }, key);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const key = String(body.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = getPayload(body, key);
  if ('error' in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  try {
    const event = await createGoogleCalendarEvent(payload);
    try {
      await createSessionFollowUpTask(payload);
    } catch (taskError) {
      console.error('Calendar event created but follow-up task creation failed', taskError);
    }
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError || error instanceof GoogleCalendarConfigError) {
      return NextResponse.json({ error: error.message, authorized: false }, { status: 400 });
    }

    throw error;
  }
}
