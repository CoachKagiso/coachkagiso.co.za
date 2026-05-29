export const diagnosticArchetypeNamesByKey = {
  A: 'Plateaued Performer',
  B: 'Quiet Pivoter',
  C: 'Burnt-Out Builder',
  D: 'Lost Pivoter',
  E: 'Engaged Strategist',
} as const;

export type DiagnosticArchetypeKey = keyof typeof diagnosticArchetypeNamesByKey;

const diagnosticArchetypeNameAliases: Record<string, string> = {
  'plateaued performer': diagnosticArchetypeNamesByKey.A,
  'the plateaued performer': diagnosticArchetypeNamesByKey.A,
  'quiet pivoter': diagnosticArchetypeNamesByKey.B,
  'the quiet pivoter': diagnosticArchetypeNamesByKey.B,
  'burnt-out builder': diagnosticArchetypeNamesByKey.C,
  'burnt out builder': diagnosticArchetypeNamesByKey.C,
  'the burnt-out builder': diagnosticArchetypeNamesByKey.C,
  'the burnt out builder': diagnosticArchetypeNamesByKey.C,
  'lost pivoter': diagnosticArchetypeNamesByKey.D,
  'the lost pivoter': diagnosticArchetypeNamesByKey.D,
  'engaged strategist': diagnosticArchetypeNamesByKey.E,
  'the engaged strategist': diagnosticArchetypeNamesByKey.E,
};

function cleanArchetypeName(value?: string | null) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDiagnosticArchetypeName(value?: string | null) {
  return Boolean(diagnosticArchetypeNameAliases[cleanArchetypeName(value).toLowerCase()]);
}

export function normalizeDiagnosticArchetypeName(value?: string | null) {
  const cleaned = cleanArchetypeName(value);
  return diagnosticArchetypeNameAliases[cleaned.toLowerCase()] || cleaned;
}

export function getCanonicalDiagnosticArchetypeName(archetypeKey?: string | null, fallbackName?: string | null) {
  const key = String(archetypeKey || '').trim() as DiagnosticArchetypeKey;
  return diagnosticArchetypeNamesByKey[key] || normalizeDiagnosticArchetypeName(fallbackName);
}
