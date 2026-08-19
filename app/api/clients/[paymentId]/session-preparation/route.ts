import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { extractAiProviderErrorMessage } from '@/lib/ai-request';
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
  SESSION_PREPARATION_EDIT_STORAGE_NOT_READY,
  getClientSessionPreparationSource,
  getLatestClientSessionPreparation,
  saveClientSessionPreparation,
  updateLatestClientSessionPreparation,
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
        }, { zeroRetention: true })),
      });
    } catch (error) {
      console.error('Session preparation AI network error:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ error: 'Could not reach the AI service. Try again.' }, { status: 502 });
    }

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Session preparation AI request failed with status ${response.status}:`, responseText);
      const providerMessage = extractAiProviderErrorMessage(responseText);
      return NextResponse.json({
        error: providerMessage
          ? `The AI service could not prepare this session: ${providerMessage}`
          : 'The AI service could not prepare this session. Try again.',
      }, { status: 502 });
    }

    const aiResponse = JSON.parse(responseText) as {
      model?: string;
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
    };
    const finishReason = aiResponse.choices?.[0]?.finish_reason || 'unknown';
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    // Truncation and a schema mismatch both surface as unusable JSON, so separate them here
    // rather than letting both land on the same generic "incomplete" message.
    if (finishReason === 'length') {
      console.error('Session preparation AI response truncated:', { model: aiResponse.model || runtime.model });
      return NextResponse.json({
        error: 'The AI ran out of room before finishing this session preparation. '
          + 'This usually means the model spent its budget on reasoning. Try again, or switch the primary model in Settings.',
        code: 'SESSION_PREPARATION_OUTPUT_TRUNCATED',
      }, { status: 502 });
    }
    if (!rawContent) throw new Error('EMPTY_SESSION_PREPARATION_RESPONSE');

    const content = normalizeClientSessionPreparationContent(
      extractToolJsonObject(rawContent),
      { serviceSlug: source.serviceSlug, requireTimed: true },
    );

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
    const message = error instanceof Error ? error.message : '';
    if (message === SESSION_PREPARATION_EDIT_STORAGE_NOT_READY) {
      return NextResponse.json(
        { error: 'Session preparation editing is not ready until the pending database migration is applied.' },
        { status: 503 },
      );
    }
    console.error('Session preparation generation failed:', message || 'unknown error');
    const failure = classifyClientSessionPreparationFailure(error);
    return NextResponse.json(
      { error: failure.error, code: failure.code },
      { status: failure.status },
    );
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
  const preparationId = String(body?.preparationId || '');
  if (!preparationId) {
    return NextResponse.json({ error: 'Preparation ID is required.' }, { status: 400 });
  }

  try {
    const source = await getClientSessionPreparationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    }
    const editedContent = normalizeClientSessionPreparationContent(body?.content, {
      serviceSlug: source.serviceSlug,
    });
    const preparation = await updateLatestClientSessionPreparation({
      paymentId,
      preparationId,
      editedContent,
    });
    if (!preparation) {
      return NextResponse.json({
        error: 'Only the latest preparation can be edited. Reload the workspace and try again.',
      }, { status: 409 });
    }

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ preparation });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === SESSION_PREPARATION_EDIT_STORAGE_NOT_READY) {
      return NextResponse.json(
        { error: 'Session preparation editing is not ready until the pending database migration is applied.' },
        { status: 503 },
      );
    }
    if (message.includes('required') || message.includes('must be') || message.includes('needs') || message.includes('allows')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Session preparation update failed:', message || 'unknown error');
    return NextResponse.json({ error: 'Could not save the session preparation changes.' }, { status: 500 });
  }
}
