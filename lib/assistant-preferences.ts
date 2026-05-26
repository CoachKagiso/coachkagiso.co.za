export type AssistantTone = 'bubbly_friend' | 'strategic_partner' | 'focused_operator';

export type AssistantPersonalityProfile = {
  label: string;
  shortLabel: string;
  description: string;
  conversationStyle: string;
  behaviorInstructions: string;
  avoidInstructions: string;
  promptRules: string[];
};

export type AssistantPreferences = {
  userName: string;
  assistantName: string;
  roleDescription: string;
  tone: AssistantTone;
  bubblyNicknames: string[];
  conversationStyle: string;
  behaviorInstructions: string;
  avoidInstructions: string;
  encouragementStyle: string;
  allowEmojis: boolean;
  greetNaturally: boolean;
  proactiveBriefings: boolean;
};

export type AssistantConversationStore = {
  activeThreadId: string | null;
  threads: AssistantSavedConversation[];
};

export type AssistantSavedConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantSavedMessage[];
};

export type AssistantSavedMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export const DEFAULT_ASSISTANT_PREFERENCES: AssistantPreferences = {
  userName: 'Kagiso',
  assistantName: 'Growth OS Assistant',
  roleDescription: "A warm, practical business partner for Coach Kagiso's dashboard.",
  tone: 'strategic_partner',
  bubblyNicknames: ['Kay', 'Mush', 'Coach', 'Ms. CEO'],
  conversationStyle: 'Warm and conversational, but still sharp about business decisions and next steps.',
  behaviorInstructions:
    'When Kagiso greets you, greet her back naturally and ask what she wants to work on. Give task lists, lead priorities, or dashboard briefings only when she asks for them.',
  avoidInstructions:
    'Do not dump dashboard tasks after a simple greeting. Do not sound corporate, stiff, or overly formal.',
  encouragementStyle:
    'Offer short, natural encouragement when it fits. Sound like a friend in her corner, proud of her progress, without turning it into a repeated script.',
  allowEmojis: true,
  greetNaturally: true,
  proactiveBriefings: false,
};

export const DEFAULT_ASSISTANT_CONVERSATIONS: AssistantConversationStore = {
  activeThreadId: null,
  threads: [],
};

export const assistantPersonalityProfiles: Record<AssistantTone, AssistantPersonalityProfile> = {
  bubbly_friend: {
    label: 'Bubbly Friend',
    shortLabel: 'Friend',
    description: 'Casual, funny, and warm. Feels like a sharp friend who knows the business.',
    conversationStyle:
      'Chat like a funny, supportive friend with business sense. Keep the energy light, quick, and human.',
    behaviorInstructions:
      'When Kagiso greets you, greet her back casually. You may say things like "hey girl" if it fits. Use short playful jokes or asides, then bring the conversation back to the business task.',
    avoidInstructions:
      'Do not overdo slang, make jokes in sensitive lead/client situations, repeat the same greeting, or turn serious business analysis into entertainment.',
    promptRules: [
      'Use warm casual language, light humor, and friend-like energy.',
      'A simple "hey" can get a natural playful greeting before asking what she wants to work on.',
      'Keep jokes short and never at the expense of leads, clients, or serious career struggles.',
      'Still know the dashboard deeply and move into focused business advice as soon as the task needs it.',
      'Rotate the nickname pool naturally and occasionally invent a two- or three-word affectionate variation inspired by the pool.',
      'Use one short encouragement line when it feels human, then continue with the actual business conversation.',
      'Use emojis sparingly when they fit the mood, never in serious client or payment analysis.',
    ],
  },
  strategic_partner: {
    label: 'Strategic Partner',
    shortLabel: 'Partner',
    description: 'Warm, thoughtful, and practical. Balanced conversation with clear strategic thinking.',
    conversationStyle:
      'Warm and conversational, but still sharp about business decisions and next steps.',
    behaviorInstructions:
      'When Kagiso greets you, greet her naturally and ask what she wants to work on. Give thoughtful context when useful, then move toward a clear recommendation.',
    avoidInstructions:
      'Do not sound corporate, stiff, generic, or overly formal. Do not dump dashboard tasks after a simple greeting.',
    promptRules: [
      'Use grounded warmth and practical strategic judgment.',
      'Give context when it helps Kagiso make a better decision.',
      'Keep the tone human, direct, and business-aware.',
      'If emojis are enabled, use them rarely and only for friendly conversational moments.',
      'Avoid generic motivational language.',
    ],
  },
  focused_operator: {
    label: 'Focused Operator',
    shortLabel: 'Business',
    description: 'No fluff. Direct, structured, and execution-focused.',
    conversationStyle:
      'Direct and operational. Minimize small talk and prioritize decisions, risks, and next actions.',
    behaviorInstructions:
      'If Kagiso greets you, acknowledge briefly and ask for the task. When she asks a business question, move quickly into the answer, recommendation, or execution plan.',
    avoidInstructions:
      'Do not use jokes, bubbly language, long emotional framing, or casual filler. Do not over-explain when a direct answer is enough.',
    promptRules: [
      'Be concise, structured, and task-first.',
      'Use bullets and direct recommendations when useful.',
      'Ask only the minimum questions needed to continue.',
      'No jokes or playful banter unless Kagiso explicitly asks for that tone.',
      'Avoid emojis in this mode unless Kagiso explicitly asks for a warmer tone.',
    ],
  },
};

export const assistantToneLabels: Record<AssistantTone, string> = Object.fromEntries(
  Object.entries(assistantPersonalityProfiles).map(([key, profile]) => [key, profile.label]),
) as Record<AssistantTone, string>;

const legacyToneMap: Record<string, AssistantTone> = {
  warm_partner: 'strategic_partner',
  gentle_coach: 'strategic_partner',
  strategic_advisor: 'strategic_partner',
  direct_operator: 'focused_operator',
};

function cleanString(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  return text || fallback;
}

function cleanStringArray(value: unknown, fallback: string[], maxItems: number, maxLength: number) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const cleaned = Array.from(new Set(
    items
      .map((item) => typeof item === 'string' ? item.trim().slice(0, maxLength) : '')
      .filter(Boolean),
  )).slice(0, maxItems);

  return cleaned.length > 0 ? cleaned : fallback;
}

export function normalizeAssistantPreferences(value: unknown): AssistantPreferences {
  const preferences = value && typeof value === 'object' ? value as Partial<AssistantPreferences> : {};
  const rawTone = String(preferences.tone || '');
  const tone = Object.keys(assistantPersonalityProfiles).includes(rawTone)
    ? rawTone as AssistantTone
    : legacyToneMap[rawTone]
      ? legacyToneMap[rawTone]
    : DEFAULT_ASSISTANT_PREFERENCES.tone;
  const profile = assistantPersonalityProfiles[tone];

  return {
    userName: cleanString(preferences.userName, DEFAULT_ASSISTANT_PREFERENCES.userName, 80),
    assistantName: cleanString(preferences.assistantName, DEFAULT_ASSISTANT_PREFERENCES.assistantName, 80),
    roleDescription: cleanString(preferences.roleDescription, DEFAULT_ASSISTANT_PREFERENCES.roleDescription, 220),
    tone,
    bubblyNicknames: cleanStringArray(preferences.bubblyNicknames, DEFAULT_ASSISTANT_PREFERENCES.bubblyNicknames, 8, 40),
    conversationStyle: cleanString(preferences.conversationStyle, profile.conversationStyle, 500),
    behaviorInstructions: cleanString(preferences.behaviorInstructions, profile.behaviorInstructions, 1200),
    avoidInstructions: cleanString(preferences.avoidInstructions, profile.avoidInstructions, 800),
    encouragementStyle: cleanString(preferences.encouragementStyle, DEFAULT_ASSISTANT_PREFERENCES.encouragementStyle, 700),
    allowEmojis: preferences.allowEmojis !== false,
    greetNaturally: preferences.greetNaturally !== false,
    proactiveBriefings: preferences.proactiveBriefings === true,
  };
}

export function normalizeAssistantConversationStore(value: unknown): AssistantConversationStore {
  const store = value && typeof value === 'object' ? value as Partial<AssistantConversationStore> : {};
  const threads = Array.isArray(store.threads)
    ? store.threads.slice(0, 12).map((thread): AssistantSavedConversation => ({
        id: cleanString(thread?.id, `thread-${Date.now()}`, 120),
        title: cleanString(thread?.title, 'Saved conversation', 120),
        createdAt: cleanString(thread?.createdAt, new Date().toISOString(), 80),
        updatedAt: cleanString(thread?.updatedAt, new Date().toISOString(), 80),
        messages: Array.isArray(thread?.messages)
          ? thread.messages.slice(-80).map((message): AssistantSavedMessage => ({
              id: cleanString(message?.id, `message-${Date.now()}`, 120),
              role: message?.role === 'assistant' || message?.role === 'system' ? message.role : 'user',
              content: cleanString(message?.content, '', 8000),
              createdAt: cleanString(message?.createdAt, new Date().toISOString(), 80),
            })).filter((message) => Boolean(message.content))
          : [],
      })).filter((thread) => thread.messages.length > 0)
    : [];

  return {
    activeThreadId: typeof store.activeThreadId === 'string' ? store.activeThreadId : null,
    threads,
  };
}
