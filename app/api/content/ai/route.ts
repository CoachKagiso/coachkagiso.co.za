import { NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/content/system-prompt';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildAiRequestBody, resolveAiRuntimeConfig, SIMPLE_AI_MODES } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

type ContentAiMode =
  | 'signal_brief'
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

function getMaxTokens(mode: ContentAiMode, contentType?: string) {
  if (mode === 'calendar_plan') return 2400;
  if (mode === 'summarise_insights') return 900;
  if (mode === 'write_post' && contentType === 'carousel') return 2600;
  if (mode === 'image_prompts') return 2200;
  if (mode === 'write_post' && contentType === 'caption_reel') return 2200;
  if (mode === 'write_post' || mode === 'voice_note' || mode === 'alchemy_stage2') return 1800;
  if (mode === 'hook_generator') return 1700;
  if (mode === 'cta_generator') return 1100;
  if (mode === 'alchemy_critique') return 600;
  return 1200;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isContentAiMode(body?.mode)) {
    return NextResponse.json({ error: 'Invalid AI mode.' }, { status: 400 });
  }

  const userPrompt = String(body?.userPrompt || '').trim();
  if (!userPrompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }

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
            ),
          },
          { role: 'user', content: body.mode === 'cta_generator' || body.mode === 'hook_generator' || body.mode === 'format_recommendation' || body.mode === 'image_prompts' || body.mode === 'summarise_insights' || body.mode === 'signal_brief' || body.mode === 'polish' || body.mode === 'alchemy_stage2' || body.mode === 'calendar_plan' ? `<user_input>\n${userPrompt}\n</user_input>` : userPrompt },
        ],
        max_tokens: getMaxTokens(body.mode, optionalString(body?.contentType)),
        temperature: 0.7,
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

  const text = data.choices?.[0]?.message?.content?.trim() || '';

  if (!text) {
    console.error(`${runtime.provider} returned empty content:`, responseText);
    return NextResponse.json(
      { error: 'AI service returned an empty response. Try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ result: text });
}
