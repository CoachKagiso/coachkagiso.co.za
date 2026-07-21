import type { AsyncServiceSlug, IntakeField } from './buying-flow';

export const MANUAL_PAYMENT_METHODS = ['eft', 'cash', 'card_machine', 'other'] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export type ManualClientEngagementInput = {
  fullName: unknown;
  email: unknown;
  whatsapp?: unknown;
  serviceSlug: unknown;
  paymentMethod: unknown;
  amount: unknown;
  paidAt: unknown;
  paymentReference?: unknown;
  paymentNotes?: unknown;
  sessionDate?: unknown;
  isTest?: unknown;
  paymentVerified?: unknown;
  intake?: unknown;
};

export type NormalizedManualClientEngagement = {
  fullName: string;
  email: string;
  whatsapp: string;
  serviceSlug: AsyncServiceSlug;
  paymentMethod: ManualPaymentMethod;
  amount: number;
  paidAt: string;
  paymentReference: string;
  paymentNotes: string;
  sessionDate: string | null;
  isTest: boolean;
  intake: Record<string, string>;
};

const PHONE_PATTERN = /^[0-9+() -]{7,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTITY_FIELD_NAMES = new Set(['fullName', 'email', 'whatsapp']);

export type ManualClientServiceDefinition = {
  slug: AsyncServiceSlug;
  requiresCvUpload: boolean;
  fields: IntakeField[];
};

const bookingIntakeFields: Record<'career-clarity' | 'glow-up-vip', IntakeField[]> = {
  'career-clarity': [
    {
      name: 'currentRole',
      label: 'What is their current role and career situation?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'desiredOutcome',
      label: 'What would they like to leave the session clear about?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'biggestBlocker',
      label: 'What feels most stuck or uncertain right now?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'decisionNeeded',
      label: 'What decision or next move are they trying to make?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
  ],
  'glow-up-vip': [
    {
      name: 'currentRole',
      label: 'What is their current role and career situation?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'targetRole',
      label: 'What role, industry, or career move are they targeting?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'linkedinUrl',
      label: 'LinkedIn profile URL',
      type: 'url',
      maxLength: 240,
    },
    {
      name: 'interviewHistory',
      label: 'What has their recent application or interview experience been?',
      type: 'textarea',
      required: true,
      maxLength: 1600,
    },
    {
      name: 'biggestChallenge',
      label: 'What is the biggest challenge they want support with?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
    {
      name: 'thirtyDayOutcome',
      label: 'What should be different by the end of the 30 days?',
      type: 'textarea',
      required: true,
      maxLength: 1200,
    },
  ],
};

function cleanText(value: unknown, maxLength: number, label: string) {
  const cleaned = String(value ?? '').trim();
  if (cleaned.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return cleaned;
}

function readBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'yes' || value === 'on';
}

function normalizeDate(value: unknown, label: string, required: boolean) {
  const raw = String(value ?? '').trim();
  if (!raw && !required) return null;
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date and time.`);
  return date.toISOString();
}

function normalizeUrl(value: string, label: string) {
  if (!value) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('invalid protocol');
    return url.toString();
  } catch {
    throw new Error(`${label} must be a valid web address.`);
  }
}

export function getManualClientIntakeFields(service: ManualClientServiceDefinition) {
  if (service.slug === 'career-clarity' || service.slug === 'glow-up-vip') {
    return bookingIntakeFields[service.slug];
  }

  return service.fields.filter((field) => !IDENTITY_FIELD_NAMES.has(field.name));
}

export function manualClientRequiresCv(service: ManualClientServiceDefinition) {
  return Boolean(
    service.requiresCvUpload ||
      service.slug === 'career-clarity' ||
      service.slug === 'glow-up-vip',
  );
}

export function normalizeManualClientEngagement(
  input: ManualClientEngagementInput,
  service: ManualClientServiceDefinition,
): NormalizedManualClientEngagement {
  const fullName = cleanText(input.fullName, 80, 'Client name');
  const email = cleanText(input.email, 120, 'Client email').toLowerCase();
  const whatsapp = cleanText(input.whatsapp, 30, 'WhatsApp number').replace(/[^0-9+() -]/g, '');
  const serviceSlug = String(input.serviceSlug || '').trim();

  if (fullName.length < 2) throw new Error('Client name is required.');
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid client email address.');
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) throw new Error('Enter a valid WhatsApp number.');
  if (serviceSlug !== service.slug) throw new Error('Choose a valid service.');

  const paymentMethod = String(input.paymentMethod || '').trim() as ManualPaymentMethod;
  if (!MANUAL_PAYMENT_METHODS.includes(paymentMethod)) throw new Error('Choose a valid payment method.');
  if (!readBoolean(input.paymentVerified)) throw new Error('Confirm that the payment has been verified.');

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new Error('Payment amount must be greater than zero and no more than R1,000,000.');
  }

  const paidAt = normalizeDate(input.paidAt, 'Payment date', true) as string;
  if (new Date(paidAt).getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error('Payment date cannot be in the future.');
  }

  const sourceIntake = input.intake && typeof input.intake === 'object' && !Array.isArray(input.intake)
    ? input.intake as Record<string, unknown>
    : {};
  const intake = getManualClientIntakeFields(service).reduce<Record<string, string>>((result, field) => {
    let value = cleanText(sourceIntake[field.name], field.maxLength || 2000, field.label);
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (field.type === 'tel' && value && !PHONE_PATTERN.test(value)) {
      throw new Error(`${field.label} must be a valid phone number.`);
    }
    if (field.type === 'email' && value && !EMAIL_PATTERN.test(value)) {
      throw new Error(`${field.label} must be a valid email address.`);
    }
    if (field.type === 'url') value = normalizeUrl(value, field.label);
    if (field.type === 'radio' && value && !field.options?.includes(value)) {
      throw new Error(`Choose a valid option for ${field.label}.`);
    }
    if (value) result[field.name] = value;
    return result;
  }, {});

  return {
    fullName,
    email,
    whatsapp,
    serviceSlug: service.slug,
    paymentMethod,
    amount: Math.round(amount * 100) / 100,
    paidAt,
    paymentReference: cleanText(input.paymentReference, 120, 'Payment reference'),
    paymentNotes: cleanText(input.paymentNotes, 1000, 'Payment notes'),
    sessionDate: normalizeDate(input.sessionDate, 'Session date', false),
    isTest: readBoolean(input.isTest),
    intake,
  };
}
