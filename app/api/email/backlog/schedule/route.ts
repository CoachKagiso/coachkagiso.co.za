import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createNote } from '@/lib/dashboard-task-records';
import {
  getDiagnosticSubmissionById,
  isDiagnosticAdminAuthorized,
  updateDiagnosticSubmissionCrm,
} from '@/lib/diagnostic-submissions';
import { buildEmailBacklog, type EmailBacklogItem } from '@/lib/email-backlog';
import { buildEmailHistoryNote } from '@/lib/email-history-note';
import { getEmailTemplate, getEmailTemplateOptionLabel } from '@/lib/email-templates';
import { plainTextToEmailHtml } from '@/lib/email-template-render';
import {
  DEFAULT_BACKLOG_EMAILS_PER_WINDOW,
  planBacklogSendSchedule,
} from '@/lib/email-send-windows';
import { dispatchLeadEmail } from '@/lib/lead-email-dispatch';
import { getFollowUpScheduleAfterSend, getLeadStatusAfterSend } from '@/lib/lead-contact-schedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BATCH_SIZE = 40;

type ScheduleRequestItem = {
  leadId: string;
  subject?: string;
  body?: string;
  scheduledAt?: string;
};

type ScheduleOutcome = {
  leadId: string;
  firstName: string;
  email: string;
  stageLabel: string;
  scheduledAt: string | null;
  status: 'scheduled' | 'skipped';
  reason?: string;
};

function normalizeRequestItems(value: unknown): ScheduleRequestItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_BATCH_SIZE)
    .map((item) => ({
      leadId: String(item?.leadId || '').trim(),
      subject: typeof item?.subject === 'string' ? item.subject.trim() : undefined,
      body: typeof item?.body === 'string' ? item.body.trim() : undefined,
      scheduledAt: typeof item?.scheduledAt === 'string' ? item.scheduledAt.trim() : undefined,
    }))
    .filter((item) => Boolean(item.leadId));
}

function parseScheduledAt(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) return null;
  return parsed;
}

// Mirrors the single-send flow in LeadEmailModal: the lead moves to contacted as
// soon as the email is queued, so the backlog does not resurface it before it sends.
async function markLeadContacted(item: EmailBacklogItem) {
  const contactedAt = new Date();
  const existing = await getDiagnosticSubmissionById(item.leadId);
  const followUpSchedule = getFollowUpScheduleAfterSend(
    existing?.follow_up_count ?? item.followUpCount,
    item.templateId,
    contactedAt,
    existing?.lead_status === 'contacted' || Boolean(existing?.last_contacted_at),
    existing?.source ?? item.source,
  );

  await updateDiagnosticSubmissionCrm(item.leadId, {
    lead_status: getLeadStatusAfterSend('contacted', item.templateId),
    follow_up_count: followUpSchedule.follow_up_count,
    next_follow_up_at: followUpSchedule.next_follow_up_at,
    last_contacted_at: contactedAt.toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestedItems = normalizeRequestItems(body?.items);
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: 'No leads were supplied to schedule.' }, { status: 400 });
  }

  const perWindow = Number.isFinite(Number(body?.perWindow))
    ? Math.max(1, Math.min(Math.floor(Number(body.perWindow)), 20))
    : DEFAULT_BACKLOG_EMAILS_PER_WINDOW;

  // The backlog is rebuilt server-side so the template, subject, and stage are
  // never taken on trust from the chat client.
  const backlog = await buildEmailBacklog();
  const backlogById = new Map(backlog.items.map((item) => [item.leadId, item]));

  const now = new Date();
  const autoSchedule = planBacklogSendSchedule(requestedItems.length, now, perWindow);
  const results: ScheduleOutcome[] = [];
  let autoIndex = 0;

  for (const requested of requestedItems) {
    const item = backlogById.get(requested.leadId);

    if (!item) {
      results.push({
        leadId: requested.leadId,
        firstName: '',
        email: '',
        stageLabel: '',
        scheduledAt: null,
        status: 'skipped',
        reason: 'This lead is no longer in the follow-up backlog.',
      });
      continue;
    }

    if (item.blocked || !item.templateId) {
      results.push({
        leadId: item.leadId,
        firstName: item.firstName,
        email: item.email,
        stageLabel: item.stageLabel,
        scheduledAt: null,
        status: 'skipped',
        reason: item.blockedReason || 'This lead needs to be handled by hand.',
      });
      continue;
    }

    const scheduledAt = parseScheduledAt(requested.scheduledAt) || autoSchedule[autoIndex] || null;
    autoIndex += 1;

    if (!scheduledAt) {
      results.push({
        leadId: item.leadId,
        firstName: item.firstName,
        email: item.email,
        stageLabel: item.stageLabel,
        scheduledAt: null,
        status: 'skipped',
        reason: 'No valid send window was available.',
      });
      continue;
    }

    const subject = requested.subject || item.subject;
    const plainTextBody = requested.body || item.body;

    const dispatch = await dispatchLeadEmail({
      to: item.email,
      toName: item.firstName || item.email,
      subject,
      htmlContent: plainTextToEmailHtml(plainTextBody),
      plainTextBody,
      leadId: item.leadId,
      templateId: item.templateId,
      archetype: item.archetype,
      serviceInterest: item.serviceInterest,
      scheduledAt,
      origin: 'assistant_backlog',
    });

    if (!dispatch.ok) {
      results.push({
        leadId: item.leadId,
        firstName: item.firstName,
        email: item.email,
        stageLabel: item.stageLabel,
        scheduledAt: null,
        status: 'skipped',
        reason: dispatch.error,
      });
      continue;
    }

    try {
      await markLeadContacted(item);
    } catch (error) {
      console.error('Backlog lead update failed', { leadId: item.leadId, error });
    }

    try {
      await createNote({
        body: buildEmailHistoryNote({
          subject,
          templateLabel: getEmailTemplateOptionLabel(getEmailTemplate(item.templateId)),
          recipientEmail: item.email,
          scheduledAt,
        }),
        linkedTaskId: null,
        linkedLeadId: item.leadId,
        linkedPaymentId: null,
      });
    } catch (error) {
      console.error('Backlog history note failed', { leadId: item.leadId, error });
    }

    results.push({
      leadId: item.leadId,
      firstName: item.firstName,
      email: item.email,
      stageLabel: item.stageLabel,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
    });
  }

  revalidatePath('/resources/career-diagnostic/submissions');

  return NextResponse.json({
    scheduled: results.filter((result) => result.status === 'scheduled').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    results,
  });
}
