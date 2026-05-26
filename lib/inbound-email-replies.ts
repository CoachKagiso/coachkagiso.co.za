import { createManualTask, createNote } from '@/lib/dashboard-task-records';
import {
  isDiagnosticLeadStatus,
  updateDiagnosticSubmissionCrm,
  type DiagnosticLeadStatus,
} from '@/lib/diagnostic-submissions';
import { getContactEmail } from '@/lib/env';
import { isDiagnosticLeadSource, leadSourceLabels, normalizeLeadSource, type DiagnosticLeadSource } from '@/lib/lead-sources';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { callToolAi, extractToolJsonObject } from '@/lib/content/tools-ai';
import {
  getMissingZohoMailEnv,
  listZohoInboxMessages,
  type ZohoMailboxMessage,
} from '@/lib/zoho-mail';

export type InboundEmailReplyStatus = 'new' | 'reviewed' | 'archived';
export type InboundEmailDraftStatus = 'drafted' | 'approved' | 'sent' | 'dismissed';

export type InboundEmailReply = {
  id: string;
  provider: string;
  providerMessageId: string;
  providerThreadId: string | null;
  mailbox: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  leadId: string | null;
  sentEmailId: string | null;
  taskId: string | null;
  noteId: string | null;
  replySubject: string;
  replyDraft: string;
  replyShortDraft: string;
  status: InboundEmailReplyStatus;
  draftStatus: InboundEmailDraftStatus;
  createdAt: string;
  updatedAt: string;
  lead: InboundReplyLead | null;
};

type InboundReplyLead = {
  id: string;
  firstName: string;
  email: string;
  archetype: string;
  serviceInterest: string;
  source: DiagnosticLeadSource;
  leadStatus: DiagnosticLeadStatus;
  followUpCount: number;
  lastContactedAt: string | null;
  downloadLink: string | null;
};

type LeadRow = {
  id: string;
  first_name: string | null;
  email: string | null;
  archetype_name: string | null;
  archetype_payload: Record<string, unknown> | null;
  source: string | null;
  lead_status: string | null;
  follow_up_count: number | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  download_link: string | null;
};

type SentEmailMatch = {
  id: string;
  lead_id: string | null;
  to_email: string | null;
  to_name: string | null;
  subject: string | null;
  body: string | null;
  template_id: string | null;
  archetype: string | null;
  service_interest: string | null;
  sent_at: string | null;
};

type InboundEmailReplyListFilters = {
  limit?: number;
  status?: string | null;
  source?: DiagnosticLeadSource | 'all' | null;
  repairLeadLinks?: boolean;
};

type InboundReplyRow = {
  id: string;
  provider: string;
  provider_message_id: string;
  provider_thread_id: string | null;
  mailbox: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body: string;
  received_at: string;
  lead_id: string | null;
  sent_email_id: string | null;
  task_id: string | null;
  note_id: string | null;
  reply_subject: string | null;
  reply_draft: string | null;
  reply_short_draft: string | null;
  draft_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  diagnostic_submissions?: LeadRow | LeadRow[] | null;
};

type DraftReplyResult = {
  reply: string;
  shortReply: string;
  priority?: number;
  intent?: string;
};

export type InboundReplyImportResult = {
  scanned: number;
  matched: number;
  imported: number;
  skipped: number;
  ignored: number;
  drafted: number;
  tasksCreated: number;
  notesCreated: number;
  missingConfig: string[];
  errors: string[];
};

const AI_API_KEY_ENV = 'ZAI_API_KEY';
const localTimeZone = 'Africa/Johannesburg';
const INBOUND_REPLY_LEAD_SELECT = 'id, first_name, email, archetype_name, archetype_payload, source, lead_status, follow_up_count, last_contacted_at, next_follow_up_at, download_link';

function isMissingInboundTable(message?: string) {
  const normalized = String(message || '');
  return (
    normalized.includes('relation "public.inbound_email_replies" does not exist') ||
    normalized.includes("Could not find the table 'public.inbound_email_replies'")
  );
}

function cleanText(value?: string | null, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function normalizeEmail(value?: string | null) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function getFirstName(name?: string | null, email?: string | null) {
  return cleanText(name).split(/\s+/)[0] || normalizeEmail(email).split('@')[0] || 'there';
}

function getServiceInterest(payload?: Record<string, unknown> | null) {
  return typeof payload?.service === 'string' ? cleanText(payload.service) : '';
}

function normalizeStatus(value?: string | null): InboundEmailReplyStatus {
  return value === 'reviewed' || value === 'archived' ? value : 'new';
}

function normalizeDraftStatus(value?: string | null): InboundEmailDraftStatus {
  return value === 'approved' || value === 'sent' || value === 'dismissed' ? value : 'drafted';
}

function normalizeLead(row?: LeadRow | null): InboundReplyLead | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    firstName: cleanText(row.first_name, row.email || 'Lead'),
    email: normalizeEmail(row.email) || row.email || '',
    archetype: cleanText(row.archetype_name, 'Lead'),
    serviceInterest: getServiceInterest(row.archetype_payload),
    source: normalizeLeadSource(row.source),
    leadStatus: isDiagnosticLeadStatus(row.lead_status) ? row.lead_status : 'contacted',
    followUpCount: Number.isFinite(Number(row.follow_up_count)) ? Number(row.follow_up_count) : 0,
    lastContactedAt: row.last_contacted_at || null,
    downloadLink: row.download_link || null,
  };
}

function getJoinedLead(row: InboundReplyRow) {
  const joined = row.diagnostic_submissions;
  return normalizeLead(Array.isArray(joined) ? joined[0] : joined);
}

function normalizeInboundReply(row: InboundReplyRow): InboundEmailReply {
  return {
    id: row.id,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    providerThreadId: row.provider_thread_id || null,
    mailbox: row.mailbox,
    fromEmail: row.from_email,
    fromName: row.from_name || row.from_email,
    toEmail: row.to_email || row.mailbox,
    subject: row.subject || '(No subject)',
    body: row.body,
    receivedAt: row.received_at,
    leadId: row.lead_id || null,
    sentEmailId: row.sent_email_id || null,
    taskId: row.task_id || null,
    noteId: row.note_id || null,
    replySubject: row.reply_subject || getReplySubject(row.subject || ''),
    replyDraft: row.reply_draft || '',
    replyShortDraft: row.reply_short_draft || '',
    status: normalizeStatus(row.status),
    draftStatus: normalizeDraftStatus(row.draft_status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lead: getJoinedLead(row),
  };
}

function getDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: localTimeZone,
    year: 'numeric',
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: localTimeZone,
  }).format(new Date(value));
}

function truncate(value: string, max = 4000) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}\n\n[Message truncated for drafting.]`;
}

function getReplySubject(subject: string) {
  const cleaned = cleanText(subject, 'Your message');
  return /^re:/i.test(cleaned) ? cleaned : `Re: ${cleaned}`;
}

function shouldIgnoreMessage(message: ZohoMailboxMessage, mailbox: string) {
  const from = message.fromEmail.toLowerCase();
  const subject = message.subject.toLowerCase();
  const mailboxDomain = mailbox.split('@')[1] || '';

  if (!from || from === mailbox) return true;
  if (mailboxDomain && from === `no-reply@${mailboxDomain}`) return true;
  if (from.includes('mailer-daemon') || from.includes('postmaster') || from.includes('noreply') || from.includes('no-reply')) return true;
  if (subject.includes('undeliverable') || subject.includes('delivery status notification') || subject.includes('mail delivery failed')) return true;
  if (subject.startsWith('new lead magnet download - ') || subject.startsWith('new saturday masterclass reserve request - ')) return true;

  return false;
}

async function hasExistingInboundMessage(providerMessageId: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('inbound_email_replies')
    .select('id')
    .eq('provider', 'zoho')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle();

  if (error) {
    if (isMissingInboundTable(error.message)) return false;
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function findLeadByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('id, first_name, email, archetype_name, archetype_payload, source, lead_status, follow_up_count, last_contacted_at, next_follow_up_at, download_link')
    .ilike('email', email)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data || null) as LeadRow | null;
}

async function findLeadById(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .select('id, first_name, email, archetype_name, archetype_payload, source, lead_status, follow_up_count, last_contacted_at, next_follow_up_at, download_link')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data || null) as LeadRow | null;
}

async function findLastSentEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id, lead_id, to_email, to_name, subject, body, template_id, archetype, service_interest, sent_at')
    .eq('to_email', email)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data || null) as SentEmailMatch | null;
}

async function findSentEmailById(id?: string | null) {
  if (!id) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('id, lead_id, to_email, to_name, subject, body, template_id, archetype, service_interest, sent_at')
    .eq('id', id)
    .maybeSingle();

  if (error) return null;
  return (data || null) as SentEmailMatch | null;
}

async function resolveLeadForInboundEmail(email: string, sentEmail?: SentEmailMatch | null) {
  let lead = await findLeadByEmail(email);
  if (!lead && sentEmail?.lead_id) {
    lead = await findLeadById(sentEmail.lead_id);
  }
  return lead;
}

function buildDraftSystemPrompt() {
  return `
You are drafting email replies for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

The draft is for approval. Do not claim it has been sent.

VOICE:
- Warm, direct, grounded, and human.
- No generic coaching cliches.
- No em dashes.
- No hard selling.
- Use short paragraphs.
- If the lead asks a direct question, answer it clearly.
- If the lead sounds uncertain or emotional, acknowledge the real concern before offering next steps.
- If a booking, service, or next step is relevant, mention one clear next step gently.

OUTPUT: Respond only with valid JSON:
{
  "reply": "Full email reply draft",
  "shortReply": "Shorter version of the same reply",
  "priority": 1-100,
  "intent": "brief description of what this reply should do"
}
`.trim();
}

function buildDraftUserMessage({
  message,
  lead,
  sentEmail,
}: {
  message: ZohoMailboxMessage;
  lead: LeadRow | null;
  sentEmail: SentEmailMatch | null;
}) {
  const leadSource = normalizeLeadSource(lead?.source);
  return [
    `Lead name: ${getFirstName(lead?.first_name || message.fromName, message.fromEmail)}`,
    `Lead email: ${message.fromEmail}`,
    lead ? `Lead source: ${leadSourceLabels[leadSource]}` : 'Lead source: unknown',
    lead?.archetype_name ? `Lead archetype: ${lead.archetype_name}` : '',
    getServiceInterest(lead?.archetype_payload) ? `Service interest: ${getServiceInterest(lead?.archetype_payload)}` : '',
    sentEmail?.subject ? `Last email Kagiso sent: ${sentEmail.subject}` : '',
    sentEmail?.body ? `<last_sent_email>\n${truncate(sentEmail.body, 2500)}\n</last_sent_email>` : '',
    `Inbound subject: ${message.subject}`,
    `<lead_reply>\n${truncate(message.body, 4500)}\n</lead_reply>`,
    '',
    'Draft the next email Kagiso should send back. Keep it specific to this reply.',
  ].filter(Boolean).join('\n');
}

function normalizeDraft(value: unknown): DraftReplyResult {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const priority = Number(record.priority);
  return {
    reply: String(record.reply || '').trim(),
    shortReply: String(record.shortReply || '').trim(),
    priority: Number.isFinite(priority) ? Math.max(1, Math.min(100, Math.round(priority))) : undefined,
    intent: typeof record.intent === 'string' ? record.intent.trim() : undefined,
  };
}

function fallbackDraft(message: ZohoMailboxMessage, lead: LeadRow | null) {
  const firstName = getFirstName(lead?.first_name || message.fromName, message.fromEmail);
  return {
    reply: [
      `Hi ${firstName},`,
      '',
      'Thank you for replying. I have read this, and I want to come back to you properly.',
      '',
      'Kagiso',
    ].join('\n'),
    shortReply: `Hi ${firstName}, thank you for replying. I have read this, and I want to come back to you properly. Kagiso`,
    priority: 95,
    intent: 'Acknowledge the reply and prepare a human follow-up.',
  } satisfies DraftReplyResult;
}

async function draftReply(message: ZohoMailboxMessage, lead: LeadRow | null, sentEmail: SentEmailMatch | null) {
  const apiKey = process.env[AI_API_KEY_ENV];
  if (!apiKey) {
    return {
      draft: fallbackDraft(message, lead),
      error: `${AI_API_KEY_ENV} is missing, so a simple placeholder draft was created.`,
    };
  }

  try {
    const text = await callToolAi({
      apiKey,
      messages: [
        { role: 'system', content: buildDraftSystemPrompt() },
        { role: 'user', content: buildDraftUserMessage({ message, lead, sentEmail }) },
      ],
      maxTokens: 900,
      temperature: 0.55,
      needsVision: false,
    });
    const draft = normalizeDraft(extractToolJsonObject(text));

    if (!draft.reply || !draft.shortReply) {
      return { draft: fallbackDraft(message, lead), error: 'AI draft response was incomplete.' };
    }

    return { draft, error: '' };
  } catch (error) {
    return {
      draft: fallbackDraft(message, lead),
      error: error instanceof Error ? error.message : 'AI draft failed.',
    };
  }
}

function buildInboundNote({
  message,
  draft,
  draftError,
}: {
  message: ZohoMailboxMessage;
  draft: DraftReplyResult;
  draftError: string;
}) {
  return [
    `Inbound reply from ${message.fromName || message.fromEmail} <${message.fromEmail}>`,
    `Subject: ${message.subject}`,
    `Received: ${formatDateTime(message.receivedAt)}`,
    '',
    'Message:',
    message.body,
    '',
    'Draft prepared for approval:',
    draft.reply,
    draftError ? `\nDraft note: ${draftError}` : '',
  ].filter(Boolean).join('\n');
}

async function createReplyTask(message: ZohoMailboxMessage, lead: LeadRow | null, priority: number) {
  return createManualTask({
    title: `${getFirstName(lead?.first_name || message.fromName, message.fromEmail)} - Reply to inbound email`,
    type: 'LEAD',
    status: 'todo',
    priority,
    dueDate: getDateKey(new Date()),
    linkedLeadId: lead?.id || null,
  });
}

async function importInboundMessage(message: ZohoMailboxMessage, mailbox: string) {
  if (await hasExistingInboundMessage(message.providerMessageId)) return 'duplicate' as const;

  const sentEmail = await findLastSentEmail(message.fromEmail);
  const lead = await resolveLeadForInboundEmail(message.fromEmail, sentEmail);

  if (!lead && !sentEmail) return 'ignored' as const;

  const { draft, error: draftError } = await draftReply(message, lead, sentEmail);
  const task = await createReplyTask(message, lead, draft.priority || 95);
  const note = await createNote({
    linkedTaskId: task.id,
    linkedLeadId: lead?.id || null,
    body: buildInboundNote({ message, draft, draftError }),
  });

  if (lead?.id) {
    await updateDiagnosticSubmissionCrm(lead.id, {
      next_follow_up_at: null,
    });
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('inbound_email_replies')
    .insert({
      provider: 'zoho',
      provider_message_id: message.providerMessageId,
      provider_thread_id: message.providerThreadId,
      mailbox,
      from_email: message.fromEmail,
      from_name: message.fromName,
      to_email: message.toEmail,
      subject: message.subject,
      body: message.body,
      received_at: message.receivedAt,
      lead_id: lead?.id || sentEmail?.lead_id || null,
      sent_email_id: sentEmail?.id || null,
      task_id: task.id,
      note_id: note.id,
      reply_subject: getReplySubject(message.subject),
      reply_draft: draft.reply,
      reply_short_draft: draft.shortReply,
      draft_status: 'drafted',
      status: 'new',
      metadata: {
        intent: draft.intent || null,
        draft_error: draftError || null,
        source: 'zoho_mail_import',
      },
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return 'duplicate' as const;
    throw new Error(error.message);
  }

  return data?.id ? ('imported' as const) : ('skipped' as const);
}

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export async function importZohoInboundReplies({
  limit = 50,
  days = 14,
}: {
  limit?: number;
  days?: number;
} = {}): Promise<InboundReplyImportResult> {
  const missingConfig = getMissingZohoMailEnv();
  const result: InboundReplyImportResult = {
    scanned: 0,
    matched: 0,
    imported: 0,
    skipped: 0,
    ignored: 0,
    drafted: 0,
    tasksCreated: 0,
    notesCreated: 0,
    missingConfig,
    errors: [],
  };

  if (missingConfig.length > 0) return result;

  const page = await listZohoInboxMessages({ limit });
  const mailbox = page.mailbox || getContactEmail().toLowerCase();
  const safeDays = Math.max(1, Math.min(Math.floor(days), 90));

  for (const message of page.messages) {
    result.scanned += 1;

    if (shouldIgnoreMessage(message, mailbox) || !isWithinDays(message.receivedAt, safeDays)) {
      result.ignored += 1;
      continue;
    }

    try {
      const status = await importInboundMessage(message, mailbox);
      if (status === 'imported') {
        result.matched += 1;
        result.imported += 1;
        result.drafted += 1;
        result.tasksCreated += 1;
        result.notesCreated += 1;
      } else if (status === 'ignored') {
        result.ignored += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.skipped += 1;
      result.errors.push(error instanceof Error ? error.message : 'Could not import an inbound reply.');
    }
  }

  return result;
}

export async function repairInboundEmailReplyLeadLinks({ limit = 200 }: { limit?: number } = {}) {
  const supabase = createSupabaseServiceClient();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 250));
  const { data, error } = await supabase
    .from('inbound_email_replies')
    .select('id, from_email, sent_email_id')
    .is('lead_id', null)
    .order('received_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    if (isMissingInboundTable(error.message)) return { scanned: 0, linked: 0 };
    throw new Error(error.message);
  }

  let linked = 0;
  for (const row of data || []) {
    const sentEmail = await findSentEmailById(row.sent_email_id) || await findLastSentEmail(row.from_email);
    const lead = await resolveLeadForInboundEmail(row.from_email, sentEmail);
    if (!lead?.id) continue;

    const update = await supabase
      .from('inbound_email_replies')
      .update({ lead_id: lead.id })
      .eq('id', row.id)
      .is('lead_id', null);

    if (!update.error) linked += 1;
  }

  return { scanned: data?.length || 0, linked };
}

export async function listInboundEmailReplies({
  limit = 50,
  status,
  source,
  repairLeadLinks = false,
}: InboundEmailReplyListFilters = {}) {
  if (repairLeadLinks) {
    await repairInboundEmailReplyLeadLinks({ limit: Math.max(limit, 50) });
  }

  const supabase = createSupabaseServiceClient();
  const sourceFilter = isDiagnosticLeadSource(source) ? source : null;
  const leadJoin = sourceFilter ? 'diagnostic_submissions!inner' : 'diagnostic_submissions';
  let query = supabase
    .from('inbound_email_replies')
    .select(`*, ${leadJoin}(${INBOUND_REPLY_LEAD_SELECT})`)
    .order('received_at', { ascending: false })
    .limit(Math.max(1, Math.min(Math.floor(limit), 250)));

  if (status === 'new' || status === 'reviewed' || status === 'archived') {
    query = query.eq('status', status);
  }

  if (sourceFilter) {
    query = query.eq('diagnostic_submissions.source', sourceFilter);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingInboundTable(error.message)) return [];
    throw new Error(error.message);
  }

  return ((data || []) as InboundReplyRow[]).map(normalizeInboundReply);
}

export async function updateInboundEmailReply(
  id: string,
  values: {
    status?: InboundEmailReplyStatus;
    draftStatus?: InboundEmailDraftStatus;
  },
) {
  const payload: Record<string, string> = {};
  if (values.status) payload.status = values.status;
  if (values.draftStatus) payload.draft_status = values.draftStatus;
  if (Object.keys(payload).length === 0) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('inbound_email_replies')
    .update(payload)
    .eq('id', id)
    .select('*, diagnostic_submissions(id, first_name, email, archetype_name, archetype_payload, source, lead_status, follow_up_count, last_contacted_at, next_follow_up_at, download_link)')
    .single();

  if (error) throw new Error(error.message);
  return normalizeInboundReply(data as InboundReplyRow);
}
