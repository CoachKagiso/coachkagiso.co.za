import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { getContactEmail, getSiteUrl } from '@/lib/env';

type ContactPayload = {
  source?: string;
  variant?: 'quick' | 'detailed';
  name?: string;
  email?: string;
  phone?: string;
  support?: string;
  service?: string;
  replyMethod?: string;
  timeline?: string;
  careerStage?: string;
  message?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[0-9+() -]{7,30}$/.test(phone);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;color:#7a858e;font:700 12px Arial,sans-serif;letter-spacing:1.6px;text-transform:uppercase;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;color:#142334;font:15px Arial,sans-serif;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

function emailShell(preheader: string, body: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f1ed;color:#142334;font-family:Georgia,'Times New Roman',serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1ed;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dccdc1;">
            <tr>
              <td style="padding:34px 34px 12px;">
                <p style="margin:0 0 18px;color:#c5a58e;font:700 12px Arial,sans-serif;letter-spacing:2.4px;text-transform:uppercase;">Coach Kagiso</p>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 34px;">
                <p style="margin:28px 0 0;border-top:1px solid #eaded5;padding-top:18px;color:#66727d;font:14px/1.7 Arial,sans-serif;">
                  Need to add anything? Reply to this email or WhatsApp Kagiso directly.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContactPayload;
    const variant = payload.variant === 'detailed' ? 'detailed' : 'quick';
    const source = String(payload.source || 'website-contact').trim().slice(0, 120);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();
    const message = String(payload.message || '').trim();
    const support = String(payload.support || '').trim();
    const service = String(payload.service || '').trim();
    const replyMethod = String(payload.replyMethod || '').trim();
    const timeline = String(payload.timeline || '').trim();
    const careerStage = String(payload.careerStage || '').trim();
    const firstName = name.split(/\s+/)[0] || 'there';
    const contactEmail = getContactEmail();
    const workUrl = `${getSiteUrl()}/work-with-me`;

    if (!name || name.length > 80 || !/^[\p{L}' -]+$/u.test(name)) {
      return NextResponse.json({ error: 'Please provide a valid name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Please provide a valid WhatsApp number.' }, { status: 400 });
    }

    if (!message || message.length > 1200) {
      return NextResponse.json({ error: 'Please tell Kagiso a bit about what you need help with.' }, { status: 400 });
    }

    if (variant === 'quick' && !support) {
      return NextResponse.json({ error: 'Please choose what you need help with.' }, { status: 400 });
    }

    if (variant === 'detailed' && (!replyMethod || !service || !timeline || !careerStage)) {
      return NextResponse.json({ error: 'Please complete the remaining required fields.' }, { status: 400 });
    }

    const adminRows = [
      detailRow('Name', name),
      detailRow('Email', email),
      detailRow('WhatsApp', phone || 'Not supplied'),
      detailRow('Form', variant === 'quick' ? 'Quick enquiry' : 'Detailed contact form'),
      detailRow('Source', source),
      detailRow('Support', support || service || 'Not supplied'),
      ...(replyMethod ? [detailRow('Reply via', replyMethod)] : []),
      ...(timeline ? [detailRow('Timeline', timeline)] : []),
      ...(careerStage ? [detailRow('Career stage', careerStage)] : []),
    ].join('');

    await Promise.all([
      addClientToBrevoList(email, name),
      sendTransactionalEmail({
        to: [{ email: contactEmail, name: 'Coach Kagiso' }],
        subject: `New ${variant === 'quick' ? 'quick enquiry' : 'contact enquiry'} - ${name}`,
        text: `A new contact enquiry has been submitted.

Name: ${name}
Email: ${email}
WhatsApp: ${phone || 'Not supplied'}
Form: ${variant === 'quick' ? 'Quick enquiry' : 'Detailed contact form'}
Source: ${source}
Support: ${support || service || 'Not supplied'}
${replyMethod ? `Reply via: ${replyMethod}\n` : ''}${timeline ? `Timeline: ${timeline}\n` : ''}${careerStage ? `Career stage: ${careerStage}\n` : ''}
Message:
${message}
`,
        html: emailShell(
          `${name} submitted a contact enquiry.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New contact enquiry.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">A visitor has reached out through the ${variant === 'quick' ? 'quick home-page form' : 'full contact form'}.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
            ${adminRows}
          </table>
          <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">Their note</h2>
          <p style="margin:0;color:#4f5b66;font:15px/1.8 Arial,sans-serif;white-space:pre-line;">${escapeHtml(message)}</p>`,
        ),
      }),
      sendTransactionalEmail({
        to: [{ email, name }],
        subject: 'Your message is with Coach Kagiso',
        text: `Hi ${firstName},

Thanks for reaching out. Your message is in, and Kagiso will reply within 24 hours on weekdays.

What happens next:
1. Kagiso reviews your note.
2. If she needs one quick clarification, she will reply directly.
3. If you are still comparing options, you can review the services here:
${workUrl}

Talk soon,
Coach Kagiso
`,
        html: emailShell(
          `Your message is safely with Coach Kagiso.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">Your message is in, ${escapeHtml(firstName)}.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Thank you for reaching out. Kagiso will reply within 24 hours on weekdays.</p>
          <h2 style="margin:0 0 12px;color:#142334;font-size:22px;font-weight:400;">What happens next</h2>
          <ol style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
            <li>Kagiso reviews your note.</li>
            <li>If she needs one quick clarification, she will reply directly.</li>
            <li>If you are still comparing options, you can revisit the service page below.</li>
          </ol>
          <p style="margin:24px 0 0;"><a href="${escapeHtml(workUrl)}" style="display:inline-block;background:#142334;color:#ffffff;padding:12px 18px;text-decoration:none;font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;">View services</a></p>`,
        ),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not send your message right now.' }, { status: 500 });
  }
}
