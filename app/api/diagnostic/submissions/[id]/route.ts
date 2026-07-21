import { NextResponse } from 'next/server';
import {
  deleteDiagnosticSubmission,
  getDiagnosticSubmissionById,
  isDiagnosticAdminAuthorized,
  isDiagnosticLeadStatus,
  updateDiagnosticSubmissionCrm,
} from '@/lib/diagnostic-submissions';
import type { EmailTemplateId } from '@/lib/email-templates';
import { getFollowUpScheduleAfterSend, getLeadStatusAfterSend } from '@/lib/lead-contact-schedule';
import { isPastDateKey, shouldClearNextFollowUp } from '@/lib/follow-up-utils';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function redirectWithStatus(
  redirectTo: string,
  requestUrl: string,
  status: 'updated' | 'deleted' | 'crm-schema' | 'unauthorized' | 'invalid'
) {
  const url = new URL(redirectTo || '/resources/career-diagnostic/submissions', requestUrl);
  url.searchParams.set(status === 'updated' || status === 'deleted' ? 'updated' : 'error', status);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const formData = await request.formData();
  const key = String(formData.get('key') || '');
  const redirectTo = String(formData.get('redirectTo') || `/resources/career-diagnostic/submissions/${id}`);

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return redirectWithStatus(redirectTo, request.url, 'unauthorized');
  }

  const intent = String(formData.get('intent') || 'save');
  const confirmDelete = String(formData.get('confirm_delete') || '');
  const leadStatus = String(formData.get('lead_status') || '');
  const leadNotes = String(formData.get('lead_notes') || '').trim();
  const nextFollowUpAt = String(formData.get('next_follow_up_at') || '').trim();

  try {
    if (intent === 'delete') {
      if (confirmDelete !== id) {
        return redirectWithStatus(redirectTo, request.url, 'invalid');
      }

      await deleteDiagnosticSubmission(id);
      return redirectWithStatus(redirectTo, request.url, 'deleted');
    }

    const nextLeadStatus = isDiagnosticLeadStatus(leadStatus) ? leadStatus : undefined;
    const clearNextFollowUp = shouldClearNextFollowUp(nextLeadStatus);
    if (!clearNextFollowUp && nextFollowUpAt && isPastDateKey(nextFollowUpAt)) {
      return redirectWithStatus(redirectTo, request.url, 'invalid');
    }

    const existing = intent === 'mark_contacted' ? await getDiagnosticSubmissionById(id) : null;
    const contactedAt = new Date();
    const followUpSchedule =
      intent === 'mark_contacted'
        ? getFollowUpScheduleAfterSend(
            existing?.follow_up_count ?? 0,
            null,
            contactedAt,
            existing?.lead_status === 'contacted' || Boolean(existing?.last_contacted_at),
            existing?.source
          )
        : null;

    await updateDiagnosticSubmissionCrm(id, {
      lead_status:
        intent === 'mark_contacted'
          ? 'contacted'
          : nextLeadStatus,
      lead_notes: intent === 'mark_contacted' ? undefined : leadNotes || null,
      follow_up_count: followUpSchedule?.follow_up_count,
      next_follow_up_at: intent === 'mark_contacted' ? followUpSchedule?.next_follow_up_at : clearNextFollowUp ? null : nextFollowUpAt || null,
      last_contacted_at: intent === 'mark_contacted' ? contactedAt.toISOString() : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      ['lead_status', 'lead_notes', 'follow_up_count', 'next_follow_up_at', 'last_contacted_at', 'updated_at'].some((column) =>
        message.includes(column)
      )
    ) {
      return redirectWithStatus(redirectTo, request.url, 'crm-schema');
    }

    throw error;
  }

  return redirectWithStatus(redirectTo, request.url, 'updated');
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leadStatus = String(body?.leadStatus || '');
  if (!isDiagnosticLeadStatus(leadStatus)) {
    return NextResponse.json({ error: 'Invalid lead status.' }, { status: 400 });
  }

  const markContacted = Boolean(body?.markContacted);
  const clearNextFollowUp = Boolean(body?.clearNextFollowUp);
  const templateId = body?.templateId ? String(body.templateId) as EmailTemplateId : null;
  const existing = markContacted ? await getDiagnosticSubmissionById(id) : null;
  const contactedAt = new Date();
  const followUpSchedule = markContacted
    ? getFollowUpScheduleAfterSend(
        existing?.follow_up_count ?? 0,
        templateId,
        contactedAt,
        existing?.lead_status === 'contacted' || Boolean(existing?.last_contacted_at),
        existing?.source
      )
    : null;
  const shouldClear = clearNextFollowUp || shouldClearNextFollowUp(leadStatus);
  const nextLeadStatus = markContacted ? getLeadStatusAfterSend(leadStatus, templateId) : leadStatus;

  await updateDiagnosticSubmissionCrm(id, {
    lead_status: nextLeadStatus,
    follow_up_count: followUpSchedule?.follow_up_count,
    next_follow_up_at: markContacted ? followUpSchedule?.next_follow_up_at : shouldClearNextFollowUp(nextLeadStatus) || shouldClear ? null : undefined,
    last_contacted_at: markContacted ? contactedAt.toISOString() : undefined,
  });

  const submission = await getDiagnosticSubmissionById(id);
  return NextResponse.json({ submission });
}
