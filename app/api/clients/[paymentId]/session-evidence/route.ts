import { NextResponse } from 'next/server';
import {
  SESSION_EVIDENCE_STORAGE_NOT_READY,
  getLatestClientSessionEvidenceState,
  saveClientSessionEvidence,
} from '@/lib/client-session-evidence-store';
import {
  getClientSessionPreparationSource,
  getLatestClientSessionPreparation,
} from '@/lib/client-session-preparation-store';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request, formData?: FormData | null) {
  const url = new URL(request.url);
  return String(
    formData?.get('key') ||
      request.headers.get('x-diagnostic-admin-key') ||
      url.searchParams.get('key') ||
      '',
  );
}

function presentEvidence(
  evidence: Awaited<ReturnType<typeof getLatestClientSessionEvidenceState>>['evidence'],
) {
  if (!evidence) return null;
  return {
    id: evidence.id,
    version: evidence.version,
    fileName: evidence.fileName,
    contentType: evidence.contentType,
    extension: evidence.extension,
    sizeBytes: evidence.sizeBytes,
    extractedText: evidence.extractedText,
    extractionTruncated: evidence.extractionTruncated,
    additionalContext: evidence.additionalContext,
    createdAt: evidence.createdAt,
  };
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
    const source = await getClientSessionPreparationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    }
    const [state, preparation] = await Promise.all([
      getLatestClientSessionEvidenceState(paymentId),
      getLatestClientSessionPreparation(paymentId),
    ]);

    return NextResponse.json({
      storageReady: state.storageReady,
      evidence: presentEvidence(state.evidence),
      preparation: preparation
        ? {
            id: preparation.id,
            version: preparation.version,
            questions: preparation.content.priorityQuestions.map((question) => ({
              question: question.question,
              whyItMatters: question.whyItMatters,
              priority: question.priority,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('Session evidence load failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not load the private session evidence.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const formData = await request.formData().catch(() => null);
  if (!formData || !isDiagnosticAdminAuthorized(getRequestKey(request, formData), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const source = await getClientSessionPreparationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    }
    const fileValue = formData.get('file');
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const evidence = await saveClientSessionEvidence({
      paymentId,
      serviceSlug: source.serviceSlug,
      file,
      additionalContext: String(formData.get('additionalContext') || ''),
      removeFile: String(formData.get('removeFile') || '') === 'true',
    });
    return NextResponse.json({ evidence: presentEvidence(evidence) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === SESSION_EVIDENCE_STORAGE_NOT_READY) {
      return NextResponse.json(
        { error: 'Session evidence storage is not ready until the pending database migration is applied.' },
        { status: 503 },
      );
    }
    if (
      message.includes('Upload') ||
      message.includes('evidence') ||
      message.includes('file') ||
      message.includes('PDF') ||
      message.includes('document') ||
      message.includes('context')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Session evidence save failed:', message || 'unknown error');
    return NextResponse.json({ error: 'Could not save the private session evidence.' }, { status: 500 });
  }
}
