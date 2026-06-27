import {
  EMAIL_TEMPLATES,
  getEmailTemplate,
  getTemplateIdForArchetype,
  getTemplateIdForLeadStage,
  type EmailTemplate,
  type EmailTemplateId,
} from '@/lib/email-templates';
import {
  isSequenceRepairResolved,
  type SequenceGapInfo,
  type SequenceRepairStatus,
} from '@/lib/email-sequence-repair';
import { normalizeLeadSource } from '@/lib/lead-sources';

export type EmailTemplateGuardrailLead = {
  archetypeName?: string | null;
  archetypeKey?: string | null;
  followUpCount?: number | null;
  leadStatus?: string | null;
  lastContactedAt?: string | null;
  source?: string | null;
  sequenceRepairStatus?: string | null;
};

export type EmailTemplateGuardrail = {
  sequenceTemplateIds: EmailTemplateId[];
  sentTemplateIds: EmailTemplateId[];
  recommendedTemplateId: EmailTemplateId | null;
  stageTemplateId: EmailTemplateId | null;
  sequenceRepairStatus: SequenceRepairStatus | null;
  sequenceGap: SequenceGapInfo;
  warning: string;
};

function asEmailTemplateId(value?: string | null): EmailTemplateId | null {
  if (!value) return null;
  return EMAIL_TEMPLATES.some((template) => template.id === value) ? value as EmailTemplateId : null;
}

export function getLeadEmailSequenceTemplateIds(lead: EmailTemplateGuardrailLead): EmailTemplateId[] {
  const source = normalizeLeadSource(lead.source);

  if (
    source === 'first_90_days' ||
    source === 'linkedin_headline' ||
    source === 'cv_checklist' ||
    source === 'masterclass_waitlist'
  ) {
    return EMAIL_TEMPLATES
      .filter((template) => template.source === source)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .map((template) => template.id);
  }

  const baseTemplateId = getTemplateIdForArchetype(lead.archetypeName, lead.archetypeKey);
  return [
    baseTemplateId,
    `${baseTemplateId}_follow_up_1`,
    `${baseTemplateId}_follow_up_2`,
    `${baseTemplateId}_newsletter_bridge`,
  ].filter(asEmailTemplateId) as EmailTemplateId[];
}

export function getEmailTemplateGuardrail(
  lead: EmailTemplateGuardrailLead,
  sentTemplateIds: Array<string | null | undefined> = [],
): EmailTemplateGuardrail {
  const sequenceTemplateIds = getLeadEmailSequenceTemplateIds(lead);
  const sequenceSet = new Set(sequenceTemplateIds);
  const sentSet = new Set(
    sentTemplateIds
      .map(asEmailTemplateId)
      .filter((templateId): templateId is EmailTemplateId => Boolean(templateId && sequenceSet.has(templateId))),
  );
  const sentIds = sequenceTemplateIds.filter((templateId) => sentSet.has(templateId));
  const highestSentIndex = sentIds.reduce(
    (highest, templateId) => Math.max(highest, sequenceTemplateIds.indexOf(templateId)),
    -1,
  );
  const firstTemplateId = sequenceTemplateIds[0] || null;
  const firstTemplateSent = Boolean(firstTemplateId && sentSet.has(firstTemplateId));
  const firstLaterSentTemplateId = sentIds.find((templateId) => templateId !== firstTemplateId) || null;
  const sequenceRepairStatus = isSequenceRepairResolved(lead.sequenceRepairStatus)
    ? lead.sequenceRepairStatus
    : null;
  const sequenceGapDetected = Boolean(
    firstTemplateId &&
      firstLaterSentTemplateId &&
      !firstTemplateSent &&
      !sequenceRepairStatus,
  );
  const sequenceGap: SequenceGapInfo = {
    detected: sequenceGapDetected,
    status: sequenceRepairStatus,
    firstTemplateId,
    firstTemplateLabel: firstTemplateId ? getEmailTemplate(firstTemplateId).stageLabel : 'First contact',
    blockingTemplateId: firstLaterSentTemplateId,
    blockingTemplateLabel: firstLaterSentTemplateId ? getEmailTemplate(firstLaterSentTemplateId).stageLabel : '',
    message: sequenceGapDetected
      ? 'First contact was not logged before the sequence advanced.'
      : '',
  };
  const nextFromSentLog = highestSentIndex >= 0 ? sequenceTemplateIds[highestSentIndex + 1] || null : sequenceTemplateIds[0] || null;
  const stageTemplateId = asEmailTemplateId(getTemplateIdForLeadStage({
    archetypeName: lead.archetypeName,
    archetypeKey: lead.archetypeKey,
    followUpCount: lead.followUpCount,
    leadStatus: lead.leadStatus,
    lastContactedAt: lead.lastContactedAt,
    source: lead.source,
  }));
  const recommendedTemplateId =
    sequenceRepairStatus === 'manual'
      ? null
      : sequenceGapDetected
        ? firstTemplateId
        : nextFromSentLog || null;
  const warning =
    sequenceRepairStatus === 'manual'
      ? 'Manual sequence handling is active for this lead.'
      : sequenceGapDetected
        ? 'Sequence gap detected. Send a recovery email before closing the sequence.'
        : stageTemplateId &&
            recommendedTemplateId &&
            stageTemplateId !== recommendedTemplateId &&
            sequenceSet.has(stageTemplateId)
          ? `The CRM stage points to ${getEmailTemplate(stageTemplateId).stageLabel}, but the sent-email log points to ${getEmailTemplate(recommendedTemplateId).stageLabel}.`
          : '';

  return {
    sequenceTemplateIds,
    sentTemplateIds: sentIds,
    recommendedTemplateId,
    stageTemplateId,
    sequenceRepairStatus,
    sequenceGap,
    warning,
  };
}

export function getSelectableLeadEmailTemplates(
  templates: Array<EmailTemplate & { active?: boolean }>,
  lead: EmailTemplateGuardrailLead,
  sentTemplateIds: Array<string | null | undefined> = [],
) {
  const guardrail = getEmailTemplateGuardrail(lead, sentTemplateIds);
  if (guardrail.sequenceRepairStatus === 'manual') return [];
  if (guardrail.sequenceGap.detected && guardrail.sequenceGap.firstTemplateId) {
    return templates
      .filter((template) => template.active !== false)
      .filter((template) => template.id === guardrail.sequenceGap.firstTemplateId);
  }

  const sequenceSet = new Set(guardrail.sequenceTemplateIds);
  const sentSet = new Set(guardrail.sentTemplateIds);

  return templates
    .filter((template) => template.active !== false)
    .filter((template) => sequenceSet.has(template.id))
    .filter((template) => !sentSet.has(template.id))
    .sort((a, b) => guardrail.sequenceTemplateIds.indexOf(a.id) - guardrail.sequenceTemplateIds.indexOf(b.id));
}

export function validateLeadEmailTemplateSelection({
  lead,
  sentTemplateIds = [],
  templateId,
}: {
  lead: EmailTemplateGuardrailLead;
  sentTemplateIds?: Array<string | null | undefined>;
  templateId: string | null;
}) {
  const cleanTemplateId = asEmailTemplateId(templateId);
  if (!cleanTemplateId) {
    return { valid: true, guardrail: getEmailTemplateGuardrail(lead, sentTemplateIds), message: '' };
  }

  const guardrail = getEmailTemplateGuardrail(lead, sentTemplateIds);
  const sequenceSet = new Set(guardrail.sequenceTemplateIds);
  if (!sequenceSet.has(cleanTemplateId)) {
    return {
      valid: false,
      guardrail,
      message: 'This template does not match this lead source or archetype.',
    };
  }

  if (guardrail.sentTemplateIds.includes(cleanTemplateId)) {
    return {
      valid: false,
      guardrail,
      message: 'This template has already been sent to this lead. Choose the next template.',
    };
  }

  if (guardrail.sequenceGap.detected && cleanTemplateId !== guardrail.sequenceGap.firstTemplateId) {
    return {
      valid: false,
      guardrail,
      message: 'Sequence gap detected. Send the recovery email before choosing the next template.',
    };
  }

  if (guardrail.recommendedTemplateId && cleanTemplateId !== guardrail.recommendedTemplateId) {
    const expected = getEmailTemplate(guardrail.recommendedTemplateId);
    return {
      valid: false,
      guardrail,
      message: `Send ${expected.stageLabel} for this lead before choosing another template.`,
    };
  }

  if (!guardrail.recommendedTemplateId) {
    return {
      valid: false,
      guardrail,
      message: 'This lead has already completed the email sequence.',
    };
  }

  return { valid: true, guardrail, message: '' };
}
