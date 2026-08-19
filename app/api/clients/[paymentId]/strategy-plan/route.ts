import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { loadClientStrategyCvText } from '@/lib/client-strategy-cv-server';
import { sanitizeClientStrategyIntake } from '@/lib/client-strategy-cv';
import {
  CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
  buildClientStrategyPlanHorizonExtensionSystemPrompt,
  buildClientStrategyPlanHorizonExtensionUserPrompt,
  buildClientStrategyPlanSectionSystemPrompt,
  buildClientStrategyPlanSectionUserPrompt,
  buildClientStrategyPlanShell,
  buildClientStrategySourceText,
  findUnsupportedPlanNumbers,
  getClientStrategyPlanExtensionGaps,
  getClientStrategyPlanFinalWeek,
  hasClientStrategyPlanExtensionGaps,
  mergeClientStrategyPlanHorizonExtension,
  mergeClientStrategyPlanSection,
  type CareerDevelopmentPlanHorizon,
  type ClientStrategyPlanSection,
} from '@/lib/client-strategy-plan';
import {
  createClientStrategyPlan,
  getClientStrategyPlan,
  getClientStrategyGenerationSource,
  getClientStrategyPlans,
  saveClientStrategyWorkspace,
  updateClientStrategyPlanDraft,
  resetClientStrategyPlanDrafts,
} from '@/lib/client-strategy-store';
import { createEmptySessionDebrief } from '@/lib/client-strategy';
import { extractAiProviderErrorMessage } from '@/lib/ai-request';
import { formatClientBookingTime } from '@/lib/client-intake';
import { resolveClientSessionDate } from '@/lib/client-session-date';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || request.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!body?.confirmation || body.confirmation !== body.expectedConfirmation) {
    return NextResponse.json({ error: 'The reset confirmation phrase did not match.' }, { status: 400 });
  }
  const { paymentId } = await params;
  try {
    const source = await getClientStrategyGenerationSource(paymentId);
    if (!source?.workspace) return NextResponse.json({ deletedCount: 0 });
    const deletedCount = await resetClientStrategyPlanDrafts(source.workspace.id);
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error('Strategy plan reset failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not reset disposable plan drafts.' }, { status: 500 });
  }
}

const SECTION_CONFIG: Record<ClientStrategyPlanSection, { label: string; maxTokens: number }> = {
  session_summary: { label: 'Session Summary & Agreements', maxTokens: 1800 },
  // Career Clarity now returns a decision framework, positioning, and a week-by-week rhythm
  // alongside the phases, so this needs real headroom. It is a ceiling, not a target.
  development_plan: { label: 'Career Development Plan', maxTokens: 6000 },
  interview_prep: { label: 'Interview Preparation', maxTokens: 2600 },
};

function isPlanSection(value: unknown): value is ClientStrategyPlanSection {
  return value === 'session_summary' || value === 'development_plan' || value === 'interview_prep';
}

function isExtensionHorizon(value: unknown): value is 60 | 90 {
  return value === 60 || value === 90;
}

function sectionError(
  section: ClientStrategyPlanSection,
  code: string,
  error: string,
  status = 422,
) {
  return NextResponse.json({ section, code, error }, { status });
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
    const workspace = source.workspace || await saveClientStrategyWorkspace({
      paymentId: source.paymentId,
      serviceSlug: source.serviceSlug,
      debrief: createEmptySessionDebrief(),
    });

    const runtime = await resolveAiRuntimeConfig();
    if (!runtime) {
      return NextResponse.json(
        { error: 'AI service not configured. Add the active provider API key in Settings.' },
        { status: 503 },
      );
    }

    const section = body?.section;
    if (!isPlanSection(section)) {
      return NextResponse.json(
        { error: 'Choose the plan section to generate.' },
        { status: 400 },
      );
    }
    if (section === 'interview_prep' && source.serviceSlug !== 'glow-up-vip') {
      return sectionError(
        section,
        'section_not_available',
        'Interview Preparation is available only for Glow Up VIP.',
        400,
      );
    }
    const isHorizonExtension = body?.mode === 'extend_horizon';
    const targetHorizon = body?.targetHorizon;
    if (isHorizonExtension && section !== 'development_plan') {
      return sectionError(
        section,
        'extension_section_mismatch',
        'Plan horizons can be extended only from the Career Development Plan section.',
        400,
      );
    }
    if (isHorizonExtension && !isExtensionHorizon(targetHorizon)) {
      return sectionError(
        section,
        'invalid_extension_horizon',
        'Choose a 60-day or 90-day extension.',
        400,
      );
    }

    const requestedPlanId = typeof body?.planId === 'string' ? body.planId.trim() : '';
    const basePlan = requestedPlanId
      ? await getClientStrategyPlan(paymentId, requestedPlanId)
      : null;
    if (requestedPlanId && !basePlan) {
      return sectionError(section, 'plan_not_found', 'The selected plan version could not be found.', 404);
    }
    if (basePlan && basePlan.serviceSlug !== source.serviceSlug) {
      return sectionError(section, 'plan_service_mismatch', 'The selected plan does not belong to this service.', 409);
    }
    if (isHorizonExtension && (!basePlan || basePlan.status !== 'draft')) {
      return sectionError(
        section,
        'extension_draft_required',
        'Only the current editable draft can be extended with AI.',
        409,
      );
    }
    // Shortening is still refused, but re-running at the current horizon is allowed so a
    // manually placeheld Day 60 or Day 90 can be written by AI. Only a horizon with nothing
    // left to write is rejected.
    if (
      isHorizonExtension
      && isExtensionHorizon(targetHorizon)
      && basePlan
      && (
        targetHorizon < basePlan.editedContent.planHorizonDays
        || !hasClientStrategyPlanExtensionGaps(
          getClientStrategyPlanExtensionGaps(basePlan.editedContent, targetHorizon),
        )
      )
    ) {
      return sectionError(
        section,
        'extension_not_needed',
        `This plan already covers everything up to Day ${basePlan.editedContent.planHorizonDays}.`,
        409,
      );
    }

    const intake = sanitizeClientStrategyIntake(source.intake?.formData || {});
    const cv = await loadClientStrategyCvText(source.cvSource || source.intake?.cvFileUrl || null);
    const startingContent = basePlan?.editedContent || buildClientStrategyPlanShell(source.serviceSlug);
    const workingPlan = basePlan?.status === 'draft'
      && basePlan.promptVersion === CLIENT_STRATEGY_PLAN_PROMPT_VERSION
      && basePlan.sourceSnapshot.workspaceVersion === workspace.version
      && basePlan.sourceSnapshot.intakeId === (source.intake?.id || null)
      && basePlan.sourceSnapshot.cvAnalysis?.reportId === (source.cvAnalysis?.id || null)
      ? basePlan
      : null;
    const promptInput = {
      serviceSlug: source.serviceSlug,
      section,
      intake,
      debrief: workspace.debrief,
      cvText: cv.text,
      cvAnalysis: source.cvAnalysis?.report || null,
      currentPlan: startingContent,
    };
    const requestLabel = isHorizonExtension && isExtensionHorizon(targetHorizon)
      ? `${targetHorizon}-day plan extension`
      : SECTION_CONFIG[section].label;
    // The extension writes only what is still missing, so both the prompt and the token budget
    // are derived from the same gap calculation the merge will validate against.
    const extensionGaps = isHorizonExtension && isExtensionHorizon(targetHorizon)
      ? getClientStrategyPlanExtensionGaps(startingContent, targetHorizon)
      : null;
    // How much the model has to write scales with the size of the gap: 30 to 90 adds nine weeks
    // and two milestone groups, where 60 to 90 adds five weeks and one. A flat budget starves
    // the largest jump, and a starved extension comes back missing a milestone group.
    const extensionNewWeeks = extensionGaps?.weekRange
      ? Math.max(0, extensionGaps.weekRange.to - extensionGaps.weekRange.from + 1)
      : 0;
    const extensionMaxTokens = 700
      + ((extensionGaps?.milestoneDays.length || 0) * 300)
      + (extensionNewWeeks * 250);
    // A regenerated development plan is rebuilt at its existing length, so a 90-day plan has to
    // pay for nine more weeks of rhythm than the 30-day case the base ceiling was sized for.
    const sectionMaxTokens = section === 'development_plan'
      ? SECTION_CONFIG[section].maxTokens
        + ((getClientStrategyPlanFinalWeek(startingContent.planHorizonDays) - 4) * 250)
      : SECTION_CONFIG[section].maxTokens;

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(`${runtime.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: runtime.headers,
        body: JSON.stringify(buildAiRequestBody(runtime, {
          model: runtime.model,
          messages: [
            {
              role: 'system',
              content: isHorizonExtension && isExtensionHorizon(targetHorizon)
                ? buildClientStrategyPlanHorizonExtensionSystemPrompt(
                    source.serviceSlug,
                    startingContent.planHorizonDays,
                    targetHorizon,
                    { gaps: extensionGaps || undefined },
                  )
                : buildClientStrategyPlanSectionSystemPrompt(source.serviceSlug, section, {
                    planHorizonDays: startingContent.planHorizonDays,
                  }),
            },
            {
              role: 'user',
              content: isHorizonExtension && isExtensionHorizon(targetHorizon)
                ? buildClientStrategyPlanHorizonExtensionUserPrompt({
                    ...promptInput,
                    targetHorizon,
                    currentPlan: startingContent,
                  })
                : buildClientStrategyPlanSectionUserPrompt(promptInput),
            },
          ],
          max_tokens: isHorizonExtension ? extensionMaxTokens : sectionMaxTokens,
          temperature: 0.35,
          response_format: { type: 'json_object' },
        }, { zeroRetention: true })),
      });
    } catch (error) {
      console.error('Strategy plan section AI network error:', {
        section,
        model: runtime.model,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      return sectionError(
        section,
        'provider_unreachable',
        `${requestLabel} could not reach the AI service. Your existing plan was preserved.`,
        502,
      );
    }

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Strategy plan section AI request failed:', {
        section,
        model: runtime.model,
        status: response.status,
        durationMs: Date.now() - startedAt,
        body: responseText,
      });
      const providerMessage = extractAiProviderErrorMessage(responseText);
      return sectionError(
        section,
        'provider_rejected',
        providerMessage
          ? `${requestLabel} could not be generated by the AI service: ${providerMessage} Your existing plan was preserved.`
          : `${requestLabel} could not be generated by the AI service. Your existing plan was preserved.`,
        502,
      );
    }

    let aiResponse: {
      model?: string;
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
      }>;
    };
    try {
      aiResponse = JSON.parse(responseText);
    } catch {
      return sectionError(
        section,
        'invalid_provider_response',
        `${requestLabel} received an unreadable AI response. Your existing plan was preserved.`,
        502,
      );
    }
    const finishReason = aiResponse.choices?.[0]?.finish_reason || 'unknown';
    const rawContent = aiResponse.choices?.[0]?.message?.content?.trim() || '';
    if (finishReason === 'length') {
      return sectionError(
        section,
        'output_truncated',
        `${requestLabel} was cut off before it finished. Retry it; your existing plan was preserved.`,
      );
    }
    if (!rawContent) {
      return sectionError(
        section,
        'empty_response',
        `${requestLabel} returned no content. Retry it; your existing plan was preserved.`,
      );
    }

    let sectionValue: unknown;
    try {
      sectionValue = extractToolJsonObject(rawContent);
    } catch {
      return sectionError(
        section,
        'invalid_json',
        `${requestLabel} returned malformed JSON. Retry it; your existing plan was preserved.`,
      );
    }

    let planContent;
    try {
      planContent = isHorizonExtension && isExtensionHorizon(targetHorizon)
        ? mergeClientStrategyPlanHorizonExtension(
            source.serviceSlug,
            startingContent,
            targetHorizon,
            sectionValue,
          )
        : mergeClientStrategyPlanSection(
            source.serviceSlug,
            startingContent,
            section,
            sectionValue,
          );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The section did not match its required structure.';
      console.error('Strategy plan section validation failed:', {
        section,
        model: aiResponse.model || runtime.model,
        finishReason,
        durationMs: Date.now() - startedAt,
        responseCharacters: rawContent.length,
        reason,
      });
      return sectionError(
        section,
        'section_validation_failed',
        `${requestLabel} needs another attempt: ${reason} Your existing plan was preserved.`,
      );
    }
    const unsupportedNumbers = findUnsupportedPlanNumbers(
      planContent,
      // Week numbers 1 to 13 are structural labels the schema itself asks for, so they are
      // supported by definition. Everything else still has to trace back to the sources.
      `${buildClientStrategySourceText(promptInput)}\n${isHorizonExtension ? JSON.stringify(startingContent) : ''}\nService guidance: 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 28 30 60 90`,
    );
    if (unsupportedNumbers.length) {
      return sectionError(
        section,
        'unsupported_numbers',
        `${requestLabel} introduced unsupported numerical details (${unsupportedNumbers.join(', ')}). Retry it; your existing plan was preserved.`,
      );
    }

    // The AI never sees the booking time (only sanitized form answers go into the prompt), so it
    // always writes the "[Confirm: session date]" placeholder. Overwrite it with the real
    // scheduled time rather than trusting the model to guess it.
    if (!isHorizonExtension && section === 'session_summary') {
      const resolved = await resolveClientSessionDate(paymentId).catch(() => null);
      const bookingTime = formatClientBookingTime({ startTime: resolved?.startTime });
      if (bookingTime) {
        planContent.sessionSummary.sessionDate = `${bookingTime} SAST`;
      }
    }

    const plan = workingPlan
      ? await updateClientStrategyPlanDraft({
          paymentId,
          planId: workingPlan.id,
          editedContent: planContent,
        })
      : await createClientStrategyPlan({
          workspaceId: workspace.id,
          generatedContent: planContent,
          sourceSnapshot: {
            workspaceVersion: workspace.version,
            intakeId: source.intake?.id || null,
            intakeSubmittedAt: source.intake?.submittedAt || null,
            cv: { included: cv.included, issue: cv.issue },
            cvAnalysis: {
              reportId: source.cvAnalysis?.id || null,
              createdAt: source.cvAnalysis?.created_at || null,
              included: Boolean(source.cvAnalysis),
            },
          },
          generatorProvider: runtime.provider,
          generatorModel: aiResponse.model || runtime.model,
          promptVersion: CLIENT_STRATEGY_PLAN_PROMPT_VERSION,
        });
    if (!plan) {
      return sectionError(
        section,
        'draft_not_editable',
        'This plan version is no longer editable. Reload the plan before generating another section.',
        409,
      );
    }

    console.info('Strategy plan section generated:', {
      section,
      mode: isHorizonExtension ? 'extend_horizon' : 'generate_section',
      targetHorizon: isHorizonExtension ? targetHorizon as CareerDevelopmentPlanHorizon : undefined,
      model: aiResponse.model || runtime.model,
      finishReason,
      durationMs: Date.now() - startedAt,
      responseCharacters: rawContent.length,
    });
    revalidatePath('/resources/career-diagnostic/submissions');
    return NextResponse.json({ plan, section }, { status: workingPlan ? 200 : 201 });
  } catch (error) {
    console.error('Strategy plan generation failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'The requested plan section could not be generated. Your existing work was preserved.' },
      { status: 500 },
    );
  }
}
