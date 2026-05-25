import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { upsertSourceLead } from '@/lib/diagnostic-submissions';
import { recordSentEmail } from '@/lib/sent-emails';
import { getContactEmail, getSiteUrl } from '@/lib/env';

type ReservePayload = {
  fullName?: string;
  email?: string;
  whatsapp?: string;
  focus?: string;
  source?: string;
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
    const payload = (await request.json()) as ReservePayload;
    const fullName = String(payload.fullName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const whatsapp = String(payload.whatsapp || '').trim();
    const focus = String(payload.focus || '').trim();
    const source = String(payload.source || 'masterclass-reserve-form').trim().slice(0, 120);
    const firstName = fullName.split(/\s+/)[0] || 'there';
    const contactEmail = getContactEmail();
    const workUrl = `${getSiteUrl()}/work-with-me#masterclass`;
    const confirmationSubject = 'You are on the Saturday Masterclass reserve list';
    const confirmationText = `Hi ${firstName},

You are on the reserve list for the next Saturday Masterclass. The date is still being confirmed.

What happens next:
1. Coach Kagiso will confirm the next session date.
2. You will get the booking and payment link by email when the booking window opens.
3. You can decide then whether you want to confirm your seat.

For now, no payment is needed from you.

If you want to review the service details again:
${workUrl}

Talk soon,
Coach Kagiso
`;

    if (!fullName || fullName.length > 80 || !/^[\p{L}' -]+$/u.test(fullName)) {
      return NextResponse.json({ error: 'Please provide a valid full name.' }, { status: 400 });
    }

    if (!email || email.length > 120 || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (whatsapp && !isValidPhone(whatsapp)) {
      return NextResponse.json({ error: 'Please provide a valid WhatsApp number.' }, { status: 400 });
    }

    if (!focus || focus.length > 600) {
      return NextResponse.json({ error: 'Please share what you want the masterclass to help you with.' }, { status: 400 });
    }

    const [, , confirmationResult, sourceLead] = await Promise.all([
      addClientToBrevoList(email, fullName),
      sendTransactionalEmail({
        to: [{ email: contactEmail, name: 'Coach Kagiso' }],
        subject: `New Saturday Masterclass reserve request - ${fullName}`,
        text: `A new Saturday Masterclass reserve request has been submitted.

Name: ${fullName}
Email: ${email}
WhatsApp: ${whatsapp || 'Not supplied'}
Source: ${source}
Planned session: Date to be confirmed

What they want help with:
${focus}
`,
        html: emailShell(
          `${fullName} joined the Saturday Masterclass reserve list.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New Saturday Masterclass reserve request.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">This person wants first access when booking opens for the next Saturday Masterclass.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
            ${detailRow('Name', fullName)}
            ${detailRow('Email', email)}
            ${detailRow('WhatsApp', whatsapp || 'Not supplied')}
            ${detailRow('Source', source)}
            ${detailRow('Session', 'Date to be confirmed')}
          </table>
          <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">What they want help with</h2>
          <p style="margin:0;color:#4f5b66;font:15px/1.8 Arial,sans-serif;white-space:pre-line;">${escapeHtml(focus)}</p>`,
        ),
      }),
      sendTransactionalEmail({
        to: [{ email, name: fullName }],
        subject: confirmationSubject,
        text: confirmationText,
        html: emailShell(
          `You are on the Saturday Masterclass reserve list.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">You are on the reserve list, ${escapeHtml(firstName)}.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Your seat interest is noted for the next Saturday Masterclass. The date is still being confirmed.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
            ${detailRow('Session', 'Date to be confirmed')}
            ${detailRow('Booking window', 'Opens when the date is confirmed')}
            ${detailRow('Payment now', 'No payment needed yet')}
          </table>
          <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">What happens next</h2>
          <ol style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
            <li>Coach Kagiso will confirm the next session date.</li>
            <li>You will get the booking and payment link by email when the booking window opens.</li>
            <li>You can decide then whether you want to confirm your seat.</li>
          </ol>
          <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">For now, nothing else is needed from you.</p>
          <p style="margin:22px 0 0;"><a href="${escapeHtml(workUrl)}" style="display:inline-block;background:#142334;color:#ffffff;padding:12px 18px;text-decoration:none;font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;">Review the masterclass</a></p>`,
        ),
      }),
      upsertSourceLead({
        source: 'masterclass_waitlist',
        firstName: fullName,
        email,
        metadata: {
          originalSource: source,
          whatsapp: whatsapp || null,
          focus,
          plannedSession: 'Date to be confirmed',
        },
      }),
      recordDashboardNotification({
        eventType: 'masterclass_reservation',
        source: 'masterclass-reserve-form',
        title: `New masterclass reservation - ${fullName}`,
        description: `${fullName} joined the Saturday Masterclass reserve list. ${whatsapp ? `WhatsApp: ${whatsapp}. ` : ''}Focus: ${focus}`,
        contactName: fullName,
        contactEmail: email,
        href: `mailto:${email}?subject=${encodeURIComponent('Saturday Masterclass reserve list')}`,
        metadata: {
          source,
          whatsapp: whatsapp || null,
          focus,
          plannedSession: 'Date to be confirmed',
        },
      }),
    ]);

    try {
      await recordSentEmail({
        leadId: sourceLead?.id || null,
        toEmail: email,
        toName: fullName,
        subject: confirmationSubject,
        body: confirmationText,
        templateId: 'masterclass_waitlist_confirmation',
        archetype: 'Masterclass Waitlist',
        serviceInterest: 'Saturday Masterclass',
        origin: 'automated',
        externalProvider: confirmationResult?.messageId ? 'brevo' : null,
        externalMessageId: confirmationResult?.messageId || null,
        deliveryStatus: 'sent',
      });
    } catch (logError) {
      console.error('Sent email log write failed', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save your seat request right now.' }, { status: 500 });
  }
}
