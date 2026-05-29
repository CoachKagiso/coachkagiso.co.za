import type { EmailTemplateId } from '@/lib/email-templates';

export const sequenceRepairStatuses = ['recovery_sent', 'resolved', 'manual'] as const;

export type SequenceRepairStatus = (typeof sequenceRepairStatuses)[number];
export type SequenceRepairAction = SequenceRepairStatus;

export type SequenceGapInfo = {
  detected: boolean;
  status: SequenceRepairStatus | null;
  firstTemplateId: EmailTemplateId | null;
  firstTemplateLabel: string;
  blockingTemplateId: EmailTemplateId | null;
  blockingTemplateLabel: string;
  message: string;
};

export function isSequenceRepairStatus(value?: string | null): value is SequenceRepairStatus {
  return Boolean(value && sequenceRepairStatuses.includes(value as SequenceRepairStatus));
}

export function isSequenceRepairResolved(value?: string | null) {
  return isSequenceRepairStatus(value);
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripEmailWrapper(body: string, firstName: string) {
  const namePattern = firstName ? escapeRegExp(firstName) : '[^\\n,]+';
  return body
    .replace(new RegExp(`^Hi\\s+${namePattern},\\s*`, 'i'), '')
    .replace(/\n+Kagiso\s*\nhello@coachkagiso\.co\.za\s*$/i, '')
    .trim();
}

export function buildRecoveryEmailDraft({
  firstName,
  firstContactBody,
}: {
  firstName: string;
  firstContactBody: string;
}) {
  const cleanName = firstName.trim().split(/\s+/)[0] || 'there';
  const coreBody = stripEmailWrapper(firstContactBody, cleanName);

  return {
    subject: `Let me restart that properly, ${cleanName}`,
    body: `Hi ${cleanName},

I realised my last email may have landed without enough context.

I had gone through your diagnostic and wanted to ask you something properly.

${coreBody}

Kagiso
hello@coachkagiso.co.za`,
  };
}

export function getSequenceRepairNote(action: SequenceRepairAction) {
  if (action === 'recovery_sent') {
    return 'Sequence repaired. Recovery email sent in place of first contact. Next suggested: Third contact when appropriate.';
  }

  if (action === 'resolved') {
    return 'Sequence repaired. Gap marked resolved. Next suggested: Third contact when appropriate.';
  }

  return 'Sequence repair set to manual handling. Automated sequence suggestions removed for this lead.';
}
