'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, ChevronDown, ChevronRight, CreditCard, Mail, Search } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import ManualClientEngagementForm from '@/components/clients/ManualClientEngagementForm';
import LeadEmailButton from '@/components/leads/LeadEmailButton';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';
import type { ClientMilestone, ClientRecord } from '@/lib/clients';
import {
  buildClientStrategyWorkspaceHref,
  getClientStrategyAccess,
  isClientStrategyServiceSlug,
} from '@/lib/client-strategy';
import type { DashboardNote } from '@/lib/dashboard-tasks';

type ClientStatus = 'overdue' | 'awaiting_intake' | 'active' | 'delivered';

function getClientProfileHref(adminKey: string, diagnosticId: string) {
  const legacyKey = getDashboardLegacyKey(adminKey);
  const query = legacyKey ? `?key=${encodeURIComponent(legacyKey)}` : '';
  return `/resources/career-diagnostic/submissions/${diagnosticId}${query}`;
}

function getClientMessagesHref(adminKey: string, email: string) {
  const params = new URLSearchParams({ tab: 'messages', q: email });
  const legacyKey = getDashboardLegacyKey(adminKey);
  if (legacyKey) params.set('key', legacyKey);
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

const statusLabels: Record<ClientStatus, string> = {
  overdue: 'Overdue',
  awaiting_intake: 'Awaiting intake',
  active: 'Active',
  delivered: 'Delivered',
};

const statusClasses: Record<ClientStatus, { badge: string; border: string }> = {
  overdue: { badge: 'bg-[#FEE2E2] text-[#DC2626]', border: '#DC2626' },
  awaiting_intake: { badge: 'bg-[#FEF3C7] text-[#92400E]', border: '#F59E0B' },
  active: { badge: 'bg-[#BFDBFE] text-[#1E40AF]', border: '#3B82F6' },
  delivered: { badge: 'bg-[#D1FAE5] text-[#065F46]', border: '#22C55E' },
};

function getClientStatus(client: ClientRecord): ClientStatus {
  if (client.isDelivered) return 'delivered';
  if (!client.hasIntake) return 'awaiting_intake';
  if (client.isOverdue) return 'overdue';
  return 'active';
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return `R${value.toLocaleString('en-ZA')}`;
}

function formatRelative(value: string, currentTime: number) {
  const diff = currentTime - new Date(value).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  return formatDate(value);
}

function isThisMonth(value: string | null | undefined, currentTime: number) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date(currentTime);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getFirstName(client: ClientRecord) {
  return client.buyerName.trim().split(/\s+/)[0] || client.buyerEmail.split('@')[0] || 'Client';
}

function getClientSortBucket(client: ClientRecord) {
  if (client.isDelivered) return 3;
  if (!client.hasIntake) return 2;
  if (client.isOverdue) return 0;
  return 1;
}

function sortClientRecords(left: ClientRecord, right: ClientRecord) {
  const leftBucket = getClientSortBucket(left);
  const rightBucket = getClientSortBucket(right);
  if (leftBucket !== rightBucket) return leftBucket - rightBucket;
  if (leftBucket === 0) return right.daysOverdue - left.daysOverdue;
  if (leftBucket === 1) {
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  }
  if (leftBucket === 3) {
    return new Date(right.deliveredAt || right.confirmedAt).getTime() - new Date(left.deliveredAt || left.confirmedAt).getTime();
  }
  return new Date(right.confirmedAt).getTime() - new Date(left.confirmedAt).getTime();
}

function recomputeClient(client: ClientRecord, milestones: ClientMilestone[]): ClientRecord {
  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  const totalMilestones = milestones.length;
  const isDelivered = totalMilestones > 0 && completedCount === totalMilestones;
  const deliveredAt = milestones
    .map((milestone) => milestone.completedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const currentMilestone = milestones.find((milestone) => !milestone.completed) || null;

  return {
    ...client,
    milestones,
    completedCount,
    totalMilestones,
    isDelivered,
    deliveredAt,
    currentStage: currentMilestone?.stageName || (isDelivered ? 'Delivered' : 'Milestones not generated'),
    currentStageOrder: currentMilestone?.stageOrder || null,
    isOverdue: Boolean(client.hasIntake && !isDelivered && client.isOverdue),
    daysOverdue: isDelivered ? 0 : client.daysOverdue,
  };
}

function matchesStatus(client: ClientRecord, status: string) {
  if (!status || status === 'all') return true;
  return getClientStatus(client) === status;
}

function MilestoneStepper({ milestones }: { milestones: ClientMilestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="rounded-[8px] bg-[#F5F3EE] p-4 text-[13px] text-[#6B6B6B]">
        No delivery milestones have been generated for this service yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start">
        {milestones.map((milestone, index) => {
          const current = !milestone.completed && milestones.find((item) => !item.completed)?.stageOrder === milestone.stageOrder;
          return (
            <div key={`${milestone.id}-${milestone.stageOrder}`} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border text-[12px] font-bold ${
                    milestone.completed
                      ? 'border-[#142334] bg-[#142334] text-white'
                      : current
                        ? 'border-[#C9AD98] bg-[#C9AD98] text-[#142334]'
                        : 'border-[#E4D8CB] bg-white text-[#E4D8CB]'
                  }`}
                >
                  {milestone.completed ? <Check className="h-4 w-4" /> : milestone.stageOrder}
                </span>
                <span
                  className={`mt-2 max-w-[110px] text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] ${
                    current ? 'text-[#142334]' : 'text-[#6B6B6B]'
                  }`}
                >
                  {milestone.stageName}
                </span>
              </div>
              {index < milestones.length - 1 && (
                <div className={`mt-3 h-px flex-1 ${milestone.completed ? 'bg-[#142334]' : 'bg-[#E4D8CB]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntakeResponses({ client }: { client: ClientRecord }) {
  const entries = Object.entries(client.intake?.form_data || {}).filter(([, value]) => {
    if (value === null || value === undefined || value === '') return false;
    return true;
  });

  if (!client.hasIntake || entries.length === 0) {
    return <p className="text-[13px] leading-relaxed text-[#6B6B6B]">No intake form submitted yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#6B6B6B]">
        <p>
          Source: {client.intake?.source === 'cal'
            ? 'Cal.com booking'
            : client.intake?.source === 'manual_dashboard'
              ? 'Manual dashboard entry'
              : 'Client intake form'}
        </p>
        {client.intake?.cv_file_url && (
          <a
            href={client.intake.cv_file_url}
            target="_blank"
            rel="noreferrer"
            className="text-[#142334] underline-offset-4 hover:text-[#C9AD98] hover:underline"
          >
            Open CV file
          </a>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-[8px] bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
              {key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#142334]">
              {Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientNotes({
  adminKey,
  client,
  onNoteCreated,
}: {
  adminKey: string;
  client: ClientRecord;
  onNoteCreated: (paymentId: string, note: DashboardNote) => void;
}) {
  const [noteBody, setNoteBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

  async function saveNote() {
    if (!noteBody.trim() || isSaving) return;

    const optimisticNote: DashboardNote = {
      id: `optimistic-${Date.now()}`,
      body: noteBody.trim(),
      linkedPaymentId: client.paymentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError(null);
    setNoteBody('');
    onNoteCreated(client.paymentId, optimisticNote);

    try {
      const response = await fetch('/api/dashboard/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          body: optimisticNote.body,
          linkedPaymentId: client.paymentId,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { note?: DashboardNote; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error || 'Could not save note.');
      onNoteCreated(client.paymentId, data.note);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Could not save note.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="space-y-2">
        {client.notes.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-[#6B6B6B]">No delivery notes yet.</p>
        ) : (
          client.notes.map((note) => (
            <div key={note.id} className="rounded-[8px] bg-white p-3">
              <p className="text-[13px] leading-relaxed text-[#142334]">{note.body}</p>
              <p className="mt-2 text-[11px] text-[#6B6B6B]">{formatRelative(note.createdAt, currentTime)}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 grid gap-2">
        <textarea
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          placeholder="Add a delivery note..."
          className="min-h-24 resize-y rounded-[8px] border border-[#E4D8CB] bg-white p-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
        />
        {error && <p className="text-[12px] font-semibold text-[#DC2626]">{error}</p>}
        <button
          type="button"
          onClick={saveNote}
          disabled={isSaving || !noteBody.trim()}
          className="w-fit rounded-full bg-[#142334] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSaving ? 'Saving...' : 'Save note'}
        </button>
      </div>
    </div>
  );
}

export default function ClientsDashboard({
  adminKey,
  clients,
}: {
  adminKey: string;
  clients: ClientRecord[];
}) {
  const [records, setRecords] = useState(clients);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(clients[0]?.paymentId || null);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('all');
  const [status, setStatus] = useState('all');
  const [showTests, setShowTests] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

  const liveRecords = useMemo(() => records.filter((client) => !client.isTest), [records]);

  const serviceOptions = useMemo(
    () => [...new Set(records.map((client) => client.serviceName))].sort((left, right) => left.localeCompare(right)),
    [records]
  );

  const stats = useMemo(() => {
    const active = liveRecords.filter((client) => !client.isDelivered).length;
    const deliveredThisMonth = liveRecords.filter((client) => client.isDelivered && isThisMonth(client.deliveredAt, currentTime)).length;
    const overdue = liveRecords.filter((client) => client.isOverdue).length;
    const revenueThisMonth = liveRecords
      .filter((client) => isThisMonth(client.confirmedAt, currentTime))
      .reduce((total, client) => total + client.amount, 0);

    return { active, deliveredThisMonth, overdue, revenueThisMonth };
  }, [currentTime, liveRecords]);

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((client) => {
      if (client.isTest && !showTests) return false;
      if (needle) {
        const matches = [client.buyerName, client.buyerEmail, client.serviceName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle));
        if (!matches) return false;
      }
      if (service !== 'all' && client.serviceName !== service) return false;
      return matchesStatus(client, status);
    });
  }, [query, records, service, showTests, status]);

  function updateClient(paymentId: string, updater: (client: ClientRecord) => ClientRecord) {
    setRecords((current) => current.map((client) => (client.paymentId === paymentId ? updater(client) : client)).sort(sortClientRecords));
  }

  async function completeStage(client: ClientRecord) {
    if (!client.currentStageOrder) return;
    const completedAt = new Date().toISOString();
    const stageOrder = client.currentStageOrder;
    setStageError(null);

    updateClient(client.paymentId, (current) =>
      recomputeClient(
        current,
        current.milestones.map((milestone) =>
          milestone.stageOrder === stageOrder ? { ...milestone, completed: true, completedAt } : milestone
        )
      )
    );

    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(client.paymentId)}/complete-stage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, stageOrder }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not complete stage.');
    } catch (error) {
      setStageError(error instanceof Error ? error.message : 'Could not complete stage.');
      setRecords(clients);
    }
  }

  function addNote(paymentId: string, note: DashboardNote) {
    updateClient(paymentId, (client) => {
      const withoutOptimistic = client.notes.filter(
        (currentNote) => !(currentNote.id.startsWith('optimistic-') && currentNote.body === note.body)
      );
      return { ...client, notes: [note, ...withoutOptimistic] };
    });
  }

  function clearFilters() {
    setQuery('');
    setService('all');
    setStatus('all');
  }

  return (
    <section id="clients-overview" className="rounded-[8px] bg-[#F5F3EE] p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Clients / Overview</p>
          <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Active clients</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B6B6B]">
            {stats.active} active - {stats.deliveredThisMonth} delivered this month - {stats.overdue} overdue
          </p>
        </div>
        <ManualClientEngagementForm
          adminKey={adminKey}
          onCreated={(isTest) => {
            if (isTest) setShowTests(true);
          }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Active', String(stats.active), 'Active clients'],
          ['Delivered', String(stats.deliveredThisMonth), 'Delivered this month'],
          ['Overdue', String(stats.overdue), 'Overdue'],
          ['Revenue', formatMoney(stats.revenueThisMonth), 'Revenue this month'],
        ].map(([title, value, label]) => (
          <div key={title} className="rounded-[8px] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{title}</p>
            <p className={`mt-3 font-serif text-[34px] leading-none ${title === 'Overdue' && value !== '0' ? 'text-[#DC2626]' : 'text-[#142334]'}`}>
              {value}
            </p>
            <p className="mt-2 text-[12px] text-[#6B6B6B]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_190px_auto_auto] lg:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, service..."
            className="h-10 w-full rounded-[8px] border border-[#E4D8CB] bg-white py-2 pl-10 pr-3 text-[14px] text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
          />
        </label>
        <FilterDropdown
          name="clientService"
          value={service}
          onChange={setService}
          ariaLabel="Filter clients by service"
          options={[
            { value: 'all', label: 'All services' },
            ...serviceOptions.map((serviceName) => ({
              value: serviceName,
              label: serviceName,
            })),
          ]}
        />
        <FilterDropdown
          name="clientStatus"
          value={status}
          onChange={setStatus}
          ariaLabel="Filter clients by status"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'awaiting_intake', label: 'Awaiting intake' },
            { value: 'delivered', label: 'Delivered' },
          ]}
        />
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#142334] px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
        >
          Apply
        </button>
        {(query || service !== 'all' || status !== 'all') && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-center text-[13px] text-[#6B6B6B] underline-offset-4 transition hover:text-[#142334] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {records.some((client) => client.isTest) && (
        <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#C4B5FD] bg-[#F5F3FF] px-4 py-2 text-[12px] font-semibold text-[#5B21B6]">
          <input
            type="checkbox"
            checked={showTests}
            onChange={(event) => setShowTests(event.target.checked)}
            className="h-4 w-4 accent-[#6D28D9]"
          />
          Show test records ({records.filter((client) => client.isTest).length})
        </label>
      )}

      {stageError && (
        <div className="mt-5 flex items-start gap-3 rounded-[8px] bg-[#FEE2E2] p-4 text-[13px] leading-relaxed text-[#991B1B]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {stageError}
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {records.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center rounded-[16px] bg-white px-6 py-10 text-center">
            <div>
              <CreditCard className="mx-auto h-9 w-9 text-[#C9AD98]" />
              <p className="mt-5 font-serif text-[28px] leading-tight text-[#142334]">No clients yet.</p>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6B6B6B]">
                Confirmed payments will appear here automatically.
              </p>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center rounded-[16px] bg-white px-6 py-10 text-center">
            <div>
              <Search className="mx-auto h-9 w-9 text-[#C9AD98]" />
              <p className="mt-5 font-serif text-[28px] leading-tight text-[#142334]">No clients match your filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex text-[13px] text-[#6B6B6B] underline-offset-4 hover:text-[#142334] hover:underline"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientStatus = getClientStatus(client);
            const statusStyle = statusClasses[clientStatus];
            const expanded = expandedPaymentId === client.paymentId;
            const dueSoon = client.deadline && !client.isOverdue && new Date(client.deadline).getTime() - currentTime <= 24 * 60 * 60 * 1000;
            const strategyAccess = getClientStrategyAccess(client, new Date(currentTime));
            const canOpenStrategyWorkspace = strategyAccess.status === 'active' || strategyAccess.status === 'recently-completed';

            return (
              <article
                key={client.paymentId}
                onClick={() => setExpandedPaymentId(expanded ? null : client.paymentId)}
                className="cursor-pointer overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                style={{ borderLeft: `4px solid ${statusStyle.border}` }}
              >
                <div className="p-5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-serif text-[24px] leading-tight text-[#142334]">{client.buyerName}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">
                        {client.buyerEmail || 'No email'} - {client.archetype || 'No archetype'} - {client.amountLabel} paid {formatDate(client.confirmedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {client.isTest && (
                        <span className="rounded-full bg-[#EDE9FE] px-3 py-1.5 text-[11px] font-semibold text-[#6D28D9]">Test record</span>
                      )}
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${statusStyle.badge}`}>
                        {statusLabels[clientStatus]}
                      </span>
                      {expanded ? <ChevronDown className="h-5 w-5 text-[#C9AD98]" /> : <ChevronRight className="h-5 w-5 text-[#C9AD98]" />}
                    </div>
                  </div>

                  <div className="my-5 h-px bg-[#E4D8CB]" />

                  <MilestoneStepper milestones={client.milestones} />
                  <p className="mt-3 text-[12px] text-[#6B6B6B]">
                    {client.completedCount} of {client.totalMilestones} stages complete
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      {!client.hasIntake && !client.isDelivered && (
                        <div className="inline-flex items-start gap-2 rounded-[8px] bg-[#FEF3C7] px-3 py-2 text-[13px] leading-relaxed text-[#92400E]">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          Intake form not submitted. Follow up before starting work.
                        </div>
                      )}
                      {client.deadline && client.hasIntake && !client.isDelivered && (
                        <p className={`text-[13px] font-semibold ${client.isOverdue ? 'text-[#DC2626]' : dueSoon ? 'text-[#F59E0B]' : 'text-[#142334]'}`}>
                          {client.isOverdue ? `Overdue by ${client.daysOverdue} working day${client.daysOverdue === 1 ? '' : 's'}` : `Due ${formatDate(client.deadline)}`}
                        </p>
                      )}
                      {!client.deadline && (
                        <p className="text-[13px] font-semibold text-[#142334]">Session-based service. Track the next action from the milestones.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end" onClick={(event) => event.stopPropagation()}>
                      {isClientStrategyServiceSlug(client.serviceSlug) && canOpenStrategyWorkspace && (
                        <Link
                          href={buildClientStrategyWorkspaceHref(adminKey, client.paymentId)}
                          className="rounded-full bg-[#142334] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
                        >
                          {strategyAccess.status === 'recently-completed'
                            ? `Strategy workspace, ${strategyAccess.daysRemaining === 0 ? 'expires today' : `${strategyAccess.daysRemaining} day${strategyAccess.daysRemaining === 1 ? '' : 's'} left`}`
                            : 'Strategy workspace'}
                        </Link>
                      )}
                      {isClientStrategyServiceSlug(client.serviceSlug) && strategyAccess.status === 'archived' && (
                        <span className="inline-flex items-center px-2 py-2 text-[12px] font-semibold text-[#6B6B6B]">
                          Strategy rework window ended
                        </span>
                      )}
                      {!client.isDelivered && client.currentStageOrder && (
                        <button
                          type="button"
                          onClick={() => completeStage(client)}
                          className="rounded-full bg-[#C9AD98] px-4 py-2 text-[12px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white"
                        >
                          Complete: {client.currentStage}
                        </button>
                      )}
                      {!client.isTest && (
                        <LeadEmailButton
                          lead={{
                            id: client.diagnosticId || '',
                            firstName: getFirstName(client),
                            email: client.buyerEmail,
                            archetype: client.archetype || '',
                            serviceInterest: client.serviceName,
                          }}
                          initialNotes={[]}
                          label={`Email ${getFirstName(client)}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[#142334] px-4 py-2 text-[12px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white"
                        />
                      )}
                      {client.diagnosticId && (
                        <Link
                          href={getClientProfileHref(adminKey, client.diagnosticId)}
                          className="inline-flex items-center px-1 py-2 text-[12px] font-semibold text-[#142334] underline-offset-4 transition hover:text-[#C9AD98] hover:underline"
                        >
                          View profile
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[#E4D8CB] bg-[#F5F3EE] p-5 md:p-6" onClick={(event) => event.stopPropagation()}>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Intake responses</p>
                        <div className="mt-3">
                          <IntakeResponses client={client} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Delivery notes</p>
                        <div className="mt-3">
                          <ClientNotes adminKey={adminKey} client={client} onNoteCreated={addNote} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[8px] bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Payment detail</p>
                        <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-[#142334]">
                        <p>Engagement ID: {client.paymentId}</p>
                        <p>Source: {client.paymentProvider === 'manual' ? 'Manual payment' : client.paymentProvider}</p>
                        {client.manualPaymentMethod && <p>Method: {client.manualPaymentMethod.replace(/_/g, ' ')}</p>}
                        {client.paymentReference && <p>Reference: {client.paymentReference}</p>}
                        <p>Amount: {client.amountLabel}</p>
                        <p>Confirmed: {formatDateTime(client.confirmedAt)}</p>
                        {client.paymentNotes && <p>Private note: {client.paymentNotes}</p>}
                        </div>
                      </div>
                      <div className="rounded-[8px] bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Recent emails</p>
                          <Mail className="h-4 w-4 text-[#C9AD98]" />
                        </div>
                        <div className="mt-3 space-y-2">
                          {client.recentEmails.length === 0 ? (
                            <p className="text-[13px] leading-relaxed text-[#6B6B6B]">No dashboard emails logged yet.</p>
                          ) : (
                            client.recentEmails.map((email) => (
                              <div key={`${email.subject}-${email.sentAt}`} className="text-[13px] leading-relaxed">
                                <p className="font-semibold text-[#142334]">{email.subject}</p>
                                <p className="text-[12px] text-[#6B6B6B]">{formatRelative(email.sentAt, currentTime)}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <Link
                          href={getClientMessagesHref(adminKey, client.buyerEmail)}
                          className="mt-3 inline-flex text-[12px] font-semibold text-[#142334] underline-offset-4 hover:text-[#C9AD98] hover:underline"
                        >
                          View all in Messages
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
