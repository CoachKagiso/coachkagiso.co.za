import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, resolveToolAiRuntime, extractToolJsonObject, type ToolAiMessage } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

// The Slide editor's caption generator. Same voice engine as /api/tools/caption,
// but the source material is the deck itself and the count is the reader's choice.
const carouselCaptionPlatforms = ['linkedin', 'instagram_facebook', 'tiktok', 'email_voice'] as const;

type CarouselCaptionPlatform = (typeof carouselCaptionPlatforms)[number];

function isCarouselCaptionPlatform(value: string): value is CarouselCaptionPlatform {
  return carouselCaptionPlatforms.includes(value as CarouselCaptionPlatform);
}

function isCaptionCount(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

// instagram_facebook and email_voice have no dedicated length band, so they borrow
// the closest one. The model is told the real platform; the band only sizes it.
function promptPlatformFor(platform: CarouselCaptionPlatform): 'LinkedIn' | 'Instagram' | 'TikTok' {
  if (platform === 'tiktok') return 'TikTok';
  if (platform === 'instagram_facebook') return 'Instagram';
  return 'LinkedIn';
}

function buildCarouselCaptionSystemPrompt(count: 1 | 2 | 3) {
  const countLine = count === 1
    ? 'Generate exactly 1 caption in the single most natural register for the deck.'
    : count === 2
      ? 'Generate exactly 2 captions in the two most relevant but EMOTIONALLY DISTINCT registers. Never repeat the same register twice.'
      : `Generate exactly 3 captions:
- Caption 1: the most natural fit for the deck (for a tips carousel, usually tactical_teacher).
- Caption 2: a different emotional entry (reflective_leader, reflection_friday, or celebration_gratitude depending on context).
- Caption 3: the wildcard. Shorter, punchier, more personal (conviction_reframe, the_challenger, or celebration_gratitude).
Never repeat the same register twice.`;

  return `
# ROLE & OBJECTIVE
You are a caption writer for Kagiso Shabangu, Soweto-born Career Development and Personal Brand Coach. Tagline: Show up. Stand out. Level up. Signature closes: "Reflect. Research. Reach out." and "Your career matters." and "Own it."

Write like Kagiso personally - direct, warm, no fluff, short sentences. Not a LinkedIn guru. Not AI.

# TONE & CONTEXT
- Warm, direct, grounded.
- South African: Use "Corporate SA", "township SMEs", "graduates" where relevant. Collaborative, not aggressive.
- Use "Rand" not dollars.

# VOICE RULES (STRICT)
- NEVER use em dashes (—) or en dashes (–). Use periods.
- NEVER use: strategist, empowerment, manifestation, hustle, grind, synergy, leverage, ecosystem, game-changer, actually, vibrant, pivotal, underscore, navigate, unlock.
- EXCEPTION: You MAY use exact phrases "Show up. Stand out. Level up." and "Reflect. Research. Reach out."
- NEVER start with: "Great question!", "Absolutely!", "Love this!", "100%", "So true", "I'm excited to share", "Today I want to talk about."
- Short paragraphs. Max 2 sentences per paragraph.
- NO bullet points, numbered lists, or asterisks. Plain text only: the caption publishes to the feed exactly as written.
- Max 1 exclamation mark.

# THE DECK IS THE SOURCE, NOT THE SCRIPT
You receive the carousel slide by slide (role, headline, body). Rules:
- Do NOT summarize the slides. The reader will already see them.
- Add ONE insight the carousel does not say. That is the caption's job.
- The hook (lines 1-2, under 15 words) must NOT repeat the cover headline. Open the same tension from a new entry point: a gap, a conviction, or a reflection.

# CAPTION STRUCTURE - EVERY CAPTION MUST HAVE:
1. Hook (Lines 1-2): Under 15 words, must stop scroll. Gap, conviction, or reflection.
2. Personal line: "I teach my clients..." or "Professionals I work with..."
3. Value: ONE insight the carousel doesn't say.
4. Question: Must end the value section with a question to drive comments.
5. CTA Ladder: "Reshare with a friend who is job hunting. Save this for your next application. Follow for practical tips daily. No fluff, just what works."
6. Signature: Close with "Reflect. Research. Reach out." OR "Your career matters." OR "Own it. Your career matters."

# REGISTER DEFINITIONS
- tactical_teacher: Direct instruction. One lesson. One specific example. Opens with gap. Short declarative sentences.
- reflective_leader: Names a bigger truth about careers in SA. Personal disclosure sparingly. Builds a case.
- conviction_reframe: Names hidden cost of playing safe. Short, sharp, never hedges.
- the_challenger: Dry wit. Names what everyone thinks but nobody says. Under 150 words.
- reflection_friday: Intimate, one person to one person. Pastoral, not preachy.
- celebration_gratitude: Warm, specific, communal. Never force it onto a tips post.

# ANGLE VARIETY RULE
${countLine}

# PLATFORM LENGTH
- LinkedIn: 120-200 words
- Instagram: 80-120 words
- TikTok: 50-90 words

# OUTPUT FORMAT
Respond ONLY with valid JSON.
{
  "analysis": "1-2 sentence reasoning for the chosen register(s). Empty string when count is 1.",
  "captions": [
    { "caption": "Full text with \\n\\n for breaks. Must include question + CTA ladder + signature.", "angle": "tactical_teacher" }
  ]
}
`.trim();
}

function buildCarouselCaptionUserMessage({
  platform,
  pillar,
  register,
  topic,
  slides,
}: {
  platform: string;
  pillar: string;
  register: string;
  topic: string;
  slides: Array<{ role: string; headline: string; body: string; cta: string }>;
}): ToolAiMessage {
  const deck = slides
    .map((slide, index) => {
      const cta = slide.cta ? ` CTA: ${slide.cta}` : '';
      return `SLIDE ${index + 1} (${slide.role}): ${slide.headline} — ${slide.body}${cta}`;
    })
    .join('\n');
  const contextLines = [
    `Platform: ${platform}`,
    topic ? `Deck topic: ${topic}` : '',
    pillar ? `Content pillar: ${pillar}` : '',
    register ? `Deck register: ${register}` : '',
  ].filter(Boolean);
  return {
    role: 'user',
    content: `<user_input>\n${contextLines.join('\n')}\n\nCAROUSEL DECK:\n${deck}\n</user_input>`,
  };
}

function normalizeCaptionVariations(value: unknown, count: 1 | 2 | 3) {
  const record = value && typeof value === 'object' ? value as { captions?: unknown; analysis?: unknown } : {};
  const captions = Array.isArray(record.captions) ? record.captions : [];
  const parsed = captions.slice(0, count).map((item) => {
    const entry = item && typeof item === 'object' ? item as { caption?: unknown; angle?: unknown } : {};
    return {
      caption: String(entry.caption || '').trim(),
      angle: String(entry.angle || '').trim() || 'Caption option',
    };
  }).filter((item) => item.caption);
  return {
    captions: parsed,
    analysis: typeof record.analysis === 'string' && record.analysis.trim() ? record.analysis.trim() : undefined,
  };
}

export async function POST(req: NextRequest) {
  const runtime = await resolveToolAiRuntime();
  if (!runtime) {
    return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const key = String(body?.key || '');
  const platform = String(body?.platform || '');
  const rawCount = typeof body?.count === 'string' ? Number(body.count) : body?.count;
  const count: 1 | 2 | 3 = isCaptionCount(rawCount) ? rawCount : 2;
  const pillar = String(body?.pillar || '');
  const register = String(body?.register || '');
  const topic = String(body?.topic || '');
  const rawSlides = Array.isArray(body?.slides) ? body.slides : [];

  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCarouselCaptionPlatform(platform)) {
    return NextResponse.json({ error: 'Choose a supported caption platform.' }, { status: 400 });
  }

  const slides = rawSlides
    .map((slide: unknown) => {
      const record = slide && typeof slide === 'object' ? slide as Record<string, unknown> : {};
      const headline = String(record.headline || '').trim();
      const slideBody = String(record.body || '').trim();
      if (!headline && !slideBody) return null;
      return {
        role: String(record.role || 'slide'),
        headline: headline || 'Untitled slide',
        body: slideBody,
        cta: String(record.cta || '').trim(),
      };
    })
    .filter((slide: unknown): slide is { role: string; headline: string; body: string; cta: string } => Boolean(slide))
    .slice(0, 10);

  if (slides.length < 4) {
    return NextResponse.json({ error: 'The deck needs at least 4 slides with copy first.' }, { status: 400 });
  }

  try {
    const text = await callToolAi({
      runtime,
      messages: [
        { role: 'system', content: buildCarouselCaptionSystemPrompt(count) },
        buildCarouselCaptionUserMessage({
          platform: promptPlatformFor(platform),
          pillar,
          register,
          topic,
          slides,
        }),
      ],
      maxTokens: count === 1 ? 500 : count === 2 ? 700 : 900,
      temperature: 0.65,
      needsVision: false,
    });
    const result = normalizeCaptionVariations(extractToolJsonObject(text), count);

    if (result.captions.length !== count) {
      return NextResponse.json({ error: `The model returned ${result.captions.length} of ${count} captions. Try again.` }, { status: 500 });
    }

    return NextResponse.json({ captions: result.captions, analysis: result.analysis });
  } catch (error) {
    console.error('Carousel caption error:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again or simplify the deck copy.' }, { status: 502 });
  }
}
