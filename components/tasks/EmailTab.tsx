'use client';

import { useMemo, useState } from 'react';
import { Loader2, MailCheck, Send } from 'lucide-react';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { Task, TaskStatus } from '@/lib/dashboard-tasks';
import {
  EMAIL_TEMPLATES,
  getBookingLink,
  getEmailTemplate,
  getTemplateIdForArchetype,
  type EmailTemplateId,
} from '@/lib/email-templates';

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

function injectEmailTemplate(value: string, lead: DiagnosticSubmission | undefined, templateId: EmailTemplateId) {
  return value
    .split('{{firstName}}')
    .join(getLeadFirstName(lead))
    .split('[BOOKING LINK]')
    .join(getBookingUrlForLead(lead, templateId));
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
  onLeadStatusChange: (task: Task, nextStatus: TaskStatus) => Promise<void>;
  onToast: (message: string) => void;
  onAfterSend: () => void;
}) {
  const defaultTemplateId = useMemo(() => getTemplateIdForArchetype(lead?.archetype_name, lead?.archetype_key), [lead]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>(defaultTemplateId);
  const [emailSubject, setEmailSubject] = useState(() => injectEmailTemplate(getEmailTemplate(defaultTemplateId).subject, lead, defaultTemplateId));
  const [emailBody, setEmailBody] = useState(() => injectEmailTemplate(getEmailTemplate(defaultTemplateId).body, lead, defaultTemplateId));
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  function switchTemplate(nextTemplateId: EmailTemplateId) {
    const template = getEmailTemplate(nextTemplateId);
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

      await onLeadStatusChange(task, 'waiting');
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
          {EMAIL_TEMPLATES.map((template) => (
            <option key={template.id} value={template.id}>
              {template.archetypeName}
            </option>
          ))}
        </select>
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
      </div>
    </div>
  );
}
