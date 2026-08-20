import { getEmailTemplateGuardrail } from '@/lib/email-template-guardrails';
import { getEmailTemplate, type EmailTemplateId } from '@/lib/email-templates';
import { injectTemplateTokens } from '@/lib/email-template-render';
import { listFollowUpNotifications } from '@/lib/follow-up-notifications';
import { getDateKeyDiff, getSastDateKey, type FollowUpUrgency } from '@/lib/follow-up-utils';
import { leadSourceLabels, normalizeLeadSource } from '@/lib/lead-sources';
import { listStoredEmailTemplates } from '@/lib/settings';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type EmailBacklogItem = {
  leadId: string;
  firstName: string;
  email: string;
  archetype: string;
  serviceInterest: string;
  source: string;
  sourceLabel: string;
  leadStatus: 'new' | 'contacted';
  followUpCount: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string;
  urgency: FollowUpUrgency;
  urgencyLabel: string;
  daysOverdue: number;
  actionLabel: string;
  templateId: EmailTemplateId | null;
  stageLabel: string;
  subject: string;
  body: string;
  /** True when this lead cannot be batch-scheduled and needs Kagiso in the email modal. */
  blocked: boolean;
  blockedReason: string;
};

export type EmailBacklog = {
  generatedAt: string;
  today: string;
  counts: {
    total: number;
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    sendable: number;
    blocked: number;
  };
  oldestDaysOverdue: number;
  items: EmailBacklogItem[];
};

type LeadRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  archetype_name: string | null;
  archetype_key: string | null;
  archetype_payload: { service?: string | null } | null;
  source: string | null;
  lead_status: string | null;
  follow_up_count: number | null;
  last_contacted_at: string | null;
  sequence_repair_status: string | null;
};

type SentEmailRow = {
  lead_id: string | null;
  to_email: string | null;
  template_id: string | null;
};

const leadSelect =
  'id, first_name, email, archetype_name, archetype_key, archetype_payload, source, lead_status, follow_up_count, last_contacted_at, sequence_repair_status';

async function loadLeadRows(leadIds: string[]) {
  if (leadIds.length === 0) return new Map<string, LeadRow>();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('diagnostic_submissions').select(leadSelect).in('id', leadIds);
  if (error) throw new Error(error.message);

  return new Map((data || []).map((row) => [String((row as LeadRow).id), row as LeadRow]));
}

async function loadSentTemplateIds(leadIds: string[], emails: string[]) {
  const byLead = new Map<string, string[]>();
  const byEmail = new Map<string, string[]>();
  if (leadIds.length === 0) return { byLead, byEmail };

  const supabase = createSupabaseServiceClient();
  const cleanEmails = Array.from(new Set(emails.filter(Boolean).map((email) => email.toLowerCase())));

  const [leadResult, emailResult] = await Promise.all([
    supabase.from('sent_emails').select('lead_id, to_email, template_id').in('lead_id', leadIds).not('template_id', 'is', null),
    cleanEmails.length
      ? supabase.from('sent_emails').select('lead_id, to_email, template_id').in('to_email', cleanEmails).not('template_id', 'is', null)
      : Promise.resolve({ data: [] as SentEmailRow[], error: null }),
  ]);

  if (leadResult.error) throw new Error(leadResult.error.message);
  if (emailResult.error) throw new Error(emailResult.error.message);

  for (const row of (leadResult.data || []) as SentEmailRow[]) {
    if (!row.lead_id || !row.template_id) continue;
    byLead.set(row.lead_id, [...(byLead.get(row.lead_id) || []), row.template_id]);
  }

  for (const row of (emailResult.data || []) as SentEmailRow[]) {
    const email = row.to_email?.toLowerCase();
    if (!email || !row.template_id) continue;
    byEmail.set(email, [...(byEmail.get(email) || []), row.template_id]);
  }

  return { byLead, byEmail };
}

/**
 * Resolves the next template for a lead and returns the rendered draft, or the
 * reason the lead has to be handled by hand.
 */
export function resolveBacklogDraft({
  lead,
  sentTemplateIds,
  templates,
}: {
  lead: LeadRow;
  sentTemplateIds: string[];
  templates: Array<{ id: string; subject: string; body: string; active?: boolean }>;
}) {
  const guardrail = getEmailTemplateGuardrail(
    {
      archetypeName: lead.archetype_name,
      archetypeKey: lead.archetype_key,
      followUpCount: lead.follow_up_count,
      leadStatus: lead.lead_status,
      lastContactedAt: lead.last_contacted_at,
      source: lead.source,
      sequenceRepairStatus: lead.sequence_repair_status,
    },
    sentTemplateIds,
  );

  if (guardrail.sequenceRepairStatus === 'manual') {
    return { templateId: null, subject: '', body: '', blockedReason: 'Manual sequence handling is on for this lead.' };
  }

  if (guardrail.sequenceGap.detected) {
    return {
      templateId: null,
      subject: '',
      body: '',
      blockedReason: 'Sequence gap: first contact was never logged. Send the recovery email from the lead first.',
    };
  }

  const templateId = guardrail.recommendedTemplateId;
  if (!templateId) {
    return { templateId: null, subject: '', body: '', blockedReason: 'This lead has finished the email sequence.' };
  }

  const stored = templates.find((template) => template.id === templateId);
  if (stored && stored.active === false) {
    return {
      templateId: null,
      subject: '',
      body: '',
      blockedReason: `${getEmailTemplate(templateId).stageLabel} is switched off in Settings.`,
    };
  }

  const fallback = getEmailTemplate(templateId);
  const renderLead = {
    firstName: lead.first_name,
    serviceInterest: lead.archetype_payload?.service || '',
  };

  return {
    templateId,
    subject: injectTemplateTokens(stored?.subject || fallback.subject, renderLead, templateId),
    body: injectTemplateTokens(stored?.body || fallback.body, renderLead, templateId),
    blockedReason: '',
  };
}

export async function buildEmailBacklog({
  includeTomorrow = true,
  limit = 200,
}: { includeTomorrow?: boolean; limit?: number } = {}): Promise<EmailBacklog> {
  const today = getSastDateKey();
  const notifications = await listFollowUpNotifications({ includeTomorrow, limit });
  const leadIds = notifications.map((notification) => notification.id);
  const emails = notifications.map((notification) => notification.email);

  const [leadRows, sentTemplates, templates] = await Promise.all([
    loadLeadRows(leadIds),
    loadSentTemplateIds(leadIds, emails),
    listStoredEmailTemplates(createSupabaseServiceClient()),
  ]);

  const items = notifications.map((notification): EmailBacklogItem => {
    const lead = leadRows.get(notification.id);
    const sentTemplateIds = [
      ...(sentTemplates.byLead.get(notification.id) || []),
      ...(sentTemplates.byEmail.get(notification.email.toLowerCase()) || []),
    ];
    const draft = lead
      ? resolveBacklogDraft({ lead, sentTemplateIds, templates })
      : { templateId: null, subject: '', body: '', blockedReason: 'Lead record could not be loaded.' };
    const source = normalizeLeadSource(lead?.source);
    const daysOverdue = Math.max(0, getDateKeyDiff(today, notification.nextFollowUpAt));

    return {
      leadId: notification.id,
      firstName: notification.firstName || notification.name,
      email: notification.email,
      archetype: notification.archetype,
      serviceInterest: notification.serviceInterest,
      source,
      sourceLabel: leadSourceLabels[source] || source,
      leadStatus: notification.leadStatus,
      followUpCount: notification.followUpCount,
      lastContactedAt: notification.lastContactedAt,
      nextFollowUpAt: notification.nextFollowUpAt,
      urgency: notification.urgency,
      urgencyLabel: notification.urgencyLabel,
      daysOverdue,
      actionLabel: notification.actionLabel,
      templateId: draft.templateId,
      stageLabel: draft.templateId ? getEmailTemplate(draft.templateId).stageLabel : '',
      subject: draft.subject,
      body: draft.body,
      blocked: !draft.templateId,
      blockedReason: draft.blockedReason,
    };
  });

  const sorted = items.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return a.nextFollowUpAt.localeCompare(b.nextFollowUpAt);
  });

  return {
    generatedAt: new Date().toISOString(),
    today,
    counts: {
      total: sorted.length,
      overdue: sorted.filter((item) => item.urgency === 'overdue').length,
      dueToday: sorted.filter((item) => item.urgency === 'today').length,
      dueTomorrow: sorted.filter((item) => item.urgency === 'tomorrow').length,
      sendable: sorted.filter((item) => !item.blocked).length,
      blocked: sorted.filter((item) => item.blocked).length,
    },
    // Blocked leads are excluded: a lead parked on manual handling can sit overdue
    // for months, and headlining that number would point Kagiso at something she
    // cannot action from the digest or a batch.
    oldestDaysOverdue: sorted
      .filter((item) => !item.blocked)
      .reduce((highest, item) => Math.max(highest, item.daysOverdue), 0),
    items: sorted,
  };
}
