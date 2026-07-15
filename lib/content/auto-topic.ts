export const AUTO_TOPIC_STORAGE_KEY = 'content_studio_auto_topic_history';
export const AUTO_TOPIC_HISTORY_LIMIT = 24;
export const AUTO_TOPIC_HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const AUTO_TOPIC_FAMILIES = [
  'career_pivot',
  'career_clarity',
  'cv_positioning',
  'interview_preparation',
  'salary_negotiation',
  'workplace_visibility',
  'linkedin_personal_brand',
  'promotion_growth',
  'leadership_transition',
  'managing_up',
  'mentorship_community',
  'burnout_boundaries',
  'networking_relationships',
  'executive_presence',
] as const;

export type AutoTopicFamily = (typeof AUTO_TOPIC_FAMILIES)[number];

export type AutoTopicHistoryEntry = {
  topic: string;
  family: AutoTopicFamily;
  createdAt: number;
};

export type AutoTopicSuggestion = Pick<AutoTopicHistoryEntry, 'topic' | 'family'>;

type AutoTopicPromptInput = {
  platform: string;
  contentType: string;
  angle: string;
  history: AutoTopicHistoryEntry[];
};

function isAutoTopicFamily(value: unknown): value is AutoTopicFamily {
  return typeof value === 'string' && AUTO_TOPIC_FAMILIES.includes(value as AutoTopicFamily);
}

function cleanTopic(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 500) : '';
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const objectStart = clean.indexOf('{');
  const objectEnd = clean.lastIndexOf('}');
  if (objectStart < 0 || objectEnd <= objectStart) return null;

  try {
    const parsed = JSON.parse(clean.slice(objectStart, objectEnd + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function normalizeAutoTopicHistory(value: unknown, now = Date.now()): AutoTopicHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const topic = cleanTopic(record.topic);
      const family = record.family;
      const createdAt = Number(record.createdAt);
      if (!topic || !isAutoTopicFamily(family) || !Number.isFinite(createdAt)) return null;
      if (createdAt < now - AUTO_TOPIC_HISTORY_WINDOW_MS || createdAt > now + 60_000) return null;
      return { topic, family, createdAt };
    })
    .filter((entry): entry is AutoTopicHistoryEntry => Boolean(entry))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-AUTO_TOPIC_HISTORY_LIMIT);
}

export function recordAutoTopic(
  history: AutoTopicHistoryEntry[],
  suggestion: AutoTopicSuggestion,
  now = Date.now(),
): AutoTopicHistoryEntry[] {
  const topic = cleanTopic(suggestion.topic);
  if (!topic || !isAutoTopicFamily(suggestion.family)) return normalizeAutoTopicHistory(history, now);

  return normalizeAutoTopicHistory([
    ...history,
    { topic, family: suggestion.family, createdAt: now },
  ], now);
}

function getAllowedFamilies(history: AutoTopicHistoryEntry[]) {
  const avoided = new Set(history.map((entry) => entry.family));
  const unusedFamilies = AUTO_TOPIC_FAMILIES.filter((family) => !avoided.has(family));
  if (unusedFamilies.length > 0) return unusedFamilies;

  const oldestByFamily = new Map<AutoTopicFamily, number>();
  for (const entry of history) {
    if (!oldestByFamily.has(entry.family)) oldestByFamily.set(entry.family, entry.createdAt);
  }
  return [...AUTO_TOPIC_FAMILIES]
    .sort((a, b) => (oldestByFamily.get(a) ?? 0) - (oldestByFamily.get(b) ?? 0))
    .slice(0, 4);
}

export function buildAutoTopicPrompt({ platform, contentType, angle, history }: AutoTopicPromptInput) {
  const allowedFamilies = getAllowedFamilies(history);
  const excludedFamilies = AUTO_TOPIC_FAMILIES.filter((family) => !allowedFamilies.includes(family));
  const recentTopics = history.slice(-12).reverse();

  return [
    'AUTO-TOPIC TASK:',
    'Choose one genuinely fresh topic before the post is written.',
    `Platform: ${platform}`,
    `Content type: ${contentType}`,
    `Angle: ${angle}`,
    '',
    `Topic families you must not choose: ${excludedFamilies.join(', ') || 'none yet'}.`,
    `Allowed topic families: ${allowedFamilies.join(', ')}.`,
    recentTopics.length > 0
      ? `Recent auto-generated topics to avoid:\n${recentTopics.map((entry) => `- [${entry.family}] ${entry.topic}`).join('\n')}`
      : 'Recent auto-generated topics to avoid: none yet.',
    '',
    'The exclusion is about the underlying subject, not just wording. Do not rephrase an avoided topic.',
    'Use the dashboard signals as input, not as a command to repeat the strongest theme.',
    'Return valid JSON only, with this exact shape:',
    '{"topic":"A specific, compelling topic in Kagiso\'s voice","family":"one allowed topic family"}',
  ].join('\n');
}

export function parseAutoTopicSuggestion(raw: string): AutoTopicSuggestion | null {
  const parsed = extractJsonObject(raw);
  const topic = cleanTopic(parsed?.topic);
  const family = parsed?.family;
  if (!topic || !isAutoTopicFamily(family)) return null;
  return { topic, family };
}
