import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_API_KEY_ENV = 'ZAI_API_KEY';
const presentationModes = ['outline', 'external_prompt'] as const;
const contentPillars = ['career_growth', 'leadership', 'personal_brand', 'mentorship'] as const;
const sessionStrategies = ['four_pillar_integrated', 'pillar_deep_dive', 'custom_mix'] as const;

type PresentationMode = (typeof presentationModes)[number];
type ContentPillar = (typeof contentPillars)[number];
type SessionStrategy = (typeof sessionStrategies)[number];

type TopicDirection = {
  mainTopic: string;
  specificFocus: string;
  mustCover: string;
  avoid: string;
  desiredOutcome: string;
};

type PresentationInput = {
  mode: PresentationMode;
  sessionTitle: string;
  pillar: ContentPillar | 'auto';
  sessionStrategy: SessionStrategy;
  primaryOutcome: string;
  sessionDate: string;
  topicDirection: TopicDirection;
  sessionPlanMarkdown: string;
};

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

function cleanString(value: unknown, max = 6000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function normalizeTopicDirection(value: unknown): TopicDirection {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    mainTopic: cleanString(record.mainTopic, 220),
    specificFocus: cleanString(record.specificFocus, 400),
    mustCover: cleanString(record.mustCover, 2000),
    avoid: cleanString(record.avoid, 1200),
    desiredOutcome: cleanString(record.desiredOutcome, 1000),
  };
}

function normalizeInput(body: Record<string, unknown>): PresentationInput | { error: string } {
  const mode = cleanString(body.mode, 40);
  const pillar = cleanString(body.pillar, 40) || 'auto';
  const sessionStrategy = cleanString(body.sessionStrategy, 40) || 'four_pillar_integrated';
  const sessionPlanMarkdown = cleanString(body.sessionPlanMarkdown, 35000);

  if (!includesValue(presentationModes, mode)) {
    return { error: 'Choose a supported presentation option.' };
  }

  if (pillar !== 'auto' && !includesValue(contentPillars, pillar)) {
    return { error: 'Choose a supported pillar.' };
  }

  if (!includesValue(sessionStrategies, sessionStrategy)) {
    return { error: 'Choose a supported session architecture.' };
  }

  if (!sessionPlanMarkdown) {
    return { error: 'Add a session plan first so a presentation asset can be generated from it.' };
  }

  return {
    mode,
    sessionTitle: cleanString(body.sessionTitle, 180) || 'Masterclass Presentation',
    pillar,
    sessionStrategy,
    primaryOutcome: cleanString(body.primaryOutcome, 80) || 'auto',
    sessionDate: cleanString(body.sessionDate, 40),
    topicDirection: normalizeTopicDirection(body.topicDirection),
    sessionPlanMarkdown,
  };
}

function getPillarLabel(value: PresentationInput['pillar']) {
  const labels: Record<ContentPillar, string> = {
    career_growth: 'Career Growth & Strategy',
    leadership: 'Leadership & People Development',
    personal_brand: 'Personal Brand & Visibility',
    mentorship: 'Mentorship & Community',
  };
  return value === 'auto' ? 'Auto selected from the edited session plan' : labels[value];
}

function getSessionStrategyLabel(value: SessionStrategy) {
  const labels: Record<SessionStrategy, string> = {
    four_pillar_integrated: 'Four-pillar integrated masterclass',
    pillar_deep_dive: 'Pillar deep dive',
    custom_mix: 'Custom pillar mix',
  };
  return labels[value];
}

function buildTopicDirectionBlock(input: PresentationInput) {
  const rows = [
    input.topicDirection.mainTopic ? `Main topic: ${input.topicDirection.mainTopic}` : '',
    input.topicDirection.specificFocus ? `Specific focus / sub-niche: ${input.topicDirection.specificFocus}` : '',
    input.topicDirection.mustCover ? `Must cover:\n${input.topicDirection.mustCover}` : '',
    input.topicDirection.avoid ? `Avoid / do not focus on:\n${input.topicDirection.avoid}` : '',
    input.topicDirection.desiredOutcome ? `Desired attendee outcome:\n${input.topicDirection.desiredOutcome}` : '',
  ].filter(Boolean);

  return rows.length ? rows.join('\n') : 'No extra topic direction supplied.';
}

function buildPresentationSystemPrompt() {
  return `
You create presentation planning assets for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

Use the edited session plan as the source of truth. Do not invent links, prices, testimonials, statistics, or claims.

Kagiso's presentation style:
- Warm, direct, practical, and grounded in South African professional reality.
- Clear enough to facilitate live, not overloaded with text.
- Interactive. The deck should support reflection, questions, share-backs, hot seats, and action commitments.
- Slides should make Kagiso sound prepared, not scripted.
- Never use em dashes.

Return JSON only:
{
  "title": "short title",
  "markdown": "full editable markdown output"
}
`;
}

function buildOutlinePrompt(input: PresentationInput) {
  return `
Create an editable slide-by-slide presentation outline for this masterclass.

CONTEXT:
- Session title: ${input.sessionTitle}
- Session date: ${input.sessionDate || 'Not provided'}
- Pillar umbrella: ${getPillarLabel(input.pillar)}
- Session architecture: ${getSessionStrategyLabel(input.sessionStrategy)}
- Primary outcome: ${input.primaryOutcome}

TOPIC DIRECTION:
${buildTopicDirectionBlock(input)}

OUTPUT REQUIREMENTS:
- Create 18 to 26 slides for a 120-minute live online masterclass.
- Include opening, agenda, teaching sections, reflection, share-back, break, hot seat/Q&A, commitments, and close.
- Each slide must include:
  - Slide number and title
  - Timing
  - Slide purpose
  - On-slide copy, maximum 3 short bullets unless it is an activity slide
  - Speaker notes for Kagiso
  - Facilitation or activity instruction
  - Suggested visual direction
- Keep the deck flow practical. Avoid making every slide a lecture slide.
- Make clear where the four pillars or selected deep-dive pillar appears.

EDITED SESSION PLAN:
${input.sessionPlanMarkdown}
`;
}

function buildExternalPromptPrompt(input: PresentationInput) {
  return `
Create a polished paste-ready prompt Kagiso can use in an external presentation tool such as Canva AI, Gamma, PowerPoint Copilot, ChatGPT, or another deck builder.

CONTEXT:
- Session title: ${input.sessionTitle}
- Session date: ${input.sessionDate || 'Not provided'}
- Pillar umbrella: ${getPillarLabel(input.pillar)}
- Session architecture: ${getSessionStrategyLabel(input.sessionStrategy)}
- Primary outcome: ${input.primaryOutcome}

TOPIC DIRECTION:
${buildTopicDirectionBlock(input)}

THE PROMPT YOU WRITE MUST:
- Start with a clear command like "Create a presentation deck for..."
- Include Kagiso's audience, tone, brand direction, facilitation needs, and design constraints.
- Ask the external tool for a complete masterclass deck with speaker notes.
- Include slide categories and a suggested slide flow.
- Tell the external tool to keep slides light and put facilitation detail in speaker notes.
- Include what to avoid.
- Be self-contained enough that Kagiso can paste it elsewhere without also pasting the whole dashboard plan.

Use Markdown with a heading and one prompt block. Do not wrap the prompt in code fences.

EDITED SESSION PLAN TO CONVERT INTO THE EXTERNAL PROMPT:
${input.sessionPlanMarkdown}
`;
}

function normalizePresentation(value: Record<string, unknown>, input: PresentationInput) {
  const fallbackTitle = input.mode === 'outline'
    ? `${input.sessionTitle} Slide Outline`
    : `${input.sessionTitle} Presentation Prompt`;
  const title = cleanString(value.title, 180) || fallbackTitle;
  const markdown = cleanString(value.markdown, 35000);
  if (!markdown) throw new Error('PRESENTATION_MARKDOWN_MISSING');
  return {
    mode: input.mode,
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
    return NextResponse.json({ error: 'Could not read presentation generator input.' }, { status: 400 });
  }

  const input = normalizeInput(body);
  if ('error' in input) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  try {
    const text = await callToolAi({
      apiKey,
      messages: [
        { role: 'system', content: buildPresentationSystemPrompt() },
        {
          role: 'user',
          content: input.mode === 'outline'
            ? buildOutlinePrompt(input)
            : buildExternalPromptPrompt(input),
        },
      ],
      maxTokens: input.mode === 'outline' ? 4000 : 3000,
      temperature: input.mode === 'outline' ? 0.42 : 0.5,
      needsVision: false,
    });

    return NextResponse.json(normalizePresentation(extractToolJsonObject(text), input));
  } catch (error) {
    console.error('Session planner presentation tool error:', error);
    return NextResponse.json({ error: 'Something went wrong while generating the presentation asset. Try again with a shorter edited session plan.' }, { status: 502 });
  }
}
