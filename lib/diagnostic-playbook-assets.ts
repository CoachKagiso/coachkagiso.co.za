import { getSupabaseUrl } from '@/lib/env';
import type { DiagnosticArchetype } from '@/lib/career-diagnostic';

export const DIAGNOSTIC_PLAYBOOK_BUCKET = 'diagnostic-playbooks';

export function getDiagnosticPlaybookPdfPath(slug: string) {
  return `${slug}-playbook.pdf`;
}

export function getStoredDiagnosticPlaybookPdfUrl(slug: string) {
  const path = getDiagnosticPlaybookPdfPath(slug);
  return `${getSupabaseUrl()}/storage/v1/object/public/${DIAGNOSTIC_PLAYBOOK_BUCKET}/${path}`;
}

export function getArchetypeStoredPdfUrl(archetype: DiagnosticArchetype) {
  return getStoredDiagnosticPlaybookPdfUrl(archetype.playbook.slug);
}
