import { isDiagnosticLeadSource } from '@/lib/lead-sources';

export type EmailModalRoutableLead = {
  email?: string | null;
  archetype?: string | null;
  serviceInterest?: string | null;
  source?: string | null;
};

export function shouldUseInternalEmailModal(lead: EmailModalRoutableLead) {
  if (isDiagnosticLeadSource(lead.source)) return true;
  if (lead.archetype?.trim()) return true;
  if (lead.serviceInterest?.trim()) return true;
  return false;
}

export function getMailtoHref(email?: string | null) {
  const cleanEmail = (email || '').replace(/[\r\n]/g, '').trim();
  return cleanEmail ? `mailto:${cleanEmail}` : 'mailto:';
}
