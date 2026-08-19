import { NextResponse } from 'next/server';
import {
  getClientCvSource,
  getLatestClientCvAnalysisReport,
  saveClientCvVersion,
  summarizeClientCvSource,
} from '@/lib/client-cv-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request, bodyKey?: unknown) {
  const url = new URL(request.url);
  return String(bodyKey || request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const [source, latestReport] = await Promise.all([
      getClientCvSource(paymentId),
      getLatestClientCvAnalysisReport(paymentId),
    ]);
    if (!source) return NextResponse.json({ error: 'Confirmed client engagement not found.' }, { status: 404 });

    return NextResponse.json({
      source: summarizeClientCvSource(source),
      latestReport: latestReport
        ? { report: latestReport.report, createdAt: latestReport.created_at }
        : null,
    });
  } catch (error) {
    console.error('Client CV workspace load failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not load the client CV workspace.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const formData = await request.formData().catch(() => null);
  const key = formData?.get('key');
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, key), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a PDF, Word .docx, or plain text CV.' }, { status: 400 });
  }

  const { paymentId } = await params;
  try {
    const saved = await saveClientCvVersion({ paymentId, file, source: 'analyzer' });
    return NextResponse.json({ source: summarizeClientCvSource(saved.source) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save this CV version.';
    const status = /CV|document|file|filename|contents|structure|8MB|10MB/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
