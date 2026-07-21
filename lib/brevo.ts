import { getBrevoListId, getContactEmail } from '@/lib/env';
import { classifyBrevoSendResult, type BrevoSendResult } from '@/lib/brevo-send-result';

type SendEmailInput = {
  to: { email: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  tags?: string[];
};

export type { BrevoSendResult } from '@/lib/brevo-send-result';

export type BrevoTransactionalEmail = {
  date?: string;
  email?: string;
  messageId?: string;
  subject?: string;
  uuid?: string;
  templateId?: number;
};

export type BrevoTransactionalEmailContent = {
  date?: string;
  email?: string;
  events?: { name?: string; time?: string }[];
  subject?: string;
  attachmentCount?: number;
  body?: string;
  templateId?: number;
};

async function brevoFetch(path: string, init: RequestInit) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY is missing. Skipping Brevo request.');
    return null;
  }

  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    ...init,
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    console.error(`Brevo request failed with status ${response.status}.`);
  }

  return response;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendTransactionalEmailWithStatus({
  to,
  subject,
  text,
  html,
  headers,
  tags,
}: SendEmailInput): Promise<BrevoSendResult> {
  const senderEmail = getContactEmail();
  const response = await brevoFetch('/smtp/email', {
    method: 'POST',
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Coach Kagiso' },
      to,
      subject,
      textContent: text,
      htmlContent: html,
      headers,
      tags,
    }),
  });

  if (!response) return classifyBrevoSendResult({ responsePresent: false, responseOk: false });
  if (!response.ok) return classifyBrevoSendResult({ responsePresent: true, responseOk: false });

  const result = (await response.json().catch(() => ({}))) as { messageId?: string };
  return classifyBrevoSendResult({
    responsePresent: true,
    responseOk: true,
    messageId: result.messageId,
  });
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const result = await sendTransactionalEmailWithStatus(input);
  return result.outcome === 'accepted' ? { messageId: result.messageId } : null;
}

export async function listBrevoTransactionalEmails({
  email,
  startDate,
  endDate,
  limit = 500,
  offset = 0,
  sort = 'desc',
}: {
  email?: string;
  startDate: string;
  endDate: string;
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
}) {
  const params = new URLSearchParams({
    startDate,
    endDate,
    limit: String(limit),
    offset: String(offset),
    sort,
  });
  if (email) params.set('email', email);

  let response = await brevoFetch(`/smtp/emails?${params.toString()}`, {
    method: 'GET',
  });

  if (response?.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after') || 1);
    await wait(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    response = await brevoFetch(`/smtp/emails?${params.toString()}`, {
      method: 'GET',
    });
  }

  if (response?.status === 404) {
    return { count: 0, transactionalEmails: [] };
  }

  if (!response || !response.ok) return null;

  return (await response.json()) as {
    count?: number;
    transactionalEmails?: BrevoTransactionalEmail[];
  };
}

export async function getBrevoTransactionalEmailContent(uuid: string) {
  const response = await brevoFetch(`/smtp/emails/${encodeURIComponent(uuid)}`, {
    method: 'GET',
  });

  if (!response || !response.ok) return null;

  return (await response.json()) as BrevoTransactionalEmailContent;
}

export async function addClientToBrevoList(email: string, fullName: string) {
  const listId = getBrevoListId();
  if (!listId) return;

  await brevoFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: fullName.split(/\s+/)[0] || '',
        LASTNAME: fullName.split(/\s+/).slice(1).join(' '),
      },
      listIds: [listId],
      updateEnabled: true,
    }),
  });
}
