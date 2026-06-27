import {
  getBrevoTransactionalEmailContent,
  listBrevoTransactionalEmails,
  type BrevoTransactionalEmail,
  type BrevoTransactionalEmailContent,
} from '@/lib/brevo';
import { normalizeDiagnosticArchetypeName } from '@/lib/diagnostic-archetype-names';
import { EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/email-templates';
import { normalizeLeadSource, type DiagnosticLeadSource } from '@/lib/lead-sources';
import { listStoredEmailTemplates } from '@/lib/settings';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { recordSentEmail, updateSentEmailDeliveryByExternalId, updateSentEmailDeliveryById } from '@/lib/sent-emails';

type ImportCandidate = {
  leadId: string | null;
  email: string;
  name: string;
  archetype: string;
  serviceInterest: string;
  source: DiagnosticLeadSource;
};

type DiagnosticSubmissionCandidateRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  archetype_name: string | null;
  archetype_payload: Record<string, unknown> | null;
  source: string | null;
};

type DashboardNotificationCandidateRow = {
  event_type: string | null;
  source: string | null;
  contact_name: string | null;
  contact_email: string | null;
  metadata: Record<string, unknown> | null;
};

type TemplateMatch = {
  templateId: string | null;
  archetype: string | null;
  serviceInterest: string | null;
};

export type BrevoSentEmailImportResult = {
  candidates: number;
  scanned: number;
  matched: number;
  imported: number;
  skipped: number;
  ignored: number;
  windows: number;
  errors: string[];
};

const ignoredInboundSubjectPrefixes = [
  'New lead magnet download - ',
  'New Saturday Masterclass reserve request - ',
  'New payment - ',
  'New intake - ',
];

const automatedSubjectMatches: Record<string, TemplateMatch> = {
  'Your First 90 Days Checklist PDF': {
    templateId: 'automated_first_90_days_delivery',
    archetype: 'First 90 Days Checklist',
    serviceInterest: 'Career Clarity Session',
  },
  'Your SA LinkedIn Headline Builder PDF': {
    templateId: 'automated_linkedin_headline_delivery',
    archetype: 'SA LinkedIn Headline Builder',
    serviceInterest: 'CV + LinkedIn Bundle',
  },
  'Your South African CV Checklist PDF': {
    templateId: 'automated_cv_checklist_delivery',
    archetype: 'SA CV Checklist',
    serviceInterest: 'CV Revamp',
  },
  'You are on the Saturday Masterclass reserve list': {
    templateId: 'masterclass_waitlist_confirmation',
    archetype: 'Masterclass Waitlist',
    serviceInterest: 'Saturday Masterclass',
  },
};

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBrevoWindows(days: number) {
  const safeDays = Math.max(1, Math.min(days, 365));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const firstDay = addDays(today, -(safeDays - 1));
  const windows: { startDate: string; endDate: string }[] = [];
  let cursor = firstDay;

  while (cursor.getTime() <= today.getTime()) {
    const windowEnd = new Date(Math.min(addDays(cursor, 13).getTime(), today.getTime()));
    windows.push({
      startDate: toDateOnly(cursor),
      endDate: toDateOnly(windowEnd),
    });
    cursor = addDays(windowEnd, 1);
  }

  return windows;
}

function cleanText(value?: string | null) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmail(value?: string | null) {
  const email = cleanText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function getFirstName(value?: string | null, email?: string | null) {
  return cleanText(value).split(/\s+/)[0] || normalizeEmail(email).split('@')[0] || 'Lead';
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function bodyToText(body?: string | null) {
  return decodeHtmlEntities(String(body || ''))
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|td|th|li|h[1-6]|table|ol|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesTemplateSubject(subject: string, templateSubject: string) {
  const normalizedSubject = cleanText(subject);
  const normalizedTemplate = cleanText(templateSubject);
  if (!normalizedSubject || !normalizedTemplate) return false;
  if (normalizedSubject.toLowerCase() === normalizedTemplate.toLowerCase()) return true;

  const pattern = normalizedTemplate.split('{{firstName}}').map(escapeRegExp).join('[^\\n,]+');
  return new RegExp(`^${pattern}$`, 'i').test(normalizedSubject);
}

function getServiceInterest(payload?: Record<string, unknown> | null) {
  const service = payload && typeof payload.service === 'string' ? payload.service : '';
  return cleanText(service);
}

function inferNotificationSource(row: DashboardNotificationCandidateRow) {
  const source = cleanText(row.source).toLowerCase();
  const metadataSource = cleanText(typeof row.metadata?.source === 'string' ? row.metadata.source : '').toLowerCase();
  const combined = `${source} ${metadataSource}`;

  if (row.event_type === 'masterclass_reservation' || combined.includes('masterclass')) return 'masterclass_waitlist';
  if (combined.includes('linkedin')) return 'linkedin_headline';
  if (combined.includes('cv checklist') || combined.includes('cv-checklist')) return 'cv_checklist';
  if (row.event_type === 'lead_magnet_download') return 'first_90_days';
  return 'diagnostic';
}

function getNotificationService(source: DiagnosticLeadSource) {
  if (source === 'masterclass_waitlist') return 'Saturday Masterclass';
  if (source === 'linkedin_headline') return 'CV + LinkedIn Bundle';
  if (source === 'cv_checklist') return 'CV Revamp';
  if (source === 'first_90_days') return 'Career Clarity Session';
  return '';
}

function getNotificationArchetype(source: DiagnosticLeadSource) {
  if (source === 'masterclass_waitlist') return 'Masterclass Waitlist';
  if (source === 'linkedin_headline') return 'SA LinkedIn Headline Builder';
  if (source === 'cv_checklist') return 'SA CV Checklist';
  if (source === 'first_90_days') return 'First 90 Days Checklist';
  return 'Dashboard contact';
}

function addCandidate(candidates: Map<string, ImportCandidate>, candidate: ImportCandidate) {
  const email = normalizeEmail(candidate.email);
  if (!email) return;

  const existing = candidates.get(email);
  if (existing?.leadId && !candidate.leadId) return;

  candidates.set(email, {
    ...candidate,
    email,
    name: cleanText(candidate.name) || getFirstName(candidate.name, email),
    archetype: normalizeDiagnosticArchetypeName(candidate.archetype),
  });
}

async function listCandidates() {
  const supabase = createSupabaseServiceClient();
  const candidates = new Map<string, ImportCandidate>();

  const leadResult = await supabase
    .from('diagnostic_submissions')
    .select('id, first_name, email, archetype_name, archetype_payload, source')
    .not('email', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(2500);

  if (leadResult.error) throw new Error(leadResult.error.message);

  for (const row of (leadResult.data || []) as DiagnosticSubmissionCandidateRow[]) {
    const source = normalizeLeadSource(row.source);
    addCandidate(candidates, {
      leadId: row.id,
      email: row.email || '',
      name: cleanText(row.first_name) || getFirstName(row.first_name, row.email),
      archetype: cleanText(row.archetype_name),
      serviceInterest: getServiceInterest(row.archetype_payload),
      source,
    });
  }

  const notificationResult = await supabase
    .from('dashboard_notifications')
    .select('event_type, source, contact_name, contact_email, metadata')
    .not('contact_email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2500);

  if (!notificationResult.error) {
    for (const row of (notificationResult.data || []) as DashboardNotificationCandidateRow[]) {
      const source = normalizeLeadSource(inferNotificationSource(row));
      addCandidate(candidates, {
        leadId: null,
        email: row.contact_email || '',
        name: cleanText(row.contact_name) || getFirstName(row.contact_name, row.contact_email),
        archetype: getNotificationArchetype(source),
        serviceInterest: getNotificationService(source),
        source,
      });
    }
  }

  return candidates;
}

async function listTemplates() {
  try {
    const supabase = createSupabaseServiceClient();
    const stored = await listStoredEmailTemplates(supabase);
    return stored.length ? stored : EMAIL_TEMPLATES;
  } catch {
    return EMAIL_TEMPLATES;
  }
}

function findTemplateMatch(subject: string, templates: EmailTemplate[], candidate: ImportCandidate): TemplateMatch | null {
  const automated = automatedSubjectMatches[cleanText(subject)];
  if (automated) return automated;

  const template = templates.find((item) => matchesTemplateSubject(subject, item.subject));
  if (!template) return null;

  return {
    templateId: template.id,
    archetype: template.archetypeName || candidate.archetype,
    serviceInterest: template.recommendedService || candidate.serviceInterest,
  };
}

function isIgnoredInboundSubject(subject: string) {
  return ignoredInboundSubjectPrefixes.some((prefix) => subject.startsWith(prefix));
}

function looksLikeCoachOutbound(subject: string, text: string) {
  const searchable = `${subject}\n${text}`.toLowerCase();
  return (
    searchable.includes('coach kagiso') ||
    searchable.includes('kagiso shabangu') ||
    searchable.includes('hello@coachkagiso') ||
    searchable.includes('coachkagiso.co.za')
  );
}

function getIsoDate(email: BrevoTransactionalEmail, content: BrevoTransactionalEmailContent) {
  const raw = content.date || email.date;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getEventTime(content: BrevoTransactionalEmailContent, pattern: RegExp) {
  const match = (content.events || [])
    .filter((event) => pattern.test(String(event.name || '').toLowerCase()))
    .map((event) => (event.time ? new Date(event.time).getTime() : 0))
    .filter((value) => value > 0)
    .sort((a, b) => b - a)[0];

  return match ? new Date(match).toISOString() : null;
}

function getDeliveryStatus(content: BrevoTransactionalEmailContent) {
  const names = (content.events || []).map((event) => String(event.name || '').toLowerCase());
  if (names.some((name) => name.includes('click'))) return 'clicked';
  if (names.some((name) => name.includes('open'))) return 'opened';
  if (names.some((name) => name.includes('delivered'))) return 'delivered';
  if (names.some((name) => name.includes('bounce'))) return 'bounced';
  if (names.some((name) => name.includes('blocked'))) return 'blocked';
  if (names.some((name) => name.includes('deferred'))) return 'deferred';
  if (names.some((name) => name.includes('sent') || name.includes('request'))) return 'sent';
  return null;
}

function isMissingOptionalExternalColumn(message?: string) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('external_provider') || normalized.includes('external_message_id');
}

async function hasExistingExternalEmail(externalMessageId: string, delivery: DeliveryUpdate) {
  if (!externalMessageId) return false;
  const updated = await updateSentEmailDeliveryByExternalId('brevo', externalMessageId, delivery);
  if (updated) return true;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('external_provider', 'brevo')
    .eq('external_message_id', externalMessageId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingOptionalExternalColumn(error.message)) return false;
    return false;
  }

  return Boolean(data?.id);
}

async function findExistingSentEmailFingerprint(input: { toEmail: string; subject: string; sentAt: string }) {
  const timestamp = new Date(input.sentAt).getTime();
  if (Number.isNaN(timestamp)) return null;

  const windowStart = new Date(timestamp - 15 * 60 * 1000).toISOString();
  const windowEnd = new Date(timestamp + 15 * 60 * 1000).toISOString();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('to_email', input.toEmail)
    .eq('subject', input.subject)
    .gte('sent_at', windowStart)
    .lte('sent_at', windowEnd)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id || null;
}

type DeliveryUpdate = {
  deliveryStatus: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

async function importBrevoEmail({
  email,
  candidate,
  templates,
}: {
  email: BrevoTransactionalEmail;
  candidate: ImportCandidate;
  templates: EmailTemplate[];
}) {
  const contentId = cleanText(email.uuid);
  const externalMessageId = cleanText(email.uuid || email.messageId);
  if (!contentId) return 'skipped' as const;
  if (!externalMessageId) return 'skipped' as const;

  const content = await getBrevoTransactionalEmailContent(contentId);
  if (!content) return 'skipped' as const;

  const deliveryUpdate = {
    deliveryStatus: getDeliveryStatus(content),
    openedAt: getEventTime(content, /open/),
    clickedAt: getEventTime(content, /click/),
  };

  if (await hasExistingExternalEmail(externalMessageId, deliveryUpdate)) return 'duplicate' as const;

  const subject = cleanText(content.subject || email.subject);
  if (!subject || isIgnoredInboundSubject(subject)) return 'ignored' as const;

  const text = bodyToText(content.body);
  const templateMatch = findTemplateMatch(subject, templates, candidate);
  if (!templateMatch && !looksLikeCoachOutbound(subject, text)) return 'ignored' as const;

  const sentAt = getIsoDate(email, content);
  const existingFingerprintId = await findExistingSentEmailFingerprint({ toEmail: candidate.email, subject, sentAt });
  if (existingFingerprintId) {
    await updateSentEmailDeliveryById(existingFingerprintId, {
      externalProvider: 'brevo',
      externalMessageId,
      ...deliveryUpdate,
    });
    return 'duplicate' as const;
  }

  const sentEmail = await recordSentEmail({
    leadId: candidate.leadId,
    toEmail: candidate.email,
    toName: candidate.name || candidate.email,
    subject,
    body: text || 'Imported from Brevo. The message body was not available in the transactional email log.',
    templateId: templateMatch?.templateId || null,
    archetype: templateMatch?.archetype || candidate.archetype,
    serviceInterest: templateMatch?.serviceInterest || candidate.serviceInterest,
    sentAt,
    origin: 'brevo_import',
    externalProvider: 'brevo',
    externalMessageId,
    ...deliveryUpdate,
  });

  return sentEmail ? ('imported' as const) : ('skipped' as const);
}

export async function importBrevoSentEmails({
  days = 60,
}: {
  days?: number;
} = {}): Promise<BrevoSentEmailImportResult> {
  const candidates = await listCandidates();
  const templates = await listTemplates();
  const windows = getBrevoWindows(days);
  const result: BrevoSentEmailImportResult = {
    candidates: candidates.size,
    scanned: 0,
    matched: 0,
    imported: 0,
    skipped: 0,
    ignored: 0,
    windows: windows.length,
    errors: [],
  };

  for (const window of windows) {
    for (const candidate of candidates.values()) {
      let offset = 0;
      const limit = 500;
      let total = Number.POSITIVE_INFINITY;

      while (offset < total) {
        const page = await listBrevoTransactionalEmails({
          email: candidate.email,
          startDate: window.startDate,
          endDate: window.endDate,
          limit,
          offset,
        });

        if (!page) {
          result.errors.push(`Could not fetch Brevo emails for ${candidate.email} from ${window.startDate} to ${window.endDate}.`);
          break;
        }

        const emails = page.transactionalEmails || [];
        total = typeof page.count === 'number' ? page.count : offset + emails.length;
        result.scanned += emails.length;
        result.matched += emails.length;

        for (const email of emails) {
          try {
            const importStatus = await importBrevoEmail({ email, candidate, templates });
            if (importStatus === 'imported') result.imported += 1;
            else if (importStatus === 'ignored') result.ignored += 1;
            else result.skipped += 1;
          } catch (error) {
            result.skipped += 1;
            result.errors.push(error instanceof Error ? error.message : 'Could not import a Brevo email.');
          }
        }

        if (emails.length === 0) break;
        offset += emails.length;
        await wait(150);
      }

      await wait(250);
    }
  }

  return result;
}
