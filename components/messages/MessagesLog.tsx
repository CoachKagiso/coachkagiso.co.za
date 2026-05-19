'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Mail, Search } from 'lucide-react';
import type { DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import type { SentEmail } from '@/lib/sent-emails';

const archetypeOptions = [
  'Lost Pivoter',
  'Engaged Strategist',
  'Plateaued Performer',
  'Quiet Pivoter',
  'Burnt-Out Builder',
] as const;

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

function getStatusClass(status?: DiagnosticLeadStatus | null) {
  if (status === 'paid') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'discovery_booked') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (status === 'new') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (status === 'nurture') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  if (status === 'closed') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'not_a_fit' || status === 'archived') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
  return 'border-[#D8C8BB] bg-white text-[#142334]';
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
  if (adminKey) params.set('key', adminKey);
  params.set('tab', 'messages');
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

export default function MessagesLog({
  adminKey,
  emails,
  totalCount,
  thisWeekCount,
  uniqueLeadCount,
  filters,
  hasFilters,
}: {
  adminKey: string;
  emails: SentEmail[];
  totalCount: number;
  thisWeekCount: number;
  uniqueLeadCount: number;
  filters: {
    q?: string;
    archetype?: string;
    from?: string;
    to?: string;
  };
  hasFilters: boolean;
}) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(emails[0]?.id || null);
  const clearHref = getClearHref(adminKey);
  const subtitle = hasFilters
    ? `Showing ${emails.length} of ${totalCount} emails.`
    : `Every email sent from the dashboard. ${totalCount} email${totalCount === 1 ? '' : 's'} total.`;
  const emptyAll = totalCount === 0;

  return (
    <section id="messages-log" className="rounded-[8px] bg-[#F5F3EE] p-5 md:p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Messages / Sent</p>
        <h2 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">Sent emails</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#6B6B6B]">{subtitle}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ['Total sent', String(totalCount), 'Emails sent'],
          ['This week', String(thisWeekCount), 'Last 7 days'],
          ['Unique leads', String(uniqueLeadCount), 'Leads contacted'],
        ].map(([title, value, label]) => (
          <div key={title} className="rounded-[8px] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{title}</p>
            <p className="mt-3 font-serif text-[34px] leading-none text-[#142334]">{value}</p>
            <p className="mt-2 text-[12px] text-[#6B6B6B]">{label}</p>
          </div>
        ))}
      </div>

      <form action="/resources/career-diagnostic/submissions" method="get" className="mt-6 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px_150px_150px_auto_auto] lg:items-center">
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
        <select
          name="archetype"
          defaultValue={filters.archetype || ''}
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]"
        >
          <option value="">All archetypes</option>
          {archetypeOptions.map((archetype) => (
            <option key={archetype} value={archetype}>
              {archetype}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={filters.from || ''}
          aria-label="From date"
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]"
        />
        <input
          type="date"
          name="to"
          defaultValue={filters.to || ''}
          aria-label="To date"
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]"
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

      <div className="mt-6 overflow-hidden rounded-[8px] bg-white">
        {emails.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center px-6 py-10 text-center">
            <div>
              {emptyAll ? <Mail className="mx-auto h-9 w-9 text-[#C9AD98]" /> : <Search className="mx-auto h-9 w-9 text-[#C9AD98]" />}
              <p className="mt-5 font-serif text-[28px] leading-tight text-[#142334]">
                {emptyAll ? 'No emails sent yet.' : 'No emails match your filters.'}
              </p>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#6B6B6B]">
                {emptyAll
                  ? 'Emails you send from the Leads or Tasks pages will appear here.'
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
            {emails.map((email) => {
              const expanded = expandedEmailId === email.id;
              const statusLabel = email.leadStatus ? statusLabels[email.leadStatus] : 'No lead';

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
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${getStatusClass(email.leadStatus)}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="min-w-0 truncate text-[14px] text-[#142334]">{email.subject}</p>
                    <span className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-semibold ${archetypeBadgeClasses[email.archetype || ''] || 'bg-[#F5F3EE] text-[#6B6B6B]'}`}>
                      {email.archetype || 'No archetype'}
                    </span>
                    <p className="text-[12px] text-[#6B6B6B]">{formatLogDate(email.sentAt)}</p>
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
                          Sent {formatDateTime(email.sentAt)} - Template: {email.templateName}
                        </p>
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
