import { NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/content/system-prompt';
import { getContentAiMaxTokens, resolveTemperatureForRegister } from '@/lib/content/ai-limits';
import { enforceHumanizer, shouldInjectHumanizerRules } from '@/lib/content/humanizer';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildAiRequestBody, resolveAiRuntimeConfig, SIMPLE_AI_MODES } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

type ContentAiMode =
  | 'signal_brief'
  | 'auto_topic'
  | 'write_post'
  | 'polish'
  | 'hook_generator'
  | 'cta_generator'
  | 'alchemy_stage1'
  | 'alchemy_stage2'
  | 'alchemy_critique'
  | 'format_recommendation'
  | 'image_prompts'
  | 'voice_note'
  | 'calendar_plan'
  | 'summarise_insights';

const contentAiModes: ContentAiMode[] = [
  'signal_brief',
  'auto_topic',
  'write_post',
  'polish',
  'hook_generator',
  'cta_generator',
  'alchemy_stage1',
  'alchemy_stage2',
  'alchemy_critique',
  'format_recommendation',
  'image_prompts',
  'voice_note',
  'calendar_plan',
  'summarise_insights',
];

function isContentAiMode(value: unknown): value is ContentAiMode {
  return typeof value === 'string' && contentAiModes.includes(value as ContentAiMode);
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isContentAiMode(body?.mode)) {
    return NextResponse.json({ error: 'Invalid AI mode.' }, { status: 400 });
  }

  const userPrompt = String(body?.userPrompt || '').trim();
  if (!userPrompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }

  // The register travels in the body (explicit `register` wins, angleRegister
  // is the fallback the Studio already sends). It drives sampling temperature
  // and the tender-topic angle guard below.
  const register = optionalString(body?.register) ?? optionalString(body?.angleRegister);
  const topicHint = /^Topic:\s*(.+)$/m.exec(userPrompt)?.[1]?.trim() || undefined;

  const runtime = await resolveAiRuntimeConfig({ simpleMode: SIMPLE_AI_MODES.has(body.mode) });

  if (!runtime) {
    console.error('AI runtime is not configured');
    return NextResponse.json(
      { error: 'AI service not configured. Add the active provider API key in Settings.' },
      { status: 503 }
    );
  }

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
            content: buildSystemPrompt(
              body.mode,
              body?.context ?? {},
              optionalString(body?.contentType),
              optionalString(body?.subType),
              optionalString(body?.angle),
              optionalString(body?.angleRegister),
              Array.isArray(body?.researchEntries) ? body.researchEntries : undefined,
              optionalString(body?.targetPillar),
              topicHint,
            ),
          },
          { role: 'user', content: body.mode === 'cta_generator' || body.mode === 'hook_generator' || body.mode === 'format_recommendation' || body.mode === 'image_prompts' || body.mode === 'summarise_insights' || body.mode === 'signal_brief' || body.mode === 'polish' || body.mode === 'alchemy_stage2' || body.mode === 'calendar_plan' ? `<user_input>\n${userPrompt}\n</user_input>` : userPrompt },
        ],
        max_tokens: getContentAiMaxTokens(body.mode, optionalString(body?.contentType), optionalString(body?.angle)),
        temperature: resolveTemperatureForRegister(register),
      })),
    });
  } catch (error) {
    console.error(`${runtime.provider} network error:`, error);
    return NextResponse.json(
      { error: 'Failed to reach AI service. Check network and try again.' },
      { status: 502 }
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`${runtime.provider} API error ${response.status}:`, responseText);
    return NextResponse.json(
      { error: `AI service returned an error (${response.status}). Try again.` },
      { status: response.status }
    );
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(responseText);
  } catch {
    return NextResponse.json(
      { error: 'AI service returned an unreadable response.' },
      { status: 500 }
    );
  }

  const rawText = data.choices?.[0]?.message?.content?.trim() || '';

  // Enforced post-filter for prose modes only: strict-JSON outputs must not be
  // sentence-split or they risk structural damage. Same gate as prompt injection.
  const text = shouldInjectHumanizerRules(body.mode) ? enforceHumanizer(rawText).text.trim() : rawText;

  if (!text) {
    console.error(`${runtime.provider} returned empty content:`, responseText);
    return NextResponse.json(
      { error: 'AI service returned an empty response. Try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ result: text });
}
