export const DIAGNOSTIC_CONTEXT_CONSENT_VERSION = 'career-diagnostic-coaching-context-v1';

export type DiagnosticContextStatus = 'pending' | 'included' | 'excluded' | 'revoked';

export type EarlierDiagnosticContext = {
  id: string;
  source: string;
  submittedAt: string;
  archetypeName: string | null;
  answers: Record<string, string>;
};

export function normalizeDiagnosticContextStatus(value: unknown): DiagnosticContextStatus {
  return value === 'included' || value === 'excluded' || value === 'revoked' ? value : 'pending';
}

export function canIncludeDiagnosticContext(input: {
  consentConfirmed: boolean;
  consentRecordedAt: string | null;
}) {
  return input.consentConfirmed && Boolean(input.consentRecordedAt);
}

export function requiresRenewedDiagnosticConsent(
  currentStatus: DiagnosticContextStatus | null,
  nextStatus: DiagnosticContextStatus,
) {
  return currentStatus === 'revoked' && nextStatus === 'included';
}

export function selectIncludedDiagnosticContext(
  link: { status: DiagnosticContextStatus; diagnostic: EarlierDiagnosticContext } | null,
) {
  return link?.status === 'included' ? link.diagnostic : null;
}

export function formatDiagnosticContextForPreparation(
  diagnostic: EarlierDiagnosticContext,
  questionBank: Array<{ prompt: string; options: Record<string, string> }>,
) {
  const answers = Object.entries(diagnostic.answers)
    .sort(([left], [right]) => Number(left) - Number(right))
    .flatMap(([index, optionKey]) => {
      const question = questionBank[Number(index)];
      const answer = question?.options[optionKey as keyof typeof question.options];
      return question && answer ? [{ question: question.prompt, answer }] : [];
    });

  return {
    source: '5-Minute Career Diagnostic',
    submittedAt: diagnostic.submittedAt,
    archetypeName: diagnostic.archetypeName,
    answers,
  };
}
