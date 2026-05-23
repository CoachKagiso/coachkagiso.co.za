import { NextResponse } from 'next/server';
import {
  buildAssistantSystemPrompt,
  normalizeAssistantDashboardContext,
  type AssistantDashboardContext,
} from '@/lib/growth-os-assistant';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AssistantRecommendationItem = {
  label: string;
  detail: string;
  action?: string;
};

type AssistantResult =
  | { type: 'answer'; message: string }
  | { type: 'recommendation'; message: string; items: AssistantRecommendationItem[] }
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
    }
  | {
      type: 'content_draft';
      message: string;
      draft: {
        platform: string;
        contentType: string;
        content: string;
      };
    };

function getRequestKey(request: Request) {
  const url = new URL(request.url);
  return request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';
}

function cleanString(value: unknown, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeConversationHistory(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-10)
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
      const content = cleanString(message?.content, 2000);
      return role && content ? { role, content } : null;
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
  const message = cleanString(result.message, 1200);

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
    const body = cleanString(draft.body, 6000);
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
        content: cleanString(draft.content, 8000),
      },
    };
  }

  if (type === 'answer') {
    return { type, message };
  }

  return null;
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
  const message = cleanString(body?.message, 1000);
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const conversationHistory = sanitizeConversationHistory(body?.conversationHistory);
  const dashboardContext: AssistantDashboardContext = normalizeAssistantDashboardContext(body?.dashboardContext);
  const isDraftRequest = /draft|write|create|generate|compose/i.test(message);
  const runtime = await resolveAiRuntimeConfig();

  if (!runtime) {
    return NextResponse.json(
      { type: 'answer', message: 'AI is not configured yet. Add the active provider API key in Settings.' },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: runtime.headers,
      body: JSON.stringify(buildAiRequestBody(runtime, {
        model: runtime.model,
        messages: [
          { role: 'system', content: buildAssistantSystemPrompt(dashboardContext) },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 1000,
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

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(responseText);
  } catch {
    return NextResponse.json({ type: 'answer', message: 'I had trouble reading that response. Try asking differently.' });
  }

  const text = stripMarkdownFences(data?.choices?.[0]?.message?.content || '{}');

  try {
    const result = normalizeAssistantResult(JSON.parse(text));
    if (!result) {
      return NextResponse.json({ type: 'answer', message: 'I had trouble formatting that. Try asking differently.' });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ type: 'answer', message: 'I had trouble formatting that. Try asking differently.' });
  }
}
