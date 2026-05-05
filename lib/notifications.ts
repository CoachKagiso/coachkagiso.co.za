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

export async function notifyKagisoPayment(input: {
  service: AsyncService;
  name?: string;
  email?: string;
  timestamp?: Date;
}) {
  const timestamp = input.timestamp ?? new Date();
  await sendTransactionalEmail({
    to: [
      { email: getContactEmail(), name: 'Coach Kagiso' },
      { email: 'accounts@coachkagiso.co.za', name: 'Coach Kagiso Accounts' },
    ],
    subject: `New Payment — ${input.service.title} — ${formatCurrency(input.service.amount)}`,
    text: `New payment received.\n\nName: ${input.name || 'Not supplied'}\nEmail: ${input.email || 'Not supplied'}\nService: ${input.service.title}\nAmount: ${formatCurrency(input.service.amount)}\nDate: ${timestamp.toISOString()}\nDelivery due: ${formatDeadline(input.service, timestamp)}\n`,
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
  const responses = Object.entries(input.formData)
    .map(([key, value]) => `${key}: ${value || 'Not supplied'}`)
    .join('\n');

  await sendTransactionalEmail({
    to: [{ email: getContactEmail(), name: 'Coach Kagiso' }],
    subject: `New Intake — ${input.service.title} — ${input.name}`,
    text: `A client has submitted their intake form.\n\nName: ${input.name}\nEmail: ${input.email}\nWhatsApp: ${input.whatsapp || 'Not supplied'}\nService: ${input.service.title}\nDelivery due: ${formatDeadline(input.service)}\n\nTheir responses:\n${responses}\n\nCV download link (valid 7 days):\n${input.signedCvUrl || 'No file uploaded'}\n`,
  });
}

export async function sendClientIntakeConfirmation(input: {
  service: AsyncService;
  email: string;
  fullName: string;
}) {
  const firstName = input.fullName.trim().split(/\s+/)[0] || 'there';
  await sendTransactionalEmail({
    to: [{ email: input.email, name: input.fullName }],
    subject: input.service.confirmationSubject,
    text: input.service.confirmationBody(firstName),
  });
}
