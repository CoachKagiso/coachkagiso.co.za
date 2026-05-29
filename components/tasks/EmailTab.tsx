'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { AlertTriangle, Clock, Loader2, MailCheck, Send, X } from 'lucide-react';
import type { DiagnosticSubmission } from '@/lib/diagnostic-submissions';
import type { Task, TaskStatus } from '@/lib/dashboard-tasks';
import { buildEmailHistoryNote } from '@/lib/email-history-note';
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
  isNewsletterBridgeTemplate,
  type EmailTemplateId,
} from '@/lib/email-templates';
import { buildRecoveryEmailDraft, type SequenceRepairAction } from '@/lib/email-sequence-repair';
import {
  getScheduledSendSummary,
  getSendWindowGuidance,
  type NextRecommendedSendWindow,
} from '@/lib/email-send-windows';
import {
  getSelectableLeadEmailTemplates,
  type EmailTemplateGuardrail,
  type EmailTemplateGuardrailLead,
} from '@/lib/email-template-guardrails';
import { leadSourceLabels, normalizeLeadSource } from '@/lib/lead-sources';
import type { StoredEmailTemplate } from '@/lib/settings';

type GuardrailResponse = { guardrail?: EmailTemplateGuardrail };
type RepairResponse = { guardrail?: EmailTemplateGuardrail };
type DraftTemplate = { subject: string; body: string };
type ScheduleConfirmation = {
  window: NextRecommendedSendWindow;
  scheduledAt: Date;
};

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

function prepareTaskTemplateDraft(
  template: DraftTemplate,
  lead: DiagnosticSubmission | undefined,
  templateId: EmailTemplateId,
  guardrail?: EmailTemplateGuardrail | null,
) {
  const injected = {
    subject: injectEmailTemplate(template.subject, lead, templateId),
    body: injectEmailTemplate(template.body, lead, templateId),
  };

  if (guardrail?.sequenceGap.detected && guardrail.sequenceGap.firstTemplateId === templateId) {
    return buildRecoveryEmailDraft({
      firstName: getLeadFirstName(lead),
      firstContactBody: injected.body,
    });
  }

  return injected;
}

function containScrollableWheel<T extends HTMLElement>(event: WheelEvent<T>) {
  const target = event.currentTarget;
  if (target.scrollHeight <= target.clientHeight) return;

  const deltaY =
    event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * target.clientHeight
        : event.deltaY;

  event.preventDefault();
  event.stopPropagation();
  target.scrollTop += deltaY;
}

function fitEmailBodyTextarea(textarea: HTMLTextAreaElement) {
  const minHeight = window.matchMedia('(min-width: 768px)').matches ? 480 : 320;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(minHeight, textarea.scrollHeight)}px`;
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

function getScheduleConfirmationText(confirmation: ScheduleConfirmation) {
  return `Scheduled for ${confirmation.window.time} ${confirmation.window.tomorrow ? 'tomorrow' : 'today'}.`;
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
  onAddNote,
  onToast,
  onAfterSend,
}: {
  task: Task;
  adminKey: string;
  lead?: DiagnosticSubmission;
  onLeadStatusChange: (task: Task, nextStatus: TaskStatus, options?: { templateId?: EmailTemplateId }) => Promise<void>;
  onAddNote: (task: Task, body: string) => Promise<void>;
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
  const guardrailLead = useMemo<EmailTemplateGuardrailLead>(
    () => ({
      archetypeName: lead?.archetype_name,
      archetypeKey: lead?.archetype_key,
      followUpCount: lead?.follow_up_count,
      leadStatus: lead?.lead_status,
      lastContactedAt: lead?.last_contacted_at,
      source: lead?.source,
    }),
    [lead],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>(defaultTemplateId);
  const [emailSubject, setEmailSubject] = useState(() => prepareTaskTemplateDraft(getEmailTemplate(defaultTemplateId), lead, defaultTemplateId).subject);
  const [emailBody, setEmailBody] = useState(() => prepareTaskTemplateDraft(getEmailTemplate(defaultTemplateId), lead, defaultTemplateId).body);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [repairState, setRepairState] = useState<SequenceRepairAction | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [sendTimeSnapshot] = useState(() => new Date());
  const [sendTimeNoticeDismissed, setSendTimeNoticeDismissed] = useState(false);
  const [scheduleConfirmation, setScheduleConfirmation] = useState<ScheduleConfirmation | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<StoredEmailTemplate[]>(
    EMAIL_TEMPLATES.map((template) => ({ ...template, active: true })),
  );
  const [templateGuardrailState, setTemplateGuardrailState] = useState<{ leadId: string; guardrail: EmailTemplateGuardrail } | null>(null);
  const templateGuardrail = lead?.id && templateGuardrailState?.leadId === lead.id ? templateGuardrailState.guardrail : null;
  const activeDefaultTemplateId = templateGuardrail?.recommendedTemplateId || defaultTemplateId;
  const selectableGuardrailLead = useMemo<EmailTemplateGuardrailLead>(
    () => ({
      ...guardrailLead,
      sequenceRepairStatus: templateGuardrail?.sequenceRepairStatus,
    }),
    [guardrailLead, templateGuardrail?.sequenceRepairStatus],
  );
  const selectableTemplates = useMemo(
    () => getSelectableLeadEmailTemplates(availableTemplates, selectableGuardrailLead, templateGuardrail?.sentTemplateIds || []),
    [availableTemplates, selectableGuardrailLead, templateGuardrail],
  );
  const templateOptions = selectableTemplates.length > 0 ? selectableTemplates : [selectedTemplateId].map(getEmailTemplate);
  const selectedTemplate = availableTemplates.find((template) => template.id === selectedTemplateId) || getEmailTemplate(selectedTemplateId);
  const leadSource = normalizeLeadSource(lead?.source);
  const sequenceGap = templateGuardrail?.sequenceGap;
  const hasSequenceGap = Boolean(sequenceGap?.detected && sequenceGap.firstTemplateId);
  const sequenceIsManual = templateGuardrail?.sequenceRepairStatus === 'manual';
  const scheduleTimerRef = useRef<number | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sendWindowGuidance = useMemo(() => getSendWindowGuidance(sendTimeSnapshot), [sendTimeSnapshot]);
  const showSendTimeReminder = !sendWindowGuidance.withinWindow && !sendTimeNoticeDismissed && !scheduleConfirmation;

  const clearScheduleTimer = useCallback(() => {
    if (scheduleTimerRef.current) {
      window.clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearScheduleTimer(), [clearScheduleTimer]);

  useEffect(() => {
    if (!bodyTextareaRef.current) return;
    fitEmailBodyTextarea(bodyTextareaRef.current);
  }, [emailBody, selectedTemplateId]);

  useEffect(() => {
    const leadForRequest = lead;
    if (!adminKey || !leadForRequest?.id) return;
    const guardrailLeadId = leadForRequest.id;
    const guardrailLead = leadForRequest;

    let cancelled = false;
    async function loadGuardrail() {
      try {
        const response = await fetch(`/api/email/guardrails?key=${encodeURIComponent(adminKey)}&leadId=${encodeURIComponent(guardrailLeadId)}`);
        const data = (await response.json().catch(() => ({}))) as GuardrailResponse;
        if (!response.ok || !data.guardrail || cancelled) return;
        setTemplateGuardrailState({ leadId: guardrailLeadId, guardrail: data.guardrail });
        if (data.guardrail.recommendedTemplateId) {
          const template = availableTemplates.find((item) => item.id === data.guardrail?.recommendedTemplateId) || getEmailTemplate(data.guardrail.recommendedTemplateId);
          const draft = prepareTaskTemplateDraft(template, guardrailLead, data.guardrail.recommendedTemplateId, data.guardrail);
          setSelectedTemplateId(data.guardrail.recommendedTemplateId);
          setEmailSubject(draft.subject);
          setEmailBody(draft.body);
        }
      } catch {
        // The send endpoint repeats the same guardrails server-side.
      }
    }

    void loadGuardrail();
    return () => {
      cancelled = true;
    };
  }, [adminKey, availableTemplates, lead]);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await fetch(`/api/email/templates?key=${encodeURIComponent(adminKey)}`);
        const data = (await response.json().catch(() => ({}))) as { templates?: StoredEmailTemplate[] };
        if (!response.ok || !data.templates?.length || cancelled) return;
        setAvailableTemplates(data.templates);

        const template = data.templates.find((item) => item.id === activeDefaultTemplateId) || data.templates[0];
        if (template) {
          const draft = prepareTaskTemplateDraft(template, lead, template.id, templateGuardrail);
          setSelectedTemplateId(template.id);
          setEmailSubject(draft.subject);
          setEmailBody(draft.body);
        }
      } catch {
        // File templates remain the fallback.
      }
    }

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [activeDefaultTemplateId, adminKey, lead, templateGuardrail]);

  function switchTemplate(nextTemplateId: EmailTemplateId) {
    const template = availableTemplates.find((item) => item.id === nextTemplateId) || getEmailTemplate(nextTemplateId);
    const draft = prepareTaskTemplateDraft(template, lead, nextTemplateId, templateGuardrail);
    setSelectedTemplateId(nextTemplateId);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setSendError(null);
    setRepairError(null);
  }

  function useRecoveryEmailDraft() {
    if (!sequenceGap?.firstTemplateId) return;
    switchTemplate(sequenceGap.firstTemplateId);
  }

  async function repairSequence(action: SequenceRepairAction, options: { showToast?: boolean; refresh?: boolean } = {}) {
    if (!lead?.id || !adminKey || repairState) return null;

    const showToast = options.showToast ?? true;
    const refresh = options.refresh ?? true;
    setRepairState(action);
    setRepairError(null);

    try {
      const data = await requestJson<RepairResponse>('/api/email/sequence-repair', 'POST', {
        key: adminKey,
        leadId: lead.id,
        action,
      });

      if (data.guardrail) {
        setTemplateGuardrailState({ leadId: lead.id, guardrail: data.guardrail });
        if (action !== 'recovery_sent' && data.guardrail.recommendedTemplateId) {
          const template =
            availableTemplates.find((item) => item.id === data.guardrail?.recommendedTemplateId) ||
            getEmailTemplate(data.guardrail.recommendedTemplateId);
          const draft = prepareTaskTemplateDraft(template, lead, data.guardrail.recommendedTemplateId, data.guardrail);
          setSelectedTemplateId(data.guardrail.recommendedTemplateId);
          setEmailSubject(draft.subject);
          setEmailBody(draft.body);
        }
      }

      if (showToast) {
        onToast(action === 'manual' ? 'Manual sequence handling is active.' : 'Sequence repair saved.');
      }
      if (refresh) onAfterSend();
      return data;
    } catch (error) {
      setRepairError(error instanceof Error ? error.message : 'Could not save the sequence repair.');
      return null;
    } finally {
      setRepairState(null);
    }
  }

  async function sendEmail(options: { scheduledAt?: Date } = {}) {
    if (!lead?.email || sendState === 'sending') return;

    setSendError(null);
    setSendState('sending');
    clearScheduleTimer();
    const scheduledAt = options.scheduledAt || null;
    const sendsSequenceRecovery = Boolean(
      templateGuardrail?.sequenceGap.detected &&
        templateGuardrail.sequenceGap.firstTemplateId === selectedTemplateId,
    );

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
        scheduledAt: scheduledAt?.toISOString(),
      });

      await onLeadStatusChange(task, 'waiting', { templateId: selectedTemplateId });
      try {
        await onAddNote(
          task,
          buildEmailHistoryNote({
            subject: emailSubject,
            templateLabel: getEmailTemplateOptionLabel(selectedTemplate),
            recipientEmail: lead.email,
            scheduledAt,
          }),
        );
      } catch {
        onToast(scheduledAt ? 'Email scheduled, but the history note did not save.' : 'Email sent, but the history note did not save.');
      }
      if (sendsSequenceRecovery) {
        const repairResult = await repairSequence('recovery_sent', { showToast: false, refresh: false });
        if (!repairResult) {
          onToast('Email sent, but the sequence repair note did not save.');
        }
      }
      setSendState('sent');
      onToast(scheduledAt ? `Email scheduled for ${getLeadFirstName(lead)}.` : `Email sent to ${getLeadFirstName(lead)}.`);
      window.setTimeout(onAfterSend, 650);
      window.setTimeout(() => setSendState('idle'), scheduledAt ? 650 : 2000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Email failed to send. Try again.');
      setScheduleConfirmation(null);
      setSendState('idle');
    }
  }

  function scheduleEmail() {
    if (sendState === 'sending' || sequenceIsManual) return;
    const confirmation = {
      window: sendWindowGuidance.nextWindow,
      scheduledAt: sendWindowGuidance.scheduledAt,
    };
    setScheduleConfirmation(confirmation);
    setSendError(null);
    clearScheduleTimer();
    scheduleTimerRef.current = window.setTimeout(() => {
      void sendEmail({ scheduledAt: confirmation.scheduledAt });
    }, 1500);
  }

  function undoScheduledEmail() {
    clearScheduleTimer();
    setScheduleConfirmation(null);
  }

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto overscroll-contain px-5 py-4 md:px-6" onWheel={containScrollableWheel}>
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

      {hasSequenceGap && (
        <div className="rounded-[8px] border border-[#F59E0B] bg-[#FFFBEB] p-3.5 text-[#92400E]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Sequence gap</p>
              <p className="mt-1 text-[12px] leading-relaxed">
                {sequenceGap?.message || 'First contact was not logged before the sequence advanced.'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={useRecoveryEmailDraft}
              disabled={Boolean(repairState)}
              className="rounded-full bg-[#142334] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use recovery email
            </button>
            <button
              type="button"
              onClick={() => void repairSequence('resolved')}
              disabled={Boolean(repairState)}
              className="rounded-full border border-[#F59E0B]/55 bg-white px-3 py-2 text-[12px] font-semibold text-[#92400E] transition hover:border-[#92400E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mark resolved
            </button>
            <button
              type="button"
              onClick={() => void repairSequence('manual')}
              disabled={Boolean(repairState)}
              className="rounded-full border border-[#F59E0B]/55 bg-white px-3 py-2 text-[12px] font-semibold text-[#92400E] transition hover:border-[#92400E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Manage manually
            </button>
          </div>
          {repairError && <p className="mt-2 text-[12px] leading-relaxed text-[#A24E37]">{repairError}</p>}
        </div>
      )}
      {sequenceIsManual && (
        <div className="rounded-[8px] border border-[#D8C8BB] bg-[#F7F1EC] p-3.5 text-[12px] leading-relaxed text-[#7B5D49]">
          Manual sequence handling is active for this lead. Automated email suggestions are paused.
        </div>
      )}

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Template</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => switchTemplate(event.target.value as EmailTemplateId)}
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[13px] text-[#142334] outline-none transition focus:border-[#142334]"
        >
          {templateOptions.map((template) => (
            <option key={template.id} value={template.id}>
              {getEmailTemplateOptionLabel(template)}
            </option>
          ))}
        </select>
        <span className="text-[12px] leading-relaxed text-[#6B6B6B]">
          {selectedTemplate.stageLabel} - {selectedTemplate.archetypeName}
        </span>
        {templateGuardrail?.warning && (
          <span className="text-[12px] leading-relaxed text-[#8A3B2D]">{templateGuardrail.warning}</span>
        )}
      </label>

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Subject</span>
        <input
          value={emailSubject}
          onChange={(event) => setEmailSubject(event.target.value)}
          className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[13px] text-[#142334] outline-none transition focus:border-[#142334]"
        />
      </label>
      {showSendTimeReminder && (
        <div className="flex items-start gap-2 rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-3.5 py-2.5 text-[#92400E]">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
          <div className="min-w-0 flex-1 text-[12px] font-medium leading-relaxed">
            <p className="font-semibold">Outside recommended send times.</p>
            <p>Best open rates: 7:30 AM / 12:30 PM / 5:30 PM (Tue-Thu)</p>
            <p>Consider scheduling for {getScheduledSendSummary(sendWindowGuidance.nextWindow)}.</p>
          </div>
          <button
            type="button"
            onClick={() => setSendTimeNoticeDismissed(true)}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#92400E] transition hover:bg-[#FDE68A]"
            aria-label="Dismiss send time reminder"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {isMasterclassBookingsOpenTemplate(selectedTemplateId) && (
        <p className="rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#92400E]">
          This is the manual trigger email. Only send when July bookings are confirmed live.
        </p>
      )}

      <label className="grid gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Body</span>
        <textarea
          ref={bodyTextareaRef}
          value={emailBody}
          onChange={(event) => setEmailBody(event.target.value)}
          onWheel={containScrollableWheel}
          className="min-h-[320px] resize-y overflow-y-auto overscroll-contain rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[13px] leading-[1.6] text-[#142334] outline-none transition focus:border-[#142334] md:min-h-[480px]"
        />
      </label>

      <div className="grid gap-2">
        {scheduleConfirmation ? (
          <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#79A580] bg-[#EEF7EF] px-3.5 py-2.5 text-[12px] font-semibold text-[#355C3A]">
            <span>{getScheduleConfirmationText(scheduleConfirmation)}</span>
            <button
              type="button"
              onClick={undoScheduledEmail}
              disabled={sendState === 'sending'}
              className="text-[#355C3A] underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Undo
            </button>
          </div>
        ) : (
          <div className={`grid gap-2 ${sendWindowGuidance.withinWindow ? '' : 'grid-cols-2'}`}>
            <button
              type="button"
              onClick={() => void sendEmail()}
              disabled={!lead?.email || sendState === 'sending' || selectableTemplates.length === 0 || sequenceIsManual}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                sendState === 'sent' ? 'bg-[#22C55E] text-white' : 'bg-[#142334] text-white hover:bg-[#C9AD98] hover:text-[#142334]'
              }`}
            >
              {sendState === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
              {sendState === 'idle' && <Send className="h-4 w-4" />}
              {sendState === 'sent' && <MailCheck className="h-4 w-4" />}
              {sendState === 'sending' ? 'Sending...' : sendState === 'sent' ? 'Sent' : sendWindowGuidance.withinWindow ? 'Send Email' : 'Send now'}
            </button>
            {!sendWindowGuidance.withinWindow && (
              <button
                type="button"
                onClick={scheduleEmail}
                disabled={!lead?.email || sendState === 'sending' || selectableTemplates.length === 0 || sequenceIsManual}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-3 text-[13px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Clock className="h-4 w-4" />
                Schedule for {sendWindowGuidance.nextWindow.time}
              </button>
            )}
          </div>
        )}
        {sendError && <p className="text-[12px] leading-relaxed text-[#A24E37]">Email failed to send. Try again.</p>}
        {selectedTemplate.sequenceIndex === 3 && !isNewsletterBridgeTemplate(selectedTemplateId) && (
          <p className="rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[12px] leading-relaxed text-[#7B5D49]">
            After this email, the newsletter bridge reminder will appear in 2 days if there&apos;s no response.
          </p>
        )}
        {isNewsletterBridgeTemplate(selectedTemplateId) && (
          <p className="rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[12px] leading-relaxed text-[#7B5D49]">
            This is the newsletter bridge. After sending, the lead moves to Nurture and direct follow-up reminders stop.
          </p>
        )}
      </div>
    </div>
  );
}
