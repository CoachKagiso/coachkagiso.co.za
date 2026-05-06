import type { AsyncService } from '@/lib/buying-flow';
import { formatCurrency, getDeadlineDate } from '@/lib/buying-flow';
import { getContactEmail } from '@/lib/env';
import { sendTransactionalEmail } from '@/lib/brevo';

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
  timestamp?: Date;
}) {
  const timestamp = input.timestamp ?? new Date();
  const deadline = formatDeadline(input.service, timestamp);

  await sendTransactionalEmail({
    to: [
      { email: getContactEmail(), name: 'Coach Kagiso' },
      { email: 'accounts@coachkagiso.co.za', name: 'Coach Kagiso Accounts' },
    ],
    subject: `New payment - ${input.service.title} - ${formatCurrency(input.service.amount)}`,
    text: `New payment received.

Name: ${input.name || 'Not supplied'}
Email: ${input.email || 'Not supplied'}
Service: ${input.service.title}
Amount: ${formatCurrency(input.service.amount)}
Date: ${timestamp.toISOString()}
Delivery due: ${deadline}

Watch for the intake form before starting delivery.
`,
    html: emailShell(
      `New payment received for ${input.service.title}.`,
      `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New payment received.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">The order is paid. Watch for the intake form before starting delivery.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Client', input.name || 'Not supplied')}
        ${detailRow('Email', input.email || 'Not supplied')}
        ${detailRow('Service', input.service.title)}
        ${detailRow('Amount', formatCurrency(input.service.amount))}
        ${detailRow('Delivery due', deadline)}
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
}) {
  const deadline = formatDeadline(input.service);
  const responses = Object.entries(input.formData)
    .map(([key, value]) => `${key}: ${value || 'Not supplied'}`)
    .join('\n');
  const responseRows = Object.entries(input.formData)
    .map(([key, value]) => detailRow(key, value || 'Not supplied'))
    .join('');

  await sendTransactionalEmail({
    to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
    subject: `New intake - ${input.service.title} - ${input.name}`,
    text: `A client has submitted their intake form.

Name: ${input.name}
Email: ${input.email}
WhatsApp: ${input.whatsapp || 'Not supplied'}
Service: ${input.service.title}
Delivery due: ${deadline}

Their responses:
${responses}

CV download link (valid 7 days):
${input.signedCvUrl || 'No file uploaded'}
`,
    html: emailShell(
      `${input.name} submitted their ${input.service.title} intake brief.`,
      `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">New client brief submitted.</h1>
      <p style="margin:16px 0 24px;color:#4f5b66;font:16px/1.7 Arial,sans-serif;">This is ready for review. The delivery due date below uses the service turnaround from today.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">
        ${detailRow('Client', input.name)}
        ${detailRow('Email', input.email)}
        ${detailRow('WhatsApp', input.whatsapp || 'Not supplied')}
        ${detailRow('Service', input.service.title)}
        ${detailRow('Delivery due', deadline)}
      </table>
      <h2 style="margin:28px 0 12px;color:#142334;font-size:22px;font-weight:400;">Brief responses</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eaded5;border-bottom:1px solid #eaded5;">${responseRows}</table>
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">CV download link: ${input.signedCvUrl ? `<a href="${escapeHtml(input.signedCvUrl)}" style="color:#142334;">Open file</a>` : 'No file uploaded'}</p>`,
    ),
  });
}

export async function sendClientIntakeConfirmation(input: {
  service: AsyncService;
  email: string;
  fullName: string;
}) {
  const firstName = input.fullName.trim().split(/\s+/)[0] || 'there';
  const deadline = formatDeadline(input.service);
  const text = `${input.service.confirmationBody(firstName)}

Quick recap:
- Service: ${input.service.title}
- Delivery window: ${input.service.turnaround}
- Estimated delivery date: ${deadline}

What happens next:
1. Kagiso reviews your brief and file.
2. If anything is unclear, she will email you directly.
3. Your completed work will be sent back within the delivery window.

Thank you for trusting Coach Kagiso with this work.`;

  await sendTransactionalEmail({
    to: [{ email: input.email, name: input.fullName }],
    subject: input.service.confirmationSubject,
    text,
    html: emailShell(
      `Your ${input.service.title} brief is safely submitted.`,
      `<h1 style="margin:0;color:#142334;font-size:34px;line-height:1.05;font-weight:400;">Your brief is safely in, ${escapeHtml(firstName)}.</h1>
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
      <p style="margin:24px 0 0;color:#4f5b66;font:15px/1.7 Arial,sans-serif;">You do not need to resubmit anything unless Kagiso asks for a quick clarification.</p>`,
    ),
  });
}
