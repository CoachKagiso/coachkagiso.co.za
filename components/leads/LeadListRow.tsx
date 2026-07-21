'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Mail } from 'lucide-react';
import { getDashboardLegacyKey } from '@/lib/dashboard-auth-url';
import type { DiagnosticLeadStatus, DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { DashboardNote } from '@/lib/dashboard-tasks';
import LeadEmailButton from './LeadEmailButton';
import LeadSourceBadge from './LeadSourceBadge';

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

const archetypeLabels: Record<string, string> = {
  A: 'Plateaued Performer',
  B: 'Quiet Pivoter',
  C: 'Burnt-Out Builder',
  D: 'Lost Pivoter',
  E: 'Engaged Strategist',
};

const archetypePillClasses: Record<string, string> = {
  A: 'border-[#142334]/18 bg-[#F0F3F5] text-[#142334]',
  B: 'border-[#C9AD98]/38 bg-[#F7F1EC] text-[#7B5D49]',
  C: 'border-[#8AA6C8]/38 bg-[#EEF4FA] text-[#284B70]',
  D: 'border-[#C98672]/35 bg-[#FFF1EC] text-[#8B3F2E]',
  E: 'border-[#79A580]/35 bg-[#EEF7EF] text-[#355C3A]',
};

function getStatusClass(status: DiagnosticLeadStatus) {
  if (status === 'paid') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'discovery_booked') return 'border-[#8AA6C8] bg-[#EEF4FA] text-[#284B70]';
  if (status === 'new') return 'border-[#C9AD98] bg-[#F7F1EC] text-[#7B5D49]';
  if (status === 'nurture') return 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]';
  if (status === 'closed') return 'border-[#79A580] bg-[#EEF7EF] text-[#355C3A]';
  if (status === 'not_a_fit' || status === 'archived') return 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/55';
  return 'border-[#D8C8BB] bg-white text-[#142334]';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function LeadListRow({
  submission,
  priority,
  adminKey,
  initialNotes,
}: {
  submission: DiagnosticSubmission;
  priority: number;
  adminKey: string;
  initialNotes: DashboardNote[];
}) {
  const legacyKey = getDashboardLegacyKey(adminKey);
  const profileHref = `/resources/career-diagnostic/submissions/${submission.id}${
    legacyKey ? `?key=${encodeURIComponent(legacyKey)}` : ''
  }`;
  const [leadStatus, setLeadStatus] = useState<DiagnosticLeadStatus>(submission.lead_status);
  const [followUpCount, setFollowUpCount] = useState(submission.follow_up_count);
  const [lastContactedAt, setLastContactedAt] = useState<string | null>(submission.last_contacted_at);
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string | null>(submission.next_follow_up_at);
  const [notes, setNotes] = useState(initialNotes);
  const lead = {
    id: submission.id,
    firstName: submission.first_name,
    email: submission.email,
    archetype: submission.archetype_name,
    serviceInterest: submission.archetype_payload?.service || '',
    leadStatus,
    followUpCount,
    lastContactedAt,
    source: submission.source,
    downloadLink: submission.download_link,
  };

  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.25fr_0.78fr_0.72fr_0.5fr_0.72fr_auto] lg:items-center">
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          name="ids"
          value={submission.id}
          data-batch-group="diagnostic-records"
          aria-label={`Select ${submission.first_name}'s diagnostic record`}
          className="mt-1 h-4 w-4 shrink-0 accent-[#142334]"
        />
        <div className="flex min-w-0 flex-col items-start">
          <Link
            href={profileHref}
            className="block w-full truncate font-serif text-[29px] leading-none text-[#142334] transition hover:text-[#C9AD98]"
          >
            {submission.first_name}
          </Link>
          <a
            href={`mailto:${submission.email}`}
            className="mt-2 flex w-full min-w-0 items-center gap-2 text-[14px] leading-relaxed text-[#142334]/72 transition hover:text-[#C9AD98]"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{submission.email}</span>
          </a>
        </div>
      </div>
      <div className="mt-4 lg:mt-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9AD98]">
            {submission.archetype_key}
          </span>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              archetypePillClasses[submission.archetype_key] || 'border-[#D8C8BB] bg-[#FCFBFA] text-[#142334]/62'
            }`}
          >
            {archetypeLabels[submission.archetype_key] || submission.archetype_name}
          </span>
          <LeadSourceBadge source={submission.source} />
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-[#142334]">
          {submission.archetype_payload?.service || 'Not set'}
        </p>
      </div>
      <div className="mt-4 lg:mt-0">
        <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.17em] ${getStatusClass(leadStatus)}`}>
          {statusLabels[leadStatus]}
        </span>
        <p className="mt-3 text-[12px] text-[#142334]/58">Submitted {formatDate(submission.submitted_at)}</p>
      </div>
      <div className="mt-4 lg:mt-0">
        <p className="font-serif text-[30px] leading-none text-[#142334]">{priority}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E7DF]">
          <div className="h-full bg-[#C9AD98]" style={{ width: `${priority}%` }} />
        </div>
      </div>
      <div className="mt-4 lg:mt-0">
        <p className="text-[14px] leading-relaxed text-[#142334]/72">{formatShortDate(nextFollowUpAt)}</p>
        <p className="mt-1 text-[12px] text-[#142334]/58">Last contact: {formatShortDate(lastContactedAt)}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
        <LeadEmailButton
          lead={lead}
          initialNotes={notes}
          className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
          onSent={(nextSubmission) => {
            if (nextSubmission.lead_status) setLeadStatus(nextSubmission.lead_status as DiagnosticLeadStatus);
            if (typeof nextSubmission.follow_up_count !== 'undefined') {
              setFollowUpCount(nextSubmission.follow_up_count);
            }
            if (typeof nextSubmission.last_contacted_at !== 'undefined') {
              setLastContactedAt(nextSubmission.last_contacted_at || null);
            }
            if (typeof nextSubmission.next_follow_up_at !== 'undefined') {
              setNextFollowUpAt(nextSubmission.next_follow_up_at || null);
            }
          }}
          onNoteCreated={(note) => setNotes((current) => [note, ...current])}
        />
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 rounded-full border border-[#D8C8BB] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#142334] transition hover:border-[#C9AD98] hover:text-[#C9AD98]"
        >
          Profile <FileText className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
