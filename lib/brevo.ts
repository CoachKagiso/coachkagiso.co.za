import { getBrevoListId, getContactEmail } from '@/lib/env';

type SendEmailInput = {
  to: { email: string; name?: string }[];
  subject: string;
  text: string;
  html?: string;
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
    const body = await response.text();
    console.error(`Brevo request failed: ${response.status} ${body}`);
  }

  return response;
}

export async function sendTransactionalEmail({ to, subject, text, html }: SendEmailInput) {
  const senderEmail = getContactEmail();
  await brevoFetch('/smtp/email', {
    method: 'POST',
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'Coach Kagiso' },
      to,
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
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
