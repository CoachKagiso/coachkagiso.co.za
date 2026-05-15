export const BATCH_DELETE_CONFIRM_PHRASE = 'DELETE SELECTED';

export function isValidBatchDeletePhrase(value: string) {
  return value === BATCH_DELETE_CONFIRM_PHRASE;
}
