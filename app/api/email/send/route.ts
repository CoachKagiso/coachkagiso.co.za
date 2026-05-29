import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { hasSentEmailTemplateAlreadySent, recordSentEmail } from '@/lib/sent-emails';

export const dynamic = 'force-dynamic';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = String(body?.to || '').trim();
  const toName = String(body?.toName || '').trim();
  const subject = String(body?.subject || '').trim();
  const htmlContent = String(body?.htmlContent || '').trim();
  const plainTextBody = String(body?.plainTextBody || '').trim();
  const leadId = String(body?.leadId || '').trim();
  const templateId = String(body?.templateId || '').trim();
  const archetype = String(body?.archetype || '').trim();
  const serviceInterest = String(body?.serviceInterest || '').trim();
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Brevo is not configured.' }, { status: 500 });
  }

  if (!isEmail(to) || !subject || !htmlContent) {
    return NextResponse.json({ error: 'Recipient, subject, and email body are required.' }, { status: 400 });
  }

  if (templateId) {
    const duplicateTemplate = await hasSentEmailTemplateAlreadySent({
      leadId: leadId || null,
      toEmail: to,
      templateId,
    });

    if (duplicateTemplate) {
      return NextResponse.json(
        { error: 'This template has already been sent to this lead. Choose the next template before sending again.' },
        { status: 409 }
      );
    }
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Kagiso Shabangu',
        email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@coachkagiso.co.za',
      },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    console.error('Brevo send failed', {
      status: response.status,
      body: await response.text().catch(() => ''),
    });
    return NextResponse.json({ error: 'Email failed to send. Try again.' }, { status: 500 });
  }

  const brevoResult = (await response.json().catch(() => ({}))) as { messageId?: string };

  try {
    await recordSentEmail({
      leadId: leadId || null,
      toEmail: to,
      toName: toName || to,
      subject,
      body: plainTextBody || htmlContent,
      templateId: templateId || null,
      archetype: archetype || null,
      serviceInterest: serviceInterest || null,
      sentAt: new Date().toISOString(),
      origin: 'dashboard',
      externalProvider: brevoResult.messageId ? 'brevo' : null,
      externalMessageId: brevoResult.messageId || null,
      deliveryStatus: 'sent',
    });
  } catch (error) {
    console.error('Sent email log write failed', error);
  }

  return NextResponse.json({ success: true });
}
