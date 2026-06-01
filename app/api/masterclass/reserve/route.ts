import { NextResponse } from 'next/server';
import { addClientToBrevoList, sendTransactionalEmail } from '@/lib/brevo';
import { recordDashboardNotification } from '@/lib/dashboard-notifications';
import { upsertSourceLead } from '@/lib/diagnostic-submissions';
import { recordSentEmail } from '@/lib/sent-emails';
import { getContactEmail } from '@/lib/env';

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
              <td style="padding:34px;">
                <p style="margin:0 0 18px;color:#c5a58e;font:700 12px Arial,sans-serif;letter-spacing:2.4px;text-transform:uppercase;">Coach Kagiso</p>
                ${body}
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
    const confirmationSubject = 'Your spot is being held — here is how to pay';
    const confirmationText = `Hi ${firstName},

Thank you for registering for the July Saturday Masterclass. Your details are in.

To secure your spot, please complete your payment using the banking details below:

Account name: Kagiso Shabangu
Bank: Capitec Bank
Account type: Savings
Account number: 1248602321
Branch code: 470010
Reference: Your full name + JULY

Once your payment reflects, you will receive a confirmation email with everything you need to prepare for the session.

A few things to note:

- Session date: Saturday 4 July 2026
- Time: 10:00 to 12:00 SAST
- Platform: Microsoft Teams
- Price: R450 early bird, valid until Sunday 7 June at 21:00
- Standard price from Monday 8 June: R500
- Spots are capped at 12

If you have any questions before your payment goes through, reply to this email and we will get back to you.

Your career matters. See you on 4 July.

Kagiso Shabangu
Coach Kagiso
hello@coachkagiso.co.za
coachkagiso.co.za
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
        subject: `New Saturday Masterclass registration - ${fullName}`,
        text: `A new Saturday Masterclass registration has been submitted.

Name: ${fullName}
Email: ${email}
WhatsApp: ${whatsapp || 'Not supplied'}
Source: ${source}
Session: Saturday 4 July 2026, 10:00 to 12:00 SAST
Payment status: Awaiting payment

What they want help with:
${focus}
`,
        html: emailShell(
          `${fullName} registered for the July Saturday Masterclass.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New Saturday Masterclass registration.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">This person has registered and should now complete payment to secure their spot.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
            ${detailRow('Name', fullName)}
            ${detailRow('Email', email)}
            ${detailRow('WhatsApp', whatsapp || 'Not supplied')}
            ${detailRow('Source', source)}
            ${detailRow('Session', 'Saturday 4 July 2026, 10:00 to 12:00 SAST')}
            ${detailRow('Payment status', 'Awaiting payment')}
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
          `Your spot is being held for the July Saturday Masterclass.`,
          `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">Your spot is being held, ${escapeHtml(firstName)}.</h1>
          <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Thank you for registering for the July Saturday Masterclass. Your details are in.</p>
          <p style="margin:0 0 18px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">To secure your spot, please complete your payment using the banking details below:</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
            ${detailRow('Account name', 'Kagiso Shabangu')}
            ${detailRow('Bank', 'Capitec Bank')}
            ${detailRow('Account type', 'Savings')}
            ${detailRow('Account number', '1248602321')}
            ${detailRow('Branch code', '470010')}
            ${detailRow('Reference', 'Your full name + JULY')}
          </table>
          <p style="margin:22px 0 0;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">Once your payment reflects, you will receive a confirmation email with everything you need to prepare for the session.</p>
          <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">A few things to note</h2>
          <ul style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
            <li>Session date: Saturday 4 July 2026</li>
            <li>Time: 10:00 to 12:00 SAST</li>
            <li>Platform: Microsoft Teams</li>
            <li>Price: R450 early bird, valid until Sunday 7 June at 21:00</li>
            <li>Standard price from Monday 8 June: R500</li>
            <li>Spots are capped at 12</li>
          </ul>
          <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">If you have any questions before your payment goes through, reply to this email and we will get back to you.</p>
          <p style="margin:24px 0 0;color:#142334;font:16px/1.7 Arial,sans-serif;">Your career matters. See you on 4 July.</p>
          <p style="margin:22px 0 0;color:#142334;font:15px/1.7 Arial,sans-serif;">Kagiso Shabangu<br>Coach Kagiso<br>hello@coachkagiso.co.za<br>coachkagiso.co.za</p>`,
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
          plannedSession: 'Saturday 4 July 2026, 10:00 to 12:00 SAST',
        },
      }),
      recordDashboardNotification({
        eventType: 'masterclass_reservation',
        source: 'masterclass-reserve-form',
        title: `New masterclass registration - ${fullName}`,
        description: `${fullName} registered for the July Saturday Masterclass. ${whatsapp ? `WhatsApp: ${whatsapp}. ` : ''}Focus: ${focus}`,
        contactName: fullName,
        contactEmail: email,
        href: `mailto:${email}?subject=${encodeURIComponent('Saturday Masterclass registration')}`,
        metadata: {
          source,
          whatsapp: whatsapp || null,
          focus,
          plannedSession: 'Saturday 4 July 2026, 10:00 to 12:00 SAST',
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
