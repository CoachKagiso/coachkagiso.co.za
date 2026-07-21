import { listClientRecords } from '@/lib/clients';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';
import { listManualTasks } from '@/lib/dashboard-task-records';
import type { ManualTaskRecord } from '@/lib/dashboard-tasks';
import { listDiagnosticSubmissions, type DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import {
  GoogleCalendarAuthError,
  GoogleCalendarConfigError,
  type GoogleCalendarEvent,
  listGoogleCalendarEvents,
} from '@/lib/google-calendar';
import type { DashboardCalendarEvent, DashboardCalendarEventType } from '@/lib/calendar-types';

const calendarTimeZone = 'Africa/Johannesburg';

type CalendarRange = {
  from: string;
  to: string;
};

type MergedCalendarResult = {
  authorized: boolean;
  events: DashboardCalendarEvent[];
  authUrl: string;
  error?: string;
};

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: calendarTimeZone,
    year: 'numeric',
  }).format(date);
}

function toDateTime(date: string, time: string) {
  return `${date}T${time}:00+02:00`;
}

function isWithinRange(value: string, range: CalendarRange) {
  const time = parseDate(value).getTime();
  return time >= parseDate(range.from).getTime() && time <= parseDate(range.to).getTime();
}

function isCalBooking(event: GoogleCalendarEvent) {
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

function getGoogleEventType(event: GoogleCalendarEvent): DashboardCalendarEventType {
  const storedType = event.extendedProperties?.private?.coachKagisoType;
  if (
    storedType === 'session' ||
    storedType === 'personal' ||
    storedType === 'content' ||
    storedType === 'masterclass' ||
    storedType === 'other'
  ) {
    return storedType;
  }

  const title = (event.summary || '').toLowerCase();
  if (title.includes('masterclass')) return 'masterclass';
  if (isCalBooking(event)) return 'session';
  return 'personal';
}

function normalizeGoogleEvent(event: GoogleCalendarEvent): DashboardCalendarEvent | null {
  if (!event.id || event.status === 'cancelled') return null;

  const start = event.start?.dateTime || (event.start?.date ? `${event.start.date}T09:00:00+02:00` : '');
  const end = event.end?.dateTime || (event.end?.date ? `${event.end.date}T10:00:00+02:00` : '');
  if (!start || !end) return null;

  return {
    id: `google-${event.id}`,
    source: 'google',
    googleEventId: event.id,
    title: event.summary || 'Untitled event',
    description: event.description || '',
    start,
    end,
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    type: getGoogleEventType(event),
    readOnly: false,
    isCalBooking: isCalBooking(event),
    location: event.location || '',
    linkHref: event.htmlLink,
    linkLabel: event.htmlLink ? 'Open in Google Calendar' : undefined,
  };
}

function getLeadLink(adminKey: string, leadId: string) {
  const legacyKey = getDashboardLegacyKey(adminKey);
  const query = legacyKey ? `?key=${encodeURIComponent(legacyKey)}` : '';
  return `/resources/career-diagnostic/submissions/${leadId}${query}`;
}

function getClientsLink(adminKey: string, paymentId?: string) {
  const params = new URLSearchParams();
  const legacyKey = getDashboardLegacyKey(adminKey);
  if (legacyKey) params.set('key', legacyKey);
  params.set('tab', 'clients');
  if (paymentId) params.set('payment', paymentId);
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function getTasksLink(adminKey: string) {
  const params = new URLSearchParams({ tab: 'tasks' });
  const legacyKey = getDashboardLegacyKey(adminKey);
  if (legacyKey) params.set('key', legacyKey);
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function buildLeadFollowUpEvents(leads: DiagnosticSubmission[], range: CalendarRange, adminKey: string) {
  const events: DashboardCalendarEvent[] = [];

  for (const lead of leads) {
    if (['paid', 'archived', 'not_a_fit', 'nurture', 'closed'].includes(lead.lead_status)) continue;

    const scheduledDate = lead.next_follow_up_at ? parseDate(lead.next_follow_up_at) : null;
    const contactedDate = lead.lead_status === 'contacted' && lead.last_contacted_at ? addDays(parseDate(lead.last_contacted_at), 7) : null;
    const dueDate = scheduledDate || contactedDate;
    if (!dueDate) continue;

    const date = toDateInput(dueDate);
    const start = toDateTime(date, '09:00');
    if (!isWithinRange(start, range)) continue;

    events.push({
      id: `follow-up-${lead.id}-${date}`,
      source: 'follow_up',
      title: `Follow up: ${lead.first_name}`,
      description: `${lead.archetype_payload?.service || lead.archetype_name} - ${lead.email}`,
      start,
      end: toDateTime(date, '09:30'),
      type: 'follow_up',
      readOnly: true,
      isCalBooking: false,
      linkHref: getLeadLink(adminKey, lead.id),
      linkLabel: 'View lead',
    });
  }

  return events;
}

function taskTypeToEventType(task: ManualTaskRecord): DashboardCalendarEventType {
  if (task.type === 'DELIVERY') return 'delivery';
  if (task.type === 'CONTENT') return 'content';
  if (task.type === 'LEAD') return 'follow_up';
  return 'task';
}

function buildTaskEvents(tasks: ManualTaskRecord[], range: CalendarRange, adminKey: string) {
  return tasks
    .filter((task) => task.status !== 'done' && task.dueDate)
    .map((task) => {
      const startTime = task.dueTime || '10:00';
      const start = toDateTime(task.dueDate || '', startTime);
      const endDate = new Date(start);
      endDate.setMinutes(endDate.getMinutes() + 30);

      return {
        id: `task-${task.id}`,
        source: 'task',
        title: task.title,
        description: `${task.type} task - priority ${task.priority}`,
        start,
        end: endDate.toISOString(),
        type: taskTypeToEventType(task),
        readOnly: true,
        isCalBooking: false,
        linkHref: getTasksLink(adminKey),
        linkLabel: 'View in Tasks',
      } satisfies DashboardCalendarEvent;
    })
    .filter((event) => isWithinRange(event.start, range));
}

async function buildSupabaseEvents(range: CalendarRange, adminKey: string) {
  const [clients, leads, tasks] = await Promise.all([listClientRecords(), listDiagnosticSubmissions(), listManualTasks()]);
  const deliveryEvents = clients.filter((client) => !client.isTest).flatMap((client) => {
    const events: DashboardCalendarEvent[] = [];

    if (client.deadline && !client.isDelivered) {
      const date = toDateInput(parseDate(client.deadline));
      const start = toDateTime(date, '16:30');
      if (isWithinRange(start, range)) {
        events.push({
          id: `delivery-${client.paymentId}`,
          source: 'delivery_deadline',
          title: `${client.buyerName} - ${client.serviceName} due`,
          description: `Current stage: ${client.currentStage}`,
          start,
          end: toDateTime(date, '17:00'),
          type: 'delivery',
          readOnly: true,
          isCalBooking: false,
          linkHref: getClientsLink(adminKey, client.paymentId),
          linkLabel: 'View in Clients',
        });
      }
    }

    if (client.isDelivered && client.deliveredAt && client.serviceName.toLowerCase().includes('career clarity')) {
      const checkInDate = addDays(parseDate(client.deliveredAt), 14);
      const date = toDateInput(checkInDate);
      const start = toDateTime(date, '10:00');
      if (isWithinRange(start, range)) {
        events.push({
          id: `check-in-${client.paymentId}`,
          source: 'check_in',
          title: `${client.buyerName} - 14-day check-in`,
          description: `${client.serviceName} follow-up checkpoint`,
          start,
          end: toDateTime(date, '10:30'),
          type: 'follow_up',
          readOnly: true,
          isCalBooking: false,
          linkHref: getClientsLink(adminKey, client.paymentId),
          linkLabel: 'View in Clients',
        });
      }
    }

    return events;
  });

  return [...deliveryEvents, ...buildLeadFollowUpEvents(leads, range, adminKey), ...buildTaskEvents(tasks, range, adminKey)];
}

export async function listMergedCalendarEvents(range: CalendarRange, adminKey: string): Promise<MergedCalendarResult> {
  const authUrl = '/api/auth/google';

  try {
    const [googleEvents, supabaseEvents] = await Promise.all([
      listGoogleCalendarEvents(range.from, range.to),
      buildSupabaseEvents(range, adminKey),
    ]);
    const normalizedGoogleEvents = googleEvents.map(normalizeGoogleEvent).filter(Boolean) as DashboardCalendarEvent[];

    return {
      authorized: true,
      authUrl,
      events: [...normalizedGoogleEvents, ...supabaseEvents].sort(
        (left, right) => parseDate(left.start).getTime() - parseDate(right.start).getTime()
      ),
    };
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError || error instanceof GoogleCalendarConfigError) {
      return {
        authorized: false,
        authUrl,
        events: [],
        error: error.message,
      };
    }

    throw error;
  }
}
