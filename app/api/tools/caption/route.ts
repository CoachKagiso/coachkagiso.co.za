import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, extractToolJsonObject, type ToolAiMessage } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_API_KEY_ENV = 'ZAI_API_KEY';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const captionPlatforms = ['linkedin', 'instagram', 'tiktok', 'facebook'] as const;
const captionTones = [
  'auto',
  'tactical_teacher',
  'reflective_leader',
  'conviction_reframe',
  'reflection_friday',
  'the_challenger',
  'celebration_gratitude',
] as const;

type CaptionPlatform = (typeof captionPlatforms)[number];
type CaptionTone = (typeof captionTones)[number];

function isCaptionPlatform(value: string): value is CaptionPlatform {
  return captionPlatforms.includes(value as CaptionPlatform);
}

function isCaptionTone(value: string): value is CaptionTone {
  return captionTones.includes(value as CaptionTone);
}

function buildCaptionSystemPrompt() {
  return `
# ROLE & OBJECTIVE
You are a caption writer for Kagiso Shabangu, a South African Career Development and Personal Brand Coach. Write captions that sound like Kagiso wrote them personally: direct, warm, and grounded in South African professional reality. Not like a LinkedIn coach. Not like AI. Like a real person who has something to say and says it cleanly.

# TONE & CONTEXT
- Warm, direct, and grounded.
- South African professional context: collaborative, community-focused, and authentic. Avoid hyper-aggressive US hustle-culture jargon.
- Use "Rand" not "dollars." Use "Corporate SA" not "the corporate world."
- Do not use localized slang unless the source material specifically calls for it.

# VOICE RULES (STRICT)
- NEVER use em dashes (—) or en dashes (–). Use periods, commas, or parentheses for pauses instead.
- NEVER use these words: strategist, empowerment, manifestation, hustle, grind, synergy, leverage, ecosystem, game-changer, actually, vibrant, pivotal, underscore, navigate, unlock, level up.
- NEVER start with: "Great question!", "Absolutely!", "Love this!", "100%", "So true", "I'm excited to share", "Today I want to talk about."
- Use short paragraphs. Maximum 2 sentences per paragraph.
- NO bullet points, numbered lists, or asterisks in the caption text.
- Maximum 1 exclamation mark per caption.
- Signature: Only close with "Your career matters." if the tone is genuinely reflective or warm. Do not use it as a default closer.

# REGISTER DEFINITIONS
- auto: Analyse the source material, determine which register below is the strongest fit, then write. Do not name which register you chose in the caption. Include your reasoning in the "analysis" JSON field.
- tactical_teacher: Direct instruction. One clear lesson taught well. At least one specific, actionable example. Short declarative sentences. Opens with the problem or the gap. Closes with one concrete next step. No filler transitions.
- reflective_leader: Declarative and ambitious. Names a bigger truth about careers, leadership, or growth in South Africa. Personal disclosure used sparingly. Builds a case rather than stating a position. Takes a real stand and defends it.
- conviction_reframe: Takes what sounds safe and names the hidden cost. The discomfort is the point. Short, sharp sentences. Never hedges. Never adds qualifiers after taking a position.
- reflection_friday: Intimate. One person talking to one person. Pastoral, not preachy. Acknowledges difficulty without dramatising. Never wraps the experience in a tidy lesson. Real experiences are messy — honour the messiness.
- the_challenger: Dry wit. Visible disagreement with conventional wisdom. Names the thing everyone is thinking but nobody is saying. Punchy. Never explains the joke. Short (under 150 words).
- celebration_gratitude: Warm and specific. Earns the celebration by sharing the real journey, not just the milestone. The milestone is context. The insight is content. Never braggy, always communal.

# HALLUCINATION GUARDRAILS
- Never invent client names, results, statistics, or timelines. If the source does not provide specific details, use general language (e.g., "professionals I work with").
- Never claim specific outcomes unless they appear in the source text.
- Never reference real people, companies, or events unless they appear in the source or are widely known public knowledge.
- If the source is an image, describe only what is visible. Do not invent context, backstory, or implied results.

# PLATFORM LENGTH RULES
Adhere strictly to the word count of the requested platform:
- LinkedIn: 150-300 words.
- Instagram: 80-150 words.
- TikTok: 50-100 words. Caption supports the video, does not repeat it.
- Facebook: 100-200 words. Warmer and more communal than LinkedIn.

# ANGLE VARIETY RULE
You must generate exactly 3 captions. They must be meaningfully different — not the same idea reworded three times.
- Caption 1: The most natural fit for the source material and register.
- Caption 2: A different emotional entry point (e.g., if Caption 1 leads with the problem, Caption 2 leads with the opportunity or contrarian take).
- Caption 3: The wildcard — a pattern or angle the other two didn't explore (shorter, punchier, more personal, or more provocative).

# INPUT FORMAT
The user's data will be provided in the following format:
<user_input>
Platform: [LinkedIn/Instagram/TikTok/Facebook]
Register: [auto/tactical_teacher/reflective_leader/conviction_reframe/reflection_friday/the_challenger/celebration_gratitude]
Source Material: [Text, image description, or context]
</user_input>

# OUTPUT FORMAT
Respond ONLY with valid JSON. Do not include markdown formatting, code blocks, or any text outside the JSON object.
Format paragraph breaks within the caption strings using \\n\\n. Escape all internal quotes properly.

{
  "analysis": "Only when register is 'auto': 1-2 sentence reasoning for register choice and angle strategy. Empty string otherwise.",
  "captions": [
    {
      "caption": "Full caption text here with \\n\\n for paragraph breaks.",
      "angle": "Brief description of the angle this caption takes"
    },
    {
      "caption": "Second caption option",
      "angle": "Brief description"
    },
    {
      "caption": "Third caption option",
      "angle": "Brief description"
    }
  ]
}
`.trim();
}

function buildCaptionUserMessage({
  platform,
  tone,
  context,
  imageBase64,
  imageMediaType,
  sourceText,
}: {
  platform: string;
  tone: string;
  context: string;
  imageBase64: string;
  imageMediaType: string;
  sourceText: string;
}): ToolAiMessage {
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  const sourceSection = sourceText ? `Source Material: ${sourceText}` : 'Source Material: See uploaded image.';
  const contextSection = context ? `\nAdditional context: ${context}` : '';
  const textInstruction = `<user_input>\nPlatform: ${platformLabel}\nRegister: ${tone}\n${sourceSection}${contextSection}\n</user_input>`;

  if (imageBase64) {
    return {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
        },
        { type: 'text', text: textInstruction },
      ],
    };
  }

  return { role: 'user', content: textInstruction };
}

function normalizeCaptions(value: unknown) {
  const record = value && typeof value === 'object' ? value as { captions?: unknown; analysis?: unknown } : {};
  const captions = Array.isArray(record.captions) ? record.captions : [];
  const parsed = captions.slice(0, 3).map((item) => {
    const caption = item && typeof item === 'object' ? item as { caption?: unknown; angle?: unknown } : {};
    return {
      caption: String(caption.caption || '').trim(),
      angle: String(caption.angle || '').trim(),
    };
  }).filter((item) => item.caption);
  return {
    captions: parsed,
    analysis: typeof record.analysis === 'string' && record.analysis.trim() ? record.analysis.trim() : undefined,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env[AI_API_KEY_ENV];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured. Add ZAI_API_KEY to the server environment variables.' }, { status: 503 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let key = '';
  let platform = '';
  let tone = '';
  let context = '';
  let imageBase64 = '';
  let imageMediaType = '';
  let sourceText = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      key = String(formData.get('key') || '');
      platform = String(formData.get('platform') || '');
      tone = String(formData.get('tone') || '');
      context = String(formData.get('context') || '');
      sourceText = String(formData.get('sourceText') || formData.get('imageDescription') || '');
      const imageFile = formData.get('image');

      if (imageFile instanceof File) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) {
          return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image.' }, { status: 400 });
        }
        if (imageFile.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
        }
        const bytes = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(bytes).toString('base64');
        imageMediaType = imageFile.type;
      }
    } else {
      const body = await req.json().catch(() => null);
      key = String(body?.key || '');
      platform = String(body?.platform || '');
      tone = String(body?.tone || '');
      context = String(body?.context || '');
      sourceText = String(body?.sourceText || body?.imageDescription || '');
      imageBase64 = String(body?.imageBase64 || '');
      imageMediaType = String(body?.imageMediaType || '');
    }
  } catch {
    return NextResponse.json({ error: 'Could not read caption input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCaptionPlatform(platform)) {
    return NextResponse.json({ error: 'Choose a supported caption platform.' }, { status: 400 });
  }

  if (!isCaptionTone(tone)) {
    return NextResponse.json({ error: 'Choose a caption tone.' }, { status: 400 });
  }

  if (!imageBase64 && !sourceText.trim()) {
    return NextResponse.json({ error: 'Paste the post text or upload an image first.' }, { status: 400 });
  }

  if (imageBase64 && !imageMediaType.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a readable image first.' }, { status: 400 });
  }

  try {
    const text = await callToolAi({
      apiKey,
      messages: [
        { role: 'system', content: buildCaptionSystemPrompt() },
        buildCaptionUserMessage({ platform, tone, context, imageBase64, imageMediaType, sourceText }),
      ],
      maxTokens: 900,
      temperature: 0.65,
      needsVision: Boolean(imageBase64),
    });
    const result = normalizeCaptions(extractToolJsonObject(text));

    if (result.captions.length !== 3) {
      return NextResponse.json({ error: 'Failed to parse three captions.' }, { status: 500 });
    }

    return NextResponse.json({ captions: result.captions, analysis: result.analysis });
  } catch (error) {
    console.error('Caption tool error:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again or simplify your inputs.' }, { status: 502 });
  }
}
