import type { ClientSessionPreparationContent } from '@/lib/client-session-preparation';

export type SessionPreparationExportLayout = 'compact' | 'full';
export type SessionPreparationExportFormat = 'pdf' | 'docx' | 'print';

export type SessionPreparationExportOptions = {
  layout: SessionPreparationExportLayout;
  format: SessionPreparationExportFormat;
  includeGuide: boolean;
  includeLens: boolean;
  includeCues: boolean;
};

export const DEFAULT_SESSION_PREPARATION_EXPORT_OPTIONS: SessionPreparationExportOptions = {
  layout: 'full',
  format: 'pdf',
  includeGuide: true,
  includeLens: false,
  includeCues: true,
};

export function normalizeSessionPreparationExportOptions(value: unknown): SessionPreparationExportOptions {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const layout = source.layout === 'compact' ? 'compact' : 'full';
  const format = source.format === 'docx' || source.format === 'print' ? source.format : 'pdf';
  const includeGuide = source.includeGuide !== false;
  const includeLens = source.includeLens === true;
  if (!includeGuide && !includeLens) throw new Error('Choose Session Guide, Coaching Lens, or both.');
  return {
    layout,
    format,
    includeGuide,
    includeLens,
    includeCues: includeGuide && source.includeCues !== false,
  };
}

export function hasCoachingLensContent(content: ClientSessionPreparationContent) {
  return content.groundedCoachNotes.length > 0
    || content.judgmentCalls.length > 0
    || content.legacyCoachNotes.length > 0;
}

export function sessionPreparationExportFileName(input: {
  clientName: string;
  serviceSlug: 'career-clarity' | 'glow-up-vip';
  extension: 'pdf' | 'docx';
}) {
  const name = input.clientName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const service = input.serviceSlug === 'career-clarity' ? 'Career-Clarity' : 'Glow-Up-VIP';
  return `${name || 'Client'}-${service}-Session-Preparation.${input.extension}`;
}
