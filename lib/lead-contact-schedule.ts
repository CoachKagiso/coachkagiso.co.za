import type { DiagnosticLeadStatus } from '@/lib/diagnostic-submissions';
import {
  isFollowUpOneTemplate,
  isFollowUpTwoTemplate,
  isMasterclassBookingsOpenTemplate,
  isNewsletterBridgeTemplate,
} from '@/lib/email-templates';
import { addSastDaysAsDateKey } from '@/lib/follow-up-utils';

function addDaysAsDateString(value: Date, days: number) {
  return addSastDaysAsDateKey(value, days);
}

export function getFollowUpScheduleAfterSend(
  currentFollowUpCount: number,
  templateId: string | null,
  now: Date,
  hasPriorContact = false,
  source?: string | null
) {
  if (isMasterclassBookingsOpenTemplate(templateId)) {
    return {
      follow_up_count: 1,
      next_follow_up_at: null,
    };
  }

  if (isNewsletterBridgeTemplate(templateId)) {
    return {
      follow_up_count: 3,
      next_follow_up_at: null,
    };
  }

  if (source === 'masterclass_waitlist') {
    return {
      follow_up_count: currentFollowUpCount,
      next_follow_up_at: null,
    };
  }

  if (isFollowUpTwoTemplate(templateId)) {
    return {
      follow_up_count: 2,
      next_follow_up_at: addDaysAsDateString(now, 2),
    };
  }

  if (isFollowUpOneTemplate(templateId)) {
    return {
      follow_up_count: 1,
      next_follow_up_at: addDaysAsDateString(
        now,
        source === 'first_90_days' || source === 'linkedin_headline' ? 5 : 6
      ),
    };
  }

  if (!templateId && hasPriorContact) {
    const nextFollowUpCount = currentFollowUpCount <= 0 ? 1 : currentFollowUpCount === 1 ? 2 : 3;
    return {
      follow_up_count: nextFollowUpCount,
      next_follow_up_at:
        nextFollowUpCount >= 3
          ? null
          : addDaysAsDateString(
              now,
              source === 'first_90_days' || source === 'linkedin_headline'
                ? 5
                : nextFollowUpCount === 1
                  ? 6
                  : 2
            ),
    };
  }

  return {
    follow_up_count: currentFollowUpCount,
    next_follow_up_at: addDaysAsDateString(
      now,
      source === 'first_90_days' || source === 'linkedin_headline' ? 5 : 4
    ),
  };
}

export function getLeadStatusAfterSend(
  fallbackStatus: DiagnosticLeadStatus,
  templateId: string | null
): DiagnosticLeadStatus {
  return isNewsletterBridgeTemplate(templateId) ? 'nurture' : fallbackStatus;
}
