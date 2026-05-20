import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/content/system-prompt';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

type ExtractedFramework = {
  hookPattern?: string;
  emotionalTension?: string;
  storyStructure?: string;
  ctaStyle?: string;
  formatLogic?: string;
  suggestedPillar?: string;
};

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildStage2UserPrompt(
  framework: ExtractedFramework,
  platform: string | undefined,
  contentType: string | undefined,
  subType: string | null,
  targetPillar?: string,
  targetRegister?: string,
  userDirection?: string,
  calendarContext?: string,
): string {
  const platformLabels: Record<string, string> = {
    linkedin: 'LinkedIn',
    instagram_facebook: 'Instagram / Facebook',
    tiktok: 'TikTok',
    email_voice: 'Email & Voice Note',
  };

  const targetSection = platform
    ? `Platform: ${platformLabels[platform] ?? platform}\nFormat: AI decides the strongest content format for this platform${contentType ? `\nContent type override: ${contentType}${subType ? ` (${subType})` : ''}` : ''}`
    : 'Platform and format: AI decides based on the framework';

  const pillarNote = targetPillar
    ? `\nUser-specified pillar: ${targetPillar} — use this pillar, not the SUGGESTED PILLAR from the framework.`
    : framework.suggestedPillar
      ? `\nSuggested pillar from framework: ${framework.suggestedPillar}`
      : '';

  const registerNote = targetRegister
    ? `\nUser-specified writing register: ${targetRegister} — use this register for the output.`
    : '';

  const directionNote = userDirection
    ? `\nUser direction: ${userDirection}`
    : '';

  const calendarNote = calendarContext
    ? `\n\nCONTENT CALENDAR CONTEXT:\n${calendarContext}\nDo NOT repeat or closely echo these titles. Use this context to ensure variety and avoid topic duplication.`
    : '';

  return `
Build a completely original piece of content for Kagiso Shabangu using ONLY this structural framework. The original source content is NOT available to you and must not be referenced, approximated, or continued.

STRUCTURAL FRAMEWORK TO USE:
Hook pattern: ${framework.hookPattern}
Emotional tension: ${framework.emotionalTension}
Story structure: ${framework.storyStructure}
CTA style: ${framework.ctaStyle}
Format logic: ${framework.formatLogic}
${framework.suggestedPillar ? `Suggested pillar: ${framework.suggestedPillar}` : ''}

TARGET:
${targetSection}
${pillarNote}${registerNote}${directionNote}${calendarNote}

BUILD RULES:
- Use ONLY Kagiso's voice, vocabulary, and sentence patterns from your system instructions
- Use her audience: South African professionals
- Use her services, diagnostic archetypes, and coaching lens as examples - not invented client stories or fabricated results
- Apply the dashboard context signals to make the content specific, but do not let them override the user's explicit direction
- The result must be entirely original: it shares only structure with the source, not words, not ideas, not examples, and not subject matter
- If the user specified a platform, follow it and infer the strongest format for that platform
- If no platform is specified, infer both the strongest platform and strongest format from the structural framework
- State at the top: PLATFORM: [platform] | PILLAR: [pillar] | WRITING REGISTER: [register]
`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const framework = body?.framework as ExtractedFramework | null | undefined;
  const platform = optionalString(body?.platform);
  const contentType = optionalString(body?.contentType);
  const subType = optionalString(body?.subType) || null;
  const targetPillar = optionalString(body?.targetPillar);
  const targetRegister = optionalString(body?.targetRegister);
  const userDirection = optionalString(body?.userDirection);
  const calendarContext = optionalString(body?.calendarContext);
  const researchEntries = Array.isArray(body?.researchEntries) ? body.researchEntries : undefined;

  if (!framework?.hookPattern || !framework.emotionalTension || !framework.storyStructure || !framework.ctaStyle || !framework.formatLogic) {
    return NextResponse.json({ error: 'Extracted framework is required.' }, { status: 400 });
  }

  const runtime = await resolveAiRuntimeConfig({ simpleMode: false });
  if (!runtime) {
    return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
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
              'alchemy_stage2',
              body?.context ?? {},
              contentType,
              subType || undefined,
              undefined,
              undefined,
              researchEntries,
              targetPillar,
            ),
          },
          { role: 'user', content: buildStage2UserPrompt(framework, platform, contentType, subType, targetPillar, targetRegister, userDirection, calendarContext) },
        ],
        max_tokens: 1800,
        temperature: 0.75,
      })),
    });
  } catch (error) {
    console.error('Transform Stage 2 network error:', error);
    return NextResponse.json({ error: 'Failed to reach AI service. Check network and try again.' }, { status: 502 });
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`Transform Stage 2 error ${response.status}:`, responseText);
    return NextResponse.json({ error: 'The rebuild failed. Your extracted structure is still saved.' }, { status: response.status });
  }

  try {
    const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const result = data.choices?.[0]?.message?.content?.trim() || '';

    if (!result) {
      return NextResponse.json({ error: 'AI service returned an empty rebuild. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'AI service returned an unreadable response.' }, { status: 500 });
  }
}
