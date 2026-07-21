import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_API_KEY_ENV = 'ZAI_API_KEY';
const contentPillars = ['career_growth', 'leadership', 'personal_brand', 'mentorship'] as const;

type ContentPillar = (typeof contentPillars)[number];

type ResourcesInput = {
  sessionTitle: string;
  pillar: ContentPillar | 'auto';
  primaryOutcome: string;
  sessionDate: string;
  sessionPlanMarkdown: string;
};

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

function cleanString(value: unknown, max = 6000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function normalizeInput(body: Record<string, unknown>): ResourcesInput | { error: string } {
  const pillar = cleanString(body.pillar, 40) || 'auto';
  const sessionPlanMarkdown = cleanString(body.sessionPlanMarkdown, 30000);

  if (pillar !== 'auto' && !includesValue(contentPillars, pillar)) {
    return { error: 'Choose a supported pillar.' };
  }

  if (!sessionPlanMarkdown) {
    return { error: 'Add a session plan first so resources can be generated from it.' };
  }

  return {
    sessionTitle: cleanString(body.sessionTitle, 180) || 'Masterclass Action Plan',
    pillar,
    primaryOutcome: cleanString(body.primaryOutcome, 80) || 'auto',
    sessionDate: cleanString(body.sessionDate, 40),
    sessionPlanMarkdown,
  };
}

function getPillarLabel(value: ResourcesInput['pillar']) {
  const labels: Record<ContentPillar, string> = {
    career_growth: 'Career Growth & Strategy',
    leadership: 'Leadership & People Development',
    personal_brand: 'Personal Brand & Visibility',
    mentorship: 'Mentorship & Community',
  };
  return value === 'auto' ? 'Auto selected from session plan' : labels[value];
}

function buildResourcesSystemPrompt() {
  return `
You are building attendee resources for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

Kagiso's attendee resources must be practical, warm, structured, and easy to send after a live masterclass.

Rules:
- Use the supplied edited session plan as the source of truth.
- Do not invent unrelated offers, promises, statistics, links, prices, or guarantees.
- Keep the tone direct, supportive, and grounded in South African professional reality.
- Make the resources useful after the session, not another session plan.
- Produce clean Markdown only inside the JSON markdown field.
- The 90-day action plan must be specific enough that Kagiso can email it to attendees after light editing.
- Include resource ideas that can become future downloadable tools, worksheets, or email attachments.

Return JSON only:
{
  "title": "short resource pack title",
  "markdown": "full markdown resource pack"
}
`;
}

function buildResourcesUserPrompt(input: ResourcesInput) {
  return `
Create an attendee resource pack from this edited masterclass session plan.

SESSION CONTEXT:
- Title: ${input.sessionTitle}
- Pillar: ${getPillarLabel(input.pillar)}
- Primary outcome setting: ${input.primaryOutcome}
- Session date: ${input.sessionDate || 'Not provided'}

RESOURCE PACK MUST INCLUDE:
1. A short "what this covers" overview for Kagiso.
2. A participant-facing 90-day action plan split into days 1-30, 31-60, and 61-90.
3. Weekly action prompts and check-in questions.
4. A list of suggested resources/tools Kagiso should create or attach after the session.
5. A simple attendee commitment section.
6. A short email handoff note Kagiso can paste into a follow-up email.

Make the output practical and editable. Use headings, bullets, and tables where helpful.

EDITED SESSION PLAN:
${input.sessionPlanMarkdown}
`;
}

function normalizeResources(value: Record<string, unknown>, fallbackTitle: string) {
  const title = cleanString(value.title, 180) || `${fallbackTitle} Resources`;
  const markdown = cleanString(value.markdown, 30000);
  if (!markdown) throw new Error('RESOURCE_MARKDOWN_MISSING');
  return {
    title,
    markdown,
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env[AI_API_KEY_ENV];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured. Add ZAI_API_KEY to the server environment variables.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const key = String(body?.key || req.headers.get('x-diagnostic-admin-key') || '');
  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body) {
    return NextResponse.json({ error: 'Could not read resource generator input.' }, { status: 400 });
  }

  const input = normalizeInput(body);
  if ('error' in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  try {
    const text = await callToolAi({
      apiKey,
      messages: [
        { role: 'system', content: buildResourcesSystemPrompt() },
        { role: 'user', content: buildResourcesUserPrompt(input) },
      ],
      maxTokens: 3200,
      temperature: 0.45,
      needsVision: false,
    });

    return NextResponse.json(normalizeResources(extractToolJsonObject(text), input.sessionTitle));
  } catch (error) {
    console.error('Session planner resources tool error:', error);
    return NextResponse.json({ error: 'Something went wrong while generating attendee resources. Try again with a shorter edited session plan.' }, { status: 502 });
  }
}
