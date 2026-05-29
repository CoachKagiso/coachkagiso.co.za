import type { DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';

export type FollowUpUrgency = 'overdue' | 'today' | 'tomorrow';

export type FollowUpNotification = {
  id: string;
  firstName: string;
  email: string;
  name: string;
  archetype: string;
  serviceInterest: string;
  nextFollowUpAt: string;
  followUpCount: number;
  leadStatus: Extract<DiagnosticLeadStatus, 'new' | 'contacted'>;
  lastContactedAt: string | null;
  urgency: FollowUpUrgency;
  urgencyLabel: string;
  actionLabel: string;
};

export const activeFollowUpNotificationStatuses = ['new', 'contacted'] as const;
export const clearNextFollowUpStatuses: DiagnosticLeadStatus[] = [
  'discovery_booked',
  'not_a_fit',
  'nurture',
  'closed',
  'archived',
];

const dashboardTimeZone = 'Africa/Johannesburg';

function toDateKey(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return getSastDateKey(date);
}

export function getSastDateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: dashboardTimeZone,
    year: 'numeric',
  }).format(value);
}

export function addSastDaysAsDateKey(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return getSastDateKey(date);
}

export function getEffectiveNextFollowUpAt({
  followUpCount = 0,
  lastContactedAt,
  leadStatus,
  nextFollowUpAt,
  source,
  submittedAt,
}: {
  followUpCount?: number | null;
  lastContactedAt?: string | null;
  leadStatus?: DiagnosticLeadStatus | null;
  nextFollowUpAt?: string | null;
  source?: string | null;
  submittedAt?: string | null;
}) {
  const count = Number.isFinite(Number(followUpCount)) ? Number(followUpCount) : 0;
  if (source === 'masterclass_waitlist' && leadStatus === 'contacted') return null;

  const storedFollowUpDate = toDateKey(nextFollowUpAt);
  if (storedFollowUpDate) return storedFollowUpDate;

  if (leadStatus === 'new') {
    return toDateKey(submittedAt) || getSastDateKey();
  }

  if (leadStatus === 'contacted') {
    const contactedDate = lastContactedAt ? new Date(lastContactedAt) : null;
    if (!contactedDate || Number.isNaN(contactedDate.getTime())) return getSastDateKey();

    if (count >= 3) return null;
    if (source === 'masterclass_waitlist') return null;

    const daysUntilNext =
      source === 'first_90_days' || source === 'linkedin_headline'
        ? 5
        : count <= 0
          ? 4
          : count === 1
            ? 6
            : 2;
    return addSastDaysAsDateKey(contactedDate, daysUntilNext);
  }

  return null;
}

export function getDateKeyDiff(referenceDateKey: string, targetDateKey: string) {
  const referenceDate = new Date(`${referenceDateKey}T00:00:00+02:00`);
  const targetDate = new Date(`${targetDateKey}T00:00:00+02:00`);
  if (Number.isNaN(referenceDate.getTime()) || Number.isNaN(targetDate.getTime())) return 0;

  return Math.floor((referenceDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000));
}

export function isPastDateKey(value: string, today = getSastDateKey()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value < today;
}

export function shouldClearNextFollowUp(status?: DiagnosticLeadStatus | null) {
  return Boolean(status && clearNextFollowUpStatuses.includes(status));
}

export function getFollowUpActionLabel(status: DiagnosticLeadStatus, followUpCount = 0) {
  if (status === 'new') return 'Send first email';
  if (followUpCount <= 0) return 'Send follow-up 1';
  if (followUpCount === 1) return 'Send follow-up 2';
  if (followUpCount === 2) return 'Send newsletter bridge';
  return 'Sequence complete';
}

export function getFollowUpUrgency(nextFollowUpAt: string, today = getSastDateKey()) {
  const diffDays = getDateKeyDiff(today, nextFollowUpAt);

  if (diffDays > 0) {
    return {
      urgency: 'overdue' as const,
      urgencyLabel: `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`,
    };
  }

  if (diffDays === 0) {
    return {
      urgency: 'today' as const,
      urgencyLabel: 'Due today',
    };
  }

  return {
    urgency: 'tomorrow' as const,
    urgencyLabel: 'Due tomorrow',
  };
}
