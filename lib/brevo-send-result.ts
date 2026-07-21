export type BrevoSendResult =
  | { outcome: 'accepted'; messageId: string }
  | { outcome: 'rejected' | 'unavailable' | 'uncertain' };

export function classifyBrevoSendResult(input: {
  responsePresent: boolean;
  responseOk: boolean;
  messageId?: unknown;
}): BrevoSendResult {
  if (!input.responsePresent) return { outcome: 'unavailable' };
  if (!input.responseOk) return { outcome: 'rejected' };
  return typeof input.messageId === 'string' && input.messageId.trim()
    ? { outcome: 'accepted', messageId: input.messageId }
    : { outcome: 'uncertain' };
}
