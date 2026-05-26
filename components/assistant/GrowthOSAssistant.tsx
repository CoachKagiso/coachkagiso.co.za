'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Mic,
  Minimize2,
  Paperclip,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  getSuggestedQuestions,
  type AssistantDashboardContext,
} from '@/lib/growth-os-assistant';
import { buildEmailHistoryNote } from '@/lib/email-history-note';
import {
  DEFAULT_ASSISTANT_CONVERSATIONS,
  DEFAULT_ASSISTANT_PREFERENCES,
  normalizeAssistantConversationStore,
  normalizeAssistantPreferences,
  type AssistantConversationStore,
  type AssistantPreferences,
  type AssistantSavedConversation,
} from '@/lib/assistant-preferences';

type AssistantRecommendationItem = {
  label: string;
  detail: string;
  action?: string;
};

type AssistantResponseMeta = {
  finishReason?: string;
  mayBeTruncated?: boolean;
  accessContextUsed?: boolean;
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
  | { type: 'answer'; message: string; meta?: AssistantResponseMeta }
  | { type: 'recommendation'; message: string; items: AssistantRecommendationItem[]; meta?: AssistantResponseMeta }
  | { type: 'email_draft'; message: string; draft: EmailDraft; meta?: AssistantResponseMeta }
  | { type: 'content_draft'; message: string; draft: ContentDraft; meta?: AssistantResponseMeta };

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

type UploadedContextItem = {
  id: string;
  name: string;
  type: string;
  kind: 'text' | 'image';
  content?: string;
  previewUrl?: string;
  sizeLabel: string;
};

type AssistantSaveState = 'idle' | 'saving' | 'saved' | 'error';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const platformOptions = ['linkedin', 'tiktok', 'instagram', 'facebook', 'email'] as const;
const MAX_UPLOAD_TEXT_LENGTH = 12000;

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getConversationTitle(messages: AssistantMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim();
  if (!firstUserMessage) return `Conversation ${new Date().toLocaleDateString('en-ZA')}`;
  return firstUserMessage.length > 64 ? `${firstUserMessage.slice(0, 61)}...` : firstUserMessage;
}

function formatConversationTranscript(messages: AssistantMessage[]) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'user' ? 'Kagiso' : 'Assistant'}:\n${message.content}`)
    .join('\n\n---\n\n');
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isTextUpload(file: File) {
  return (
    file.type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|json)$/i.test(file.name)
  );
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
  const [isExpanded, setIsExpanded] = useState(false);
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
  const [assistantPreferences, setAssistantPreferences] = useState<AssistantPreferences>(DEFAULT_ASSISTANT_PREFERENCES);
  const [conversationStore, setConversationStore] = useState<AssistantConversationStore>(DEFAULT_ASSISTANT_CONVERSATIONS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [assistantMemoryLoaded, setAssistantMemoryLoaded] = useState(false);
  const [conversationSaveState, setConversationSaveState] = useState<AssistantSaveState>('idle');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedContext, setUploadedContext] = useState<UploadedContextItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimeoutRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const dashboardContext = refreshedContext || initialContext;
  const suggestions = useMemo(() => getSuggestedQuestions(dashboardContext), [dashboardContext]);
  const savedThreads = conversationStore.threads;

  useEffect(() => {
    if (!isOpen || assistantMemoryLoaded || !adminKey) return;

    let cancelled = false;

    async function loadAssistantMemory() {
      try {
        const params = new URLSearchParams({ key: adminKey });
        const response = await fetch(`/api/settings?${params.toString()}`);
        const data = (await response.json().catch(() => null)) as { settings?: Record<string, unknown> } | null;
        if (!response.ok || !data?.settings || cancelled) return;

        setAssistantPreferences(normalizeAssistantPreferences(data.settings.assistant_preferences));
        const store = normalizeAssistantConversationStore(data.settings.assistant_conversations);
        setConversationStore(store);
        setActiveThreadId(store.activeThreadId);
      } catch {
        if (!cancelled) {
          setAssistantPreferences(DEFAULT_ASSISTANT_PREFERENCES);
          setConversationStore(DEFAULT_ASSISTANT_CONVERSATIONS);
        }
      } finally {
        if (!cancelled) setAssistantMemoryLoaded(true);
      }
    }

    void loadAssistantMemory();

    return () => {
      cancelled = true;
    };
  }, [adminKey, assistantMemoryLoaded, isOpen]);

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
      recognitionRef.current?.abort();
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

  async function saveAssistantSetting(settingKey: string, value: unknown) {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey, settingKey, value }),
    });
    if (!response.ok) throw new Error('Settings save failed.');
  }

  async function copyText(value: string, marker: string) {
    if (!value.trim()) return;
    await navigator.clipboard.writeText(value);
    setCopiedId(marker);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  function exportConversation() {
    const transcript = formatConversationTranscript(messages);
    if (!transcript) return;
    downloadTextFile(`coach-kagiso-assistant-${new Date().toISOString().slice(0, 10)}.txt`, transcript);
  }

  async function saveConversation() {
    if (messages.filter((message) => message.role !== 'system').length === 0 || conversationSaveState === 'saving') return;

    setConversationSaveState('saving');
    const now = new Date().toISOString();
    const threadId = activeThreadId || createId();
    const savedMessages = messages.slice(-80).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content.slice(0, 8000),
      createdAt: now,
    }));
    const existingThread = conversationStore.threads.find((thread) => thread.id === threadId);
    const nextThread: AssistantSavedConversation = {
      id: threadId,
      title: existingThread?.title || getConversationTitle(messages),
      createdAt: existingThread?.createdAt || now,
      updatedAt: now,
      messages: savedMessages,
    };
    const nextStore = normalizeAssistantConversationStore({
      activeThreadId: threadId,
      threads: [nextThread, ...conversationStore.threads.filter((thread) => thread.id !== threadId)],
    });

    try {
      await saveAssistantSetting('assistant_conversations', nextStore);
      setConversationStore(nextStore);
      setActiveThreadId(threadId);
      setConversationSaveState('saved');
      window.setTimeout(() => setConversationSaveState('idle'), 1600);
    } catch {
      setConversationSaveState('error');
    }
  }

  function loadConversation(thread: AssistantSavedConversation) {
    setMessages(thread.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      response: message.role === 'assistant' ? { type: 'answer', message: message.content } : undefined,
    })));
    setActiveThreadId(thread.id);
    setExpandedCards({});
    setRemovedActionCards({});
    setEditingEmailCards({});
    setEmailEdits({});
  }

  async function deleteConversation(threadId: string) {
    const nextStore = normalizeAssistantConversationStore({
      activeThreadId: activeThreadId === threadId ? null : activeThreadId,
      threads: conversationStore.threads.filter((thread) => thread.id !== threadId),
    });
    setConversationStore(nextStore);
    if (activeThreadId === threadId) setActiveThreadId(null);
    await saveAssistantSetting('assistant_conversations', nextStore).catch(() => null);
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files?.length) return;
    const nextItems: UploadedContextItem[] = [];

    for (const file of Array.from(files).slice(0, 6)) {
      if (isTextUpload(file)) {
        const content = (await file.text()).slice(0, MAX_UPLOAD_TEXT_LENGTH);
        nextItems.push({
          id: createId(),
          name: file.name,
          type: file.type || 'text/plain',
          kind: 'text',
          content,
          sizeLabel: formatBytes(file.size),
        });
      } else if (file.type.startsWith('image/')) {
        nextItems.push({
          id: createId(),
          name: file.name,
          type: file.type,
          kind: 'image',
          previewUrl: URL.createObjectURL(file),
          sizeLabel: formatBytes(file.size),
        });
      } else {
        appendSystemMessage(`${file.name} was not attached. Use text, markdown, CSV, JSON, or image files.`);
      }
    }

    setUploadedContext((current) => [...current, ...nextItems].slice(-6));
  }

  function removeUpload(id: string) {
    setUploadedContext((current) => {
      const item = current.find((upload) => upload.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((upload) => upload.id !== id);
    });
  }

  function toggleDictation() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as SpeechRecognitionWindow).SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      appendAssistantAnswer('Voice dictation is not available in this browser yet.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-ZA';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) transcript += event.results[index][0]?.transcript || '';
      }
      if (transcript.trim()) {
        setInput((current) => `${current}${current.trim() ? ' ' : ''}${transcript.trim()}`);
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  }

  function openAssistantSettings() {
    const params = new URLSearchParams();
    if (adminKey) params.set('key', adminKey);
    params.set('tab', 'settings');
    router.push(`/resources/career-diagnostic/submissions?${params.toString()}`);
  }

  async function submitMessage(explicitMessage?: string) {
    const text = (explicitMessage ?? input).trim();
    if (!text || isSending) return;
    const uploadsForRequest = uploadedContext;

    const recentHistory = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-14)
      .map((message) => ({
        role: message.role,
        content: message.content,
        mayBeTruncated: message.response?.meta?.mayBeTruncated === true,
      }));
    const userMessage: AssistantMessage = {
      id: createId(),
      role: 'user',
      content: text,
    };
    const controller = new AbortController();

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setUploadedContext([]);
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
          assistantPreferences,
          uploadedContext: uploadsForRequest.map((upload) => ({
            name: upload.name,
            type: upload.type,
            kind: upload.kind,
            content: upload.content,
          })),
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
      uploadsForRequest.forEach((upload) => {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      });
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
    setActiveThreadId(null);
    setUploadedContext((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
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

  const transcript = formatConversationTranscript(messages);
  const panelClassName = isExpanded
    ? 'fixed inset-3 z-40 flex max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[16px] border border-[#E4D8CB] bg-white shadow-[0_18px_60px_rgba(20,35,52,0.22)] transition duration-200 md:inset-6 md:max-h-[calc(100vh-48px)]'
    : 'fixed bottom-[88px] right-4 z-40 flex h-[min(680px,calc(100vh-116px))] w-[min(560px,calc(100vw-32px))] origin-bottom-right flex-col overflow-hidden rounded-[16px] border border-[#E4D8CB] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition duration-200 md:right-6';
  const visiblePanelClassName = isOpen
    ? 'translate-y-0 scale-100 opacity-100'
    : 'pointer-events-none translate-y-4 scale-[0.98] opacity-0';
  const canUseConversationActions = messages.some((message) => message.role !== 'system');

  return (
    <div className="growth-os-assistant">
      <section
        id="growth-os-assistant-panel"
        aria-label="Growth OS Assistant"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`${panelClassName} ${visiblePanelClassName}`}
      >
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E4D8CB] px-3 py-2 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-[#C9AD98]" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142334]">
                {assistantPreferences.assistantName || 'Growth OS Assistant'}
              </p>
              {activeThreadId && (
                <p className="mt-0.5 hidden truncate text-[11px] text-[#6B6B6B] sm:block">
                  Saved thread active
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto">
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
            <button
              type="button"
              onClick={() => void copyText(transcript, 'conversation')}
              disabled={!canUseConversationActions}
              title="Copy conversation"
              aria-label="Copy conversation"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copiedId === 'conversation' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={exportConversation}
              disabled={!canUseConversationActions}
              title="Export conversation"
              aria-label="Export conversation"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void saveConversation()}
              disabled={!canUseConversationActions || conversationSaveState === 'saving'}
              title="Save conversation"
              aria-label="Save conversation"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {conversationSaveState === 'saved' ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={openAssistantSettings}
              title="Assistant settings"
              aria-label="Assistant settings"
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              title={isExpanded ? 'Compact assistant' : 'Expand assistant'}
              aria-label={isExpanded ? 'Compact assistant' : 'Expand assistant'}
              className="grid h-8 w-8 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
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

        <div className={`min-h-0 flex-1 ${isExpanded ? 'grid md:grid-cols-[250px_minmax(0,1fr)]' : 'flex flex-col'}`}>
          {isExpanded && (
            <aside className="hidden min-h-0 border-r border-[#E4D8CB] bg-[#FCFBFA] p-3 md:block">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8C7466]">Saved chats</p>
                <button
                  type="button"
                  onClick={clearConversation}
                  className="grid h-7 w-7 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
                  title="New conversation"
                  aria-label="New conversation"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid max-h-[calc(100vh-190px)] gap-2 overflow-y-auto pr-1">
                {savedThreads.length === 0 ? (
                  <p className="rounded-[8px] bg-white px-3 py-3 text-[12px] leading-relaxed text-[#6B6B6B]">
                    No saved chats yet.
                  </p>
                ) : (
                  savedThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className={`rounded-[8px] border p-2 ${
                        activeThreadId === thread.id ? 'border-[#C9AD98] bg-[#F5F3EE]' : 'border-[#E4D8CB] bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => loadConversation(thread)}
                        className="block w-full text-left"
                      >
                        <span className="block truncate text-[12px] font-semibold text-[#142334]">{thread.title}</span>
                        <span className="mt-1 block text-[11px] text-[#6B6B6B]">
                          {new Date(thread.updatedAt).toLocaleDateString('en-ZA')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteConversation(thread.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C7466] transition hover:text-[#142334]"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}

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
                    <div className="group ml-auto flex max-w-[82%] items-start gap-2">
                      <button
                        type="button"
                        onClick={() => void copyText(message.content, message.id)}
                        className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#6B6B6B] opacity-0 transition hover:bg-[#F5F3EE] hover:text-[#142334] group-hover:opacity-100"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        {copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <div className="rounded-[12px] bg-[#142334] px-3.5 py-2.5 text-[14px] leading-relaxed text-white">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className="group flex max-w-[92%] items-start gap-2">
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
                        <button
                          type="button"
                          onClick={() => void copyText(message.content, message.id)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8C7466] opacity-0 transition hover:text-[#142334] group-hover:opacity-100"
                        >
                          {copiedId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy
                        </button>
                        {message.response?.meta?.mayBeTruncated && (
                          <p className="mt-3 rounded-[8px] border border-[#D8C8BB] bg-[#FCFBFA] px-3 py-2 text-[12px] leading-relaxed text-[#6B6B6B]">
                            This response hit the length limit. Type &quot;continue&quot; and I will keep going from here.
                          </p>
                        )}
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
        </div>

        <form
          className="shrink-0 border-t border-[#E4D8CB] px-3 py-3 md:px-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          {uploadedContext.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedContext.map((upload) => (
                <span
                  key={upload.id}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E4D8CB] bg-[#FCFBFA] px-3 py-1.5 text-[12px] text-[#142334]"
                >
                  {upload.kind === 'image' ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#8C7466]" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-[#8C7466]" />}
                  <span className="truncate">{upload.name}</span>
                  <span className="shrink-0 text-[#6B6B6B]">{upload.sizeLabel}</span>
                  <button
                    type="button"
                    onClick={() => removeUpload(upload.id)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[#6B6B6B] transition hover:bg-[#F5F3EE] hover:text-[#142334]"
                    aria-label={`Remove ${upload.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.csv,.json,text/*,image/*"
              className="sr-only"
              onChange={(event) => {
                void handleFileUpload(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              aria-label="Attach file"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#F8F5F2] text-[#6B6B6B] transition hover:bg-[#E4D8CB] hover:text-[#142334]"
            >
              <Paperclip className="h-4 w-4" />
            </button>
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
              className="max-h-[120px] min-h-10 flex-1 resize-none rounded-[8px] border border-transparent bg-[#F8F5F2] px-3 py-2.5 text-[14px] leading-relaxed text-[#142334] outline-none transition focus:border-[#C9AD98] focus:bg-white"
            />
            <button
              type="button"
              onClick={toggleDictation}
              title={isRecording ? 'Stop dictation' : 'Start dictation'}
              aria-label={isRecording ? 'Stop dictation' : 'Start dictation'}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] transition ${
                isRecording ? 'bg-[#C9AD98] text-[#142334]' : 'bg-[#F8F5F2] text-[#6B6B6B] hover:bg-[#E4D8CB] hover:text-[#142334]'
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              title="Send message"
              aria-label="Send message"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
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
          {conversationSaveState === 'error' && (
            <p className="mt-2 text-center text-[12px] font-semibold text-[#A24E37]">Could not save this chat.</p>
          )}
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
