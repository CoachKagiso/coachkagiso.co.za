import type { AsyncService } from '@/lib/buying-flow';
import { formatCurrency, getDeadlineDate } from '@/lib/buying-flow';
import { getContactEmail } from '@/lib/env';
import { sendTransactionalEmail } from '@/lib/brevo';
import {
  CV_REVIEW_UPGRADE_WINDOW_DAYS,
  ensureCvReviewUpgradeCredit,
  getCvReviewUpgradeCreditByPaymentId,
  getCvRevampUpgradeUrl,
} from '@/lib/upgrade-credits';

type CvDeliveryMethod = 'uploaded' | 'email_after_submit' | 'not_required';

export function formatDeadline(service: AsyncService, from = new Date()) {
  return getDeadlineDate(service.deliveryDays, from).toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
                  Need help? Reply to this email or WhatsApp Kagiso directly.
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

export async function notifyKagisoPayment(input: {
  service: AsyncService;
  name?: string;
  email?: string;
  amount?: number;
  timestamp?: Date;
}) {
  const timestamp = input.timestamp ?? new Date();
  const amount = input.amount ?? input.service.amount;
  const isEventService = input.service.kind === 'event';
  const isAppointmentService = input.service.kind === 'booking';
  const deadline = isEventService || isAppointmentService ? '' : formatDeadline(input.service, timestamp);
  const paymentNextStep = isAppointmentService
    ? 'The accepted appointment is now paid. No additional intake form is required.'
    : isEventService
      ? 'Watch for the prep form before sending final session details.'
      : 'Watch for the intake form before starting delivery.';

  await sendTransactionalEmail({
    to: [
      { email: getContactEmail(), name: 'Coach Kagiso' },
      { email: 'accounts@coachkagiso.co.za', name: 'Coach Kagiso Accounts' },
    ],
    subject: `New payment - ${input.service.title} - ${formatCurrency(amount)}`,
    text: `New payment received.

Name: ${input.name || 'Not supplied'}
Email: ${input.email || 'Not supplied'}
Service: ${input.service.title}
Amount: ${formatCurrency(amount)}
Date: ${timestamp.toISOString()}
${isAppointmentService || isEventService ? `Service: ${input.service.turnaround}` : `Delivery due: ${deadline}`}

${paymentNextStep}
`,
    html: emailShell(
      `New payment received for ${input.service.title}.`,
      `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New payment received.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">${paymentNextStep}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Client', input.name || 'Not supplied')}
        ${detailRow('Email', input.email || 'Not supplied')}
        ${detailRow('Service', input.service.title)}
        ${detailRow('Amount', formatCurrency(amount))}
        ${detailRow(isAppointmentService || isEventService ? 'Service' : 'Delivery due', isAppointmentService || isEventService ? input.service.turnaround : deadline)}
      </table>`,
    ),
  });
}

export async function notifyKagisoIntake(input: {
  service: AsyncService;
  name: string;
  email: string;
  whatsapp?: string;
  formData: Record<string, string>;
  signedCvUrl?: string;
  cvDeliveryMethod: CvDeliveryMethod;
}) {
  const isWaitingForCv = input.cvDeliveryMethod === 'email_after_submit';
  const isEventService = input.service.kind === 'event';
  const deadline = isWaitingForCv || isEventService ? '' : formatDeadline(input.service);
  const responses = Object.entries(input.formData)
    .map(([key, value]) => `${key}: ${value || 'Not supplied'}`)
    .join('\n');
  const responseRows = Object.entries(input.formData)
    .map(([key, value]) => detailRow(key, value || 'Not supplied'))
    .join('');
  const readinessLine = isEventService
    ? `Status: Prep notes received for ${input.service.turnaround}.`
    : isWaitingForCv
    ? 'Status: Waiting for CV by email before work can begin.'
    : 'Status: Ready for review.';
  const cvStatusText = isEventService
    ? 'No CV required for this session.'
    : isWaitingForCv
    ? 'Client chose to email the CV after submitting.'
    : input.signedCvUrl
      ? 'CV uploaded with the brief.'
      : 'No CV required for this service.';
  const cvStatusHtml = isEventService
    ? 'Prep notes are in. Use these responses to shape the live masterclass.'
    : isWaitingForCv
    ? 'Client chose to email the CV after submitting. Turnaround starts once it arrives.'
    : input.signedCvUrl
      ? 'CV uploaded with the brief.'
      : 'No CV required for this service.';

  await sendTransactionalEmail({
    to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
    subject: `${isEventService ? 'Masterclass prep' : 'New intake'} - ${input.service.title} - ${input.name}`,
    text: `A client has submitted their ${isEventService ? 'masterclass prep notes' : 'intake form'}.

Name: ${input.name}
Email: ${input.email}
WhatsApp: ${input.whatsapp || 'Not supplied'}
Service: ${input.service.title}
${readinessLine}
${deadline ? `Delivery due: ${deadline}` : ''}
CV status: ${cvStatusText}

Their responses:
${responses}

${isEventService ? `Session: ${input.service.turnaround}` : `CV download link (valid 7 days):\n${input.signedCvUrl || 'No file uploaded'}`}
`,
    html: emailShell(
      `${input.name} submitted their ${input.service.title} ${isEventService ? 'prep notes' : 'intake brief'}.`,
      `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">${isEventService ? 'Masterclass prep submitted.' : 'New client brief submitted.'}</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">${escapeHtml(
        isEventService
          ? 'The attendee has shared what they want the masterclass to help them think through.'
          : isWaitingForCv
          ? 'The brief is in, but the client still needs to email their CV before work can begin.'
          : 'This is ready for review. The delivery due date below uses the service turnaround from today.',
      )}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Client', input.name)}
        ${detailRow('Email', input.email)}
        ${detailRow('WhatsApp', input.whatsapp || 'Not supplied')}
        ${detailRow('Service', input.service.title)}
        ${detailRow('Status', isEventService ? 'Prep notes received' : isWaitingForCv ? 'Waiting for CV by email' : 'Ready for review')}
        ${isEventService ? detailRow('Session', input.service.turnaround) : detailRow('CV status', cvStatusText)}
        ${deadline ? detailRow('Delivery due', deadline) : ''}
      </table>
      <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">${isEventService ? 'Prep responses' : 'Brief responses'}</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">${responseRows}</table>
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">${escapeHtml(cvStatusHtml)}</p>
      ${isEventService ? '' : `<p style="margin:12px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">CV download link: ${input.signedCvUrl ? `<a href="${escapeHtml(input.signedCvUrl)}" style="color:#142334;">Open file</a>` : 'No file uploaded'}</p>`}`,
    ),
  });
}

export async function sendClientIntakeConfirmation(input: {
  service: AsyncService;
  email: string;
  fullName: string;
  cvDeliveryMethod: CvDeliveryMethod;
  paymentId: string;
}) {
  const firstName = input.fullName.trim().split(/\s+/)[0] || 'there';
  const isWaitingForCv = input.cvDeliveryMethod === 'email_after_submit';
  const isEventService = input.service.kind === 'event';
  const deadline = isWaitingForCv || isEventService ? '' : formatDeadline(input.service);
  const reviewUpgradeCredit = input.service.slug === 'cv-review'
    ? (await getCvReviewUpgradeCreditByPaymentId(input.paymentId)) ||
      (await ensureCvReviewUpgradeCredit({
        paymentId: input.paymentId,
        buyerEmail: input.email,
        buyerName: input.fullName,
      }))
    : null;
  const upgradeLink = reviewUpgradeCredit ? getCvRevampUpgradeUrl(reviewUpgradeCredit.token) : '';
  const text = isEventService
    ? `${input.service.confirmationBody(firstName)}

Quick recap:
- Service: ${input.service.title}
- Session: ${input.service.turnaround}

Thank you for securing your spot.`
    : isWaitingForCv
    ? `Hi ${firstName},

Your brief has been received for ${input.service.title}, but your CV is still needed before Kagiso can begin.

What happens next:
1. Email your CV to ${getContactEmail()} and include your order reference.
2. Kagiso will review your brief and CV together.
3. Your ${input.service.turnaround} turnaround starts once the CV arrives.

If anything is unclear, Kagiso will email you directly.`
    : `${input.service.confirmationBody(firstName)}

Quick recap:
- Service: ${input.service.title}
- Delivery window: ${input.service.turnaround}
- Estimated delivery date: ${deadline}

What happens next:
1. Kagiso reviews your brief and file.
2. If anything is unclear, she will email you directly.
3. Your completed work will be sent back within the delivery window.

Thank you for trusting Coach Kagiso with this work.`;
  const upgradeText =
    reviewUpgradeCredit
      ? `\n\nIf the review makes it clear that you want Kagiso to do the full rewrite, your R150 review fee is already reserved as credit toward the CV Revamp. That means you would only pay the R250 difference within ${CV_REVIEW_UPGRADE_WINDOW_DAYS} days.\n\nUse your personal upgrade link:\n${upgradeLink}`
      : '';

  await sendTransactionalEmail({
    to: [{ email: input.email, name: input.fullName }],
    subject: input.service.confirmationSubject,
    text: `${text}${upgradeText}`,
    html: emailShell(
      isWaitingForCv
        ? `Your ${input.service.title} brief is in. CV still needed.`
        : isEventService
          ? `Your ${input.service.title} prep notes are in.`
          : `Your ${input.service.title} brief is safely submitted.`,
      isWaitingForCv
        ? `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">Your brief is in, ${escapeHtml(firstName)}. CV still needed.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Thank you for submitting your brief for ${escapeHtml(input.service.title)}. Kagiso can begin as soon as your CV arrives.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Service', input.service.title)}
        ${detailRow('Turnaround', input.service.turnaround)}
        ${detailRow('Status', 'Waiting for your CV by email')}
      </table>
      <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">What happens next</h2>
      <ol style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
        <li>Email your CV to ${escapeHtml(getContactEmail())} and include your order reference.</li>
        <li>Kagiso reviews your brief and CV together.</li>
        <li>Your ${escapeHtml(input.service.turnaround)} turnaround starts once the CV arrives.</li>
      </ol>
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">Once your CV is in, there is nothing else you need to resend unless Kagiso asks for one quick clarification.</p>`
        : isEventService
          ? `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">You're in, ${escapeHtml(firstName)}.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Your prep notes for ${escapeHtml(input.service.title)} are safely submitted.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Service', input.service.title)}
        ${detailRow('Session', input.service.turnaround)}
        ${detailRow('Status', 'Seat secured and prep notes received')}
      </table>
      <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">What happens next</h2>
      <ol style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
        <li>Your Microsoft Teams link and prep details will arrive before the session.</li>
        <li>Bring a notebook and the honest version of what feels stuck.</li>
        <li>After the masterclass, you will receive the take-home pack and follow-up material.</li>
      </ol>
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">If anything changes before the session, reply to this email or WhatsApp Kagiso with your payment reference.</p>`
        : `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">Your brief is safely in, ${escapeHtml(firstName)}.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">Thank you for trusting Coach Kagiso with your ${escapeHtml(input.service.title)}. Your delivery window starts now that the brief is submitted.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Service', input.service.title)}
        ${detailRow('Turnaround', input.service.turnaround)}
        ${detailRow('Estimated delivery', deadline)}
      </table>
      <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">What happens next</h2>
      <ol style="margin:0;padding-left:20px;color:#4f5b66;font:15px/1.8 Arial,sans-serif;">
        <li>Kagiso reviews your brief and file.</li>
        <li>If anything is unclear, she will email you directly.</li>
        <li>Your completed work will be sent back within the delivery window.</li>
      </ol>
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">You do not need to resubmit anything unless Kagiso asks for a quick clarification.</p>
      ${reviewUpgradeCredit ? `<div style="margin:28px 0 0;border:1px solid #dccdc1;background:#f7f1ec;padding:18px;">
      <p style="margin:0;color:#c5a58e;font:700 12px Arial,sans-serif;letter-spacing:1.8px;text-transform:uppercase;">Optional next step</p>
      <p style="margin:12px 0 0;color:#142334;font:16px/1.7 Arial,sans-serif;">If the review makes it clear that you want Kagiso to do the full rewrite, your R150 review fee is already reserved as credit toward the CV Revamp. You would only pay the R250 difference within ${CV_REVIEW_UPGRADE_WINDOW_DAYS} days.</p>
      <p style="margin:14px 0 0;"><a href="${escapeHtml(upgradeLink)}" style="display:inline-block;background:#142334;color:#ffffff;padding:12px 18px;text-decoration:none;font:700 12px Arial,sans-serif;letter-spacing:1.4px;text-transform:uppercase;">Use your upgrade link</a></p>
      </div>` : ''}`,
    ),
  });
}
