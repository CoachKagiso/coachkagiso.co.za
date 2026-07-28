export const ADDITIONAL_CONTEXT_KEY = 'additionalContext';
export const CONTEXT_VERIFICATION_KEY = 'contextVerified';

const PLACEHOLDER_VALUES = new Set(['na', 'n/a', 'n.a.', 'none', 'not provided', 'not applicable', 'tbc']);
const IDENTITY_KEYS = new Set(['fullname', 'email', 'phone', 'phonenumber', 'telephone', 'whatsapp', 'attendeephonenumber', 'attendeephone']);

export type ClientIntakeValue = string | number | boolean | null | ClientIntakeValue[] | { [key: string]: ClientIntakeValue };

export type ClientIntakeOverride = {
  id: string;
  paymentId: string;
  fieldName: string;
  value: ClientIntakeValue;
  editedAt: string;
  editedBy: string;
  source: 'kagiso_override';
  editBatchId: string | null;
};

export type ClientLiveIntake = {
  intakeId: string | null;
  submittedAt: string | null;
  source: string | null;
  sourceReference: string | null;
  sourceMetadata: Record<string, unknown>;
  cvFileUrl: string | null;
  originalFormData: Record<string, unknown>;
  formData: Record<string, unknown>;
  overrides: ClientIntakeOverride[];
  hasIntake: boolean;
  contextVerified: boolean;
};

export function hasMeaningfulIntakeValue(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalized.length > 0 && !PLACEHOLDER_VALUES.has(normalized);
  }
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasMeaningfulIntakeValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasMeaningfulIntakeValue);
  return true;
}

export function hasMeaningfulIntake(formData: Record<string, unknown>) {
  return Object.values(formData).some(hasMeaningfulIntakeValue);
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function hasMeaningfulClientContext(formData: Record<string, unknown>) {
  return Object.entries(formData).some(([key, value]) => (
    key !== CONTEXT_VERIFICATION_KEY
    && !IDENTITY_KEYS.has(normalizeKey(key))
    && hasMeaningfulIntakeValue(value)
  ));
}

export function shouldPersistClientIntakeEdit(
  currentValue: unknown,
  nextValue: unknown,
  fieldExists: boolean,
) {
  if (JSON.stringify(currentValue) === JSON.stringify(nextValue)) return false;
  if (fieldExists) return true;
  return hasMeaningfulIntakeValue(nextValue);
}

export function clearClientIntakeDraftField(
  draft: Record<string, string>,
  fieldName: string,
) {
  return { ...draft, [fieldName]: '' };
}

export function evaluateClientSessionPreparationReadiness(input: {
  formData: Record<string, unknown>;
  contextVerified: boolean;
  hasCvAnalysis: boolean;
}) {
  const hasMeaningfulContext = hasMeaningfulClientContext(input.formData);
  const contextVerified = Boolean(input.contextVerified);
  const hasCvAnalysis = Boolean(input.hasCvAnalysis);
  const hasIntake = contextVerified && hasMeaningfulContext;
  return {
    hasIntake,
    hasMeaningfulContext,
    contextVerified,
    hasCvAnalysis,
    canGenerate: hasIntake && hasCvAnalysis,
  };
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function mergeClientIntake(
  originalFormData: Record<string, unknown>,
  overrides: ClientIntakeOverride[],
) {
  const formData = { ...originalFormData };
  const latestByField = new Map<string, ClientIntakeOverride>();

  overrides
    .slice()
    .sort((left, right) => {
      const timeDifference = new Date(left.editedAt).getTime() - new Date(right.editedAt).getTime();
      return timeDifference || left.id.localeCompare(right.id);
    })
    .forEach((override) => latestByField.set(override.fieldName, override));

  latestByField.forEach((override, fieldName) => {
    formData[fieldName] = override.value;
  });

  return { formData, latestByField };
}

export function normalizeClientIntakeValue(value: unknown, depth = 0): ClientIntakeValue {
  if (depth > 5) return String(value ?? '').slice(0, 8000);
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim().slice(0, 8000);
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => normalizeClientIntakeValue(item, depth + 1));
  const record = safeRecord(value);
  return Object.keys(record).slice(0, 100).reduce<Record<string, ClientIntakeValue>>((result, key) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return result;
    result[key.slice(0, 180)] = normalizeClientIntakeValue(record[key], depth + 1);
    return result;
  }, {});
}

export function formatEditableIntakeValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

export function coerceEditedIntakeValue(value: string, originalValue: unknown): ClientIntakeValue {
  const trimmed = value.trim();
  if (Array.isArray(originalValue) || (originalValue && typeof originalValue === 'object')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(originalValue) === Array.isArray(parsed)) return normalizeClientIntakeValue(parsed);
    } catch {
      // A free-text edit is still valid when the original value was structured.
    }
  }
  if (typeof originalValue === 'boolean' && /^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (typeof originalValue === 'number' && trimmed && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return normalizeClientIntakeValue(value);
}
