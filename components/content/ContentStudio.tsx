'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Link2,
  Lightbulb,
  Loader2,
  Mic2,
  PenLine,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import type {
  ContentBacklogItem,
  ContentBacklogSource,
  ContentBacklogStatus,
  ContentCalendarItem,
  ContentCalendarStatus,
  ContentPillar,
  ContentPlatform,
  DashboardContext,
} from '@/lib/content-studio';

type ContentStudioProps = {
  adminKey: string;
  context: DashboardContext;
  calendarItems: ContentCalendarItem[];
  backlogItems: ContentBacklogItem[];
};

type StudioTab = 'briefs' | 'create' | 'calendar' | 'backlog';
type CreateMode = 'write_post' | 'polish' | 'alchemy' | 'format_recommendation' | 'from_brief' | 'voice_note';
type AiMode =
  | 'signal_brief'
  | 'write_post'
  | 'polish'
  | 'alchemy_stage1'
  | 'alchemy_stage2'
  | 'format_recommendation'
  | 'voice_note'
  | 'calendar_plan';
type VoiceNoteChannel = 'email_list' | 'instagram_story_reply' | 'general';
type AlchemySourceType = 'text' | 'transcript' | 'screenshot' | 'url';

type BriefRecord = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
};

type CalendarModalState = {
  mode: 'create' | 'edit';
  item?: ContentCalendarItem;
  defaults?: Partial<ContentCalendarItem>;
};

type BacklogModalState = {
  mode: 'create' | 'edit';
  item?: ContentBacklogItem;
  defaults?: Partial<ContentBacklogItem>;
};

const pillarMeta: Record<ContentPillar, { label: string; className: string }> = {
  career_growth: {
    label: 'Career Growth',
    className: 'bg-[#BFDBFE] text-[#1E40AF]',
  },
  leadership: {
    label: 'Leadership',
    className: 'bg-[#E9D5FF] text-[#6B21A8]',
  },
  personal_brand: {
    label: 'Personal Brand',
    className: 'bg-[#FEF3C7] text-[#92400E]',
  },
  mentorship: {
    label: 'Mentorship',
    className: 'bg-[#CCFBF1] text-[#0F766E]',
  },
};

const platformLabels: Record<ContentPlatform, string> = {
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  email: 'Email',
};

const calendarStatusMeta: Record<ContentCalendarStatus, { label: string; className: string }> = {
  idea: { label: 'Idea', className: 'bg-[#F5F3EE] text-[#6B6B6B]' },
  draft: { label: 'Draft', className: 'bg-[#FEF3C7] text-[#92400E]' },
  scheduled: { label: 'Scheduled', className: 'bg-[#BFDBFE] text-[#1E40AF]' },
  published: { label: 'Published', className: 'bg-[#D1FAE5] text-[#065F46]' },
};

const backlogStatusMeta: Record<ContentBacklogStatus, { label: string; className: string }> = {
  idea: { label: 'Idea', className: 'bg-[#F5F3EE] text-[#6B6B6B]' },
  draft: { label: 'Draft', className: 'bg-[#FEF3C7] text-[#92400E]' },
  in_progress: { label: 'In progress', className: 'bg-[#BFDBFE] text-[#1E40AF]' },
  used: { label: 'Used', className: 'bg-[#D1FAE5] text-[#065F46]' },
};

const sourceLabels: Record<ContentBacklogSource, string> = {
  signal_brief: 'From Signal Brief',
  create: 'From Create',
  manual: 'Manual',
};

const voiceNoteChannelLabels: Record<VoiceNoteChannel, string> = {
  email_list: 'Email list',
  instagram_story_reply: 'Instagram Story reply',
  general: 'General',
};

const alchemySourceTypes: {
  value: AlchemySourceType;
  label: string;
  description: string;
  inputLabel: string;
  placeholder: string;
}[] = [
  {
    value: 'text',
    label: 'Text / Caption',
    description: 'Tweet, post, brain dump, anything written',
    inputLabel: 'Paste the text',
    placeholder: 'Paste a post, caption, thread, or messy thought. The system will extract structure, not copy wording.',
  },
  {
    value: 'transcript',
    label: 'Transcript',
    description: 'Podcast clip, video, voice note',
    inputLabel: 'Paste the transcript',
    placeholder: 'Paste a transcript or rough speaking notes. Keep only the raw material you want to learn from.',
  },
  {
    value: 'screenshot',
    label: 'Screenshot',
    description: 'Image of a post, slide, or stat',
    inputLabel: 'Describe or paste text from the screenshot',
    placeholder: 'Paste any visible text from the screenshot, then add what stood out: hook, structure, comments, or visual angle.',
  },
  {
    value: 'url',
    label: 'URL',
    description: 'Link to a post or article',
    inputLabel: 'Paste the URL and context',
    placeholder: 'Paste the URL, then add the key excerpt or explain what you want to transform. Link reading can be wired later.',
  },
];

const tabs: { value: StudioTab; label: string }[] = [
  { value: 'briefs', label: 'Signal Briefs' },
  { value: 'create', label: 'Create' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'backlog', label: 'Idea Backlog' },
];

const createModes: { value: CreateMode; label: string }[] = [
  { value: 'write_post', label: 'Write Post' },
  { value: 'polish', label: 'Polish' },
  { value: 'alchemy', label: 'Alchemy' },
  { value: 'format_recommendation', label: 'Format Check' },
  { value: 'from_brief', label: 'From Brief' },
  { value: 'voice_note', label: 'Voice Note' },
];

const archetypeOptions = ['Lost Pivoter', 'Engaged Strategist', 'Plateaued Performer', 'Quiet Pivoter', 'Burnt-Out Builder'];

function formatMoney(value: number) {
  return `R${Math.round(value).toLocaleString('en-ZA')}`;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`));
}

function getWordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function getEstimatedReadSeconds(value: string) {
  const words = getWordCount(value);
  if (!words) return 0;
  return Math.max(30, Math.round((words / 155) * 60));
}

function getAlchemySourceIcon(sourceType: AlchemySourceType, className = 'h-4 w-4') {
  if (sourceType === 'transcript') return <Mic2 className={className} />;
  if (sourceType === 'screenshot') return <ImageIcon className={className} />;
  if (sourceType === 'url') return <Link2 className={className} />;
  return <FileText className={className} />;
}

function titleFromText(text: string, fallback: string) {
  const line = text
    .split('\n')
    .map((item) => item.replace(/^[-*#\s:]+/, '').trim())
    .find(Boolean);
  return (line || fallback).slice(0, 96);
}

function buildPlanDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return getDateKey(date);
  });
  const rows: string[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }
  return rows;
}

function localBrief(context: DashboardContext) {
  return `STRONGEST SIGNAL: ${context.strongestTheme} is the clearest content signal right now.

CONTENT ANGLE: Comfortable is not always safe - especially when your career has stopped stretching you.

VOICE MODE: Mode 1 - Tactical Teacher

AUDIENCE PAIN: They know something needs to shift, but they are scared to name the next move.

POST FORMAT: LinkedIn text post - the claim is strong enough to stand on its own.

CTA: Ask readers to reply with their current role and where they want to be in 12 months.

OFFER TO MENTION: ${context.topService}`;
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

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>
      {children}
    </span>
  );
}

export default function ContentStudio({ adminKey, context, calendarItems, backlogItems }: ContentStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('briefs');
  const [createMode, setCreateMode] = useState<CreateMode>('write_post');
  const [brief, setBrief] = useState(localBrief(context));
  const [briefHistory, setBriefHistory] = useState<BriefRecord[]>([]);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [archetypeTarget, setArchetypeTarget] = useState(archetypeOptions[0]);
  const [calendarRecords, setCalendarRecords] = useState(calendarItems);
  const [backlogRecords, setBacklogRecords] = useState(backlogItems);
  const [calendarModal, setCalendarModal] = useState<CalendarModalState | null>(null);
  const [backlogModal, setBacklogModal] = useState<BacklogModalState | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [topic, setTopic] = useState(context.strongestTheme);
  const [voiceMode, setVoiceMode] = useState('MODE 1 - TACTICAL TEACHER');
  const [platform, setPlatform] = useState<ContentPlatform>('linkedin');
  const [useSignal, setUseSignal] = useState(true);
  const [generatedPost, setGeneratedPost] = useState('');
  const [polishInput, setPolishInput] = useState('');
  const [polishOriginal, setPolishOriginal] = useState('');
  const [polishOutput, setPolishOutput] = useState('');
  const [alchemySourceType, setAlchemySourceType] = useState<AlchemySourceType>('text');
  const [alchemySource, setAlchemySource] = useState('');
  const [alchemyFramework, setAlchemyFramework] = useState('');
  const [alchemyOutput, setAlchemyOutput] = useState('');
  const [formatIdea, setFormatIdea] = useState('');
  const [formatOutput, setFormatOutput] = useState('');
  const [fromBriefText, setFromBriefText] = useState(brief);
  const [fromBriefOutput, setFromBriefOutput] = useState('');
  const [voiceNoteTopic, setVoiceNoteTopic] = useState(context.strongestTheme);
  const [voiceNoteUseSignal, setVoiceNoteUseSignal] = useState(true);
  const [voiceNoteChannel, setVoiceNoteChannel] = useState<VoiceNoteChannel>('email_list');
  const [voiceNoteOutput, setVoiceNoteOutput] = useState('');
  const [calendarPlan, setCalendarPlan] = useState('');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogPillarFilter, setBacklogPillarFilter] = useState<'all' | ContentPillar>('all');
  const [backlogStatusFilter, setBacklogStatusFilter] = useState<'all' | ContentBacklogStatus>('all');
  const autoGeneratedRef = useRef(false);

  const callAi = useCallback(
    async (mode: AiMode, userPrompt: string) => {
      const data = await requestJson<{ result: string }>('/api/content/ai', 'POST', {
        key: adminKey,
        mode,
        userPrompt,
        context,
      });
      return data.result.trim();
    },
    [adminKey, context],
  );

  const generateSignalBrief = useCallback(
    async (target?: string) => {
      setBriefBusy(true);
      setBriefError(null);
      try {
        const prompt = target
          ? `Create a signal brief for the ${target} archetype using the dashboard context.`
          : 'Create the strongest signal brief from the current dashboard context.';
        const result = await callAi('signal_brief', prompt);
        if (result) {
          setBrief(result);
          setBriefHistory((current) => [
            {
              id: `brief-${Date.now()}`,
              title: titleFromText(result, target || context.strongestTheme),
              text: result,
              createdAt: new Date().toISOString(),
            },
            ...current,
          ].slice(0, 5));
        }
      } catch (error) {
        setBriefError(error instanceof Error ? error.message : 'Could not generate the brief.');
      } finally {
        setBriefBusy(false);
      }
    },
    [callAi, context.strongestTheme],
  );

  useEffect(() => {
    if (autoGeneratedRef.current) return;
    autoGeneratedRef.current = true;
    void generateSignalBrief();
  }, [generateSignalBrief]);

  const itemsByDate = useMemo(() => {
    return calendarRecords.reduce<Record<string, ContentCalendarItem[]>>((acc, item) => {
      acc[item.publishDate] = [...(acc[item.publishDate] || []), item];
      return acc;
    }, {});
  }, [calendarRecords]);

  const filteredBacklog = useMemo(() => {
    const query = backlogSearch.trim().toLowerCase();
    return backlogRecords.filter((item) => {
      if (backlogPillarFilter !== 'all' && item.pillar !== backlogPillarFilter) return false;
      if (backlogStatusFilter !== 'all' && item.status !== backlogStatusFilter) return false;
      if (!query) return true;
      return [item.title, item.content, item.notes, item.platform, item.pillar]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [backlogPillarFilter, backlogRecords, backlogSearch, backlogStatusFilter]);

  const selectedAlchemySource = alchemySourceTypes.find((item) => item.value === alchemySourceType) || alchemySourceTypes[0];

  async function saveBriefToBacklog(text = brief) {
    const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: titleFromText(text, context.strongestTheme),
      pillar: 'career_growth',
      platform: 'linkedin',
      source: 'signal_brief',
      status: 'idea',
      content: text,
    });
    setBacklogRecords((current) => [data.item, ...current]);
    setActiveTab('backlog');
  }

  async function saveOutputToBacklog(content: string, titleFallback: string, platformOverride: ContentPlatform = platform) {
    if (!content.trim()) return;
    const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: titleFromText(content, titleFallback),
      pillar: 'career_growth',
      platform: platformOverride,
      source: 'create',
      status: 'draft',
      content,
    });
    setBacklogRecords((current) => [data.item, ...current]);
    setActiveTab('backlog');
  }

  function startFromBrief(text: string) {
    setFromBriefText(text);
    setCreateMode('from_brief');
    setActiveTab('create');
    void generateFromBrief(text);
  }

  async function generateFromBrief(text = fromBriefText) {
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi('write_post', `Use this approved content brief to write the post:\n\n${text}`);
      setFromBriefOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not write from the brief.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function generatePost() {
    const finalTopic = useSignal ? `${topic}\n\nUse this week's top signal: ${context.strongestTheme}` : topic;
    if (!finalTopic.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi(
        'write_post',
        `Topic or idea: ${finalTopic}\nVoice mode: ${voiceMode}\nPlatform: ${platformLabels[platform]}`,
      );
      setGeneratedPost(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not generate the post.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function polishDraft() {
    if (!polishInput.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    setPolishOriginal(polishInput);
    try {
      const result = await callAi('polish', polishInput);
      setPolishOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not polish the draft.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function extractAlchemyStructure() {
    if (!alchemySource.trim()) return;
    const sourceMeta = alchemySourceTypes.find((item) => item.value === alchemySourceType);
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi(
        'alchemy_stage1',
        `Source type: ${sourceMeta?.label || 'Text / Caption'}\n\nRaw material:\n${alchemySource}`,
      );
      setAlchemyFramework(result);
      setAlchemySource('');
      setAlchemyOutput('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not extract the structure.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function buildAlchemyVersion() {
    if (!alchemyFramework.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi(
        'alchemy_stage2',
        `Source type used for structure: ${alchemySourceTypes.find((item) => item.value === alchemySourceType)?.label || 'Text / Caption'}\n\nExtracted structure only:\n${alchemyFramework}`,
      );
      setAlchemyOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not build Kagiso's version.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function checkFormat() {
    if (!formatIdea.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi('format_recommendation', formatIdea);
      setFormatOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not recommend a format.');
    } finally {
      setCreateBusy(false);
    }
  }

  function getVoiceNotePlatform(): ContentPlatform {
    if (voiceNoteChannel === 'instagram_story_reply') return 'instagram';
    if (voiceNoteChannel === 'email_list') return 'email';
    return platform;
  }

  async function generateVoiceNote() {
    const finalTopic = voiceNoteUseSignal
      ? `${voiceNoteTopic}\n\nUse this week's top signal: ${context.strongestTheme}`
      : voiceNoteTopic;
    if (!finalTopic.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi(
        'voice_note',
        `Topic or feeling: ${finalTopic}\nChannel: ${voiceNoteChannelLabels[voiceNoteChannel]}\nKeep it raw, intimate, and useful. It should sound like Kagiso is speaking to one person.`,
      );
      setVoiceNoteOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not generate the voice note.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function suggestCalendarPlan() {
    setCreateError(null);
    setCreateBusy(true);
    try {
      const result = await callAi(
        'calendar_plan',
        `Create a 30-day plan from these signals. Existing planned posts: ${calendarRecords
          .map((item) => `${item.publishDate}: ${item.title}`)
          .join('; ') || 'none'}.`,
      );
      setCalendarPlan(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not suggest a 30-day plan.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function deleteBacklogItem(item: ContentBacklogItem) {
    if (!window.confirm('Delete this content idea?')) return;
    const previous = backlogRecords;
    setBacklogRecords((current) => current.filter((record) => record.id !== item.id));
    try {
      await requestJson<{ ok: true }>(`/api/content/backlog/${item.id}`, 'DELETE', { key: adminKey });
    } catch (error) {
      setBacklogRecords(previous);
      setCreateError(error instanceof Error ? error.message : 'Could not delete the idea.');
    }
  }

  async function deleteCalendarItem(item: ContentCalendarItem) {
    if (!window.confirm('Delete this planned post?')) return;
    const previous = calendarRecords;
    setCalendarRecords((current) => current.filter((record) => record.id !== item.id));
    try {
      await requestJson<{ ok: true }>(`/api/content/calendar/${item.id}`, 'DELETE', { key: adminKey });
    } catch (error) {
      setCalendarRecords(previous);
      setCreateError(error instanceof Error ? error.message : 'Could not delete the planned post.');
    }
  }

  return (
    <section id="content-studio" className="pb-10">
      <div className="space-y-5">
        <header className="rounded-[8px] bg-white p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B6B]">Content / Studio</p>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="font-serif text-[36px] leading-none text-[#142334] md:text-[44px]">Content Studio</h1>
              <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/62">
                Signals - Briefs - Posts - Calendar. AI drafts the work; Kagiso approves what moves.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBacklogModal({ mode: 'create' })}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
            >
              <Plus className="h-4 w-4" /> Add idea
            </button>
          </div>
        </header>

        <div className="rounded-[8px] bg-[#142334] p-4 text-white">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('briefs');
                void generateSignalBrief();
              }}
              className="rounded-[8px] bg-white/8 p-4 text-left transition hover:bg-white/14"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">Strongest Signal</p>
              <p className="mt-2 font-serif text-[20px] leading-tight">{context.strongestTheme}</p>
            </button>
            <SignalTile label="Top Archetype" value={context.topArchetype} />
            <SignalTile label="Top Service" value={`${context.topServiceCount} x ${context.topService}`} />
            <SignalTile
              label="Hot Leads"
              value={`${context.hotLeadsCount} leads${context.topServiceProjectedRevenue ? ` -> ${formatMoney(context.topServiceProjectedRevenue)}` : ''}`}
            />
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded-[8px] bg-white p-2" aria-label="Content workspace tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 rounded-[8px] px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition ${
                activeTab === tab.value
                  ? 'bg-[#142334] text-white'
                  : 'text-[#142334]/62 hover:bg-[#F5F3EE] hover:text-[#142334]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {createError && <Notice tone="error">{createError}</Notice>}

        {activeTab === 'briefs' && (
          <div className="space-y-5">
            {briefError && <Notice tone="error">{briefError}</Notice>}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="rounded-[8px] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Signal Brief</p>
                    <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Make the audience pressure useful</h2>
                  </div>
                  <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{context.leadsThisWeek} leads this week</Badge>
                </div>
                <OutputPanel value={brief} className="mt-5 min-h-[360px]" />
              </section>

              <aside className="rounded-[8px] bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Brief controls</p>
                <div className="mt-5 grid gap-3">
                  <button type="button" onClick={() => generateSignalBrief()} disabled={briefBusy} className="studio-primary-button">
                    {briefBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Generate new brief
                  </button>
                  <label className="grid gap-2">
                    <span className="studio-label">Generate for archetype</span>
                    <select value={archetypeTarget} onChange={(event) => setArchetypeTarget(event.target.value)} className="studio-input h-11">
                      {archetypeOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => generateSignalBrief(archetypeTarget)} disabled={briefBusy} className="studio-secondary-button">
                    Generate for {archetypeTarget}
                  </button>
                  <button type="button" onClick={() => startFromBrief(brief)} className="studio-ghost-button">
                    Write this post <ChevronRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => saveBriefToBacklog()} className="studio-ghost-button">
                    Save to backlog <Save className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-7 border-t border-[#E4D8CB] pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Brief history</p>
                  <div className="mt-3 grid gap-3">
                    {briefHistory.length === 0 ? (
                      <p className="rounded-[8px] bg-[#F5F3EE] p-4 text-[13px] leading-relaxed text-[#142334]/62">
                        Generated briefs will collect here during this session.
                      </p>
                    ) : (
                      briefHistory.map((item) => (
                        <details key={item.id} className="rounded-[8px] bg-[#F5F3EE] p-3">
                          <summary className="cursor-pointer text-[13px] font-semibold text-[#142334]">{item.title}</summary>
                          <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-[#142334]/68">{item.text}</p>
                          <button type="button" onClick={() => setBrief(item.text)} className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334]">
                            Use this
                          </button>
                        </details>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <section className="rounded-[8px] bg-white p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Create</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Draft with data, keep approval human</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto rounded-full bg-[#F5F3EE] p-1">
                {createModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setCreateMode(mode.value)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                      createMode === mode.value ? 'bg-white text-[#142334]' : 'text-[#142334]/62 hover:text-[#142334]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {createMode === 'write_post' && (
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="grid gap-4 rounded-[8px] bg-[#F5F3EE] p-5">
                  <TextareaField label="What do you want to write about?" value={topic} onChange={setTopic} rows={7} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="studio-label">Voice mode</span>
                      <select value={voiceMode} onChange={(event) => setVoiceMode(event.target.value)} className="studio-input h-11">
                        <option>MODE 1 - TACTICAL TEACHER</option>
                        <option>MODE 2 - REFLECTIVE LEADER</option>
                        <option>MODE 3 - REFLECTION FRIDAY</option>
                      </select>
                    </label>
                    <PlatformSelect value={platform} onChange={setPlatform} />
                  </div>
                  <label className="flex items-center gap-3 text-[13px] text-[#142334]/70">
                    <input type="checkbox" checked={useSignal} onChange={(event) => setUseSignal(event.target.checked)} />
                    Use this week&apos;s top signal
                  </label>
                  <button type="button" onClick={generatePost} disabled={createBusy} className="studio-primary-button">
                    {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                    Generate post
                  </button>
                </div>
                <OutputWithActions
                  title="Post preview"
                  value={generatedPost}
                  wordCount={getWordCount(generatedPost)}
                  onRegenerate={generatePost}
                  onPolish={() => {
                    setPolishInput(generatedPost);
                    setCreateMode('polish');
                  }}
                  onSave={() => saveOutputToBacklog(generatedPost, topic)}
                  onCalendar={() => setCalendarModal({ mode: 'create', defaults: { title: titleFromText(generatedPost, topic), draftContent: generatedPost } })}
                />
              </div>
            )}

            {createMode === 'polish' && (
              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <div className="grid gap-4 rounded-[8px] bg-[#F5F3EE] p-5">
                  <TextareaField label="Paste Kagiso's draft here" value={polishInput} onChange={setPolishInput} rows={12} />
                  <p className="text-[12px] leading-relaxed text-[#142334]/62">
                    The AI improves the draft without changing her voice and flags every meaningful change.
                  </p>
                  <button type="button" onClick={polishDraft} disabled={createBusy} className="studio-primary-button">
                    {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                    Polish draft
                  </button>
                </div>
                <OutputWithActions
                  title="Polished draft"
                  value={polishOutput}
                  wordCount={getWordCount(polishOutput)}
                  onRegenerate={polishDraft}
                  onPolish={() => setPolishInput(polishOutput)}
                  onSave={() => saveOutputToBacklog(polishOutput, 'Polished draft')}
                  onCalendar={() => setCalendarModal({ mode: 'create', defaults: { title: titleFromText(polishOutput, 'Polished draft'), draftContent: polishOutput } })}
                  extraAction={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPolishInput(polishOutput)} className="studio-secondary-button">
                        Accept all changes
                      </button>
                      <button type="button" onClick={() => setPolishInput(polishOriginal)} className="studio-ghost-button">
                        Reject changes
                      </button>
                    </div>
                  }
                />
              </div>
            )}

            {createMode === 'alchemy' && (
              <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
                <div className="grid gap-4">
                  <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#C9AD98]">
                        <WandSparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-bold text-[#142334]">This is not a rewrite.</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/68">
                          Bring a post, transcript, screenshot text, or URL context. Alchemy diagnoses the structure, strips borrowed wording, and rebuilds it through Kagiso&apos;s coaching lens.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-[#F5F3EE] p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#142334] font-serif text-[18px] text-white">01</span>
                      <div>
                        <p className="font-serif text-[24px] leading-tight text-[#142334]">What are you bringing?</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/60">Choose the raw material so the AI knows what kind of structure to extract.</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {alchemySourceTypes.map((source) => {
                        const isSelected = alchemySourceType === source.value;
                        return (
                          <button
                            key={source.value}
                            type="button"
                            onClick={() => setAlchemySourceType(source.value)}
                            className={`rounded-[8px] border p-4 text-left transition ${
                              isSelected ? 'border-[#142334] bg-white text-[#142334]' : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334]/72 hover:border-[#C9AD98] hover:bg-white'
                            }`}
                          >
                            <span className={`grid h-9 w-9 place-items-center rounded-full ${isSelected ? 'bg-[#142334] text-white' : 'bg-white text-[#C9AD98]'}`}>
                              {getAlchemySourceIcon(source.value)}
                            </span>
                            <span className="mt-3 block text-[13px] font-bold">{source.label}</span>
                            <span className="mt-1 block text-[12px] leading-relaxed">{source.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-[#F5F3EE] p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#142334] font-serif text-[18px] text-white">02</span>
                      <p className="font-serif text-[24px] leading-tight text-[#142334]">{selectedAlchemySource.inputLabel}</p>
                    </div>
                    <div className="mt-4">
                      <TextareaField
                        label={selectedAlchemySource.inputLabel}
                        value={alchemySource}
                        onChange={setAlchemySource}
                        rows={alchemySourceType === 'url' ? 5 : 9}
                        placeholder={selectedAlchemySource.placeholder}
                      />
                    </div>
                    <button type="button" onClick={extractAlchemyStructure} disabled={createBusy || !alchemySource.trim()} className="studio-secondary-button mt-4 w-full">
                      {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                      Run the Alchemy
                    </button>
                  </div>

                  <div className="rounded-[8px] bg-[#142334] p-5 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">How it works</p>
                    <div className="mt-4 grid gap-3 text-[13px] leading-relaxed text-white/78">
                      {[
                        ['Diagnose', 'Reads the emotional tension, hidden pattern, and content pillar.'],
                        ['Strip', 'Removes borrowed wording, filler, and generic advice.'],
                        ['Reframe', "Injects Kagiso's professional lens, voice, and audience context."],
                        ['Route', 'Selects the strongest platform and format for the material.'],
                      ].map(([label, text], index) => (
                        <div key={label} className="flex gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-[#C9AD98]">{index + 1}</span>
                          <p>
                            <span className="font-bold text-white">{label}</span> - {text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Transformation</p>
                      <h3 className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">Your Alchemy appears here</h3>
                    </div>
                    <Badge className="bg-white text-[#6B6B6B]">Approval required</Badge>
                  </div>

                  {!alchemyFramework && !alchemyOutput && (
                    <div className="mt-6 grid min-h-[360px] place-items-center rounded-[8px] border border-dashed border-[#D8C8BA] bg-white p-8 text-center">
                      <div className="max-w-sm">
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F5F3EE] text-[#C9AD98]">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <p className="mt-5 font-serif text-[26px] leading-tight text-[#142334]">Structure first. Original voice second.</p>
                        <p className="mt-3 text-[13px] leading-relaxed text-[#142334]/62">
                          The first pass extracts the pattern only. The second pass rebuilds the idea for Kagiso without carrying the source wording forward.
                        </p>
                        <div className="mt-6 border-t border-[#E4D8CB] pt-5">
                          <p className="italic text-[#142334]/62">
                            If we are not transforming ideas through Kagiso&apos;s lens, we are just echoing the internet.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {alchemyFramework && (
                    <div className="mt-6 rounded-[8px] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Stage 1</p>
                          <h4 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">Structure extracted</h4>
                        </div>
                        <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{selectedAlchemySource.label}</Badge>
                      </div>
                      <OutputPanel value={alchemyFramework} className="mt-4 min-h-[220px] bg-[#F8F6F4]" />
                      <button type="button" onClick={buildAlchemyVersion} disabled={createBusy} className="studio-primary-button mt-4 w-full">
                        {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Build Kagiso&apos;s version
                      </button>
                    </div>
                  )}

                  {alchemyOutput && (
                    <div className="mt-5 rounded-[8px] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Stage 2</p>
                          <h4 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">Kagiso&apos;s version</h4>
                          <p className="mt-1 text-[12px] text-[#142334]/55">{getWordCount(alchemyOutput)} words</p>
                        </div>
                        <Badge className="bg-[#142334] text-white">Original rebuild</Badge>
                      </div>
                      <OutputPanel value={alchemyOutput} className="mt-4 min-h-[300px] bg-[#F8F6F4]" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={buildAlchemyVersion} className="studio-ghost-button">
                          Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPolishInput(alchemyOutput);
                            setCreateMode('polish');
                          }}
                          className="studio-ghost-button"
                        >
                          Polish this
                        </button>
                        <button type="button" onClick={() => saveOutputToBacklog(alchemyOutput, 'Alchemy rebuild')} className="studio-secondary-button">
                          Save to backlog
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalendarModal({ mode: 'create', defaults: { title: titleFromText(alchemyOutput, 'Alchemy rebuild'), draftContent: alchemyOutput } })}
                          className="studio-primary-button"
                        >
                          Add to calendar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {createMode === 'format_recommendation' && (
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="grid gap-4 rounded-[8px] bg-[#F5F3EE] p-5">
                  <TextareaField label="Paste or describe a content idea" value={formatIdea} onChange={setFormatIdea} rows={10} />
                  <button type="button" onClick={checkFormat} disabled={createBusy} className="studio-primary-button">
                    Check format <ClipboardCheck className="h-4 w-4" />
                  </button>
                </div>
                <OutputPanel value={formatOutput} className="min-h-[360px]" />
              </div>
            )}

            {createMode === 'from_brief' && (
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="grid gap-4 rounded-[8px] bg-[#F5F3EE] p-5">
                  <TextareaField label="Editable brief" value={fromBriefText} onChange={setFromBriefText} rows={14} />
                  <button type="button" onClick={() => generateFromBrief()} disabled={createBusy} className="studio-primary-button">
                    Generate from brief <PenLine className="h-4 w-4" />
                  </button>
                </div>
                <OutputWithActions
                  title="Post from brief"
                  value={fromBriefOutput}
                  wordCount={getWordCount(fromBriefOutput)}
                  onRegenerate={() => generateFromBrief()}
                  onPolish={() => {
                    setPolishInput(fromBriefOutput);
                    setCreateMode('polish');
                  }}
                  onSave={() => saveOutputToBacklog(fromBriefOutput, titleFromText(fromBriefText, 'From brief'))}
                  onCalendar={() => setCalendarModal({ mode: 'create', defaults: { title: titleFromText(fromBriefOutput, 'From brief'), draftContent: fromBriefOutput } })}
                />
              </div>
            )}

            {createMode === 'voice_note' && (
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="grid gap-4 rounded-[8px] bg-[#F5F3EE] p-5">
                  <TextareaField
                    label="What do you want to say?"
                    value={voiceNoteTopic}
                    onChange={setVoiceNoteTopic}
                    rows={9}
                    placeholder="A feeling you've been sitting with, a client moment, a question you keep getting asked..."
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="studio-label">Channel</span>
                      <select
                        value={voiceNoteChannel}
                        onChange={(event) => setVoiceNoteChannel(event.target.value as VoiceNoteChannel)}
                        className="studio-input h-11"
                      >
                        {Object.entries(voiceNoteChannelLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <PlatformSelect value={getVoiceNotePlatform()} onChange={setPlatform} />
                  </div>
                  <label className="flex items-center gap-3 text-[13px] text-[#142334]/70">
                    <input type="checkbox" checked={voiceNoteUseSignal} onChange={(event) => setVoiceNoteUseSignal(event.target.checked)} />
                    Use this week&apos;s top signal
                  </label>
                  <button type="button" onClick={generateVoiceNote} disabled={createBusy} className="studio-primary-button">
                    {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate voice note
                  </button>
                </div>
                <OutputWithActions
                  title="Voice note script"
                  value={voiceNoteOutput}
                  wordCount={getWordCount(voiceNoteOutput)}
                  onRegenerate={generateVoiceNote}
                  onPolish={() => {
                    setPolishInput(voiceNoteOutput);
                    setCreateMode('polish');
                  }}
                  onSave={() => saveOutputToBacklog(voiceNoteOutput, voiceNoteTopic || 'Voice note', getVoiceNotePlatform())}
                  onCalendar={() =>
                    setCalendarModal({
                      mode: 'create',
                      defaults: {
                        title: titleFromText(voiceNoteOutput, voiceNoteTopic || 'Voice note'),
                        platform: getVoiceNotePlatform(),
                        draftContent: voiceNoteOutput,
                      },
                    })
                  }
                  extraAction={
                    voiceNoteOutput ? (
                      <div className="rounded-[8px] bg-white p-4 text-[12px] leading-relaxed text-[#142334]/68">
                        <p className="font-semibold text-[#142334]">~{getEstimatedReadSeconds(voiceNoteOutput)} seconds read time</p>
                        <p className="mt-2">
                          This is meant to sound unscripted. Read it out loud before recording. Adjust any phrase that feels stiff.
                        </p>
                      </div>
                    ) : null
                  }
                />
              </div>
            )}
          </section>
        )}

        {activeTab === 'calendar' && (
          <section className="rounded-[8px] bg-white p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">30-day calendar</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Plan the rhythm before the post</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/62">
                  Four weeks visible. Empty days are intentional space, not failure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={suggestCalendarPlan} disabled={createBusy} className="studio-secondary-button">
                  {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Suggest 30-day plan
                </button>
                <button type="button" onClick={() => setCalendarModal({ mode: 'create' })} className="studio-primary-button">
                  <Plus className="h-4 w-4" /> Add post
                </button>
              </div>
            </div>

            {calendarPlan && (
              <div className="mt-5 rounded-[8px] bg-[#F5F3EE] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">AI suggested rhythm</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/62">
                      Review, edit, then add only what Kagiso approves.
                    </p>
                  </div>
                  <button type="button" onClick={() => setCalendarPlan('')} className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#142334]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <OutputPanel value={calendarPlan} className="mt-4 min-h-[220px] bg-white" />
              </div>
            )}

            <div className="mt-6 grid gap-3 lg:grid-cols-7">
              {buildPlanDays().map((week, weekIndex) =>
                week.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setCalendarModal({ mode: 'create', defaults: { publishDate: day } })}
                    className={`min-h-[180px] rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3 text-left transition hover:border-[#142334] hover:bg-[#F2ECE7] ${
                      weekIndex === 0 ? 'lg:min-h-[210px]' : ''
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
                      {formatDayLabel(day)}
                    </span>
                    <span className="mt-3 grid gap-2">
                      {(itemsByDate[day] || []).length === 0 ? (
                        <span className="grid h-24 place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] text-[12px] text-[#142334]/45">
                          <Plus className="mb-1 h-4 w-4" /> Add post
                        </span>
                      ) : (
                        (itemsByDate[day] || []).map((item) => (
                          <span key={item.id} className="block rounded-[8px] bg-white p-3 ring-1 ring-[#E4D8CB]">
                            <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#142334]">{item.title}</span>
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              <Badge className={pillarMeta[item.pillar].className}>{pillarMeta[item.pillar].label}</Badge>
                              <Badge className={calendarStatusMeta[item.status].className}>{calendarStatusMeta[item.status].label}</Badge>
                            </span>
                          </span>
                        ))
                      )}
                    </span>
                  </button>
                )),
              )}
            </div>

            <div className="mt-6 rounded-[8px] bg-[#F5F3EE] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Planned posts</p>
              <div className="mt-4 grid gap-3">
                {calendarRecords.length === 0 ? (
                  <p className="rounded-[8px] bg-white p-4 text-[13px] text-[#142334]/62">
                    No planned content yet.
                  </p>
                ) : (
                  calendarRecords.map((item) => (
                    <article key={item.id} className="grid gap-3 rounded-[8px] bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="text-[14px] font-semibold text-[#142334]">{item.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className={pillarMeta[item.pillar].className}>{pillarMeta[item.pillar].label}</Badge>
                          <Badge className={calendarStatusMeta[item.status].className}>{calendarStatusMeta[item.status].label}</Badge>
                          <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{platformLabels[item.platform]}</Badge>
                          <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{formatDisplayDate(item.publishDate)}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setCalendarModal({ mode: 'edit', item })} className="studio-ghost-icon" aria-label="Edit planned post">
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteCalendarItem(item)} className="studio-ghost-icon text-[#A24E37]" aria-label="Delete planned post">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'backlog' && (
          <section className="rounded-[8px] bg-white p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Idea Backlog</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Keep the raw material moving</h2>
              </div>
              <button type="button" onClick={() => setBacklogModal({ mode: 'create' })} className="studio-primary-button">
                <Plus className="h-4 w-4" /> Add idea
              </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-[8px] bg-[#F5F3EE] p-4 xl:grid-cols-[1fr_220px_220px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
                <span className="sr-only">Search backlog</span>
                <input
                  value={backlogSearch}
                  onChange={(event) => setBacklogSearch(event.target.value)}
                  placeholder="Search ideas, drafts, notes..."
                  className="studio-input h-11 w-full pl-10"
                />
              </label>
              <select value={backlogPillarFilter} onChange={(event) => setBacklogPillarFilter(event.target.value as 'all' | ContentPillar)} className="studio-input h-11">
                <option value="all">All pillars</option>
                {Object.entries(pillarMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <select value={backlogStatusFilter} onChange={(event) => setBacklogStatusFilter(event.target.value as 'all' | ContentBacklogStatus)} className="studio-input h-11">
                <option value="all">All statuses</option>
                {Object.entries(backlogStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 grid gap-3">
              {filteredBacklog.length === 0 ? (
                <p className="rounded-[8px] bg-[#F5F3EE] p-5 text-[14px] text-[#142334]/62">
                  No ideas match this view.
                </p>
              ) : (
                filteredBacklog.map((item) => (
                  <article key={item.id} className="rounded-[8px] border border-[#E4D8CB] p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{sourceLabels[item.source]}</Badge>
                          {item.pillar && <Badge className={pillarMeta[item.pillar].className}>{pillarMeta[item.pillar].label}</Badge>}
                          <Badge className={backlogStatusMeta[item.status].className}>{backlogStatusMeta[item.status].label}</Badge>
                          {item.platform && <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{platformLabels[item.platform]}</Badge>}
                        </div>
                        <h3 className="mt-3 font-serif text-[26px] leading-tight text-[#142334]">{item.title}</h3>
                        {item.content && <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#142334]/62">{item.content}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button type="button" onClick={() => setBacklogModal({ mode: 'edit', item })} className="studio-ghost-button">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopic(item.content || item.title);
                            setCreateMode('write_post');
                            setActiveTab('create');
                          }}
                          className="studio-ghost-button"
                        >
                          Use in Create
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarModal({
                              mode: 'create',
                              defaults: {
                                title: item.title,
                                pillar: item.pillar || 'career_growth',
                                platform: item.platform || 'linkedin',
                                draftContent: item.content || '',
                              },
                            })
                          }
                          className="studio-ghost-button"
                        >
                          Add to Calendar
                        </button>
                        <button type="button" onClick={() => deleteBacklogItem(item)} className="studio-ghost-icon text-[#A24E37]" aria-label="Delete backlog item">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {calendarModal && (
        <CalendarEntryModal
          key={`${calendarModal.mode}-${calendarModal.item?.id || calendarModal.defaults?.publishDate || 'new'}`}
          state={calendarModal}
          adminKey={adminKey}
          onClose={() => setCalendarModal(null)}
          onSaved={(item) => {
            setCalendarRecords((current) =>
              calendarModal.mode === 'edit'
                ? current.map((record) => (record.id === item.id ? item : record))
                : [...current, item].sort((a, b) => a.publishDate.localeCompare(b.publishDate)),
            );
            setCalendarModal(null);
            setActiveTab('calendar');
          }}
        />
      )}

      {backlogModal && (
        <BacklogEntryModal
          key={`${backlogModal.mode}-${backlogModal.item?.id || 'new'}`}
          state={backlogModal}
          adminKey={adminKey}
          onClose={() => setBacklogModal(null)}
          onSaved={(item) => {
            setBacklogRecords((current) =>
              backlogModal.mode === 'edit'
                ? current.map((record) => (record.id === item.id ? item : record))
                : [item, ...current],
            );
            setBacklogModal(null);
            setActiveTab('backlog');
          }}
        />
      )}
    </section>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-white/8 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">{label}</p>
      <p className="mt-2 font-serif text-[20px] leading-tight">{value}</p>
    </div>
  );
}

function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <div
      className={`rounded-[8px] px-4 py-3 text-[13px] leading-relaxed ${
        tone === 'error'
          ? 'bg-[#FFF5F2] text-[#8A2F1D] ring-1 ring-[#F2C6B8]'
          : 'bg-[#F5F3EE] text-[#142334]/70 ring-1 ring-[#E4D8CB]'
      }`}
    >
      {children}
    </div>
  );
}

function OutputPanel({ value, className = '' }: { value: string; className?: string }) {
  return (
    <div className={`rounded-[8px] bg-[#F5F3EE] p-5 text-[14px] leading-[1.7] text-[#142334] ${className}`}>
      {value ? (
        <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7] text-[#142334]">{value}</pre>
      ) : (
        <p className="text-[#142334]/48">Generated output will appear here.</p>
      )}
    </div>
  );
}

function OutputWithActions({
  title,
  value,
  wordCount,
  onRegenerate,
  onPolish,
  onSave,
  onCalendar,
  extraAction,
}: {
  title: string;
  value: string;
  wordCount: number;
  onRegenerate: () => void;
  onPolish: () => void;
  onSave: () => void;
  onCalendar: () => void;
  extraAction?: ReactNode;
}) {
  return (
    <div className="rounded-[8px] bg-[#F5F3EE] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">{title}</p>
          <p className="mt-1 text-[12px] text-[#142334]/55">{wordCount} words</p>
        </div>
        {value && <Badge className="bg-white text-[#6B6B6B]">Approval required</Badge>}
      </div>
      <OutputPanel value={value} className="mt-4 min-h-[380px] bg-white" />
      {value && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onRegenerate} className="studio-ghost-button">
            Regenerate
          </button>
          <button type="button" onClick={onPolish} className="studio-ghost-button">
            Polish this
          </button>
          <button type="button" onClick={onSave} className="studio-secondary-button">
            Save to backlog
          </button>
          <button type="button" onClick={onCalendar} className="studio-primary-button">
            Add to calendar
          </button>
        </div>
      )}
      {extraAction && <div className="mt-3">{extraAction}</div>}
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="studio-label">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="studio-input resize-y px-4 py-3 leading-relaxed"
      />
    </label>
  );
}

function PlatformSelect({ value, onChange }: { value: ContentPlatform; onChange: (value: ContentPlatform) => void }) {
  return (
    <label className="grid gap-2">
      <span className="studio-label">Platform</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ContentPlatform)} className="studio-input h-11">
        {Object.entries(platformLabels).map(([platform, label]) => (
          <option key={platform} value={platform}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#142334]/22 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[8px] bg-white p-5 shadow-[0_18px_50px_rgba(20,35,52,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-serif text-[32px] leading-tight text-[#142334]">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F3EE] text-[#142334]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CalendarEntryModal({
  state,
  adminKey,
  onClose,
  onSaved,
}: {
  state: CalendarModalState;
  adminKey: string;
  onClose: () => void;
  onSaved: (item: ContentCalendarItem) => void;
}) {
  const today = getDateKey(new Date());
  const [title, setTitle] = useState(state.item?.title || state.defaults?.title || '');
  const [pillar, setPillar] = useState<ContentPillar>(state.item?.pillar || state.defaults?.pillar || 'career_growth');
  const [platform, setPlatform] = useState<ContentPlatform>(state.item?.platform || state.defaults?.platform || 'linkedin');
  const [publishDate, setPublishDate] = useState(state.item?.publishDate || state.defaults?.publishDate || today);
  const [status, setStatus] = useState<ContentCalendarStatus>(state.item?.status || state.defaults?.status || 'idea');
  const [draftContent, setDraftContent] = useState(state.item?.draftContent || state.defaults?.draftContent || '');
  const [notes, setNotes] = useState(state.item?.notes || state.defaults?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { key: adminKey, title, pillar, platform, publishDate, status, draftContent, notes };
      const data =
        state.mode === 'edit' && state.item
          ? await requestJson<{ item: ContentCalendarItem }>(`/api/content/calendar/${state.item.id}`, 'PATCH', payload)
          : await requestJson<{ item: ContentCalendarItem }>('/api/content/calendar', 'POST', payload);
      onSaved(data.item);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the planned post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={state.mode === 'edit' ? 'Edit planned post' : 'Add planned post'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextInput label="Title/topic" value={title} onChange={setTitle} required />
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="studio-label">Pillar</span>
            <select value={pillar} onChange={(event) => setPillar(event.target.value as ContentPillar)} className="studio-input h-11">
              {Object.entries(pillarMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <PlatformSelect value={platform} onChange={setPlatform} />
          <label className="grid gap-2">
            <span className="studio-label">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ContentCalendarStatus)} className="studio-input h-11">
              {Object.entries(calendarStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TextInput label="Publish date" value={publishDate} onChange={setPublishDate} type="date" required />
        <TextareaField label="Linked draft" value={draftContent} onChange={setDraftContent} rows={6} />
        <TextareaField label="Notes" value={notes} onChange={setNotes} rows={4} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="studio-ghost-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="studio-primary-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save post
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function BacklogEntryModal({
  state,
  adminKey,
  onClose,
  onSaved,
}: {
  state: BacklogModalState;
  adminKey: string;
  onClose: () => void;
  onSaved: (item: ContentBacklogItem) => void;
}) {
  const [title, setTitle] = useState(state.item?.title || state.defaults?.title || '');
  const [pillar, setPillar] = useState<ContentPillar | ''>(state.item?.pillar || state.defaults?.pillar || '');
  const [platform, setPlatform] = useState<ContentPlatform | ''>(state.item?.platform || state.defaults?.platform || '');
  const [status, setStatus] = useState<ContentBacklogStatus>(state.item?.status || state.defaults?.status || 'idea');
  const [source, setSource] = useState<ContentBacklogSource>(state.item?.source || state.defaults?.source || 'manual');
  const [content, setContent] = useState(state.item?.content || state.defaults?.content || '');
  const [notes, setNotes] = useState(state.item?.notes || state.defaults?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = { key: adminKey, title, pillar, platform, status, source, content, notes };
      const data =
        state.mode === 'edit' && state.item
          ? await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${state.item.id}`, 'PATCH', payload)
          : await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', payload);
      onSaved(data.item);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save the idea.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title={state.mode === 'edit' ? 'Edit idea' : 'Add idea'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextInput label="Title/topic" value={title} onChange={setTitle} required />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="studio-label">Pillar</span>
            <select value={pillar} onChange={(event) => setPillar(event.target.value as ContentPillar | '')} className="studio-input h-11">
              <option value="">No pillar yet</option>
              {Object.entries(pillarMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="studio-label">Platform</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value as ContentPlatform | '')} className="studio-input h-11">
              <option value="">No platform yet</option>
              {Object.entries(platformLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="studio-label">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ContentBacklogStatus)} className="studio-input h-11">
              {Object.entries(backlogStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="studio-label">Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value as ContentBacklogSource)} className="studio-input h-11">
              {Object.entries(sourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TextareaField label="Content / draft" value={content} onChange={setContent} rows={6} />
        <TextareaField label="Notes" value={notes} onChange={setNotes} rows={4} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="studio-ghost-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="studio-primary-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save idea
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="studio-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="studio-input h-11"
      />
    </label>
  );
}
