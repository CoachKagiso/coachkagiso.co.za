import { NextResponse } from 'next/server';
import {
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
  status: 'updated' | 'crm-schema' | 'unauthorized'
) {
  const url = new URL(redirectTo || '/resources/career-diagnostic/submissions', requestUrl);
  url.searchParams.set(status === 'updated' ? 'updated' : 'error', status);
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
  const leadStatus = String(formData.get('lead_status') || '');
  const leadNotes = String(formData.get('lead_notes') || '').trim();
  const nextFollowUpAt = String(formData.get('next_follow_up_at') || '').trim();

  try {
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
