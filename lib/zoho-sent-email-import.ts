import { normalizeDiagnosticArchetypeName } from '@/lib/diagnostic-archetype-names';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  getMissingZohoMailEnv,
  listZohoSentMessages,
  type ZohoMailboxMessage,
} from '@/lib/zoho-mail';
import { recordSentEmail, type SentEmail } from '@/lib/sent-emails';

type LeadRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  archetype_name: string | null;
  archetype_payload: Record<string, unknown> | null;
};

type InboundDraftRow = {
  id: string;
  from_email: string;
  subject: string | null;
  reply_subject: string | null;
  received_at: string;
  lead_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type ZohoSentEmailImportResult = {
  scanned: number;
  matched: number;
  imported: number;
  duplicates: number;
  skipped: number;
  ignored: number;
  linkedDrafts: number;
  missingConfig: string[];
  errors: string[];
};

function cleanText(value?: string | null, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeEmail(value?: string | null) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function getServiceInterest(payload?: Record<string, unknown> | null) {
  return typeof payload?.service === 'string' ? cleanText(payload.service) : '';
}

function normalizeThreadSubject(subject?: string | null) {
  return cleanText(subject)
    .replace(/^((re|fw|fwd):\s*)+/i, '')
    .toLowerCase();
}

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function shouldIgnoreSentMessage(message: ZohoMailboxMessage, mailbox: string) {
  const toEmail = normalizeEmail(message.toEmail);
  const subject = message.subject.toLowerCase();

  if (!toEmail || toEmail === mailbox) return true;
  if (subject.includes('undeliverable') || subject.includes('delivery status notification') || subject.includes('mail delivery failed')) return true;

  return false;
}

async function findLeadByEmail(email: string) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('id, first_name, email, archetype_name, archetype_payload')
    .ilike('email', cleanEmail)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data || null) as LeadRow | null;
}

async function getExistingZohoSentEmail(providerMessageId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('external_provider', 'zoho')
    .eq('external_message_id', providerMessageId)
    .maybeSingle();

  if (error) return null;
  return data?.id || null;
}

async function findMatchingInboundDraft(message: ZohoMailboxMessage) {
  const toEmail = normalizeEmail(message.toEmail);
  if (!toEmail) return null;

  const sentAt = new Date(message.receivedAt);
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from('inbound_email_replies')
    .select('id, from_email, subject, reply_subject, received_at, lead_id, metadata')
    .eq('from_email', toEmail)
    .in('draft_status', ['drafted', 'approved'])
    .order('received_at', { ascending: false })
    .limit(10);

  if (!Number.isNaN(sentAt.getTime())) {
    query = query.lte('received_at', sentAt.toISOString());
  }

  const { data, error } = await query;
  if (error) return null;

  const sentThread = normalizeThreadSubject(message.subject);
  const rows = ((data || []) as InboundDraftRow[]);
  return rows.find((row) =>
    normalizeThreadSubject(row.subject) === sentThread ||
    normalizeThreadSubject(row.reply_subject) === sentThread
  ) || null;
}

async function markInboundDraftSent(row: InboundDraftRow, sentEmail: SentEmail | null, message: ZohoMailboxMessage) {
  const metadata = {
    ...(row.metadata || {}),
    reply_sent_email_id: sentEmail?.id || null,
    reply_sent_at: message.receivedAt,
    reply_sent_provider: 'zoho',
    reply_sent_provider_message_id: message.providerMessageId,
  };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('inbound_email_replies')
    .update({
      status: 'reviewed',
      draft_status: 'sent',
      metadata,
    })
    .eq('id', row.id);

  if (error) throw new Error(error.message);
}

async function importSentMessage(message: ZohoMailboxMessage) {
  const existingSentEmailId = await getExistingZohoSentEmail(message.providerMessageId);
  const [lead, inboundDraft] = await Promise.all([
    findLeadByEmail(message.toEmail),
    findMatchingInboundDraft(message),
  ]);
  const leadId = lead?.id || inboundDraft?.lead_id || null;

  if (!leadId && !inboundDraft) return 'ignored' as const;

  const sentEmail = await recordSentEmail({
    leadId,
    toEmail: message.toEmail,
    toName: cleanText(lead?.first_name, message.toEmail),
    subject: cleanText(message.subject, '(No subject)'),
    body: message.body,
    templateId: null,
    archetype: normalizeDiagnosticArchetypeName(lead?.archetype_name),
    serviceInterest: getServiceInterest(lead?.archetype_payload),
    sentAt: message.receivedAt,
    origin: 'zoho_sent_import',
    externalProvider: 'zoho',
    externalMessageId: message.providerMessageId,
    deliveryStatus: 'sent',
  });

  let linkedDraft = false;
  if (inboundDraft) {
    await markInboundDraftSent(inboundDraft, sentEmail, message);
    linkedDraft = true;
  }

  return existingSentEmailId
    ? ({ status: 'duplicate', linkedDraft } as const)
    : ({ status: 'imported', linkedDraft } as const);
}

export async function importZohoSentEmails({
  limit = 50,
  days = 14,
}: {
  limit?: number;
  days?: number;
} = {}): Promise<ZohoSentEmailImportResult> {
  const missingConfig = getMissingZohoMailEnv();
  const result: ZohoSentEmailImportResult = {
    scanned: 0,
    matched: 0,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    ignored: 0,
    linkedDrafts: 0,
    missingConfig,
    errors: [],
  };

  if (missingConfig.length > 0) return result;

  let page: Awaited<ReturnType<typeof listZohoSentMessages>>;
  try {
    page = await listZohoSentMessages({ limit });
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Could not read the Zoho sent folder.');
    return result;
  }

  const mailbox = page.mailbox.toLowerCase();
  const safeDays = Math.max(1, Math.min(Math.floor(days), 90));
  const messages = [...page.messages].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

  for (const message of messages) {
    result.scanned += 1;

    if (shouldIgnoreSentMessage(message, mailbox) || !isWithinDays(message.receivedAt, safeDays)) {
      result.ignored += 1;
      continue;
    }

    try {
      const status = await importSentMessage(message);
      if (status === 'ignored') {
        result.ignored += 1;
        continue;
      }

      result.matched += 1;
      if (status.status === 'imported') result.imported += 1;
      if (status.status === 'duplicate') result.duplicates += 1;
      if (status.linkedDraft) result.linkedDrafts += 1;
    } catch (error) {
      result.skipped += 1;
      result.errors.push(error instanceof Error ? error.message : 'Could not import a sent Zoho email.');
    }
  }

  return result;
}
