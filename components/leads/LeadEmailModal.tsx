'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent, WheelEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MailCheck, Save, Send, X } from 'lucide-react';
import type { DashboardNote } from '@/lib/dashboard-tasks';
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
import { leadSourceLabels, normalizeLeadSource, type DiagnosticLeadSource } from '@/lib/lead-sources';
import { buildEmailHistoryNote } from '@/lib/email-history-note';
import type { StoredEmailTemplate } from '@/lib/settings';

export type LeadEmailModalLead = {
  id: string;
  firstName: string;
  email: string;
  archetype: string;
  serviceInterest: string;
  leadStatus?: string;
  followUpCount?: number;
  lastContactedAt?: string | null;
  source?: DiagnosticLeadSource | string | null;
  downloadLink?: string | null;
  notificationId?: string | null;
};

type SentLeadUpdate = {
  id: string;
  lead_status?: string;
  follow_up_count?: number;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
};

type LeadEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadEmailModalLead;
  initialNotes?: DashboardNote[];
  initialSubject?: string;
  initialBody?: string;
  onSent?: (submission: SentLeadUpdate) => void;
  onNoteCreated?: (note: DashboardNote) => void;
};

type LeadEmailTab = 'email' | 'notes';

function getFirstName(lead: LeadEmailModalLead) {
  return lead.firstName.trim().split(/\s+/)[0] || 'there';
}

function getModalHeader(lead: LeadEmailModalLead) {
  if (lead.source === 'first_90_days') return 'First 90 Days Checklist Lead';
  if (lead.source === 'linkedin_headline') return 'LinkedIn Headline Builder Lead';
  if (lead.source === 'masterclass_waitlist') return 'Masterclass Waitlist Lead';
  return lead.archetype?.trim() || lead.serviceInterest?.trim() || 'Diagnostic Lead';
}

function getBookingUrlForLead(lead: LeadEmailModalLead, templateId: EmailTemplateId) {
  const service = lead.serviceInterest.toLowerCase();
  if (service.includes('glow')) return getBookingLink('Glow Up VIP Package');
  if (service.includes('masterclass')) return getBookingLink('Saturday Masterclass');
  if (service.includes('bundle')) return getBookingLink('CV + LinkedIn Bundle');
  if (service.includes('linkedin')) return getBookingLink('LinkedIn Optimisation');
  if (service.includes('clarity')) return getBookingLink('Career Clarity Session');
  if (service.includes('cv revamp')) return getBookingLink('CV Revamp');
  return getBookingLink(getEmailTemplate(templateId).bookingKey);
}

function getDownloadUrlForLead(lead: LeadEmailModalLead, templateId: EmailTemplateId) {
  if (lead.downloadLink) return lead.downloadLink;
  const template = getEmailTemplate(templateId);
  return template.downloadKey ? getDownloadLink(template.downloadKey) : '';
}

function injectTemplate(value: string, lead: LeadEmailModalLead, templateId: EmailTemplateId) {
  return value
    .split('{{firstName}}')
    .join(getFirstName(lead))
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

function getRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en-ZA', { numeric: 'auto' });
  const match = units.find(([, unitSeconds]) => seconds >= unitSeconds);
  if (!match) return 'Just now';
  return rtf.format(-Math.floor(seconds / match[1]), match[0]);
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

export default function LeadEmailModal({
  isOpen,
  onClose,
  lead,
  initialNotes = [],
  initialSubject,
  initialBody,
  onSent,
  onNoteCreated,
}: LeadEmailModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key') || '';
  const { id, firstName, email, archetype, serviceInterest, leadStatus, followUpCount, lastContactedAt, source, downloadLink, notificationId } = lead;
  const leadSource = normalizeLeadSource(source);
  const modalLead = useMemo(
    () => ({ id, firstName, email, archetype, serviceInterest, leadStatus, followUpCount, lastContactedAt, source: leadSource, downloadLink, notificationId }),
    [archetype, downloadLink, email, firstName, followUpCount, id, lastContactedAt, leadSource, leadStatus, notificationId, serviceInterest],
  );
  const initialNotesRef = useRef(initialNotes);
  const defaultTemplateId = useMemo(
    () =>
      getTemplateIdForLeadStage({
        archetypeName: archetype,
        followUpCount,
        leadStatus,
        lastContactedAt,
        source: leadSource,
      }),
    [archetype, followUpCount, lastContactedAt, leadSource, leadStatus]
  );
  const [activeTab, setActiveTab] = useState<LeadEmailTab>('email');
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>(defaultTemplateId);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sendError, setSendError] = useState(false);
  const [notes, setNotes] = useState<DashboardNote[]>(initialNotes);
  const [noteBody, setNoteBody] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<StoredEmailTemplate[]>(
    EMAIL_TEMPLATES.map((template) => ({ ...template, active: true })),
  );
  const selectedTemplate = availableTemplates.find((template) => template.id === selectedTemplateId) || getEmailTemplate(selectedTemplateId);
  const sequenceDots = getEmailSequenceDots(selectedTemplateId);
  const sequenceTotal = getEmailSequenceTotal(selectedTemplate);

  useEffect(() => {
    initialNotesRef.current = initialNotes;
  }, [initialNotes]);

  const closeWithAnimation = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`;
    document.documentElement.style.overscrollBehavior = 'contain';

    const timeout = window.setTimeout(() => {
      const template = getEmailTemplate(defaultTemplateId);
      setActiveTab('email');
      setSelectedTemplateId(defaultTemplateId);
      setSubject(initialSubject || injectTemplate(template.subject, modalLead, defaultTemplateId));
      setBody(initialBody || injectTemplate(template.body, modalLead, defaultTemplateId));
      setNotes(initialNotesRef.current);
      setNoteBody('');
      setSendError(false);
      setNoteError(null);
      setSendState('idle');
      setIsClosing(false);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousBodyStyles.overflow;
      document.body.style.paddingRight = previousBodyStyles.paddingRight;
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.width = previousBodyStyles.width;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [defaultTemplateId, initialBody, initialSubject, isOpen, modalLead]);

  useEffect(() => {
    if (!isOpen || !adminKey) return;
    let cancelled = false;

    async function loadTemplates() {
      try {
        const response = await fetch(`/api/email/templates?key=${encodeURIComponent(adminKey)}`);
        const data = (await response.json().catch(() => ({}))) as { templates?: StoredEmailTemplate[] };
        if (!response.ok || !data.templates?.length || cancelled) return;
        setAvailableTemplates(data.templates);

        const defaultTemplate = data.templates.find((template) => template.id === defaultTemplateId) || data.templates[0];
        if (defaultTemplate && !initialSubject && !initialBody) {
          setSelectedTemplateId(defaultTemplate.id);
          setSubject(injectTemplate(defaultTemplate.subject, modalLead, defaultTemplate.id));
          setBody(injectTemplate(defaultTemplate.body, modalLead, defaultTemplate.id));
        }
      } catch {
        // File templates remain the fallback.
      }
    }

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [adminKey, defaultTemplateId, initialBody, initialSubject, isOpen, modalLead]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWithAnimation, isOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function switchTemplate(templateId: EmailTemplateId) {
    const template = availableTemplates.find((item) => item.id === templateId) || getEmailTemplate(templateId);
    setSelectedTemplateId(templateId);
    setSubject(injectTemplate(template.subject, modalLead, templateId));
    setBody(injectTemplate(template.body, modalLead, templateId));
    setSendError(false);
  }

  async function sendEmail() {
    if (!modalLead.email || sendState === 'sending') return;

    setSendError(false);
    setSendState('sending');

    try {
      await requestJson('/api/email/send', 'POST', {
        key: adminKey,
        to: modalLead.email,
        toName: modalLead.firstName || modalLead.email,
        subject,
        htmlContent: plainTextToEmailHtml(body),
        plainTextBody: body,
        leadId: modalLead.id,
        templateId: selectedTemplateId,
        archetype: modalLead.archetype,
        serviceInterest: modalLead.serviceInterest,
      });

      let submission: SentLeadUpdate | null = null;

      if (modalLead.id) {
        const data = await requestJson<{ submission: SentLeadUpdate | null }>(
          `/api/diagnostic/submissions/${modalLead.id}`,
          'PATCH',
          {
            key: adminKey,
            leadStatus: 'contacted',
            markContacted: true,
            templateId: selectedTemplateId,
          },
        );

        submission = data.submission || {
          id: modalLead.id,
          lead_status: 'contacted',
          last_contacted_at: new Date().toISOString(),
        };

        if (modalLead.notificationId) {
          await requestJson(`/api/notifications/${modalLead.notificationId}`, 'PATCH', { key: adminKey });
        }
      } else if (modalLead.notificationId && leadSource !== 'diagnostic') {
        const data = await requestJson<{ submission: SentLeadUpdate | null }>(
          '/api/leads/source-contact',
          'POST',
          {
            key: adminKey,
            notificationId: modalLead.notificationId,
            source: leadSource,
            firstName: modalLead.firstName,
            email: modalLead.email,
            downloadLink: modalLead.downloadLink,
            templateId: selectedTemplateId,
            sentAt: new Date().toISOString(),
          },
        );

        submission = data.submission || {
          id: '',
          lead_status: 'contacted',
          last_contacted_at: new Date().toISOString(),
        };
      }

      const noteLeadId = submission?.id || modalLead.id;
      if (noteLeadId) {
        try {
          const data = await requestJson<{ note: DashboardNote }>('/api/dashboard/notes', 'POST', {
            key: adminKey,
            body: buildEmailHistoryNote({
              subject,
              templateLabel: getEmailTemplateOptionLabel(selectedTemplate),
              recipientEmail: modalLead.email,
            }),
            linkedLeadId: noteLeadId,
          });
          setNotes((current) => [data.note, ...current]);
          onNoteCreated?.(data.note);
        } catch {
          setNoteError('Email sent, but the history note did not save.');
        }
      }

      if (submission) onSent?.(submission);
      router.refresh();
      setSendState('sent');
      setToast(`Email sent to ${getFirstName(modalLead)}.`);
      window.setTimeout(() => {
        setSendState('idle');
        closeWithAnimation();
      }, 2000);
    } catch {
      setSendState('idle');
      setSendError(true);
    }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteBody.trim() || noteSaving) return;

    const optimisticNote: DashboardNote = {
      id: `optimistic-${Date.now()}`,
      body: noteBody.trim(),
      linkedLeadId: modalLead.id || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNoteSaving(true);
    setNoteError(null);
    setNotes((current) => [optimisticNote, ...current]);

    try {
      const data = await requestJson<{ note: DashboardNote }>('/api/dashboard/notes', 'POST', {
        key: adminKey,
        body: noteBody,
        linkedLeadId: modalLead.id || null,
      });
      setNotes((current) => current.map((note) => (note.id === optimisticNote.id ? data.note : note)));
      onNoteCreated?.(data.note);
      router.refresh();
      setNoteBody('');
    } catch {
      setNotes((current) => current.filter((note) => note.id !== optimisticNote.id));
      setNoteError('Could not save this note.');
    } finally {
      setNoteSaving(false);
    }
  }

  const overlay = isOpen ? (
        <div
          className="fixed inset-0 z-50 flex overscroll-contain items-center justify-center bg-[rgba(0,0,0,0.4)] p-4 max-md:items-end max-md:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeWithAnimation();
          }}
          role="presentation"
        >
          <section
            className={`task-modal-panel flex h-[88vh] max-h-[88vh] w-full overscroll-contain flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] md:h-auto md:max-h-[72vh] md:w-[520px] md:rounded-[16px] ${
              isClosing ? 'task-modal-panel-closing' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={`Email ${getFirstName(modalLead)}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-[#E4D8CB] md:hidden" />
            <header className="relative h-20 shrink-0 px-5 pt-4 md:px-6">
              <button
                type="button"
                onClick={closeWithAnimation}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
                aria-label="Close email modal"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="max-w-[calc(100%-44px)] truncate font-serif text-[20px] font-bold leading-tight text-[#142334]">
                {getModalHeader(modalLead)}
              </h2>
              <p className="mt-1 max-w-[calc(100%-44px)] truncate text-[13px] text-[#6B6B6B]">
                {getFirstName(modalLead)} - {modalLead.email}
              </p>
              <p className="mt-2 max-w-[calc(100%-44px)] truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8C7466]">
                Email {selectedTemplate.sequenceIndex} of {sequenceTotal} <span aria-hidden="true">{sequenceDots}</span> {selectedTemplate.stageLabel}
              </p>
            </header>

            <nav className="flex h-11 shrink-0 border-b border-[#E4D8CB]" aria-label="Lead email modal tabs">
              {(['email', 'notes'] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-11 flex-1 border-b-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition ${
                      active ? 'border-[#142334] text-[#142334]' : 'border-transparent text-[#6B6B6B] hover:text-[#142334]'
                    }`}
                  >
                    {tab === 'email' ? 'Email' : 'Notes'}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTab === 'email' && (
                <div className="grid gap-4 px-5 py-4 md:px-6">
                  <div className="rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[12px] leading-relaxed text-[#142334]/70">
                    Source: <span className="font-semibold text-[#142334]">{leadSourceLabels[leadSource]}</span>
                    {modalLead.downloadLink ? ' - download link is available for this lead.' : ''}
                  </div>
                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Template</span>
                    <select
                      value={selectedTemplateId}
                      onChange={(event) => switchTemplate(event.target.value as EmailTemplateId)}
                      className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]"
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
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="h-10 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-[14px] text-[#142334] outline-none transition focus:border-[#142334]"
                    />
                  </label>
                  {isMasterclassBookingsOpenTemplate(selectedTemplateId) && (
                    <p className="rounded-[8px] border border-[#F59E0B] bg-[#FEF3C7] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#92400E]">
                      This is the manual trigger email. Only send when July bookings are confirmed live.
                    </p>
                  )}

                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Body</span>
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      onWheel={containScrollableWheel}
                      className="h-[180px] resize-none overflow-y-auto overscroll-contain rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[13px] leading-[1.6] text-[#142334] outline-none transition focus:border-[#142334]"
                    />
                  </label>

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={sendEmail}
                      disabled={sendState === 'sending' || !modalLead.email}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        sendState === 'sent'
                          ? 'bg-[#22C55E] text-white'
                          : 'bg-[#142334] text-white hover:bg-[#C9AD98] hover:text-[#142334]'
                      }`}
                    >
                      {sendState === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {sendState === 'idle' && <Send className="h-4 w-4" />}
                      {sendState === 'sent' && <MailCheck className="h-4 w-4" />}
                      {sendState === 'sending' ? 'Sending...' : sendState === 'sent' ? 'Sent ✓' : 'Send Email'}
                    </button>
                    {sendError && <p className="text-[12px] leading-relaxed text-[#DC2626]">Email failed to send. Try again.</p>}
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
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="grid gap-4 px-5 py-4 md:px-6">
                  {notes.length === 0 ? (
                    <div className="grid h-[92px] place-items-center rounded-[8px] bg-[#F5F3EE] text-center text-[13px] text-[#6B6B6B]">
                      No notes saved for this lead yet.
                    </div>
                  ) : (
                    <div className="grid max-h-[200px] gap-2 overflow-y-auto overscroll-contain pr-1" onWheel={containScrollableWheel}>
                      {notes.map((note) => (
                        <article key={note.id} className="rounded-[8px] bg-[#F5F3EE] p-3">
                          <p className="text-[14px] leading-relaxed text-[#142334]">{note.body}</p>
                          <p className="mt-2 text-[11px] text-[#6B6B6B]">{getRelativeTime(note.createdAt)}</p>
                        </article>
                      ))}
                    </div>
                  )}

                  <form className="grid gap-3" onSubmit={saveNote}>
                    <textarea
                      value={noteBody}
                      onChange={(event) => setNoteBody(event.target.value)}
                      onWheel={containScrollableWheel}
                      placeholder="Add a note about this lead..."
                      className="h-20 resize-none overscroll-contain rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#6B6B6B]/65 focus:border-[#142334]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={noteSaving || !noteBody.trim()}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#C9AD98] px-5 text-[13px] font-semibold text-[#142334] transition hover:bg-[#142334] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {noteSaving ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                    {noteError && <p className="text-[12px] leading-relaxed text-[#DC2626]">{noteError}</p>}
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
  ) : null;

  const toastNode = toast ? (
    <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#142334] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_40px_rgba(20,35,52,0.2)]">
      {toast}
    </div>
  ) : null;

  if (typeof document === 'undefined') return null;

  return (
    <>
      {overlay ? createPortal(overlay, document.body) : null}
      {toastNode ? createPortal(toastNode, document.body) : null}
    </>
  );
}
