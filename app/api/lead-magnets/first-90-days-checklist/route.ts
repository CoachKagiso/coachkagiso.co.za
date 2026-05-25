import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { upsertSourceLead } from '@/lib/diagnostic-submissions';
import { recordSentEmail } from '@/lib/sent-emails';
import {
  FIRST_90_DAYS_CHECKLIST_FILENAME,
  FIRST_90_DAYS_CHECKLIST_PATH,
} from '@/lib/first-90-days-checklist';
import { getContactEmail, getSiteUrl } from '@/lib/env';

type LeadPayload = {
  firstName?: string;
  email?: string;
  source?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidFirstName(name: string) {
  return /^[A-Za-z' -]+$/.test(name);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainEmail(firstName: string, pdfUrl: string, workUrl: string) {
  return `Hi ${firstName},

Here is your copy of The First 90 Days Checklist for New Managers in South Africa:
${pdfUrl}

Use it as a working kit. Start with the scorecard, then work through the phase that matches where you are: Week 1, Weeks 2-4, Month 2, or Month 3.

If you want support with the leadership, communication, and career positioning behind the checklist, you can book a conversation here:
${workUrl}

Your career matters. Keep elevating.

Coach Kagiso
`;
}

function htmlEmail(firstName: string, pdfUrl: string, workUrl: string) {
  return `
  <div style="margin:0;padding:32px 0;background:#f7f3ef;font-family:Raleway,Arial,Helvetica,sans-serif;color:#142334;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8c8bb;">
      <div style="padding:40px;background:#142334;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#c9ad98;font-weight:700;">First 90 Days Checklist</div>
        <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.04;font-weight:500;">Your manager operating kit is ready.</h1>
        <p style="margin:18px 0 0;font-size:17px;line-height:1.65;color:#e4d8cb;">A 4-phase checklist, scorecard, scripts, question bank, and Day 90 impact report template for new managers in South Africa.</p>
      </div>
      <div style="padding:36px 40px 40px;">
        <p style="margin:0 0 18px;font-size:17px;line-height:1.7;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">Use this as a working kit, not a perfection test. Start with the scorecard, then work through the phase that matches where you are.</p>
        <a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#142334;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Download the PDF</a>
        <p style="margin:28px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">If you want support with the leadership, communication, and career positioning behind the checklist, book a conversation with Coach Kagiso.</p>
        <a href="${escapeHtml(workUrl)}" style="display:inline-block;margin-top:16px;color:#c9ad98;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Book a conversation</a>
        <p style="margin:30px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">Your career matters. Keep elevating.</p>
        <p style="margin:18px 0 0;font-size:16px;color:#142334;">Coach Kagiso</p>
      </div>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LeadPayload;
    const firstName = String(payload.firstName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const source = String(payload.source || 'first-90-days-checklist').trim().slice(0, 120);

    if (!firstName || firstName.length > 50 || !isValidFirstName(firstName)) {
      return NextResponse.json({ error: 'Please provide a valid first name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    const pdfUrl = `${siteUrl}${FIRST_90_DAYS_CHECKLIST_PATH}`;
    const workUrl = `${siteUrl}/work-with-me`;

    const [, deliveryResult, , sourceLead] = await Promise.all([
      addClientToBrevoList(email, firstName),
      sendTransactionalEmail({
        to: [{ email, name: firstName }],
        subject: 'Your First 90 Days Checklist PDF',
        text: plainEmail(firstName, pdfUrl, workUrl),
        html: htmlEmail(firstName, pdfUrl, workUrl),
      }),
      sendTransactionalEmail({
        to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
        subject: `New lead magnet download - ${firstName}`,
        text: `A visitor requested ${FIRST_90_DAYS_CHECKLIST_FILENAME}.

Name: ${firstName}
Email: ${email}
Source: ${source}
PDF: ${pdfUrl}
`,
      }),
      upsertSourceLead({
        source: 'first_90_days',
        firstName,
        email,
        downloadLink: pdfUrl,
        metadata: {
          originalSource: source,
          asset: FIRST_90_DAYS_CHECKLIST_FILENAME,
        },
      }),
      recordDashboardNotification({
        eventType: 'lead_magnet_download',
        source: 'first-90-days-checklist',
        title: `New lead magnet download - ${firstName}`,
        description: `${firstName} requested ${FIRST_90_DAYS_CHECKLIST_FILENAME}. Source: ${source}.`,
        contactName: firstName,
        contactEmail: email,
        href: `mailto:${email}?subject=${encodeURIComponent('Your First 90 Days Checklist download')}`,
        metadata: {
          asset: FIRST_90_DAYS_CHECKLIST_FILENAME,
          source,
          pdfUrl,
        },
      }),
    ]);

    try {
      await recordSentEmail({
        leadId: sourceLead?.id || null,
        toEmail: email,
        toName: firstName,
        subject: 'Your First 90 Days Checklist PDF',
        body: plainEmail(firstName, pdfUrl, workUrl),
        templateId: 'automated_first_90_days_delivery',
        archetype: 'First 90 Days Checklist',
        serviceInterest: 'Career Clarity Session',
        origin: 'automated',
        externalProvider: deliveryResult?.messageId ? 'brevo' : null,
        externalMessageId: deliveryResult?.messageId || null,
        deliveryStatus: 'sent',
      });
    } catch (logError) {
      console.error('Sent email log write failed', logError);
    }

    return NextResponse.json({ success: true, pdfUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not send the lead magnet.' }, { status: 500 });
  }
}
