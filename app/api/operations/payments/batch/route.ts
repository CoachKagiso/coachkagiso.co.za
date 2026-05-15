import { NextResponse } from 'next/server';
import { deleteClientOperations } from '@/lib/client-operations';
import { isValidBatchDeletePhrase } from '@/lib/dashboard-cleanup';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const PAYMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

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
  const paymentIds = formData
    .getAll('payment_ids')
    .map((value) => String(value))
    .filter((value) => PAYMENT_ID_PATTERN.test(value));

  if (!isDiagnosticAdminAuthorized(key)) {
    return redirectWithStatus(redirectTo, request.url, 'unauthorized');
  }

  if (!isValidBatchDeletePhrase(confirmPhrase) || paymentIds.length === 0 || paymentIds.length > 100) {
    return redirectWithStatus(redirectTo, request.url, 'invalid');
  }

  await deleteClientOperations(paymentIds);

  const url = new URL(redirectTo, request.url);
  url.searchParams.set('updated', 'deleted');
  url.searchParams.set('deletedCount', String(paymentIds.length));
  return NextResponse.redirect(url, { status: 303 });
}
