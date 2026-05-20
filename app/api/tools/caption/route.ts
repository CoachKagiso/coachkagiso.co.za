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
You are a social media caption writer for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

Write captions that sound like Kagiso wrote them personally. Use her voice: direct, warm, South African professional context, no generic coaching cliches.

KAGISO'S VOICE RULES:
- Never use em dashes.
- Never use these words: strategist, empowerment, manifestation, hustle, grind, synergy, leverage, ecosystem, game-changer, actually, vibrant, pivotal, underscore.
- Close with "Your career matters." only when the tone is reflective or warm.
- Use short paragraphs. Maximum 2 sentences per paragraph.
- No bullet points in captions.
- Never start with "I am excited to share" or similar announcements.

REGISTER RULES:
- auto: choose the strongest tone/register from the source. Do not say which one you chose, just write the best captions.
- tactical_teacher: direct instruction, one clear lesson, practical.
- reflective_leader: declarative, names a bigger truth, personal.
- conviction_reframe: challenges a safe assumption, names the hidden cost.
- reflection_friday: intimate, one person talking to one person, pastoral.
- the_challenger: dry, punchy, visible disagreement, never explain the joke.
- celebration_gratitude: warm, specific, earns the celebration through the journey not just the announcement.

PLATFORM LENGTH RULES:
- LinkedIn: 150-300 words.
- Instagram: 80-150 words.
- TikTok: 50-100 words. Caption supports the video.
- Facebook: 100-200 words.

OUTPUT: Respond ONLY with valid JSON, no other text:
{
  "captions": [
    {
      "caption": "Full caption text here",
      "angle": "brief description of the angle this caption takes"
    },
    {
      "caption": "Second caption option",
      "angle": "brief description"
    },
    {
      "caption": "Third caption option",
      "angle": "brief description"
    }
  ]
}

Generate exactly 3 captions. Each must take a meaningfully different angle on the same image or topic.
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
  const textInstruction = [
    `Platform: ${platform}`,
    `Tone/Register: ${tone}`,
    sourceText ? `Source text:\n${sourceText}` : '',
    context ? `Additional context: ${context}` : '',
    '',
    "Generate 3 captions for this source in Kagiso's voice. Each caption must take a different angle.",
  ].filter(Boolean).join('\n');

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
  const record = value && typeof value === 'object' ? value as { captions?: unknown } : {};
  const captions = Array.isArray(record.captions) ? record.captions : [];
  return captions.slice(0, 3).map((item) => {
    const caption = item && typeof item === 'object' ? item as { caption?: unknown; angle?: unknown } : {};
    return {
      caption: String(caption.caption || '').trim(),
      angle: String(caption.angle || '').trim(),
    };
  }).filter((item) => item.caption);
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

  if (!isDiagnosticAdminAuthorized(key)) {
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
      temperature: 0.8,
      needsVision: Boolean(imageBase64),
    });
    const captions = normalizeCaptions(extractToolJsonObject(text));

    if (captions.length !== 3) {
      return NextResponse.json({ error: 'Failed to parse three captions.' }, { status: 500 });
    }

    return NextResponse.json({ captions });
  } catch (error) {
    console.error('Caption tool error:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again or simplify your inputs.' }, { status: 502 });
  }
}
