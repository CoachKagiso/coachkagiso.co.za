import { listClientOperations, type ClientOperation } from '@/lib/client-operations';
import { listContentBacklogItems, type ContentBacklogItem } from '@/lib/content-studio';
import { listMergedCalendarEvents } from '@/lib/dashboard-calendar';
import { listDiagnosticSubmissions, type DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import { listInboundEmailReplies, type InboundEmailReply } from '@/lib/inbound-email-replies';
import { leadSourceLabels } from '@/lib/lead-sources';
import { listSentEmails, type SentEmail } from '@/lib/sent-emails';
import { getMissingZohoMailEnv, listZohoInboxMessages, type ZohoMailboxMessage } from '@/lib/zoho-mail';

type AccessBlock = {
  name: string;
  description: string;
  content: string;
};

type AccessRequest = {
  query: string;
  emails: string[];
  urls: string[];
  terms: string[];
  wantsLeads: boolean;
  wantsEmail: boolean;
  wantsLiveMailbox: boolean;
  wantsVault: boolean;
  wantsPayments: boolean;
  wantsBookings: boolean;
  wantsExternalUrls: boolean;
};

const localTimeZone = 'Africa/Johannesburg';
const stopWords = new Set([
  'about',
  'access',
  'after',
  'again',
  'analyse',
  'analyze',
  'assistant',
  'because',
  'booking',
  'bookings',
  'calendar',
  'client',
  'clients',
  'could',
  'draft',
  'email',
  'emails',
  'from',
  'have',
  'inbound',
  'into',
  'lead',
  'leads',
  'mailbox',
  'masterclass',
  'message',
  'messages',
  'outbound',
  'payment',
  'payments',
  'please',
  'reply',
  'section',
  'should',
  'summarise',
  'summarize',
  'that',
  'this',
  'thread',
  'threads',
  'vault',
  'what',
  'when',
  'with',
]);

function compactText(value?: string | null, maxLength = 1200) {
  const compacted = String(value || '').replace(/\s+/g, ' ').trim();
  if (compacted.length <= maxLength) return compacted;
  return `${compacted.slice(0, maxLength).trim()}...`;
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: localTimeZone,
  }).format(date);
}

function extractEmails(value: string) {
  return Array.from(new Set(value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.map((email) => email.toLowerCase()) || []));
}

function extractUrls(value: string) {
  return Array.from(new Set(value.match(/https?:\/\/[^\s)"']+/gi) || [])).slice(0, 3);
}

function extractTerms(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/https?:\/\/[^\s)"']+/gi, ' ')
        .split(/[^a-z0-9@._+-]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !stopWords.has(term) && !term.includes('@')),
    ),
  ).slice(0, 8);
}

function parseAccessRequest(message: string): AccessRequest {
  const query = message.toLowerCase();
  const emails = extractEmails(message);
  const urls = extractUrls(message);

  return {
    query,
    emails,
    urls,
    terms: extractTerms(message),
    wantsLeads: /\bleads?\b|prospects?|waitlist|masterclass|follow-?ups?|pipeline|archetype|diagnostic|profile/i.test(message),
    wantsEmail: /\bemail|mailbox|inbound|outbound|sent|reply|replies|thread|messages?\b/i.test(message),
    wantsLiveMailbox: /live mailbox|latest (email|mail|message)|recent inbox|check (my )?inbox|zoho|mailbox/i.test(message),
    wantsVault: /\bvault|backlog|drafts?|content idea|saved draft/i.test(message),
    wantsPayments: /\bpayment|paid|payfast|revenue|finance|checkout|intake|delivery|client operations?\b/i.test(message),
    wantsBookings: /\bbooking|bookings|calendar|cal\.com|session|appointment|masterclass date|schedule/i.test(message),
    wantsExternalUrls: urls.length > 0 || /\blink|website|external url|page/i.test(message),
  };
}

function textMatches(value: string, request: AccessRequest) {
  const haystack = value.toLowerCase();
  if (request.emails.some((email) => haystack.includes(email))) return true;
  if (request.terms.length === 0) return true;
  return request.terms.some((term) => haystack.includes(term));
}

function leadSearchText(lead: DiagnosticSubmission) {
  const payload = lead.archetype_payload || {};
  return [
    lead.first_name,
    lead.email,
    lead.archetype_name,
    lead.source,
    lead.lead_status,
    payload.service,
    payload.focus,
    payload.action,
    payload.diagnosis,
    JSON.stringify(lead.answers || {}),
  ].join(' ');
}

function formatLead(lead: DiagnosticSubmission, includeAnswers = false) {
  const payload = lead.archetype_payload || {};
  const answers = includeAnswers
    ? Object.entries(lead.answers || {})
        .slice(0, 10)
        .map(([key, answer]) => `    Q${Number(key) + 1 || key}: ${compactText(answer, 500)}`)
        .join('\n')
    : '';

  return [
    `- ${lead.first_name} <${lead.email}>`,
    `  Source: ${leadSourceLabels[lead.source] || lead.source}; Status: ${lead.lead_status}; Submitted: ${formatDateTime(lead.submitted_at)}`,
    `  Archetype: ${lead.archetype_name}; Service: ${payload.service || 'Not captured'}`,
    payload.focus ? `  Focus: ${compactText(payload.focus, 800)}` : '',
    payload.diagnosis ? `  Diagnosis: ${compactText(payload.diagnosis, 600)}` : '',
    answers ? `  Diagnostic answers:\n${answers}` : '',
  ].filter(Boolean).join('\n');
}

function formatInboundReply(reply: InboundEmailReply, bodyLimit = 1600) {
  return [
    `- Inbound from ${reply.fromName} <${reply.fromEmail}> at ${formatDateTime(reply.receivedAt)}`,
    `  Subject: ${reply.subject}`,
    `  Lead: ${reply.lead?.firstName || 'Unknown'}; Source: ${reply.lead?.source || 'matched_email'}; Service: ${reply.lead?.serviceInterest || 'Not captured'}`,
    `  Status: ${reply.status}; Draft: ${reply.draftStatus}`,
    `  Body: ${compactText(reply.body, bodyLimit)}`,
    reply.replyDraft ? `  Existing draft reply: ${compactText(reply.replyDraft, 900)}` : '',
  ].filter(Boolean).join('\n');
}

function formatSentEmail(email: SentEmail, bodyLimit = 1400) {
  return [
    `- Outbound to ${email.toName} <${email.toEmail}> at ${formatDateTime(email.sentAt)}`,
    `  Subject: ${email.subject}`,
    `  Source: ${email.leadSource}; Service: ${email.serviceInterest || 'Not captured'}; Archetype: ${email.archetype || 'Not captured'}`,
    `  Delivery: ${email.deliveryStatus || 'sent'}${email.openedAt ? `; Opened: ${formatDateTime(email.openedAt)}` : ''}${email.clickedAt ? `; Clicked: ${formatDateTime(email.clickedAt)}` : ''}`,
    `  Body: ${compactText(email.body, bodyLimit)}`,
  ].join('\n');
}

function formatVaultItem(item: ContentBacklogItem, includeBody = false) {
  return [
    `- ${item.title} (${item.status}, ${item.source})`,
    `  Pillar: ${item.pillar || 'None'}; Platform: ${item.platform || 'None'}; Favorite: ${item.isFavorite ? 'yes' : 'no'}; Updated: ${formatDateTime(item.updatedAt)}`,
    item.notes ? `  Notes: ${compactText(item.notes, 700)}` : '',
    includeBody && item.content ? `  Draft content: ${compactText(item.content, 2500)}` : '',
  ].filter(Boolean).join('\n');
}

function formatPayment(operation: ClientOperation) {
  const intakeSummary = operation.intake
    ? Object.entries(operation.intake.form_data || {})
        .slice(0, 8)
        .map(([key, value]) => `${key}: ${compactText(value, 220)}`)
        .join('; ')
    : 'No intake submitted';

  return [
    `- ${operation.payment.buyer_name || 'Client'} <${operation.payment.buyer_email || 'No email'}>`,
    `  Service: ${operation.serviceTitle}; Amount: ${operation.amountLabel}; Payment: ${operation.payment.status}; Delivery: ${operation.deliveryLabel}`,
    `  Payment ID: ${operation.payment.payment_id}; Confirmed: ${formatDateTime(operation.payment.confirmed_at || operation.payment.created_at)}`,
    `  Due: ${operation.deliveryDueAt ? formatDateTime(operation.deliveryDueAt) : 'No due date'}; Alert: ${operation.alertLabel || 'None'}`,
    `  Intake: ${intakeSummary}`,
  ].join('\n');
}

function isDeniedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

async function fetchApprovedUrl(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || isDeniedHostname(parsed.hostname)) {
    return `- ${url}\n  Skipped: local or private-network URLs are not available to the assistant.`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CoachKagisoAssistant/1.0',
        Accept: 'text/html,text/plain,application/json;q=0.8,*/*;q=0.5',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const textLike = /text|html|json|xml|markdown/i.test(contentType);
    if (!textLike) {
      return `- ${url}\n  Status: ${response.status}; Content-Type: ${contentType || 'unknown'}; Body skipped because it is not text.`;
    }

    const raw = await response.text();
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
    const cleaned = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return [
      `- ${url}`,
      `  Status: ${response.status}; Content-Type: ${contentType || 'unknown'}`,
      title ? `  Title: ${compactText(title, 220)}` : '',
      `  Extract: ${compactText(cleaned, 3000)}`,
    ].filter(Boolean).join('\n');
  } catch (error) {
    return `- ${url}\n  Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildLeadAccessBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsLeads && request.emails.length === 0) return null;
  const leads = await listDiagnosticSubmissions();
  const matched = leads.filter((lead) => textMatches(leadSearchText(lead), request));
  const source = matched.length ? matched : leads.slice(0, 20);
  const includeAnswers = request.emails.length > 0 || /\bprofile|diagnostic answers?|pain points?|specific lead|full lead/i.test(request.query);

  return {
    name: 'searchLeads',
    description: 'Read-only lead search across diagnostic, lead-magnet, and masterclass waitlist records.',
    content: [
      `Total leads scanned: ${leads.length}; matching leads returned: ${source.slice(0, 20).length}`,
      ...source.slice(0, 20).map((lead) => formatLead(lead, includeAnswers)),
    ].join('\n'),
  };
}

async function buildEmailAccessBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsEmail && request.emails.length === 0) return null;
  const [inboundReplies, sentEmailLog] = await Promise.all([
    listInboundEmailReplies({ limit: 200 }),
    listSentEmails(),
  ]);
  const sentEmails = sentEmailLog.emails;
  const inboundMatches = inboundReplies.filter((reply) =>
    textMatches([
      reply.fromEmail,
      reply.fromName,
      reply.subject,
      reply.body,
      reply.lead?.source,
      reply.lead?.serviceInterest,
      reply.lead?.archetype,
    ].join(' '), request),
  );
  const sentMatches = sentEmails.filter((email) =>
    textMatches([
      email.toEmail,
      email.toName,
      email.subject,
      email.body,
      email.leadSource,
      email.serviceInterest,
      email.archetype,
      email.templateName,
    ].join(' '), request),
  );

  const inboundSource = inboundMatches.length ? inboundMatches : inboundReplies.slice(0, 12);
  const sentSource = sentMatches.length ? sentMatches : sentEmails.slice(0, 12);

  return {
    name: 'getEmailThread',
    description: 'Read-only synced inbound replies and logged outbound emails. This does not send anything.',
    content: [
      `Inbound replies scanned: ${inboundReplies.length}; inbound replies returned: ${inboundSource.slice(0, 12).length}`,
      ...inboundSource.slice(0, 12).map((reply) => formatInboundReply(reply)),
      '',
      `Outbound emails scanned: ${sentEmails.length}; outbound emails returned: ${sentSource.slice(0, 12).length}`,
      ...sentSource.slice(0, 12).map((email) => formatSentEmail(email)),
    ].join('\n'),
  };
}

async function buildLiveMailboxBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsLiveMailbox) return null;
  const missingConfig = getMissingZohoMailEnv();
  if (missingConfig.length > 0) {
    return {
      name: 'readLiveMailbox',
      description: 'Read-only live Zoho inbox preview.',
      content: `Live mailbox preview unavailable. Missing Zoho config: ${missingConfig.join(', ')}`,
    };
  }

  const page = await listZohoInboxMessages({ limit: 12 }).catch((error) => ({
    mailbox: '',
    messages: [] as ZohoMailboxMessage[],
    error: error instanceof Error ? error.message : 'Unknown Zoho error',
  }));

  if ('error' in page) {
    return {
      name: 'readLiveMailbox',
      description: 'Read-only live Zoho inbox preview.',
      content: `Live mailbox preview failed: ${page.error}`,
    };
  }

  return {
    name: 'readLiveMailbox',
    description: 'Read-only live Zoho inbox preview. These messages are not persisted unless the normal sync action is used.',
    content: [
      `Mailbox: ${page.mailbox}; recent live inbox messages returned: ${page.messages.length}`,
      ...page.messages.map((message) => [
        `- ${message.fromName} <${message.fromEmail}> at ${formatDateTime(message.receivedAt)}`,
        `  Subject: ${message.subject}`,
        `  Body: ${compactText(message.body || message.summary, 1300)}`,
      ].join('\n')),
    ].join('\n'),
  };
}

async function buildVaultAccessBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsVault) return null;
  const items = await listContentBacklogItems();
  const activeItems = items.filter((item) => item.status !== 'used');
  const matched = activeItems.filter((item) =>
    textMatches([item.title, item.pillar, item.platform, item.source, item.status, item.notes, item.content].join(' '), request),
  );
  const source = matched.length ? matched : activeItems.slice(0, 10);
  const includeBody = /\bcontent|body|full|actual|read|show|individual|draft/i.test(request.query);

  return {
    name: includeBody ? 'getVaultDraft' : 'searchVaultDrafts',
    description: 'Read-only Content Vault search. Drafts can be inspected, but not edited or published here.',
    content: [
      `Vault drafts scanned: ${items.length}; active drafts returned: ${source.slice(0, 10).length}`,
      ...source.slice(0, 10).map((item) => formatVaultItem(item, includeBody)),
    ].join('\n'),
  };
}

async function buildPaymentAccessBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsPayments) return null;
  const operations = await listClientOperations();
  const confirmed = operations.filter((operation) => operation.payment.status === 'confirmed');
  const revenue = confirmed.reduce((sum, operation) => sum + Number(operation.payment.amount || 0), 0);
  const matched = operations.filter((operation) =>
    textMatches([
      operation.payment.payment_id,
      operation.payment.buyer_email,
      operation.payment.buyer_name,
      operation.payment.service_slug,
      operation.serviceTitle,
      operation.payment.status,
      operation.deliveryState,
      operation.deliveryLabel,
      operation.intake ? JSON.stringify(operation.intake.form_data) : '',
    ].join(' '), request),
  );
  const source = matched.length ? matched : operations.slice(0, 12);

  return {
    name: 'getPaymentsSummary',
    description: 'Read-only payment, intake, and delivery operation summary. No payment actions are available here.',
    content: [
      `Payments scanned: ${operations.length}; confirmed payments: ${confirmed.length}; confirmed revenue: R${revenue.toLocaleString('en-ZA')}`,
      `Returned payment/client records: ${source.slice(0, 12).length}`,
      ...source.slice(0, 12).map(formatPayment),
    ].join('\n'),
  };
}

async function buildBookingAccessBlock(request: AccessRequest, adminKey: string): Promise<AccessBlock | null> {
  if (!request.wantsBookings) return null;
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 45);

  const result = await listMergedCalendarEvents(
    {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    adminKey,
  ).catch((error) => ({
    authorized: false,
    authUrl: '/api/auth/google',
    events: [],
    error: error instanceof Error ? error.message : 'Unknown calendar error',
  }));

  const events = result.events.filter((event) =>
    textMatches([event.title, event.description, event.type, event.source, event.location].join(' '), request),
  );
  const source = events.length ? events : result.events.slice(0, 20);

  return {
    name: 'getBookingsSummary',
    description: 'Read-only booking and calendar window covering the last 7 days and next 45 days.',
    content: [
      `Calendar authorized: ${result.authorized ? 'yes' : 'no'}${result.error ? `; Note: ${result.error}` : ''}`,
      `Calendar events scanned: ${result.events.length}; events returned: ${source.slice(0, 20).length}`,
      ...source.slice(0, 20).map((event) => [
        `- ${event.title} (${event.type}, ${event.source})`,
        `  Starts: ${formatDateTime(event.start)}; Ends: ${formatDateTime(event.end)}; Cal booking: ${event.isCalBooking ? 'yes' : 'no'}`,
        event.description ? `  Description: ${compactText(event.description, 700)}` : '',
        event.location ? `  Location: ${compactText(event.location, 220)}` : '',
      ].filter(Boolean).join('\n')),
    ].join('\n'),
  };
}

async function buildExternalUrlBlock(request: AccessRequest): Promise<AccessBlock | null> {
  if (!request.wantsExternalUrls || request.urls.length === 0) return null;
  const fetched = await Promise.all(request.urls.map((url) => fetchApprovedUrl(url).catch((error) => (
    `- ${url}\n  Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  ))));

  return {
    name: 'fetchApprovedUrl',
    description: 'Read-only fetch for public URLs explicitly included in the user message.',
    content: fetched.join('\n'),
  };
}

export async function buildAssistantAccessContext(message: string, adminKey: string) {
  const request = parseAccessRequest(message);
  const blocks = (await Promise.all([
    buildLeadAccessBlock(request),
    buildEmailAccessBlock(request),
    buildLiveMailboxBlock(request),
    buildVaultAccessBlock(request),
    buildPaymentAccessBlock(request),
    buildBookingAccessBlock(request, adminKey),
    buildExternalUrlBlock(request),
  ])).filter((block): block is AccessBlock => Boolean(block && block.content.trim()));

  if (blocks.length === 0) return '';

  return [
    'READ-ONLY ASSISTANT ACCESS CONTEXT',
    'Use this scoped tool context when it is relevant. It is safe to analyze and summarize it, but you must not claim you sent, edited, posted, refunded, deleted, or changed anything.',
    'If a requested record is not present here, say what should be synced, searched, or opened next.',
    '',
    ...blocks.map((block) => [
      `TOOL: ${block.name}`,
      `Purpose: ${block.description}`,
      block.content,
    ].join('\n')),
  ].join('\n\n');
}
