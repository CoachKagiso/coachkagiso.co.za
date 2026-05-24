import {
  getBrevoTransactionalEmailContent,
  listBrevoTransactionalEmails,
  type BrevoTransactionalEmail,
  type BrevoTransactionalEmailContent,
} from '@/lib/brevo';
import {
  hasDashboardNotificationFingerprint,
  hasDashboardNotificationWithMetadata,
  recordDashboardNotification,
  type DashboardNotificationEventType,
} from '@/lib/dashboard-notifications';
import { getContactEmail } from '@/lib/env';

type BrevoNotificationDraft = {
  eventType: DashboardNotificationEventType;
  title: string;
  description: string;
  contactName?: string | null;
  contactEmail?: string | null;
  href?: string | null;
  source: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type BrevoNotificationImportResult = {
  scanned: number;
  matched: number;
  imported: number;
  skipped: number;
  ignored: number;
  windows: number;
  errors: string[];
};

const supportedSubjectPrefixes = [
  'New lead magnet download - ',
  'New Saturday Masterclass reserve request - ',
  'New payment - ',
  'New intake - ',
] as const;

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getBrevoWindows(days: number) {
  const safeDays = Math.max(1, Math.min(days, 365));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const firstDay = addDays(today, -(safeDays - 1));
  const windows: { startDate: string; endDate: string }[] = [];
  let cursor = firstDay;

  while (cursor.getTime() <= today.getTime()) {
    const windowEnd = new Date(Math.min(addDays(cursor, 6).getTime(), today.getTime()));
    windows.push({
      startDate: toDateOnly(cursor),
      endDate: toDateOnly(windowEnd),
    });
    cursor = addDays(windowEnd, 1);
  }

  return windows;
}

function isSupportedSubject(subject?: string | null) {
  const normalized = String(subject || '').trim();
  return supportedSubjectPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function stripSubjectPrefix(subject: string, prefix: string) {
  return subject.startsWith(prefix) ? subject.slice(prefix.length).trim() : '';
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

function getLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanValue(value?: string | null) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || /^not supplied$/i.test(text)) return '';
  return text;
}

function extractField(text: string, label: string) {
  const colonMatch = text.match(new RegExp(`(?:^|\\n)\\s*${escapeRegExp(label)}\\s*:\\s*(.+?)(?=\\n|$)`, 'i'));
  if (colonMatch) return cleanValue(colonMatch[1]);

  const lines = getLines(text);
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  if (index !== -1) return cleanValue(lines[index + 1]);

  return '';
}

function extractEmail(text: string) {
  const email = cleanValue(extractField(text, 'Email')).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function extractRequestedAsset(text: string) {
  const requestedLine = getLines(text).find((line) => line.toLowerCase().startsWith('a visitor requested '));
  return cleanValue(requestedLine?.replace(/^a visitor requested\s+/i, '').replace(/\.$/, ''));
}

function extractFocus(text: string) {
  const marker = 'What they want help with:';
  const index = text.toLowerCase().indexOf(marker.toLowerCase());
  if (index === -1) return '';

  return cleanValue(text.slice(index + marker.length));
}

function inferLeadMagnetSource(input: { source?: string; asset?: string; pdfUrl?: string }) {
  if (input.source) return input.source;

  const searchable = `${input.asset || ''} ${input.pdfUrl || ''}`.toLowerCase();
  if (searchable.includes('linkedin')) return 'linkedin-headline-builder';
  if (searchable.includes('90') || searchable.includes('manager')) return 'first-90-days-checklist';
  return 'lead-magnet-email-import';
}

function getIsoDate(email: BrevoTransactionalEmail, content: BrevoTransactionalEmailContent) {
  const raw = content.date || email.date;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mailto(email: string, subject: string) {
  return email ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : null;
}

function baseMetadata(email: BrevoTransactionalEmail, subject: string) {
  return {
    importedFrom: 'brevo',
    brevoUuid: email.uuid || null,
    brevoMessageId: email.messageId || null,
    brevoRecipient: email.email || null,
    brevoSubject: subject,
  };
}

function parseLeadMagnet(
  email: BrevoTransactionalEmail,
  content: BrevoTransactionalEmailContent,
  subject: string,
  text: string,
): BrevoNotificationDraft | null {
  const contactName = extractField(text, 'Name') || stripSubjectPrefix(subject, 'New lead magnet download - ');
  const contactEmail = extractEmail(text);
  if (!contactEmail) return null;

  const source = inferLeadMagnetSource({
    source: extractField(text, 'Source'),
    asset: extractRequestedAsset(text),
    pdfUrl: extractField(text, 'PDF'),
  });
  const asset = extractRequestedAsset(text) || 'a lead magnet';
  const pdfUrl = extractField(text, 'PDF');

  return {
    eventType: 'lead_magnet_download',
    source,
    title: `New lead magnet download - ${contactName || contactEmail}`,
    description: `${contactName || 'A visitor'} requested ${asset}. ${source ? `Source: ${source}.` : ''}`,
    contactName,
    contactEmail,
    href: mailto(contactEmail, 'Your download from Coach Kagiso'),
    createdAt: getIsoDate(email, content),
    metadata: {
      ...baseMetadata(email, subject),
      asset,
      source,
      pdfUrl: pdfUrl || null,
    },
  };
}

function parseMasterclass(
  email: BrevoTransactionalEmail,
  content: BrevoTransactionalEmailContent,
  subject: string,
  text: string,
): BrevoNotificationDraft | null {
  const contactName = extractField(text, 'Name') || stripSubjectPrefix(subject, 'New Saturday Masterclass reserve request - ');
  const contactEmail = extractEmail(text);
  if (!contactEmail) return null;

  const whatsapp = extractField(text, 'WhatsApp');
  const source = extractField(text, 'Source') || 'masterclass-reserve-form';
  const focus = extractFocus(text);

  return {
    eventType: 'masterclass_reservation',
    source,
    title: `New masterclass reservation - ${contactName || contactEmail}`,
    description: `${contactName || 'A visitor'} joined the Saturday Masterclass reserve list.${whatsapp ? ` WhatsApp: ${whatsapp}.` : ''}${focus ? ` Focus: ${focus}` : ''}`,
    contactName,
    contactEmail,
    href: mailto(contactEmail, 'Saturday Masterclass reserve list'),
    createdAt: getIsoDate(email, content),
    metadata: {
      ...baseMetadata(email, subject),
      source,
      whatsapp: whatsapp || null,
      focus: focus || null,
      plannedSession: extractField(text, 'Planned session') || extractField(text, 'Session') || 'Date to be confirmed',
    },
  };
}

function parsePayment(
  email: BrevoTransactionalEmail,
  content: BrevoTransactionalEmailContent,
  subject: string,
  text: string,
): BrevoNotificationDraft | null {
  const subjectParts = stripSubjectPrefix(subject, 'New payment - ').split(' - ');
  const service = extractField(text, 'Service') || subjectParts[0] || '';
  if (!service) return null;

  const contactName = extractField(text, 'Name') || extractField(text, 'Client');
  const contactEmail = extractEmail(text);
  const amount = extractField(text, 'Amount') || subjectParts.slice(1).join(' - ');

  return {
    eventType: 'payment_confirmed',
    source: 'brevo-payment-email',
    title: `New payment - ${service}`,
    description: `${contactName || 'A client'} paid${amount ? ` ${amount}` : ''} for ${service}. Watch for the intake form.`,
    contactName,
    contactEmail,
    href: mailto(contactEmail, `Next steps for ${service}`),
    createdAt: getIsoDate(email, content),
    metadata: {
      ...baseMetadata(email, subject),
      service,
      amount: amount || null,
      paymentDate: extractField(text, 'Date') || null,
    },
  };
}

function parseIntake(
  email: BrevoTransactionalEmail,
  content: BrevoTransactionalEmailContent,
  subject: string,
  text: string,
): BrevoNotificationDraft | null {
  const subjectParts = stripSubjectPrefix(subject, 'New intake - ').split(' - ');
  const service = extractField(text, 'Service') || subjectParts[0] || '';
  const contactName = extractField(text, 'Name') || extractField(text, 'Client') || subjectParts.slice(1).join(' - ');
  const contactEmail = extractEmail(text);
  if (!service || !contactEmail) return null;

  const cvStatus = extractField(text, 'CV status');
  const status = extractField(text, 'Status');
  const whatsapp = extractField(text, 'WhatsApp');

  return {
    eventType: 'intake_submitted',
    source: 'brevo-intake-email',
    title: `New intake - ${service}`,
    description: `${contactName || 'A client'} submitted the brief for ${service}.${cvStatus ? ` CV status: ${cvStatus}.` : ''}`,
    contactName,
    contactEmail,
    href: mailto(contactEmail, `Your ${service} intake`),
    createdAt: getIsoDate(email, content),
    metadata: {
      ...baseMetadata(email, subject),
      service,
      status: status || null,
      cvStatus: cvStatus || null,
      whatsapp: whatsapp || null,
    },
  };
}

function parseBrevoNotification(email: BrevoTransactionalEmail, content: BrevoTransactionalEmailContent) {
  const subject = cleanValue(content.subject || email.subject);
  const text = bodyToText(content.body);

  if (subject.startsWith('New lead magnet download - ')) {
    return parseLeadMagnet(email, content, subject, text);
  }

  if (subject.startsWith('New Saturday Masterclass reserve request - ')) {
    return parseMasterclass(email, content, subject, text);
  }

  if (subject.startsWith('New payment - ')) {
    return parsePayment(email, content, subject, text);
  }

  if (subject.startsWith('New intake - ')) {
    return parseIntake(email, content, subject, text);
  }

  return null;
}

async function importDraft(draft: BrevoNotificationDraft) {
  const brevoUuid = typeof draft.metadata.brevoUuid === 'string' ? draft.metadata.brevoUuid : '';

  if (brevoUuid && (await hasDashboardNotificationWithMetadata({ brevoUuid }))) {
    return 'duplicate' as const;
  }

  if (
    await hasDashboardNotificationFingerprint({
      eventType: draft.eventType,
      contactEmail: draft.contactEmail,
      title: draft.title,
      source: draft.source,
      createdAt: draft.createdAt,
      metadata: draft.metadata,
    })
  ) {
    return 'duplicate' as const;
  }

  const notification = await recordDashboardNotification(draft);
  return notification ? ('imported' as const) : ('unavailable' as const);
}

export async function importBrevoDashboardNotifications({
  days = 180,
}: {
  days?: number;
} = {}): Promise<BrevoNotificationImportResult> {
  const contactEmail = getContactEmail();
  const windows = getBrevoWindows(days);
  const result: BrevoNotificationImportResult = {
    scanned: 0,
    matched: 0,
    imported: 0,
    skipped: 0,
    ignored: 0,
    windows: windows.length,
    errors: [],
  };

  for (const window of windows) {
    let offset = 0;
    const limit = 500;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const page = await listBrevoTransactionalEmails({
        email: contactEmail,
        startDate: window.startDate,
        endDate: window.endDate,
        limit,
        offset,
      });

      if (!page) {
        result.errors.push(`Could not fetch Brevo emails for ${window.startDate} to ${window.endDate}.`);
        break;
      }

      const emails = page.transactionalEmails || [];
      total = typeof page.count === 'number' ? page.count : offset + emails.length;
      result.scanned += emails.length;

      for (const email of emails) {
        if (!isSupportedSubject(email.subject)) {
          result.ignored += 1;
          continue;
        }

        result.matched += 1;

        if (!email.uuid) {
          result.skipped += 1;
          result.errors.push(`Skipped Brevo email without uuid: ${email.subject || 'Untitled email'}.`);
          continue;
        }

        if (await hasDashboardNotificationWithMetadata({ brevoUuid: email.uuid })) {
          result.skipped += 1;
          continue;
        }

        const content = await getBrevoTransactionalEmailContent(email.uuid);
        if (!content) {
          result.skipped += 1;
          result.errors.push(`Could not fetch Brevo content for ${email.subject || email.uuid}.`);
          continue;
        }

        const draft = parseBrevoNotification(email, content);
        if (!draft) {
          result.skipped += 1;
          continue;
        }

        const importStatus = await importDraft(draft);
        if (importStatus === 'imported') result.imported += 1;
        else {
          result.skipped += 1;
          if (importStatus === 'unavailable' && !result.errors.includes('Dashboard notifications table is not available.')) {
            result.errors.push('Dashboard notifications table is not available.');
          }
        }
      }

      if (emails.length === 0) break;
      offset += emails.length;
    }
  }

  return result;
}
