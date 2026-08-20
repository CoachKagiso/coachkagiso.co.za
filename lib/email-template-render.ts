import {
  getBookingLink,
  getDownloadLink,
  getEmailTemplate,
  type EmailTemplateId,
} from './email-templates.ts';

export type TemplateRenderLead = {
  firstName?: string | null;
  serviceInterest?: string | null;
  downloadLink?: string | null;
};

export function getTemplateFirstName(lead: TemplateRenderLead) {
  return String(lead.firstName || '').trim().split(/\s+/)[0] || 'there';
}

export function getBookingUrlForLead(lead: TemplateRenderLead, templateId: EmailTemplateId) {
  const service = String(lead.serviceInterest || '').toLowerCase();
  if (service.includes('glow')) return getBookingLink('Glow Up VIP Package');
  if (service.includes('masterclass')) return getBookingLink('Saturday Masterclass');
  if (service.includes('bundle')) return getBookingLink('CV + LinkedIn Bundle');
  if (service.includes('linkedin')) return getBookingLink('LinkedIn Optimisation');
  if (service.includes('clarity')) return getBookingLink('Career Clarity Session');
  if (service.includes('cv revamp')) return getBookingLink('CV Revamp');
  return getBookingLink(getEmailTemplate(templateId).bookingKey);
}

export function getDownloadUrlForLead(lead: TemplateRenderLead, templateId: EmailTemplateId) {
  if (lead.downloadLink) return lead.downloadLink;
  const template = getEmailTemplate(templateId);
  return template.downloadKey ? getDownloadLink(template.downloadKey) : '';
}

export function injectTemplateTokens(value: string, lead: TemplateRenderLead, templateId: EmailTemplateId) {
  return value
    .split('{{firstName}}')
    .join(getTemplateFirstName(lead))
    .split('[BOOKING LINK]')
    .join(getBookingUrlForLead(lead, templateId))
    .split('[DOWNLOAD LINK]')
    .join(getDownloadUrlForLead(lead, templateId));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToEmailHtml(value: string) {
  const paragraphs = value
    .split(/\r?\n\r?\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p style="margin: 0 0 16px;">${escapeHtml(chunk).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #142334; line-height: 1.7; max-width: 560px;">${paragraphs}</div>`;
}
