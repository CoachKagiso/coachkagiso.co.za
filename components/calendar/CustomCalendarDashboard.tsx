'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  Plus,
  Save,
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
  const [currentTime] = useState(() => Date.now());
  const [today] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<DashboardCalendarEvent | null>(null);
  const [drawerMode, setDrawerMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [draft, setDraft] = useState<DraftEvent>(() => getDefaultDraft());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const range = useMemo(() => getRangeForView(selectedDate, view), [selectedDate, view]);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const visibleDays = view === 'day' ? [selectedDate] : weekDays;
  const upcoming = useMemo(
    () => events.filter((event) => new Date(event.end).getTime() >= currentTime).slice(0, 5),
    [currentTime, events],
  );
  const todayEvents = useMemo(() => getEventsForDate(events, today), [events, today]);
  const nextEvent = todayEvents.find((event) => new Date(event.end).getTime() >= currentTime) || todayEvents[0];

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
    setSelectedEvent(null);
    setDrawerMode('create');
    setDraft(getDefaultDraft(date, time));
    setConfirmDelete(false);
  }

  function openEvent(event: DashboardCalendarEvent) {
    setSelectedEvent(event);
    setDrawerMode(event.readOnly ? 'idle' : 'edit');
    setDraft(eventToDraft(event));
    setConfirmDelete(false);
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
        <div className="mt-2 grid grid-cols-7 gap-1">
          {getMonthGrid(selectedDate).map((day) => {
            const dateKey = formatDateKey(day);
            const active = dateKey === formatDateKey(selectedDate);
            const today = dateKey === formatDateKey(new Date());
            const muted = day.getMonth() !== selectedDate.getMonth();
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`grid h-8 place-items-center rounded-full text-[12px] transition ${
                  active
                    ? 'bg-[#C9AD98] text-[#142334]'
                    : today
                      ? 'bg-[#142334] text-white'
                      : muted
                        ? 'text-[#6B6B6B]/35 hover:bg-[#F8F6F4]'
                        : 'text-[#142334] hover:bg-[#F8F6F4]'
                }`}
              >
                {day.getDate()}
              </button>
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
    return (
      <button
        key={event.id}
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          openEvent(event);
        }}
        className={`w-full overflow-hidden rounded-[8px] px-3 py-2 text-left transition hover:brightness-95 ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        style={{ background: styles.bg, color: styles.text }}
      >
        <span className="block truncate font-semibold">{event.title}</span>
        <span className="mt-1 block truncate opacity-80">
          {formatEventTime(event.start)} - {formatEventTime(event.end)}
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
                className={`absolute left-0 right-0 border-t border-[#E4D8CB] transition hover:bg-[#C9AD98]/20 ${
                  blocked ? 'bg-[#F0EDE8]/65' : 'bg-white'
                }`}
                style={{ top: ((hour - hourStart) * 2 + half) * slotHeight, height: slotHeight }}
                aria-label={`Create event on ${formatDateKey(day)} at ${time}`}
              />
            );
          }),
        )}
        {dayEvents.map((event) => {
          const position = getEventPosition(event);
          return (
            <div key={event.id} className="absolute left-2 right-2 z-10" style={{ top: position.top + 4, height: Math.max(28, position.height - 8) }}>
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
            <div className={`grid ${view === 'day' ? 'grid-cols-[72px_1fr]' : 'grid-cols-[72px_repeat(7,minmax(110px,1fr))]'}`}>
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
        <div className="mt-6 rounded-[8px] bg-[#F8F6F4] p-5 text-[14px] leading-relaxed text-[#6B6B6B]">
          Select an event or click an open time slot to start planning.
        </div>
      ) : selectedEvent?.readOnly ? (
        <div className="mt-6 grid gap-4">
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
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Title</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Date</span>
            <input
              type="date"
              value={draft.date}
              disabled={timeLocked}
              onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
              className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334] disabled:bg-[#F8F6F4] disabled:text-[#6B6B6B]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Start</span>
              <input
                type="time"
                step="1800"
                value={draft.startTime}
                disabled={timeLocked}
                onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334] disabled:bg-[#F8F6F4] disabled:text-[#6B6B6B]"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">End</span>
              <input
                type="time"
                step="1800"
                value={draft.endTime}
                disabled={timeLocked}
                onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334] disabled:bg-[#F8F6F4] disabled:text-[#6B6B6B]"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Event type</span>
            <select
              value={draft.eventType}
              onChange={(event) => setDraft((current) => ({ ...current, eventType: event.target.value as DashboardCalendarEventType }))}
              className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334]"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          {drawerMode === 'create' && draft.eventType === 'session' && (
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Linked lead</span>
              <select
                value={draft.linkedLeadId}
                onChange={(event) => setDraft((current) => ({ ...current, linkedLeadId: event.target.value }))}
                className="h-11 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none focus:border-[#142334]"
              >
                <option value="">No linked lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.first_name} - {lead.email}</option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="h-28 resize-none rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[#142334] outline-none focus:border-[#142334]"
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

  return (
    <section id="calendar-planning" className="pb-10">
      <div className="grid w-full gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        {sidebar}
        {mainCalendar}
        {drawer}
      </div>
    </section>
  );
}
