'use client';

import { useMemo, useState } from 'react';
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ListChecks,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Search,
  StickyNote,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import {
  getPaymentClientName,
  type DashboardNote,
  type Task,
} from '@/lib/dashboard-tasks';

type NotesWorkspaceProps = {
  adminKey: string;
  initialNotes: DashboardNote[];
  leads: DiagnosticSubmission[];
  clientOps: ClientOperation[];
  tasks: Task[];
};

type NoteFilter = 'personal' | 'lead' | 'task' | 'client' | 'all';

const noteFilterOptions: { value: NoteFilter; label: string; Icon: typeof StickyNote }[] = [
  { value: 'personal', label: 'Personal', Icon: StickyNote },
  { value: 'lead', label: 'Lead', Icon: UsersRound },
  { value: 'task', label: 'Task', Icon: ListChecks },
  { value: 'client', label: 'Client', Icon: PackageCheck },
  { value: 'all', label: 'All', Icon: FileText },
];

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

function getNoteKind(note: DashboardNote): NoteFilter {
  if (note.linkedTaskId) return 'task';
  if (note.linkedLeadId) return 'lead';
  if (note.linkedPaymentId) return 'client';
  return 'personal';
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

function getNoteMeta(note: DashboardNote, leads: DiagnosticSubmission[], clientOps: ClientOperation[], tasks: Task[]) {
  const linkedTask = note.linkedTaskId ? tasks.find((task) => task.id === note.linkedTaskId) : null;
  const linkedLead = note.linkedLeadId ? leads.find((lead) => lead.id === note.linkedLeadId) : null;
  const linkedOperation = note.linkedPaymentId
    ? clientOps.find((operation) => operation.payment.payment_id === note.linkedPaymentId)
    : null;
  const linkedName =
    linkedTask?.title ||
    (linkedLead ? getLeadName(linkedLead) : '') ||
    (linkedOperation ? getPaymentClientName(linkedOperation) : '');

  return { linkedTask, linkedLead, linkedOperation, linkedName };
}

function noteMatchesSearch(note: DashboardNote, query: string, leads: DiagnosticSubmission[], clientOps: ClientOperation[], tasks: Task[]) {
  if (!query) return true;
  const { linkedTask, linkedLead, linkedOperation, linkedName } = getNoteMeta(note, leads, clientOps, tasks);
  const haystack = [
    note.body,
    linkedName,
    linkedTask?.subtitle,
    linkedTask?.clientName,
    linkedLead?.email,
    linkedLead?.archetype_name,
    linkedOperation?.serviceTitle,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export default function NotesWorkspace({ adminKey, initialNotes, leads, clientOps, tasks }: NotesWorkspaceProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [filter, setFilter] = useState<NoteFilter>('personal');
  const [query, setQuery] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: notes.length,
      personal: notes.filter((note) => getNoteKind(note) === 'personal').length,
      lead: notes.filter((note) => getNoteKind(note) === 'lead').length,
      task: notes.filter((note) => getNoteKind(note) === 'task').length,
      client: notes.filter((note) => getNoteKind(note) === 'client').length,
    }),
    [notes],
  );

  const visibleNotes = useMemo(() => {
    const searchQuery = query.trim().toLowerCase();
    return notes.filter((note) => {
      const kind = getNoteKind(note);
      const matchesFilter = filter === 'all' || kind === filter;
      return matchesFilter && noteMatchesSearch(note, searchQuery, leads, clientOps, tasks);
    });
  }, [clientOps, filter, leads, notes, query, tasks]);

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = String(form.get('body') || '').trim();
    if (!body) return;

    try {
      const data = await requestJson<{ note: DashboardNote }>('/api/dashboard/notes', 'POST', {
        key: adminKey,
        body,
        linkedTaskId: form.get('linkedTaskId') || null,
        linkedLeadId: form.get('linkedLeadId') || null,
        linkedPaymentId: form.get('linkedPaymentId') || null,
      });
      setNotes((current) => [data.note, ...current]);
      setFilter(getNoteKind(data.note));
      setShowNoteModal(false);
      router.refresh();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Could not create the note.');
    }
  }

  async function updateNote(note: DashboardNote, body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const previous = notes;
    setError(null);
    setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, body: trimmed } : item)));

    try {
      const data = await requestJson<{ note: DashboardNote }>(`/api/dashboard/notes/${note.id}`, 'PATCH', {
        key: adminKey,
        body: trimmed,
      });
      setNotes((current) => current.map((item) => (item.id === note.id ? data.note : item)));
      router.refresh();
    } catch (noteError) {
      setNotes(previous);
      setError(noteError instanceof Error ? noteError.message : 'Could not update the note.');
    }
  }

  async function deleteNote(note: DashboardNote) {
    if (!window.confirm('Delete this note?')) return;
    const previous = notes;
    setError(null);
    setNotes((current) => current.filter((item) => item.id !== note.id));

    try {
      await requestJson<{ ok: true }>(`/api/dashboard/notes/${note.id}`, 'DELETE', { key: adminKey });
      router.refresh();
    } catch (noteError) {
      setNotes(previous);
      setError(noteError instanceof Error ? noteError.message : 'Could not delete the note.');
    }
  }

  return (
    <section id="notes-workspace" className="pb-8">
      <div className="grid gap-3">
        {error && (
          <div className="rounded-[12px] bg-[#FFF5F2] px-4 py-3 text-[13px] leading-relaxed text-[#8A2F1D] ring-1 ring-[#F2C6B8]">
            {error}
          </div>
        )}

        <div className="rounded-[12px] bg-[#FCFBFA] p-4 ring-1 ring-[#E6DDD6] md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7B695F]">
                Notes / Workspace
              </p>
              <h2 className="mt-4 max-w-3xl font-serif text-[34px] leading-[1.02] md:text-[48px]">
                Personal notes, lead context, and task memory.
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">
                {counts.personal} personal note{counts.personal === 1 ? '' : 's'}, {counts.lead} lead note
                {counts.lead === 1 ? '' : 's'}, and {counts.task} task note{counts.task === 1 ? '' : 's'} are saved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#142334] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              <Plus className="h-4 w-4" /> New note
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <NoteStatCard label="Personal" value={counts.personal} Icon={StickyNote} />
            <NoteStatCard label="Lead notes" value={counts.lead} Icon={UsersRound} />
            <NoteStatCard label="Task notes" value={counts.task} Icon={ListChecks} />
            <NoteStatCard label="Client notes" value={counts.client} Icon={PackageCheck} />
          </div>
        </div>

        <div className="rounded-[12px] bg-[#FCFBFA] p-4 ring-1 ring-[#E6DDD6]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1 rounded-full bg-[#F8F6F4] p-1">
              {noteFilterOptions.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                    filter === value ? 'bg-[#142334] text-white' : 'text-[#142334]/62 hover:bg-white hover:text-[#142334]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-[#142334]">
                    {counts[value]}
                  </span>
                </button>
              ))}
            </div>

            <label className="relative block min-w-0 xl:w-[340px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
              <span className="sr-only">Search notes</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes"
                className="h-11 w-full rounded-full bg-[#F8F6F4] pl-11 pr-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {visibleNotes.length === 0 ? (
              <div className="rounded-[12px] bg-[#F8F6F4] p-5 text-[13px] leading-relaxed text-[#142334]/58 ring-1 ring-[#E6DDD6] xl:col-span-2">
                No notes match this view.
              </div>
            ) : (
              visibleNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  leads={leads}
                  clientOps={clientOps}
                  tasks={tasks}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showNoteModal && (
        <Modal title="New note" onClose={() => setShowNoteModal(false)}>
          <form onSubmit={createNote} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">Note</span>
              <textarea
                name="body"
                required
                rows={6}
                className="resize-y rounded-[12px] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
              />
            </label>
            <LinkedRecordFields leads={leads} clientOps={clientOps} tasks={tasks} />
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
    </section>
  );
}

function NoteStatCard({ label, value, Icon }: { label: string; value: number; Icon: typeof StickyNote }) {
  return (
    <div className="rounded-[12px] bg-[#F8F6F4] p-4 ring-1 ring-[#E6DDD6]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-[#A09086]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold text-[#142334]/54">Saved</span>
      </div>
      <p className="mt-5 font-serif text-[32px] leading-none text-[#142334]">{value}</p>
      <p className="mt-3 text-[13px] font-semibold text-[#142334]">{label}</p>
    </div>
  );
}

function NoteCard({
  note,
  leads,
  clientOps,
  tasks,
  onUpdate,
  onDelete,
}: {
  note: DashboardNote;
  leads: DiagnosticSubmission[];
  clientOps: ClientOperation[];
  tasks: Task[];
  onUpdate: (note: DashboardNote, body: string) => Promise<void>;
  onDelete: (note: DashboardNote) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const kind = getNoteKind(note);
  const { linkedName } = getNoteMeta(note, leads, clientOps, tasks);
  const kindLabel = noteFilterOptions.find((option) => option.value === kind)?.label || 'Note';

  return (
    <article className="rounded-[12px] bg-[#F8F6F4] p-4 ring-1 ring-[#E6DDD6]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#142334] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            {kindLabel}
          </span>
          {linkedName && (
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7B695F]">
              {linkedName}
            </span>
          )}
          <span className="text-[11px] text-[#142334]/45">{getRelativeTime(note.createdAt)}</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#142334]"
            title={editing ? 'Cancel edit' : 'Edit note'}
            aria-label={editing ? 'Cancel edit' : 'Edit note'}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(note)}
            className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#A24E37]"
            title="Delete note"
            aria-label="Delete note"
          >
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
            rows={5}
            className="resize-y rounded-[12px] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
          />
          <button type="submit" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#142334] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            Save <Save className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="mt-4 whitespace-pre-wrap rounded-[12px] bg-white p-4 text-[13px] leading-relaxed text-[#142334]/70 ring-1 ring-[#E6DDD6]">
          {note.body}
        </p>
      )}
    </article>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-[16px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)]" onClick={(event) => event.stopPropagation()}>
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
  ...props
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B695F]">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]"
        {...props}
      />
    </label>
  );
}

function LinkedRecordFields({
  leads,
  clientOps,
  tasks,
}: {
  leads: DiagnosticSubmission[];
  clientOps: ClientOperation[];
  tasks: Task[];
}) {
  const [taskSearch, setTaskSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const visibleTasks = tasks
    .filter((task) => [task.title, task.subtitle, task.clientName].some((value) => value.toLowerCase().includes(taskSearch.toLowerCase())))
    .slice(0, 20);
  const visibleLeads = leads
    .filter((lead) => [lead.first_name, lead.email].some((value) => String(value || '').toLowerCase().includes(leadSearch.toLowerCase())))
    .slice(0, 20);
  const visibleClients = clientOps
    .filter((operation) => getPaymentClientName(operation).toLowerCase().includes(clientSearch.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <div className="grid gap-2">
        <TextField name="taskSearch" label="Find task" value={taskSearch} onChange={setTaskSearch} placeholder="Search task" />
        <select name="linkedTaskId" className="h-11 rounded-full bg-[#F8F6F4] px-4 text-[14px] text-[#142334] outline-none ring-1 ring-[#E6DDD6] focus:ring-[#142334]">
          <option value="">No linked task</option>
          {visibleTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>
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
