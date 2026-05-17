import Link from 'next/link';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import type { ClientOperation } from '@/lib/client-operations';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import { getPaymentClientName, type Task, type TaskStatus } from '@/lib/dashboard-tasks';

function buildTabHref(key: string, tab: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (key) params.set('key', key);
  if (tab !== 'dashboard') params.set('tab', tab);
  Object.entries(extra).forEach(([name, value]) => {
    if (value) params.set(name, value);
  });
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function getLeadName(lead: DiagnosticSubmission) {
  return lead.first_name || lead.email || 'Lead';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function getRelativeTime(value?: string | null) {
  if (!value) return 'Not yet contacted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet contacted';

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

function getLeadStatusBadgeClass(status: DiagnosticLeadStatus) {
  if (status === 'paid') return 'bg-[#EEF7EF] text-[#355C3A] ring-[#D8E8D9]';
  if (status === 'discovery_booked') return 'bg-[#EEF4FA] text-[#284B70] ring-[#D5E2EF]';
  if (status === 'contacted' || status === 'follow_up_later') return 'bg-[#FFF8EB] text-[#9A5C00] ring-[#F1DFC1]';
  if (status === 'closed') return 'bg-[#EEF7EF] text-[#355C3A] ring-[#D8E8D9]';
  if (status === 'archived' || status === 'not_a_fit') return 'bg-white text-[#6B6B6B] ring-[#E4D8CB]';
  return 'bg-white text-[#142334] ring-[#E4D8CB]';
}

export function DetailTab({
  task,
  lead,
  operation,
  adminKey,
  statusOptions,
  leadStatusLabels,
  statusSaving,
  onMove,
}: {
  task: Task;
  lead?: DiagnosticSubmission;
  operation?: ClientOperation;
  adminKey: string;
  statusOptions: { value: TaskStatus; label: string }[];
  leadStatusLabels: Record<DiagnosticLeadStatus, string>;
  statusSaving: TaskStatus | null;
  onMove: (nextStatus: TaskStatus) => Promise<void>;
}) {
  const canMoveStatus = task.isManual || (task.type === 'LEAD' && Boolean(task.leadId));
  const linkedRecordHref = lead
    ? buildTabHref(adminKey, 'pipeline', { q: lead.email })
    : operation
      ? buildTabHref(adminKey, 'clients', { q: getPaymentClientName(operation) })
      : null;

  return (
    <div className="grid gap-4 px-5 py-4 md:px-6">
      {(lead || operation) && (
        <section className="rounded-[12px] bg-[#F5F3EE] p-4">
          {lead && (
            <div className="grid gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#142334]">{getLeadName(lead)}</p>
                <p className="mt-1 truncate text-[12px] text-[#6B6B6B]">{lead.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Archetype</p>
                  <p className="mt-1 truncate text-[13px] text-[#142334]">{lead.archetype_name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Service interest</p>
                  <p className="mt-1 truncate text-[13px] text-[#142334]">
                    {lead.archetype_payload?.service || 'No service set'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${getLeadStatusBadgeClass(
                    lead.lead_status,
                  )}`}
                >
                  {leadStatusLabels[lead.lead_status]}
                </span>
                <span className="text-[12px] text-[#6B6B6B]">
                  {lead.last_contacted_at ? `Last contacted: ${getRelativeTime(lead.last_contacted_at)}` : 'Not yet contacted'}
                </span>
              </div>

              {linkedRecordHref && (
                <Link
                  href={linkedRecordHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-[#142334] underline-offset-4 hover:underline"
                >
                  View in Pipeline <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}

          {operation && (
            <div className="grid gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#142334]">{getPaymentClientName(operation)}</p>
                <p className="mt-1 truncate text-[12px] text-[#6B6B6B]">{operation.payment.buyer_email || 'No email on payment'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Service purchased</p>
                  <p className="mt-1 truncate text-[13px] text-[#142334]">{operation.serviceTitle}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Delivery status</p>
                  <p className="mt-1 truncate text-[13px] text-[#142334]">{operation.deliveryLabel}</p>
                </div>
              </div>

              <p className="text-[12px] text-[#6B6B6B]">Deadline: {formatDateTime(operation.deliveryDueAt)}</p>

              {linkedRecordHref && (
                <Link
                  href={linkedRecordHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-[#142334] underline-offset-4 hover:underline"
                >
                  View in Clients <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {!lead && !operation && (
        <section className="rounded-[12px] bg-[#F5F3EE] p-4">
          <p className="text-[15px] font-bold text-[#142334]">{task.clientName}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6B6B6B]">{task.subtitle}</p>
        </section>
      )}

      {task.isManual && <p className="text-[12px] text-[#6B6B6B]">Manually created task</p>}

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Move to</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {statusOptions.map((option) => {
            const active = task.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onMove(option.value)}
                disabled={!canMoveStatus || statusSaving !== null}
                className={`inline-flex h-9 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-[12px] ${
                  active
                    ? 'bg-[#142334] text-white'
                    : 'border border-[#D1D5DB] bg-transparent text-[#6B6B6B] hover:border-[#142334] hover:text-[#142334]'
                }`}
              >
                {statusSaving === option.value && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span className="whitespace-nowrap">{option.label}</span>
              </button>
            );
          })}
        </div>
        {!task.isManual && task.type === 'LEAD' && (
          <p className="mt-3 text-[11px] leading-relaxed text-[#6B6B6B]">
            Status updates here sync with the Pipeline page.
          </p>
        )}
        {!canMoveStatus && (
          <p className="mt-3 text-[11px] leading-relaxed text-[#6B6B6B]">
            This generated task follows its linked record and cannot be moved directly here yet.
          </p>
        )}
      </section>
    </div>
  );
}
