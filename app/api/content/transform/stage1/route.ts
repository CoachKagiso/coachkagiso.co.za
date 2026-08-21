import { NextRequest, NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildAiRequestBody, type AiRuntimeConfig, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { getFallbackVisionModel, modelSupportsVision } from '@/lib/ai-models';
import {
  CAROUSEL_SLIDE_ROLES,
  CAROUSEL_SLIDE_ROLE_GLOSSES,
  carouselLayoutRecipeOptions,
} from '@/lib/content/carousel-template-registry';
import { normaliseCarouselFramework, normaliseFramework } from '@/lib/content/carousel-framework';

export const dynamic = 'force-dynamic';

const AI_VISION_MODEL = 'GLM-4.6V-Flash';
const AI_VISION_FALLBACK_MODEL = 'glm-4.5v';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_LENGTH = 30;
// CHANGE T: matches MAX_CAROUSEL_PDF_PAGES on the client.
const MAX_CAROUSEL_SLIDES = 12;

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

// CHANGE T: carousel decks are a sequence, not a single artefact. The structural
// fields above still apply to the deck as a whole; these add the shape of the
// arc, expressed in the vocabulary the generator already speaks (slide roles and
// layout recipes from carousel-template-registry), so the extracted DNA can be
// fed straight back in rather than read and retyped.
// Both the role menu the model is given and the whitelist its answer is checked
// against are built from the registry, so they cannot disagree.
const CAROUSEL_ROLE_MENU = CAROUSEL_SLIDE_ROLES
  .map((role) => `${role} (${CAROUSEL_SLIDE_ROLE_GLOSSES[role]})`)
  .join(', ');

const CAROUSEL_RECIPE_MENU = carouselLayoutRecipeOptions.map((option) => option.value).join(' / ');

const CAROUSEL_STAGE1_SYSTEM_PROMPT = `
You are a structural analyst reading a LinkedIn carousel deck slide by slide. Your ONLY job is to extract the structural pattern. You must NEVER reproduce the source wording, ideas, or subject matter.

Output ONLY valid JSON with no other text:

{
  "hookPattern": "How does the cover slide open? One sentence describing the move it makes, not the words it uses.",
  "emotionalTension": "What problem, fear, or frustration does the deck activate? One sentence naming the specific emotion.",
  "storyStructure": "How does the deck move from cover to close? One sentence describing the arc.",
  "ctaStyle": "How does the final slide close? One sentence describing what it asks of the reader.",
  "formatLogic": "Why does the carousel format suit this content? One sentence covering pacing, slide count, or how the idea is chunked.",
  "suggestedPillar": "Which pillar does this STRUCTURE fit? Name one (Career Growth & Strategy / Leadership & People Development / Personal Brand & Visibility / Mentorship & Community) and justify it from the shape of the deck - the arc, the pacing, the kind of ask it closes on. Never justify it from the deck's topic.",
  "hookTechnique": "Name the psychological triggers the opening stacks, in order, joined by ' -> '. Use trigger names, never the source's words. Then one sentence on why that stack makes a reader keep swiping.",
  "intraSlideLoop": ["The repeating beat pattern of a typical inner slide, in order, 2-5 short beat names. Example shape only: the name of each move, 1-3 words each. If inner slides have no repeating pattern, return an empty array."],
  "pacing": {
    "sentence": "Typical sentence length as a measured range, and whether one idea or several sit on a line.",
    "breath": "How white space is used between beats.",
    "close": "How a slide ends, as a rule with a length. Say how consistently it holds - do not claim every slide unless every slide does it."
  },
  "valueMethod": "How the deck makes its value usable. One or two sentences on the delivery mechanism, not the subject.",
  "ctaLayers": ["Each distinct job the closing does, in order, as 'Layer name - what it asks and why it is easy to say yes to'. One entry per layer. Most decks have 1-3."],
  "emotionalArc": {
    "start": "What the reader feels at the cover, in 2-4 words.",
    "middle": "What they feel through the middle, in 2-4 words.",
    "end": "What they feel at the close, in 2-4 words."
  },
  "slideCount": number of slides you were given,
  "slideArc": ["one role per slide, in order, chosen ONLY from: ${CAROUSEL_ROLE_MENU}. Use the role name only, not the description."],
  "layoutRecipe": "Which recipe best matches the arc? Choose ONE: ${CAROUSEL_RECIPE_MENU}",
  "copyDensity": "How much copy sits on a typical inner slide? One of: light / medium / dense",
  "visualPattern": "What does the deck do visually across slides? One sentence on layout rhythm, emphasis, or repetition. Describe the pattern, never the brand.",
  "whatMakesItWork": "The single strongest structural choice in this deck, and why it holds attention. One or two sentences.",
  "teardown": {
    "hook": { "quote": "Up to 12 words from the cover slide, verbatim.", "why": "Two or three sentences on the psychology: what each trigger does to the reader, in order, and why the stack makes them swipe. End with one blunt editorial line." },
    "structure": { "quote": "Up to 12 words showing one beat of the repeating pattern.", "why": "Two or three sentences naming the pattern, why it is not story-then-lesson, and what the repetition buys. Say whether the deck demonstrates its own technique, and if the closing slide points back at the deck itself, call that out as a re-read loop." },
    "pacing": { "examples": ["2-3 real closing lines from the deck, verbatim, each under 8 words."], "why": "Two sentences on the rhythm and its effect on the reader." },
    "value": { "quote": "Up to 12 words showing how one piece of value is delivered.", "why": "Two or three sentences on why this delivery makes the advice usable rather than theoretical." },
    "cta": { "quote": "Up to 12 words from the closing slide.", "why": "Two or three sentences on why each layer is easy to say yes to, and which layer is doing the most work." },
    "arc": { "why": "Two sentences on how the reader's feeling is engineered from first slide to last." }
  },
  "suggestedRegister": "Which of Kagiso's writing registers does this STRUCTURE suit? Choose exactly one and return only that name: Tactical Teacher / Reflective Leader / Reflection Friday / Conviction Reframe / Celebration & Gratitude / The Challenger.",
  "template": {
    "name": "A short, specific name for this mould - 2 to 5 words describing its SHAPE, never its topic. Good: 'Numbered proof listicle'. Bad: 'Storytelling tips deck'.",
    "bestFor": "One sentence on the kind of content this mould suits, written to help someone choose it from a list months later.",
    "headline": "One line naming what this mould is for, e.g. 'A 9-slide authority deck'.",
    "slides": [
      {
        "label": "Slide 1 - cover",
        "content": "The reusable mould for this slide. One block per slide, one entry per slide in the arc, in order."
      }
    ]
  },
  "hasExtractableStructure": true | false
}

TEMPLATE RULES - this is the reusable mould, and it is the most useful thing you produce:
- One entry per slide, in the same order as slideArc. Label each "Slide N - role" using that slide's arc role.
- Write the connecting words plainly, and replace every topic-specific noun, claim, and example with a SQUARE BRACKET placeholder that says what belongs there, like [THE ADVICE EVERYONE REPEATS] or [YOUR OWN EXAMPLE - 8 WORDS MAX].
- Build each slide from the mechanism you just described - its arc role, the intra-slide beat pattern, and the pacing rules - NOT by copying the source slide and swapping its nouns. A reader who knows the source must not recognise its sentences here.
- Keep the pacing in the mould itself: short lines, one idea per line, blank line between beats.
- The closing slide must carry one bracketed line per CTA layer you identified.
- Every slide must contain at least one [BRACKET]. No slide may be left as finished prose.

LENGTH RULE: 1-2 sentences per text field. Under 1300 words total, including the teardown and the template. Do not pad the machine fields to reach it - the teardown is where the depth goes.

TWO KINDS OF FIELD, AND THE DIFFERENCE MATTERS:
- The "teardown" block teaches a human how this deck was built. Short verbatim quotes are allowed there, up to 12 words at a time, for analysis. Write it to be read and learned from: name the psychology, quantify the rules, and give one blunt editorial line per layer where it earns its place.
- Every OTHER field feeds the rebuild engine. Those must carry NO source wording at all - describe the move, name the technique, give the measurement, never the sentence.

CRITICAL RULES:
- Output ONLY the JSON object above
- Outside "teardown", NEVER reproduce any wording from the source, not even a short quote
- Inside "teardown", never quote more than 12 consecutive words, and never quote the whole of a slide
- NEVER include the subject matter in the non-teardown fields - only the structural pattern
- Describe mechanism, not category. "Stacks a consensus claim then invalidates it" is useful. "Bold claim" is not.
- Quantify wherever you can. "Sentences are short" is useless. "90% are 4-12 words, one idea per line, closing line under 6 words" is useful.
- Only claim a pattern you can see holding across the slides. Count before you claim. If a closing rule holds on 4 slides out of 9, say so - do not write "every slide".
- slideArc must have exactly one entry per slide you were given, in order
- If the slides carry no readable copy, set hasExtractableStructure to false and leave text fields empty
`;

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

  // CHANGE T: on OpenRouter this used runtime.model unconditionally, so an OCR
  // pass against a text-only configured model (currently deepseek-v4-flash)
  // failed with "No endpoints found that support image input". That broke the
  // existing screenshot upload, not just carousels. Use the vision-capable
  // fallback the catalogue already provides, the same way tools-ai.ts does.
  const openRouterVisionAttempts = () => {
    const attemptList: { model: string; retries: number }[] = [];
    if (modelSupportsVision(runtime.model)) attemptList.push({ model: runtime.model, retries: 2 });
    const fallback = getFallbackVisionModel();
    if (fallback && fallback !== runtime.model) attemptList.push({ model: fallback, retries: 2 });
    if (attemptList.length === 0) throw new Error('VISION_UNAVAILABLE');
    return attemptList;
  };

  const attempts = runtime.provider === 'zai'
    ? [
        { model: AI_VISION_MODEL, retries: 3 },
        { model: AI_VISION_FALLBACK_MODEL, retries: 1 },
      ]
    : openRouterVisionAttempts();

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
        if (response.status === 404 && index >= attempt.retries - 1) {
          // The endpoint cannot take images at all; retrying it is pointless.
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

async function extractCarouselStructure(
  slideText: string,
  slideCount: number,
  runtime: AiRuntimeConfig,
): Promise<Record<string, unknown>> {
  const response = await callAi(
    runtime,
    runtime.model,
    [
      { role: 'system', content: CAROUSEL_STAGE1_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `CAROUSEL DECK (${slideCount} slides):\n${slideText}\n\nRead this deck and extract its structural framework.`,
      },
    ],
    6000,
    0.2,
  );

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`Carousel structure extraction error ${response.status}:`, responseText);
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
  let isCarousel = false;
  const slideImages: { base64: string; mediaType: string }[] = [];

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      key = String(formData.get('key') || '');
      // CHANGE T: a carousel arrives as many page images under `slides`, while a
      // single screenshot still arrives under `image`. Both use the same
      // multipart path that already worked.
      const slideFiles = formData.getAll('slides').filter((entry): entry is File => entry instanceof File);
      if (slideFiles.length > 0) {
        isCarousel = true;
        if (slideFiles.length > MAX_CAROUSEL_SLIDES) {
          return NextResponse.json(
            { error: `Carousels are analysed up to ${MAX_CAROUSEL_SLIDES} slides.` },
            { status: 400 },
          );
        }
        for (const slideFile of slideFiles) {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(slideFile.type)) {
            return NextResponse.json({ error: 'Carousel slides must be JPEG, PNG, or WebP.' }, { status: 400 });
          }
          if (slideFile.size > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: 'Each slide must be 10MB or smaller.' }, { status: 400 });
          }
          const bytes = await slideFile.arrayBuffer();
          slideImages.push({ base64: Buffer.from(bytes).toString('base64'), mediaType: slideFile.type });
        }
      }

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

  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runtime = await resolveAiRuntimeConfig({ simpleMode: false });
  if (!runtime) {
    return NextResponse.json({ error: 'AI service not configured. Add the active provider API key in Settings.' }, { status: 503 });
  }

  if (!imageBase64 && !textContent && slideImages.length === 0) {
    return NextResponse.json({ error: 'Paste source content first.' }, { status: 400 });
  }

  // CHANGE T: carousel path. Each slide is OCR'd to text, then the arc is read
  // from the assembled deck. Keeping structure extraction a text call means no
  // model has to hold twelve images at once, and it reuses the OCR pass that
  // already works for single screenshots.
  if (isCarousel) {
    const slideTexts: string[] = [];
    // Tracked rather than inferred from the joined text: a placeholder line is
    // indistinguishable from real copy once the deck is assembled, and a deck
    // read from half its slides must not look like a clean extraction.
    let unreadableSlides = 0;
    let readableCharacters = 0;

    for (const [index, slide] of slideImages.entries()) {
      try {
        const ocrResult = await extractTextFromImage(slide.base64, slide.mediaType, runtime);
        const slideText = ocrResult.text.trim();
        if (slideText) readableCharacters += slideText.length;
        else unreadableSlides += 1;
        slideTexts.push(`SLIDE ${index + 1}:\n${slideText || '(no readable copy on this slide)'}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'OCR_FAILED';
        if (reason === 'VISION_UNAVAILABLE') {
          return NextResponse.json(
            { error: 'The vision service is unavailable right now. Try again shortly.' },
            { status: 503 },
          );
        }
        unreadableSlides += 1;
        slideTexts.push(`SLIDE ${index + 1}:\n(this slide could not be read)`);
      }
    }

    const deckText = slideTexts.join('\n\n');
    // The floor scales with the deck. Thirty characters across twelve slides is
    // not a readable deck, it is noise on one slide. Counting OCR output
    // directly also avoids the old regex, which stripped every parenthesised
    // span and so ate legitimate slide copy along with the placeholders.
    const requiredCharacters = MIN_TEXT_LENGTH * Math.max(1, Math.ceil(slideImages.length / 3));

    if (readableCharacters < requiredCharacters) {
      return NextResponse.json(
        { error: 'No readable slide copy was found in this deck. If it is an image-only carousel there is no structure to extract.' },
        { status: 422 },
      );
    }

    if (unreadableSlides >= slideImages.length) {
      return NextResponse.json(
        { error: 'None of the slides could be read. Try exporting the PDF again at a higher quality.' },
        { status: 422 },
      );
    }

    try {
      const raw = await extractCarouselStructure(deckText, slideImages.length, runtime);
      const unknownRoles: string[] = [];
      const framework = normaliseCarouselFramework(raw, slideImages.length, (role) => {
        console.warn(`Carousel arc: unrecognised role "${role}" coerced to "step".`);
        unknownRoles.push(role);
      });

      // Matches the text path, which has always required all five. The carousel
      // path accepted a deck on storyStructure alone, so four empty fields could
      // reach the panel looking like a successful extraction.
      const missing = (['hookPattern', 'emotionalTension', 'storyStructure', 'ctaStyle', 'formatLogic'] as const)
        .filter((field) => !framework[field]);

      if (!framework.hasExtractableStructure || missing.length > 0) {
        console.warn('Carousel extraction incomplete. Missing fields:', missing.join(', ') || '(hasExtractableStructure false)');
        return NextResponse.json(
          {
            error: missing.length > 0
              ? `The deck was read, but the analysis came back incomplete (missing: ${missing.join(', ')}). Try extracting again.`
              : 'This deck does not have a structure that can be extracted.',
          },
          { status: 422 },
        );
      }

      // Surfaced so the panel can say the analysis is partial rather than
      // presenting an arc built from a deck it only half read.
      return NextResponse.json({
        framework,
        warnings: {
          unreadableSlides,
          totalSlides: slideImages.length,
          unknownRoles,
        },
      });
    } catch (error) {
      console.error('Carousel structure extraction failed:', error);
      return NextResponse.json({ error: 'Could not extract the structure from this deck.' }, { status: 502 });
    }
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
