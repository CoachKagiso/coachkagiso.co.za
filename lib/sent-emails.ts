import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { isDiagnosticLeadStatus, type DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import { EMAIL_TEMPLATES, getEmailTemplate, type EmailTemplateId } from '@/lib/email-templates';

type SentEmailRow = {
  id: string;
  lead_id: string | null;
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  template_id: string | null;
  archetype: string | null;
  service_interest: string | null;
  sent_at: string;
  diagnostic_submissions?: { lead_status?: string | null } | { lead_status?: string | null }[] | null;
};

export type SentEmail = {
  id: string;
  leadId: string | null;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  templateId: string | null;
  templateName: string;
  archetype: string | null;
  serviceInterest: string | null;
  sentAt: string;
  leadStatus: DiagnosticLeadStatus | null;
};

export type SentEmailFilters = {
  query?: string | null;
  archetype?: string | null;
  from?: string | null;
  to?: string | null;
};

export type SentEmailResult = {
  emails: SentEmail[];
  totalCount: number;
  thisWeekCount: number;
  uniqueLeadCount: number;
  hasFilters: boolean;
};

const knownTemplateIds = new Set<EmailTemplateId>(EMAIL_TEMPLATES.map((template) => template.id));

function isMissingSentEmailsTable(message?: string) {
  return Boolean(message && (message.includes('sent_emails') || message.includes('schema cache')));
}

function getJoinedLeadStatus(row: SentEmailRow) {
  const joined = row.diagnostic_submissions;
  const leadStatus = Array.isArray(joined) ? joined[0]?.lead_status : joined?.lead_status;
  return isDiagnosticLeadStatus(leadStatus) ? leadStatus : null;
}

function getTemplateName(templateId?: string | null) {
  if (templateId && knownTemplateIds.has(templateId as EmailTemplateId)) {
    const template = getEmailTemplate(templateId as EmailTemplateId);
    return `${template.stageLabel} - ${template.archetypeName}`;
  }

  return templateId ? templateId.replace(/_/g, ' ') : 'Manual';
}

function normalizeSentEmail(row: SentEmailRow): SentEmail {
  return {
    id: row.id,
    leadId: row.lead_id || null,
    toEmail: row.to_email,
    toName: row.to_name,
    subject: row.subject,
    body: row.body,
    templateId: row.template_id || null,
    templateName: getTemplateName(row.template_id),
    archetype: row.archetype || null,
    serviceInterest: row.service_interest || null,
    sentAt: row.sent_at,
    leadStatus: getJoinedLeadStatus(row),
  };
}

function getDateBoundary(value: string | null | undefined, boundary: 'start' | 'end') {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00+02:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === 'end') {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

function filterSentEmails(emails: SentEmail[], filters: SentEmailFilters) {
  const query = filters.query?.trim().toLowerCase();
  const fromTime = getDateBoundary(filters.from, 'start');
  const toTime = getDateBoundary(filters.to, 'end');
  const archetype = filters.archetype?.trim();

  return emails.filter((email) => {
    if (query) {
      const matchesQuery = [email.toName, email.toEmail, email.subject]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      if (!matchesQuery) return false;
    }

    if (archetype && email.archetype !== archetype) return false;

    const sentTime = new Date(email.sentAt).getTime();
    if (fromTime && sentTime < fromTime) return false;
    if (toTime && sentTime > toTime) return false;

    return true;
  });
}

export function hasSentEmailFilters(filters: SentEmailFilters) {
  return Boolean(filters.query?.trim() || filters.archetype?.trim() || filters.from || filters.to);
}

export async function listSentEmails(filters: SentEmailFilters = {}): Promise<SentEmailResult> {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('sent_emails')
    .select('*, diagnostic_submissions(lead_status)')
    .order('sent_at', { ascending: false })
    .limit(1000);

  if (result.error) {
    if (isMissingSentEmailsTable(result.error.message)) {
      return {
        emails: [],
        totalCount: 0,
        thisWeekCount: 0,
        uniqueLeadCount: 0,
        hasFilters: hasSentEmailFilters(filters),
      };
    }

    throw new Error(result.error.message);
  }

  const allEmails = ((result.data || []) as SentEmailRow[]).map(normalizeSentEmail);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = allEmails.filter((email) => new Date(email.sentAt).getTime() >= weekAgo).length;
  const uniqueLeadCount = new Set(allEmails.map((email) => email.leadId).filter(Boolean)).size;

  return {
    emails: filterSentEmails(allEmails, filters),
    totalCount: allEmails.length,
    thisWeekCount,
    uniqueLeadCount,
    hasFilters: hasSentEmailFilters(filters),
  };
}
