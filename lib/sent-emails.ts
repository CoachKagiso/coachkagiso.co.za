import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { normalizeDiagnosticArchetypeName } from '@/lib/diagnostic-archetype-names';
import { isDiagnosticLeadStatus, type DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import { EMAIL_TEMPLATES, getEmailTemplate, type EmailTemplateId } from '@/lib/email-templates';
import { leadSourceLabels, normalizeLeadSource, type DiagnosticLeadSource } from '@/lib/lead-sources';

const SENT_EMAIL_SELECT = '*, diagnostic_submissions(lead_status, source)';

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
  origin?: string | null;
  external_provider?: string | null;
  external_message_id?: string | null;
  delivery_status?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  diagnostic_submissions?:
    | { lead_status?: string | null; source?: string | null }
    | { lead_status?: string | null; source?: string | null }[]
    | null;
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
  leadSource: DiagnosticLeadSource;
  origin: string;
  externalProvider: string | null;
  externalMessageId: string | null;
  deliveryStatus: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

export type SentEmailFilters = {
  query?: string | null;
  archetype?: string | null;
  source?: string | null;
  status?: string | null;
  segment?: string | null;
  state?: string | null;
  sort?: string | null;
  from?: string | null;
  to?: string | null;
};

export type SentEmailFilterOption = {
  value: string;
  label: string;
};

export type SentEmailResult = {
  emails: SentEmail[];
  totalCount: number;
  thisWeekCount: number;
  uniqueLeadCount: number;
  importedCount: number;
  engagedCount: number;
  segmentOptions: SentEmailFilterOption[];
  stateOptions: SentEmailFilterOption[];
  hasFilters: boolean;
};

const knownTemplateIds = new Set<EmailTemplateId>(EMAIL_TEMPLATES.map((template) => template.id));

function isMissingSentEmailsTable(message?: string) {
  const normalized = String(message || '');
  return Boolean(
    normalized.includes('relation "public.sent_emails" does not exist') ||
      normalized.includes("Could not find the table 'public.sent_emails'")
  );
}

function isMissingSentEmailOptionalColumn(message?: string) {
  const normalized = String(message || '').toLowerCase();
  return ['origin', 'external_provider', 'external_message_id', 'delivery_status', 'opened_at', 'clicked_at'].some((column) =>
    normalized.includes(column)
  );
}

function getJoinedLeadStatus(row: SentEmailRow) {
  const joined = row.diagnostic_submissions;
  const leadStatus = Array.isArray(joined) ? joined[0]?.lead_status : joined?.lead_status;
  return isDiagnosticLeadStatus(leadStatus) ? leadStatus : null;
}

function getJoinedLeadSource(row: SentEmailRow) {
  const joined = row.diagnostic_submissions;
  const source = Array.isArray(joined) ? joined[0]?.source : joined?.source;
  if (source) return normalizeLeadSource(source);

  const searchable = `${row.template_id || ''} ${row.archetype || ''} ${row.service_interest || ''}`.toLowerCase();
  if (searchable.includes('masterclass')) return 'masterclass_waitlist';
  if (searchable.includes('linkedin')) return 'linkedin_headline';
  if (searchable.includes('first_90') || searchable.includes('first 90')) return 'first_90_days';

  return normalizeLeadSource(source);
}

function getTemplateName(templateId?: string | null) {
  if (templateId && knownTemplateIds.has(templateId as EmailTemplateId)) {
    const template = getEmailTemplate(templateId as EmailTemplateId);
    return `${template.stageLabel} - ${template.archetypeName}`;
  }

  return templateId ? templateId.replace(/_/g, ' ') : 'Manual';
}

function normalizeSentEmail(row: SentEmailRow): SentEmail {
  const archetype = normalizeDiagnosticArchetypeName(row.archetype);

  return {
    id: row.id,
    leadId: row.lead_id || null,
    toEmail: row.to_email,
    toName: row.to_name,
    subject: row.subject,
    body: row.body,
    templateId: row.template_id || null,
    templateName: getTemplateName(row.template_id),
    archetype: archetype || null,
    serviceInterest: row.service_interest || null,
    sentAt: row.sent_at,
    leadStatus: getJoinedLeadStatus(row),
    leadSource: getJoinedLeadSource(row),
    origin: row.origin || 'dashboard',
    externalProvider: row.external_provider || null,
    externalMessageId: row.external_message_id || null,
    deliveryStatus: row.delivery_status || null,
    openedAt: row.opened_at || null,
    clickedAt: row.clicked_at || null,
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
  const source = filters.source?.trim();
  const status = filters.status?.trim();
  const segment = filters.segment?.trim();
  const state = filters.state?.trim();

  return emails.filter((email) => {
    if (query) {
      const matchesQuery = [email.toName, email.toEmail, email.subject, email.body, email.templateName, email.serviceInterest]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
      if (!matchesQuery) return false;
    }

    if (segment) {
      if (segment.startsWith('source:') && email.leadSource !== segment.slice('source:'.length)) return false;
      if (segment.startsWith('service:') && email.serviceInterest !== segment.slice('service:'.length)) return false;
      if (
        segment.startsWith('archetype:') &&
        email.archetype !== normalizeDiagnosticArchetypeName(segment.slice('archetype:'.length))
      ) {
        return false;
      }
    } else {
      if (archetype && email.archetype !== normalizeDiagnosticArchetypeName(archetype)) return false;
      if (source && source !== 'all' && email.leadSource !== source) return false;
    }

    if (state) {
      if (state.startsWith('lead:') && email.leadStatus !== state.slice('lead:'.length)) return false;
      if (state === 'delivery:engaged' && !email.openedAt && !email.clickedAt) return false;
      if (state === 'delivery:opened' && !email.openedAt) return false;
      if (state === 'delivery:clicked' && !email.clickedAt) return false;
      if (state === 'delivery:issue' && !['bounced', 'blocked', 'deferred'].includes(String(email.deliveryStatus || '').toLowerCase())) return false;
      if (state === 'delivery:sent' && !['sent', 'logged', ''].includes(String(email.deliveryStatus || '').toLowerCase())) return false;
      if (state.startsWith('delivery:') && !['delivery:engaged', 'delivery:opened', 'delivery:clicked', 'delivery:issue', 'delivery:sent'].includes(state)) {
        if (String(email.deliveryStatus || '').toLowerCase() !== state.slice('delivery:'.length)) return false;
      }
    } else if (status && status !== 'all' && email.leadStatus !== status) {
      return false;
    }

    const sentTime = new Date(email.sentAt).getTime();
    if (fromTime && sentTime < fromTime) return false;
    if (toTime && sentTime > toTime) return false;

    return true;
  });
}

function getDeliverySortRank(email: SentEmail) {
  const status = String(email.deliveryStatus || '').toLowerCase();
  if (status === 'bounced' || status === 'blocked') return 1;
  if (status === 'deferred') return 2;
  if (status === 'sent' || status === '' || status === 'logged') return 3;
  if (status === 'delivered') return 4;
  if (email.openedAt || status === 'opened') return 5;
  if (email.clickedAt || status === 'clicked') return 6;
  return 7;
}

function sortSentEmails(emails: SentEmail[], sort?: string | null) {
  const sortKey = sort || 'newest';
  const sorted = [...emails];

  if (sortKey === 'oldest') {
    return sorted.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  if (sortKey === 'engaged') {
    return sorted.sort((a, b) => {
      const aTime = new Date(a.clickedAt || a.openedAt || a.sentAt).getTime();
      const bTime = new Date(b.clickedAt || b.openedAt || b.sentAt).getTime();
      return bTime - aTime;
    });
  }

  if (sortKey === 'delivery_attention') {
    return sorted.sort(
      (a, b) =>
        getDeliverySortRank(a) - getDeliverySortRank(b) ||
        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }

  if (sortKey === 'name_asc') {
    return sorted.sort((a, b) => (a.toName || a.toEmail).localeCompare(b.toName || b.toEmail));
  }

  return sorted.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

export function hasSentEmailFilters(filters: SentEmailFilters) {
  return Boolean(
    filters.query?.trim() ||
      filters.archetype?.trim() ||
      (filters.source?.trim() && filters.source !== 'all') ||
      (filters.status?.trim() && filters.status !== 'all') ||
      filters.segment?.trim() ||
      filters.state?.trim() ||
      (filters.sort?.trim() && filters.sort !== 'newest') ||
      filters.from ||
      filters.to
  );
}

export type SentEmailInsert = {
  leadId?: string | null;
  toEmail: string;
  toName?: string | null;
  subject: string;
  body: string;
  templateId?: string | null;
  archetype?: string | null;
  serviceInterest?: string | null;
  sentAt?: string | Date | null;
  origin?: string | null;
  externalProvider?: string | null;
  externalMessageId?: string | null;
  deliveryStatus?: string | null;
  openedAt?: string | Date | null;
  clickedAt?: string | Date | null;
};

function cleanText(value?: string | null, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function cleanOptionalDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getSentEmailPayload(input: SentEmailInsert, includeOptionalColumns = true) {
  const sentAt = cleanOptionalDate(input.sentAt) || new Date().toISOString();
  const archetype = normalizeDiagnosticArchetypeName(input.archetype);
  const basePayload = {
    lead_id: input.leadId || null,
    to_email: input.toEmail.trim().toLowerCase(),
    to_name: cleanText(input.toName, input.toEmail),
    subject: input.subject.trim(),
    body: cleanText(input.body, 'No email body was available for this imported message.'),
    template_id: input.templateId || null,
    archetype: archetype || null,
    service_interest: input.serviceInterest || null,
    sent_at: sentAt,
  };

  if (!includeOptionalColumns) return basePayload;

  return {
    ...basePayload,
    origin: cleanText(input.origin, 'dashboard'),
    external_provider: input.externalProvider || null,
    external_message_id: input.externalMessageId || null,
    delivery_status: input.deliveryStatus || null,
    opened_at: cleanOptionalDate(input.openedAt),
    clicked_at: cleanOptionalDate(input.clickedAt),
  };
}

async function getSentEmailByExternalId(externalProvider: string, externalMessageId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('sent_emails')
    .select(SENT_EMAIL_SELECT)
    .eq('external_provider', externalProvider)
    .eq('external_message_id', externalMessageId)
    .maybeSingle();

  if (result.error) return null;
  return result.data ? normalizeSentEmail(result.data as SentEmailRow) : null;
}

export async function recordSentEmail(input: SentEmailInsert) {
  const supabase = createSupabaseServiceClient();
  const payload = getSentEmailPayload(input);
  const result = await supabase
    .from('sent_emails')
    .insert(payload)
    .select(SENT_EMAIL_SELECT)
    .single();

  if (!result.error) return normalizeSentEmail(result.data as SentEmailRow);

  if (result.error.code === '23505' && input.externalProvider && input.externalMessageId) {
    return getSentEmailByExternalId(input.externalProvider, input.externalMessageId);
  }

  if (isMissingSentEmailsTable(result.error.message)) return null;

  if (isMissingSentEmailOptionalColumn(result.error.message)) {
    const retry = await supabase
      .from('sent_emails')
      .insert(getSentEmailPayload(input, false))
      .select(SENT_EMAIL_SELECT)
      .single();

    if (!retry.error) return normalizeSentEmail(retry.data as SentEmailRow);
    if (retry.error.code === '23505' && input.externalProvider && input.externalMessageId) {
      return getSentEmailByExternalId(input.externalProvider, input.externalMessageId);
    }
    if (isMissingSentEmailsTable(retry.error.message)) return null;
    throw new Error(retry.error.message);
  }

  throw new Error(result.error.message);
}

export async function hasSentEmailTemplateAlreadySent({
  leadId,
  toEmail,
  templateId,
}: {
  leadId?: string | null;
  toEmail: string;
  templateId?: string | null;
}) {
  const cleanTemplateId = cleanText(templateId);
  const cleanToEmail = cleanText(toEmail).toLowerCase();
  if (!cleanTemplateId || !cleanToEmail) return false;

  const supabase = createSupabaseServiceClient();

  if (leadId) {
    const byLead = await supabase
      .from('sent_emails')
      .select('id')
      .eq('lead_id', leadId)
      .eq('template_id', cleanTemplateId)
      .limit(1)
      .maybeSingle();

    if (byLead.error) {
      if (isMissingSentEmailsTable(byLead.error.message)) return false;
      throw new Error(byLead.error.message);
    }

    if (byLead.data?.id) return true;
  }

  const byEmail = await supabase
    .from('sent_emails')
    .select('id')
    .eq('to_email', cleanToEmail)
    .eq('template_id', cleanTemplateId)
    .limit(1)
    .maybeSingle();

  if (byEmail.error) {
    if (isMissingSentEmailsTable(byEmail.error.message)) return false;
    throw new Error(byEmail.error.message);
  }

  return Boolean(byEmail.data?.id);
}

export async function updateSentEmailDeliveryById(
  id: string,
  values: {
    externalProvider?: string | null;
    externalMessageId?: string | null;
    deliveryStatus?: string | null;
    openedAt?: string | Date | null;
    clickedAt?: string | Date | null;
  }
) {
  const payload: Record<string, string | null> = {};
  if (values.externalProvider !== undefined) payload.external_provider = values.externalProvider || null;
  if (values.externalMessageId !== undefined) payload.external_message_id = values.externalMessageId || null;
  if (values.deliveryStatus !== undefined) payload.delivery_status = values.deliveryStatus || null;
  if (values.openedAt !== undefined) payload.opened_at = cleanOptionalDate(values.openedAt);
  if (values.clickedAt !== undefined) payload.clicked_at = cleanOptionalDate(values.clickedAt);

  if (Object.keys(payload).length === 0) return null;

  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('sent_emails')
    .update(payload)
    .eq('id', id)
    .select(SENT_EMAIL_SELECT)
    .single();

  if (result.error) {
    if (isMissingSentEmailsTable(result.error.message) || isMissingSentEmailOptionalColumn(result.error.message)) return null;
    throw new Error(result.error.message);
  }

  return normalizeSentEmail(result.data as SentEmailRow);
}

export async function updateSentEmailDeliveryByExternalId(
  externalProvider: string,
  externalMessageId: string,
  values: {
    deliveryStatus?: string | null;
    openedAt?: string | Date | null;
    clickedAt?: string | Date | null;
  }
) {
  const existing = await getSentEmailByExternalId(externalProvider, externalMessageId);
  if (!existing) return null;
  return updateSentEmailDeliveryById(existing.id, values);
}

function addOption(options: Map<string, SentEmailFilterOption>, value: string, label: string) {
  if (!value || options.has(value)) return;
  options.set(value, { value, label });
}

function buildSegmentOptions(emails: SentEmail[]) {
  const options = new Map<string, SentEmailFilterOption>();

  for (const email of emails) {
    addOption(options, `source:${email.leadSource}`, `Source: ${leadSourceLabels[email.leadSource]}`);
    if (email.serviceInterest) addOption(options, `service:${email.serviceInterest}`, `Service: ${email.serviceInterest}`);
    if (email.archetype) addOption(options, `archetype:${email.archetype}`, `Archetype: ${email.archetype}`);
  }

  return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function buildStateOptions(emails: SentEmail[]) {
  const options = new Map<string, SentEmailFilterOption>();
  addOption(options, 'delivery:engaged', 'Email: Opened or clicked');
  addOption(options, 'delivery:opened', 'Email: Opened');
  addOption(options, 'delivery:clicked', 'Email: Clicked');
  addOption(options, 'delivery:sent', 'Email: Sent or logged');
  addOption(options, 'delivery:issue', 'Email: Needs delivery attention');

  for (const email of emails) {
    if (email.leadStatus) {
      const label = email.leadStatus
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      addOption(options, `lead:${email.leadStatus}`, `Lead: ${label}`);
    }

    const deliveryStatus = String(email.deliveryStatus || '').toLowerCase();
    if (deliveryStatus && !['sent', 'opened', 'clicked', 'bounced', 'blocked', 'deferred', 'delivered'].includes(deliveryStatus)) {
      addOption(options, `delivery:${deliveryStatus}`, `Email: ${deliveryStatus}`);
    }
  }

  return Array.from(options.values());
}

export async function listSentEmails(filters: SentEmailFilters = {}): Promise<SentEmailResult> {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('sent_emails')
    .select(SENT_EMAIL_SELECT)
    .order('sent_at', { ascending: false })
    .limit(1000);

  if (result.error) {
    if (isMissingSentEmailsTable(result.error.message)) {
      return {
        emails: [],
        totalCount: 0,
        thisWeekCount: 0,
        uniqueLeadCount: 0,
        importedCount: 0,
        engagedCount: 0,
        segmentOptions: [],
        stateOptions: [],
        hasFilters: hasSentEmailFilters(filters),
      };
    }

    throw new Error(result.error.message);
  }

  const allEmails = ((result.data || []) as SentEmailRow[]).map(normalizeSentEmail);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = allEmails.filter((email) => new Date(email.sentAt).getTime() >= weekAgo).length;
  const uniqueLeadCount = new Set(allEmails.map((email) => email.leadId || email.toEmail.toLowerCase()).filter(Boolean)).size;
  const importedCount = allEmails.filter((email) => email.origin === 'brevo_import').length;
  const engagedCount = allEmails.filter((email) => email.openedAt || email.clickedAt).length;
  const filteredEmails = filterSentEmails(allEmails, filters);

  return {
    emails: sortSentEmails(filteredEmails, filters.sort),
    totalCount: allEmails.length,
    thisWeekCount,
    uniqueLeadCount,
    importedCount,
    engagedCount,
    segmentOptions: buildSegmentOptions(allEmails),
    stateOptions: buildStateOptions(allEmails),
    hasFilters: hasSentEmailFilters(filters),
  };
}
