import { NextResponse } from 'next/server';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { extractAiProviderErrorMessage } from '@/lib/ai-request';
import {
  buildSessionEvidenceSystemPrompt,
  buildSessionEvidenceUserPrompt,
  findUnsupportedSessionEvidenceNumbers,
  normalizeSessionDebriefSuggestions,
} from '@/lib/client-session-evidence';
import {
  SESSION_EVIDENCE_STORAGE_NOT_READY,
  getClientSessionEvidence,
  saveClientSessionEvidenceSuggestions,
} from '@/lib/client-session-evidence-store';
import {
  getClientSessionPreparationSource,
  getLatestClientSessionPreparation,
} from '@/lib/client-session-preparation-store';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const [source, preparation] = await Promise.all([
      getClientSessionPreparationSource(paymentId),
      getLatestClientSessionPreparation(paymentId),
    ]);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed coaching engagement not found.' }, { status: 404 });
    }
    if (!preparation) {
      return NextResponse.json(
        { error: 'Generate or load the session preparation before suggesting a debrief.' },
        { status: 422 },
      );
    }

    const evidenceId = String(body?.evidenceId || '');
    const evidence = evidenceId ? await getClientSessionEvidence(paymentId, evidenceId) : null;
    if (!evidence || evidence.serviceSlug !== source.serviceSlug) {
      return NextResponse.json({ error: 'Saved session evidence not found.' }, { status: 404 });
    }
    if (!evidence.extractedText && !evidence.additionalContext) {
      return NextResponse.json({ error: 'Add session evidence before requesting suggestions.' }, { status: 422 });
    }

    const runtime = await resolveAiRuntimeConfig();
    if (!runtime) {
      return NextResponse.json(
        { error: 'AI service not configured. Add the active provider API key in Settings.' },
        { status: 503 },
      );
    }
    const questions = preparation.content.priorityQuestions.map((question) => ({
      question: question.question,
      priority: question.priority,
    }));

    let response: Response;
    try {
      response = await fetch(`${runtime.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: runtime.headers,
        body: JSON.stringify(buildAiRequestBody(runtime, {
          model: runtime.model,
          messages: [
            { role: 'system', content: buildSessionEvidenceSystemPrompt(source.serviceSlug) },
            {
              role: 'user',
              content: buildSessionEvidenceUserPrompt({
                serviceSlug: source.serviceSlug,
                questions,
                extractedText: evidence.extractedText,
                additionalContext: evidence.additionalContext,
              }),
            },
          ],
          max_tokens: 2200,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }, { zeroRetention: true })),
      });
    } catch (error) {
      console.error('Session evidence AI network error:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ error: 'Could not reach the AI service. Try again.' }, { status: 502 });
    }

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Session evidence AI request failed with status ${response.status}:`, responseText);
      const providerMessage = extractAiProviderErrorMessage(responseText);
      return NextResponse.json({
        error: providerMessage
          ? `The AI service could not suggest a debrief: ${providerMessage}`
          : 'The AI service could not suggest a debrief. Try again.',
      }, { status: 502 });
    }
    const aiResponse = JSON.parse(responseText) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    if (!rawContent) throw new Error('EMPTY_SESSION_EVIDENCE_RESPONSE');

    const suggestions = normalizeSessionDebriefSuggestions(
      extractToolJsonObject(rawContent),
      {
        serviceSlug: source.serviceSlug,
        questions,
        evidenceId: evidence.id,
      },
    );
    const unsupportedNumbers = findUnsupportedSessionEvidenceNumbers(
      suggestions,
      `${evidence.extractedText}\n${evidence.additionalContext}`,
    );
    if (unsupportedNumbers.length) {
      return NextResponse.json(
        { error: 'The suggestions introduced unsupported numerical details. Try generating them again.' },
        { status: 422 },
      );
    }
    const savedSuggestion = await saveClientSessionEvidenceSuggestions({
      paymentId,
      serviceSlug: source.serviceSlug,
      evidenceId: evidence.id,
      preparationId: preparation.id,
      suggestions,
      generatorProvider: runtime.provider,
      generatorModel: aiResponse.model || runtime.model,
    });

    return NextResponse.json({
      suggestionId: savedSuggestion.id,
      createdAt: savedSuggestion.createdAt,
      suggestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === SESSION_EVIDENCE_STORAGE_NOT_READY) {
      return NextResponse.json(
        { error: 'Session evidence storage is not ready until the pending database migration is applied.' },
        { status: 503 },
      );
    }
    console.error('Session evidence suggestion failed:', message || 'unknown error');
    return NextResponse.json(
      { error: 'The AI returned incomplete debrief suggestions. Try again.' },
      { status: 500 },
    );
  }
}
