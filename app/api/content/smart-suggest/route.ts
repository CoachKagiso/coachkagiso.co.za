import { NextResponse } from 'next/server';
import {
  buildDecisionPrompt,
  buildDecisionUserPrompt,
  buildSuggestionPrompt,
  buildSuggestionUserPrompt,
} from '@/lib/content/system-prompt';
import type { SmartSuggestion, SmartSuggestSources, TrendSignal } from '@/lib/content/system-prompt';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const AI_MODEL = 'glm-5.1';

function buildFallbackSuggestion(sources: SmartSuggestSources): SmartSuggestion {
  const pillarEntries = Object.entries(sources.pillarCoverage).sort(([, a], [, b]) => a - b);
  const weakestPillar = pillarEntries[0]?.[0] ?? 'career_growth';
  const platformEntries = Object.entries(sources.platformCoverage).sort(([, a], [, b]) => a - b);
  const weakestPlatform = platformEntries[0]?.[0] ?? 'linkedin';

  const fallbackIdeas: Record<string, Partial<SmartSuggestion>> = {
    career_growth: {
      angle: 'quick_lesson',
      angleRegister: 'tactical_teacher',
      angleDisplayName: 'Quick Lesson',
      contentType: 'linkedin_post',
      subType: 'text_post',
      topic: 'The one thing most SA professionals skip when planning their next career move',
      assignment:
        'Write a LinkedIn post teaching one concrete action professionals can take this week to move their career forward intentionally.',
      whatItDoes: 'Gives the audience a concrete action they can take this week.',
      whyNow: "Career Growth hasn't been covered recently — your audience needs tactical value.",
    },
    leadership: {
      angle: 'thought_leadership',
      angleRegister: 'reflective_leader',
      angleDisplayName: 'Thought Leadership',
      contentType: 'linkedin_post',
      subType: 'long_form_post',
      topic: 'What managing a team in corporate SA teaches you that no MBA covers',
      assignment:
        'Write a long-form LinkedIn post sharing one leadership truth you learned from managing in corporate SA that formal education never taught.',
      whatItDoes: 'Positions Kagiso as an authority on SA-specific leadership challenges.',
      whyNow: "Leadership content hasn't been posted recently — your audience wants perspective.",
    },
    personal_brand: {
      angle: 'contrarian_take',
      angleRegister: 'conviction_reframe',
      angleDisplayName: 'Contrarian Take',
      contentType: 'short_script',
      subType: null,
      topic: "Your LinkedIn profile is lying about where you want to go — here's how to fix it",
      assignment:
        'Record a TikTok script challenging professionals to rewrite their LinkedIn profile to reflect where they want to go, not just where they have been.',
      whatItDoes: 'Challenges a common mistake and immediately offers a solution.',
      whyNow: "Personal Brand content hasn't been posted recently on TikTok.",
    },
    mentorship: {
      angle: 'reflection_friday',
      angleRegister: 'reflection_friday',
      angleDisplayName: 'Reflection Friday',
      contentType: 'linkedin_post',
      subType: 'text_post',
      topic:
        'The mentor I never had — and what I wish someone had told me in my first corporate role',
      assignment:
        'Write a Reflection Friday post sharing one thing you wish a mentor had told you early in your career, and turning it into a gift for your audience.',
      whatItDoes: 'Creates intimacy with the audience through honest personal disclosure.',
      whyNow: "Mentorship content hasn't been covered recently — this builds community.",
    },
  };

  const idea = fallbackIdeas[weakestPillar] ?? fallbackIdeas.career_growth;

  return {
    platform: (weakestPlatform as SmartSuggestion['platform']) ?? 'linkedin',
    contentType: idea.contentType ?? 'linkedin_post',
    subType: idea.subType ?? null,
    angle: idea.angle ?? 'quick_lesson',
    angleRegister: idea.angleRegister ?? 'tactical_teacher',
    angleDisplayName: idea.angleDisplayName ?? 'Quick Lesson',
    topic: idea.topic ?? 'One thing worth saying this week',
    assignment: idea.assignment ?? 'Write one post this week grounded in your audience signal.',
    whatItDoes: idea.whatItDoes ?? 'Provides value to the audience.',
    whyNow: idea.whyNow ?? 'Based on your content gaps.',
    sources: ['pillar_gap', 'platform_gap'],
    pillar: (weakestPillar as SmartSuggestion['pillar']) ?? 'career_growth',
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key ?? '');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ZAI_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured. Add ZAI_API_KEY to the server environment variables.' },
      { status: 503 }
    );
  }

  const sources = body?.sources as SmartSuggestSources | undefined;
  if (!sources || typeof sources !== 'object') {
    return NextResponse.json({ error: 'Smart Suggest sources are required.' }, { status: 400 });
  }

  const previousSuggestions: string[] = Array.isArray(body?.previousSuggestions)
    ? body.previousSuggestions.map(String).filter(Boolean)
    : [];

  // ─── STAGE 1: Decide if web search is needed ───────────────────────────────

  let needsSearch = false;
  let searchQuery = '';
  let trendSignals: TrendSignal[] = [];

  try {
    const decisionResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: buildDecisionPrompt() },
          { role: 'user', content: buildDecisionUserPrompt(sources) },
        ],
        max_tokens: 100,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
    });

    if (decisionResponse.ok) {
      const decisionData = (await decisionResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const decisionText = decisionData?.choices?.[0]?.message?.content ?? '{}';
      const decision = JSON.parse(decisionText) as { needsSearch?: boolean; searchQuery?: string };
      needsSearch = decision.needsSearch === true;
      searchQuery = typeof decision.searchQuery === 'string' ? decision.searchQuery : '';
    }
  } catch {
    // Stage 1 failed — continue without search
    needsSearch = false;
  }

  // ─── STAGE 1.5: Tavily search if needed ────────────────────────────────────

  if (needsSearch && searchQuery && tavilyApiKey) {
    try {
      const tavilyResponse = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tavilyApiKey}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          search_depth: 'basic',
          max_results: 3,
          include_answer: false,
          include_domains: [
            'businesstech.co.za',
            'dailymaverick.co.za',
            'businesslive.co.za',
            'linkedin.com',
            'forbes.com',
            'hbr.org',
          ],
        }),
      });

      if (tavilyResponse.ok) {
        const tavilyData = (await tavilyResponse.json()) as {
          results?: Array<{ title?: string; url?: string; published_date?: string }>;
        };
        trendSignals = (tavilyData.results ?? [])
          .slice(0, 3)
          .map((r) => ({
            headline: r.title ?? '',
            source: r.url ?? '',
            date: r.published_date ?? 'Recent',
            relevance: 'SA career and workplace context',
          }))
          .filter((t) => t.headline && t.source);
      }
    } catch {
      // Search failed — continue without trend signals
      trendSignals = [];
    }
  }

  // ─── STAGE 2: Generate suggestion ─────────────────────────────────────────

  const enrichedSources: SmartSuggestSources = {
    ...sources,
    trendSignals: trendSignals.length > 0 ? trendSignals : undefined,
  };

  let suggestionResponse: Response;
  try {
    suggestionResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: buildSuggestionPrompt() },
          {
            role: 'user',
            content: buildSuggestionUserPrompt(enrichedSources, previousSuggestions),
          },
        ],
        max_tokens: 600,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
    });
  } catch (error) {
    console.error('Z.ai Smart Suggest Stage 2 network error:', error);
    const fallback = buildFallbackSuggestion(sources);
    return NextResponse.json({ suggestion: fallback, usedSearch: false, usedFallback: true });
  }

  if (!suggestionResponse.ok) {
    const fallback = buildFallbackSuggestion(sources);
    return NextResponse.json({ suggestion: fallback, usedSearch: false, usedFallback: true });
  }

  const responseText = await suggestionResponse.text();

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(responseText);
  } catch {
    const fallback = buildFallbackSuggestion(sources);
    return NextResponse.json({ suggestion: fallback, usedSearch: false, usedFallback: true });
  }

  const suggestionText = data?.choices?.[0]?.message?.content?.trim() ?? '{}';

  try {
    const suggestion = JSON.parse(suggestionText) as SmartSuggestion;

    if (!suggestion || typeof suggestion.platform !== 'string') {
      throw new Error('Invalid suggestion shape');
    }

    // Attach citation if search was used
    if (trendSignals.length > 0) {
      suggestion.citation = {
        headline: trendSignals[0].headline,
        source: trendSignals[0].source,
        date: trendSignals[0].date,
      };
      if (!Array.isArray(suggestion.sources)) {
        suggestion.sources = [];
      }
      if (!suggestion.sources.includes('trend_signal')) {
        suggestion.sources.push('trend_signal');
      }
    }

    return NextResponse.json({
      suggestion,
      usedSearch: trendSignals.length > 0,
      usedFallback: false,
    });
  } catch {
    const fallback = buildFallbackSuggestion(sources);
    return NextResponse.json({ suggestion: fallback, usedSearch: false, usedFallback: true });
  }
}
