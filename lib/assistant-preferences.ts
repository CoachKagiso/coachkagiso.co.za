export type AssistantTone = 'warm_partner' | 'direct_operator' | 'gentle_coach' | 'strategic_advisor';

export type AssistantPreferences = {
  userName: string;
  assistantName: string;
  roleDescription: string;
  tone: AssistantTone;
  conversationStyle: string;
  behaviorInstructions: string;
  avoidInstructions: string;
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
  tone: 'warm_partner',
  conversationStyle: 'Conversational first, concise when giving answers, direct when there is a decision to make.',
  behaviorInstructions:
    'When Kagiso greets you, greet her back naturally and ask what she wants to work on. Give task lists, lead priorities, or dashboard briefings only when she asks for them.',
  avoidInstructions:
    'Do not dump dashboard tasks after a simple greeting. Do not sound corporate, stiff, or overly formal.',
  greetNaturally: true,
  proactiveBriefings: false,
};

export const DEFAULT_ASSISTANT_CONVERSATIONS: AssistantConversationStore = {
  activeThreadId: null,
  threads: [],
};

export const assistantToneLabels: Record<AssistantTone, string> = {
  warm_partner: 'Warm partner',
  direct_operator: 'Direct operator',
  gentle_coach: 'Gentle coach',
  strategic_advisor: 'Strategic advisor',
};

function cleanString(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  return text || fallback;
}

export function normalizeAssistantPreferences(value: unknown): AssistantPreferences {
  const preferences = value && typeof value === 'object' ? value as Partial<AssistantPreferences> : {};
  const tone = Object.keys(assistantToneLabels).includes(String(preferences.tone))
    ? preferences.tone as AssistantTone
    : DEFAULT_ASSISTANT_PREFERENCES.tone;

  return {
    userName: cleanString(preferences.userName, DEFAULT_ASSISTANT_PREFERENCES.userName, 80),
    assistantName: cleanString(preferences.assistantName, DEFAULT_ASSISTANT_PREFERENCES.assistantName, 80),
    roleDescription: cleanString(preferences.roleDescription, DEFAULT_ASSISTANT_PREFERENCES.roleDescription, 220),
    tone,
    conversationStyle: cleanString(preferences.conversationStyle, DEFAULT_ASSISTANT_PREFERENCES.conversationStyle, 500),
    behaviorInstructions: cleanString(preferences.behaviorInstructions, DEFAULT_ASSISTANT_PREFERENCES.behaviorInstructions, 1200),
    avoidInstructions: cleanString(preferences.avoidInstructions, DEFAULT_ASSISTANT_PREFERENCES.avoidInstructions, 800),
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
