import { NextRequest, NextResponse } from 'next/server';
import { callToolAi, extractToolJsonObject, type ToolAiMessage } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_API_KEY_ENV = 'ZAI_API_KEY';
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

function buildReplySystemPrompt(isAuto: boolean) {
  const autoBlock = isAuto ? `
AUTO GOAL MODE — You must first analyse the original content, then choose exactly ONE reply goal from the ALLOWED list below, then write the reply using that goal's rules.

ALLOWED REPLY GOALS (pick exactly one — do NOT invent new goals):
- continue_conversation: Keep the dialogue flowing naturally without a direct question. Best when the post is casual or open-ended.
- answer_question: Provide a direct, helpful answer to a specific query in the post. Best when the author explicitly asks something.
- ask_question: Prompt the author for more information or clarification to drive engagement. Best when there is room to deepen the topic.
- acknowledge: Validate the author's point or thank them for sharing. Best for simple announcements, milestones, or celebrations.
- agree_expand: Agree with the premise and add a supporting point, example, or nuance ("Yes, and..."). Best when the author makes a point you genuinely agree with and can deepen.
- challenge_respectfully: Politely offer a counterpoint or alternative view to spark healthy debate. Best when you have a legitimate, nuanced disagreement.
- add_perspective: Introduce a completely new angle, framework, or observation from your coaching experience. Best when you can enrich the conversation with a lens the author hasn't considered.
- build_visibility: Craft a high-value, insightful response designed to attract attention from the broader audience reading the thread. Best when the thread is active and your expertise can add standout value.

STRICT CONSTRAINT:
- You MUST NOT choose "invite_dm_book" or suggest taking the conversation to direct messages under any circumstances.
- Your choice must be based on what provides the most value to the original author and the audience.

STEP 1 — ANALYSE: Before choosing, write a brief 1-2 sentence analysis of what the author is saying, their likely intent, and what kind of response would be most natural and valuable.
STEP 2 — CHOOSE: Based on your analysis, pick exactly one goal from the allowed list.
STEP 3 — REPLY: Write the reply using that goal's specific rules from the GOAL-SPECIFIC RULES section below.
` : '';
  return `
You are a reply writer for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

Write replies that sound like Kagiso wrote them herself. Warm, direct, never sycophantic. She does not say "Great question!" or "Absolutely!" or "That's such a good point." She responds like a real person who has something to say.

KAGISO'S REPLY VOICE:
- Direct and warm without being gushing.
- Uses first person naturally.
- References South African professional context when relevant.
- Never generic coaching cliches.
- Never use em dashes.
- Never say: Great question, Absolutely, 100%, Love this, So true.
- Use short paragraphs and conversational rhythm.

${autoBlock}
GOAL-SPECIFIC RULES:
- continue_conversation: end with an open question.
- answer_question: give a real answer, not a vague one.
- ask_question: ask a genuine question that deepens the conversation. Not rhetorical — something you actually want to hear their answer to.
- invite_dm_book: natural, not pushy. One clear CTA at the end.
- acknowledge: warm but brief, no CTA.
- agree_expand: validate what they said first, then deepen it with your own insight, pattern, or observation from your coaching experience.
- challenge_respectfully: lead with what you agree with, then the challenge.
- add_perspective: share a specific observation or experience, not a generic add-on.
- build_visibility: add genuine value to the conversation while naturally positioning yourself as someone who works in this space. Reference a pattern you see with clients or a framework you teach — without making it sound like a pitch.

PERSON-SPECIFIC RULES:
- lead: warm, helpful, subtle invitation to continue the conversation.
- client: familiar, personal, celebrates their engagement.
- general_audience: relatable, peer-to-peer.
- peer: collegial, thoughtful, no CTA.
- unknown: neutral warmth, no assumptions.

RESPONSE TYPE RULES:
- own_post: Kagiso is the host. She owns the conversation. Her reply should deepen the engagement and reward the commenter for showing up.
- other_post: Kagiso is a guest. Her comment should add genuine value to the conversation, not redirect it to herself. No CTAs when commenting on someone else's post.

PLATFORM LENGTH RULES:
- LinkedIn: 50-150 words.
- Instagram: 20-60 words.
- TikTok: 15-40 words.
- Facebook: 30-100 words.
- Email / DM: 80-200 words.

OUTPUT: Respond ONLY with valid JSON, no other text:
{
  "reply": "Full reply text",
  "shortReply": "Shorter version of the same reply, roughly half the length"${isAuto ? ',\n  "analysis": "Brief 1-2 sentence analysis of what the author is saying and the best response approach",\n  "chosenGoal": "the goal you chose from the ALLOWED REPLY GOALS list above"' : ''}
}
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
  const apiKey = process.env[AI_API_KEY_ENV];
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured. Add ZAI_API_KEY to the server environment variables.' }, { status: 503 });
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

  if (!isDiagnosticAdminAuthorized(key)) {
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
      apiKey,
      messages: [
        { role: 'system', content: buildReplySystemPrompt(goal === 'auto') },
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
