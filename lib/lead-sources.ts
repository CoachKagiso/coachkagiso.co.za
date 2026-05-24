export const diagnosticLeadSources = [
  'diagnostic',
  'first_90_days',
  'linkedin_headline',
  'masterclass_waitlist',
] as const;

export type DiagnosticLeadSource = (typeof diagnosticLeadSources)[number];

export const leadSourceLabels: Record<DiagnosticLeadSource, string> = {
  diagnostic: 'Career Diagnostic',
  first_90_days: 'First 90 Days Checklist',
  linkedin_headline: 'SA LinkedIn Headline Builder',
  masterclass_waitlist: 'Masterclass Waitlist',
};

export const leadSourceShortLabels: Record<DiagnosticLeadSource, string> = {
  diagnostic: 'Diagnostic',
  first_90_days: 'First 90 Days',
  linkedin_headline: 'LinkedIn',
  masterclass_waitlist: 'Waitlist',
};

export const leadSourcePillClasses: Record<DiagnosticLeadSource, string> = {
  diagnostic: 'border-[#D8C8BB] bg-white text-[#142334]',
  first_90_days: 'border-[#79A580]/35 bg-[#EEF7EF] text-[#355C3A]',
  linkedin_headline: 'border-[#8AA6C8]/38 bg-[#EEF4FA] text-[#284B70]',
  masterclass_waitlist: 'border-[#DDD6FE] bg-[#F3E8FF] text-[#7C3AED]',
};

export const leadSourceOptions = diagnosticLeadSources.map((source) => ({
  value: source,
  label: leadSourceLabels[source],
}));

export function isDiagnosticLeadSource(value?: string | null): value is DiagnosticLeadSource {
  return Boolean(value && diagnosticLeadSources.includes(value as DiagnosticLeadSource));
}

export function normalizeLeadSource(value?: string | null): DiagnosticLeadSource {
  return isDiagnosticLeadSource(value) ? value : 'diagnostic';
}

export function isLeadMagnetSource(source?: string | null) {
  return source === 'first_90_days' || source === 'linkedin_headline';
}

export function isMasterclassWaitlistSource(source?: string | null) {
  return source === 'masterclass_waitlist';
}
