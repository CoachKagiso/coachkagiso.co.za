import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { isContentPillar } from '@/lib/content-studio';

export const dynamic = 'force-dynamic';

const AI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const AI_MODEL = 'glm-5.2';

const RESEARCH_PROCESSING_PROMPT = `
You are a research analyst for Kagiso Shabangu, a South African Career Development and Personal Brand Coach.

You will receive research content — an article, report, notes, or collection of insights. Extract the most valuable information and structure it for use in content creation.

Output ONLY valid JSON with no other text:
{
  "coreInsight": "The single most important, specific insight from this research — one paragraph. Must be actionable or thought-provoking, not generic.",
  "keyFacts": [
    "Specific fact or data point — always note if approximate",
    "Another specific fact",
    "Another specific fact"
  ],
  "audienceRelevance": "One paragraph connecting this research to what South African professionals actually experience in their careers. Make it emotionally real, not academic.",
  "contentAngles": [
    {
      "angle": "contrarian_take",
      "angleName": "Contrarian Take",
      "topic": "Specific topic suggestion in Kagiso's voice — 10 to 20 words"
    },
    {
      "angle": "quick_lesson",
      "angleName": "Quick Lesson",
      "topic": "Specific topic suggestion"
    },
    {
      "angle": "short_script",
      "angleName": "TikTok Script",
      "topic": "Specific hook or opening line"
    }
  ],
  "kagisoPerspective": "If the content includes first-person coaching observations or personal experience, extract and preserve them here. If not present, return null."
}

Rules:
- Never fabricate statistics. If a fact seems uncertain, prefix it with "Approximately:"
- keyFacts must be specific — not generalizations
- contentAngles topics must sound like something Kagiso would say — direct, warm, SA professional context
- coreInsight must be the strongest signal, not a summary of everything
`.trim();

type StructuredResearch = {
  coreInsight?: string;
  keyFacts?: string[];
  audienceRelevance?: string;
  contentAngles?: { angle: string; angleName: string; topic: string }[];
  kagisoPerspective?: string | null;
};

const RESEARCH_SELECT =
  'id, title, pillar, raw_content, core_insight, key_facts, audience_relevance, content_angles, kagiso_perspective, sources, expires_at, is_evergreen, status, created_at, updated_at';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? '');

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 });
  }

  const title = String(body?.title ?? '').trim();
  const pillar = String(body?.pillar ?? '');
  const rawContent = String(body?.rawContent ?? '').trim();
  const isEvergreen = body?.isEvergreen !== false;
  const expiresAt = body?.expiresAt ? String(body.expiresAt) : null;
  const sourcesRaw = body?.sources ? String(body.sources) : '';

  if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  if (!rawContent) return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
  if (!isContentPillar(pillar))
    return NextResponse.json({ error: 'Invalid pillar.' }, { status: 400 });

  const sources = sourcesRaw
    ? sourcesRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const supabase = createSupabaseServiceClient();

  // Insert with processing status first
  const { data: entry, error: insertError } = await supabase
    .from('research_vault')
    .insert({
      title,
      pillar,
      raw_content: rawContent,
      sources,
      expires_at: expiresAt,
      is_evergreen: isEvergreen,
      status: 'processing',
    })
    .select(RESEARCH_SELECT)
    .single();

  if (insertError || !entry) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to save research.' },
      { status: 500 },
    );
  }

  // Call AI to extract structure
  let structured: StructuredResearch = {};
  let aiProcessed = false;

  try {
    const aiResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: RESEARCH_PROCESSING_PROMPT },
          {
            role: 'user',
            content: `Title: ${title}\nPillar: ${pillar}\n\nContent:\n${rawContent}`,
          },
        ],
        max_tokens: 900,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const aiText = aiData?.choices?.[0]?.message?.content ?? '{}';
      structured = JSON.parse(aiText) as StructuredResearch;
      aiProcessed = true;
    }
  } catch {
    // AI failed — save raw content without structure
    aiProcessed = false;
  }

  // Update with extracted structure (or just mark active if AI failed)
  const updatePayload: Record<string, unknown> = {
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  if (aiProcessed) {
    updatePayload.core_insight = structured.coreInsight ?? null;
    updatePayload.key_facts = Array.isArray(structured.keyFacts) ? structured.keyFacts : [];
    updatePayload.audience_relevance = structured.audienceRelevance ?? null;
    updatePayload.content_angles = Array.isArray(structured.contentAngles)
      ? structured.contentAngles
      : [];
    updatePayload.kagiso_perspective = structured.kagisoPerspective ?? null;
  }

  const { data: updatedEntry, error: updateError } = await supabase
    .from('research_vault')
    .update(updatePayload)
    .eq('id', (entry as Record<string, string>).id)
    .select(RESEARCH_SELECT)
    .single();

  if (updateError) {
    // Return the partially saved entry
    return NextResponse.json({
      entry: { ...entry, status: 'active' },
      aiProcessed: false,
      warning: 'Entry saved but structure update failed.',
    });
  }

  return NextResponse.json({
    entry: updatedEntry,
    aiProcessed,
    warning: aiProcessed
      ? null
      : 'Structure could not be extracted automatically. The raw content is saved and will still be used by Smart Suggest.',
  });
}
