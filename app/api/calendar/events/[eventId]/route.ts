import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvent,
  GoogleCalendarAuthError,
  GoogleCalendarConfigError,
  updateGoogleCalendarEvent,
} from '@/lib/google-calendar';
import type { DashboardCalendarEventPayload, DashboardCalendarEventType } from '@/lib/calendar-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const editableEventTypes: DashboardCalendarEventType[] = ['session', 'personal', 'content', 'masterclass', 'other'];

function isEditableEventType(value: string): value is DashboardCalendarEventType {
  return editableEventTypes.includes(value as DashboardCalendarEventType);
}

function cleanDate(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function cleanTime(value?: string | null) {
  return value && /^\d{2}:\d{2}$/.test(value) ? value : '';
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

function isCalBookingEvent(event: Awaited<ReturnType<typeof getGoogleCalendarEvent>>) {
  const text = [
    event.summary,
    event.description,
    event.location,
    event.source?.title,
    event.source?.url,
    event.extendedProperties?.private?.calEventId,
    event.extendedProperties?.private?.calEventUid,
    event.extendedProperties?.private?.bookingUid,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('cal.com') || text.includes('calcom') || Boolean(event.extendedProperties?.private?.calEventId);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const key = String(body.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = getPayload(body, key);
  if ('error' in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  try {
    const existingEvent = await getGoogleCalendarEvent(eventId);
    const event = await updateGoogleCalendarEvent(eventId, payload, isCalBookingEvent(existingEvent));
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ event, timeLocked: isCalBookingEvent(existingEvent) });
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError || error instanceof GoogleCalendarConfigError) {
      return NextResponse.json({ error: error.message, authorized: false }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const existingEvent = await getGoogleCalendarEvent(eventId);
    if (isCalBookingEvent(existingEvent)) {
      return NextResponse.json({ error: 'Cal.com bookings must be cancelled in Cal.com.' }, { status: 400 });
    }

    await deleteGoogleCalendarEvent(eventId);
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError || error instanceof GoogleCalendarConfigError) {
      return NextResponse.json({ error: error.message, authorized: false }, { status: 400 });
    }

    throw error;
  }
}
