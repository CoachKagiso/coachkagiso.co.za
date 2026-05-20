import { NextRequest, NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildAiRequestBody, type AiRuntimeConfig, resolveAiRuntimeConfig } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

const AI_VISION_MODEL = 'GLM-4.6V-Flash';
const AI_VISION_FALLBACK_MODEL = 'glm-4.5v';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_LENGTH = 30;

const STAGE1_SYSTEM_PROMPT = `
You are a structural analyst. Your ONLY job is to extract the structural pattern from content. You must NEVER reproduce the source wording, ideas, or subject matter.

Extract ONLY these structural elements. Output ONLY valid JSON with no other text:

{
  "hookPattern": "How does it open? One sentence. (question / bold claim / statistic / scene / uncomfortable truth / reversal / POV scenario)",
  "emotionalTension": "What problem, fear, or frustration does it activate? One sentence naming the specific emotion, not a general description.",
  "storyStructure": "How is the middle organised? One sentence. (problem-solution / numbered steps / before-after / journey / conviction reframe / observation-then-insight)",
  "ctaStyle": "How does it close? One sentence. (soft ask / direct ask / reflection prompt / next-step instruction / affirmation / open question)",
  "formatLogic": "Why does this format work for this content? One sentence covering length, rhythm, visual structure, or platform fit.",
  "suggestedPillar": "Which of these four pillars does this structure naturally fit? One sentence: name the pillar (Career Growth & Strategy / Leadership & People Development / Personal Brand & Visibility / Mentorship & Community) and state why.",
  "hasExtractableStructure": true | false
}

LENGTH RULE: Each field gets 1-2 sentences maximum. Be specific and concise, not analytical or verbose. The entire output should be under 150 words total.

CRITICAL RULES:
- Output ONLY the JSON object above
- NEVER reproduce any wording from the source
- NEVER comment on the source content, its topic, or its quality
- NEVER include the subject matter - only the structural pattern
- If the source is an image, first read all visible text, then extract structure only
- If the source image has no readable post/caption/article text, or only contains a logo, icon, brand mark, decoration, photo, or isolated graphic, set hasExtractableStructure to false and leave every structural field as an empty string
- Do not infer structure from a logo, colors, visual style, file name, or brand identity
`;

const OCR_SYSTEM_PROMPT = `You are a text extraction tool. Your only job is to read and return ALL visible text from the image exactly as written.

Rules:
- Output ONLY valid JSON: {"text": "all visible text here", "hasText": true or false}
- Copy every word, sentence, and paragraph you can read exactly as written
- Do NOT describe the image, interpret it, or add commentary
- Do NOT invent or guess text that is not clearly readable
- If the image is a logo, icon, brand mark, decoration, photograph, or graphic with no readable sentence-level text, return {"text": "", "hasText": false}
- Single words, brand names, or short labels do NOT count as content text — only return hasText:true if there is a post, caption, article, slide, or paragraph of readable text
- A logo with a brand name underneath is NOT content text`;

function normaliseFramework(value: Record<string, unknown>) {
  return {
    hookPattern: String(value.hookPattern || '').trim(),
    emotionalTension: String(value.emotionalTension || '').trim(),
    storyStructure: String(value.storyStructure || '').trim(),
    ctaStyle: String(value.ctaStyle || '').trim(),
    formatLogic: String(value.formatLogic || '').trim(),
    suggestedPillar: String(value.suggestedPillar || '').trim(),
    hasExtractableStructure: value.hasExtractableStructure !== false,
  };
}

function extractJsonObject(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('JSON_OBJECT_NOT_FOUND');
    }
    return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAi(runtime: AiRuntimeConfig, model: string, messages: Array<Record<string, unknown>>, maxTokens: number, temperature: number) {
  return fetch(`${runtime.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: runtime.headers,
    body: JSON.stringify(buildAiRequestBody(runtime, {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    })),
  });
}

async function extractTextFromImage(imageBase64: string, imageMediaType: string, runtime: AiRuntimeConfig): Promise<{ text: string; hasText: boolean }> {
  const messages = [
    { role: 'system', content: OCR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
        },
        {
          type: 'text',
          text: 'Read this image. Extract all visible text exactly as written. If there is no readable post, caption, article, slide, or paragraph of content text, return hasText:false with an empty text field. Do not describe or interpret the image.',
        },
      ],
    },
  ];

  const attempts = runtime.provider === 'zai'
    ? [
        { model: AI_VISION_MODEL, retries: 3 },
        { model: AI_VISION_FALLBACK_MODEL, retries: 1 },
      ]
    : [{ model: runtime.model, retries: 2 }];

  for (const attempt of attempts) {
    for (let index = 0; index < attempt.retries; index += 1) {
      const response = await callAi(runtime, attempt.model, messages, 800, 0.1);

      const responseText = await response.text();
      if (!response.ok) {
        console.error(`OCR pass error ${response.status} (${attempt.model}):`, responseText);
        const isTemporaryOverload = response.status === 429 && responseText.includes('"1305"');
        if (isTemporaryOverload && index < attempt.retries - 1) {
          await wait(600);
          continue;
        }
        if (isTemporaryOverload && attempt.model === AI_VISION_MODEL) {
          break;
        }
        if (response.status === 401 || response.status === 403 || response.status === 429) {
          throw new Error('VISION_UNAVAILABLE');
        }
        throw new Error('OCR_FAILED');
      }

      try {
        const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content?.trim() || '{}';
        const parsed = extractJsonObject(content) as { text?: unknown; hasText?: unknown };
        const text = String(parsed.text || '').trim();
        return {
          text,
          hasText: parsed.hasText === true || text.length >= MIN_TEXT_LENGTH,
        };
      } catch {
        console.error('OCR parse error:', responseText);
        throw new Error('OCR_PARSE_FAILED');
      }
    }
  }

  throw new Error('VISION_UNAVAILABLE');
}

async function extractStructureFromText(textContent: string, runtime: AiRuntimeConfig): Promise<Record<string, unknown>> {
  const response = await callAi(
    runtime,
    runtime.model,
    [
      { role: 'system', content: STAGE1_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `CONTENT:\n${textContent}\n\nRead this content and extract its structural framework.`,
      },
    ],
    500,
    0.2,
  );

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`Structure extraction error ${response.status}:`, responseText);
    throw new Error('STRUCTURE_EXTRACTION_FAILED');
  }

  const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() || '{}';
  return extractJsonObject(content);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  let key = '';
  let textContent = '';
  let imageBase64 = '';
  let imageMediaType = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      key = String(formData.get('key') || '');
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
      textContent = String(body?.content || '').trim();
      imageBase64 = String(body?.imageBase64 || '').trim();
      imageMediaType = String(body?.imageMediaType || '').trim();
    }
  } catch {
    return NextResponse.json({ error: 'Could not read transform input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runtime = await resolveAiRuntimeConfig({ simpleMode: false });
  if (!runtime) {
    return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
  }

  if (!imageBase64 && !textContent) {
    return NextResponse.json({ error: 'Paste source content first.' }, { status: 400 });
  }

  if (imageBase64 && !imageMediaType.startsWith('image/')) {
    return NextResponse.json({ error: 'Upload a readable screenshot first.' }, { status: 400 });
  }

  let sourceText = textContent;

  if (imageBase64) {
    try {
      const ocrResult = await extractTextFromImage(imageBase64, imageMediaType, runtime);

      if (!ocrResult.hasText || ocrResult.text.length < MIN_TEXT_LENGTH) {
        return NextResponse.json(
          { error: 'This image does not contain readable text content (like a post, caption, article, or slide). Structure extraction requires text to analyse. Try uploading a screenshot of a social post or paste the text directly.' },
          { status: 422 },
        );
      }

      sourceText = ocrResult.text;
    } catch (error) {
      if (error instanceof Error && error.message === 'VISION_UNAVAILABLE') {
        return NextResponse.json(
          { error: 'Vision extraction is unavailable for this AI key or plan right now. Try pasting the text manually instead of uploading an image.' },
          { status: 503 },
        );
      }
      console.error('Transform Stage 1 OCR error:', error);
      return NextResponse.json({ error: 'Could not read the text from this image. Try pasting the content directly instead.' }, { status: 502 });
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = await extractStructureFromText(sourceText, runtime);
  } catch (error) {
    console.error('Transform Stage 1 structure extraction error:', error);
    return NextResponse.json({ error: 'Could not extract the structure from this content.' }, { status: 502 });
  }

  try {
    const framework = normaliseFramework(parsed);

    if (!framework.hasExtractableStructure || !framework.hookPattern || !framework.emotionalTension || !framework.storyStructure || !framework.ctaStyle || !framework.formatLogic) {
      return NextResponse.json({ error: "The source content didn't contain a clear structural pattern." }, { status: 422 });
    }

    return NextResponse.json({ framework });
  } catch (error) {
    console.error('Transform Stage 1 parse error:', error, JSON.stringify(parsed).slice(0, 500));
    return NextResponse.json({ error: 'Failed to parse structure extraction.' }, { status: 500 });
  }
}
