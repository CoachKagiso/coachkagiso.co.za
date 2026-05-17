'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  Loader2,
  Lock,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DashboardCalendarEvent,
  DashboardCalendarEventPayload,
  DashboardCalendarEventType,
  DashboardCalendarView,
} from '@/lib/calendar-types';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';

type CustomCalendarDashboardProps = {
  adminKey: string;
  leads: DiagnosticSubmission[];
};

type CalendarResponse = {
  authorized: boolean;
  authUrl: string;
  events: DashboardCalendarEvent[];
  error?: string;
};

type DraftEvent = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: DashboardCalendarEventType;
  description: string;
  linkedLeadId: string;
};

type PendingMove = {
  event: DashboardCalendarEvent;
  draft: DraftEvent;
  fromLabel: string;
  toLabel: string;
};

type CalendarPillTag = {
  label: string;
  className: string;
};

type OverdueDiagnosticFollowUp = {
  lead: DiagnosticSubmission;
  dueDate: Date;
  daysOverdue: number;
};

const calendarTimeZone = 'Africa/Johannesburg';
const hourStart = 6;
const hourEnd = 21;
const slotHeight = 32;
const hourLabels = Array.from({ length: hourEnd - hourStart + 1 }, (_, index) => hourStart + index);
const eventTypes: { value: DashboardCalendarEventType; label: string }[] = [
  { value: 'session', label: 'Session' },
  { value: 'personal', label: 'Personal' },
  { value: 'content', label: 'Content' },
  { value: 'masterclass', label: 'Masterclass' },
  { value: 'other', label: 'Other' },
];
const typeStyles: Record<DashboardCalendarEventType, { bg: string; text: string; dot: string; label: string }> = {
  session: { bg: '#142334', text: '#FFFFFF', dot: 'bg-[#142334]', label: 'Cal.com / Session' },
  delivery: { bg: '#FEE2E2', text: '#DC2626', dot: 'bg-[#DC2626]', label: 'Delivery deadline' },
  follow_up: { bg: '#FEF3C7', text: '#92400E', dot: 'bg-[#F59E0B]', label: 'Follow-up reminder' },
  masterclass: { bg: '#E9D5FF', text: '#6B21A8', dot: 'bg-[#6B21A8]', label: 'Saturday Masterclass' },
  personal: { bg: '#C9AD98', text: '#142334', dot: 'bg-[#C9AD98]', label: 'Personal / manual' },
  content: { bg: '#BFDBFE', text: '#1E40AF', dot: 'bg-[#1E40AF]', label: 'Content planned' },
  task: { bg: '#F5F3EE', text: '#142334', dot: 'bg-[#6B6B6B]', label: 'Dashboard task' },
  other: { bg: '#F5F3EE', text: '#142334', dot: 'bg-[#6B6B6B]', label: 'Other' },
};
const formLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]';
const formFieldClass =
  'h-11 rounded-[8px] border border-[#CDB6A6] bg-[#F8F6F4] px-3 text-[14px] font-medium text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/35 disabled:border-[#E4D8CB] disabled:bg-[#F1EDE9] disabled:text-[#8B8178]';
const formTextareaClass =
  'h-28 resize-none rounded-[8px] border border-[#CDB6A6] bg-[#F8F6F4] px-3 py-2.5 text-[14px] font-medium leading-relaxed text-[#142334] outline-none transition focus:border-[#142334] focus:bg-white focus:ring-2 focus:ring-[#C9AD98]/35';
const tagBaseClass =
  'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1';
const closedLeadStatuses = new Set(['paid', 'archived', 'not_a_fit', 'closed']);

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: calendarTimeZone,
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function formatDateKey(date: Date) {
  const parts = getDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDisplayDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: calendarTimeZone,
    ...options,
  }).format(date);
}

function formatEventTime(value: string) {
  return formatDisplayDate(new Date(value), {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
  });
}

function getSastDayStamp(date: Date) {
  const [year, month, day] = formatDateKey(date).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function getCalendarDaysOverdue(value: string, now: Date) {
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return 0;

  const difference = getSastDayStamp(now) - getSastDayStamp(dueDate);
  return Math.max(0, Math.floor(difference / 86_400_000));
}

function getOverdueLabel(days: number) {
  if (days <= 0) return 'Due today';
  if (days === 1) return '1 day overdue';
  return `${days} days overdue`;
}

function getSastMinutes(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: calendarTimeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour || 0) * 60 + Number(values.minute || 0);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  value.setDate(value.getDate() - value.getDay());
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function addMonths(date: Date, months: number) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
}

function getMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function getWeekDays(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getRangeForView(date: Date, view: DashboardCalendarView) {
  if (view === 'month') {
    const grid = getMonthGrid(date);
    const from = new Date(grid[0]);
    const to = new Date(grid[grid.length - 1]);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (view === 'day') {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const from = startOfWeek(date);
  const to = addDays(from, 6);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function getEventsForDate(events: DashboardCalendarEvent[], date: Date) {
  const key = formatDateKey(date);
  return events.filter((event) => formatDateKey(new Date(event.start)) === key);
}

function getEventPosition(event: DashboardCalendarEvent) {
  const start = Math.max(hourStart * 60, getSastMinutes(event.start));
  const end = Math.min(hourEnd * 60, getSastMinutes(event.end));
  const top = ((start - hourStart * 60) / 30) * slotHeight;
  const height = Math.max(slotHeight, ((end - start) / 30) * slotHeight);
  return { top, height };
}

function isEventMovable(event: DashboardCalendarEvent) {
  return Boolean(event.googleEventId) && !event.readOnly && !event.isCalBooking;
}

function getEventDurationMinutes(event: DashboardCalendarEvent) {
  const duration = Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000);
  return Math.max(30, duration || 30);
}

function addMinutesToClock(time: string, minutes: number) {
  const [hour, minute] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getMoveTargetDraft(event: DashboardCalendarEvent, date: Date, startTime: string): DraftEvent {
  return {
    ...eventToDraft(event),
    date: formatDateKey(date),
    startTime,
    endTime: addMinutesToClock(startTime, getEventDurationMinutes(event)),
  };
}

function formatMoveLabel(date: Date, startTime: string, endTime: string) {
  return `${formatDisplayDate(date, { day: '2-digit', month: 'short', weekday: 'short' })}, ${startTime} - ${endTime}`;
}

function getEventPillTag(event: DashboardCalendarEvent): CalendarPillTag {
  const title = event.title.toLowerCase();
  let label = typeStyles[event.type].label;

  if (event.isCalBooking || event.type === 'session') {
    if (title.includes('discovery')) label = 'Discovery call';
    else if (title.includes('masterclass')) label = 'Masterclass';
    else if (title.includes('clarity')) label = 'Clarity session';
    else if (title.includes('glow')) label = 'Glow up';
    else label = 'Session';
  } else if (event.type === 'personal') {
    label = 'Personal';
  } else if (event.type === 'follow_up') {
    label = 'Follow-up';
  } else if (event.type === 'delivery') {
    label = 'Delivery';
  } else if (event.type === 'content') {
    label = 'Content';
  } else if (event.type === 'task') {
    label = 'Task';
  }

  const className =
    event.type === 'session'
      ? 'bg-[#142334] text-white ring-[#142334]'
      : event.type === 'personal'
        ? 'bg-[#EFE6DF] text-[#705746] ring-[#D6C1B2]'
        : event.type === 'follow_up'
          ? 'bg-[#FEF3C7] text-[#92400E] ring-[#F5D684]'
          : event.type === 'delivery'
            ? 'bg-[#FEE2E2] text-[#991B1B] ring-[#F7B4B4]'
            : event.type === 'masterclass'
              ? 'bg-[#E9D5FF] text-[#5B21B6] ring-[#C4B5FD]'
              : event.type === 'content'
                ? 'bg-[#DBEAFE] text-[#1E3A8A] ring-[#BFDBFE]'
                : 'bg-white text-[#6B6B6B] ring-[#E4D8CB]';

  return { label, className };
}

function getDayPillTag(events: DashboardCalendarEvent[]): CalendarPillTag | null {
  if (events.length === 0) return null;
  if (events.length === 1) return getEventPillTag(events[0]);

  const labels = new Set(events.map((event) => getEventPillTag(event).label));
  if (labels.size === 1) {
    const tag = getEventPillTag(events[0]);
    return { ...tag, label: `${events.length} ${tag.label}` };
  }

  return { label: 'Mixed day', className: 'bg-white text-[#6B6B6B] ring-[#E4D8CB]' };
}

function isActionEvent(event: DashboardCalendarEvent) {
  return event.type === 'follow_up' || event.type === 'delivery' || event.type === 'task' || event.source === 'follow_up' || event.source === 'check_in';
}

function getActionPrompt(events: DashboardCalendarEvent[]) {
  const followUps = events.filter((event) => event.type === 'follow_up' || event.source === 'follow_up' || event.source === 'check_in');
  const deliveries = events.filter((event) => event.type === 'delivery');
  const tasks = events.filter((event) => event.type === 'task');

  if (followUps.length > 0) {
    return `${followUps.length} follow-up${followUps.length === 1 ? '' : 's'} need email attention today.`;
  }

  if (deliveries.length > 0) {
    return `${deliveries.length} delivery item${deliveries.length === 1 ? '' : 's'} need a progress check.`;
  }

  if (tasks.length > 0) {
    return `${tasks.length} dashboard task${tasks.length === 1 ? '' : 's'} need attention today.`;
  }

  return null;
}

function getDiagnosticFollowUpsDue(leads: DiagnosticSubmission[], now: Date): OverdueDiagnosticFollowUp[] {
  const todayStamp = getSastDayStamp(now);

  return leads
    .map((lead) => {
      if (closedLeadStatuses.has(lead.lead_status) || lead.lead_status === 'contacted' || lead.lead_status === 'discovery_booked') {
        return null;
      }

      const needsFirstResultEmail = lead.lead_status === 'new' && !lead.last_contacted_at;
      const needsScheduledFollowUp = lead.lead_status === 'follow_up_later' && Boolean(lead.next_follow_up_at);
      if (!needsFirstResultEmail && !needsScheduledFollowUp) return null;

      const dueValue = lead.next_follow_up_at || lead.submitted_at;
      const dueDate = new Date(dueValue);
      return {
        lead,
        dueDate,
        daysOverdue: getCalendarDaysOverdue(dueValue, now),
      };
    })
    .filter((item): item is OverdueDiagnosticFollowUp => Boolean(item))
    .filter((item) => !Number.isNaN(item.dueDate.getTime()) && getSastDayStamp(item.dueDate) <= todayStamp)
    .sort((left, right) => {
      if (right.daysOverdue !== left.daysOverdue) return right.daysOverdue - left.daysOverdue;
      return left.dueDate.getTime() - right.dueDate.getTime();
    });
}

function getDefaultDraft(date = new Date(), startTime = '17:30'): DraftEvent {
  const [hour, minute] = startTime.split(':').map(Number);
  const end = new Date(date);
  end.setHours(hour, minute + 30, 0, 0);

  return {
    title: '',
    date: formatDateKey(date),
    startTime,
    endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
    eventType: 'personal',
    description: '',
    linkedLeadId: '',
  };
}

function eventToDraft(event: DashboardCalendarEvent): DraftEvent {
  return {
    title: event.title,
    date: formatDateKey(new Date(event.start)),
    startTime: formatEventTime(event.start),
    endTime: formatEventTime(event.end),
    eventType: event.type === 'delivery' || event.type === 'follow_up' || event.type === 'task' ? 'other' : event.type,
    description: event.description || '',
    linkedLeadId: '',
  };
}

function getViewTitle(date: Date, view: DashboardCalendarView) {
  if (view === 'day') {
    return formatDisplayDate(date, { day: '2-digit', month: 'long', year: 'numeric' });
  }

  if (view === 'week') {
    const week = getWeekDays(date);
    return `${formatDisplayDate(week[0], { day: '2-digit', month: 'short' })} - ${formatDisplayDate(week[6], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  return formatDisplayDate(date, { month: 'long', year: 'numeric' });
}

function getSlotTime(hour: number, half: 0 | 1) {
  return `${String(hour).padStart(2, '0')}:${half === 0 ? '00' : '30'}`;
}

function isCoachingWindow(date: Date, time: string) {
  const day = date.getDay();
  const [hour, minute] = time.split(':').map(Number);
  const minutes = hour * 60 + minute;

  if (day >= 1 && day <= 5) return minutes >= 17 * 60 + 30 && minutes < 19 * 60;
  if (day === 6) return minutes >= 9 * 60 && minutes < 12 * 60;
  return false;
}

export default function CustomCalendarDashboard({ adminKey, leads }: CustomCalendarDashboardProps) {
  const [view, setView] = useState<DashboardCalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState<DashboardCalendarEvent[]>([]);
  const [authorized, setAuthorized] = useState(true);
  const [authUrl, setAuthUrl] = useState('/api/auth/google');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [today] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<DashboardCalendarEvent | null>(null);
  const [drawerMode, setDrawerMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [draft, setDraft] = useState<DraftEvent>(() => getDefaultDraft());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<DashboardCalendarEvent | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [calendarSearch, setCalendarSearch] = useState('');
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const range = useMemo(() => getRangeForView(selectedDate, view), [selectedDate, view]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const selectedWeekKeys = useMemo(() => new Set(weekDays.map((day) => formatDateKey(day))), [weekDays]);
  const monthDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const miniMonthRows = useMemo(
    () => Array.from({ length: 6 }, (_, rowIndex) => monthDays.slice(rowIndex * 7, rowIndex * 7 + 7)),
    [monthDays],
  );
  const visibleDays = useMemo(() => (view === 'day' ? [selectedDate] : weekDays), [selectedDate, view, weekDays]);
  const currentDate = useMemo(() => new Date(currentTime), [currentTime]);
  const currentDateKey = formatDateKey(currentDate);
  const visibleDateKeys = useMemo(() => new Set(visibleDays.map((day) => formatDateKey(day))), [visibleDays]);
  const currentTimeMinutes = getSastMinutes(currentDate.toISOString());
  const currentTimeLineTop = ((currentTimeMinutes - hourStart * 60) / 30) * slotHeight;
  const showCurrentTimeLine =
    (view === 'week' || view === 'day') &&
    visibleDateKeys.has(currentDateKey) &&
    currentTimeMinutes >= hourStart * 60 &&
    currentTimeMinutes <= hourEnd * 60;
  const currentTimeLabel = formatEventTime(currentDate.toISOString());
  const upcoming = useMemo(
    () => events.filter((event) => new Date(event.end).getTime() >= currentTime).slice(0, 5),
    [currentTime, events],
  );
  const todayEvents = useMemo(() => getEventsForDate(events, today), [events, today]);
  const selectedDateEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const selectedDateTag = useMemo(() => getDayPillTag(selectedDateEvents), [selectedDateEvents]);
  const selectedEventTag = useMemo(() => (selectedEvent ? getEventPillTag(selectedEvent) : null), [selectedEvent]);
  const selectedDateActionEvents = useMemo(() => selectedDateEvents.filter(isActionEvent), [selectedDateEvents]);
  const selectedDateActionPrompt = useMemo(() => getActionPrompt(selectedDateEvents), [selectedDateEvents]);
  const diagnosticFollowUpsDue = useMemo(() => getDiagnosticFollowUpsDue(leads, currentDate), [currentDate, leads]);
  const oldestDiagnosticFollowUp = diagnosticFollowUpsDue[0] || null;
  const overdueDiagnosticCount = diagnosticFollowUpsDue.filter((item) => item.daysOverdue > 0).length;
  const encodedAdminKey = useMemo(() => encodeURIComponent(adminKey), [adminKey]);
  const selectedDateNonActionEvents = useMemo(() => selectedDateEvents.filter((event) => !isActionEvent(event)), [selectedDateEvents]);
  const selectedDateAppointmentEvents = selectedDateNonActionEvents;
  const selectedDateExtraActionEvents = useMemo(
    () => selectedDateActionEvents.filter((event) => event.source !== 'follow_up'),
    [selectedDateActionEvents],
  );
  const attentionItemCount = diagnosticFollowUpsDue.length + selectedDateAppointmentEvents.length + selectedDateExtraActionEvents.length;
  const hasUrgentAttention = diagnosticFollowUpsDue.length > 0 || selectedDateExtraActionEvents.length > 0;
  const attentionBadgeLabel = attentionItemCount > 99 ? '99+' : String(attentionItemCount);
  const attentionStatusParts = [
    diagnosticFollowUpsDue.length > 0
      ? `${diagnosticFollowUpsDue.length} follow-up email${diagnosticFollowUpsDue.length === 1 ? '' : 's'}`
      : null,
    selectedDateAppointmentEvents.length > 0
      ? `${selectedDateAppointmentEvents.length} appointment${selectedDateAppointmentEvents.length === 1 ? '' : 's'}`
      : null,
    selectedDateExtraActionEvents.length > 0
      ? `${selectedDateExtraActionEvents.length} action item${selectedDateExtraActionEvents.length === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean);
  const attentionStatusLabel = attentionStatusParts.length > 0 ? attentionStatusParts.join(' + ') : 'No attention items';
  const normalizedCalendarSearch = calendarSearch.trim().toLowerCase();
  const calendarSearchMatches = useMemo(() => {
    if (!normalizedCalendarSearch) return [];

    return events
      .filter((event) => {
        const tag = getEventPillTag(event);
        return [
          event.title,
          event.description || '',
          event.location || '',
          tag.label,
          typeStyles[event.type].label,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedCalendarSearch);
      })
      .slice(0, 5);
  }, [events, normalizedCalendarSearch]);
  const nextEvent = todayEvents.find((event) => new Date(event.end).getTime() >= currentTime) || todayEvents[0];

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          key: adminKey,
          from: range.from,
          to: range.to,
        });
        const response = await fetch(`/api/calendar/events?${params.toString()}`);
        const data = (await response.json().catch(() => ({}))) as CalendarResponse & { error?: string };

        if (!response.ok) throw new Error(data.error || 'Could not load calendar events.');
        if (cancelled) return;

        setEvents(data.events || []);
        setAuthorized(Boolean(data.authorized));
        setAuthUrl(data.authUrl || '/api/auth/google');
        if (!data.authorized) setError(data.error || null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load calendar events.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [adminKey, range.from, range.to, refreshIndex]);

  function moveCalendar(direction: -1 | 1) {
    if (view === 'month') setSelectedDate((current) => addMonths(current, direction));
    if (view === 'week') setSelectedDate((current) => addDays(current, direction * 7));
    if (view === 'day') setSelectedDate((current) => addDays(current, direction));
  }

  function openCreate(date = selectedDate, time = '17:30') {
    setDetailsPanelOpen(true);
    setSelectedEvent(null);
    setDrawerMode('create');
    setDraft(getDefaultDraft(date, time));
    setConfirmDelete(false);
  }

  function openEvent(event: DashboardCalendarEvent) {
    setDetailsPanelOpen(true);
    setSelectedEvent(event);
    setDrawerMode(event.readOnly ? 'idle' : 'edit');
    setDraft(eventToDraft(event));
    setConfirmDelete(false);
  }

  function openEventFromSearch(event: DashboardCalendarEvent) {
    setSelectedDate(new Date(event.start));
    openEvent(event);
    setCalendarSearch('');
  }

  async function saveEvent() {
    setSaving(true);
    setError(null);

    const payload: DashboardCalendarEventPayload = {
      key: adminKey,
      title: draft.title,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      eventType: draft.eventType,
      description: draft.description,
      linkedLeadId: draft.linkedLeadId || null,
    };

    try {
      const isEdit = drawerMode === 'edit' && selectedEvent?.googleEventId;
      const response = await fetch(isEdit ? `/api/calendar/events/${selectedEvent.googleEventId}` : '/api/calendar/events', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) throw new Error(data.error || 'Could not save this event.');
      setRefreshIndex((current) => current + 1);
      setDrawerMode('idle');
      setSelectedEvent(null);
      setDraft(getDefaultDraft(selectedDate));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this event.');
    } finally {
      setSaving(false);
    }
  }

  function stageEventMove(event: DashboardCalendarEvent, date: Date, startTime: string) {
    if (!isEventMovable(event)) return;

    const moveDraft = getMoveTargetDraft(event, date, startTime);
    if (moveDraft.date === formatDateKey(new Date(event.start)) && moveDraft.startTime === formatEventTime(event.start)) {
      setDraggedEvent(null);
      return;
    }

    setPendingMove({
      event,
      draft: moveDraft,
      fromLabel: formatMoveLabel(new Date(event.start), formatEventTime(event.start), formatEventTime(event.end)),
      toLabel: formatMoveLabel(date, moveDraft.startTime, moveDraft.endTime),
    });
    setDraggedEvent(null);
  }

  function editPendingMove() {
    if (!pendingMove) return;
    setSelectedEvent(pendingMove.event);
    setDrawerMode('edit');
    setDraft(pendingMove.draft);
    setConfirmDelete(false);
    setPendingMove(null);
  }

  async function confirmMoveEvent() {
    if (!pendingMove?.event.googleEventId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events/${pendingMove.event.googleEventId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          ...pendingMove.draft,
          linkedLeadId: pendingMove.draft.linkedLeadId || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) throw new Error(data.error || 'Could not move this event.');
      setSelectedDate(new Date(`${pendingMove.draft.date}T00:00:00`));
      setRefreshIndex((current) => current + 1);
      setPendingMove(null);
      setSelectedEvent(null);
      setDrawerMode('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not move this event.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!selectedEvent?.googleEventId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events/${selectedEvent.googleEventId}?key=${encodeURIComponent(adminKey)}`, {
        method: 'DELETE',
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) throw new Error(data.error || 'Could not delete this event.');
      setRefreshIndex((current) => current + 1);
      setDrawerMode('idle');
      setSelectedEvent(null);
      setConfirmDelete(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete this event.');
    } finally {
      setSaving(false);
    }
  }

  const sidebar = (
    <aside className="grid gap-4 rounded-[8px] bg-white p-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="font-serif text-[22px] leading-tight text-[#142334]">
            {formatDisplayDate(selectedDate, { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelectedDate((current) => addMonths(current, -1))} className="grid h-8 w-8 place-items-center rounded-full bg-[#F8F6F4]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setSelectedDate((current) => addMonths(current, 1))} className="grid h-8 w-8 place-items-center rounded-full bg-[#F8F6F4]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid gap-1">
          {miniMonthRows.map((row) => {
            const rowKey = row.map((day) => formatDateKey(day)).join('-');
            const rowHighlighted = view === 'week' && row.some((day) => selectedWeekKeys.has(formatDateKey(day)));

            return (
              <div key={rowKey} className="relative grid grid-cols-7 gap-0">
                {rowHighlighted && <span className="absolute inset-x-0 top-0.5 bottom-0.5 rounded-full bg-[#142334]" />}
                {row.map((day) => {
                  const dateKey = formatDateKey(day);
                  const active = dateKey === formatDateKey(selectedDate);
                  const today = dateKey === formatDateKey(new Date());
                  const muted = day.getMonth() !== selectedDate.getMonth();
                  const dayEvents = getEventsForDate(events, day);
                  const eventDots = Array.from(new Set(dayEvents.map((event) => event.type))).slice(0, 3);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`relative z-10 grid h-9 place-items-center rounded-full text-[12px] transition ${
                        rowHighlighted
                          ? 'text-white hover:bg-white/10'
                          : muted
                            ? 'text-[#6B6B6B]/35 hover:bg-[#F8F6F4]'
                            : 'text-[#142334] hover:bg-[#F8F6F4]'
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full ${
                          active
                            ? 'bg-[#C9AD98] text-[#142334] ring-2 ring-[#142334]'
                            : today && !rowHighlighted
                              ? 'bg-[#142334] text-white'
                              : muted && !rowHighlighted
                                ? 'text-[#6B6B6B]/35'
                                : ''
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {eventDots.length > 0 && (
                        <span className="absolute bottom-[5px] flex items-center justify-center gap-0.5">
                          {eventDots.map((type) => (
                            <span
                              key={type}
                              className={`h-1 w-1 rounded-full ${
                                rowHighlighted && type === 'session' ? 'bg-white' : typeStyles[type].dot
                              }`}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[8px] bg-[#F8F6F4] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B6B]">Upcoming</p>
        <div className="mt-3 grid gap-2">
          {upcoming.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-[#6B6B6B]">No upcoming events in this range.</p>
          ) : (
            upcoming.map((event) => (
              <button key={event.id} type="button" onClick={() => openEvent(event)} className="grid gap-1 rounded-[8px] bg-white p-3 text-left transition hover:bg-[#F5F3EE]">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#142334]">
                  <span className={`h-2 w-2 rounded-full ${typeStyles[event.type].dot}`} />
                  {event.title}
                </span>
                <span className="text-[11px] text-[#6B6B6B]">
                  {formatDisplayDate(new Date(event.start), { day: '2-digit', month: 'short' })}, {formatEventTime(event.start)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[8px] bg-[#F8F6F4] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B6B]">Event types</p>
        <div className="mt-3 grid gap-2">
          {(['session', 'delivery', 'follow_up', 'masterclass', 'personal', 'content'] as DashboardCalendarEventType[]).map((type) => (
            <div key={type} className="flex items-center justify-between gap-3 text-[12px] text-[#142334]">
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${typeStyles[type].dot}`} />
                {typeStyles[type].label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[8px] bg-[#142334] p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Today</p>
        <p className="mt-2 font-serif text-[26px] leading-tight">{formatDisplayDate(new Date(), { day: '2-digit', month: 'long' })}</p>
        <p className="mt-2 text-[12px] text-white/65">
          {todayEvents.length} event{todayEvents.length === 1 ? '' : 's'} today
        </p>
        {nextEvent && (
          <button type="button" onClick={() => openEvent(nextEvent)} className="mt-4 w-full rounded-[8px] bg-white/10 p-3 text-left transition hover:bg-white/15">
            <span className="block text-[13px] font-semibold">{nextEvent.title}</span>
            <span className="mt-1 block text-[11px] text-white/65">{formatEventTime(nextEvent.start)}</span>
          </button>
        )}
      </div>
    </aside>
  );

  function renderEventCard(event: DashboardCalendarEvent, compact = false) {
    const styles = typeStyles[event.type];
    const movable = isEventMovable(event);
    return (
      <button
        key={event.id}
        type="button"
        draggable={movable}
        onDragStart={(dragEvent) => {
          if (!movable) return;
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', event.id);
          setDraggedEvent(event);
        }}
        onDragEnd={() => setDraggedEvent(null)}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          openEvent(event);
        }}
        title={movable ? 'Drag to move this event' : event.isCalBooking ? 'Booked via Cal.com. Time changes happen in Cal.com.' : undefined}
        className={`w-full overflow-hidden rounded-[8px] px-3 py-2 text-left ring-1 ring-black/5 transition hover:brightness-95 ${
          movable ? 'cursor-grab active:cursor-grabbing' : ''
        } ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        style={{
          background: styles.bg,
          boxShadow: '0 12px 24px rgba(20, 35, 52, 0.18)',
          color: styles.text,
        }}
      >
        <span className="flex items-center gap-1.5 truncate font-semibold">
          {movable ? <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-70" /> : event.isCalBooking ? <Lock className="h-3 w-3 shrink-0 opacity-70" /> : null}
          <span className="truncate">{event.title}</span>
        </span>
        <span className="mt-1 flex items-center gap-1 truncate opacity-80">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatEventTime(event.start)} - {formatEventTime(event.end)}</span>
        </span>
      </button>
    );
  }

  function renderTimedColumn(day: Date) {
    const dayEvents = getEventsForDate(events, day);
    const columnHeight = (hourEnd - hourStart) * slotHeight * 2;

    return (
      <div key={formatDateKey(day)} className="relative border-l border-[#E4D8CB]" style={{ height: columnHeight }}>
        {hourLabels.slice(0, -1).flatMap((hour) =>
          ([0, 1] as const).map((half) => {
            const time = getSlotTime(hour, half);
            const blocked = !isCoachingWindow(day, time);
            return (
              <button
                key={`${formatDateKey(day)}-${time}`}
                type="button"
                onClick={() => openCreate(day, time)}
                onDragOver={(dragEvent) => {
                  if (!draggedEvent || !isEventMovable(draggedEvent)) return;
                  dragEvent.preventDefault();
                  dragEvent.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(dragEvent) => {
                  dragEvent.preventDefault();
                  if (draggedEvent) stageEventMove(draggedEvent, day, time);
                }}
                className={`group absolute left-0 right-0 border-t border-[#E4D8CB] transition focus-visible:outline-none ${
                  draggedEvent && isEventMovable(draggedEvent) ? 'outline outline-1 outline-[#C9AD98]/15' : ''
                } ${blocked ? 'bg-[#F0EDE8]/65' : 'bg-white'}`}
                style={{ top: ((hour - hourStart) * 2 + half) * slotHeight, height: slotHeight }}
                aria-label={`Create event on ${formatDateKey(day)} at ${time}`}
              >
                <span className="pointer-events-none absolute inset-x-1 inset-y-1 grid place-items-center rounded-[8px] bg-[#BFA490]/0 transition group-hover:bg-[#BFA490]/30 group-focus-visible:bg-[#BFA490]/30 group-focus-visible:ring-2 group-focus-visible:ring-[#BFA490]/45">
                  <span className="grid h-5 w-5 scale-90 place-items-center rounded-full bg-[#142334] text-[13px] font-semibold leading-none text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                    +
                  </span>
                </span>
              </button>
            );
          }),
        )}
        {dayEvents.map((event) => {
          const position = getEventPosition(event);
          return (
            <div key={event.id} className="absolute left-1 right-1 z-10" style={{ top: position.top + 4, height: Math.max(28, position.height - 8) }}>
              {renderEventCard(event)}
            </div>
          );
        })}
      </div>
    );
  }

  const mainCalendar = (
    <div className="min-w-0 rounded-[8px] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4D8CB] p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Calendar / {view}</p>
          <h2 className="mt-1 font-serif text-[32px] leading-tight text-[#142334]">{getViewTitle(selectedDate, view)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-[#F8F6F4] p-1">
            {(['month', 'week', 'day'] as DashboardCalendarView[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`h-9 rounded-full px-4 text-[12px] font-semibold capitalize transition ${
                  view === mode ? 'bg-white text-[#142334]' : 'text-[#6B6B6B] hover:text-[#142334]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => moveCalendar(-1)} className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#F8F6F4]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="h-10 rounded-[8px] bg-[#F8F6F4] px-4 text-[12px] font-semibold">
            Today
          </button>
          <button type="button" onClick={() => moveCalendar(1)} className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#F8F6F4]">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            disabled={!authorized}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[520px] place-items-center text-[#6B6B6B]">
          <span className="inline-flex items-center gap-2 text-[14px]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar...
          </span>
        </div>
      ) : !authorized ? (
        <div className="grid min-h-[520px] place-items-center p-8 text-center">
          <div className="max-w-[420px]">
            <CalendarDays className="mx-auto h-12 w-12 text-[#C9AD98]" />
            <h3 className="mt-4 font-serif text-[30px] leading-tight text-[#142334]">Connect Google Calendar</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#6B6B6B]">
              The calendar needs access to Kagiso&apos;s Google Calendar to display and manage events.
            </p>
            {error && <p className="mt-3 text-[12px] leading-relaxed text-[#9A5C00]">{error}</p>}
            <a
              href={authUrl}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#142334] px-6 text-[13px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              Connect Google Calendar <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      ) : view === 'month' ? (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <p key={day} className="px-2 py-2">{day}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const dayEvents = getEventsForDate(events, day);
              const muted = day.getMonth() !== selectedDate.getMonth();
              return (
                <button
                  key={formatDateKey(day)}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day);
                    setView('day');
                  }}
                  className={`min-h-[132px] rounded-[8px] border border-[#E4D8CB] p-2 text-left transition hover:border-[#C9AD98] ${
                    muted ? 'bg-[#F8F6F4] text-[#6B6B6B]' : 'bg-white text-[#142334]'
                  }`}
                >
                  <span className="font-serif text-[22px]">{day.getDate()}</span>
                  <span className="mt-2 grid gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span key={event.id} className="truncate rounded-full px-2 py-1 text-[11px]" style={{ background: typeStyles[event.type].bg, color: typeStyles[event.type].text }}>
                        {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && <span className="text-[11px] text-[#6B6B6B]">+{dayEvents.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={view === 'day' ? 'min-w-[620px]' : 'min-w-[920px]'}>
            <div className={`grid border-b border-[#E4D8CB] ${view === 'day' ? 'grid-cols-[72px_1fr]' : 'grid-cols-[72px_repeat(7,minmax(110px,1fr))]'}`}>
              <div />
              {visibleDays.map((day) => {
                const active = formatDateKey(day) === formatDateKey(selectedDate);
                return (
                  <button
                    key={formatDateKey(day)}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`m-2 rounded-[8px] px-3 py-3 text-center transition ${active ? 'bg-[#142334] text-white' : 'bg-[#F8F6F4] text-[#142334]'}`}
                  >
                    <span className="block text-[12px]">{formatDisplayDate(day, { weekday: 'long' })}</span>
                    <span className="mt-1 block font-serif text-[28px] leading-none">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className={`relative grid ${view === 'day' ? 'grid-cols-[72px_1fr]' : 'grid-cols-[72px_repeat(7,minmax(110px,1fr))]'}`}>
              {showCurrentTimeLine && (
                <div
                  className="pointer-events-none absolute right-0 z-30 h-[2px] bg-[#BFA490] shadow-[0_0_0_1px_rgba(191,164,144,0.18),0_2px_8px_rgba(191,164,144,0.35)]"
                  style={{ left: '72px', top: currentTimeLineTop }}
                  aria-label={`Current time ${currentTimeLabel}`}
                >
                  <span className="absolute -left-[5px] -top-[4px] h-2.5 w-2.5 rounded-full bg-[#BFA490] ring-2 ring-white" />
                </div>
              )}
              <div className="relative border-r border-[#E4D8CB]" style={{ height: (hourEnd - hourStart) * slotHeight * 2 }}>
                {hourLabels.slice(0, -1).map((hour) => (
                  <div key={hour} className="absolute left-0 right-0 -translate-y-2 pr-3 text-right text-[12px] text-[#6B6B6B]" style={{ top: (hour - hourStart) * slotHeight * 2 }}>
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {visibleDays.map(renderTimedColumn)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const drawerTitle = selectedEvent ? selectedEvent.title : drawerMode === 'create' ? 'Create new event' : 'Event details';
  const editable = drawerMode === 'create' || (drawerMode === 'edit' && selectedEvent && !selectedEvent.readOnly);
  const timeLocked = Boolean(selectedEvent?.isCalBooking);

  const drawer = (
    <aside className="rounded-[8px] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Details</p>
          <h3 className="mt-1 font-serif text-[22px] leading-tight text-[#142334]">{drawerTitle}</h3>
        </div>
        {(selectedEvent || drawerMode !== 'idle') && (
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(null);
              setDrawerMode('idle');
              setConfirmDelete(false);
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#F8F6F4]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {drawerMode === 'idle' && !selectedEvent ? (
        <div className="relative mt-6 rounded-[8px] bg-[#F8F6F4] p-5">
          {selectedDateTag && (
            <span className={`${tagBaseClass} absolute right-4 top-4 ${selectedDateTag.className}`}>
              {selectedDateTag.label}
            </span>
          )}
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#C9AD98]">
            <CalendarDays className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B6B]">
            {formatDisplayDate(selectedDate, { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="mt-2 font-serif text-[26px] leading-tight text-[#142334]">
            {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'} planned
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-[#6B6B6B]">
            Select an event or click an open time slot to start planning.
          </p>
          {diagnosticFollowUpsDue.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-[8px] bg-[#142334] text-white">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E8D8CB]">
                      <Mail className="h-3.5 w-3.5" />
                      Diagnostic follow-ups
                    </p>
                    <p className="mt-2 font-serif text-[26px] leading-none">
                      {diagnosticFollowUpsDue.length} email{diagnosticFollowUpsDue.length === 1 ? '' : 's'} waiting
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#142334]">
                    {overdueDiagnosticCount > 0 ? `${overdueDiagnosticCount} overdue` : 'Due today'}
                  </span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-white/78">
                  These people have received their diagnostic results. Send the result follow-up email before the lead cools down.
                </p>
                {oldestDiagnosticFollowUp && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-[8px] bg-white/10 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8D8CB]">Oldest wait</p>
                      <p className="mt-1 font-serif text-[22px] leading-none">
                        {getOverdueLabel(oldestDiagnosticFollowUp.daysOverdue)}
                      </p>
                    </div>
                    <div className="rounded-[8px] bg-white/10 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E8D8CB]">Next action</p>
                      <p className="mt-1 text-[12px] font-semibold leading-snug">Email top leads first</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-1 bg-white/8 px-3 pb-3">
                {diagnosticFollowUpsDue.slice(0, 3).map((item) => (
                  <Link
                    key={item.lead.id}
                    href={`/resources/career-diagnostic/submissions/${item.lead.id}?key=${encodedAdminKey}`}
                    className="flex items-center justify-between gap-3 rounded-[8px] bg-white px-3 py-2 text-[#142334] transition hover:bg-[#F8F6F4]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{item.lead.first_name || item.lead.email}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#6B6B6B]">
                        {item.lead.archetype_payload?.service || item.lead.archetype_name || 'Diagnostic result'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#EFE6DF] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#705746]">
                      {getOverdueLabel(item.daysOverdue)}
                    </span>
                  </Link>
                ))}
                {diagnosticFollowUpsDue.length > 3 && (
                  <Link
                    href={`/resources/career-diagnostic/submissions?key=${encodedAdminKey}&tab=leads`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-white/10"
                  >
                    View {diagnosticFollowUpsDue.length - 3} more follow-up{diagnosticFollowUpsDue.length - 3 === 1 ? '' : 's'}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          )}
          {selectedDateActionPrompt && (
            <div className="mt-4 rounded-[8px] border border-[#D6C1B2] bg-white p-3">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#705746]">
                <Mail className="h-3.5 w-3.5" />
                Action queue
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#142334]">{selectedDateActionPrompt}</p>
            </div>
          )}
          {selectedDateEvents.length > 0 && (
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A09086]">Scheduled blocks</p>
                {selectedDateActionEvents.length > 0 && (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#705746]">
                    {selectedDateActionEvents.length} action{selectedDateActionEvents.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {selectedDateEvents.slice(0, 3).map((event) => {
                const tag = getEventPillTag(event);
                const action = isActionEvent(event);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEvent(event)}
                    className="grid gap-2 rounded-[8px] bg-white p-3 text-left transition hover:bg-[#FBF7F3]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#142334]">{event.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                        <Clock className="h-3.5 w-3.5 text-[#BFA490]" />
                        <span>{formatEventTime(event.start)} - {formatEventTime(event.end)}</span>
                        <span className={`${tagBaseClass} max-w-full shrink-0 px-2 py-0.5 text-[9px] ${tag.className}`}>
                          {tag.label}
                        </span>
                      </span>
                    </span>
                    {action && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#705746]">
                        <Mail className="h-3.5 w-3.5" />
                        {event.type === 'follow_up' ? 'Follow up by email' : event.type === 'delivery' ? 'Check delivery progress' : 'Review task'}
                      </span>
                    )}
                  </button>
                );
              })}
              {selectedDateEvents.length > 3 && (
                <p className="text-[11px] font-medium text-[#6B6B6B]">
                  +{selectedDateEvents.length - 3} more block{selectedDateEvents.length - 3 === 1 ? '' : 's'} on this day
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => openCreate(selectedDate)}
            disabled={!authorized}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#142334] px-4 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" />
            New event
          </button>
        </div>
      ) : selectedEvent?.readOnly ? (
        <div className="relative mt-6 grid gap-4 rounded-[8px] bg-[#FCFBFA] p-4">
          {selectedEventTag && (
            <span className={`${tagBaseClass} absolute right-4 top-4 ${selectedEventTag.className}`}>
              {selectedEventTag.label}
            </span>
          )}
          <div className="rounded-[8px] bg-[#F8F6F4] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Generated event</p>
            <p className="mt-3 text-[14px] leading-relaxed text-[#142334]">{selectedEvent.description || 'Generated from dashboard data.'}</p>
          </div>
          <div className="grid gap-2 text-[13px] text-[#142334]">
            <p className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C9AD98]" />
              {formatDisplayDate(new Date(selectedEvent.start), { day: '2-digit', month: 'long', year: 'numeric' })}, {formatEventTime(selectedEvent.start)}
            </p>
            <p className="text-[12px] leading-relaxed text-[#6B6B6B]">
              This event is generated automatically from your client, lead, or task data.
            </p>
          </div>
          {selectedEvent.linkHref && (
            <Link href={selectedEvent.linkHref} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#142334] px-4 text-[13px] font-semibold text-white">
              {selectedEvent.linkLabel || 'Open record'} <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {selectedEvent?.isCalBooking && (
            <div className="rounded-[8px] bg-[#FEF3C7] p-3 text-[12px] leading-relaxed text-[#92400E]">
              <Lock className="mr-1 inline h-3.5 w-3.5" />
              Booked via Cal.com. Time changes must be made in Cal.com.
            </div>
          )}
          <label className="grid gap-2">
            <span className={formLabelClass}>Title</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className={formFieldClass}
            />
          </label>
          <label className="grid gap-2">
            <span className={formLabelClass}>Date</span>
            <input
              type="date"
              value={draft.date}
              disabled={timeLocked}
              onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              className={formFieldClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={formLabelClass}>Start</span>
              <input
                type="time"
                step="1800"
                value={draft.startTime}
                disabled={timeLocked}
                onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                className={formFieldClass}
              />
            </label>
            <label className="grid gap-2">
              <span className={formLabelClass}>End</span>
              <input
                type="time"
                step="1800"
                value={draft.endTime}
                disabled={timeLocked}
                onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                className={formFieldClass}
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className={formLabelClass}>Event type</span>
            <select
              value={draft.eventType}
              onChange={(event) => setDraft((current) => ({ ...current, eventType: event.target.value as DashboardCalendarEventType }))}
              className={formFieldClass}
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          {drawerMode === 'create' && draft.eventType === 'session' && (
            <label className="grid gap-2">
              <span className={formLabelClass}>Linked lead</span>
              <select
                value={draft.linkedLeadId}
                onChange={(event) => setDraft((current) => ({ ...current, linkedLeadId: event.target.value }))}
                className={formFieldClass}
              >
                <option value="">No linked lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.first_name} - {lead.email}</option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-2">
            <span className={formLabelClass}>Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className={formTextareaClass}
            />
          </label>
          {error && <p className="text-[12px] leading-relaxed text-[#DC2626]">{error}</p>}
          {editable && (
            <button
              type="button"
              onClick={saveEvent}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#142334] px-5 text-[13px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : drawerMode === 'create' ? 'Add Event' : 'Save changes'}
            </button>
          )}
          {drawerMode === 'edit' && selectedEvent?.googleEventId && !selectedEvent.isCalBooking && (
            <button
              type="button"
              onClick={deleteEvent}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#FEE2E2] px-5 text-[13px] font-semibold text-[#DC2626] transition hover:bg-[#FEE2E2]"
            >
              <Trash2 className="h-4 w-4" />
              {confirmDelete ? 'Confirm delete' : 'Delete event'}
            </button>
          )}
        </div>
      )}
    </aside>
  );

  const calendarTopBar = (
    <div className="rounded-[8px] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[170px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Welcome,</p>
          <h2 className="mt-0.5 font-serif text-[22px] leading-none text-[#142334]">Kagiso</h2>
        </div>

        <div className="relative min-w-[260px] flex-1 lg:max-w-[520px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
          <input
            type="search"
            value={calendarSearch}
            onChange={(event) => setCalendarSearch(event.target.value)}
            placeholder="Find event, session, lead..."
            className="h-11 w-full rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] pl-10 pr-3 text-[13px] font-medium text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
          />
          {normalizedCalendarSearch && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[8px] border border-[#E4D8CB] bg-white">
              {calendarSearchMatches.length > 0 ? (
                <div className="max-h-[280px] overflow-y-auto p-2">
                  {calendarSearchMatches.map((event) => {
                    const tag = getEventPillTag(event);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                        onClick={() => openEventFromSearch(event)}
                        className="flex w-full items-start justify-between gap-3 rounded-[8px] px-3 py-2 text-left transition hover:bg-[#F8F6F4]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-[#142334]">{event.title}</span>
                          <span className="mt-0.5 block text-[11px] text-[#6B6B6B]">
                            {formatDisplayDate(new Date(event.start), { day: '2-digit', month: 'short' })} · {formatEventTime(event.start)}
                          </span>
                        </span>
                        <span className={`${tagBaseClass} shrink-0 ${tag.className}`}>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-3 text-[13px] text-[#6B6B6B]">No calendar events found.</p>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A09086]">Synced {currentTimeLabel}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#6B6B6B]">
              {formatDisplayDate(selectedDate, { weekday: 'short', day: '2-digit', month: 'short' })} - {attentionStatusLabel}
            </p>
            <p className="hidden">
              {formatDisplayDate(selectedDate, { weekday: 'short', day: '2-digit', month: 'short' })} · {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetailsPanelOpen((current) => !current)}
            aria-pressed={detailsPanelOpen}
            className={`relative grid h-11 w-11 place-items-center rounded-full transition ${
              hasUrgentAttention
                ? 'bg-[#142334] text-white hover:bg-[#22364C]'
                : detailsPanelOpen
                  ? 'bg-[#F8F6F4] text-[#142334] hover:bg-[#EFE6DF]'
                  : 'bg-[#EFE6DF] text-[#705746] hover:bg-[#E4D8CB]'
            }`}
            aria-label={`${detailsPanelOpen ? 'Hide' : 'Show'} details panel. ${attentionItemCount} attention item${attentionItemCount === 1 ? '' : 's'}.`}
          >
            <Bell className={`h-4 w-4 ${hasUrgentAttention ? 'calendar-bell-wobble' : ''}`} />
            {attentionItemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#BFA490] px-1 text-[10px] font-bold text-[#142334] ring-2 ring-white">
                {attentionBadgeLabel}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 rounded-full bg-[#F8F6F4] p-1 pr-3">
            <Image
              src="/images/author/ck-profile.png"
              alt="Kagiso"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="hidden text-[12px] font-semibold text-[#142334] sm:inline">Coach Kagiso</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section id="calendar-planning" className="pb-10">
      {calendarTopBar}
      <div
        className={`mt-3 grid w-full gap-3 transition-[grid-template-columns] duration-300 ${
          detailsPanelOpen ? 'xl:grid-cols-[280px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[280px_minmax(0,1fr)]'
        }`}
      >
        {sidebar}
        {mainCalendar}
        {detailsPanelOpen && <div className="calendar-details-slide-in">{drawer}</div>}
      </div>
      {pendingMove && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#142334]/35 px-4">
          <div className="w-full max-w-[430px] rounded-[8px] bg-white p-5 text-[#142334]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Confirm move</p>
            <h3 className="mt-2 font-serif text-[28px] leading-tight">Move this event?</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#6B6B6B]">
              {pendingMove.event.title}
            </p>
            <div className="mt-4 grid gap-2 rounded-[8px] bg-[#F8F6F4] p-4 text-[13px]">
              <p>
                <span className="font-semibold text-[#142334]">From:</span> {pendingMove.fromLabel}
              </p>
              <p>
                <span className="font-semibold text-[#142334]">To:</span> {pendingMove.toLabel}
              </p>
            </div>
            {error && <p className="mt-3 text-[12px] leading-relaxed text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                disabled={saving}
                className="h-10 rounded-full border border-[#D8C8BB] px-4 text-[12px] font-semibold text-[#142334] transition hover:border-[#142334] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editPendingMove}
                disabled={saving}
                className="h-10 rounded-full bg-[#F8F6F4] px-4 text-[12px] font-semibold text-[#142334] transition hover:bg-[#E4D8CB] disabled:opacity-50"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={confirmMoveEvent}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#142334] px-4 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Moving...' : 'Move event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
