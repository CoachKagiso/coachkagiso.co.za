import { buildAiRequestBody, resolveAiRuntimeConfig, type AiRuntimeConfig } from '@/lib/ai-config';
import { getFallbackVisionModel, modelSupportsVision } from '@/lib/ai-models';

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

/**
 * The high-volume tools run on the configured secondary model rather than a pinned one, so the
 * Settings picker governs them like every other AI surface.
 */
export function resolveToolAiRuntime() {
  return resolveAiRuntimeConfig({ simpleMode: true });
}

async function callToolModel(
  runtime: AiRuntimeConfig,
  model: string,
  messages: ToolAiMessage[],
  maxTokens: number,
  temperature: number,
) {
  return fetch(`${runtime.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: runtime.headers,
    body: JSON.stringify(buildAiRequestBody({ ...runtime, model }, {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    })),
  });
}

export async function callToolAi({
  runtime,
  messages,
  maxTokens,
  temperature,
  needsVision,
}: {
  runtime: AiRuntimeConfig;
  messages: ToolAiMessage[];
  maxTokens: number;
  temperature: number;
  needsVision: boolean;
}) {
  // An attachment must not fail purely because the configured model is text only, so image
  // requests fall back to a vision-capable model and text requests keep the chosen one.
  const models: string[] = [];
  if (needsVision && !modelSupportsVision(runtime.model)) {
    const fallback = getFallbackVisionModel();
    if (!fallback) throw new Error('TOOL_AI_NO_VISION_MODEL');
    models.push(fallback);
  } else {
    models.push(runtime.model);
    if (needsVision) {
      const fallback = getFallbackVisionModel();
      if (fallback && fallback !== runtime.model) models.push(fallback);
    }
  }

  for (const [index, model] of models.entries()) {
    const response = await callToolModel(runtime, model, messages, maxTokens, temperature);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Tool AI error ${response.status} (${model}):`, responseText);
      if (index < models.length - 1 && (response.status === 429 || response.status >= 500)) {
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
