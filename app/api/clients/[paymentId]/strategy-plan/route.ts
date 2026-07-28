import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { loadClientStrategyCvText } from '@/lib/client-strategy-cv-server';
import { sanitizeClientStrategyIntake } from '@/lib/client-strategy-cv';
import {
  CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
  buildClientStrategyPlanSystemPrompt,
  buildClientStrategyPlanUserPrompt,
  buildClientStrategySourceText,
  findUnsupportedPlanNumbers,
  normalizeClientStrategyPlanContent,
} from '@/lib/client-strategy-plan';
import {
  createClientStrategyPlan,
  getClientStrategyGenerationSource,
  getClientStrategyPlans,
} from '@/lib/client-strategy-store';
import { countCompletedDebriefFields } from '@/lib/client-strategy';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
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
    const source = await getClientStrategyGenerationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed engagement not found.' }, { status: 404 });
    }
    const plans = await getClientStrategyPlans(paymentId);
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Strategy plan list failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not load the saved plan versions.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  try {
    const source = await getClientStrategyGenerationSource(paymentId);
    if (!source) {
      return NextResponse.json({ error: 'Eligible confirmed engagement not found.' }, { status: 404 });
    }
    if (!source.workspace || countCompletedDebriefFields(source.workspace.debrief) === 0) {
      return NextResponse.json({ error: 'Save the session debrief before generating a plan.' }, { status: 409 });
    }

    const runtime = await resolveAiRuntimeConfig();
    if (!runtime) {
      return NextResponse.json(
        { error: 'AI service not configured. Add the active provider API key in Settings.' },
        { status: 503 },
      );
    }

    const intake = sanitizeClientStrategyIntake(source.intake?.formData || {});
    const cv = await loadClientStrategyCvText(source.intake?.cvFileUrl || null);
    const promptInput = {
      serviceSlug: source.serviceSlug,
      intake,
      debrief: source.workspace.debrief,
      cvText: cv.text,
    };

    let response: Response;
    try {
      response = await fetch(`${runtime.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: runtime.headers,
        body: JSON.stringify(buildAiRequestBody(runtime, {
          model: runtime.model,
          messages: [
            { role: 'system', content: buildClientStrategyPlanSystemPrompt(source.serviceSlug) },
            { role: 'user', content: buildClientStrategyPlanUserPrompt(promptInput) },
          ],
          max_tokens: 4200,
          temperature: 0.35,
          response_format: { type: 'json_object' },
          provider: {
            data_collection: 'deny',
            zdr: true,
          },
        })),
      });
    } catch (error) {
      console.error('Strategy plan AI network error:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ error: 'Could not reach the AI service. Try again.' }, { status: 502 });
    }

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Strategy plan AI request failed with status ${response.status}.`);
      return NextResponse.json({ error: 'The AI service could not create the draft. Try again.' }, { status: 502 });
    }

    const aiResponse = JSON.parse(responseText) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    if (!rawContent) throw new Error('EMPTY_PLAN_RESPONSE');

    const planContent = normalizeClientStrategyPlanContent(
      source.serviceSlug,
      extractToolJsonObject(rawContent),
    );
    const unsupportedNumbers = findUnsupportedPlanNumbers(
      planContent,
      buildClientStrategySourceText(promptInput),
    );
    if (unsupportedNumbers.length) {
      return NextResponse.json(
        { error: 'The draft introduced unsupported numerical details. Regenerate it before review.' },
        { status: 422 },
      );
    }

    const plan = await createClientStrategyPlan({
      workspaceId: source.workspace.id,
      generatedContent: planContent,
      sourceSnapshot: {
        workspaceVersion: source.workspace.version,
        intakeId: source.intake?.id || null,
        intakeSubmittedAt: source.intake?.submittedAt || null,
        cv: { included: cv.included, issue: cv.issue },
      },
      generatorProvider: runtime.provider,
      generatorModel: aiResponse.model || runtime.model,
      promptVersion: CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
    });

    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Strategy plan generation failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'The AI service returned an incomplete plan. Try generating the draft again.' },
      { status: 500 },
    );
  }
}
