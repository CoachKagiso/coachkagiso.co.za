import { NextResponse } from 'next/server';
import {
  deleteDiagnosticSubmission,
  getDiagnosticSubmissionById,
  isDiagnosticAdminAuthorized,
  isDiagnosticLeadStatus,
  updateDiagnosticSubmissionCrm,
} from '@/lib/diagnostic-submissions';

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

  if (!isDiagnosticAdminAuthorized(key)) {
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

    await updateDiagnosticSubmissionCrm(id, {
      lead_status:
        intent === 'mark_contacted'
          ? 'contacted'
          : isDiagnosticLeadStatus(leadStatus)
            ? leadStatus
            : undefined,
      lead_notes: intent === 'mark_contacted' ? undefined : leadNotes || null,
      next_follow_up_at: intent === 'mark_contacted' ? undefined : nextFollowUpAt || null,
      last_contacted_at: intent === 'mark_contacted' ? new Date().toISOString() : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      ['lead_status', 'lead_notes', 'next_follow_up_at', 'last_contacted_at', 'updated_at'].some((column) =>
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

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leadStatus = String(body?.leadStatus || '');
  if (!isDiagnosticLeadStatus(leadStatus)) {
    return NextResponse.json({ error: 'Invalid lead status.' }, { status: 400 });
  }

  const markContacted = Boolean(body?.markContacted);

  await updateDiagnosticSubmissionCrm(id, {
    lead_status: leadStatus,
    last_contacted_at: markContacted ? new Date().toISOString() : undefined,
  });

  const submission = await getDiagnosticSubmissionById(id);
  return NextResponse.json({ submission });
}
