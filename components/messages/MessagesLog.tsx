'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronDown, ChevronRight, Mail, Search, Trash2 } from 'lucide-react';
import DashboardDatePicker from '@/components/DashboardDatePicker';
import FilterDropdown from '@/components/FilterDropdown';
import MessagesBrevoImportButton from '@/components/messages/MessagesBrevoImportButton';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';
import type { DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import { leadSourceLabels } from '@/lib/lead-sources';
import type { SentEmail, SentEmailFilterOption } from '@/lib/sent-emails';

const archetypeBadgeClasses: Record<string, string> = {
  'Lost Pivoter': 'bg-[#F5C07A] text-[#7A4A00]',
  'Engaged Strategist': 'bg-[#BFDBFE] text-[#1E40AF]',
  'Plateaued Performer': 'bg-[#E9D5FF] text-[#6B21A8]',
  'Quiet Pivoter': 'bg-[#CCFBF1] text-[#0F766E]',
  'Burnt-Out Builder': 'bg-[#FEE2E2] text-[#991B1B]',
};

const statusLabels: Record<DiagnosticLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  discovery_booked: 'Booked',
  paid: 'Paid',
  follow_up_later: 'Follow up',
  not_a_fit: 'Not a fit',
  nurture: 'Nurture',
  closed: 'Closed',
  archived: 'Archived',
};

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'engaged', label: 'Recently opened/clicked' },
  { value: 'delivery_attention', label: 'Delivery attention first' },
  { value: 'name_asc', label: 'Name A-Z' },
];

function getStatusClass(status?: DiagnosticLeadStatus | null) {
  if (status === 'paid') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'discovery_booked') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (status === 'new') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (status === 'nurture') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  if (status === 'closed') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'not_a_fit' || status === 'archived') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
  return 'border-[#D8C8BB] bg-white text-[#142334]';
}

function getDeliveryClass(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'sent') {
    return 'border-[#A7F3D0] bg-[#D1FAE5] text-[#065F46]';
  }
  if (normalized === 'scheduled') {
    return 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]';
  }
  if (normalized === 'clicked' || normalized === 'opened' || normalized === 'delivered') {
    return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  }
  if (normalized === 'bounced' || normalized === 'blocked' || normalized === 'failed') {
    return 'border-[#C98672] bg-[#FFF5F2] text-[#7A2F22]';
  }
  if (normalized === 'deferred') {
    return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  }
  return 'border-[#D8C8BB] bg-white text-[#142334]/62';
}

function getDeliveryLabel(status?: string | null) {
  if (!status) return 'Logged';
  return status
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOriginLabel(origin?: string | null) {
  if (origin === 'brevo_import') return 'Brevo sync';
  if (origin === 'automated') return 'Automated';
  return 'Dashboard';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function formatLogDate(value: string) {
  const sentAt = new Date(value).getTime();
  const diff = Date.now() - sentAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff >= 0 && diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diff >= 0 && diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diff >= 0 && diff < 2 * day) return 'Yesterday';

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));
}

function getEmailTimelineLabel(email: SentEmail) {
  if (String(email.deliveryStatus || '').toLowerCase() === 'scheduled' && email.scheduledAt) {
    return `Scheduled ${formatLogDate(email.scheduledAt)}`;
  }

  return formatLogDate(email.sentAt);
}

function formatBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getInitial(email: SentEmail) {
  return (email.toName || email.toEmail || '?').trim().charAt(0).toUpperCase() || '?';
}

function getClearHref(adminKey: string) {
  const params = new URLSearchParams();
  const legacyKey = getDashboardLegacyKey(adminKey);
  if (legacyKey) params.set('key', legacyKey);
  params.set('tab', 'messages');
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function getProfileHref(adminKey: string, leadId: string | null) {
  if (!leadId) return '';
  const params = new URLSearchParams();
  const legacyKey = getDashboardLegacyKey(adminKey);
  if (legacyKey) params.set('key', legacyKey);
  params.set('tab', 'messages');
  return `/resources/career-diagnostic/submissions/${leadId}?${params.toString()}`;
}

export default function MessagesLog({
  adminKey,
  emails,
  totalCount,
  thisWeekCount,
  uniqueLeadCount,
  importedCount,
  engagedCount,
  segmentOptions,
  stateOptions,
  filters,
  hasFilters,
}: {
  adminKey: string;
  emails: SentEmail[];
  totalCount: number;
  thisWeekCount: number;
  uniqueLeadCount: number;
  importedCount: number;
  engagedCount: number;
  segmentOptions: SentEmailFilterOption[];
  stateOptions: SentEmailFilterOption[];
  filters: {
    q?: string;
    archetype?: string;
    source?: string;
    status?: string;
    segment?: string;
    state?: string;
    sort?: string;
    from?: string;
    to?: string;
  };
  hasFilters: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [deletedEmailIds, setDeletedEmailIds] = useState<string[]>([]);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const visibleEmails = emails.filter((email) => !deletedEmailIds.includes(email.id));
  const clearHref = getClearHref(adminKey);
  const subtitle = hasFilters
    ? `Showing ${visibleEmails.length} of ${totalCount} emails.`
    : `Every dashboard, automated, and synced Brevo email. ${totalCount} email${totalCount === 1 ? '' : 's'} total.`;
  const emptyAll = totalCount === 0;
  const busyDeleting = Boolean(deletingEmailId) || isPending;

  async function deleteEmailRecord(email: SentEmail) {
    if (busyDeleting) return;
    const confirmed = window.confirm(`Delete the message record for ${email.toEmail}? This only removes it from the dashboard log.`);
    if (!confirmed) return;

    setDeletingEmailId(email.id);
    try {
      const response = await fetch(`/api/messages/${email.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not delete this message.');

      setDeletedEmailIds((current) => [...current, email.id]);
      if (expandedEmailId === email.id) setExpandedEmailId(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not delete this message.');
    } finally {
      setDeletingEmailId(null);
    }
  }

  return (
    <section id="messages-log" className="rounded-[8px] bg-[#F5F3EE] p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Messages / Sent</p>
          <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Sent emails</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#6B6B6B]">{subtitle}</p>
        </div>
        <MessagesBrevoImportButton adminKey={adminKey} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Total sent', String(totalCount), 'Emails sent'],
          ['This week', String(thisWeekCount), 'Last 7 days'],
          ['Unique leads', String(uniqueLeadCount), 'Leads contacted'],
          ['Opened/clicked', String(engagedCount), importedCount > 0 ? `${importedCount} synced from Brevo` : 'Known engagement'],
        ].map(([title, value, label]) => (
          <div key={title} className="rounded-[8px] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{title}</p>
            <p className="mt-3 font-serif text-[34px] leading-none text-[#142334]">{value}</p>
            <p className="mt-2 text-[12px] text-[#6B6B6B]">{label}</p>
          </div>
        ))}
      </div>

      <form action="/resources/career-diagnostic/submissions" method="get" className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_220px_210px_190px_150px_150px_auto_auto] xl:items-center">
        <input type="hidden" name="key" value={adminKey} />
        <input type="hidden" name="tab" value="messages" />
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            name="q"
            defaultValue={filters.q || ''}
            placeholder="Search by name, email, or subject..."
            className="h-10 w-full rounded-[8px] border border-[#E4D8CB] bg-white py-2 pl-10 pr-3 text-[14px] text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
          />
        </label>
        <FilterDropdown
          name="segment"
          value={filters.segment || ''}
          ariaLabel="Filter messages by segment"
          options={[
            { value: '', label: 'All segments' },
            ...segmentOptions,
          ]}
        />
        <FilterDropdown
          name="state"
          value={filters.state || ''}
          ariaLabel="Filter messages by state"
          options={[
            { value: '', label: 'All states' },
            ...stateOptions,
          ]}
        />
        <FilterDropdown
          name="sort"
          value={filters.sort || 'newest'}
          ariaLabel="Sort messages"
          options={sortOptions}
        />
        <DashboardDatePicker
          name="from"
          value={filters.from || ''}
          ariaLabel="From date"
          placeholder="From date"
        />
        <DashboardDatePicker
          name="to"
          value={filters.to || ''}
          ariaLabel="To date"
          placeholder="To date"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#142334] px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
        >
          Apply
        </button>
        {hasFilters && (
          <Link href={clearHref} className="text-center text-[13px] text-[#6B6B6B] underline-offset-4 transition hover:text-[#142334] hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="mt-5 overflow-hidden rounded-[8px] bg-white">
        {visibleEmails.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center px-6 py-10 text-center">
            <div>
              {emptyAll ? <Mail className="mx-auto h-9 w-9 text-[#C9AD98]" /> : <Search className="mx-auto h-9 w-9 text-[#C9AD98]" />}
              <p className="mt-5 font-serif text-[28px] leading-tight text-[#142334]">
                {emptyAll ? 'No emails sent yet.' : 'No emails match your filters.'}
              </p>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6B6B6B]">
                {emptyAll
                  ? 'Sync Brevo to backfill recent email history, or send from the Leads and Tasks pages to start logging messages automatically.'
                  : 'Clear filters to see all sent emails.'}
              </p>
              {!emptyAll && (
                <Link href={clearHref} className="mt-4 inline-flex text-[13px] text-[#6B6B6B] underline-offset-4 hover:text-[#142334] hover:underline">
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E4D8CB]">
            {visibleEmails.map((email) => {
              const expanded = expandedEmailId === email.id;
              const statusLabel = email.leadStatus ? statusLabels[email.leadStatus] : 'No lead';
              const sourceLabel = leadSourceLabels[email.leadSource] || 'Lead';
              const profileHref = getProfileHref(adminKey, email.leadId);

              return (
                <article key={email.id} className="transition hover:bg-[#F5F3EE]">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedEmailId(expanded ? null : email.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedEmailId(expanded ? null : email.id);
                      }
                    }}
                    className="grid cursor-pointer gap-4 px-4 py-3.5 md:grid-cols-[40px_minmax(170px,0.85fr)_minmax(220px,1fr)_auto_auto_24px] md:items-center"
                    aria-expanded={expanded}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#E4D8CB] font-serif text-[18px] leading-none text-[#142334]">
                      {getInitial(email)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#142334]">{email.toName}</p>
                      <p className="mt-1 truncate text-[12px] text-[#6B6B6B]">{email.toEmail}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getStatusClass(email.leadStatus)}`}>
                          {statusLabel}
                        </span>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getDeliveryClass(email.deliveryStatus)}`}>
                          {getDeliveryLabel(email.deliveryStatus)}
                        </span>
                      </div>
                    </div>
                    <p className="min-w-0 truncate text-[14px] text-[#142334]">{email.subject}</p>
                    <span className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-semibold ${archetypeBadgeClasses[email.archetype || ''] || 'bg-[#F5F3EE] text-[#6B6B6B]'}`}>
                      {email.archetype || 'No archetype'}
                    </span>
                    <p className="text-[12px] text-[#6B6B6B]">{getEmailTimelineLabel(email)}</p>
                    {expanded ? <ChevronDown className="h-5 w-5 text-[#C9AD98]" /> : <ChevronRight className="h-5 w-5 text-[#C9AD98]" />}
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 md:pl-[68px]">
                      <div className="rounded-[8px] bg-[#F5F3EE] p-4">
                        <div className="space-y-3 text-[14px] leading-[1.7] text-[#142334]">
                          {formatBody(email.body).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                        <p className="mt-4 text-[12px] leading-relaxed text-[#6B6B6B]">
                          Sent {formatDateTime(email.sentAt)} - Template: {email.templateName} - Source: {sourceLabel} - Log: {getOriginLabel(email.origin)}
                          {email.scheduledAt ? ` - Scheduled for ${formatDateTime(email.scheduledAt)}` : ''}
                          {email.clickedAt ? ` - Clicked ${formatLogDate(email.clickedAt)}` : email.openedAt ? ` - Opened ${formatLogDate(email.openedAt)}` : ''}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={`mailto:${email.toEmail}?subject=${encodeURIComponent(email.subject)}`}
                            className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                          >
                            Email <Mail className="h-4 w-4" />
                          </a>
                          {profileHref && (
                            <Link
                              href={profileHref}
                              className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
                            >
                              Profile <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteEmailRecord(email)}
                            disabled={busyDeleting}
                            className="inline-flex items-center gap-2 rounded-full border border-[#C98672]/45 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#8A3B2D] transition hover:border-[#8A3B2D] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingEmailId === email.id ? 'Deleting' : 'Delete'} <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
