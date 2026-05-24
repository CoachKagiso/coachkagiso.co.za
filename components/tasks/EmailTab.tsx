'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, MailCheck, Send } from 'lucide-react';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { Task, TaskStatus } from '@/lib/dashboard-tasks';
import {
  EMAIL_TEMPLATES,
  getEmailSequenceDots,
  getEmailSequenceTotal,
  getEmailTemplateOptionLabel,
  getBookingLink,
  getDownloadLink,
  getEmailTemplate,
  getTemplateIdForLeadStage,
  isMasterclassBookingsOpenTemplate,
  type EmailTemplateId,
} from '@/lib/email-templates';
import { leadSourceLabels, normalizeLeadSource } from '@/lib/lead-sources';
import type { StoredEmailTemplate } from '@/lib/settings';

function getLeadFirstName(lead?: DiagnosticSubmission) {
  return lead?.first_name?.trim().split(/\s+/)[0] || 'there';
}

function getLeadName(lead?: DiagnosticSubmission) {
  return lead?.first_name || lead?.email || 'Lead';
}

function getBookingUrlForLead(lead: DiagnosticSubmission | undefined, templateId: EmailTemplateId) {
  const service = (lead?.archetype_payload?.service || '').toLowerCase();
  if (service.includes('glow')) return getBookingLink('Glow Up VIP Package');
  if (service.includes('masterclass')) return getBookingLink('Saturday Masterclass');
  if (service.includes('bundle')) return getBookingLink('CV + LinkedIn Bundle');
  if (service.includes('linkedin')) return getBookingLink('LinkedIn Optimisation');
  if (service.includes('clarity')) return getBookingLink('Career Clarity Session');
  if (service.includes('cv revamp')) return getBookingLink('CV Revamp');
  return getBookingLink(getEmailTemplate(templateId).bookingKey);
}

function getDownloadUrlForLead(lead: DiagnosticSubmission | undefined, templateId: EmailTemplateId) {
  if (lead?.download_link) return lead.download_link;
  const template = getEmailTemplate(templateId);
  return template.downloadKey ? getDownloadLink(template.downloadKey) : '';
}

function injectEmailTemplate(value: string, lead: DiagnosticSubmission | undefined, templateId: EmailTemplateId) {
  return value
    .split('{{firstName}}')
    .join(getLeadFirstName(lead))
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

function plainTextToEmailHtml(value: string) {
  const paragraphs = value
    .split(/\r?\n\r?\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p style="margin: 0 0 16px;">${escapeHtml(chunk).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #142334; line-height: 1.7; max-width: 560px;">${paragraphs}</div>`;
}

async function requestJson<T>(url: string, method: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export function EmailTab({
  task,
  adminKey,
  lead,
  onLeadStatusChange,
  onToast,
  onAfterSend,
}: {
  task: Task;
  adminKey: string;
  lead?: DiagnosticSubmission;
  onLeadStatusChange: (task: Task, nextStatus: TaskStatus, options?: { templateId?: EmailTemplateId }) => Promise<void>;
  onToast: (message: string) => void;
  onAfterSend: () => void;
}) {
  const defaultTemplateId = useMemo(
    () =>
      getTemplateIdForLeadStage({
        archetypeName: lead?.archetype_name,
        archetypeKey: lead?.archetype_key,
        followUpCount: lead?.follow_up_count,
        leadStatus: lead?.lead_status,
        lastContactedAt: lead?.last_contacted_at,
        source: lead?.source,
      }),
    [lead]
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>(defaultTemplateId);
  const [emailSubject, setEmailSubject] = useState(() => injectEmailTemplate(getEmailTemplate(defaultTemplateId).subject, lead, defaultTemplateId));
  const [emailBody, setEmailBody] = useState(() => injectEmailTemplate(getEmailTemplate(defaultTemplateId).body, lead, defaultTemplateId));
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<StoredEmailTemplate[]>(
    EMAIL_TEMPLATES.map((template) => ({ ...template, active: true })),
  );
  const selectedTemplate = availableTemplates.find((template) => template.id === selectedTemplateId) || getEmailTemplate(selectedTemplateId);
  const leadSource = normalizeLeadSource(lead?.source);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await fetch(`/api/email/templates?key=${encodeURIComponent(adminKey)}`);
        const data = (await response.json().catch(() => ({}))) as { templates?: StoredEmailTemplate[] };
        if (!response.ok || !data.templates?.length || cancelled) return;
        setAvailableTemplates(data.templates);

        const template = data.templates.find((item) => item.id === defaultTemplateId) || data.templates[0];
        if (template) {
          setSelectedTemplateId(template.id);
          setEmailSubject(injectEmailTemplate(template.subject, lead, template.id));
          setEmailBody(injectEmailTemplate(template.body, lead, template.id));
        }
      } catch {
        // File templates remain the fallback.
      }
    }

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [adminKey, defaultTemplateId, lead]);

  function switchTemplate(nextTemplateId: EmailTemplateId) {
    const template = availableTemplates.find((item) => item.id === nextTemplateId) || getEmailTemplate(nextTemplateId);
    setSelectedTemplateId(nextTemplateId);
    setEmailSubject(injectEmailTemplate(template.subject, lead, nextTemplateId));
    setEmailBody(injectEmailTemplate(template.body, lead, nextTemplateId));
    setSendError(null);
  }

  async function sendEmail() {
    if (!lead?.email || sendState === 'sending') return;

    setSendError(null);
    setSendState('sending');

    try {
      await requestJson('/api/email/send', 'POST', {
        key: adminKey,
        to: lead.email,
        toName: getLeadName(lead),
        subject: emailSubject,
        htmlContent: plainTextToEmailHtml(emailBody),
        plainTextBody: emailBody,
        leadId: lead.id,
        templateId: selectedTemplateId,
        archetype: lead.archetype_name,
        serviceInterest: lead.archetype_payload?.service || '',
      });

      await onLeadStatusChange(task, 'waiting', { templateId: selectedTemplateId });
      setSendState('sent');
      onToast(`Email sent to ${getLeadFirstName(lead)}.`);
      window.setTimeout(onAfterSend, 650);
      window.setTimeout(() => setSendState('idle'), 2000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Email failed to send. Try again.');
      setSendState('idle');
    }
  }

  return (
    <div className="grid gap-4 px-5 py-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">To</p>
          <p className="mt-1 truncate text-[13px] text-[#142334]">{lead?.email || 'No email available'}</p>
          <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8C7466]">
            Email {selectedTemplate.sequenceIndex} of {getEmailSequenceTotal(selectedTemplate)} <span aria-hidden="true">{getEmailSequenceDots(selectedTemplateId)}</span>
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
            {leadSourceLabels[leadSource]}
          </p>
        </div>
        <MailCheck className="h-4 w-4 shrink-0 text-[#C9AD98]" />
      </div>

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Template</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => switchTemplate(event.target.value as EmailTemplateId)}
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[13px] text-[#142334] outline-none transition focus:border-[#142334]"
        >
          {availableTemplates.filter((template) => template.active).map((template) => (
            <option key={template.id} value={template.id}>
              {getEmailTemplateOptionLabel(template)}
            </option>
          ))}
        </select>
        <span className="text-[12px] leading-relaxed text-[#6B6B6B]">
          {selectedTemplate.stageLabel} - {selectedTemplate.archetypeName}
        </span>
      </label>

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Subject</span>
        <input
          value={emailSubject}
          onChange={(event) => setEmailSubject(event.target.value)}
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[13px] text-[#142334] outline-none transition focus:border-[#142334]"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Body</span>
        <textarea
          value={emailBody}
          onChange={(event) => setEmailBody(event.target.value)}
          className="h-[160px] resize-none rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[13px] leading-[1.6] text-[#142334] outline-none transition focus:border-[#142334]"
        />
      </label>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={sendEmail}
          disabled={!lead?.email || sendState === 'sending'}
          className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            sendState === 'sent' ? 'bg-[#22C55E] text-white' : 'bg-[#142334] text-white hover:bg-[#C9AD98] hover:text-[#142334]'
          }`}
        >
          {sendState === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
          {sendState === 'idle' && <Send className="h-4 w-4" />}
          {sendState === 'sent' && <MailCheck className="h-4 w-4" />}
          {sendState === 'sending' ? 'Sending...' : sendState === 'sent' ? 'Sent' : 'Send Email'}
        </button>
        {sendError && <p className="text-[12px] leading-relaxed text-[#A24E37]">Email failed to send. Try again.</p>}
        {selectedTemplate.sequenceIndex === 3 && (
          <p className="rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[12px] leading-relaxed text-[#7B5D49]">
            After this email, the newsletter bridge reminder will appear in 7 days if there&apos;s no response.
          </p>
        )}
        {selectedTemplate.sequenceIndex === 4 && (
          <p className="rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[12px] leading-relaxed text-[#7B5D49]">
            This is the newsletter bridge. After sending, the lead moves to Nurture and direct follow-up reminders stop.
          </p>
        )}
        {isMasterclassBookingsOpenTemplate(selectedTemplateId) && (
          <p className="rounded-[8px] bg-[#FEF3C7] px-3 py-2 text-[12px] leading-relaxed text-[#92400E]">
            Masterclass bookings-open emails are manual only. Send this when the booking link and date are confirmed.
          </p>
        )}
      </div>
    </div>
  );
}
