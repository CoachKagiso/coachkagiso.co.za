const AI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const AI_TEXT_MODEL = 'glm-5.2';
const AI_VISION_MODEL = 'GLM-4.6V-Flash';
const AI_VISION_FALLBACK_MODEL = 'glm-4.5v';

export type ToolAiMessage = {
  role: 'system' | 'user';
  content: unknown;
};

export function extractToolJsonObject(text: string) {
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

async function callToolModel(
  apiKey: string,
  model: string,
  messages: ToolAiMessage[],
  maxTokens: number,
  temperature: number,
) {
  return fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      thinking: { type: 'disabled' },
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });
}

export async function callToolAi({
  apiKey,
  messages,
  maxTokens,
  temperature,
  needsVision,
}: {
  apiKey: string;
  messages: ToolAiMessage[];
  maxTokens: number;
  temperature: number;
  needsVision: boolean;
}) {
  const models = needsVision ? [AI_VISION_MODEL, AI_VISION_FALLBACK_MODEL] : [AI_TEXT_MODEL];

  for (const model of models) {
    const response = await callToolModel(apiKey, model, messages, maxTokens, temperature);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Tool AI error ${response.status} (${model}):`, responseText);
      if (needsVision && model === AI_VISION_MODEL && (response.status === 429 || response.status >= 500)) {
        continue;
      }
      throw new Error('TOOL_AI_FAILED');
    }

    const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('TOOL_AI_EMPTY');
    return text;
  }

  throw new Error('TOOL_AI_FAILED');
}
