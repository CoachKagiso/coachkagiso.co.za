import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, resolveToolAiRuntime, extractToolJsonObject, type ToolAiMessage } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const replyPlatforms = ['linkedin', 'instagram', 'tiktok', 'facebook', 'email_dm'] as const;
const replyResponseTypes = ['own_post', 'other_post'] as const;
const replyGoals = [
  'auto',
  'continue_conversation',
  'answer_question',
  'ask_question',
  'invite_dm_book',
  'acknowledge',
  'agree_expand',
  'challenge_respectfully',
  'add_perspective',
  'build_visibility',
] as const;
const replyPersonTypes = ['lead', 'client', 'general_audience', 'peer', 'unknown'] as const;

type ReplyPlatform = (typeof replyPlatforms)[number];
type ReplyResponseType = (typeof replyResponseTypes)[number];
type ReplyGoal = (typeof replyGoals)[number];
type ReplyPersonType = (typeof replyPersonTypes)[number];

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

export function buildReplySystemPrompt({ context = 'other_post' } = {}) {
  const isOwnPost = context === 'own_post';

  return `
 # IDENTITY
 You are Kagiso Shabangu, a Soweto-born Career Development and Personal Brand Coach.
 Tagline: Show up. Stand out. Level up.
 Voice: Direct, warm, grounded. Short sentences. No fluff.

 # VOICE RULES (STRICT)
 - NEVER use em dashes (—) or en dashes (–). Use periods.
 - NEVER use: strategist, empowerment, manifestation, hustle, grind, synergy, leverage, ecosystem, game-changer, actually, vibrant, pivotal, underscore, navigate, unlock.
 - EXCEPTION: You MAY use exact phrases "Show up. Stand out. Level up." and "Reflect. Research. Reach out."
 - NEVER start with: "Great question!", "Absolutely!", "Love this!", "100%", "So true", "I'm excited to share"
 - Short paragraphs. Max 2 sentences per paragraph.
 - Max 1 exclamation mark.
 - SA context: "Corporate SA" not "corporate world"

 # SIGNATURES (USE CONDITIONALLY)
 Available: "Your career matters." / "It's possible." / "Reflect. Research. Reach out." / "Own it." / "Own it. Your career matters."
 RULE: Only use signature when ${isOwnPost ? 'context is own_post - you may close with one signature' : 'context is other_post - NEVER use signature, NEVER use CTA Ladder. Be a human commenting on their post, not promoting yourself.'}

 # REPLY TYPES
 - build_visibility: When giving visibility advice, use pattern "I teach my clients..." not generic advice. Example: "I teach my clients to lead with a positioning line, not their job title."
 - own_post (lead nurturing): Answer question directly + add one value reframe + ${isOwnPost ? 'include CTA Ladder: "Follow for practical tips daily. No fluff, just what works." + signature' : 'no CTA'}
 - other_post (commenting on others): Be helpful, brief, no self-promo, no CTA Ladder, no signature, no "I'm Kagiso". Just add value.

 # LENGTH
 - own_post reply: 40-90 words
 - other_post reply: 15-45 words
 - No bullet points, no numbered lists
 `.trim();
}

function buildReplyUserMessage({
  platform,
  responseType,
  goal,
  personType,
  originalText,
  imageBase64,
  imageMediaType,
}: {
  platform: ReplyPlatform;
  responseType: ReplyResponseType;
  goal: ReplyGoal;
  personType: ReplyPersonType;
  originalText: string;
  imageBase64: string;
  imageMediaType: string;
}): ToolAiMessage {
  const isAuto = goal === 'auto';
  const contentTag = isAuto ? '<original_content>' : '';
  const contentClose = isAuto ? '</original_content>' : '';
  const textInstruction = [
    `Platform: ${platform}`,
    `Response type: ${responseType}`,
    `Goal: ${goal}`,
    `Person type: ${personType}`,
    originalText ? `${isAuto ? '<original_content>\n' : ''}${originalText}${isAuto ? '\n</original_content>' : ''}` : '',
    '',
    "Write a reply in Kagiso's voice. Follow all the rules for this goal and person type.",
  ].filter(Boolean).join('\n');

  if (imageBase64) {
    return {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
        },
        { type: 'text', text: `This is a screenshot of the content to respond to.\n\n${textInstruction}` },
      ],
    };
  }

  return { role: 'user', content: textInstruction };
}

function normalizeReply(value: unknown) {
  const record = value && typeof value === 'object' ? value as { reply?: unknown; shortReply?: unknown; chosenGoal?: unknown; analysis?: unknown } : {};
  return {
    reply: String(record.reply || '').trim(),
    shortReply: String(record.shortReply || '').trim(),
    chosenGoal: typeof record.chosenGoal === 'string' ? record.chosenGoal.trim() : undefined,
    analysis: typeof record.analysis === 'string' ? record.analysis.trim() : undefined,
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
  let responseType = '';
  let goal = '';
  let personType = '';
  let originalText = '';
  let imageBase64 = '';
  let imageMediaType = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      key = String(formData.get('key') || '');
      platform = String(formData.get('platform') || '');
      responseType = String(formData.get('responseType') || '');
      goal = String(formData.get('goal') || '');
      personType = String(formData.get('personType') || '');
      originalText = String(formData.get('originalText') || '');
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
      responseType = String(body?.responseType || '');
      goal = String(body?.goal || '');
      personType = String(body?.personType || '');
      originalText = String(body?.originalText || '');
      imageBase64 = String(body?.imageBase64 || '');
      imageMediaType = String(body?.imageMediaType || '');
    }
  } catch {
    return NextResponse.json({ error: 'Could not read reply input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!includesValue(replyPlatforms, platform)) {
    return NextResponse.json({ error: 'Choose a supported reply platform.' }, { status: 400 });
  }

  if (!includesValue(replyResponseTypes, responseType)) {
    return NextResponse.json({ error: 'Choose what type of response this is.' }, { status: 400 });
  }

  if (!includesValue(replyGoals, goal)) {
    return NextResponse.json({ error: 'Choose the goal of this reply.' }, { status: 400 });
  }

  if (!includesValue(replyPersonTypes, personType)) {
    return NextResponse.json({ error: 'Choose who this person is.' }, { status: 400 });
  }

  if (responseType === 'other_post' && goal === 'invite_dm_book') {
    return NextResponse.json({ error: "Don't use a DM or booking CTA when commenting on someone else's post." }, { status: 400 });
  }

  if (!imageBase64 && !originalText.trim()) {
    return NextResponse.json({ error: 'Paste the original text or upload a screenshot first.' }, { status: 400 });
  }

  if (imageBase64 && !imageMediaType.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a readable screenshot first.' }, { status: 400 });
  }

  try {
    const text = await callToolAi({
      runtime,
      messages: [
        { role: 'system', content: buildReplySystemPrompt({ context: responseType }) },
        buildReplyUserMessage({
          platform,
          responseType,
          goal,
          personType,
          originalText,
          imageBase64,
          imageMediaType,
        }),
      ],
      maxTokens: 700,
      temperature: 0.75,
      needsVision: Boolean(imageBase64),
    });
    const reply = normalizeReply(extractToolJsonObject(text));

    if (!reply.reply || !reply.shortReply) {
      return NextResponse.json({ error: 'Failed to parse reply.' }, { status: 500 });
    }

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Reply tool error:', error);
    return NextResponse.json({ error: 'Something went wrong. Try again or simplify your inputs.' }, { status: 502 });
  }
}
