import { NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/content/system-prompt';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

// TEST: Z.ai GLM direct integration.
// PRODUCTION: swap these constants to the production provider when testing is complete.
const AI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const AI_MODEL = 'glm-5.1';
const AI_API_KEY_ENV = 'ZAI_API_KEY';

type ContentAiMode =
  | 'signal_brief'
  | 'write_post'
  | 'polish'
  | 'alchemy_stage1'
  | 'alchemy_stage2'
  | 'format_recommendation'
  | 'voice_note'
  | 'calendar_plan';

const contentAiModes: ContentAiMode[] = [
  'signal_brief',
  'write_post',
  'polish',
  'alchemy_stage1',
  'alchemy_stage2',
  'format_recommendation',
  'voice_note',
  'calendar_plan',
];

function isContentAiMode(value: unknown): value is ContentAiMode {
  return typeof value === 'string' && contentAiModes.includes(value as ContentAiMode);
}

function getMaxTokens(mode: ContentAiMode) {
  return mode === 'calendar_plan' ? 1600 : 1000;
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

  const apiKey = process.env[AI_API_KEY_ENV];

  if (!apiKey) {
    console.error(`${AI_API_KEY_ENV} is not set`);
    return NextResponse.json(
      { error: 'AI service not configured. Add ZAI_API_KEY to the server environment variables.' },
      { status: 503 }
    );
  }

  let response: Response;
  try {
    response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(body.mode, body?.context ?? {}) },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: getMaxTokens(body.mode),
        temperature: 0.7,
      }),
    });
  } catch (error) {
    console.error('Z.ai network error:', error);
    return NextResponse.json(
      { error: 'Failed to reach AI service. Check network and try again.' },
      { status: 502 }
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Z.ai API error ${response.status}:`, responseText);
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
    console.error('Z.ai returned empty content:', responseText);
    return NextResponse.json(
      { error: 'AI service returned an empty response. Try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ result: text });
}
