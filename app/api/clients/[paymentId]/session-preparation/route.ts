import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { sanitizeClientStrategyIntake } from '@/lib/client-strategy-cv';
import { formatDiagnosticContextForPreparation } from '@/lib/client-diagnostic-context';
import { questions as diagnosticQuestions } from '@/lib/career-diagnostic';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  CLIENT_SESSION_PREPARATION_PROMPT_VERSION,
  buildClientSessionPreparationSystemPrompt,
  buildClientSessionPreparationUserPrompt,
  classifyClientSessionPreparationFailure,
  normalizeClientSessionPreparationContent,
} from '@/lib/client-session-preparation';
import {
  getClientSessionPreparationSource,
  getLatestClientSessionPreparation,
  saveClientSessionPreparation,
} from '@/lib/client-session-preparation-store';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request, body?: Record<string, unknown> | null) {
  const url = new URL(request.url);
  return String(body?.key || request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '');
}

function readiness(source: Awaited<ReturnType<typeof getClientSessionPreparationSource>>) {
  return {
    hasIntake: Boolean(source?.hasIntake),
    hasMeaningfulContext: Boolean(source?.hasMeaningfulContext),
    contextVerified: Boolean(source?.contextVerified),
    hasCvAnalysis: Boolean(source?.hasCvAnalysis),
    canGenerate: Boolean(source?.canGenerate),
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
    if (!source) return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    const latestPreparation = await getLatestClientSessionPreparation(paymentId);
    return NextResponse.json({ readiness: readiness(source), latestPreparation });
  } catch (error) {
    console.error('Session preparation load failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not load session preparation.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isDiagnosticAdminAuthorized(getRequestKey(request, body), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const source = await getClientSessionPreparationSource(paymentId);
    if (!source) return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    if (!source.canGenerate) {
      return NextResponse.json({
        error: !source.hasMeaningfulContext
          ? 'Add the client’s emailed answers or meaningful coaching context in Client Context before preparing the session.'
          : !source.contextVerified
            ? 'Mark the saved client context as verified before preparing the session.'
          : 'Run and save a CV analysis before preparing the session.',
      }, { status: 422 });
    }

    const runtime = await resolveAiRuntimeConfig();
    if (!runtime) {
      return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
    }

    const promptInput = {
      serviceSlug: source.serviceSlug,
      intake: sanitizeClientStrategyIntake(source.intake?.formData || {}),
      cvAnalysis: source.cvAnalysis?.report || {},
      diagnosticContext: source.diagnosticContext
        ? formatDiagnosticContextForPreparation(source.diagnosticContext, diagnosticQuestions)
        : undefined,
    };

    let response: Response;
    try {
      response = await fetch(`${runtime.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: runtime.headers,
        body: JSON.stringify(buildAiRequestBody(runtime, {
          model: runtime.model,
          messages: [
            { role: 'system', content: buildClientSessionPreparationSystemPrompt(source.serviceSlug) },
            { role: 'user', content: buildClientSessionPreparationUserPrompt(promptInput) },
          ],
          max_tokens: 2600,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          provider: { data_collection: 'deny', zdr: true },
        })),
      });
    } catch (error) {
      console.error('Session preparation AI network error:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ error: 'Could not reach the AI service. Try again.' }, { status: 502 });
    }

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Session preparation AI request failed with status ${response.status}.`);
      return NextResponse.json({ error: 'The AI service could not prepare this session. Try again.' }, { status: 502 });
    }

    const aiResponse = JSON.parse(responseText) as { model?: string; choices?: Array<{ message?: { content?: string } }> };
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    if (!rawContent) throw new Error('EMPTY_SESSION_PREPARATION_RESPONSE');

    const content = normalizeClientSessionPreparationContent(extractToolJsonObject(rawContent));

    const preparation = await saveClientSessionPreparation({
      paymentId: source.paymentId,
      serviceSlug: source.serviceSlug,
      content,
      sourceSnapshot: {
        intake: {
          intakeId: source.intake?.id || null,
          submittedAt: source.intake?.submittedAt || null,
          included: source.hasIntake,
        },
        cvAnalysis: {
          reportId: source.cvAnalysis?.id || null,
          createdAt: source.cvAnalysis?.created_at || null,
          included: source.hasCvAnalysis,
        },
        diagnosticContext: {
          diagnosticSubmissionId: source.diagnosticContext?.id || null,
          submittedAt: source.diagnosticContext?.submittedAt || null,
          included: Boolean(source.diagnosticContext),
        },
      },
      generatorProvider: runtime.provider,
      generatorModel: aiResponse.model || runtime.model,
      promptVersion: CLIENT_SESSION_PREPARATION_PROMPT_VERSION,
    });

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ preparation }, { status: 201 });
  } catch (error) {
    console.error('Session preparation generation failed:', error instanceof Error ? error.message : 'unknown error');
    const failure = classifyClientSessionPreparationFailure(error);
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
  }
}
