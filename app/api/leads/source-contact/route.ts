import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized, updateDiagnosticSubmissionCrm, upsertSourceLead } from '@/lib/diagnostic-submissions';
import { markDashboardNotificationRead } from '@/lib/dashboard-notifications';
import type { EmailTemplateId } from '@/lib/email-templates';
import { getFollowUpScheduleAfterSend, getLeadStatusAfterSend } from '@/lib/lead-contact-schedule';
import { isDiagnosticLeadSource, type DiagnosticLeadSource } from '@/lib/lead-sources';

export const dynamic = 'force-dynamic';

function cleanText(value: unknown, fallback = '') {
  return String(value || fallback).trim();
}

function getSentAt(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getFirstName(value: unknown, email: string) {
  const name = cleanText(value);
  return name || email.split('@')[0] || 'Lead';
}

function isSourceLeadSource(value: string): value is Exclude<DiagnosticLeadSource, 'diagnostic'> {
  return isDiagnosticLeadSource(value) && value !== 'diagnostic';
}

function isExpectedSourceSchemaGap(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return ['source', 'download_link', 'follow_up_count', 'schema cache'].some((part) => message.includes(part));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = cleanText(body?.key);

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = cleanText(body?.email).toLowerCase();
  const source = cleanText(body?.source);
  const notificationId = cleanText(body?.notificationId);
  const templateId = body?.templateId ? (String(body.templateId) as EmailTemplateId) : null;
  const sentAt = getSentAt(body?.sentAt);

  if (!email || !isSourceLeadSource(source)) {
    return NextResponse.json({ error: 'Source lead email and source are required.' }, { status: 400 });
  }

  let submission = null;
  let sourceLeadReady = false;

  try {
    submission = await upsertSourceLead({
      source,
      firstName: getFirstName(body?.firstName, email),
      email,
      downloadLink: cleanText(body?.downloadLink) || null,
      metadata: {
        dashboardContactedAt: sentAt.toISOString(),
        dashboardTemplateId: templateId,
      },
    });

    if (submission?.id) {
      const hadPriorContact = submission.lead_status === 'contacted' || Boolean(submission.last_contacted_at);
      const followUpSchedule = getFollowUpScheduleAfterSend(
        submission.follow_up_count ?? 0,
        templateId,
        sentAt,
        hadPriorContact
      );
      const nextLeadStatus = getLeadStatusAfterSend('contacted', templateId);

      await updateDiagnosticSubmissionCrm(submission.id, {
        lead_status: nextLeadStatus,
        follow_up_count: followUpSchedule.follow_up_count,
        next_follow_up_at: followUpSchedule.next_follow_up_at,
        last_contacted_at: sentAt.toISOString(),
      });

      submission = {
        ...submission,
        lead_status: nextLeadStatus,
        follow_up_count: followUpSchedule.follow_up_count,
        next_follow_up_at: followUpSchedule.next_follow_up_at,
        last_contacted_at: sentAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
      sourceLeadReady = true;
    }
  } catch (error) {
    if (!isExpectedSourceSchemaGap(error)) throw error;
  }

  const notificationReviewed = notificationId ? await markDashboardNotificationRead(notificationId) : false;

  return NextResponse.json({
    success: true,
    sourceLeadReady,
    notificationReviewed,
    submission,
  });
}
