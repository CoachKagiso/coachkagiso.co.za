import type { DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import {
  activeFollowUpNotificationStatuses,
  addSastDaysAsDateKey,
  getEffectiveNextFollowUpAt,
  getFollowUpActionLabel,
  getFollowUpUrgency,
  getSastDateKey,
  type FollowUpNotification,
} from '@/lib/follow-up-utils';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

type FollowUpNotificationRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  archetype_name: string | null;
  archetype_payload: { service?: string | null } | null;
  next_follow_up_at: string | null;
  follow_up_count: number | null;
  lead_status: DiagnosticLeadStatus | null;
  last_contacted_at: string | null;
  source?: string | null;
  submitted_at?: string | null;
};

const selectWithFollowUpCount =
  'id, first_name, email, archetype_name, archetype_payload, next_follow_up_at, follow_up_count, lead_status, last_contacted_at, source, submitted_at';
const selectWithoutFollowUpCount =
  'id, first_name, email, archetype_name, archetype_payload, next_follow_up_at, lead_status, last_contacted_at, source, submitted_at';

function isMissingNotificationColumn(message?: string) {
  return Boolean(message && ['next_follow_up_at', 'follow_up_count', 'last_contacted_at'].some((column) => message.includes(column)));
}

function normalizeNotification(row: FollowUpNotificationRow, today: string, upperDateKey: string): FollowUpNotification | null {
  const leadStatus = row.lead_status === 'new' || row.lead_status === 'contacted' ? row.lead_status : null;
  if (!leadStatus) return null;
  if (row.source === 'masterclass_waitlist') return null;

  const followUpCount = Number.isFinite(Number(row.follow_up_count)) ? Number(row.follow_up_count) : 0;
  const nextFollowUpAt = getEffectiveNextFollowUpAt({
    followUpCount,
    lastContactedAt: row.last_contacted_at,
    leadStatus,
    nextFollowUpAt: row.next_follow_up_at,
    source: row.source,
    submittedAt: row.submitted_at,
  });
  if (!nextFollowUpAt || nextFollowUpAt > upperDateKey) return null;

  const firstName = row.first_name || '';
  const name = firstName || row.email || 'Lead';
  const urgency = getFollowUpUrgency(nextFollowUpAt, today);

  return {
    id: row.id,
    firstName,
    email: row.email || '',
    name,
    archetype: row.archetype_name || 'Diagnostic lead',
    serviceInterest: row.archetype_payload?.service || 'Recommended service',
    nextFollowUpAt,
    followUpCount,
    leadStatus,
    lastContactedAt: row.last_contacted_at || null,
    actionLabel: getFollowUpActionLabel(leadStatus, followUpCount),
    ...urgency,
  };
}

export async function getFollowUpNotificationCount() {
  return (await listFollowUpNotifications({ includeTomorrow: false, limit: 500 })).length;
}

export async function listFollowUpNotifications({
  includeTomorrow = true,
  limit = 10,
}: {
  includeTomorrow?: boolean;
  limit?: number;
} = {}) {
  const supabase = createSupabaseServiceClient();
  const today = getSastDateKey();
  const upperDateKey = includeTomorrow ? addSastDaysAsDateKey(new Date(), 1) : today;

  const initialResult = await supabase
    .from('diagnostic_submissions')
    .select(selectWithFollowUpCount)
    .or(`next_follow_up_at.lte.${upperDateKey},next_follow_up_at.is.null`)
    .in('lead_status', [...activeFollowUpNotificationStatuses])
    .neq('source', 'masterclass_waitlist')
    .order('next_follow_up_at', { ascending: true })
    .limit(limit);
  let data = initialResult.data as unknown[] | null;
  let error = initialResult.error;

  if (error && error.message.includes('follow_up_count')) {
    const fallbackResult = await supabase
      .from('diagnostic_submissions')
      .select(selectWithoutFollowUpCount)
      .or(`next_follow_up_at.lte.${upperDateKey},next_follow_up_at.is.null`)
      .in('lead_status', [...activeFollowUpNotificationStatuses])
      .neq('source', 'masterclass_waitlist')
      .order('next_follow_up_at', { ascending: true })
      .limit(limit);
    data = fallbackResult.data as unknown[] | null;
    error = fallbackResult.error;
  }

  if (error) {
    if (isMissingNotificationColumn(error.message)) return [];
    throw new Error(error.message);
  }

  return ((data || []) as FollowUpNotificationRow[])
    .map((row) => normalizeNotification(row, today, upperDateKey))
    .filter((item): item is FollowUpNotification => Boolean(item));
}
