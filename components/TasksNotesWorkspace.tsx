'use client';

import { useMemo, useState } from 'react';
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  ListChecks,
  Mail,
  Mic,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { TaskModal } from '@/components/tasks/TaskModal';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import {
  getPaymentClientName,
  mergeTasks,
  sortTasks,
  taskSortOptions,
  taskTypes,
  type DashboardNote,
  type ManualTaskRecord,
  type Task,
  type TaskSort,
  type TaskStatus,
  type TaskType,
} from '@/lib/dashboard-tasks';

type TasksNotesWorkspaceProps = {
  adminKey: string;
  initialTasks: Task[];
  leads: DiagnosticSubmission[];
  clientOps: ClientOperation[];
  standaloneNotes: DashboardNote[];
  strongestContentSignal: string;
  newLeadCount: number;
  dueFollowUpCount: number;
  paidDeliveryPressureCount: number;
};

type TaskView = 'kanban' | 'timeline' | 'spreadsheet';
type TaskTypeFilter = 'all' | TaskType;

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const columnMeta: Record<TaskStatus, { label: string; accent: string; dot: string; empty: string }> = {
  todo: {
    label: 'To Do',
    accent: '#D1D5DB',
    dot: 'bg-[#D1D5DB]',
    empty: 'No pending tasks right now.',
  },
  waiting: {
    label: 'Waiting',
    accent: '#F59E0B',
    dot: 'bg-[#F59E0B]',
    empty: 'No follow-ups waiting on a response.',
  },
  in_progress: {
    label: 'In Progress',
    accent: '#3B82F6',
    dot: 'bg-[#3B82F6]',
    empty: 'No active delivery or client work.',
  },
  done: {
    label: 'Done',
    accent: '#22C55E',
    dot: 'bg-[#22C55E]',
    empty: 'Nothing closed yet this month.',
  },
};

const typeLabels: { label: string; value: TaskTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Lead', value: 'LEAD' },
  { label: 'Delivery', value: 'DELIVERY' },
  { label: 'Content', value: 'CONTENT' },
  { label: 'Personal', value: 'PERSONAL' },
];

const taskIconMap: Record<TaskType, typeof Mail> = {
  LEAD: Mail,
  DELIVERY: PackageCheck,
  CONTENT: Mic,
  PERSONAL: StickyNote,
};

const taskViewModes: { value: TaskView; label: string; Icon: typeof ListChecks }[] = [
  { value: 'kanban', label: 'Kanban', Icon: ListChecks },
  { value: 'timeline', label: 'Timeline', Icon: CalendarClock },
  { value: 'spreadsheet', label: 'Spreadsheet', Icon: FileText },
];

const leadStatusByTaskStatus: Record<TaskStatus, DiagnosticLeadStatus> = {
  todo: 'new',
  waiting: 'contacted',
  in_progress: 'discovery_booked',
  done: 'closed',
};

const leadStatusLabels: Record<DiagnosticLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  discovery_booked: 'Booked',
  paid: 'Paid',
  follow_up_later: 'Follow up',
  not_a_fit: 'Not a fit',
  closed: 'Closed',
  archived: 'Archived',
};

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function buildTabHref(key: string, tab: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (tab !== 'dashboard') params.set('tab', tab);
  Object.entries(extra).forEach(([name, value]) => {
    if (value) params.set(name, value);
  });
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function formatTaskDue(task: Task) {
  if (!task.dueDate) return 'No due date';
  const date = formatShortDate(task.dueDate);
  return task.dueTime ? `${date} - ${task.dueTime}` : date;
}

function getTaskTypeClass(type: TaskType) {
  if (type === 'DELIVERY') return 'bg-[#BFDBFE] text-[#1E40AF]';
  if (type === 'CONTENT') return 'bg-[#E9D5FF] text-[#6B21A8]';
  if (type === 'PERSONAL') return 'bg-[#CCFBF1] text-[#0F766E]';
  return 'bg-[#F5C07A] text-[#7A4A00]';
}

function getStatusBadgeClass(status: TaskStatus, priority: number) {
  if (priority >= 100 && status !== 'done') return 'bg-[#FFF5F2] text-[#A24E37]';
  if (status === 'waiting') return 'bg-[#FFF8EB] text-[#9A5C00]';
  if (status === 'in_progress') return 'bg-[#EEF4FA] text-[#284B70]';
  if (status === 'done') return 'bg-[#EEF7EF] text-[#355C3A]';
  return 'bg-[#F4F0EC] text-[#6B6B6B]';
}

function statusLabel(status: TaskStatus) {
  return statusOptions.find((option) => option.value === status)?.label || status;
}

function getRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en-ZA', { numeric: 'auto' });
  const match = units.find(([, unitSeconds]) => seconds >= unitSeconds);
  if (!match) return 'Just now';
  return rtf.format(-Math.floor(seconds / match[1]), match[0]);
}

function getLeadName(lead: DiagnosticSubmission) {
  return lead.first_name || lead.email || 'Lead';
}

function getTaskDayKey(task: Task) {
  if (!task.dueDate) return 'No due date';
  const date = new Date(task.dueDate);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'full',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

async function requestJson<T>(url: string, method: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function TasksNotesWorkspace({
  adminKey,
  initialTasks,
  leads,
  clientOps,
  standaloneNotes,
  strongestContentSignal,
  newLeadCount,
  dueFollowUpCount,
  paidDeliveryPressureCount,
}: TasksNotesWorkspaceProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [leadRecords, setLeadRecords] = useState(leads);
  const [notes, setNotes] = useState(standaloneNotes);
  const [view, setView] = useState<TaskView>('kanban');
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('priority');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const activeLeadCount = leadRecords.filter((lead) => !['archived', 'not_a_fit', 'closed'].includes(lead.lead_status)).length;
  const activeClientTaskCount = tasks.filter((task) => task.type === 'DELIVERY' && task.status !== 'done').length;
  const openTaskCount = tasks.filter((task) => task.status !== 'done').length;
  const completionRate = getPercent(tasks.filter((task) => task.status === 'done').length, tasks.length);

  const filteredTasks = useMemo(() => {
    const typedTasks = typeFilter === 'all' ? tasks : tasks.filter((task) => task.type === typeFilter);
    return sortTasks(typedTasks, sortBy);
  }, [sortBy, tasks, typeFilter]);

  const columns = statusOptions.map((option) => ({
    ...option,
    ...columnMeta[option.value],
    tasks: filteredTasks.filter((task) => task.status === option.value),
  }));

  const timelineGroups = filteredTasks.reduce<{ label: string; tasks: Task[] }[]>((groups, task) => {
    const label = getTaskDayKey(task);
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.tasks.push(task);
      return groups;
    }
    return [...groups, { label, tasks: [task] }];
  }, []);

  const visibleNotes = notes.filter((note) => {
    const linkedLead = note.linkedLeadId ? leadRecords.find((lead) => lead.id === note.linkedLeadId) : null;
    const linkedOperation = note.linkedPaymentId
      ? clientOps.find((operation) => operation.payment.payment_id === note.linkedPaymentId)
      : null;
    const linkedName = linkedLead?.first_name || (linkedOperation ? getPaymentClientName(linkedOperation) : '');
    const query = noteSearch.trim().toLowerCase();
    if (!query) return true;
    return [note.body, linkedName].some((value) => value.toLowerCase().includes(query));
  });
  const statCards = [
    { label: 'Active leads', value: String(activeLeadCount), description: 'Lead movement still in play', Icon: Mail },
    { label: 'Client work', value: String(activeClientTaskCount), description: 'Paid delivery still moving', Icon: PackageCheck },
    { label: 'Open tasks', value: String(openTaskCount), description: 'Manual and generated queue items', Icon: ListChecks },
    { label: 'Completed', value: `${completionRate}%`, description: 'Closed lead or task movement', Icon: CheckCircle2 },
  ];

  function hydrateManualTask(task: ManualTaskRecord, taskNotes: DashboardNote[] = []) {
    return mergeTasks([], [task], taskNotes, leadRecords, clientOps)[0];
  }

  function replaceTask(nextTask: Task) {
    setTasks((current) => sortTasks(current.map((task) => (task.id === nextTask.id ? nextTask : task)), 'priority'));
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await requestJson<{ task: ManualTaskRecord }>('/api/dashboard/tasks', 'POST', {
        key: adminKey,
        title: form.get('title'),
        type: form.get('type'),
        status: form.get('status'),
        priority: form.get('priority'),
        dueDate: form.get('dueDate'),
        dueTime: form.get('dueTime'),
        linkedLeadId: form.get('linkedLeadId'),
        linkedPaymentId: form.get('linkedPaymentId'),
      });
      const hydrated = hydrateManualTask(data.task);
      setTasks((current) => sortTasks([hydrated, ...current], 'priority'));
      setShowTaskModal(false);
      setSelectedTaskId(hydrated.id);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Could not create the task.');
    }
  }

  async function updateTask(task: Task, values: Partial<ManualTaskRecord>) {
    if (!task.isManual) return;
    setError(null);
    const optimistic = { ...task, ...values } as Task;
    replaceTask(optimistic);

    try {
      const data = await requestJson<{ task: ManualTaskRecord }>(`/api/dashboard/tasks/${task.id}`, 'PATCH', {
        key: adminKey,
        ...values,
      });
      replaceTask(hydrateManualTask(data.task, optimistic.notes));
    } catch (taskError) {
      replaceTask(task);
      setError(taskError instanceof Error ? taskError.message : 'Could not update the task.');
    }
  }

  async function deleteTask(task: Task) {
    if (!task.isManual) return;
    setError(null);
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setSelectedTaskId(null);

    try {
      await requestJson<{ ok: true }>(`/api/dashboard/tasks/${task.id}`, 'DELETE', { key: adminKey });
    } catch (taskError) {
      setTasks(previous);
      setError(taskError instanceof Error ? taskError.message : 'Could not delete the task.');
    }
  }

  async function updateLeadTaskStatus(task: Task, nextStatus: TaskStatus) {
    if (!task.leadId) return;

    setError(null);
    const previousTasks = tasks;
    const previousLeads = leadRecords;
    const nextLeadStatus = leadStatusByTaskStatus[nextStatus];
    const contactedAt = nextLeadStatus === 'contacted' ? new Date().toISOString() : undefined;

    setTasks((current) =>
      sortTasks(current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)), sortBy)
    );
    setLeadRecords((current) =>
      current.map((lead) =>
        lead.id === task.leadId
          ? {
              ...lead,
              lead_status: nextLeadStatus,
              last_contacted_at: contactedAt || lead.last_contacted_at,
              updated_at: new Date().toISOString(),
            }
          : lead
      )
    );

    try {
      const data = await requestJson<{ submission: DiagnosticSubmission | null }>(
        `/api/diagnostic/submissions/${task.leadId}`,
        'PATCH',
        {
          key: adminKey,
          leadStatus: nextLeadStatus,
          markContacted: nextLeadStatus === 'contacted',
        }
      );

      if (data.submission) {
        setLeadRecords((current) =>
          current.map((lead) => (lead.id === data.submission?.id ? data.submission : lead))
        );
      }
    } catch (taskError) {
      setTasks(previousTasks);
      setLeadRecords(previousLeads);
      const message = taskError instanceof Error ? taskError.message : 'Could not sync the lead status.';
      setError(message);
      throw new Error(message);
    }
  }

  async function addTaskNote(task: Task, body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    const optimisticNote: DashboardNote = {
      id: `pending-${Date.now()}`,
      body: trimmed,
      linkedTaskId: task.isManual ? task.id : undefined,
      linkedLeadId: task.isManual ? undefined : task.leadId,
      linkedPaymentId: task.isManual ? undefined : task.paymentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, notes: [optimisticNote, ...item.notes] } : item))
    );

    try {
      const data = await requestJson<{ note: DashboardNote }>('/api/dashboard/notes', 'POST', {
        key: adminKey,
        body: trimmed,
        linkedTaskId: task.isManual ? task.id : null,
        linkedLeadId: task.isManual ? null : task.leadId || null,
        linkedPaymentId: task.isManual ? null : task.paymentId || null,
      });
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, notes: item.notes.map((note) => (note.id === optimisticNote.id ? data.note : note)) }
            : item
        )
      );
      if (!data.note.linkedTaskId) setNotes((current) => [data.note, ...current]);
    } catch (noteError) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, notes: item.notes.filter((note) => note.id !== optimisticNote.id) } : item
        )
      );
      setError(noteError instanceof Error ? noteError.message : 'Could not save the note.');
    }
  }

  async function createStandaloneNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = String(form.get('body') || '').trim();
    if (!body) return;

    try {
      const data = await requestJson<{ note: DashboardNote }>('/api/dashboard/notes', 'POST', {
        key: adminKey,
        body,
        linkedLeadId: form.get('linkedLeadId') || null,
        linkedPaymentId: form.get('linkedPaymentId') || null,
      });
      setNotes((current) => [data.note, ...current]);
      setShowNoteModal(false);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Could not create the note.');
    }
  }

  async function updateStandaloneNote(note: DashboardNote, body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const previous = notes;
    setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, body: trimmed } : item)));

    try {
      const data = await requestJson<{ note: DashboardNote }>(`/api/dashboard/notes/${note.id}`, 'PATCH', {
        key: adminKey,
        body: trimmed,
      });
      setNotes((current) => current.map((item) => (item.id === note.id ? data.note : item)));
    } catch (noteError) {
      setNotes(previous);
      setError(noteError instanceof Error ? noteError.message : 'Could not update the note.');
    }
  }

  async function deleteStandaloneNote(note: DashboardNote) {
    const previous = notes;
    setNotes((current) => current.filter((item) => item.id !== note.id));

    try {
      await requestJson<{ ok: true }>(`/api/dashboard/notes/${note.id}`, 'DELETE', { key: adminKey });
    } catch (noteError) {
      setNotes(previous);
      setError(noteError instanceof Error ? noteError.message : 'Could not delete the note.');
    }
  }

  return (
    <section id="tasks-notes" className="pb-10">
      <div className="space-y-5">
        {error && (
          <div className="rounded-[16px] bg-[#FFF5F2] px-4 py-3 text-[13px] leading-relaxed text-[#8A2F1D] ring-1 ring-[#F2C6B8]">
            {error}
          </div>
        )}

        <div className="rounded-[16px] bg-[#FCFBFA] p-5 ring-1 ring-[#E6DDD6] md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7B695F]">
                Tasks / Overview
              </p>
              <h2 className="mt-5 max-w-3xl font-serif text-[34px] leading-[1.02] md:text-[48px]">
                Welcome back, Coach Kagiso.
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">
                {dueFollowUpCount} follow-up{dueFollowUpCount === 1 ? '' : 's'}, {paidDeliveryPressureCount}{' '}
                paid delivery item{paidDeliveryPressureCount === 1 ? '' : 's'}, and {openTaskCount}{' '}
                open task{openTaskCount === 1 ? '' : 's'}{' '}are shaping today&apos;s work.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C9AD98] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
              >
                <Plus className="h-4 w-4" /> New note
              </button>
              <button
                type="button"
                onClick={() => setShowTaskModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#142334] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
              >
                <Plus className="h-4 w-4" /> New task
              </button>
              <Link
                href={buildTabHref(adminKey, 'leads', { status: 'new' })}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142334] ring-1 ring-[#E6DDD6] transition hover:bg-[#142334] hover:text-white"
              >
                New leads <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] bg-[#F8F6F4] px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F3D97B] text-[#142334]">
                  <ListChecks className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[#142334]">Highest-value work first</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#142334]/62">
                    Top signal: {strongestContentSignal}. Manual tasks and generated tasks now share one queue.
                  </p>
                </div>
              </div>
              <Link
                href={buildTabHref(adminKey, 'pipeline')}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142334] transition hover:bg-[#142334] hover:text-white"
              >
                View details <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const StatIcon = card.Icon;
              return (
                <div key={card.label} className="rounded-[16px] bg-[#F8F6F4] p-4 ring-1 ring-[#E6DDD6]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-[#A09086]">
                      <StatIcon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold text-[#142334]/54">Live</span>
                  </div>
                  <p className="mt-5 font-serif text-[32px] leading-none text-[#142334]">{card.value}</p>
                  <p className="mt-3 text-[13px] font-semibold text-[#142334]">{card.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[16px] bg-[#FCFBFA] p-4 ring-1 ring-[#E6DDD6] md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {taskViewModes.map((mode) => {
                const ViewIcon = mode.Icon;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setView(mode.value)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                      view === mode.value ? 'bg-[#142334] text-white' : 'bg-[#F8F6F4] text-[#142334]/66 hover:bg-[#142334] hover:text-white'
                    }`}
                  >
                    <ViewIcon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1 rounded-full bg-[#F8F6F4] p-1">
                {typeLabels.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setTypeFilter(filter.value)}
                    className={`inline-flex h-8 items-center rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                      typeFilter === filter.value ? 'bg-[#142334] text-white' : 'text-[#142334]/62 hover:bg-white hover:text-[#142334]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex h-9 items-center gap-2 rounded-full bg-[#F8F6F4] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#142334]/66">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="sr-only">Sort tasks</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as TaskSort)}
                  className="bg-transparent text-[11px] font-semibold uppercase tracking-[0.12em] outline-none"
                >
                  {taskSortOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'clientName' ? 'Name' : option === 'dueDate' ? 'Due date' : 'Priority'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setTypeFilter('DELIVERY')}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#142334] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
              >
                Delivery <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {view === 'kanban' && (
            <div id="task-board" className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {columns.map((column) => (
                <div key={column.value} className="rounded-[16px] bg-[#F8F6F4] p-3 ring-1 ring-[#E6DDD6]">
                  <div className="flex items-center justify-between gap-3 px-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${column.dot}`} />
                      <p className="text-[12px] font-semibold text-[#142334]">{column.label}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#142334]">
                      {column.tasks.length}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {column.tasks.length === 0 ? (
                      <div className="rounded-[16px] bg-[#FCFBFA] p-4 text-[13px] leading-relaxed text-[#142334]/58 ring-1 ring-[#E6DDD6]">
                        {column.empty}
                      </div>
                    ) : (
                      column.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          accent={column.accent}
                          onOpen={() => setSelectedTaskId(task.id)}
                          onDelete={() => deleteTask(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'timeline' && (
            <div className="mt-5 grid gap-4">
              {timelineGroups.length === 0 ? (
                <div className="rounded-[16px] bg-[#F8F6F4] p-5 text-[13px] leading-relaxed text-[#142334]/58 ring-1 ring-[#E6DDD6]">
                  No tasks match this view.
                </div>
              ) : (
                timelineGroups.map((group) => (
                  <div key={group.label} className="rounded-[16px] bg-[#F8F6F4] p-4 ring-1 ring-[#E6DDD6]">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-serif text-[28px] leading-none text-[#142334]">{group.label}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]">
                        {group.tasks.length}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {group.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          accent={columnMeta[task.status].accent}
                          onOpen={() => setSelectedTaskId(task.id)}
                          onDelete={() => deleteTask(task)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'spreadsheet' && (
            <div className="mt-5 overflow-x-auto rounded-[16px] bg-[#F8F6F4] ring-1 ring-[#E6DDD6]">
              <table className="min-w-[920px] w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F0E9E3]">
                    {['Task', 'Client', 'Type', 'Status', 'Priority', 'Due', 'Tags'].map((label) => (
                      <th key={label} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DDD6]">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-5 text-[13px] text-[#142334]/58">
                        No tasks match this view.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="bg-white align-top">
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="text-left font-semibold text-[#142334] transition hover:text-[#C9AD98]"
                          >
                            {task.title}
                          </button>
                          <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">{task.subtitle}</p>
                        </td>
                        <td className="px-4 py-4 text-[13px] text-[#142334]/72">{task.clientName}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getTaskTypeClass(task.type)}`}>
                            {task.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClass(task.status, task.priority)}`}>
                            {statusLabel(task.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-serif text-[26px] leading-none text-[#142334]">{task.priority}</td>
                        <td className="px-4 py-4 text-[13px] text-[#142334]/72">{formatTaskDue(task)}</td>
                        <td className="px-4 py-4 text-[12px] leading-relaxed text-[#142334]/58">{task.tags.join(', ')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <details className="rounded-[16px] bg-[#FCFBFA] p-4 ring-1 ring-[#E6DDD6] md:p-5">
          <summary className="flex cursor-pointer list-none flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A09086]">Notes</p>
              <h2 className="mt-2 font-serif text-[34px] leading-tight">Standalone notes</h2>
            </div>
            <span className="inline-flex w-fit rounded-full bg-[#F8F6F4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]">
              {notes.length} saved
            </span>
          </summary>

          <label className="relative mt-5 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
            <span className="sr-only">Search notes</span>
            <input
              type="search"
              value={noteSearch}
              onChange={(event) => setNoteSearch(event.target.value)}
              placeholder="Search note body or linked name"
              className="h-12 w-full rounded-full bg-[#F8F6F4] pl-11 pr-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
            />
          </label>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {visibleNotes.length === 0 ? (
              <div className="rounded-[16px] bg-[#F8F6F4] p-5 text-[13px] leading-relaxed text-[#142334]/58 ring-1 ring-[#E6DDD6] xl:col-span-2">
                No standalone notes match this search.
              </div>
            ) : (
              visibleNotes.map((note) => (
                <StandaloneNoteCard
                  key={note.id}
                  note={note}
                  leads={leadRecords}
                  clientOps={clientOps}
                  onUpdate={updateStandaloneNote}
                  onDelete={deleteStandaloneNote}
                />
              ))
            )}
          </div>
        </details>
      </div>

      {showTaskModal && (
        <Modal title="New task" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={createTask} className="grid gap-4">
            <TextField name="title" label="Title" required placeholder="Send proposal follow-up" />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField name="type" label="Type" defaultValue="LEAD" options={taskTypes.map((type) => [type, type] as const)} />
              <SelectField name="status" label="Status" defaultValue="todo" options={statusOptions.map((item) => [item.value, item.label] as const)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField name="priority" label="Priority" type="number" min={1} max={100} defaultValue="50" />
              <TextField name="dueDate" label="Due date" type="date" />
              <TextField name="dueTime" label="Due time" type="time" />
            </div>
            <LinkedRecordFields leads={leadRecords} clientOps={clientOps} />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="rounded-full px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142334]/62">
                Cancel
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                Create task <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showNoteModal && (
        <Modal title="New note" onClose={() => setShowNoteModal(false)}>
          <form onSubmit={createStandaloneNote} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">Note</span>
              <textarea
                name="body"
                required
                rows={5}
                className="resize-y rounded-[16px] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
              />
            </label>
            <LinkedRecordFields leads={leadRecords} clientOps={clientOps} />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowNoteModal(false)} className="rounded-full px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142334]/62">
                Cancel
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#142334] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                Save note <Save className="h-4 w-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          adminKey={adminKey}
          lead={selectedTask.leadId ? leadRecords.find((lead) => lead.id === selectedTask.leadId) : undefined}
          operation={selectedTask.paymentId ? clientOps.find((operation) => operation.payment.payment_id === selectedTask.paymentId) : undefined}
          statusOptions={statusOptions}
          leadStatusLabels={leadStatusLabels}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
          onLeadStatusChange={updateLeadTaskStatus}
          onAddNote={addTaskNote}
        />
      )}
    </section>
  );
}

function TaskCard({
  task,
  accent,
  onOpen,
  onDelete,
}: {
  task: Task;
  accent: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = taskIconMap[task.type];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-[16px] bg-white p-4 pl-5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-[#E6DDD6] transition hover:bg-[#142334]"
    >
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      {task.isManual && (
        <span className="absolute right-3 top-3 hidden gap-1 group-hover:flex">
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              if (window.confirm('Delete this manual task?')) onDelete();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.stopPropagation();
                if (window.confirm('Delete this manual task?')) onDelete();
              }
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#A24E37]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        </span>
      )}
      <div className="flex items-start justify-between gap-3 pr-14">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#142334] text-white transition group-hover:bg-white group-hover:text-[#142334]">
            <Icon className="h-4 w-4" />
          </span>
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getTaskTypeClass(task.type)}`}>
            {task.type}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-[#142334]/55 transition group-hover:text-white/65">
          {formatTaskDue(task)}
        </span>
      </div>
      <p className="mt-4 break-words text-[14px] font-semibold leading-snug text-[#142334] transition group-hover:text-white">
        {task.title}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/62 transition group-hover:text-white/70">
        {task.subtitle}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getStatusBadgeClass(task.status, task.priority)}`}>
          {task.priority >= 100 && task.status !== 'done' ? 'Urgent' : statusLabel(task.status)}
        </span>
        {task.isManual && (
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]">
            Manual
          </span>
        )}
      </div>
    </button>
  );
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[16px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-serif text-[34px] leading-none text-[#142334]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#F8F6F4] text-[#142334]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  onBlur,
  ...props
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        onBlur={onBlur}
        className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
        {...props}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LinkedRecordFields({ leads, clientOps }: { leads: DiagnosticSubmission[]; clientOps: ClientOperation[] }) {
  const [leadSearch, setLeadSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const visibleLeads = leads
    .filter((lead) => [lead.first_name, lead.email].some((value) => String(value || '').toLowerCase().includes(leadSearch.toLowerCase())))
    .slice(0, 20);
  const visibleClients = clientOps
    .filter((operation) => getPaymentClientName(operation).toLowerCase().includes(clientSearch.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="grid gap-2">
        <TextField name="leadSearch" label="Find lead" value={leadSearch} onChange={setLeadSearch} placeholder="Search name or email" />
        <select name="linkedLeadId" className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]">
          <option value="">No linked lead</option>
          {visibleLeads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {getLeadName(lead)} - {lead.email}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <TextField name="clientSearch" label="Find client/payment" value={clientSearch} onChange={setClientSearch} placeholder="Search client" />
        <select name="linkedPaymentId" className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]">
          <option value="">No linked client</option>
          {visibleClients.map((operation) => (
            <option key={operation.payment.payment_id} value={operation.payment.payment_id}>
              {getPaymentClientName(operation)} - {operation.serviceTitle}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StandaloneNoteCard({
  note,
  leads,
  clientOps,
  onUpdate,
  onDelete,
}: {
  note: DashboardNote;
  leads: DiagnosticSubmission[];
  clientOps: ClientOperation[];
  onUpdate: (note: DashboardNote, body: string) => Promise<void>;
  onDelete: (note: DashboardNote) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const linkedLead = note.linkedLeadId ? leads.find((lead) => lead.id === note.linkedLeadId) : null;
  const linkedOperation = note.linkedPaymentId
    ? clientOps.find((operation) => operation.payment.payment_id === note.linkedPaymentId)
    : null;
  const linkedName = linkedLead?.first_name || (linkedOperation ? getPaymentClientName(linkedOperation) : '');

  return (
    <article className="rounded-[16px] bg-[#F8F6F4] p-4 ring-1 ring-[#E6DDD6]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {linkedName && (
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]">
              {linkedName}
            </span>
          )}
          <span className="text-[11px] text-[#142334]/45">{getRelativeTime(note.createdAt)}</span>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditing((value) => !value)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#142334]">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(note)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#A24E37]">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editing ? (
        <form
          className="mt-3 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onUpdate(note, body);
            setEditing(false);
          }}
        >
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            className="resize-y rounded-[16px] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
          />
          <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#142334] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            Save <Save className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-[16px] bg-white p-4 text-[13px] leading-relaxed text-[#142334]/70 ring-1 ring-[#E6DDD6]">
          {note.body}
        </p>
      )}
    </article>
  );
}
