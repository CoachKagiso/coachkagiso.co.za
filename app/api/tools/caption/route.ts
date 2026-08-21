import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, resolveToolAiRuntime, extractToolJsonObject, type ToolAiMessage } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

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
- NO bullet points, numbered lists, or asterisks.
- Max 1 exclamation mark.

# CAPTION STRUCTURE - EVERY CAPTION MUST HAVE:
1. Hook (Lines 1-2): Under 15 words, must stop scroll. Gap, conviction, or reflection.
2. Personal line: "I teach my clients..." or "Professionals I work with..."
3. Value: Do NOT summarize all slides. Add ONE insight the carousel doesn't say.
4. Question: Must end the value section with a question to drive comments.
5. CTA Ladder: "Reshare with a friend who is job hunting. Save this for your next application. Follow for practical tips daily. No fluff, just what works."
6. Signature: Close with "Reflect. Research. Reach out." OR "Your career matters." OR "Own it. Your career matters."

# REGISTER DEFINITIONS
- tactical_teacher: Direct instruction. One lesson. One specific example. Opens with gap. Short declarative sentences.
- reflective_leader: Names a bigger truth about careers in SA. Personal disclosure sparingly. Builds a case.
- conviction_reframe: Names hidden cost of playing safe. Short, sharp, never hedges.
- the_challenger: Dry wit. Names what everyone thinks but nobody says. Under 150 words.
- reflection_friday: Intimate, one person to one person. Pastoral, not preachy.
- celebration_gratitude: Warm, specific, communal.

# ANGLE VARIETY RULE
When register is "auto" and you must generate 3 captions:
- Analyse the source material against ALL 7 registers below
- Pick the 3 most relevant but EMOTIONALLY DISTINCT registers
- Never repeat the same register twice

Priority logic:
1. Caption 1: Most natural fit for the source (for a CV tips carousel, usually tactical_teacher)
2. Caption 2: Different emotional entry (reflective_leader or reflection_friday or celebration_gratitude depending on context)
3. Caption 3: Wildcard - conviction_reframe or the_challenger or celebration - shorter, punchier, more personal

Available registers you can choose from:
- tactical_teacher
- reflective_leader  
- conviction_reframe
- reflection_friday (use when post is personal, vulnerable, or it's actually Friday)
- the_challenger (use when you want to disagree with conventional wisdom)
- celebration_gratitude (use when milestone, win, anniversary - don't force it on a tips post)

For a CV tips carousel like the one you pasted, best Auto combo is:
tactical_teacher + reflective_leader + conviction_reframe

For a promotion/graduation post, best Auto combo is:
celebration_gratitude + reflective_leader + tactical_teacher

For a Friday story post, best Auto combo is:
reflection_friday + reflective_leader + the_challenger

# PLATFORM LENGTH
- LinkedIn: 120-200 words
- Instagram: 80-120 words
- TikTok: 50-90 words
- Facebook: 90-150 words

# OUTPUT FORMAT
Respond ONLY with valid JSON.
{
  "analysis": "When auto: 1-2 sentence reasoning why you chose those 3 registers. Otherwise empty.",
  "captions": [
    { "caption": "Full text with \\n\\n for breaks. Must include question + CTA ladder + signature.", "angle": "tactical_teacher / reflective_leader / challenger" },
    { "caption": "...", "angle": "..." },
    { "caption": "...", "angle": "..." }
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
  const runtime = await resolveToolAiRuntime();
  if (!runtime) {
    return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
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
      runtime,
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
