import { NextResponse } from 'next/server';
import {
  getClientDiagnosticContextWorkspace,
  setClientDiagnosticContextLink,
} from '@/lib/client-diagnostic-context-store';
import { normalizeDiagnosticContextStatus } from '@/lib/client-diagnostic-context';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request, body?: Record<string, unknown> | null) {
  const url = new URL(request.url);
  return String(body?.key || request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;
  const query = new URL(request.url).searchParams.get('query') || '';
  try {
    const workspace = await getClientDiagnosticContextWorkspace(paymentId, query);
    if (!workspace) return NextResponse.json({ error: 'Eligible confirmed client not found.' }, { status: 404 });
    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not load earlier diagnostic context.',
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, body), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;
  const diagnosticSubmissionId = String(body?.diagnosticSubmissionId || '');
  const requestedStatus = String(body?.status || '');
  const status = normalizeDiagnosticContextStatus(requestedStatus);
  if (!diagnosticSubmissionId || requestedStatus !== status) {
    return NextResponse.json({ error: 'A valid diagnostic and status are required.' }, { status: 400 });
  }
  const matchMethod = body?.matchMethod === 'manual' ? 'manual' : 'email';
  try {
    const workspace = await setClientDiagnosticContextLink({
      paymentId,
      diagnosticSubmissionId,
      status,
      matchMethod,
      clientConsentConfirmed: body?.clientConsentConfirmed === true,
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not update earlier diagnostic context.',
    }, { status: 422 });
  }
}
