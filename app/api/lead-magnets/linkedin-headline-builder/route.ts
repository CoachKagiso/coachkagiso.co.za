import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import {
  LINKEDIN_HEADLINE_BUILDER_FILENAME,
  LINKEDIN_HEADLINE_BUILDER_PATH,
} from '@/lib/linkedin-headline-builder';
import { getContactEmail, getSiteUrl } from '@/lib/env';

type LeadPayload = {
  firstName?: string;
  email?: string;
  source?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainEmail(firstName: string, pdfUrl: string) {
  return `Hi ${firstName},

Here is your copy of The SA LinkedIn Headline Builder:
${pdfUrl}

Use the formula first, then scan the keyword bank for your industry before choosing the closest rewrite.

If you want me to rewrite the full profile for you, the LinkedIn Optimisation service is here:
https://coachkagiso.co.za/work-with-me

Your career matters. Keep elevating.

Coach Kagiso
`;
}

function htmlEmail(firstName: string, pdfUrl: string, workUrl: string) {
  return `
  <div style="margin:0;padding:32px 0;background:#f7f3ef;font-family:Raleway,Arial,Helvetica,sans-serif;color:#142334;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d8c8bb;">
      <div style="padding:40px;background:#142334;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#c9ad98;font-weight:700;">The SA LinkedIn Headline Builder</div>
        <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.04;font-weight:500;">Your download is ready.</h1>
        <p style="margin:18px 0 0;font-size:17px;line-height:1.65;color:#e4d8cb;">39 before-and-after rewrites, the SA recruiter formula, and the keyword bank by industry.</p>
      </div>
      <div style="padding:36px 40px 40px;">
        <p style="margin:0 0 18px;font-size:17px;line-height:1.7;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">Use the formula first, then scan the keyword bank for your industry before choosing the closest rewrite. This is designed as a working document, not a copy-and-paste template.</p>
        <a href="${escapeHtml(pdfUrl)}" style="display:inline-block;background:#142334;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Download the PDF</a>
        <p style="margin:28px 0 0;font-size:16px;line-height:1.75;color:rgba(20,35,52,0.78);">If you want me to rewrite the full profile for you, the LinkedIn Optimisation service covers your headline, About section, experience bullets, skills, and featured section.</p>
        <a href="${escapeHtml(workUrl)}" style="display:inline-block;margin-top:16px;color:#c9ad98;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">View LinkedIn Optimisation</a>
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
    const source = String(payload.source || 'linkedin-headline-builder').trim().slice(0, 120);

    if (!firstName || firstName.length > 50 || !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(firstName)) {
      return NextResponse.json({ error: 'Please provide a valid first name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const siteUrl = getSiteUrl();
    const pdfUrl = `${siteUrl}${LINKEDIN_HEADLINE_BUILDER_PATH}`;
    const workUrl = `${siteUrl}/work-with-me`;

    await Promise.all([
      addClientToBrevoList(email, firstName),
      sendTransactionalEmail({
        to: [{ email, name: firstName }],
        subject: 'Your SA LinkedIn Headline Builder PDF',
        text: plainEmail(firstName, pdfUrl),
        html: htmlEmail(firstName, pdfUrl, workUrl),
      }),
      sendTransactionalEmail({
        to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
        subject: `New lead magnet download - ${firstName}`,
        text: `A visitor requested ${LINKEDIN_HEADLINE_BUILDER_FILENAME}.

Name: ${firstName}
Email: ${email}
Source: ${source}
PDF: ${pdfUrl}
`,
      }),
    ]);

    return NextResponse.json({ success: true, pdfUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not send the lead magnet.' }, { status: 500 });
  }
}
