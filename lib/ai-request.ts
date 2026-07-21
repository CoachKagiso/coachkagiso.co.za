export type AiRequestProvider = 'zai' | 'openrouter';

export function getAiProviderRequestOptions(provider: AiRequestProvider, model: string, reasoningEnabled = false) {
  if (provider === 'zai') {
    return { thinking: { type: 'disabled' } };
  }

  if (!reasoningEnabled) {
    return { reasoning: { effort: 'none' } };
  }

  return {};
}
