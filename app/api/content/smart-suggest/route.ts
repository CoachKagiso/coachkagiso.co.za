import { NextResponse } from 'next/server';
import {
  buildDecisionPrompt,
  buildDecisionUserPrompt,
  buildSuggestionPrompt,
  buildSuggestionUserPrompt,
} from '@/lib/content/system-prompt';
import type { SmartSuggestion, SmartSuggestSource, SmartSuggestSources, TrendSignal } from '@/lib/content/system-prompt';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const AI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const AI_MODEL = 'glm-5.1';

const VALID_PLATFORMS = ['linkedin', 'instagram_facebook', 'tiktok', 'email_voice'] as const;
const VALID_PILLARS = ['career_growth', 'leadership', 'personal_brand', 'mentorship'] as const;
const VALID_REGISTERS = [
  'tactical_teacher', 'reflective_leader', 'reflection_friday',
  'conviction_reframe', 'celebration_gratitude', 'the_challenger',
] as const;
const VALID_SOURCES = [
  'pillar_gap', 'platform_gap', 'insights_repurpose', 'vault_draft',
  'service_demand', 'lead_signal', 'content_variety', 'trend_signal',
  'from_research', 'original_ideation',
] as const;
const VALID_ANGLES = [
  'contrarian_take', 'hot_observation', 'thought_provoking_question', 'quick_lesson',
  'lessons_learned', 'behind_the_scenes', 'client_win', 'personal_milestone',
  'career_framework', 'industry_insight', 'resource_worth_sharing', 'reflection_friday',
  'community_call', 'relatable_observation', 'career_hot_take', 'the_challenger',
  'case_study', 'before_and_after', 'the_deep_dive', 'contrarian_argument',
  'thought_leadership', 'bold_prediction', 'personal_essay', 'career_turning_point',
  'thought_leadership_framework', 'contrarian_with_evidence', 'industry_trend_analysis',
  'ultimate_guide', 'problem_solution_breakdown', 'evergreen_resource',
  'career_lessons_reflections', 'longform_case_study', 'leadership_wisdom',
  'how_to_guide', 'x_tips_for_y', 'checklists_workflows', 'myth_vs_fact', 'this_not_that',
  'resource_roundup', 'faq', 'stats_data_story', 'problem_and_solution',
  'career_journey_timeline', 'personal_brand_values', 'product_service_deep_dive',
  'quotes_and_insights', 'career_decision', 'hot_take_vote', 'experience_check',
  'industry_opinion', 'progressive_deep_dive', 'myth_busting_series',
  'before_during_after', 'daily_challenge', 'story_arc', 'lead_with_feeling',
  'uncomfortable_truth', 'relatable_moment', 'personal_disclosure',
  'relatable_career_moment', 'community_question', 'poll_question',
  'one_honest_question', 'community_moment', 'pov_scenario', 'conviction_reframe',
  '3_step_tip', 'common_mistake', 'reaction_to_bad_advice', 'part_of_series',
  'day_in_the_life', 'warm_checkin', 'raw_honest_moment', 'value_first_offer',
  'story_then_offer', 'one_thing_ive_been_thinking',
] as const;
const MAX_HEADLINE_LENGTH = 80;
const MAX_TEXT_LENGTH = 300;

function clamp(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

/**
 * Strip em dashes, en dashes, and double-hyphen dash tricks from a text
 * field. This is a defense-in-depth pass: the Smart Suggest system prompt
 * bans em dashes, but the model still leaks them on some prompts. Rather
 * than ship them to the UI, we replace them at the boundary.
 *
 *   "Why X is invisible — and the one fix"
 *     -> "Why X is invisible, and the one fix"
 *
 *   "From X — to Y"  (false range using em dash)
 *     -> "From X to Y"
 *
 *   "No X — no Y"    (tailing negation)
 *     -> "No X. No Y."
 */
function stripDashes(value: string): string {
  return value
    .replace(/\s*—\s*/g, '. ')        // spaced em dash -> sentence break
    .replace(/—/g, '-')                // any leftover em dash -> hyphen
    .replace(/\s*–\s*/g, ', ')         // en dash with spaces -> comma
    .replace(/–/g, '-')                // leftover en dash -> hyphen
    .replace(/\s+--\s+/g, '. ')        // double-hyphen trick
    .replace(/--/g, '-')               // any leftover double-hyphen
    .replace(/\.\s*\./g, '.')          // collapse double periods
    .replace(/\s+\./g, '.')            // tighten " ." -> "."
    .trim();
}

function sanitizeSuggestionTextFields(raw: Record<string, unknown>): Record<string, unknown> {
  const textKeys = ['angleDisplayName', 'headline', 'topic', 'assignment', 'whatItDoes', 'whyNow'];
  const out: Record<string, unknown> = { ...raw };
  for (const key of textKeys) {
    if (typeof out[key] === 'string') {
      out[key] = stripDashes(out[key] as string);
    }
  }
  return out;
}

function fallbackHeadline(value: string): string {
  const cleaned = stripDashes(value)
    .replace(/^write\s+(a|an|one)?\s*/i, '')
    .replace(/^(post|script|caption|email|piece)\s+(about|that|on)?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstThought = cleaned.split(/[.!?]/)[0]?.trim() || 'One Strong Career Idea';
  return firstThought.split(/\s+/).filter(Boolean).slice(0, 8).join(' ') || 'One Strong Career Idea';
}

function validateSuggestion(raw: unknown): SmartSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const platform = VALID_PLATFORMS.includes(obj.platform as typeof VALID_PLATFORMS[number])
    ? (obj.platform as string)
    : null;
  if (!platform) return null;

  const pillar = VALID_PILLARS.includes(obj.pillar as typeof VALID_PILLARS[number])
    ? (obj.pillar as string)
    : null;
  if (!pillar) return null;

  const angleRegister = VALID_REGISTERS.includes(obj.angleRegister as typeof VALID_REGISTERS[number])
    ? (obj.angleRegister as string)
    : 'tactical_teacher';

  const angle = typeof obj.angle === 'string' && VALID_ANGLES.includes(obj.angle as typeof VALID_ANGLES[number])
    ? obj.angle
    : 'quick_lesson';

  const rawSources = Array.isArray(obj.sources) ? obj.sources : [];
  const sources = rawSources.filter((s: unknown) =>
    VALID_SOURCES.includes(s as typeof VALID_SOURCES[number])
  ) as SmartSuggestSource[];

  const contentType = typeof obj.contentType === 'string' && obj.contentType.length > 0
    ? obj.contentType
    : null;
  if (!contentType) return null;

  return {
    platform: platform as SmartSuggestion['platform'],
    contentType,
    subType: typeof obj.subType === 'string' ? obj.subType : null,
    angle,
    angleRegister,
    angleDisplayName: clamp(obj.angleDisplayName, MAX_TEXT_LENGTH) || angle,
    headline: clamp(obj.headline, MAX_HEADLINE_LENGTH) || fallbackHeadline(clamp(obj.topic, MAX_TEXT_LENGTH) || clamp(obj.assignment, MAX_TEXT_LENGTH)),
    topic: clamp(obj.topic, MAX_TEXT_LENGTH) || 'One thing worth sharing this week',
    assignment: clamp(obj.assignment, MAX_TEXT_LENGTH) || 'Write one post grounded in your audience signal.',
    whatItDoes: clamp(obj.whatItDoes, MAX_TEXT_LENGTH) || 'Provides value to the audience.',
    whyNow: clamp(obj.whyNow, MAX_TEXT_LENGTH) || 'Based on your content gaps.',
    sources,
    pillar: pillar as SmartSuggestion['pillar'],
  };
}

function verifySources(suggestion: SmartSuggestion, sources: SmartSuggestSources): SmartSuggestion {
  const verified: SmartSuggestSource[] = [];
  const hasPillarGap = Object.values(sources.pillarCoverage).some((v) => v === 0);
  const hasPlatformGap = Object.values(sources.platformCoverage).some((v) => v === 0);
  const hasInsights = (sources.insightsSummaries?.length ?? 0) > 0;
  const hasVault = (sources.vaultDraftCount ?? 0) > 0;
  const hasServiceDemand = !!sources.topService && sources.topService !== 'No service demand yet';
  const hasTrend = (sources.trendSignals?.length ?? 0) > 0;

  for (const src of suggestion.sources) {
    if (src === 'pillar_gap' && !hasPillarGap) continue;
    if (src === 'platform_gap' && !hasPlatformGap) continue;
    if (src === 'insights_repurpose' && !hasInsights) continue;
    if (src === 'vault_draft' && !hasVault) continue;
    if (src === 'service_demand' && !hasServiceDemand) continue;
    if (src === 'trend_signal' && !hasTrend) continue;
    if (src === 'original_ideation' || src === 'from_research' || src === 'content_variety' || src === 'lead_signal') {
      verified.push(src);
      continue;
    }
    verified.push(src);
  }

  return { ...suggestion, sources: verified };
}

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
      headline: 'The Career Move You Keep Delaying',
      contentType: 'linkedin_post',
      subType: 'text_post',
      topic: sources.strongestTheme
        ? `What most SA professionals get wrong about ${sources.strongestTheme}`
        : 'The one thing most SA professionals skip when planning their next career move',
      assignment:
        `Write a LinkedIn post about ${sources.strongestTheme ?? 'career growth'} that gives your audience one concrete action they can take this week.`,
      whatItDoes: 'Gives the audience a concrete action they can take this week.',
      whyNow: sources.topArchetype
        ? `Your ${sources.topArchetype} audience needs tactical value on ${sources.strongestTheme ?? 'career growth'}.`
        : "Career Growth hasn't been covered recently — your audience needs tactical value.",
    },
    leadership: {
      angle: 'thought_leadership',
      angleRegister: 'reflective_leader',
      angleDisplayName: 'Thought Leadership',
      headline: 'The Lesson No MBA Taught',
      contentType: 'linkedin_post',
      subType: 'long_form_post',
      topic: sources.topService
        ? `What your experience with ${sources.topService} taught you about leading in corporate SA`
        : 'What managing a team in corporate SA teaches you that no MBA covers',
      assignment:
        `Write a long-form LinkedIn post about a leadership lesson from your ${sources.topService ?? 'corporate'} experience that formal education never taught.`,
      whatItDoes: 'Positions Kagiso as an authority on SA-specific leadership challenges.',
      whyNow: `Leadership content hasn't been posted recently — ${sources.hotLeadsCount > 0 ? `${sources.hotLeadsCount} leads are waiting` : 'your audience wants perspective'}.`,
    },
    personal_brand: {
      angle: 'contrarian_take',
      angleRegister: 'conviction_reframe',
      angleDisplayName: 'Contrarian Take',
      headline: 'Your LinkedIn Profile Is Lying',
      contentType: 'short_script',
      subType: null,
      topic: sources.topArchetype
        ? `Why most ${sources.topArchetype} professionals are invisible on LinkedIn, and the one fix`
        : "Your LinkedIn profile is lying about where you want to go. Here is how to fix it.",
      assignment:
        `Record a TikTok script about why ${sources.topArchetype ?? 'SA professionals'} struggle to stand out and give them one immediate fix.`,
      whatItDoes: 'Challenges a common mistake and immediately offers a solution.',
      whyNow: `Personal Brand content hasn't been posted recently on TikTok — ${sources.strongestTheme ? `${sources.strongestTheme} is trending with your audience` : 'your audience is active'}.`,
    },
    mentorship: {
      angle: 'reflection_friday',
      angleRegister: 'reflection_friday',
      angleDisplayName: 'Reflection Friday',
      headline: 'The Mentor I Needed Earlier',
      contentType: 'linkedin_post',
      subType: 'text_post',
      topic:
        sources.strongestTheme
          ? `What I wish someone had told me about ${sources.strongestTheme} in my first corporate role`
          : 'The mentor I never had, and what I wish someone had told me in my first corporate role',
      assignment:
        `Write a Reflection Friday post about what you wish a mentor had told you about ${sources.strongestTheme ?? 'navigating corporate SA'}, and turn it into a gift for your audience.`,
      whatItDoes: 'Creates intimacy with the audience through honest personal disclosure.',
      whyNow: `Mentorship content hasn't been covered recently — ${sources.hotLeadsCount > 0 ? `${sources.hotLeadsCount} warm leads could use this` : 'this builds community'}.`,
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
    headline: idea.headline ?? fallbackHeadline(idea.topic ?? 'One thing worth saying this week'),
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
            'linkedin.com',
            'forbes.com',
            'hbr.org',
            'businesstech.co.za',
            'dailymaverick.co.za',
            'businesslive.co.za',
            'inc.com',
            'fastcompany.com',
            'theguardian.com',
            'bbc.com',
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

  async function callStage2(retry: boolean): Promise<{ suggestion: SmartSuggestion; usedSearch: boolean; usedFallback: boolean } | null> {
    const temp = retry ? 0.2 : 0.4;
    try {
      const resp = await fetch(`${AI_BASE_URL}/chat/completions`, {
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
          temperature: temp,
          response_format: { type: 'json_object' },
          thinking: { type: 'disabled' },
        }),
      });

      if (!resp.ok) return null;

      const responseText = await resp.text();
      let data: { choices?: Array<{ message?: { content?: string } }> };
      try {
        data = JSON.parse(responseText);
      } catch {
        return null;
      }

      const suggestionText = data?.choices?.[0]?.message?.content?.trim() ?? '{}';
      let parsed: unknown;
      try {
        parsed = JSON.parse(suggestionText);
      } catch {
        return null;
      }

      // Strip em/en dashes from text fields before validation so the UI
      // never sees them, regardless of what the model produced.
      const sanitized = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? sanitizeSuggestionTextFields(parsed as Record<string, unknown>)
        : parsed;

      const validated = validateSuggestion(sanitized);
      if (!validated) return null;

      const verified = verifySources(validated, enrichedSources);

      if (trendSignals.length > 0) {
        verified.citation = {
          headline: trendSignals[0].headline,
          source: trendSignals[0].source,
          date: trendSignals[0].date,
        };
        if (!verified.sources.includes('trend_signal')) {
          verified.sources.push('trend_signal');
        }
      }

      return { suggestion: verified, usedSearch: trendSignals.length > 0, usedFallback: false };
    } catch (error) {
      if (!retry) console.error('Z.ai Smart Suggest Stage 2 error:', error);
      return null;
    }
  }

  const result = await callStage2(false) ?? await callStage2(true);

  if (result) {
    return NextResponse.json(result);
  }

  const fallback = buildFallbackSuggestion(sources);
  return NextResponse.json({ suggestion: fallback, usedSearch: false, usedFallback: true });
}
