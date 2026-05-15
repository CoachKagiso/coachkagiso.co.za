import { NextResponse } from 'next/server';
import { isValidBatchDeletePhrase } from '@/lib/dashboard-cleanup';
import { deleteDiagnosticSubmissions, isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectWithStatus(redirectTo: string, requestUrl: string, status: 'deleted' | 'unauthorized' | 'invalid') {
  const url = new URL(redirectTo || '/resources/career-diagnostic/submissions', requestUrl);
  url.searchParams.set(status === 'deleted' ? 'updated' : 'error', status);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const key = String(formData.get('key') || '');
  const redirectTo = String(formData.get('redirectTo') || '/resources/career-diagnostic/submissions');
  const confirmPhrase = String(formData.get('confirm_phrase') || '');
  const ids = formData
    .getAll('ids')
    .map((value) => String(value))
    .filter((value) => UUID_PATTERN.test(value));

  if (!isDiagnosticAdminAuthorized(key)) {
    return redirectWithStatus(redirectTo, request.url, 'unauthorized');
  }

  if (!isValidBatchDeletePhrase(confirmPhrase) || ids.length === 0 || ids.length > 100) {
    return redirectWithStatus(redirectTo, request.url, 'invalid');
  }

  await deleteDiagnosticSubmissions(ids);

  const url = new URL(redirectTo, request.url);
  url.searchParams.set('updated', 'deleted');
  url.searchParams.set('deletedCount', String(ids.length));
  return NextResponse.redirect(url, { status: 303 });
}
