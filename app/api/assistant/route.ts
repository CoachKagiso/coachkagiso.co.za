import { NextResponse } from 'next/server';
import {
  buildAssistantSystemPrompt,
  normalizeAssistantDashboardContext,
  type AssistantDashboardContext,
} from '@/lib/growth-os-assistant';
import { buildAssistantAccessContext } from '@/lib/assistant-access';
import { DEFAULT_ASSISTANT_PREFERENCES, normalizeAssistantPreferences } from '@/lib/assistant-preferences';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  mayBeTruncated?: boolean;
};

type AssistantResponseMeta = {
  finishReason?: string;
  mayBeTruncated?: boolean;
  accessContextUsed?: boolean;
};

type AssistantRecommendationItem = {
  label: string;
  detail: string;
  action?: string;
};

type AssistantResult =
  | { type: 'answer'; message: string; meta?: AssistantResponseMeta }
  | { type: 'recommendation'; message: string; items: AssistantRecommendationItem[]; meta?: AssistantResponseMeta }
  | {
      type: 'email_draft';
      message: string;
      draft: {
        to: string;
        toName: string;
        subject: string;
        body: string;
        templateId: string;
        leadId: string;
      };
      meta?: AssistantResponseMeta;
    }
  | {
      type: 'content_draft';
      message: string;
      draft: {
        platform: string;
        contentType: string;
        content: string;
      };
      meta?: AssistantResponseMeta;
    };

const USER_MESSAGE_LIMIT = 4000;
const HISTORY_MESSAGE_LIMIT = 4000;
const ANSWER_MESSAGE_LIMIT = 8000;
const DRAFT_BODY_LIMIT = 10000;
const CONTENT_DRAFT_LIMIT = 12000;
const UPLOADED_CONTEXT_LIMIT = 16000;

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

function cleanString(value: unknown, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function loadAssistantPreferences() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'assistant_preferences').single();
    if (error || !data?.value) return DEFAULT_ASSISTANT_PREFERENCES;
    return normalizeAssistantPreferences(data.value);
  } catch {
    return DEFAULT_ASSISTANT_PREFERENCES;
  }
}

function buildUploadedContext(value: unknown) {
  if (!Array.isArray(value)) return '';

  const blocks = value.slice(0, 6).map((item, index) => {
    const name = cleanString(item?.name, 160) || `Upload ${index + 1}`;
    const type = cleanString(item?.type, 80);
    const kind = cleanString(item?.kind, 40);
    const content = cleanString(item?.content, UPLOADED_CONTEXT_LIMIT);

    if (kind === 'text' && content) {
      return `UPLOAD ${index + 1}: ${name}${type ? ` (${type})` : ''}\n${content}`;
    }

    if (kind === 'image') {
      return `UPLOAD ${index + 1}: ${name}${type ? ` (${type})` : ''}\nImage attachment metadata is available, but the current assistant route receives text context only unless a multimodal model is enabled. Ask Kagiso for the visible text or description if needed.`;
    }

    return '';
  }).filter(Boolean);

  if (blocks.length === 0) return '';
  return `UPLOADED CONTEXT FROM KAGISO\nUse this as user-provided context for the current request. Do not treat uploads as live mailbox or database access.\n\n${blocks.join('\n\n')}`;
}

function sanitizeConversationHistory(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-14)
    .map((message): ConversationMessage | null => {
      const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
      const content = cleanString(message?.content, HISTORY_MESSAGE_LIMIT);
      return role && content ? { role, content, mayBeTruncated: message?.mayBeTruncated === true } : null;
    })
    .filter((message): message is ConversationMessage => Boolean(message));
}

function stripMarkdownFences(value: string) {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function normalizeRecommendationItems(value: unknown): AssistantRecommendationItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((item) => ({
    label: cleanString(item?.label, 120) || 'Recommendation',
    detail: cleanString(item?.detail, 300),
    action: cleanString(item?.action, 80),
  }));
}

function normalizeAssistantResult(value: unknown): AssistantResult | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Record<string, unknown>;
  const type = cleanString(result.type, 40);
  const message = cleanString(result.message, ANSWER_MESSAGE_LIMIT);

  if (!message) return null;

  if (type === 'recommendation') {
    return {
      type,
      message,
      items: normalizeRecommendationItems(result.items),
    };
  }

  if (type === 'email_draft' && result.draft && typeof result.draft === 'object') {
    const draft = result.draft as Record<string, unknown>;
    const body = cleanString(draft.body, DRAFT_BODY_LIMIT);
    const subject = cleanString(draft.subject, 160);
    return {
      type,
      message,
      draft: {
        to: cleanString(draft.to, 220),
        toName: cleanString(draft.toName, 120),
        subject,
        body,
        templateId: cleanString(draft.templateId, 120),
        leadId: cleanString(draft.leadId, 120),
      },
    };
  }

  if (type === 'content_draft' && result.draft && typeof result.draft === 'object') {
    const draft = result.draft as Record<string, unknown>;
    return {
      type,
      message,
      draft: {
        platform: cleanString(draft.platform, 40) || 'linkedin',
        contentType: cleanString(draft.contentType, 80) || 'text_post',
        content: cleanString(draft.content, CONTENT_DRAFT_LIMIT),
      },
    };
  }

  if (type === 'answer') {
    return { type, message };
  }

  return null;
}

function isContinuationRequest(message: string) {
  return /^(continue|proceed|carry on|go on|finish|complete it|keep going|resume)\b/i.test(message.trim());
}

function withResponseMeta(result: AssistantResult, meta: AssistantResponseMeta): AssistantResult {
  return {
    ...result,
    meta,
  } as AssistantResult;
}

function buildConversationMessages(history: ConversationMessage[]) {
  return history.map((message) => ({
    role: message.role,
    content: message.mayBeTruncated
      ? `${message.content}\n\n[System note: this previous assistant response may have been truncated before it reached Kagiso.]`
      : message.content,
  }));
}

function formatErrorMessage(status: number) {
  if (status === 429) return "I'm being rate-limited. Try again in a minute.";
  if (status === 401) return 'AI authentication failed. Check the active AI API key in Settings.';
  return 'Something went wrong. Try again.';
}

export async function POST(request: Request) {
  if (!isDiagnosticAdminAuthorized(getRequestKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestKey = getRequestKey(request);
  const message = cleanString(body?.message, USER_MESSAGE_LIMIT);
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const conversationHistory = sanitizeConversationHistory(body?.conversationHistory);
  const dashboardContext: AssistantDashboardContext = normalizeAssistantDashboardContext(body?.dashboardContext);
  const uploadedContext = buildUploadedContext(body?.uploadedContext);
  const isDraftRequest = /draft|write|create|generate|compose/i.test(message);
  const isAnalysisRequest = /analy[sz]e|summari[sz]e|theme|pain point|curriculum|structure|masterclass|inbound|outbound|email/i.test(message);
  const shouldContinueTruncated = isContinuationRequest(message) && conversationHistory.some((item) => item.role === 'assistant' && item.mayBeTruncated);
  const [runtime, assistantPreferences] = await Promise.all([
    resolveAiRuntimeConfig(),
    loadAssistantPreferences(),
  ]);

  if (!runtime) {
    return NextResponse.json(
      { type: 'answer', message: 'AI is not configured yet. Add the active provider API key in Settings.' },
      { status: 503 },
    );
  }

  const accessContext = await buildAssistantAccessContext(message, requestKey).catch((error) =>
    `READ-ONLY ASSISTANT ACCESS CONTEXT\nA scoped access lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );

  let response: Response;
  try {
    response = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: runtime.headers,
      body: JSON.stringify(buildAiRequestBody(runtime, {
        model: runtime.model,
        messages: [
          { role: 'system', content: buildAssistantSystemPrompt(dashboardContext, assistantPreferences) },
          accessContext ? { role: 'system', content: accessContext } : null,
          uploadedContext ? { role: 'system', content: uploadedContext } : null,
          shouldContinueTruncated
            ? { role: 'system', content: 'Kagiso asked you to continue after a truncated answer. Continue from the last visible point. Do not say you already finished unless the visible conversation genuinely contains the ending.' }
            : null,
          ...buildConversationMessages(conversationHistory),
          { role: 'user', content: message },
        ].filter(Boolean),
        max_tokens: isAnalysisRequest || accessContext || uploadedContext ? 4000 : 2500,
        temperature: isDraftRequest ? 0.7 : 0.3,
        response_format: { type: 'json_object' },
      })),
    });
  } catch {
    return NextResponse.json({
      type: 'answer',
      message: "I'm having trouble connecting. Try again in a moment.",
    });
  }

  const responseText = await response.text();

  if (!response.ok) {
    return NextResponse.json({ type: 'answer', message: formatErrorMessage(response.status) });
  }

  let data: { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
  try {
    data = JSON.parse(responseText);
  } catch {
    return NextResponse.json({ type: 'answer', message: 'I had trouble reading that response. Try asking differently.' });
  }

  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const mayBeTruncated = finishReason === 'length';
  const responseMeta: AssistantResponseMeta = {
    finishReason,
    mayBeTruncated,
    accessContextUsed: Boolean(accessContext),
  };
  const text = stripMarkdownFences(choice?.message?.content || '{}');

  try {
    const result = normalizeAssistantResult(JSON.parse(text));
    if (!result) {
      return NextResponse.json({ type: 'answer', message: 'I had trouble formatting that. Try asking differently.' });
    }
    return NextResponse.json(withResponseMeta(result, responseMeta));
  } catch {
    if (mayBeTruncated) {
      return NextResponse.json({
        type: 'answer',
        message: 'The model response hit the length limit before it could return valid JSON. Ask me to continue, or ask for the answer in sections.',
        meta: responseMeta,
      });
    }
    return NextResponse.json({ type: 'answer', message: 'I had trouble formatting that. Try asking differently.', meta: responseMeta });
  }
}
