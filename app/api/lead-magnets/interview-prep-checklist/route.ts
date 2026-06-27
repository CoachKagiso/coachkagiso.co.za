import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { upsertSourceLead } from '@/lib/diagnostic-submissions';
import { recordSentEmail } from '@/lib/sent-emails';
import {
  INTERVIEW_PREP_CHECKLIST_FILENAME,
  INTERVIEW_PREP_CHECKLIST_PATH,
} from '@/lib/interview-prep-checklist';
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

Here is your copy of The Interview Prep Checklist:
${pdfUrl}

It is a readiness self-audit, not an answer bank. Work through the fifteen checks, tick a green, amber, or red light for each, then count your reds at the end. That number tells you how ready you are, and what to prepare first.

If you would like to prepare properly, that is what I do. I help people get interview-ready, from the examples they tell to the way they handle the hard questions:
${workUrl}

And if you reply and tell me your score, I read those myself.

Your career matters. Keep elevating.

Coach Kagiso
`;
}

function htmlEmail(firstName: string, pdfUrl: string, workUrl: string) {
  return `
  <div style="margin:0;padding:32px 0;background:#f7f3ef;font-family:Raleway,Arial,Helvetica,sans-serif;color:#142334;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8c8bb;">
      <div style="padding:40px;background:#142334;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#c9ad98;font-weight:700;">The Interview Prep Checklist</div>
        <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.04;font-weight:500;">Your readiness self-audit is ready.</h1>
        <p style="margin:18px 0 0;font-size:17px;line-height:1.65;color:#e4d8cb;">Fifteen checks that tell you if you are ready before you walk in, scored with a simple green, amber, red system in about ten minutes.</p>
      </div>
      <div style="padding:36px 40px 40px;">
        <p style="margin:0 0 18px;font-size:17px;line-height:1.7;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">Work through the fifteen checks, tick a light for each, then count your reds at the end. That number tells you exactly what to prepare first.</p>
        <a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#142334;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Download the PDF</a>
        <p style="margin:28px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">If you would like to prepare properly, that is what I do. I help people get interview-ready, from the examples they tell to the way they handle the hard questions.</p>
        <a href="${escapeHtml(workUrl)}" style="display:inline-block;margin-top:16px;color:#c9ad98;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">See how to work with me</a>
        <p style="margin:30px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">Reply and tell me your score. I read those myself. Your career matters. Keep elevating.</p>
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
    const source = String(payload.source || 'interview-prep-checklist').trim().slice(0, 120);

    if (!firstName || firstName.length > 50 || !isValidFirstName(firstName)) {
      return NextResponse.json({ error: 'Please provide a valid first name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    const pdfUrl = `${siteUrl}${INTERVIEW_PREP_CHECKLIST_PATH}`;
    const workUrl = `${siteUrl}/work-with-me`;

    const [, deliveryResult, , sourceLead] = await Promise.all([
      addClientToBrevoList(email, firstName),
      sendTransactionalEmail({
        to: [{ email, name: firstName }],
        subject: 'Your Interview Prep Checklist PDF',
        text: plainEmail(firstName, pdfUrl, workUrl),
        html: htmlEmail(firstName, pdfUrl, workUrl),
      }),
      sendTransactionalEmail({
        to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
        subject: `New lead magnet download - ${firstName}`,
        text: `A visitor requested ${INTERVIEW_PREP_CHECKLIST_FILENAME}.

Name: ${firstName}
Email: ${email}
Source: ${source}
PDF: ${pdfUrl}
`,
      }),
      upsertSourceLead({
        source: 'interview_prep',
        firstName,
        email,
        downloadLink: pdfUrl,
        metadata: {
          originalSource: source,
          asset: INTERVIEW_PREP_CHECKLIST_FILENAME,
        },
      }),
      recordDashboardNotification({
        eventType: 'lead_magnet_download',
        source: 'interview-prep-checklist',
        title: `New lead magnet download - ${firstName}`,
        description: `${firstName} requested ${INTERVIEW_PREP_CHECKLIST_FILENAME}. Source: ${source}.`,
        contactName: firstName,
        contactEmail: email,
        href: `mailto:${email}?subject=${encodeURIComponent('Your Interview Prep Checklist download')}`,
        metadata: {
          asset: INTERVIEW_PREP_CHECKLIST_FILENAME,
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
        subject: 'Your Interview Prep Checklist PDF',
        body: plainEmail(firstName, pdfUrl, workUrl),
        templateId: 'automated_interview_prep_delivery',
        archetype: 'Interview Prep Checklist',
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
