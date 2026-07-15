export type AiRequestProvider = 'zai' | 'openrouter';

export function getAiProviderRequestOptions(provider: AiRequestProvider, model: string) {
  if (provider === 'zai') {
    return { thinking: { type: 'disabled' } };
  }

  if (model === 'z-ai/glm-5.2') {
    return { reasoning: { effort: 'none' } };
  }

  return {};
}
