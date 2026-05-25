'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ChevronDown, RefreshCw, Sparkles, WandSparkles, X } from 'lucide-react';
import {
  getSuggestedQuestions,
  type AssistantDashboardContext,
} from '@/lib/growth-os-assistant';
import { buildEmailHistoryNote } from '@/lib/email-history-note';

type AssistantRecommendationItem = {
  label: string;
  detail: string;
  action?: string;
};

type EmailDraft = {
  to: string;
  toName: string;
  subject: string;
  body: string;
  templateId: string;
  leadId: string;
};

type ContentDraft = {
  platform: string;
  contentType: string;
  content: string;
};

type AssistantResponse =
  | { type: 'answer'; message: string }
  | { type: 'recommendation'; message: string; items: AssistantRecommendationItem[] }
  | { type: 'email_draft'; message: string; draft: EmailDraft }
  | { type: 'content_draft'; message: string; draft: ContentDraft };

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  response?: AssistantResponse;
};

type GrowthOSAssistantProps = {
  adminKey: string;
  initialContext: AssistantDashboardContext;
};

type EmailDraftEdit = {
  subject: string;
  body: string;
};

const platformOptions = ['linkedin', 'tiktok', 'instagram', 'facebook', 'email'] as const;

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function plainTextToEmailHtml(value: string) {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const paragraphs = escaped
    .split(/\r?\n\r?\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p style="margin: 0 0 16px;">${chunk.replace(/\r?\n/g, '<br>')}</p>`)
    .join('');

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #142334; line-height: 1.7; max-width: 560px;">${paragraphs}</div>`;
}

function getFirstDraftLine(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || 'Draft ready for review.';
}

function normalizePlatform(value: string) {
  const normalized = value.trim().toLowerCase();
  return platformOptions.includes(normalized as (typeof platformOptions)[number]) ? normalized : '';
}

function buildStudioHref(adminKey: string) {
  const params = new URLSearchParams();
  if (adminKey) params.set('key', adminKey);
  params.set('tab', 'content');
  params.set('studio', 'content');
  return `/resources/career-diagnostic/submissions?${params.toString()}`;
}

function renderAssistantText(content: string) {
  const [firstLine, ...rest] = content.split(/\r?\n/);
  const body = rest.join('\n').trim();

  return (
    <div>
      <p className="font-serif text-[17px] leading-snug text-[#142334]">{firstLine}</p>
      {body && <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#142334]/72">{body}</p>}
    </div>
  );
}

export function GrowthOSAssistant({ adminKey, initialContext }: GrowthOSAssistantProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [refreshedContext, setRefreshedContext] = useState<AssistantDashboardContext | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [slowRequest, setSlowRequest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [removedActionCards, setRemovedActionCards] = useState<Record<string, boolean>>({});
  const [editingEmailCards, setEditingEmailCards] = useState<Record<string, boolean>>({});
  const [emailEdits, setEmailEdits] = useState<Record<string, EmailDraftEdit>>({});
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);

  const dashboardContext = refreshedContext || initialContext;
  const suggestions = useMemo(() => getSuggestedQuestions(dashboardContext), [dashboardContext]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') !== null;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
      }

      if (event.key === 'Escape' && isOpen && !isTyping) {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, expandedCards, editingEmailCards, slowRequest]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (slowTimeoutRef.current) window.clearTimeout(slowTimeoutRef.current);
    };
  }, []);

  function appendAssistantAnswer(message: string) {
    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: 'assistant',
        content: message,
        response: { type: 'answer', message },
      },
    ]);
  }

  function appendSystemMessage(content: string) {
    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: 'system',
        content,
      },
    ]);
  }

  async function submitMessage(explicitMessage?: string) {
    const text = (explicitMessage ?? input).trim();
    if (!text || isSending) return;

    const recentHistory = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.content }));
    const userMessage: AssistantMessage = {
      id: createId(),
      role: 'user',
      content: text,
    };
    const controller = new AbortController();

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsSending(true);
    setSlowRequest(false);
    abortRef.current = controller;
    slowTimeoutRef.current = window.setTimeout(() => setSlowRequest(true), 15000);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-diagnostic-admin-key': adminKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          conversationHistory: recentHistory,
          dashboardContext,
        }),
      });
      const data = (await response.json().catch(() => null)) as AssistantResponse | { error?: string } | null;

      if (!response.ok && (!data || !('type' in data))) {
        throw new Error(data?.error || 'Assistant request failed.');
      }

      const assistantResponse: AssistantResponse = data && 'type' in data
        ? data
        : { type: 'answer', message: 'Something went wrong. Try again.' };

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: assistantResponse.message,
          response: assistantResponse,
        },
      ]);
    } catch (error) {
      const wasCancelled = error instanceof DOMException && error.name === 'AbortError';
      appendAssistantAnswer(wasCancelled ? 'Request cancelled.' : "I'm having trouble connecting. Try again in a moment.");
    } finally {
      if (slowTimeoutRef.current) window.clearTimeout(slowTimeoutRef.current);
      abortRef.current = null;
      setIsSending(false);
      setSlowRequest(false);
    }
  }

  async function refreshContext() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/assistant/context', {
        headers: {
          'x-diagnostic-admin-key': adminKey,
        },
      });
      const data = (await response.json().catch(() => null)) as { context?: AssistantDashboardContext; error?: string } | null;
      if (!response.ok || !data?.context) throw new Error(data?.error || 'Refresh failed.');
      setRefreshedContext(data.context);
      appendSystemMessage('Dashboard data refreshed.');
    } catch {
      appendAssistantAnswer('I could not refresh the dashboard data. Try again in a moment.');
    } finally {
      setIsRefreshing(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setExpandedCards({});
    setRemovedActionCards({});
    setEditingEmailCards({});
    setEmailEdits({});
  }

  function cancelRequest() {
    abortRef.current?.abort();
  }

  function handleEditEmail(messageId: string, draft: EmailDraft) {
    setEditingEmailCards((current) => ({ ...current, [messageId]: true }));
    setExpandedCards((current) => ({ ...current, [messageId]: true }));
    setEmailEdits((current) => ({
      ...current,
      [messageId]: current[messageId] || { subject: draft.subject, body: draft.body },
    }));
  }

  async function handleApproveEmail(messageId: string, draft: EmailDraft) {
    if (busyActionId) return;
    const edit = emailEdits[messageId] || { subject: draft.subject, body: draft.body };
    const leadContext = dashboardContext.followUpsDueTodayList.find(
      (lead) => lead.leadId === draft.leadId || lead.email === draft.to,
    );

    if (!draft.to || !draft.leadId || !edit.subject.trim() || !edit.body.trim()) {
      appendAssistantAnswer('This draft is missing lead details. Use the email modal for this one.');
      return;
    }

    setBusyActionId(messageId);
    try {
      const sendResponse = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          to: draft.to,
          toName: draft.toName || draft.to,
          subject: edit.subject,
          htmlContent: plainTextToEmailHtml(edit.body),
          plainTextBody: edit.body,
          leadId: draft.leadId,
          templateId: draft.templateId,
          archetype: leadContext?.archetype || '',
          serviceInterest: leadContext?.serviceInterest || '',
        }),
      });
      if (!sendResponse.ok) throw new Error('Email failed.');

      const patchResponse = await fetch(`/api/diagnostic/submissions/${draft.leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          leadStatus: 'contacted',
          markContacted: true,
          templateId: draft.templateId,
        }),
      });
      if (!patchResponse.ok) throw new Error('Lead update failed.');

      await fetch('/api/dashboard/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          body: buildEmailHistoryNote({
            subject: edit.subject,
            templateLabel: draft.templateId,
            recipientEmail: draft.to,
          }),
          linkedLeadId: draft.leadId,
        }),
      }).catch(() => null);

      setRemovedActionCards((current) => ({ ...current, [messageId]: true }));
      appendAssistantAnswer(`Email sent to ${draft.toName || draft.to}. Follow-up date updated automatically.`);
      router.refresh();
    } catch {
      appendAssistantAnswer('Something went wrong. Try using the email modal directly.');
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleSaveToVault(messageId: string, draft: ContentDraft, openAfter = false) {
    if (busyActionId) return;
    const content = draft.content.trim();
    if (!content) {
      appendAssistantAnswer('This content draft is empty. Ask me to draft it again.');
      return;
    }

    setBusyActionId(messageId);
    try {
      const response = await fetch('/api/content/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: adminKey,
          title: content.slice(0, 60),
          content,
          platform: normalizePlatform(draft.platform) || undefined,
          source: 'assistant',
          status: 'draft',
          notes: JSON.stringify({ kind: 'assistant_draft', contentType: draft.contentType || 'text_post' }),
        }),
      });
      if (!response.ok) throw new Error('Vault save failed.');

      setRemovedActionCards((current) => ({ ...current, [messageId]: true }));
      appendAssistantAnswer('Saved to Vault. Find it in Content > Vault > Idea Backlog.');
      if (openAfter) router.push(buildStudioHref(adminKey));
    } catch {
      appendAssistantAnswer('I could not save this to Vault. Try again from Content Studio.');
    } finally {
      setBusyActionId(null);
    }
  }

  function renderEmailDraftCard(messageId: string, draft: EmailDraft) {
    if (removedActionCards[messageId]) return null;

    const expanded = expandedCards[messageId];
    const editing = editingEmailCards[messageId];
    const edit = emailEdits[messageId] || { subject: draft.subject, body: draft.body };
    const firstLine = getFirstDraftLine(edit.body);
    const leadContext = dashboardContext.followUpsDueTodayList.find(
      (lead) => lead.leadId === draft.leadId || lead.email === draft.to,
    );

    return (
      <div className="mt-3 rounded-[12px] border border-[#E4D8CB] bg-[#F5F3EE] p-4 text-[#142334] shadow-[0_10px_22px_rgba(20,35,52,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7466]">
              Draft email{leadContext?.archetype ? ` - ${leadContext.archetype}` : ''}
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-snug">&quot;{firstLine}&quot;</p>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-[#C9AD98]" />
        </div>

        <button
          type="button"
          onClick={() => setExpandedCards((current) => ({ ...current, [messageId]: !expanded }))}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B] transition hover:text-[#142334]"
        >
          Read full draft <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-3 rounded-[8px] border border-[#E4D8CB] bg-white p-3">
            {editing ? (
              <div className="grid gap-3">
                <input
                  value={edit.subject}
                  onChange={(event) =>
                    setEmailEdits((current) => ({
                      ...current,
                      [messageId]: { ...edit, subject: event.target.value },
                    }))
                  }
                  className="h-10 rounded-[8px] border border-[#E4D8CB] px-3 text-[13px] outline-none focus:border-[#142334]"
                  aria-label="Email subject"
                />
                <textarea
                  value={edit.body}
                  onChange={(event) =>
                    setEmailEdits((current) => ({
                      ...current,
                      [messageId]: { ...edit, body: event.target.value },
                    }))
                  }
                  rows={8}
                  className="resize-none rounded-[8px] border border-[#E4D8CB] p-3 text-[13px] leading-relaxed outline-none focus:border-[#142334]"
                  aria-label="Email body"
                />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#142334]/72">
                <p className="mb-3 font-semibold text-[#142334]">{draft.subject}</p>
                {draft.body}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApproveEmail(messageId, draft)}
            disabled={busyActionId === messageId}
            className="rounded-full bg-[#142334] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#1e3347] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyActionId === messageId ? 'Sending' : 'Approve & send'}
          </button>
          <button
            type="button"
            onClick={() => handleEditEmail(messageId, draft)}
            className="rounded-full bg-[#C9AD98] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#d6bda9]"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => setRemovedActionCards((current) => ({ ...current, [messageId]: true }))}
            className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] transition hover:text-[#142334]"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  function renderContentDraftCard(messageId: string, draft: ContentDraft) {
    if (removedActionCards[messageId]) return null;

    const expanded = expandedCards[messageId];
    const firstLine = getFirstDraftLine(draft.content);

    return (
      <div className="mt-3 rounded-[12px] border border-[#E4D8CB] bg-[#F5F3EE] p-4 text-[#142334] shadow-[0_10px_22px_rgba(20,35,52,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7466]">
              Draft {draft.platform || 'content'} post
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-snug">&quot;{firstLine}&quot;</p>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-[#C9AD98]" />
        </div>

        <button
          type="button"
          onClick={() => setExpandedCards((current) => ({ ...current, [messageId]: !expanded }))}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B] transition hover:text-[#142334]"
        >
          Read full draft <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-3 whitespace-pre-wrap rounded-[8px] border border-[#E4D8CB] bg-white p-3 text-[13px] leading-relaxed text-[#142334]/72">
            {draft.content}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveToVault(messageId, draft)}
            disabled={busyActionId === messageId}
            className="rounded-full bg-[#C9AD98] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#d6bda9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save to Vault
          </button>
          <button
            type="button"
            onClick={() => handleSaveToVault(messageId, draft, true)}
            disabled={busyActionId === messageId}
            className="rounded-full bg-[#C9AD98] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#d6bda9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Open in Studio
          </button>
          <button
            type="button"
            onClick={() => setRemovedActionCards((current) => ({ ...current, [messageId]: true }))}
            className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B] transition hover:text-[#142334]"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="growth-os-assistant hidden md:block">
      <section
        id="growth-os-assistant-panel"
        aria-label="Growth OS Assistant"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`fixed bottom-[88px] right-6 z-40 flex h-[560px] w-[420px] max-w-[calc(100vw-48px)] origin-bottom-right flex-col overflow-hidden rounded-[16px] border border-[#E4D8CB] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition duration-200 ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-[0.98] opacity-0'
        }`}
      >
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E4D8CB] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-[#C9AD98]" />
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142334]">
              Growth OS Assistant
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={refreshContext}
              disabled={isRefreshing}
              title="Refresh dashboard data"
              aria-label="Refresh dashboard data"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="rounded-full bg-[#F5F3EE] px-2 py-1 text-[11px] text-[#6B6B6B]">Ctrl K</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Close assistant"
              aria-label="Close assistant"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="h-6 w-6 text-[#C9AD98]" />
              <p className="mt-4 font-serif text-[24px] leading-none text-[#142334]">What do you need?</p>
              <div className="mt-5 flex max-w-[330px] flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitMessage(suggestion)}
                    className="rounded-full bg-[#F5F3EE] px-3 py-1.5 text-[12px] font-medium leading-snug text-[#142334] transition hover:bg-[#E4D8CB]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === 'system' ? (
                    <p className="mx-auto w-fit rounded-full bg-[#F5F3EE] px-3 py-1.5 text-center text-[11px] font-medium text-[#6B6B6B]">
                      {message.content}
                    </p>
                  ) : message.role === 'user' ? (
                    <div className="ml-auto max-w-[75%] rounded-[12px] bg-[#142334] px-3.5 py-2.5 text-[14px] leading-relaxed text-white">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex max-w-[90%] items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-[#142334]/76">
                        {renderAssistantText(message.content)}
                        {message.response?.type === 'recommendation' && message.response.items.length > 0 && (
                          <div className="mt-3 grid gap-2">
                            {message.response.items.map((item) => (
                              <div key={`${message.id}-${item.label}`} className="rounded-[8px] border border-[#E4D8CB] bg-[#FCFBFA] p-3">
                                <p className="text-[13px] font-semibold text-[#142334]">{item.label}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/62">{item.detail}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.response?.type === 'email_draft' && renderEmailDraftCard(message.id, message.response.draft)}
                        {message.response?.type === 'content_draft' && renderContentDraftCard(message.id, message.response.draft)}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex max-w-[90%] items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                  <div>
                    <div className="flex h-8 items-center gap-1.5">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="h-1.5 w-1.5 rounded-full bg-[#C9AD98] animate-pulse"
                          style={{ animationDelay: `${dot * 300}ms` }}
                        />
                      ))}
                    </div>
                    {slowRequest && (
                      <div className="mt-2 text-[12px] leading-relaxed text-[#6B6B6B]">
                        <p>This is taking longer than expected.</p>
                        <button
                          type="button"
                          onClick={cancelRequest}
                          className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B] underline-offset-4 hover:text-[#142334] hover:underline"
                        >
                          Cancel request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className="shrink-0 border-t border-[#E4D8CB] px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage();
                }
              }}
              rows={1}
              placeholder="Ask anything or request a draft..."
              className="max-h-[76px] min-h-10 flex-1 resize-none rounded-[8px] border border-transparent bg-[#F8F5F2] px-3 py-2.5 text-[14px] leading-relaxed text-[#142334] outline-none transition focus:border-[#C9AD98] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              title="Send message"
              aria-label="Send message"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                input.trim() && !isSending
                  ? 'bg-[#142334] text-white hover:bg-[#1e3347]'
                  : 'cursor-not-allowed bg-[#E4D8CB] text-[#142334]/40'
              }`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={clearConversation}
            className="mx-auto mt-2 block text-center text-[11px] leading-none text-[#6B6B6B] transition hover:text-[#142334]"
          >
            Clear conversation
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        title="Open Growth OS Assistant"
        aria-label="Open Growth OS Assistant"
        aria-controls="growth-os-assistant-panel"
        aria-expanded={isOpen}
        className={`fixed bottom-6 right-6 z-40 grid h-[52px] w-[52px] place-items-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition duration-200 hover:scale-105 ${
          isOpen ? 'bg-[#C9AD98] text-[#142334]' : 'bg-[#142334] text-white hover:bg-[#1e3347]'
        }`}
      >
        <WandSparkles className="h-5 w-5" />
      </button>
    </div>
  );
}
