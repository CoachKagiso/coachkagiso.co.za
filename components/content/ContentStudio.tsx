'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, Ref } from 'react';
import Image from 'next/image';
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Mic2,
  PenLine,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import FollowUpNotificationBell, { type NotificationPanelSection } from '@/components/dashboard/FollowUpNotificationBell';
import { OutputPanel, OutputWithActions } from '@/components/content/shared/OutputPanel';
import { EditorialCalendarTab } from '@/components/content/tabs/EditorialCalendarTab';
import { HomeTab } from '@/components/content/tabs/HomeTab';
import { SignalBriefsTab } from '@/components/content/tabs/SignalBriefsTab';
import { StudioTab } from '@/components/content/tabs/StudioTab';
import { VaultTab } from '@/components/content/tabs/VaultTab';
import { extractCleanTitle, extractOutputMetadata, extractPostBody, extractPreview } from '@/lib/content/utils';
import {
  cleanMessyMiddleNotes,
  getBacklogNotesKind,
  getVaultExpiryInfo,
  getVaultSectionForItem,
  isInsightsBacklogItem,
  isMessyMiddleItem,
  isSmartSuggestItem,
  messyMiddleMarker,
  vaultPolicies,
  type VaultSection,
} from '@/lib/content/vault-policy';
import type {
  ContentBacklogItem,
  ContentBacklogSource,
  ContentBacklogStatus,
  ContentCalendarItem,
  ContentCalendarStatus,
  ContentPillar,
  ContentPlatform,
  DashboardContext,
  ResearchContentAngle,
  ResearchEntry,
} from '@/lib/content-studio';
import type { SmartSuggestSource, SmartSuggestSources, SmartSuggestion } from '@/lib/content/system-prompt';

type ContentStudioProps = {
  adminKey: string;
  context: DashboardContext;
  calendarItems: ContentCalendarItem[];
  backlogItems: ContentBacklogItem[];
  researchItems: ResearchEntry[];
  followUpNotificationCount: number;
};

type ContentSection = 'home' | 'briefs' | 'studio' | 'vault' | 'editorial' | 'research';
type StudioMode = 'create' | 'transform';
type CreatePlatform = 'linkedin' | 'instagram_facebook' | 'tiktok' | 'email_voice';
type TopicSource = 'manual' | 'signal' | 'brief';
type CreatePillarFocus = ContentPillar | 'auto';
type CarouselSlideCount = 'auto' | 'quick' | 'full';
type AiMode =
  | 'signal_brief'
  | 'write_post'
  | 'polish'
  | 'alchemy_stage1'
  | 'alchemy_stage2'
  | 'alchemy_critique'
  | 'format_recommendation'
  | 'voice_note'
  | 'calendar_plan'
  | 'summarise_insights';
type TransformInputType = 'text' | 'image';
type AiPromptSelection = Pick<CreateSelection, 'contentType' | 'subType' | 'angle' | 'angleRegister'>;
type SmartPulseKey = 'platform' | 'content' | 'angle' | 'topic';
type SmartSuggestState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'suggestion'; data: SmartSuggestion }
  | { type: 'error'; message: string };

type InsightsArticleInput = {
  title: string;
  content: string;
  publishedUrl: string;
  pillar: ContentPillar;
};

interface CreateSelection {
  platform: CreatePlatform | null;
  contentType: string | null;
  subType: string | null;
  angle: string | null;
  angleRegister: string | null;
  carouselSlideCount: CarouselSlideCount;
}

type ExtractedFramework = {
  hookPattern: string;
  emotionalTension: string;
  storyStructure: string;
  ctaStyle: string;
  formatLogic: string;
  suggestedPillar?: string;
};

type TransformStage = 'idle' | 'extracting' | 'extracted' | 'rebuilding' | 'complete';
type AlchemyCritique = {
  passed: boolean;
  pillarAlignment: string;
  pillarNote: string;
  voiceMatch: string;
  voiceNote: string;
  saContext: string;
  saNote: string;
  brandViolations: string[];
  suggestions: string[];
};

type CreatePlatformOption = {
  id: CreatePlatform;
  label: string;
  description: string;
  icon: LucideIcon;
};

type ContentTypeOption = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  subTypes: Array<{ id: string; label: string }>;
};

type ContentTypeGroup = {
  label: string | null;
  types: ContentTypeOption[];
};

type AngleOption = {
  id: string;
  label: string;
  register: string;
};

type AngleGroup = {
  label: string;
  angles: AngleOption[];
};

type StudioGuidance = {
  eyebrow: string;
  title: string;
  bullets: string[];
  callout: string;
};

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

type ContentSearchResult = {
  id: string;
  section: ContentSection;
  title: string;
  detail: string;
  tag: string;
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

const pillarBorderColors: Record<ContentPillar, string> = {
  career_growth: '#3B82F6',
  leadership: '#8B5CF6',
  personal_brand: '#F59E0B',
  mentorship: '#10B981',
};

const platformLabels: Record<ContentPlatform, string> = {
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  email: 'Email',
};

const defaultOutputPlatform: ContentPlatform = 'linkedin';

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

const contentStatusLabels: Record<ContentBacklogStatus | ContentCalendarStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  in_progress: 'In progress',
  used: 'Used',
  scheduled: 'Scheduled',
  published: 'Published',
};

const sourceLabels: Record<ContentBacklogSource, string> = {
  signal_brief: 'From Signal Brief',
  create: 'From Create',
  manual: 'Manual',
  insights: 'Insights Article',
};

const smartSourceLabels: Record<SmartSuggestSource, string> = {
  pillar_gap: 'Pillar gap',
  platform_gap: 'Platform gap',
  insights_repurpose: 'From Insights',
  vault_draft: 'Vault draft',
  service_demand: 'Service demand',
  lead_signal: 'Lead signal',
  content_variety: 'Content variety',
  trend_signal: 'Trending now',
  from_research: 'From Research',
};

const alchemyDirectionPillarOptions: Array<{ value: ContentPillar | 'auto'; label: string }> = [
  { value: 'auto', label: 'Auto (from framework)' },
  { value: 'career_growth', label: 'Career Growth & Strategy' },
  { value: 'leadership', label: 'Leadership & People Development' },
  { value: 'personal_brand', label: 'Personal Brand & Visibility' },
  { value: 'mentorship', label: 'Mentorship & Community' },
];

const alchemyDirectionPlatformOptions: Array<{ value: CreatePlatform | 'auto'; label: string }> = [
  { value: 'auto', label: 'Auto (AI decides)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram_facebook', label: 'Instagram / Facebook' },
  { value: 'email_voice', label: 'Email / Voice Note' },
];

const alchemyDirectionRegisterOptions: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto (AI decides)' },
  { value: 'tactical_teacher', label: 'Tactical Teacher' },
  { value: 'reflective_leader', label: 'Reflective Leader' },
  { value: 'reflection_friday', label: 'Reflection Friday' },
  { value: 'conviction_reframe', label: 'Conviction Reframe' },
  { value: 'celebration_gratitude', label: 'Celebration & Gratitude' },
  { value: 'the_challenger', label: 'The Challenger' },
];

const transformInputTypes: {
  value: TransformInputType;
  label: string;
  description: string;
  inputLabel: string;
  placeholder: string;
}[] = [
  {
    value: 'text',
    label: 'Text',
    description: 'Paste or type anything',
    inputLabel: 'Paste the text',
    placeholder: 'Paste or type anything. The system will extract the structure, not copy the wording.',
  },
  {
    value: 'image',
    label: 'Image',
    description: 'Upload a screenshot or image',
    inputLabel: 'Upload a screenshot',
    placeholder: '',
  },
];

const contentSections: { value: ContentSection; label: string; icon: LucideIcon }[] = [
  { value: 'home', label: 'Home', icon: LayoutDashboard },
  { value: 'briefs', label: 'Signal Briefs', icon: Lightbulb },
  { value: 'studio', label: 'Studio', icon: PenLine },
  { value: 'vault', label: 'Vault', icon: Archive },
  { value: 'editorial', label: 'Editorial Calendar', icon: CalendarDays },
  { value: 'research', label: 'Research', icon: BookOpen },
];

const vaultSections: Array<{ value: VaultSection; label: string; description: string; icon: LucideIcon }> = [
  { value: 'ideas', label: 'Idea Backlog', description: 'Drafts and ideas ready to shape', icon: Archive },
  { value: 'smart', label: 'Smart Suggest', description: 'AI-suggested ideas saved for later', icon: Sparkles },
  { value: 'messy', label: 'Messy Middle', description: 'Raw thoughts and unfinished fragments', icon: PenLine },
  { value: 'insights', label: 'Insights', description: 'Published articles ready to repurpose', icon: FileText },
];

const createPlatformOptions: CreatePlatformOption[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Authority engine. Where clients find you.',
    icon: FileText,
  },
  {
    id: 'instagram_facebook',
    label: 'Instagram & Facebook',
    description: 'Relationship platform. Where people get closer.',
    icon: MessageSquare,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Discovery engine. Where strangers find you.',
    icon: Video,
  },
  {
    id: 'email_voice',
    label: 'Email & Voice Note',
    description: 'Owned audience. Most personal channel.',
    icon: Mail,
  },
];

const createPlatformLabels: Record<CreatePlatform, string> = {
  linkedin: 'LinkedIn',
  instagram_facebook: 'Instagram & Facebook',
  tiktok: 'TikTok',
  email_voice: 'Email & Voice Note',
};

const createPlatformToContentPlatform: Record<CreatePlatform, ContentPlatform> = {
  linkedin: 'linkedin',
  instagram_facebook: 'instagram',
  tiktok: 'tiktok',
  email_voice: 'email',
};

const carouselSlideCountOptions: Array<{ value: CarouselSlideCount; label: string; description: string; prompt: string }> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'AI decides the ideal number of slides based on your content',
    prompt: 'AI should decide the ideal number of carousel slides based on the topic, angle, and audience pressure.',
  },
  {
    value: 'quick',
    label: 'Quick',
    description: '5 to 6 slides, lean and fast to consume',
    prompt: 'Create a quick carousel with 5 to 6 slides. Keep it lean, easy to consume, and focused on one useful idea.',
  },
  {
    value: 'full',
    label: 'Full',
    description: '8 to 10 slides, comprehensive and in depth',
    prompt: 'Create a full carousel with 8 to 10 slides. Make it comprehensive, structured, and in depth without padding.',
  },
];

const platformGuidance: Record<CreatePlatform, StudioGuidance> = {
  linkedin: {
    eyebrow: 'Platform strategy',
    title: 'LinkedIn',
    bullets: [
      'Authority engine for clients who need to trust Kagiso before they book.',
      'Best for career clarity, leadership presence, visibility, and thoughtful proof.',
      'Lead with the real problem first, then teach or reframe one idea clearly.',
    ],
    callout: 'Use LinkedIn when the post needs to build credibility, not just reach.',
  },
  instagram_facebook: {
    eyebrow: 'Platform strategy',
    title: 'Instagram & Facebook',
    bullets: [
      'Relationship platforms for people who already feel close to the brand.',
      'Best for warm stories, behind-the-scenes proof, community questions, and saveable carousels.',
      'Lead with the feeling before the lesson so the content feels human first.',
    ],
    callout: 'Use this lane when the goal is warmth, replies, DMs, and community trust.',
  },
  tiktok: {
    eyebrow: 'Platform strategy',
    title: 'TikTok',
    bullets: [
      'Discovery engine for strangers who need a fast reason to care.',
      'Best for uncomfortable truths, POV scenarios, common mistakes, and punchy series.',
      'Open with the tension immediately. No long setup, no presentation energy.',
    ],
    callout: 'Use TikTok when the idea can be understood in the first three seconds.',
  },
  email_voice: {
    eyebrow: 'Channel strategy',
    title: 'Email & Voice Note',
    bullets: [
      'Owned audience channel for people who have already raised their hand.',
      'Best for follow-ups, personal check-ins, value drops, and soft service invitations.',
      'Write like one person speaking to one person. One idea, one next step.',
    ],
    callout: 'Use this when the message needs intimacy more than algorithmic reach.',
  },
};

const contentTypeGuidance: Record<string, StudioGuidance> = {
  linkedin_post: {
    eyebrow: 'Format logic',
    title: 'LinkedIn Post',
    bullets: [
      'Builds visibility and authority with every post.',
      'Reaches Kagiso’s network and beyond through algorithmic amplification.',
      'Choose the exact post format, angle, and register before generating.',
    ],
    callout: 'Strong for diagnostic insights, career reframes, and service-aware education.',
  },
  linkedin_post_text_post: {
    eyebrow: 'Format logic',
    title: 'Text Post',
    bullets: [
      'Best for a sharp hook, one insight, and a clear closing question or reflection.',
      'Keep the structure clean: tension, reframe or lesson, then next step.',
      'Aim for 150-250 words unless the idea needs more breathing room.',
    ],
    callout: 'Use text posts when the idea is strong enough without visuals.',
  },
  linkedin_post_long_form_post: {
    eyebrow: 'Format logic',
    title: 'Long-Form Post',
    bullets: [
      'Best when the story or framework needs more context before it lands.',
      'Use clear sections, but keep the writing human and direct.',
      'Good for leadership lessons, client stories, and deeper career pivots.',
    ],
    callout: 'Use long-form when trust matters more than speed.',
  },
  linkedin_post_linkedin_article: {
    eyebrow: 'Format logic',
    title: 'LinkedIn Article',
    bullets: [
      'Best for evergreen thought leadership that can be referenced later.',
      'Use a stronger thesis, clear headings, and practical examples.',
      'Good for guides, industry analysis, and longer positioning pieces.',
    ],
    callout: 'Use articles when the idea should live longer than a feed post.',
  },
  carousel: {
    eyebrow: 'Format logic',
    title: 'Carousel',
    bullets: [
      'Swipeable slides guide the audience through a story, framework, or lesson.',
      'Best for teaching, showing data, before-after thinking, and content worth saving.',
      'Each slide should earn the next one. Avoid cramming a full article into slides.',
    ],
    callout: 'Use carousels when the audience should save, revisit, or share the idea.',
  },
  poll: {
    eyebrow: 'Format logic',
    title: 'Poll',
    bullets: [
      'Creates an easy first interaction before a deeper follow-up post.',
      'Best for career decisions, experience checks, hot takes, and market sensing.',
      'The poll caption should frame the real tension behind the question.',
    ],
    callout: 'Use polls to collect signal, then turn the result into the next post.',
  },
  content_series: {
    eyebrow: 'Format logic',
    title: 'Content Series',
    bullets: [
      'Turns one big idea into a rhythm Kagiso can repeat over several posts.',
      'Best for progressive lessons, myth-busting, challenges, or story arcs.',
      'Each part must stand alone while still pointing to the next part.',
    ],
    callout: 'Use a series when one post would flatten the idea.',
  },
  caption_reel: {
    eyebrow: 'Format logic',
    title: 'Caption + Reel Hook',
    bullets: [
      'Pairs a fast emotional hook with a warm caption that deepens trust.',
      'Best for relatable career moments, uncomfortable truths, and short lessons.',
      'The caption should feel like a DM, not a press release.',
    ],
    callout: 'Use this when the hook gets attention and the caption earns connection.',
  },
  story_prompt: {
    eyebrow: 'Format logic',
    title: 'Story Prompt',
    bullets: [
      'Designed for quick replies, polls, questions, and behind-the-scenes moments.',
      'Best when Kagiso wants audience response instead of a polished post.',
      'Keep it simple enough for someone to answer without overthinking.',
    ],
    callout: 'Use Stories when the goal is conversation.',
  },
  short_script: {
    eyebrow: 'Format logic',
    title: 'Short Script',
    bullets: [
      'A 60-90 second spoken idea with the tension in the first line.',
      'Best for quick lessons, mistakes, conviction reframes, and career scenarios.',
      'Write it to be said out loud. If it reads too polished, it will feel stiff.',
    ],
    callout: 'Use short scripts when the idea needs a face and a voice.',
  },
  series_part: {
    eyebrow: 'Format logic',
    title: 'Series Part',
    bullets: [
      'Creates repeatable attention by making one idea part of a larger arc.',
      'Best for multi-part career lessons, challenges, or recurring mistakes.',
      'Each part should resolve one thing and create a reason to return.',
    ],
    callout: 'Use a series when the audience needs a pathway, not a one-off tip.',
  },
  pov_video: {
    eyebrow: 'Format logic',
    title: 'POV Video',
    bullets: [
      'Puts the viewer inside a recognisable career moment immediately.',
      'Best for invisible frustration, promotion tension, or confidence gaps.',
      'The scenario should be specific enough that the right person feels seen.',
    ],
    callout: 'Use POV when recognition is the hook.',
  },
  reaction_video: {
    eyebrow: 'Format logic',
    title: 'Reaction Video',
    bullets: [
      'Uses disagreement to show Kagiso’s point of view clearly.',
      'Best for bad career advice, common myths, and advice that sounds safe but is costly.',
      'React to the idea, not the person. Keep it firm, useful, and professional.',
    ],
    callout: 'Use reaction when Kagiso needs to correct the market.',
  },
  tip_video: {
    eyebrow: 'Format logic',
    title: 'Tip Video',
    bullets: [
      'One practical lesson the viewer can use quickly.',
      'Best for visibility, CV, LinkedIn, interview, or promotion advice.',
      'Keep it actionable. No motivational padding before the tip.',
    ],
    callout: 'Use tip videos when the value can be applied today.',
  },
  personal_checkin: {
    eyebrow: 'Channel logic',
    title: 'Personal Check-In',
    bullets: [
      'A warm note to someone who has gone quiet or needs encouragement.',
      'Best for diagnostic follow-ups and nurture moments.',
      'Lead with care before introducing any next step.',
    ],
    callout: 'Use check-ins when trust needs to be repaired or deepened.',
  },
  value_drop: {
    eyebrow: 'Channel logic',
    title: 'Value Drop',
    bullets: [
      'One useful idea sent directly to the inbox or ear.',
      'Best for lead magnet follow-ups and practical guidance.',
      'Give value first, then make one gentle next step obvious.',
    ],
    callout: 'Use value drops when Kagiso needs to be useful before asking.',
  },
  story_lesson: {
    eyebrow: 'Channel logic',
    title: 'Story + Lesson',
    bullets: [
      'A personal or client-adjacent story with one clear takeaway.',
      'Best when the lesson needs emotion before instruction.',
      'Make the story specific, then connect it to the reader’s next move.',
    ],
    callout: 'Use this when a lesson will land better through a moment.',
  },
  soft_offer: {
    eyebrow: 'Channel logic',
    title: 'Soft Offer',
    bullets: [
      'A gentle invitation that does not feel like a hard sell.',
      'Best after trust, value, or diagnostic signal has already been established.',
      'Name the problem, show the path, and invite one next step.',
    ],
    callout: 'Use soft offers when the reader is warm but not yet decided.',
  },
  voice_note: {
    eyebrow: 'Channel logic',
    title: 'Voice Note Script',
    bullets: [
      'Raw, intimate, and meant to sound spoken rather than written.',
      'Best for warm follow-ups, Story replies, and personal encouragement.',
      'Keep it to one idea. It should sound like Kagiso is checking in personally.',
    ],
    callout: 'Use voice notes when the message needs presence.',
  },
};

const contentTypesByPlatform: Record<CreatePlatform, ContentTypeGroup[]> = {
  linkedin: [
    {
      label: null,
      types: [
        {
          id: 'linkedin_post',
          label: 'LinkedIn Post',
          description: 'Text, long-form, or article',
          icon: FileText,
          subTypes: [
            { id: 'text_post', label: 'Text Post' },
            { id: 'long_form_post', label: 'Long-Form Post' },
            { id: 'linkedin_article', label: 'LinkedIn Article' },
          ],
        },
        { id: 'carousel', label: 'Carousel', description: 'Multi-slide post', icon: ClipboardCheck, subTypes: [] },
        { id: 'poll', label: 'Poll', description: 'Question, options, caption', icon: Lightbulb, subTypes: [] },
        { id: 'content_series', label: 'Content Series', description: '3-7 connected posts', icon: CalendarDays, subTypes: [] },
      ],
    },
  ],
  instagram_facebook: [
    {
      label: null,
      types: [
        { id: 'caption_reel', label: 'Caption + Reel Hook', description: 'For Reels and feed posts', icon: Sparkles, subTypes: [] },
        { id: 'carousel', label: 'Carousel', description: 'Multi-slide saves', icon: ClipboardCheck, subTypes: [] },
        { id: 'story_prompt', label: 'Story Prompt', description: 'Polls, questions, behind-the-scenes', icon: MessageSquare, subTypes: [] },
        { id: 'content_series', label: 'Content Series', description: '3-7 connected posts', icon: CalendarDays, subTypes: [] },
      ],
    },
  ],
  tiktok: [
    {
      label: null,
      types: [
        { id: 'short_script', label: 'Short Script', description: '60-90 seconds', icon: Video, subTypes: [] },
        { id: 'series_part', label: 'Series Part', description: 'Part X of Y', icon: CalendarDays, subTypes: [] },
        { id: 'pov_video', label: 'POV Video', description: 'Situational framing', icon: Sparkles, subTypes: [] },
        { id: 'reaction_video', label: 'Reaction Video', description: 'React to bad advice', icon: MessageSquare, subTypes: [] },
        { id: 'tip_video', label: 'Tip Video', description: 'Quick actionable lesson', icon: Lightbulb, subTypes: [] },
      ],
    },
  ],
  email_voice: [
    {
      label: null,
      types: [
        { id: 'personal_checkin', label: 'Personal Check-In', description: 'Warm, direct to one person', icon: Mail, subTypes: [] },
        { id: 'value_drop', label: 'Value Drop', description: 'One useful idea', icon: Sparkles, subTypes: [] },
        { id: 'story_lesson', label: 'Story + Lesson', description: 'Experience with a takeaway', icon: FileText, subTypes: [] },
        { id: 'soft_offer', label: 'Soft Offer', description: 'Gentle service mention', icon: PenLine, subTypes: [] },
        { id: 'voice_note', label: 'Voice Note Script', description: 'Raw, unscripted, intimate', icon: Mic2, subTypes: [] },
      ],
    },
  ],
};

const angleGroupsByKey: Record<string, AngleGroup[]> = {
  linkedin_post_text_post: [
    {
      label: 'Share your thinking',
      angles: [
        { id: 'contrarian_take', label: 'Contrarian Take', register: 'conviction_reframe' },
        { id: 'hot_observation', label: 'Hot Observation', register: 'conviction_reframe' },
        { id: 'thought_provoking_question', label: 'Thought-Provoking Question', register: 'reflection_friday' },
        { id: 'quick_lesson', label: 'Quick Lesson', register: 'tactical_teacher' },
      ],
    },
    {
      label: 'Share your experience',
      angles: [
        { id: 'lessons_learned', label: 'Lessons Learned', register: 'reflective_leader' },
        { id: 'behind_the_scenes', label: 'Behind-the-Scenes', register: 'reflection_friday' },
        { id: 'client_win', label: 'Client Win', register: 'celebration_gratitude' },
        { id: 'personal_milestone', label: 'Personal Milestone', register: 'celebration_gratitude' },
      ],
    },
    {
      label: 'Share value',
      angles: [
        { id: 'career_framework', label: 'Career Framework', register: 'tactical_teacher' },
        { id: 'industry_insight', label: 'Industry Insight', register: 'reflective_leader' },
        { id: 'resource_worth_sharing', label: 'Resource Worth Sharing', register: 'tactical_teacher' },
      ],
    },
    {
      label: 'Inspire and connect',
      angles: [
        { id: 'reflection_friday', label: 'Reflection Friday', register: 'reflection_friday' },
        { id: 'community_call', label: 'Community Call', register: 'reflection_friday' },
      ],
    },
    {
      label: 'Connect and entertain',
      angles: [
        { id: 'relatable_observation', label: 'Relatable Observation', register: 'the_challenger' },
        { id: 'career_hot_take', label: 'Career Hot Take', register: 'conviction_reframe' },
        { id: 'the_challenger', label: 'The Challenger', register: 'the_challenger' },
      ],
    },
  ],
  linkedin_post_long_form_post: [
    {
      label: 'Demonstrate expertise',
      angles: [
        { id: 'case_study', label: 'Case Study', register: 'reflective_leader' },
        { id: 'before_and_after', label: 'Before & After', register: 'tactical_teacher' },
        { id: 'the_deep_dive', label: 'The Deep Dive', register: 'reflective_leader' },
      ],
    },
    {
      label: 'Build authority',
      angles: [
        { id: 'contrarian_argument', label: 'Contrarian Argument', register: 'conviction_reframe' },
        { id: 'thought_leadership', label: 'Thought Leadership', register: 'reflective_leader' },
        { id: 'bold_prediction', label: 'Bold Prediction', register: 'reflective_leader' },
      ],
    },
    {
      label: 'Share your story',
      angles: [
        { id: 'personal_essay', label: 'Personal Essay', register: 'reflection_friday' },
        { id: 'career_turning_point', label: 'Career Turning Point', register: 'reflection_friday' },
      ],
    },
  ],
  linkedin_post_linkedin_article: [
    {
      label: 'Establish authority',
      angles: [
        { id: 'thought_leadership_framework', label: 'Thought Leadership Framework', register: 'reflective_leader' },
        { id: 'contrarian_with_evidence', label: 'Contrarian with Evidence', register: 'conviction_reframe' },
        { id: 'industry_trend_analysis', label: 'Industry Trend Analysis', register: 'reflective_leader' },
        { id: 'bold_prediction', label: 'Bold Prediction', register: 'reflective_leader' },
      ],
    },
    {
      label: 'Educate and add value',
      angles: [
        { id: 'ultimate_guide', label: 'Ultimate Guide', register: 'tactical_teacher' },
        { id: 'problem_solution_breakdown', label: 'Problem-Solution Breakdown', register: 'tactical_teacher' },
        { id: 'evergreen_resource', label: 'Evergreen Resource', register: 'tactical_teacher' },
      ],
    },
    {
      label: 'Tell your story',
      angles: [
        { id: 'career_lessons_reflections', label: 'Career Lessons & Reflections', register: 'reflection_friday' },
        { id: 'longform_case_study', label: 'Long-Form Case Study', register: 'reflective_leader' },
        { id: 'leadership_wisdom', label: 'Leadership Wisdom', register: 'reflective_leader' },
      ],
    },
  ],
  carousel: [
    {
      label: 'EDUCATE & TEACH',
      angles: [
        { id: 'how_to_guide', label: 'How-To Guide / Step-by-Step', register: 'tactical_teacher' },
        { id: 'x_tips_for_y', label: 'X Tips for Y', register: 'tactical_teacher' },
        { id: 'checklists_workflows', label: 'Checklists & Workflows', register: 'tactical_teacher' },
        { id: 'myth_vs_fact', label: 'Myth vs. Fact', register: 'conviction_reframe' },
        { id: 'resource_roundup', label: 'Resource Roundup', register: 'tactical_teacher' },
        { id: 'faq', label: 'FAQ', register: 'tactical_teacher' },
      ],
    },
    {
      label: 'SHOW WITH DATA',
      angles: [
        { id: 'stats_data_story', label: 'Stats & Data Story', register: 'reflective_leader' },
        { id: 'problem_and_solution', label: 'Problem & Solution', register: 'tactical_teacher' },
      ],
    },
    {
      label: 'SHOW YOUR WORK',
      angles: [
        { id: 'before_and_after', label: 'Before & After: Transformations', register: 'tactical_teacher' },
        { id: 'behind_the_scenes', label: 'Behind-the-Scenes', register: 'celebration_gratitude' },
        { id: 'career_journey_timeline', label: 'Career Journey / Timeline', register: 'reflective_leader' },
        { id: 'personal_brand_values', label: 'Personal Brand & Values', register: 'reflective_leader' },
      ],
    },
    {
      label: 'PROMOTE & INSPIRE',
      angles: [
        { id: 'product_service_deep_dive', label: 'Product / Service Deep Dive', register: 'tactical_teacher' },
        { id: 'quotes_and_insights', label: 'Quotes & Insights', register: 'reflective_leader' },
      ],
    },
  ],
  poll: [
    {
      label: 'Poll type',
      angles: [
        { id: 'career_decision', label: 'Career Decision', register: 'tactical_teacher' },
        { id: 'hot_take_vote', label: 'Hot Take Vote', register: 'conviction_reframe' },
        { id: 'experience_check', label: 'Experience Check', register: 'reflection_friday' },
        { id: 'industry_opinion', label: 'Industry Opinion', register: 'reflective_leader' },
      ],
    },
  ],
  content_series: [
    {
      label: 'Series type',
      angles: [
        { id: 'progressive_deep_dive', label: 'Progressive Deep Dive', register: 'reflective_leader' },
        { id: 'myth_busting_series', label: 'Myth-Busting Series', register: 'conviction_reframe' },
        { id: 'before_during_after', label: 'Before-During-After', register: 'tactical_teacher' },
        { id: 'daily_challenge', label: 'Daily Challenge', register: 'tactical_teacher' },
        { id: 'story_arc', label: 'Story Arc', register: 'reflection_friday' },
      ],
    },
  ],
  caption_reel: [
    {
      label: 'Hook first',
      angles: [
        { id: 'lead_with_feeling', label: 'Lead with Feeling', register: 'reflection_friday' },
        { id: 'uncomfortable_truth', label: 'Uncomfortable Truth', register: 'conviction_reframe' },
        { id: 'relatable_moment', label: 'Relatable Moment', register: 'the_challenger' },
      ],
    },
    {
      label: 'Share your story',
      angles: [
        { id: 'personal_disclosure', label: 'Personal Disclosure', register: 'reflection_friday' },
        { id: 'behind_the_scenes', label: 'Behind-the-Scenes', register: 'celebration_gratitude' },
        { id: 'client_win', label: 'Client Win', register: 'celebration_gratitude' },
      ],
    },
    {
      label: 'Connect and entertain',
      angles: [
        { id: 'relatable_career_moment', label: 'Relatable Career Moment', register: 'the_challenger' },
        { id: 'community_question', label: 'Community Question', register: 'reflection_friday' },
      ],
    },
  ],
  story_prompt: [
    {
      label: 'Story type',
      angles: [
        { id: 'poll_question', label: 'Poll Question', register: 'reflection_friday' },
        { id: 'behind_the_scenes', label: 'Behind-the-Scenes', register: 'celebration_gratitude' },
        { id: 'one_honest_question', label: 'One Honest Question', register: 'reflection_friday' },
        { id: 'community_moment', label: 'Community Moment', register: 'reflection_friday' },
      ],
    },
  ],
  short_script: [
    {
      label: 'Hook first',
      angles: [
        { id: 'uncomfortable_truth', label: 'Uncomfortable Truth', register: 'conviction_reframe' },
        { id: 'pov_scenario', label: 'POV Scenario', register: 'the_challenger' },
        { id: 'conviction_reframe', label: 'Conviction Reframe', register: 'conviction_reframe' },
      ],
    },
    {
      label: 'Teach and inspire',
      angles: [
        { id: '3_step_tip', label: '3-Step Tip', register: 'tactical_teacher' },
        { id: 'common_mistake', label: 'Common Mistake', register: 'tactical_teacher' },
        { id: 'reaction_to_bad_advice', label: 'Reaction to Bad Advice', register: 'the_challenger' },
      ],
    },
    {
      label: 'Humour and relatability',
      angles: [
        { id: 'relatable_career_moment', label: 'Relatable Career Moment', register: 'the_challenger' },
        { id: 'the_challenger', label: 'The Challenger', register: 'the_challenger' },
      ],
    },
  ],
  series_part: [
    {
      label: 'Series format',
      angles: [
        { id: 'part_of_series', label: 'Part X of Y', register: 'tactical_teacher' },
        { id: 'day_in_the_life', label: 'Day in the Life', register: 'reflection_friday' },
      ],
    },
  ],
  pov_video: [
    {
      label: 'POV type',
      angles: [
        { id: 'pov_scenario', label: 'POV Scenario', register: 'the_challenger' },
        { id: 'relatable_career_moment', label: 'Relatable Career Moment', register: 'the_challenger' },
      ],
    },
  ],
  reaction_video: [
    {
      label: 'Reaction type',
      angles: [
        { id: 'reaction_to_bad_advice', label: 'Reaction to Bad Advice', register: 'the_challenger' },
        { id: 'the_challenger', label: 'The Challenger', register: 'the_challenger' },
        { id: 'conviction_reframe', label: 'Conviction Reframe', register: 'conviction_reframe' },
      ],
    },
  ],
  tip_video: [
    {
      label: 'Tip format',
      angles: [
        { id: '3_step_tip', label: '3-Step Tip', register: 'tactical_teacher' },
        { id: 'common_mistake', label: 'Common Mistake', register: 'tactical_teacher' },
        { id: 'quick_lesson', label: 'Quick Lesson', register: 'tactical_teacher' },
      ],
    },
  ],
  personal_checkin: [
    {
      label: 'Tone',
      angles: [
        { id: 'warm_checkin', label: 'Warm Check-In', register: 'reflection_friday' },
        { id: 'raw_honest_moment', label: 'Raw Honest Moment', register: 'reflection_friday' },
      ],
    },
  ],
  value_drop: [
    {
      label: 'Value type',
      angles: [
        { id: 'quick_lesson', label: 'Quick Lesson', register: 'tactical_teacher' },
        { id: 'career_framework', label: 'Career Framework', register: 'tactical_teacher' },
        { id: 'resource_worth_sharing', label: 'Resource Worth Sharing', register: 'tactical_teacher' },
      ],
    },
  ],
  story_lesson: [
    {
      label: 'Story type',
      angles: [
        { id: 'lessons_learned', label: 'Lessons Learned', register: 'reflective_leader' },
        { id: 'career_turning_point', label: 'Career Turning Point', register: 'reflection_friday' },
        { id: 'client_win', label: 'Client Win', register: 'celebration_gratitude' },
      ],
    },
  ],
  soft_offer: [
    {
      label: 'Offer style',
      angles: [
        { id: 'value_first_offer', label: 'Value First, Offer Second', register: 'tactical_teacher' },
        { id: 'story_then_offer', label: 'Story Then Offer', register: 'reflective_leader' },
      ],
    },
  ],
  voice_note: [
    {
      label: 'Voice note type',
      angles: [
        { id: 'warm_checkin', label: 'Warm Check-In', register: 'reflection_friday' },
        { id: 'raw_honest_moment', label: 'Raw Honest Moment', register: 'reflection_friday' },
        { id: 'one_thing_ive_been_thinking', label: "One Thing I've Been Thinking About", register: 'reflection_friday' },
      ],
    },
  ],
};

const angleDetails: Record<string, { whatItIs: string; whyItWorks: string; exampleOpener: string; bestPlatform: string }> = {
  contrarian_take: {
    whatItIs: 'Challenge a widely accepted belief about career growth.',
    whyItWorks: 'SA corporate professionals quietly suspect the conventional wisdom is wrong. This gives them permission to name it.',
    exampleOpener: "Everyone tells you to work harder to get promoted. That's not why people get promoted.",
    bestPlatform: 'LinkedIn',
  },
  quick_lesson: {
    whatItIs: 'One actionable insight, explained clearly.',
    whyItWorks: 'Mid-career professionals want practical tools they can use this week, not theory.',
    exampleOpener: 'Nobody told you your LinkedIn headline was the problem. But it is.',
    bestPlatform: 'LinkedIn / TikTok',
  },
  reflection_friday: {
    whatItIs: 'One honest question with no explanation needed.',
    whyItWorks: "It resonates with people carrying career weight they have not named yet.",
    exampleOpener: 'Are you running away from something, or running towards something?',
    bestPlatform: 'LinkedIn',
  },
  pov_scenario: {
    whatItIs: 'Put the viewer inside a specific, relatable career situation.',
    whyItWorks: 'Immediate recognition. The viewer thinks, this is exactly me.',
    exampleOpener: 'POV: you have been passed over for promotion twice and your manager just called it timing.',
    bestPlatform: 'TikTok',
  },
  the_challenger: {
    whatItIs: 'React to bad career advice with visible disagreement.',
    whyItWorks: 'It builds authority by showing Kagiso has a distinct point of view, not just a platform.',
    exampleOpener: "Your manager did not forget to put your name forward. They just did not think of you.",
    bestPlatform: 'TikTok / LinkedIn',
  },
  warm_checkin: {
    whatItIs: 'Reach out as one person talking to one person.',
    whyItWorks: 'Email and voice note audiences have already raised their hand. Warmth converts.',
    exampleOpener: "Hey, it's Kagiso. I just wanted to check in, not as a coach, just as someone who cares.",
    bestPlatform: 'Email & Voice Note',
  },
  personal_milestone: {
    whatItIs: 'Share a real achievement or moment of growth.',
    whyItWorks: 'It shows the human behind the coach. Community celebrates with her and trusts her more.',
    exampleOpener: "Growth is no longer accidental for me. It's intentional.",
    bestPlatform: 'LinkedIn / Instagram',
  },
  conviction_reframe: {
    whatItIs: 'Take what sounds safe and name the hidden cost.',
    whyItWorks: 'It disrupts comfortable assumptions without being aggressive. It makes people pause.',
    exampleOpener: 'Comfortable is the most dangerous place to be.',
    bestPlatform: 'LinkedIn / TikTok',
  },
};

const anglePlaceholders: Record<string, string> = {
  contrarian_take: "What's the conventional wisdom you disagree with?",
  quick_lesson: 'What is the one thing you wish someone told you earlier?',
  reflection_friday: 'What are you sitting with this week?',
  pov_scenario: 'Describe the situation, for example being passed over for promotion again.',
  the_challenger: 'What bad career advice are you reacting to?',
  warm_checkin: "What do you want to say to someone who's been quiet?",
  personal_milestone: 'What moment or achievement do you want to share?',
  conviction_reframe: "What safe choice has a hidden cost?",
  community_call: 'Who do you want to invite into a conversation?',
  client_win: 'Describe a client situation or transformation.',
  case_study: 'Describe the situation, the challenge, and what changed.',
  personal_essay: 'What experience shaped how you think about work?',
  default: 'What do you want to write about?',
};

const archetypeOptions = ['Lost Pivoter', 'Engaged Strategist', 'Plateaued Performer', 'Quiet Pivoter', 'Burnt-Out Builder'];

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

function formatSyncTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'now';
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

function getDateOffsetKey(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

function getAngleKey(contentType: string | null, subType: string | null) {
  if (!contentType) return '';
  if (subType) return `${contentType}_${subType}`;
  return contentType;
}

function findContentTypeOption(selection: CreateSelection) {
  if (!selection.platform || !selection.contentType) return null;
  return contentTypesByPlatform[selection.platform]
    .flatMap((group) => group.types)
    .find((type) => type.id === selection.contentType) || null;
}

function findAngleOption(selection: CreateSelection) {
  if (!selection.angle) return null;
  return (angleGroupsByKey[getAngleKey(selection.contentType, selection.subType)] || [])
    .flatMap((group) => group.angles)
    .find((angle) => angle.id === selection.angle) || null;
}

function getAngleDetail(angle?: AngleOption | null, platformLabel = '') {
  if (!angle) return null;
  return (
    angleDetails[angle.id] || {
      whatItIs: 'A focused angle that gives the content a clear job.',
      whyItWorks: 'It keeps the piece specific to Kagiso and the audience pressure showing in the dashboard.',
      exampleOpener: angle.label,
      bestPlatform: platformLabel,
    }
  );
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getContentTypeGuidanceKey(selection: CreateSelection, type?: ContentTypeOption | null) {
  if (!type) return '';
  const subtypeKey = getAngleKey(type.id, selection.subType);
  if (contentTypeGuidance[subtypeKey]) return subtypeKey;
  return type.id;
}

function getRegisterLabel(register?: string | null) {
  if (!register) return 'Not selected';
  return register
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

function getCarouselSlideCountOption(value: CarouselSlideCount) {
  return carouselSlideCountOptions.find((option) => option.value === value) || carouselSlideCountOptions[0];
}

function getPillarFocusLabel(pillar: CreatePillarFocus) {
  return pillar === 'auto' ? 'Auto-routed' : pillarMeta[pillar].label;
}

function getPillarFocusPrompt(pillar: CreatePillarFocus) {
  if (pillar !== 'auto') return pillarMeta[pillar].label;

  return [
    'Auto-route to the strongest fit from the four pillars:',
    'Career Growth, Leadership, Personal Brand, or Mentorship.',
    'Do not default to Career Growth just because the dashboard signal is career-related.',
    'Use the selected platform, format, angle, and topic to choose the pillar.',
  ].join(' ');
}

function deriveCreateMode(selection: CreateSelection): AiMode {
  return selection.contentType === 'voice_note' ? 'voice_note' : 'write_post';
}

function isCreateSelectionReady(selection: CreateSelection) {
  return Boolean(selection.platform && selection.contentType && selection.angle);
}

function buildCreateUserPrompt(selection: CreateSelection, topicValue: string, pillarFocus: CreatePillarFocus = 'auto') {
  const platformLabel = selection.platform ? createPlatformLabels[selection.platform] : '';
  const contentType = findContentTypeOption(selection);
  const subType = contentType?.subTypes.find((item) => item.id === selection.subType);
  const angle = findAngleOption(selection);
  return [
    `Platform: ${platformLabel}`,
    `Content type: ${contentType?.label || selection.contentType || ''}${subType ? ` (${subType.label})` : ''}`,
    `Angle: ${angle?.label || selection.angle || ''}`,
    `Register: ${getRegisterLabel(selection.angleRegister)}`,
    `Pillar: ${getPillarFocusPrompt(pillarFocus)}`,
    selection.contentType === 'carousel' ? `Carousel slide count: ${getCarouselSlideCountOption(selection.carouselSlideCount).prompt}` : '',
    `Topic: ${topicValue.trim() || 'Suggest the strongest topic from the dashboard signal and selected angle.'}`,
  ]
    .filter((item) => !item.endsWith(': '))
    .join('\n');
}

function isCreatePlatform(value?: string | null): value is CreatePlatform {
  return Boolean(value && createPlatformOptions.some((item) => item.id === value));
}

function isContentPillarValue(value?: string | null): value is ContentPillar {
  return Boolean(value && Object.prototype.hasOwnProperty.call(pillarMeta, value));
}

function normalizeGeneratedPillar(value?: string | null): ContentPillar | null {
  if (!value) return null;
  const normalized = value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (isContentPillarValue(normalized)) return normalized;
  if (normalized.includes('personal_brand') || normalized.includes('visibility')) return 'personal_brand';
  if (normalized.includes('leadership') || normalized.includes('people_development')) return 'leadership';
  if (normalized.includes('mentor') || normalized.includes('community')) return 'mentorship';
  if (normalized.includes('career_growth') || normalized.includes('career')) return 'career_growth';

  return null;
}

function isSmartSuggestSource(value?: string | null): value is SmartSuggestSource {
  return Boolean(value && Object.prototype.hasOwnProperty.call(smartSourceLabels, value));
}

function normalizeSmartSuggestion(raw: SmartSuggestion): SmartSuggestion {
  const platform = isCreatePlatform(raw.platform) ? raw.platform : 'linkedin';
  const firstType = contentTypesByPlatform[platform].flatMap((group) => group.types)[0];
  const requestedType = contentTypesByPlatform[platform]
    .flatMap((group) => group.types)
    .find((type) => type.id === raw.contentType) || firstType;
  const requestedSubType = requestedType.subTypes.length
    ? requestedType.subTypes.find((item) => item.id === raw.subType)?.id || requestedType.subTypes[0].id
    : null;
  const angleKey = getAngleKey(requestedType.id, requestedSubType);
  const fallbackAngle = angleGroupsByKey[angleKey]?.[0]?.angles[0];
  const requestedAngle =
    angleGroupsByKey[angleKey]?.flatMap((group) => group.angles).find((angle) => angle.id === raw.angle) ||
    fallbackAngle;

  return {
    platform,
    contentType: requestedType.id,
    subType: requestedSubType,
    angle: requestedAngle?.id || raw.angle || 'quick_lesson',
    angleRegister: requestedAngle?.register || raw.angleRegister || 'tactical_teacher',
    angleDisplayName: requestedAngle?.label || raw.angleDisplayName || raw.angle || 'Quick Lesson',
    topic: raw.topic?.trim() || 'Turn the current dashboard signal into one useful content idea.',
    assignment: raw.assignment?.trim() || raw.topic?.trim() || raw.whatItDoes?.trim() || 'Write one specific post from the current dashboard signal.',
    whatItDoes: raw.whatItDoes?.trim() || 'Create one focused piece that helps the right audience take the next step.',
    whyNow: raw.whyNow?.trim() || 'The dashboard has enough signal to make this relevant right now.',
    sources: Array.isArray(raw.sources)
      ? raw.sources.filter((source): source is SmartSuggestSource => isSmartSuggestSource(source))
      : ['lead_signal'],
    pillar: isContentPillarValue(raw.pillar) ? raw.pillar : 'career_growth',
    citation: raw.citation,
  };
}

function getSmartSuggestionKey(suggestion: SmartSuggestion) {
  return [
    suggestion.platform,
    suggestion.contentType,
    suggestion.subType || 'none',
    suggestion.angle,
    suggestion.assignment || suggestion.topic,
  ]
    .join(':')
    .toLowerCase();
}

function getSmartSuggestionVaultPlatform(platform: CreatePlatform): ContentPlatform {
  if (platform === 'instagram_facebook') return 'instagram';
  if (platform === 'email_voice') return 'email';
  return platform;
}

function getSmartSuggestionContentLabel(suggestion: SmartSuggestion) {
  const selection: CreateSelection = {
    platform: suggestion.platform,
    contentType: suggestion.contentType,
    subType: suggestion.subType,
    angle: suggestion.angle,
    angleRegister: suggestion.angleRegister,
    carouselSlideCount: 'auto',
  };
  const contentType = findContentTypeOption(selection);
  const subType = contentType?.subTypes.find((item) => item.id === suggestion.subType);
  return contentType ? `${contentType.label}${subType ? ` / ${subType.label}` : ''}` : suggestion.contentType;
}

function inferRecentFormat(item: ContentCalendarItem) {
  const text = `${item.title} ${item.notes || ''} ${item.draftContent || ''}`.toLowerCase();
  if (text.includes('carousel')) return 'carousel';
  if (text.includes('poll')) return 'poll';
  if (text.includes('series')) return 'content_series';
  if (text.includes('voice note')) return 'voice_note';
  if (text.includes('script') || item.platform === 'tiktok') return 'short_script';
  if (text.includes('article')) return 'linkedin_article';
  if (item.platform === 'email') return 'email';
  if (item.platform === 'instagram' || item.platform === 'facebook') return 'caption_reel';
  return 'text_post';
}

function getInsightsSummary(item: ContentBacklogItem) {
  const rawNotes = item.notes || '';
  if (rawNotes.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawNotes) as { summary?: string; keyThemes?: string[]; repurposingAngles?: Array<{ topic?: string }> };
      const pieces = [
        parsed.summary,
        Array.isArray(parsed.keyThemes) && parsed.keyThemes.length ? `Themes: ${parsed.keyThemes.join(', ')}` : '',
        Array.isArray(parsed.repurposingAngles) && parsed.repurposingAngles.length
          ? `Angles: ${parsed.repurposingAngles.map((angle) => angle.topic).filter(Boolean).join(' | ')}`
          : '',
      ].filter(Boolean);
      if (pieces.length) return pieces.join(' ');
    } catch {
      // Fall back to plain notes.
    }
  }
  return extractPreview(rawNotes || item.content || item.title).slice(0, 260);
}

function getBacklogSourceLabel(item: ContentBacklogItem) {
  if (item.notes?.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(item.notes) as { kind?: string };
      if (parsed.kind === 'smart_suggest') return 'Smart Suggest';
    } catch {
      // Fall back to the stored source label.
    }
  }
  return sourceLabels[item.source];
}

function isIdeaBacklogItem(item: ContentBacklogItem) {
  return !isMessyMiddleItem(item) && !isSmartSuggestItem(item) && !isInsightsBacklogItem(item);
}

function buildInsightsNotes(summaryText: string, publishedUrl: string, fallbackPillar: ContentPillar) {
  const cleaned = summaryText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const jsonCandidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
    if (jsonCandidate) {
      try {
        parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }
  }

  return JSON.stringify(
    {
      kind: 'insights_summary',
      publishedUrl: publishedUrl || null,
      summary: typeof parsed.summary === 'string' ? parsed.summary : cleaned.slice(0, 500),
      keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes.map(String).slice(0, 5) : [],
      pillar: isContentPillarValue(String(parsed.pillar || '')) ? parsed.pillar : fallbackPillar,
      repurposingAngles: Array.isArray(parsed.repurposingAngles) ? parsed.repurposingAngles.slice(0, 5) : [],
    },
    null,
    2,
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function getVaultCountdownLabel(info: ReturnType<typeof getVaultExpiryInfo>) {
  if (info.isExpired) return 'Expired';
  if (info.daysRemaining === 0) return 'Expires today';
  if (info.daysRemaining === 1) return '1 day left';
  return `${info.daysRemaining} days left`;
}

function getVaultCountdownClassName(info: ReturnType<typeof getVaultExpiryInfo>) {
  if (info.isExpired) return 'bg-[#FEE2E2] text-[#991B1B]';
  if (info.daysRemaining <= 3) return 'bg-[#FFE4D6] text-[#9A3412]';
  if (info.isExpiringSoon) return 'bg-[#FEF3C7] text-[#92400E]';
  return 'bg-[#F5F3EE] text-[#6B6B6B]';
}

function sortVaultRecordsByExpiry(items: ContentBacklogItem[]) {
  const now = new Date();
  return [...items].sort((a, b) => {
    const aExpiry = getVaultExpiryInfo(a, now);
    const bExpiry = getVaultExpiryInfo(b, now);
    if (aExpiry.daysRemaining !== bExpiry.daysRemaining) return aExpiry.daysRemaining - bExpiry.daysRemaining;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function getTransformInputIcon(inputType: TransformInputType, className = 'h-4 w-4') {
  if (inputType === 'image') return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

function trapWheel(e: React.WheelEvent<HTMLElement>) {
  const el = e.currentTarget;
  const atTop = el.scrollTop === 0;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;
  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
    e.preventDefault();
  }
  e.stopPropagation();
}

function getFrameworkRows(framework: ExtractedFramework) {
  return [
    { label: 'Hook pattern', value: framework.hookPattern },
    { label: 'Emotional tension', value: framework.emotionalTension },
    { label: 'Story structure', value: framework.storyStructure },
    { label: 'CTA style', value: framework.ctaStyle },
    { label: 'Format logic', value: framework.formatLogic },
    ...(framework.suggestedPillar ? [{ label: 'Suggested pillar', value: framework.suggestedPillar }] : []),
  ];
}

function formatImageSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromText(text: string, fallback: string) {
  const line = text
    .split('\n')
    .map((item) => item.replace(/^[-*#\s:]+/, '').trim())
    .find(Boolean);
  return (line || fallback).slice(0, 96);
}

function titleFromMessyMiddle(text: string) {
  const line = text
    .split('\n')
    .map((item) => item.replace(/^[-*#\s:]+/, '').trim())
    .find(Boolean);
  return (line || 'Untitled thought').slice(0, 60);
}

function cleanDraftContent(aiOutput: string) {
  return extractPostBody(aiOutput) || aiOutput.trim();
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

function CalendarPostCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ContentCalendarItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayTitle = item.title.length > 50 ? item.title.slice(0, 50) + '...' : item.title;
  const borderColor = pillarBorderColors[item.pillar];

  if (confirmDelete) {
    return (
      <span className="block rounded-[8px] bg-white p-3 ring-1 ring-[#E4D8CB]">
        <span className="block text-[13px] font-semibold text-[#142334]">Delete this post?</span>
        <span className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-full border border-[#E4D8CB] py-1.5 text-[11px] font-semibold text-[#142334]/70 transition hover:border-[#142334]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-full bg-[#DC2626] py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#B91C1C]"
          >
            Delete
          </button>
        </span>
      </span>
    );
  }

  return (
    <span
      className="group relative block cursor-pointer rounded-[8px] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-[#E4D8CB]"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        aria-label="Delete post"
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#6B6B6B] opacity-0 transition hover:text-[#DC2626] group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onEdit} className="block w-full text-left">
        <span className="block pr-6 text-[13px] font-semibold leading-snug text-[#142334]">{displayTitle}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <Badge className={pillarMeta[item.pillar].className}>{pillarMeta[item.pillar].label}</Badge>
          <Badge className={calendarStatusMeta[item.status].className}>{calendarStatusMeta[item.status].label}</Badge>
        </span>
      </button>
    </span>
  );
}

function SignalBriefEmptyState({ busy, onGenerate }: { busy: boolean; onGenerate: () => void }) {
  return (
    <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-[12px] border border-dashed border-[#E4D8CB] bg-[#F5F3EE] px-6 py-12 text-center">
      <div className="mx-auto grid max-w-[440px] justify-items-center">
        <Lightbulb className="h-8 w-8 text-[#C9AD98]" />
        <h3 className="mt-5 font-serif text-[20px] leading-tight text-[#142334]">No brief generated yet</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#6B6B6B]">
          Click &quot;Generate New Brief&quot; to create a content brief from this week&apos;s diagnostic signals.
        </p>
        <button type="button" onClick={onGenerate} disabled={busy} className="studio-primary-button mt-6 w-fit">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate new brief
        </button>
      </div>
    </div>
  );
}

export default function ContentStudio({
  adminKey,
  context,
  calendarItems,
  backlogItems,
  researchItems,
  followUpNotificationCount,
}: ContentStudioProps) {
  const [activeSection, setActiveSection] = useState<ContentSection>('home');
  const [studioMode, setStudioMode] = useState<StudioMode>('create');
  const [createSelection, setCreateSelection] = useState<CreateSelection>({
    platform: null,
    contentType: null,
    subType: null,
    angle: null,
    angleRegister: null,
    carouselSlideCount: 'auto',
  });
  const [createPillarFocus, setCreatePillarFocus] = useState<CreatePillarFocus>('auto');
  const [brief, setBrief] = useState<string | null>(null);
  const [briefHistory, setBriefHistory] = useState<BriefRecord[]>([]);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [archetypeTarget, setArchetypeTarget] = useState(archetypeOptions[0]);
  const [calendarRecords, setCalendarRecords] = useState(calendarItems);
  const [backlogRecords, setBacklogRecords] = useState(backlogItems);
  const [researchRecords, setResearchRecords] = useState<ResearchEntry[]>(researchItems);
  const [calendarModal, setCalendarModal] = useState<CalendarModalState | null>(null);
  const [backlogModal, setBacklogModal] = useState<BacklogModalState | null>(null);
  const [confirmingBacklogDeleteId, setConfirmingBacklogDeleteId] = useState<string | null>(null);
  const [messyModalOpen, setMessyModalOpen] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [insightsSuccess, setInsightsSuccess] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [topic, setTopic] = useState(context.strongestTheme);
  const [topicSource, setTopicSource] = useState<TopicSource>('manual');
  const [smartSuggestState, setSmartSuggestState] = useState<SmartSuggestState>({ type: 'idle' });
  const [smartSuggestSaving, setSmartSuggestSaving] = useState(false);
  const [smartSuggestRefreshing, setSmartSuggestRefreshing] = useState(false);
  const [savedSmartSuggestionKeys, setSavedSmartSuggestionKeys] = useState<string[]>([]);
  const [smartSuggestSaveError, setSmartSuggestSaveError] = useState<string | null>(null);
  const [sessionSuggestions, setSessionSuggestions] = useState<string[]>([]);
  const [smartPrepopulateNotice, setSmartPrepopulateNotice] = useState<string | null>(null);
  const [smartPulseKey, setSmartPulseKey] = useState<SmartPulseKey | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [alchemyInputType, setAlchemyInputType] = useState<TransformInputType>('text');
  const [alchemySource, setAlchemySource] = useState('');
  const [alchemyImageFile, setAlchemyImageFile] = useState<File | null>(null);
  const [alchemyImagePreview, setAlchemyImagePreview] = useState('');
  const [alchemyImageBase64, setAlchemyImageBase64] = useState('');
  const [alchemyImageMediaType, setAlchemyImageMediaType] = useState('');
  const [alchemyImageName, setAlchemyImageName] = useState('');
  const [alchemyImageSize, setAlchemyImageSize] = useState(0);
  const [alchemyImageUrl, setAlchemyImageUrl] = useState('');
  const [alchemyUrlOpen, setAlchemyUrlOpen] = useState(false);
  const [alchemyFramework, setAlchemyFramework] = useState<ExtractedFramework | null>(null);
  const [alchemyOutput, setAlchemyOutput] = useState('');
  const [alchemyTargetPlatform, setAlchemyTargetPlatform] = useState<CreatePlatform | 'auto'>('auto');
  const [alchemyStage, setAlchemyStage] = useState<TransformStage>('idle');
  const [alchemyLoadingMessage, setAlchemyLoadingMessage] = useState('');
  const [alchemyCritique, setAlchemyCritique] = useState<AlchemyCritique | null>(null);
  const [alchemyCritiqueLoading, setAlchemyCritiqueLoading] = useState(false);
  const [alchemyDirectionPillar, setAlchemyDirectionPillar] = useState<ContentPillar | 'auto'>('auto');
  const [alchemyDirectionRegister, setAlchemyDirectionRegister] = useState<string>('auto');
  const [alchemyDirection, setAlchemyDirection] = useState('');
  const [alchemyRebuildMode, setAlchemyRebuildMode] = useState<'simple' | 'advanced'>('simple');
  const [createFormatOutput, setCreateFormatOutput] = useState('');
  const [calendarPlan, setCalendarPlan] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [activeVaultSection, setActiveVaultSection] = useState<VaultSection>('ideas');
  const [vaultLimitModal, setVaultLimitModal] = useState<{ section: VaultSection; currentCount: number } | null>(null);
  const [vaultFiltersOpen, setVaultFiltersOpen] = useState(false);
  const [backlogPillarFilter, setBacklogPillarFilter] = useState<'all' | ContentPillar>('all');
  const [backlogStatusFilter, setBacklogStatusFilter] = useState<'all' | ContentBacklogStatus>('all');
  const [backlogPlatformFilter, setBacklogPlatformFilter] = useState<'all' | ContentPlatform>('all');
  const topicInputRef = useRef<HTMLTextAreaElement | null>(null);

  const callAi = useCallback(
    async (mode: AiMode, userPrompt: string, selection?: AiPromptSelection, extraBody?: Record<string, unknown>) => {
      const data = await requestJson<{ result: string }>('/api/content/ai', 'POST', {
        key: adminKey,
        mode,
        userPrompt,
        context,
        contentType: selection?.contentType,
        subType: selection?.subType,
        angle: selection?.angle,
        angleRegister: selection?.angleRegister,
        ...extraBody,
      });
      return data.result.trim();
    },
    [adminKey, context],
  );

  useEffect(() => {
    if (alchemyStage !== 'extracting' && alchemyStage !== 'rebuilding') {
      return;
    }

    const messages = alchemyStage === 'extracting'
      ? ['Reading the structure...', 'Identifying the hook pattern...', 'Extracting the framework...']
      : [
          'Discarding the source wording...',
          "Rebuilding in Kagiso's voice...",
          `Applying ${alchemyTargetPlatform !== 'auto' ? createPlatformLabels[alchemyTargetPlatform] : 'the best platform'} format rules...`,
          'Almost there...',
        ];
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % messages.length;
      setAlchemyLoadingMessage(messages[index]);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [alchemyStage, alchemyTargetPlatform]);

  useEffect(() => {
    return () => {
      if (alchemyImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(alchemyImagePreview);
      }
    };
  }, [alchemyImagePreview]);

  useEffect(() => {
    let cancelled = false;

    async function cleanupExpiredVaultItems() {
      try {
        const data = await requestJson<{ deletedIds: string[] }>('/api/content/vault-cleanup', 'POST', { key: adminKey });
        if (!cancelled && data.deletedIds.length > 0) {
          setBacklogRecords((current) => current.filter((item) => !data.deletedIds.includes(item.id)));
        }
      } catch (error) {
        console.warn('Vault cleanup failed:', error);
      }
    }

    void cleanupExpiredVaultItems();

    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  const generateSignalBrief = useCallback(
    async (target?: string) => {
      setBriefBusy(true);
      setBriefError(null);
      try {
        const prompt = target
          ? `Create a signal brief for the ${target} archetype using the dashboard context.`
          : 'Create the strongest signal brief from the current dashboard context.';
        const activeResearch = researchRecords
          .filter((r) => r.status === 'active')
          .slice(0, 3)
          .map((r) => ({ title: r.title, pillar: r.pillar, coreInsight: r.coreInsight || '' }));
        const result = await callAi('signal_brief', prompt, undefined, activeResearch.length > 0 ? { researchEntries: activeResearch } : undefined);
        if (result) {
          if (brief) {
            setBriefHistory((current) => [
              {
                id: `brief-${Date.now()}`,
                title: titleFromText(brief, context.strongestTheme),
                text: brief,
                createdAt: new Date().toISOString(),
              },
              ...current,
            ].slice(0, 5));
          }
          setBrief(result);
        }
      } catch (error) {
        setBriefError(error instanceof Error ? error.message : 'Could not generate the brief.');
      } finally {
        setBriefBusy(false);
      }
    },
    [brief, callAi, context.strongestTheme, researchRecords],
  );

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
      if (backlogPlatformFilter !== 'all' && item.platform !== backlogPlatformFilter) return false;
      if (!query) return true;
      return [item.title, item.content, item.notes, item.platform, item.pillar]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [backlogPillarFilter, backlogPlatformFilter, backlogRecords, backlogSearch, backlogStatusFilter]);

  const vaultTotals = useMemo(
    () => ({
      ideas: backlogRecords.filter(isIdeaBacklogItem).length,
      smart: backlogRecords.filter(isSmartSuggestItem).length,
      messy: backlogRecords.filter(isMessyMiddleItem).length,
      insights: backlogRecords.filter(isInsightsBacklogItem).length,
    }),
    [backlogRecords],
  );
  const vaultBuckets = useMemo<Record<VaultSection, ContentBacklogItem[]>>(
    () => ({
      ideas: sortVaultRecordsByExpiry(filteredBacklog.filter(isIdeaBacklogItem)),
      smart: sortVaultRecordsByExpiry(filteredBacklog.filter(isSmartSuggestItem)),
      messy: sortVaultRecordsByExpiry(filteredBacklog.filter(isMessyMiddleItem)),
      insights: sortVaultRecordsByExpiry(filteredBacklog.filter(isInsightsBacklogItem)),
    }),
    [filteredBacklog],
  );
  const activeVaultRecords = vaultBuckets[activeVaultSection];
  const activeVaultMeta = vaultSections.find((section) => section.value === activeVaultSection) || vaultSections[0];
  const vaultExpiryById = useMemo(() => {
    const now = new Date();
    return new Map(backlogRecords.map((item) => [item.id, getVaultExpiryInfo(item, now)]));
  }, [backlogRecords]);
  const expiringVaultRecords = useMemo(
    () => backlogRecords.filter((item) => vaultExpiryById.get(item.id)?.isExpiringSoon),
    [backlogRecords, vaultExpiryById],
  );
  const draftQueueCount = useMemo(
    () => backlogRecords.filter((item) => item.status === 'draft' || item.status === 'in_progress').length,
    [backlogRecords],
  );
  const weekEndKey = getDateOffsetKey(6);
  const todayKey = getDateOffsetKey(0);
  const plannedThisWeekCount = useMemo(
    () => calendarRecords.filter((item) => item.publishDate >= todayKey && item.publishDate <= weekEndKey).length,
    [calendarRecords, todayKey, weekEndKey],
  );
  const latestContentUpdate = useMemo(() => {
    const dates = [...calendarRecords, ...backlogRecords]
      .map((item) => new Date(item.updatedAt))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (dates.length === 0) return new Date();
    return new Date(Math.max(...dates.map((date) => date.getTime())));
  }, [backlogRecords, calendarRecords]);
  const contentUpdatedTimeLabel = formatSyncTime(latestContentUpdate);
  const contentAttentionCount = context.hotLeadsCount + draftQueueCount + (plannedThisWeekCount === 0 ? 1 : 0) + expiringVaultRecords.length;
  const contentAttentionLabel =
    `${draftQueueCount} drafts, ${context.hotLeadsCount} hot leads, ${plannedThisWeekCount === 0 ? 'no posts planned' : `${plannedThisWeekCount} planned`}` +
    (expiringVaultRecords.length > 0 ? `, ${expiringVaultRecords.length} Vault expiring` : '');
  const smartSuggestSources = useMemo<SmartSuggestSources>(() => {
    const fourteenDaysAgoKey = getDateOffsetKey(-13);
    const sevenDaysAgoKey = getDateOffsetKey(-6);
    const pillarCoverage = (Object.keys(pillarMeta) as ContentPillar[]).reduce<Record<string, number>>((acc, pillar) => {
      acc[pillar] = calendarRecords.filter(
        (item) => item.pillar === pillar && item.publishDate >= fourteenDaysAgoKey && item.publishDate <= todayKey,
      ).length;
      return acc;
    }, {});
    const platformCoverage = {
      linkedin: calendarRecords.filter((item) => item.platform === 'linkedin' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
      tiktok: calendarRecords.filter((item) => item.platform === 'tiktok' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
      instagram_facebook: calendarRecords.filter(
        (item) => (item.platform === 'instagram' || item.platform === 'facebook') && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey,
      ).length,
      email: calendarRecords.filter((item) => item.platform === 'email' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
    };
    const vaultDrafts = backlogRecords
      .filter((item) => item.source !== 'insights' && (item.status === 'draft' || item.status === 'idea'))
      .slice(0, 3);
    const insightsArticles = backlogRecords.filter((item) => item.source === 'insights').slice(0, 5);
    const recentFormats = calendarRecords
      .filter((item) => item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey)
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate) || b.updatedAt.localeCompare(a.updatedAt))
      .map(inferRecentFormat)
      .slice(0, 7);

    const now = new Date().toISOString();
    const activeResearch = researchRecords
      .filter((r) => r.status === 'active' && (r.isEvergreen || !r.expiresAt || r.expiresAt > now))
      .slice(0, 10)
      .map((r) => ({
        title: r.title,
        pillar: r.pillar,
        coreInsight: r.coreInsight || '',
        contentAngles: r.contentAngles,
        isEvergreen: r.isEvergreen,
        expiresAt: r.expiresAt,
      }));

    return {
      topArchetype: context.topArchetype,
      strongestTheme: context.strongestTheme,
      hotLeadsCount: context.hotLeadsCount,
      topService: context.topService,
      pillarCoverage,
      platformCoverage,
      vaultDraftCount: backlogRecords.filter((item) => item.source !== 'insights' && (item.status === 'draft' || item.status === 'idea')).length,
      vaultDraftTitles: vaultDrafts.map((item) => extractCleanTitle(item.title, item.content || '')),
      topServiceDemand: context.topService,
      recentFormats,
      insightsSummaries: insightsArticles.map(getInsightsSummary),
      insightsTitles: insightsArticles.map((item) => extractCleanTitle(item.title, item.content || '')),
      researchEntries: activeResearch.length > 0 ? activeResearch : undefined,
    };
  }, [backlogRecords, calendarRecords, context.hotLeadsCount, context.strongestTheme, context.topArchetype, context.topService, researchRecords, todayKey]);
  const normalizedContentSearch = contentSearch.trim().toLowerCase();
  const contentSearchMatches = useMemo<ContentSearchResult[]>(() => {
    if (!normalizedContentSearch) return [];

    const matchesText = (...values: Array<string | null | undefined>) =>
      values.filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedContentSearch));

    const vaultResults = backlogRecords
      .filter((item) =>
        matchesText(item.title, item.content, item.notes, item.platform, item.pillar, contentStatusLabels[item.status], getBacklogSourceLabel(item)),
      )
      .slice(0, 4)
      .map<ContentSearchResult>((item) => ({
        id: item.id,
        section: 'vault',
        title: item.title,
        detail: `${contentStatusLabels[item.status]}${item.platform ? ` - ${platformLabels[item.platform]}` : ''}`,
        tag: 'Vault',
      }));

    const calendarResults = calendarRecords
      .filter((item) => matchesText(item.title, item.draftContent, item.notes, item.platform, item.pillar, contentStatusLabels[item.status]))
      .slice(0, 4)
      .map<ContentSearchResult>((item) => ({
        id: item.id,
        section: 'editorial',
        title: item.title,
        detail: `${formatDisplayDate(item.publishDate)} - ${platformLabels[item.platform]}`,
        tag: 'Calendar',
      }));

    const briefResults =
      brief && matchesText(brief)
        ? [
            {
              id: 'current-brief',
              section: 'briefs' as ContentSection,
              title: titleFromText(brief, context.strongestTheme),
              detail: 'Current generated signal brief',
              tag: 'Brief',
            },
          ]
        : [];

    return [...vaultResults, ...calendarResults, ...briefResults].slice(0, 8);
  }, [backlogRecords, brief, calendarRecords, context.strongestTheme, normalizedContentSearch]);

  const selectedAlchemyInput = transformInputTypes.find((item) => item.value === alchemyInputType) || transformInputTypes[0];
  const selectedAlchemyPlatformLabel = alchemyTargetPlatform !== 'auto' ? createPlatformLabels[alchemyTargetPlatform] : '';
  const alchemyOutputPlatform = alchemyTargetPlatform !== 'auto' ? createPlatformToContentPlatform[alchemyTargetPlatform] : defaultOutputPlatform;
  const hasAlchemyInput = alchemyInputType === 'image'
    ? Boolean(alchemyImageFile || alchemyImageBase64)
    : Boolean(alchemySource.trim());
  const canExtractAlchemy = hasAlchemyInput;
  const canRebuildAlchemy = Boolean(alchemyFramework);
  const selectedCreateType = findContentTypeOption(createSelection);
  const selectedAngle = findAngleOption(createSelection);
  const selectedAngleDetail = getAngleDetail(selectedAngle, createSelection.platform ? createPlatformLabels[createSelection.platform] : '');
  const selectedAngleGroups = angleGroupsByKey[getAngleKey(createSelection.contentType, createSelection.subType)] || [];
  const selectedCreatePlatformLabel = createSelection.platform ? createPlatformLabels[createSelection.platform] : '';
  const selectedOutputPlatform = createSelection.platform ? createPlatformToContentPlatform[createSelection.platform] : defaultOutputPlatform;
  const createPlaceholder = createSelection.angle
    ? anglePlaceholders[createSelection.angle] ?? anglePlaceholders.default
    : anglePlaceholders.default;
  const signalBriefOptions = useMemo(() => {
    const current = brief
      ? [{ id: 'current-brief', title: titleFromText(brief, context.strongestTheme), text: brief }]
      : [];
    const history = briefHistory.map((item) => ({ id: item.id, title: item.title, text: item.text }));
    const saved = backlogRecords
      .filter((item) => item.source === 'signal_brief' && item.content)
      .map((item) => ({ id: item.id, title: item.title, text: item.content || '' }));
    return [...current, ...history, ...saved].slice(0, 6);
  }, [backlogRecords, brief, briefHistory, context.strongestTheme]);
  const canGenerateCreate = isCreateSelectionReady(createSelection);

  function resetSmartSuggestSession() {
    setSessionSuggestions([]);
    setSmartSuggestState({ type: 'idle' });
    setSmartSuggestRefreshing(false);
    setSmartSuggestSaveError(null);
    setSmartPrepopulateNotice(null);
    setSmartPulseKey(null);
  }

  function navigateContent(section: ContentSection, options?: { topic?: string }) {
    if (section !== 'studio' || activeSection !== 'studio') {
      resetSmartSuggestSession();
    }
    if (options?.topic) {
      setTopic(options.topic);
      setTopicSource('signal');
    }
    if (section === 'studio') {
      setStudioMode('create');
    }
    setActiveSection(section);
  }

  function selectCreatePlatform(nextPlatform: CreatePlatform) {
    setSmartPrepopulateNotice(null);
    setCreatePillarFocus('auto');
    setCreateSelection((current) =>
      current.platform === nextPlatform
        ? {
            platform: null,
            contentType: null,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: 'auto',
          }
        : {
            platform: nextPlatform,
            contentType: null,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: 'auto',
          }
    );
    setGeneratedPost('');
    setCreateFormatOutput('');
  }

  function selectCreateType(type: ContentTypeOption) {
    setSmartPrepopulateNotice(null);
    setCreateSelection((current) =>
      current.contentType === type.id
        ? {
            ...current,
            contentType: null,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: 'auto',
          }
        : {
            ...current,
            contentType: type.id,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: 'auto',
          }
    );
    setGeneratedPost('');
    setCreateFormatOutput('');
  }

  function selectCreateSubType(subType: string) {
    setSmartPrepopulateNotice(null);
    setCreateSelection((current) =>
      current.subType === subType
        ? {
            ...current,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: 'auto',
          }
        : {
            ...current,
            subType,
            angle: null,
            angleRegister: null,
          }
    );
    setGeneratedPost('');
    setCreateFormatOutput('');
  }

  function selectCreateAngle(angle: AngleOption) {
    setSmartPrepopulateNotice(null);
    setCreateSelection((current) =>
      current.angle === angle.id
        ? {
            ...current,
            angle: null,
            angleRegister: null,
          }
        : {
            ...current,
            angle: angle.id,
            angleRegister: angle.register,
          }
    );
    setGeneratedPost('');
    setCreateFormatOutput('');
  }

  function selectCarouselSlideCount(slideCount: CarouselSlideCount) {
    setCreateSelection((current) => ({
      ...current,
      carouselSlideCount: slideCount,
    }));
    setGeneratedPost('');
    setCreateFormatOutput('');
  }

  function applyTopicSource(source: TopicSource) {
    setSmartPrepopulateNotice(null);
    setTopicSource(source);
    if (source === 'signal') {
      setTopic(context.strongestTheme);
    }
  }

  function openVaultSection(section: VaultSection) {
    setActiveVaultSection(section);
    setActiveSection('vault');
  }

  function canAddToVaultSection(section: VaultSection) {
    const policy = vaultPolicies[section];
    const currentCount = vaultTotals[section];
    if (currentCount < policy.maxItems) return true;

    setVaultLimitModal({ section, currentCount });
    openVaultSection(section);
    return false;
  }

  function submitContentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = contentSearch.trim();
    if (!query) return;
    setBacklogSearch(query);
    setBacklogPillarFilter('all');
    setBacklogStatusFilter('all');
    setBacklogPlatformFilter('all');
    setActiveSection('vault');
  }

  function openContentSearchResult(result: ContentSearchResult) {
    if (result.section === 'vault') {
      setBacklogSearch(contentSearch.trim());
      setBacklogPillarFilter('all');
      setBacklogStatusFilter('all');
      setBacklogPlatformFilter('all');
      const vaultItem = backlogRecords.find((item) => item.id === result.id);
      if (vaultItem) {
        setActiveVaultSection(isSmartSuggestItem(vaultItem) ? 'smart' : isInsightsBacklogItem(vaultItem) ? 'insights' : isMessyMiddleItem(vaultItem) ? 'messy' : 'ideas');
      }
    }
    if (result.section === 'editorial') {
      const calendarItem = calendarRecords.find((item) => item.id === result.id);
      if (calendarItem) setCalendarModal({ mode: 'edit', item: calendarItem });
    }
    setActiveSection(result.section);
    setContentSearch('');
  }

  async function saveBriefToBacklog(text = brief ?? '') {
    if (!text.trim()) return;
    if (!canAddToVaultSection('ideas')) return;
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
    setActiveSection('vault');
  }

  async function saveOutputToBacklog(
    content: string,
    titleFallback: string,
    platformOverride: ContentPlatform = defaultOutputPlatform,
    titleOverride?: string,
    pillarOverride?: ContentPillar | null,
  ) {
    if (!content.trim()) return;
    if (!canAddToVaultSection('ideas')) return;
    const outputMetadata = extractOutputMetadata(content);
    const cleanContent = outputMetadata.body || content.trim();
    const resolvedPillar = pillarOverride || normalizeGeneratedPillar(outputMetadata.pillar) || 'career_growth';
    const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: titleOverride?.trim() || titleFromText(cleanContent, titleFallback),
      pillar: resolvedPillar,
      platform: platformOverride,
      source: 'create',
      status: 'draft',
      content: cleanContent,
    });
    setBacklogRecords((current) => [data.item, ...current]);
    setActiveSection('vault');
  }

  async function saveSmartSuggestionToVault(suggestion: SmartSuggestion) {
    const normalized = normalizeSmartSuggestion(suggestion);
    const suggestionKey = getSmartSuggestionKey(normalized);
    if (savedSmartSuggestionKeys.includes(suggestionKey)) return;
    if (!canAddToVaultSection('smart')) return;

    setSmartSuggestSaving(true);
    setSmartSuggestSaveError(null);
    try {
      const contentLabel = getSmartSuggestionContentLabel(normalized);
      const content = [
        normalized.assignment,
        '',
        `Why now: ${normalized.whyNow}`,
        `Format: ${createPlatformLabels[normalized.platform]} - ${contentLabel}`,
        `Angle: ${normalized.angleDisplayName}`,
        `Pillar: ${pillarMeta[normalized.pillar].label}`,
      ].join('\n');
      const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
        key: adminKey,
        title: titleFromText(normalized.assignment, normalized.topic || normalized.angleDisplayName),
        pillar: normalized.pillar,
        platform: getSmartSuggestionVaultPlatform(normalized.platform),
        source: 'manual',
        status: 'idea',
        content,
        notes: JSON.stringify(
          {
            kind: 'smart_suggest',
            topic: normalized.topic,
            whatItDoes: normalized.whatItDoes,
            whyNow: normalized.whyNow,
            sources: normalized.sources,
            platform: normalized.platform,
            contentType: normalized.contentType,
            subType: normalized.subType,
            angle: normalized.angle,
            angleRegister: normalized.angleRegister,
            angleDisplayName: normalized.angleDisplayName,
          },
          null,
          2,
        ),
      });
      setBacklogRecords((current) => [data.item, ...current]);
      setSavedSmartSuggestionKeys((current) => [...current, suggestionKey]);
      setActiveVaultSection('smart');
    } catch (error) {
      setSmartSuggestSaveError(error instanceof Error ? error.message : 'Could not save this suggestion to Vault.');
    } finally {
      setSmartSuggestSaving(false);
    }
  }

  async function saveMessyMiddle(content: string) {
    if (!content.trim()) return;
    if (!canAddToVaultSection('messy')) return;
    const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: titleFromMessyMiddle(content),
      pillar: null,
      platform: null,
      source: 'manual',
      status: 'idea',
      content,
      notes: messyMiddleMarker,
    });
    setBacklogRecords((current) => [data.item, ...current]);
    setMessyModalOpen(false);
    setActiveVaultSection('messy');
    setActiveSection('vault');
  }

  async function saveInsightsArticle(input: InsightsArticleInput) {
    if (!canAddToVaultSection('insights')) return;
    const created = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: input.title,
      pillar: input.pillar,
      platform: 'linkedin',
      source: 'insights',
      status: 'used',
      content: input.content,
      notes: input.publishedUrl
        ? JSON.stringify({ kind: 'insights_article', publishedUrl: input.publishedUrl }, null, 2)
        : null,
    });

    const summary = await callAi(
      'summarise_insights',
      `Title: ${input.title}\nPublished URL: ${input.publishedUrl || 'Not provided'}\nSelected pillar: ${pillarMeta[input.pillar].label}\n\nArticle content:\n${input.content}`,
    );
    const notes = buildInsightsNotes(summary, input.publishedUrl, input.pillar);
    const updated = await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${created.item.id}`, 'PATCH', {
      key: adminKey,
      source: 'insights',
      status: 'used',
      notes,
    });

    setBacklogRecords((current) => [updated.item, ...current.filter((record) => record.id !== updated.item.id)]);
    setInsightsSuccess('Article added to Vault. Smart Suggest will now include it in recommendations.');
    setInsightsModalOpen(false);
    setActiveVaultSection('insights');
    setActiveSection('vault');
  }

  async function moveMessyMiddleToBacklog(item: ContentBacklogItem) {
    if (!canAddToVaultSection('ideas')) return;
    const data = await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${item.id}`, 'PATCH', {
      key: adminKey,
      source: 'create',
      status: 'idea',
      notes: cleanMessyMiddleNotes(item.notes),
    });
    setBacklogRecords((current) => current.map((record) => (record.id === item.id ? data.item : record)));
    setActiveVaultSection('ideas');
  }

  async function archiveMessyMiddle(item: ContentBacklogItem) {
    const data = await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${item.id}`, 'PATCH', {
      key: adminKey,
      status: 'used',
      notes: cleanMessyMiddleNotes(item.notes),
    });
    setBacklogRecords((current) => current.map((record) => (record.id === item.id ? data.item : record)));
  }

  function startFromBrief(text: string) {
    if (activeSection !== 'studio') resetSmartSuggestSession();
    setTopic(text);
    setTopicSource('brief');
    setStudioMode('create');
    setActiveSection('studio');
  }

  async function requestSmartSuggestion() {
    const keepCurrentSuggestion = smartSuggestState.type === 'suggestion';
    if (keepCurrentSuggestion) {
      setSmartSuggestRefreshing(true);
    } else {
      setSmartSuggestState({ type: 'loading' });
    }
    setSmartSuggestSaveError(null);
    try {
      const data = await requestJson<{ suggestion: SmartSuggestion }>('/api/content/smart-suggest', 'POST', {
        key: adminKey,
        sources: smartSuggestSources,
        previousSuggestions: sessionSuggestions,
      });
      const suggestion = normalizeSmartSuggestion(data.suggestion);
      setSmartSuggestState({ type: 'suggestion', data: suggestion });
      setSessionSuggestions((current) => [
        ...current,
        `${suggestion.platform}:${suggestion.contentType}:${suggestion.angle}`,
        suggestion.angleDisplayName,
        suggestion.assignment,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate a Smart Suggest recommendation.';
      if (keepCurrentSuggestion) {
        setSmartSuggestSaveError(message);
      } else {
        setSmartSuggestState({ type: 'error', message });
      }
    } finally {
      setSmartSuggestRefreshing(false);
    }
  }

  async function applySmartSuggestion(suggestion: SmartSuggestion, options?: { generateAfter?: boolean }) {
    const normalized = normalizeSmartSuggestion(suggestion);
    const nextSelection: CreateSelection = {
      platform: normalized.platform,
      contentType: normalized.contentType,
      subType: normalized.subType,
      angle: normalized.angle,
      angleRegister: normalized.angleRegister,
      carouselSlideCount: normalized.contentType === 'carousel' ? createSelection.carouselSlideCount : 'auto',
    };

    setStudioMode('create');
    setCreatePillarFocus(normalized.pillar);
    setGeneratedPost('');
    setCreateFormatOutput('');
    setCreateError(null);
    setSmartPrepopulateNotice(null);
    setSmartPulseKey('platform');
    setCreateSelection({
      platform: normalized.platform,
      contentType: null,
      subType: null,
      angle: null,
      angleRegister: null,
      carouselSlideCount: nextSelection.carouselSlideCount,
    });

    await wait(150);
    setSmartPulseKey('content');
    setCreateSelection((current) => ({
      ...current,
      contentType: normalized.contentType,
      subType: normalized.subType,
      angle: null,
      angleRegister: null,
    }));

    await wait(150);
    setSmartPulseKey('angle');
    setCreateSelection((current) => ({
      ...current,
      angle: normalized.angle,
      angleRegister: normalized.angleRegister,
    }));
    setTopic(normalized.assignment);
    setTopicSource('manual');
    setSmartPrepopulateNotice(
      `Pre-populated from Smart Suggest - ${normalized.angleDisplayName} - ${createPlatformLabels[normalized.platform]}`,
    );

    await wait(120);
    setSmartPulseKey('topic');
    topicInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    await wait(300);
    setSmartPulseKey(null);

    if (options?.generateAfter) {
      await generatePost(nextSelection, normalized.topic, normalized.pillar);
    }
  }

  async function generatePost(selectionOverride?: CreateSelection, topicOverride?: string, pillarOverride?: CreatePillarFocus) {
    const selectionToUse = selectionOverride || createSelection;
    const topicToUse = topicOverride ?? topic;
    const pillarToUse = pillarOverride || createPillarFocus;
    if (!isCreateSelectionReady(selectionToUse)) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi(
        deriveCreateMode(selectionToUse),
        buildCreateUserPrompt(selectionToUse, topicToUse, pillarToUse),
        selectionToUse,
      );
      setGeneratedPost(result);
      setCreateFormatOutput('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not generate the content.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function polishGeneratedPost() {
    const cleanPost = cleanDraftContent(generatedPost);
    if (!cleanPost.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi('polish', cleanPost);
      setGeneratedPost(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not polish the content.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function polishAlchemyOutput() {
    const cleanPost = cleanDraftContent(alchemyOutput);
    if (!cleanPost.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi('polish', cleanPost);
      setAlchemyOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not polish the transformed content.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function checkGeneratedFormat() {
    const source = cleanDraftContent(generatedPost).trim() || topic.trim();
    if (!source) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const result = await callAi('format_recommendation', source);
      setCreateFormatOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not recommend a format.');
    } finally {
      setCreateBusy(false);
    }
  }

  function clearAlchemyImage() {
    if (alchemyImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(alchemyImagePreview);
    }
    setAlchemyImageFile(null);
    setAlchemyImagePreview('');
    setAlchemyImageBase64('');
    setAlchemyImageMediaType('');
    setAlchemyImageName('');
    setAlchemyImageSize(0);
    setAlchemyImageUrl('');
  }

  function resetAlchemyFlow() {
    setAlchemySource('');
    clearAlchemyImage();
    setAlchemyFramework(null);
    setAlchemyOutput('');
    setAlchemyStage('idle');
    setAlchemyCritique(null);
    setCreateError(null);
  }

  function selectAlchemyInputType(inputType: TransformInputType) {
    setAlchemyInputType(inputType);
    resetAlchemyFlow();
  }

  function selectAlchemyPlatform(platform: CreatePlatform | 'auto') {
    setAlchemyTargetPlatform(platform);
    setAlchemyFramework(null);
    setAlchemyOutput('');
    setAlchemyStage('idle');
    setAlchemyCritique(null);
  }

  function handleAlchemyImageFile(file: File | null) {
    clearAlchemyImage();
    setAlchemyFramework(null);
    setAlchemyOutput('');
    setAlchemyStage('idle');
    setAlchemyCritique(null);
    setCreateError(null);

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCreateError('Use a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCreateError('Image must be 10MB or smaller.');
      return;
    }

    setAlchemyImageFile(file);
    setAlchemyImageName(file.name);
    setAlchemyImageSize(file.size);
    setAlchemyImageMediaType(file.type);
    setAlchemyImagePreview(URL.createObjectURL(file));
  }

  async function fetchAlchemyImageFromUrl() {
    if (!alchemyImageUrl.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const data = await requestJson<{ base64: string; mediaType: string; filename: string; size: number }>(
        '/api/content/transform/fetch-image',
        'POST',
        { key: adminKey, url: alchemyImageUrl.trim() },
      );
      clearAlchemyImage();
      setAlchemyImageBase64(data.base64);
      setAlchemyImageMediaType(data.mediaType);
      setAlchemyImageName(data.filename || 'screenshot');
      setAlchemyImageSize(data.size || 0);
      setAlchemyImagePreview(`data:${data.mediaType};base64,${data.base64}`);
      setAlchemyFramework(null);
      setAlchemyOutput('');
      setAlchemyStage('idle');
      setAlchemyCritique(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not fetch that image.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function extractAlchemyStructure() {
    if (!canExtractAlchemy) return;
    setCreateBusy(true);
    setCreateError(null);
    setAlchemyStage('extracting');
    setAlchemyLoadingMessage('Reading the structure...');
    setAlchemyFramework(null);
    setAlchemyOutput('');
    setAlchemyCritique(null);

    try {
      let data: { framework: ExtractedFramework };

      if (alchemyInputType === 'image') {
        if (alchemyImageFile) {
          const formData = new FormData();
          formData.append('key', adminKey);
          formData.append('image', alchemyImageFile);
          const response = await fetch('/api/content/transform/stage1', {
            method: 'POST',
            body: formData,
          });
          const parsed = (await response.json().catch(() => ({}))) as { framework?: ExtractedFramework; error?: string };
          if (!response.ok || !parsed.framework) throw new Error(parsed.error || 'Could not extract the structure.');
          data = { framework: parsed.framework };
        } else {
          data = await requestJson<{ framework: ExtractedFramework }>('/api/content/transform/stage1', 'POST', {
            key: adminKey,
            imageBase64: alchemyImageBase64,
            imageMediaType: alchemyImageMediaType,
          });
        }
      } else {
        data = await requestJson<{ framework: ExtractedFramework }>('/api/content/transform/stage1', 'POST', {
          key: adminKey,
          content: alchemySource,
        });
      }

      setAlchemySource('');
      clearAlchemyImage();
      setAlchemyFramework(data.framework);
      setAlchemyStage('extracted');
    } catch (error) {
      setAlchemyStage('idle');
      setCreateError(error instanceof Error ? error.message : 'Could not extract the structure from this content.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function buildAlchemyVersion() {
    if (!canRebuildAlchemy || !alchemyFramework) return;
    setCreateBusy(true);
    setCreateError(null);
    setAlchemyStage('rebuilding');
    setAlchemyLoadingMessage('Discarding the source wording...');
    try {
      const activeResearchEntries = researchRecords
        .filter((r) => r.status === 'active')
        .slice(0, 3)
        .map((r) => ({ title: r.title, pillar: r.pillar, coreInsight: r.coreInsight || '' }));
      const fourteenDaysAgoKey = getDateOffsetKey(-13);
      const todayKeyVal = getDateOffsetKey(0);
      const recentCalendarTitles = calendarRecords
        .filter((item) => item.publishDate >= fourteenDaysAgoKey && item.publishDate <= todayKeyVal)
        .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
        .slice(0, 7)
        .map((item) => item.title);
      const recentBacklogTitles = backlogRecords
        .filter((item) => item.source !== 'insights' && (item.status === 'draft' || item.status === 'idea'))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map((item) => item.title);
      const contentContextParts: string[] = [];
      if (recentCalendarTitles.length > 0) {
        contentContextParts.push(`Recent published content (last 14 days): ${recentCalendarTitles.join('; ')}`);
      }
      if (recentBacklogTitles.length > 0) {
        contentContextParts.push(`Drafts in vault: ${recentBacklogTitles.join('; ')}`);
      }
      const calendarContext = contentContextParts.length > 0 ? contentContextParts.join('\n') : undefined;
      const isAdvanced = alchemyRebuildMode === 'advanced';
      const targetPillarLabel = isAdvanced && alchemyDirectionPillar !== 'auto' ? pillarMeta[alchemyDirectionPillar].label : undefined;
      const data = await requestJson<{ result: string }>('/api/content/transform/stage2', 'POST', {
        key: adminKey,
        framework: alchemyFramework,
        platform: isAdvanced && alchemyTargetPlatform !== 'auto' ? alchemyTargetPlatform : undefined,
        context,
        targetPillar: targetPillarLabel,
        targetRegister: isAdvanced && alchemyDirectionRegister !== 'auto' ? alchemyDirectionRegister : undefined,
        userDirection: isAdvanced && alchemyDirection.trim() ? alchemyDirection.trim() : undefined,
        calendarContext,
        researchEntries: activeResearchEntries.length > 0 ? activeResearchEntries : undefined,
      });
      setAlchemyOutput(data.result.trim());
      setAlchemyStage('complete');
    } catch (error) {
      setAlchemyStage('extracted');
      setCreateError(error instanceof Error ? error.message : "Could not build Kagiso's version.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function runAlchemyCritique() {
    if (!alchemyOutput.trim()) return;
    setAlchemyCritiqueLoading(true);
    setAlchemyCritique(null);
    try {
      const result = await callAi('alchemy_critique', alchemyOutput);
      const cleaned = result.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      setAlchemyCritique({
        passed: !!parsed.passed,
        pillarAlignment: parsed.pillarAlignment || 'pass',
        pillarNote: parsed.pillarNote || '',
        voiceMatch: parsed.voiceMatch || 'pass',
        voiceNote: parsed.voiceNote || '',
        saContext: parsed.saContext || 'pass',
        saNote: parsed.saNote || '',
        brandViolations: Array.isArray(parsed.brandViolations) ? parsed.brandViolations : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      });
    } catch {
      setAlchemyCritique(null);
    } finally {
      setAlchemyCritiqueLoading(false);
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
    const previous = backlogRecords;
    setConfirmingBacklogDeleteId(null);
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

  async function deleteCalendarItemSilent(id: string) {
    const previous = calendarRecords;
    setCalendarRecords((current) => current.filter((record) => record.id !== id));
    try {
      await requestJson<{ ok: true }>(`/api/content/calendar/${id}`, 'DELETE', { key: adminKey });
    } catch {
      setCalendarRecords(previous);
    }
  }

  const hotLeadsHrefParams = new URLSearchParams();
  if (adminKey) hotLeadsHrefParams.set('key', adminKey);
  hotLeadsHrefParams.set('tab', 'leads');
  hotLeadsHrefParams.set('status', 'hot');
  const hotLeadsHref = `/resources/career-diagnostic/submissions?${hotLeadsHrefParams.toString()}`;
  const contentNotificationItems: NotificationPanelSection['items'] = [
    draftQueueCount > 0
      ? {
          id: 'content-drafts',
          title: `${draftQueueCount} draft${draftQueueCount === 1 ? '' : 's'} waiting in the Vault`,
          description: 'Turn the strongest saved idea into a scheduled post before the queue gets stale.',
          actionLabel: 'Open Vault',
          tone: 'warm',
          onSelect: () => openVaultSection('ideas'),
        }
      : null,
    context.hotLeadsCount > 0
      ? {
          id: 'content-hot-leads',
          title: `${context.hotLeadsCount} hot lead${context.hotLeadsCount === 1 ? '' : 's'} can fuel content`,
          description: `Use ${context.strongestTheme.toLowerCase()} as the content angle while the signal is fresh.`,
          actionLabel: 'Review leads',
          href: hotLeadsHref,
          tone: 'today',
        }
      : null,
    plannedThisWeekCount === 0
      ? {
          id: 'content-calendar-gap',
          title: 'No posts planned for this week',
          description: 'Put one useful post on the editorial calendar so the content machine keeps moving.',
          actionLabel: 'Open calendar',
          tone: 'overdue',
          onSelect: () => setActiveSection('editorial'),
        }
      : null,
    expiringVaultRecords.length > 0
      ? {
          id: 'content-vault-expiring',
          title: `${expiringVaultRecords.length} Vault item${expiringVaultRecords.length === 1 ? '' : 's'} expiring soon`,
          description: 'Review them before the automatic cleanup removes old saved ideas.',
          actionLabel: 'Review Vault',
          tone: 'overdue',
          onSelect: () => openVaultSection('ideas'),
        }
      : null,
  ].filter(Boolean) as NotificationPanelSection['items'];
  const contentNotificationSections: NotificationPanelSection[] = [
    {
      id: 'content-pressure',
      title: 'Content pressure',
      description: 'Signals from drafts, hot leads, planning gaps, and Vault expiry.',
      count: contentAttentionCount,
      emptyTitle: 'Content rhythm is steady.',
      emptyDescription: 'No urgent content action is waiting right now.',
      items: contentNotificationItems,
    },
  ];

  return (
    <section id="content-studio" className="pb-10">
      <div className="space-y-3">
        <ContentTopBar
          adminKey={adminKey}
          searchValue={contentSearch}
          searchResults={contentSearchMatches}
          updatedTimeLabel={contentUpdatedTimeLabel}
          attentionCount={contentAttentionCount}
          attentionLabel={contentAttentionLabel}
          notificationCount={followUpNotificationCount + contentAttentionCount}
          extraNotificationSections={contentNotificationSections}
          onSearchChange={setContentSearch}
          onSearchSubmit={submitContentSearch}
          onSearchResultSelect={openContentSearchResult}
          onNewDraft={() => navigateContent('studio', { topic: context.strongestTheme })}
        />

        <nav className="grid w-full grid-cols-2 gap-2 rounded-[8px] bg-white p-2 md:grid-cols-6" aria-label="Content workspace tabs">
          {contentSections.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => navigateContent(tab.value)}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] px-3 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.06em] transition ${
                  activeSection === tab.value
                    ? 'bg-[#142334] text-white'
                    : 'text-[#142334]/62 hover:bg-[#F5F3EE] hover:text-[#142334]'
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {createError && <Notice tone="error">{createError}</Notice>}

        {activeSection === 'home' && (
          <HomeTab context={context} calendarItems={calendarRecords} backlogItems={backlogRecords} onNavigate={navigateContent} />
        )}

        {activeSection === 'briefs' && (
          <SignalBriefsTab>
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
                {brief ? (
                  <OutputPanel value={brief} className="mt-5 min-h-[360px]" />
                ) : (
                  <SignalBriefEmptyState busy={briefBusy} onGenerate={() => generateSignalBrief()} />
                )}
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
                  <button type="button" onClick={() => brief && startFromBrief(brief)} disabled={!brief} className="studio-ghost-button">
                    Write this post <ChevronRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => saveBriefToBacklog()} disabled={!brief} className="studio-ghost-button">
                    Save to Vault <Save className="h-4 w-4" />
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
          </SignalBriefsTab>
        )}

        {activeSection === 'studio' && (
          <StudioTab>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Studio</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Draft with data, keep approval human</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setStudioMode('create')}
                data-active={studioMode === 'create'}
                className={`studio-mode-card rounded-[12px] border p-5 text-left transition ${
                  studioMode === 'create'
                    ? 'border-[#142334] bg-[#142334] text-white'
                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#142334]'
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Create</span>
                <span className="mt-2 block font-serif text-[26px] leading-tight">Build from scratch</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioMode('transform')}
                data-active={studioMode === 'transform'}
                className={`studio-mode-card studio-transform-mode-card rounded-[12px] border p-5 text-left transition ${
                  studioMode === 'transform'
                    ? 'border-[#C9AD98] bg-[#142334] text-white'
                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#142334]'
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Transform</span>
                <span className="mt-2 block font-serif text-[26px] leading-tight">Turn anything into a post</span>
              </button>
            </div>

            <SmartSuggestPanel
              state={smartSuggestState}
              onSuggest={requestSmartSuggestion}
              onUseThis={(suggestion) => {
                void applySmartSuggestion(suggestion);
              }}
              onGenerateNow={(suggestion) => {
                void applySmartSuggestion(suggestion, { generateAfter: true });
              }}
              onSave={(suggestion) => {
                void saveSmartSuggestionToVault(suggestion);
              }}
              isSaving={smartSuggestSaving}
              isRefreshing={smartSuggestRefreshing}
              isSaved={smartSuggestState.type === 'suggestion' && savedSmartSuggestionKeys.includes(getSmartSuggestionKey(smartSuggestState.data))}
              saveError={smartSuggestSaveError}
              onReset={() => setSmartSuggestState({ type: 'idle' })}
            />

            {studioMode === 'create' && (
              <CreateFlow
                selection={createSelection}
                selectedType={selectedCreateType}
                selectedAngle={selectedAngle}
                selectedAngleDetail={selectedAngleDetail}
                selectedAngleGroups={selectedAngleGroups}
                selectedPlatformLabel={selectedCreatePlatformLabel}
                pillarFocus={createPillarFocus}
                topic={topic}
                topicSource={topicSource}
                topicPlaceholder={createPlaceholder}
                generatedPost={generatedPost}
                formatOutput={createFormatOutput}
                signalBriefOptions={signalBriefOptions}
                canGenerate={canGenerateCreate}
                busy={createBusy}
                topicInputRef={topicInputRef}
                prepopulateNotice={smartPrepopulateNotice}
                pulseKey={smartPulseKey}
                onPlatformSelect={selectCreatePlatform}
                onTypeSelect={selectCreateType}
                onSubTypeSelect={selectCreateSubType}
                onAngleSelect={selectCreateAngle}
                onCarouselSlideCountSelect={selectCarouselSlideCount}
                onTopicChange={(value) => {
                  setSmartPrepopulateNotice(null);
                  setTopic(value);
                  setTopicSource('manual');
                }}
                onTopicSourceSelect={applyTopicSource}
                onBriefSelect={(text) => {
                  setTopic(text);
                  setTopicSource('brief');
                }}
                onGenerate={() => generatePost()}
                onGeneratedPostChange={setGeneratedPost}
                onPolish={polishGeneratedPost}
                onFormatCheck={checkGeneratedFormat}
                onSave={() =>
                  saveOutputToBacklog(
                    generatedPost,
                    topic,
                    selectedOutputPlatform,
                    topic,
                    createPillarFocus === 'auto' ? null : createPillarFocus,
                  )
                }
                onCalendar={() =>
                  setCalendarModal({
                    mode: 'create',
                    defaults: {
                      title: topic.trim() || titleFromText(cleanDraftContent(generatedPost), 'Post idea'),
                      platform: selectedOutputPlatform,
                      draftContent: cleanDraftContent(generatedPost),
                    },
                  })
                }
              />
            )}

            {studioMode === 'transform' && (
              <TransformFlow
                inputTypes={transformInputTypes}
                inputType={alchemyInputType}
                selectedInput={selectedAlchemyInput}
                textContent={alchemySource}
                imagePreview={alchemyImagePreview}
                imageName={alchemyImageName}
                imageSize={alchemyImageSize}
                imageUrl={alchemyImageUrl}
                urlOpen={alchemyUrlOpen}
                targetPlatform={alchemyTargetPlatform}
                selectedPlatformLabel={selectedAlchemyPlatformLabel}
                framework={alchemyFramework}
                output={alchemyOutput}
                stage={alchemyStage}
                loadingMessage={alchemyLoadingMessage}
                busy={createBusy}
                canExtract={canExtractAlchemy}
                canRebuild={canRebuildAlchemy}
                critique={alchemyCritique}
                critiqueLoading={alchemyCritiqueLoading}
                onInputTypeSelect={selectAlchemyInputType}
                onTextChange={(value) => {
                  setAlchemySource(value);
                  setAlchemyFramework(null);
                  setAlchemyOutput('');
                  setAlchemyStage('idle');
                  setAlchemyCritique(null);
                }}
                onImageSelect={handleAlchemyImageFile}
                onImageRemove={clearAlchemyImage}
                onImageUrlChange={setAlchemyImageUrl}
                onUrlOpenChange={setAlchemyUrlOpen}
                onFetchImage={fetchAlchemyImageFromUrl}
                onPlatformSelect={selectAlchemyPlatform}
                onExtract={extractAlchemyStructure}
                onRebuild={buildAlchemyVersion}
                onReset={resetAlchemyFlow}
                onOutputChange={setAlchemyOutput}
                onPolish={polishAlchemyOutput}
                onQualityCheck={runAlchemyCritique}
                onSave={() => saveOutputToBacklog(alchemyOutput, 'Transform rebuild', alchemyOutputPlatform)}
                onCalendar={() =>
                  setCalendarModal({
                    mode: 'create',
                    defaults: {
                      title: titleFromText(cleanDraftContent(alchemyOutput), 'Transform rebuild'),
                      platform: alchemyOutputPlatform,
                      draftContent: cleanDraftContent(alchemyOutput),
                    },
                  })
                }
                directionPillar={alchemyDirectionPillar}
                directionRegister={alchemyDirectionRegister}
                direction={alchemyDirection}
                rebuildMode={alchemyRebuildMode}
                onDirectionPillarChange={setAlchemyDirectionPillar}
                onDirectionRegisterChange={setAlchemyDirectionRegister}
                onDirectionChange={setAlchemyDirection}
                onRebuildModeChange={setAlchemyRebuildMode}
              />
            )}

          </StudioTab>
        )}

        {activeSection === 'editorial' && (
          <EditorialCalendarTab>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Editorial Calendar</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Plan the rhythm before the post</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/62">
                  Four weeks visible. Empty days are intentional space, not failure.
                </p>
                <p className="mt-2 max-w-2xl text-[12px] italic leading-relaxed text-[#6B6B6B]">
                  This is your editorial calendar for content planning. For sessions and appointments, go to Calendar in the main nav.
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
                week.map((day) => {
                  const dayItems = itemsByDate[day] || [];
                  return (
                    <div
                      key={day}
                      className={`min-h-[180px] rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3 ${weekIndex === 0 ? 'lg:min-h-[210px]' : ''}`}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
                        {formatDayLabel(day)}
                      </span>
                      <span className="mt-3 grid gap-2">
                        {dayItems.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setCalendarModal({ mode: 'create', defaults: { publishDate: day } })}
                            className="grid h-24 place-items-center rounded-[8px] border border-dashed border-[#D8C8BB] text-[12px] text-[#142334]/45 transition hover:border-[#142334] hover:bg-[#F2ECE7] hover:text-[#142334]/70"
                          >
                            <span className="flex flex-col items-center gap-1">
                              <Plus className="h-4 w-4" />
                              Add post
                            </span>
                          </button>
                        ) : (
                          <>
                            {dayItems.map((item) => (
                              <CalendarPostCard
                                key={item.id}
                                item={item}
                                onEdit={() => setCalendarModal({ mode: 'edit', item })}
                                onDelete={() => deleteCalendarItemSilent(item.id)}
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => setCalendarModal({ mode: 'create', defaults: { publishDate: day } })}
                              className="flex items-center justify-center gap-1 rounded-[8px] border border-dashed border-[#D8C8BB] py-1.5 text-[11px] text-[#142334]/40 transition hover:border-[#142334]/40 hover:text-[#142334]/70"
                            >
                              <Plus className="h-3 w-3" /> Add
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  );
                }),
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
          </EditorialCalendarTab>
        )}

        {activeSection === 'vault' && (
          <VaultTab>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Vault</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Keep rough thinking and draft ideas moving</h2>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[#142334]/62">
                  Search, sort, and work through unfinished ideas without turning the page into one endless scroll.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (canAddToVaultSection('messy')) setMessyModalOpen(true);
                  }}
                  className="studio-secondary-button"
                >
                  <Plus className="h-4 w-4" /> Add rough idea
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (canAddToVaultSection('ideas')) setBacklogModal({ mode: 'create' });
                  }}
                  className="studio-primary-button"
                >
                  <Plus className="h-4 w-4" /> Add idea
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canAddToVaultSection('insights')) return;
                    setInsightsSuccess(null);
                    setInsightsModalOpen(true);
                  }}
                  className="studio-secondary-button"
                >
                  <FileText className="h-4 w-4" /> Add Insights Article
                </button>
              </div>
            </div>

            {insightsSuccess && (
              <div className="mt-4">
                <Notice>{insightsSuccess}</Notice>
              </div>
            )}

            <div className="mt-5 rounded-[14px] bg-[#F5F3EE] p-3">
              <div className="flex flex-col gap-3 lg:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
                  <span className="sr-only">Search Vault</span>
                  <input
                    value={backlogSearch}
                    onChange={(event) => setBacklogSearch(event.target.value)}
                    placeholder="Search saved ideas, messy notes, Smart Suggests..."
                    className="h-12 w-full rounded-[10px] border border-transparent bg-white pl-11 pr-4 text-[13px] text-[#142334] outline-none transition placeholder:text-[#9A8F86] focus:border-[#C9AD98]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setVaultFiltersOpen((current) => !current)}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border px-5 text-[12px] font-bold uppercase tracking-[0.14em] transition ${
                    vaultFiltersOpen
                      ? 'border-[#142334] bg-[#142334] text-white'
                      : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98]'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>
              </div>

              {vaultFiltersOpen && (
                <div className="mt-3 grid gap-3 rounded-[10px] bg-white p-3 md:grid-cols-4">
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
                  <select value={backlogPlatformFilter} onChange={(event) => setBacklogPlatformFilter(event.target.value as 'all' | ContentPlatform)} className="studio-input h-11">
                    <option value="all">All platforms</option>
                    {Object.entries(platformLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setBacklogSearch('');
                      setBacklogPillarFilter('all');
                      setBacklogStatusFilter('all');
                      setBacklogPlatformFilter('all');
                    }}
                    className="studio-card-action-button h-11 w-full"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {vaultSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeVaultSection === section.value;
                const policy = vaultPolicies[section.value];
                const sectionCount = vaultTotals[section.value];
                const isFull = sectionCount >= policy.maxItems;
                return (
                  <button
                    key={section.value}
                    type="button"
                    onClick={() => setActiveVaultSection(section.value)}
                    className={`flex min-h-[92px] items-start gap-3 rounded-[12px] border p-4 text-left transition ${
                      isActive
                        ? 'border-[#142334] bg-[#142334] text-white'
                        : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#F8F6F4]'
                    }`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isActive ? 'bg-white/12 text-[#C9AD98]' : 'bg-[#F5F3EE] text-[#C9AD98]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
                        {section.label}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${isActive ? 'bg-white text-[#142334]' : 'bg-[#F5F3EE] text-[#6B6B6B]'}`}>
                          {sectionCount}/{policy.maxItems}
                        </span>
                      </span>
                      <span className={`mt-2 block text-[12px] leading-relaxed ${isActive ? 'text-white/70' : 'text-[#142334]/60'}`}>
                        {isFull ? 'Full - delete older items to make room.' : section.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="mt-5 rounded-[12px] bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">{activeVaultMeta.label}</p>
                  <h3 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">{activeVaultMeta.description}</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">
                    Holds {vaultPolicies[activeVaultSection].maxItems} items. Auto-deletes after {vaultPolicies[activeVaultSection].retentionDays} days, with a warning {vaultPolicies[activeVaultSection].warningDays} days before expiry.
                  </p>
                </div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6B6B6B]">
                  {activeVaultRecords.length} showing
                </p>
              </div>

              <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
                {activeVaultRecords.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-[#D8C8BB] bg-[#F8F6F4] p-6">
                    {activeVaultSection === 'messy' ? (
                      <>
                        <PenLine className="h-7 w-7 text-[#C9AD98]" />
                        <p className="mt-4 font-serif text-[24px] leading-tight text-[#142334]">Nothing messy here yet.</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/62">
                          Drop rough ideas, half-formed thoughts, or anything worth keeping.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (canAddToVaultSection('messy')) setMessyModalOpen(true);
                          }}
                          className="studio-secondary-button mt-5"
                        >
                          <Plus className="h-4 w-4" /> Add rough idea
                        </button>
                      </>
                    ) : (
                      <>
                        <Archive className="h-7 w-7 text-[#C9AD98]" />
                        <p className="mt-4 font-serif text-[24px] leading-tight text-[#142334]">Nothing matches this view.</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/62">
                          Clear the filters or save a new idea into this Vault section.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  activeVaultRecords.map((item) => {
                    const expiryInfo = vaultExpiryById.get(item.id) || getVaultExpiryInfo(item);
                    return (
                      <article key={item.id} className="flex min-h-[260px] flex-col justify-between rounded-[10px] border border-[#E4D8CB] bg-white p-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={activeVaultSection === 'messy' ? 'bg-[#F3E8FF] text-[#7C3AED]' : 'bg-[#F5F3EE] text-[#6B6B6B]'}>
                            {activeVaultSection === 'messy' ? 'Rough Thought' : getBacklogSourceLabel(item)}
                          </Badge>
                          {item.pillar && <Badge className={pillarMeta[item.pillar].className}>{pillarMeta[item.pillar].label}</Badge>}
                          <Badge className={backlogStatusMeta[item.status].className}>{backlogStatusMeta[item.status].label}</Badge>
                          {item.platform && <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{platformLabels[item.platform]}</Badge>}
                          <Badge className={getVaultCountdownClassName(expiryInfo)}>{getVaultCountdownLabel(expiryInfo)}</Badge>
                        </div>
                        <h3 className="mt-3 line-clamp-3 font-serif text-[22px] leading-tight text-[#142334]">
                          {extractCleanTitle(item.title, item.content ?? '')}
                        </h3>
                        <p className="mt-2 line-clamp-5 text-[13px] leading-relaxed text-[#142334]/62">
                          {extractPreview(item.content || item.title)}
                        </p>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
                          Updated {formatDisplayDate(item.updatedAt.slice(0, 10))}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E4D8CB] pt-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {activeVaultSection !== 'messy' && (
                            <button type="button" onClick={() => setBacklogModal({ mode: 'edit', item })} className="studio-card-action-button">
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              resetSmartSuggestSession();
                              setTopic(extractPostBody(item.content || item.title));
                              setStudioMode('create');
                              setTopicSource('manual');
                              setActiveSection('studio');
                            }}
                            className="studio-card-action-button"
                          >
                            Open in Studio
                          </button>
                          {activeVaultSection === 'messy' ? (
                            <>
                              <button type="button" onClick={() => moveMessyMiddleToBacklog(item)} className="studio-card-action-button">
                                Move to Ideas
                              </button>
                              <button type="button" onClick={() => archiveMessyMiddle(item)} className="studio-card-action-button">
                                Archive
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarModal({
                                  mode: 'create',
                                  defaults: {
                                    title: extractCleanTitle(item.title, item.content ?? ''),
                                    pillar: item.pillar || 'career_growth',
                                    platform: item.platform || 'linkedin',
                                    draftContent: extractPostBody(item.content || ''),
                                  },
                                })
                              }
                              className="studio-card-action-button"
                            >
                              Add to Calendar
                            </button>
                          )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center justify-end">
                          {confirmingBacklogDeleteId === item.id ? (
                            <span className="inline-flex h-[30px] items-center gap-1 rounded-full border border-[#F2C6B8] bg-[#FFF5F2] px-2">
                              <span className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A2F1D]">Delete?</span>
                              <button
                                type="button"
                                onClick={() => setConfirmingBacklogDeleteId(null)}
                                className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B6B6B] transition hover:text-[#142334]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBacklogItem(item)}
                                className="rounded-full bg-[#A24E37] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#7F3828]"
                              >
                                Delete
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingBacklogDeleteId(item.id)}
                              className="studio-ghost-icon studio-card-action-icon text-[#A24E37]"
                              aria-label="Delete vault item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </VaultTab>
        )}

        {activeSection === 'research' && (
          <ResearchVaultTab
            entries={researchRecords}
            adminKey={adminKey}
            onAdd={(entry) => setResearchRecords((current) => [entry, ...current])}
            onUpdate={(entry) =>
              setResearchRecords((current) =>
                current.map((r) => (r.id === entry.id ? entry : r)),
              )
            }
            onArchive={(id) =>
              setResearchRecords((current) => current.filter((r) => r.id !== id))
            }
          />
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
            setActiveSection('editorial');
          }}
          onDelete={
            calendarModal.mode === 'edit' && calendarModal.item
              ? () => {
                  deleteCalendarItemSilent(calendarModal.item!.id);
                  setCalendarModal(null);
                }
              : undefined
          }
        />
      )}

      {backlogModal && (
        <BacklogEntryModal
          key={`${backlogModal.mode}-${backlogModal.item?.id || 'new'}`}
          state={backlogModal}
          adminKey={adminKey}
          onBeforeCreate={() => canAddToVaultSection('ideas')}
          onClose={() => setBacklogModal(null)}
          onSaved={(item) => {
            setBacklogRecords((current) =>
              backlogModal.mode === 'edit'
                ? current.map((record) => (record.id === item.id ? item : record))
                : [item, ...current],
            );
            setBacklogModal(null);
            setActiveVaultSection(isSmartSuggestItem(item) ? 'smart' : isInsightsBacklogItem(item) ? 'insights' : isMessyMiddleItem(item) ? 'messy' : 'ideas');
            setActiveSection('vault');
          }}
        />
      )}

      {messyModalOpen && (
        <MessyMiddleModal
          onClose={() => setMessyModalOpen(false)}
          onSave={saveMessyMiddle}
        />
      )}

      {insightsModalOpen && (
        <InsightsArticleModal
          onClose={() => setInsightsModalOpen(false)}
          onSave={saveInsightsArticle}
        />
      )}

      {vaultLimitModal && (
        <VaultLimitModal
          section={vaultLimitModal.section}
          currentCount={vaultLimitModal.currentCount}
          onClose={() => setVaultLimitModal(null)}
          onReview={() => {
            setBacklogSearch('');
            setBacklogPillarFilter('all');
            setBacklogStatusFilter('all');
            setBacklogPlatformFilter('all');
            setBacklogModal(null);
            setMessyModalOpen(false);
            setInsightsModalOpen(false);
            setVaultLimitModal(null);
            openVaultSection(vaultLimitModal.section);
          }}
        />
      )}
    </section>
  );
}

function ContentTopBar({
  adminKey,
  searchValue,
  searchResults,
  updatedTimeLabel,
  attentionCount,
  attentionLabel,
  notificationCount,
  extraNotificationSections,
  onSearchChange,
  onSearchSubmit,
  onSearchResultSelect,
  onNewDraft,
}: {
  adminKey: string;
  searchValue: string;
  searchResults: ContentSearchResult[];
  updatedTimeLabel: string;
  attentionCount: number;
  attentionLabel: string;
  notificationCount: number;
  extraNotificationSections: NotificationPanelSection[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSearchResultSelect: (result: ContentSearchResult) => void;
  onNewDraft: () => void;
}) {
  const normalizedSearch = searchValue.trim();

  return (
    <div className="rounded-[8px] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A09086]">Welcome,</p>
          <h2 className="mt-0.5 font-serif text-[22px] leading-none text-[#142334]">Kagiso</h2>
        </div>

        <form onSubmit={onSearchSubmit} className="relative min-w-[260px] flex-1 lg:max-w-[560px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09086]" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find draft, signal, planned post..."
            className="h-11 w-full rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] pl-10 pr-3 text-[13px] font-medium text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
          />
          {normalizedSearch && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[8px] border border-[#E4D8CB] bg-white">
              {searchResults.length > 0 ? (
                <div className="max-h-[280px] overflow-y-auto p-2" onWheel={trapWheel}>
                  {searchResults.map((result) => (
                    <button
                      key={`${result.section}-${result.id}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onSearchResultSelect(result)}
                      className="flex w-full items-start justify-between gap-3 rounded-[8px] px-3 py-2 text-left transition hover:bg-[#F8F6F4]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-[#142334]">{result.title}</span>
                        <span className="mt-0.5 block text-[11px] text-[#6B6B6B]">{result.detail}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F5F3EE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                        {result.tag}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-[13px] text-[#6B6B6B]">No content records found.</p>
              )}
            </div>
          )}
        </form>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A09086]">Updated {updatedTimeLabel} SAST</p>
            <p className="mt-0.5 max-w-[280px] truncate text-[12px] font-medium text-[#6B6B6B]">{attentionLabel}</p>
          </div>

          <FollowUpNotificationBell
            adminKey={adminKey}
            notificationCount={notificationCount}
            extraSections={extraNotificationSections}
            panelSubtitle={`${attentionCount} content item${attentionCount === 1 ? '' : 's'} and lead follow-ups need attention.`}
          />

          <div className="flex items-center gap-2 rounded-full bg-[#F8F6F4] p-1 pr-3">
            <Image
              src="/images/author/ck-profile.png"
              alt="Kagiso"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="hidden text-[12px] font-semibold text-[#142334] sm:inline">Coach Kagiso</span>
          </div>

          <button
            type="button"
            onClick={onNewDraft}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334]"
          >
            <Plus className="h-4 w-4" />
            New draft
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartSuggestPanel({
  state,
  onSuggest,
  onUseThis,
  onGenerateNow,
  onSave,
  isSaving,
  isRefreshing,
  isSaved,
  saveError,
  onReset,
}: {
  state: SmartSuggestState;
  onSuggest: () => void;
  onUseThis: (suggestion: SmartSuggestion) => void;
  onGenerateNow: (suggestion: SmartSuggestion) => void;
  onSave: (suggestion: SmartSuggestion) => void;
  isSaving: boolean;
  isRefreshing: boolean;
  isSaved: boolean;
  saveError: string | null;
  onReset: () => void;
}) {
  return (
    <section className="mt-4">
      {state.type === 'idle' && (
        <div className="rounded-[12px] bg-[#F5F3EE] p-3">
          <button
            type="button"
            onClick={onSuggest}
            className="group flex w-full items-center justify-center rounded-[10px] bg-[#142334] px-5 py-3 text-center text-white transition hover:bg-[#20354D]"
          >
            <span className="min-w-0">
              <span className="flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
                <Sparkles className="h-4 w-4 text-[#C9AD98]" />
                Smart Suggest
              </span>
              <span className="mt-1 block text-[12px] font-medium leading-relaxed text-white/70">
                Not sure what to create? AI recommends from gaps, signals, pillars, and insights.
              </span>
            </span>
          </button>
        </div>
      )}

      {state.type === 'loading' && (
        <div className="rounded-[12px] bg-[#F5F3EE] p-3">
          <div className="flex w-full items-center justify-center rounded-[10px] bg-[#BFA490] px-5 py-3 text-center text-[#142334]">
            <span className="flex min-w-0 items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em]">
              <span className="contents">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="smart-thinking-words">
                  <span>Reading your content gaps</span>
                  <span>Checking your pillar balance</span>
                  <span>Scanning for what&apos;s trending in SA</span>
                  <span>Finding the strongest opportunity</span>
                  <span>Almost there</span>
                </span>
              </span>
            </span>
          </div>
        </div>
      )}

      {state.type === 'error' && (
        <div className="rounded-[12px] border border-dashed border-[#F2C6B8] bg-[#FFF5F2] p-5">
          <p className="text-[13px] font-semibold text-[#8A2F1D]">{state.message}</p>
          <button type="button" onClick={onSuggest} className="studio-secondary-button mt-4">
            Try again
          </button>
        </div>
      )}

      {state.type === 'suggestion' && (
        <div className="rounded-[12px] border border-[#142334] bg-white p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(state.data.sources.length ? state.data.sources : (['lead_signal'] as SmartSuggestSource[])).map((source) => (
                <span key={source} className="rounded-full bg-[#F5F3EE] px-3 py-1 text-[11px] font-semibold text-[#6B6B6B]">
                  {smartSourceLabels[source]}
                </span>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onSave(state.data)}
                disabled={isSaving || isSaved}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E4D8CB] px-3 text-[12px] font-semibold text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onSuggest}
                disabled={isRefreshing}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition disabled:cursor-wait ${
                  isRefreshing
                    ? 'border-[#BFA490] bg-[#BFA490] text-[#142334]'
                    : 'border-transparent text-[#6B6B6B] hover:border-[#C9AD98] hover:bg-[#F5F3EE] hover:text-[#142334]'
                }`}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    Suggest Again <RefreshCcw className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
              <button type="button" onClick={onReset} className="grid h-8 w-8 place-items-center rounded-full bg-[#F5F3EE] text-[#142334] transition hover:bg-[#E4D8CB]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <p className="font-serif text-[22px] leading-tight text-[#C9AD98]">{state.data.angleDisplayName}</p>
            <p className="text-[15px] font-semibold leading-relaxed text-[#142334]">{state.data.assignment}</p>
            <p className="text-[13px] leading-relaxed text-[#6B6B6B]">{state.data.whyNow}</p>
            {state.data.citation && (
              <p className="flex items-start gap-1 text-[11px] text-[#6B6B6B]">
                <span className="mt-px shrink-0 text-[#C9AD98]">↗</span>
                <span>
                  Based on:{' '}
                  <span className="italic">
                    &ldquo;{state.data.citation.headline.length > 60
                      ? state.data.citation.headline.slice(0, 60) + '…'
                      : state.data.citation.headline}&rdquo;
                  </span>
                  {' '}—{' '}
                  {(() => {
                    try {
                      return new URL(state.data.citation.source).hostname;
                    } catch {
                      return state.data.citation.source;
                    }
                  })()}
                  {state.data.citation.date && state.data.citation.date !== 'Recent'
                    ? ` · ${state.data.citation.date}`
                    : ''}
                </span>
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className="bg-[#BFDBFE] text-[#1E40AF]">{createPlatformLabels[state.data.platform]}</Badge>
            <Badge className="bg-[#F5F3EE] text-[#142334]">{getSmartSuggestionContentLabel(state.data)}</Badge>
            <Badge className={pillarMeta[state.data.pillar].className}>{pillarMeta[state.data.pillar].label}</Badge>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button type="button" onClick={() => onUseThis(state.data)} className="h-11 rounded-full bg-[#C9AD98] px-5 text-[14px] font-bold text-[#142334] transition hover:bg-[#BFA490]">
              Use This
            </button>
            <button type="button" onClick={() => onGenerateNow(state.data)} className="h-11 rounded-full bg-[#142334] px-5 text-[14px] font-bold text-white transition hover:bg-[#20354D]">
              Generate Now <ChevronRight className="ml-1 inline h-4 w-4" />
            </button>
          </div>
          {saveError && <p className="mt-3 text-[12px] font-semibold text-[#8A2F1D]">{saveError}</p>}
        </div>
      )}
    </section>
  );
}

function TransformFlow({
  inputTypes,
  inputType,
  selectedInput,
  textContent,
  imagePreview,
  imageName,
  imageSize,
  imageUrl,
  urlOpen,
  targetPlatform,
  selectedPlatformLabel,
  framework,
  output,
  stage,
  loadingMessage,
  busy,
  canExtract,
  canRebuild,
  critique,
  critiqueLoading,
  directionPillar,
  directionRegister,
  direction,
  rebuildMode,
  onInputTypeSelect,
  onTextChange,
  onImageSelect,
  onImageRemove,
  onImageUrlChange,
  onUrlOpenChange,
  onFetchImage,
  onPlatformSelect,
  onExtract,
  onRebuild,
  onReset,
  onOutputChange,
  onPolish,
  onQualityCheck,
  onSave,
  onCalendar,
  onDirectionPillarChange,
  onDirectionRegisterChange,
  onDirectionChange,
  onRebuildModeChange,
}: {
  inputTypes: typeof transformInputTypes;
  inputType: TransformInputType;
  selectedInput: (typeof transformInputTypes)[number];
  textContent: string;
  imagePreview: string;
  imageName: string;
  imageSize: number;
  imageUrl: string;
  urlOpen: boolean;
  targetPlatform: CreatePlatform | 'auto';
  selectedPlatformLabel: string;
  framework: ExtractedFramework | null;
  output: string;
  stage: TransformStage;
  loadingMessage: string;
  busy: boolean;
  canExtract: boolean;
  canRebuild: boolean;
  critique: AlchemyCritique | null;
  critiqueLoading: boolean;
  directionPillar: ContentPillar | 'auto';
  directionRegister: string;
  direction: string;
  rebuildMode: 'simple' | 'advanced';
  onInputTypeSelect: (inputType: TransformInputType) => void;
  onTextChange: (value: string) => void;
  onImageSelect: (file: File | null) => void;
  onImageRemove: () => void;
  onImageUrlChange: (value: string) => void;
  onUrlOpenChange: (value: boolean) => void;
  onFetchImage: () => void;
  onPlatformSelect: (platform: CreatePlatform | 'auto') => void;
  onExtract: () => void;
  onRebuild: () => void;
  onReset: () => void;
  onOutputChange: (value: string) => void;
  onPolish: () => void;
  onQualityCheck: () => void;
  onSave: () => void;
  onCalendar: () => void;
  onDirectionPillarChange: (value: ContentPillar | 'auto') => void;
  onDirectionRegisterChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onRebuildModeChange: (value: 'simple' | 'advanced') => void;
}) {
  const inputId = 'transform-screenshot-upload';
  const outputBody = cleanDraftContent(output);
  const hasImage = Boolean(imagePreview);
  const isLoading = stage === 'extracting' || stage === 'rebuilding';
  const transformationNote = output ? (
    <>
      Transformed from {selectedInput.label.toLowerCase()} - structure extracted, original wording discarded.
    </>
  ) : null;

  return (
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
                Transform extracts the structure first, discards the source material, then rebuilds from that framework in Kagiso&apos;s voice.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[8px] bg-white p-5">
          <TransformStepHeader number="01" title="What are you bringing?" description="Choose the raw material so the AI knows what kind of structure to extract." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {inputTypes.map((source) => {
              const isSelected = inputType === source.value;
              return (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => onInputTypeSelect(source.value)}
                  style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
                  className={`rounded-[8px] border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                      : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                  }`}
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${isSelected ? 'bg-white/12 text-white' : 'bg-white text-[#C9AD98]'}`}>
                    {getTransformInputIcon(source.value)}
                  </span>
                  <span className="mt-3 block text-[13px] font-bold">{source.label}</span>
                  <span className={`mt-1 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/58'}`}>{source.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[8px] bg-white p-5">
          <TransformStepHeader number="02" title={selectedInput.inputLabel} description="The source material is used only for Stage 1, then cleared before the rebuild." />
          {inputType === 'image' ? (
            <div className="mt-4">
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => onImageSelect(event.target.files?.[0] || null)}
              />
              {!hasImage ? (
                <label
                  htmlFor={inputId}
                  className="flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#E4D8CB] bg-[#F5F3EE] p-10 text-center transition hover:border-[#C9AD98] hover:bg-white"
                >
                  <Upload className="h-8 w-8 text-[#C9AD98]" />
                  <span className="mt-3 text-[14px] font-semibold text-[#142334]">Drop a screenshot here or click to upload</span>
                  <span className="mt-1 text-[11px] text-[#6B6B6B]">JPEG, PNG, WebP. Max 10MB.</span>
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-[12px] border border-[#E4D8CB] bg-[#F5F3EE] p-4">
                  <Image src={imagePreview} alt="" width={80} height={80} unoptimized className="h-20 w-20 rounded-[8px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#142334]">{imageName || 'Screenshot'}</p>
                    {formatImageSize(imageSize) && <p className="mt-1 text-[11px] text-[#6B6B6B]">{formatImageSize(imageSize)}</p>}
                    <button type="button" onClick={onImageRemove} className="mt-2 text-[12px] font-semibold text-red-600 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                </div>
              )}
              <button type="button" onClick={() => onUrlOpenChange(!urlOpen)} className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#142334]">
                <Link2 className="h-3.5 w-3.5" />
                Or paste a URL instead
              </button>
              {urlOpen && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) => onImageUrlChange(event.target.value)}
                    placeholder="Paste a link to an image or screenshot..."
                    className="studio-input h-11 flex-1"
                  />
                  <button type="button" onClick={onFetchImage} disabled={busy || !imageUrl.trim()} className="studio-secondary-button sm:w-fit">
                    Fetch image <Link2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <TextareaField
                label={selectedInput.inputLabel}
                value={textContent}
                onChange={onTextChange}
                rows={9}
                placeholder={selectedInput.placeholder}
              />
            </div>
          )}
        </section>

        <section className="rounded-[8px] bg-white p-5">
          <TransformStepHeader number="03" title="Rebuild" description="Extract the structure first, then rebuild once Kagiso can see the framework." />
          {!framework && (
            <button type="button" onClick={onExtract} disabled={busy || !canExtract} className="studio-primary-button mt-4 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Extract structure
            </button>
          )}
          {framework && (
            <p className="mt-3 text-[12px] text-[#6B6B6B]">The rebuild button is on the right panel →</p>
          )}
          {isLoading && loadingMessage && <p className="mt-3 text-center text-[12px] font-semibold text-[#C9AD98]">{loadingMessage}</p>}
        </section>
      </div>

      <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-32px)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1 [scrollbar-gutter:stable]" onWheel={trapWheel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Transformation</p>
            <h3 className="mt-2 font-serif text-[30px] leading-tight text-[#142334]">Structure first. Original voice second.</h3>
          </div>
          <Badge className="bg-white text-[#6B6B6B]">Approval required</Badge>
        </div>

        {!framework && !output && (
          <div className="mt-6 grid min-h-[360px] place-items-center rounded-[8px] border border-dashed border-[#D8C8BA] bg-white p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F5F3EE] text-[#C9AD98]">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-5 font-serif text-[26px] leading-tight text-[#142334]">The framework appears here first.</p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#142334]/62">
                Kagiso will see the extracted pattern before the rebuild. The source wording is cleared before Stage 2.
              </p>
            </div>
          </div>
        )}

        {framework && (
          <div className="mt-6 rounded-[12px] border border-[#E4D8CB] bg-[#F5F3EE] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Extracted structure</p>
                <h4 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">Only the pattern survived</h4>
              </div>
              <Badge className="bg-white text-[#6B6B6B]">{selectedInput.label}</Badge>
            </div>
            <div className="mt-4 divide-y divide-[#E4D8CB] rounded-[8px] bg-white">
              {getFrameworkRows(framework).map((row) => (
                <div key={row.label} className="grid gap-2 px-4 py-3 text-[13px] sm:grid-cols-[120px_1fr]">
                  <span className="font-semibold text-[#6B6B6B]">{row.label}</span>
                  <span className="leading-relaxed text-[#142334]">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-1 rounded-[8px] border border-[#E4D8CB] bg-white p-1">
              <button
                type="button"
                onClick={() => onRebuildModeChange('simple')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[6px] px-3 py-2 text-[12px] font-semibold transition ${rebuildMode === 'simple' ? 'bg-[#142334] text-white' : 'text-[#6B6B6B] hover:text-[#142334]'}`}
              >
                <Zap className="h-3.5 w-3.5" />
                Simple
              </button>
              <button
                type="button"
                onClick={() => onRebuildModeChange('advanced')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[6px] px-3 py-2 text-[12px] font-semibold transition ${rebuildMode === 'advanced' ? 'bg-[#142334] text-white' : 'text-[#6B6B6B] hover:text-[#142334]'}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced
              </button>
            </div>

            {rebuildMode === 'simple' && (
              <p className="mt-2 text-[11px] text-[#6B6B6B]">AI decides the pillar, voice, platform, and format based on the structure.</p>
            )}

            {rebuildMode === 'advanced' && (
              <div className="mt-3 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Pillar</label>
                    <select
                      value={directionPillar}
                      onChange={(e) => onDirectionPillarChange(e.target.value as ContentPillar | 'auto')}
                      className="mt-1 w-full rounded-[6px] border border-[#D8C8BA] bg-[#F8F6F4] px-3 py-2 text-[12px] text-[#142334] focus:border-[#142334] focus:outline-none"
                    >
                      {alchemyDirectionPillarOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Register</label>
                    <select
                      value={directionRegister}
                      onChange={(e) => onDirectionRegisterChange(e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-[#D8C8BA] bg-[#F8F6F4] px-3 py-2 text-[12px] text-[#142334] focus:border-[#142334] focus:outline-none"
                    >
                      {alchemyDirectionRegisterOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Platform</label>
                    <select
                      value={targetPlatform}
                      onChange={(e) => onPlatformSelect(e.target.value as CreatePlatform | 'auto')}
                      className="mt-1 w-full rounded-[6px] border border-[#D8C8BA] bg-[#F8F6F4] px-3 py-2 text-[12px] text-[#142334] focus:border-[#142334] focus:outline-none"
                    >
                      <option value="auto">Auto (AI decides)</option>
                      {createPlatformOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Additional direction</label>
                  <textarea
                    value={direction}
                    onChange={(e) => onDirectionChange(e.target.value)}
                    onWheel={trapWheel}
                    rows={2}
                    placeholder="e.g. Make this about leadership for first-time managers, targeting The Quiet Pivoter..."
                    className="mt-1 w-full rounded-[6px] border border-[#D8C8BA] bg-[#F8F6F4] px-3 py-2 text-[12px] text-[#142334] placeholder:text-[#B0A89E] focus:border-[#142334] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onRebuild} disabled={busy || !canRebuild} className="studio-primary-button w-full sm:w-fit">
                {stage === 'rebuilding' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Rebuild in Kagiso&apos;s voice
              </button>
              <button type="button" onClick={onReset} className="studio-ghost-button w-full sm:w-fit">
                Start over
              </button>
            </div>
          </div>
        )}

        {output && (
          <div className="mt-5">
            <OutputWithActions
              title="Transform rebuild"
              value={output}
              wordCount={getWordCount(outputBody)}
              platformLabel={selectedPlatformLabel || 'LinkedIn'}
              contentTypeLabel="Transform rebuild"
              onChange={onOutputChange}
              onRegenerate={onRebuild}
              onPolish={onPolish}
              onSave={onSave}
              onCalendar={onCalendar}
              outputNote={transformationNote}
              extraAction={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRebuildModeChange('advanced')}
                    className="flex items-center gap-1.5 rounded-[6px] border border-[#D8C8BA] px-3 py-1.5 text-[11px] font-semibold text-[#6B6B6B] transition hover:border-[#142334] hover:text-[#142334]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Change direction
                  </button>
                  <button
                    type="button"
                    onClick={onQualityCheck}
                    disabled={critiqueLoading}
                    className="flex items-center gap-1.5 rounded-[6px] border border-[#D8C8BA] px-3 py-1.5 text-[11px] font-semibold text-[#6B6B6B] transition hover:border-[#142334] hover:text-[#142334] disabled:opacity-50"
                  >
                    {critiqueLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Quality check
                  </button>
                </div>
              }
            />
            {critique && (
              <div className={`mt-3 rounded-[6px] border p-3 text-[12px] ${critique.passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${critique.passed ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className={`font-semibold ${critique.passed ? 'text-green-800' : 'text-amber-800'}`}>
                    {critique.passed ? 'Quality check passed' : 'Quality check - issues found'}
                  </span>
                </div>
                <div className="mt-2 grid gap-1.5">
                  {[
                    { label: 'Pillar', status: critique.pillarAlignment, note: critique.pillarNote },
                    { label: 'Voice', status: critique.voiceMatch, note: critique.voiceNote },
                    { label: 'SA Context', status: critique.saContext, note: critique.saNote },
                  ].map((check) => (
                    <div key={check.label} className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-block h-1.5 w-1.5 rounded-full ${check.status === 'pass' ? 'bg-green-500' : check.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span><strong>{check.label}:</strong> {check.note}</span>
                    </div>
                  ))}
                </div>
                {critique.brandViolations.length > 0 && (
                  <div className="mt-2 border-t border-amber-200 pt-2">
                    <span className="font-semibold text-red-700">Brand violations:</span>
                    <ul className="ml-4 mt-0.5 list-disc">{critique.brandViolations.map((violation, index) => <li key={`${violation}-${index}`}>{violation}</li>)}</ul>
                  </div>
                )}
                {critique.suggestions.length > 0 && (
                  <div className="mt-2 border-t border-amber-200 pt-2">
                    <span className="font-semibold text-[#6B6B6B]">Suggestions:</span>
                    <ul className="ml-4 mt-0.5 list-disc">{critique.suggestions.map((suggestion, index) => <li key={`${suggestion}-${index}`}>{suggestion}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TransformStepHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#142334] text-[14px] font-bold text-white">{number}</span>
      <div>
        <p className="font-serif text-[22px] leading-tight text-[#142334]">{title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#6B6B6B]">{description}</p>
      </div>
    </div>
  );
}

function CreateFlow({
  selection,
  selectedType,
  selectedAngle,
  selectedAngleDetail,
  selectedAngleGroups,
  selectedPlatformLabel,
  pillarFocus,
  topic,
  topicSource,
  topicPlaceholder,
  generatedPost,
  formatOutput,
  signalBriefOptions,
  canGenerate,
  busy,
  topicInputRef,
  prepopulateNotice,
  pulseKey,
  onPlatformSelect,
  onTypeSelect,
  onSubTypeSelect,
  onAngleSelect,
  onCarouselSlideCountSelect,
  onTopicChange,
  onTopicSourceSelect,
  onBriefSelect,
  onGenerate,
  onGeneratedPostChange,
  onPolish,
  onFormatCheck,
  onSave,
  onCalendar,
}: {
  selection: CreateSelection;
  selectedType: ContentTypeOption | null;
  selectedAngle: AngleOption | null;
  selectedAngleDetail: ReturnType<typeof getAngleDetail>;
  selectedAngleGroups: AngleGroup[];
  selectedPlatformLabel: string;
  pillarFocus: CreatePillarFocus;
  topic: string;
  topicSource: TopicSource;
  topicPlaceholder: string;
  generatedPost: string;
  formatOutput: string;
  signalBriefOptions: Array<{ id: string; title: string; text: string }>;
  canGenerate: boolean;
  busy: boolean;
  topicInputRef: Ref<HTMLTextAreaElement>;
  prepopulateNotice: string | null;
  pulseKey: SmartPulseKey | null;
  onPlatformSelect: (platform: CreatePlatform) => void;
  onTypeSelect: (type: ContentTypeOption) => void;
  onSubTypeSelect: (subType: string) => void;
  onAngleSelect: (angle: AngleOption) => void;
  onCarouselSlideCountSelect: (slideCount: CarouselSlideCount) => void;
  onTopicChange: (value: string) => void;
  onTopicSourceSelect: (source: TopicSource) => void;
  onBriefSelect: (text: string) => void;
  onGenerate: () => void;
  onGeneratedPostChange: (value: string) => void;
  onPolish: () => void;
  onFormatCheck: () => void;
  onSave: () => void;
  onCalendar: () => void;
}) {
  const contentTypeGroups = selection.platform ? contentTypesByPlatform[selection.platform] : [];
  const contentTypes = contentTypeGroups.flatMap((group) => group.types);
  const contentRows = chunkItems(contentTypes, 3);
  const selectedSubType = selectedType?.subTypes.find((item) => item.id === selection.subType) || null;
  const angleReady = Boolean(selectedType && (selectedType.subTypes.length === 0 || selection.subType));
  const needsCarouselSlideCount = selection.contentType === 'carousel' && Boolean(selection.angle);
  const outputTitle = selection.contentType === 'voice_note' ? 'Voice note script' : 'Content preview';
  const generatedPostBody = cleanDraftContent(generatedPost);
  const outputNote = generatedPost ? (
    selection.contentType === 'voice_note' ? (
      <>~{getEstimatedReadSeconds(generatedPostBody)} seconds read time</>
    ) : (
      <>
        {selectedPlatformLabel}
        {selectedType ? ` - ${selectedType.label}${selectedSubType ? ` / ${selectedSubType.label}` : ''}` : ''}
      </>
    )
  ) : null;
  const carouselSlideCountSection = needsCarouselSlideCount ? (
    <section
      className="rounded-[8px] border border-[#E4D8CB] bg-white p-5 outline outline-1 outline-[#C9AD98]/70"
      style={{ outline: '1px solid rgba(201, 173, 152, 0.7)' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">04 Slide Count</p>
          <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">How deep should the carousel go?</h3>
        </div>
        <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">
          {getCarouselSlideCountOption(selection.carouselSlideCount).label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {carouselSlideCountOptions.map((option) => {
          const isSelected = selection.carouselSlideCount === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onCarouselSlideCountSelect(option.value)}
              style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
              className={`min-h-11 rounded-[8px] border px-4 py-3 text-center text-[13px] font-semibold transition ${
                isSelected
                  ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                  : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334]/68 hover:border-[#C9AD98] hover:bg-white hover:text-[#142334]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[13px] font-medium leading-relaxed text-[#142334]/62">
        {getCarouselSlideCountOption(selection.carouselSlideCount).description}
      </p>
    </section>
  ) : null;

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.76fr)_minmax(430px,0.5fr)] 2xl:grid-cols-[minmax(0,0.68fr)_minmax(500px,0.48fr)]">
      <div className="grid gap-4">
        <section className="rounded-[8px] bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">01 Platform</p>
              <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">Where are we creating?</h3>
            </div>
            {selectedPlatformLabel && <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{selectedPlatformLabel}</Badge>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {createPlatformOptions.map((platformOption) => {
              const PlatformIcon = platformOption.icon;
              const isSelected = selection.platform === platformOption.id;
              return (
                <button
                  key={platformOption.id}
                  type="button"
                  onClick={() => onPlatformSelect(platformOption.id)}
                  style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
                  className={`min-h-[104px] rounded-[8px] border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                      : 'border-[#E4D8CB] bg-white text-[#142334] hover:bg-[#F5F3EE]'
                  } ${isSelected && pulseKey === 'platform' ? 'animate-pulse' : ''}`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-full ${isSelected ? 'bg-white/12 text-white' : 'bg-[#F5F3EE] text-[#C9AD98]'}`}>
                    <PlatformIcon className="h-4 w-4" />
                  </span>
                  <span className="mt-3 block text-[15px] font-bold">{platformOption.label}</span>
                  <span className={`mt-1 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/60'}`}>
                    {platformOption.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selection.platform && (
          <section className="rounded-[8px] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">02 What to create</p>
                <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">Choose the working format</h3>
              </div>
              {selectedType && <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{selectedType.label}</Badge>}
            </div>
            <div className="mt-4 grid gap-3">
              {contentRows.map((row, rowIndex) => {
                const rowHasSelected = row.some((type) => type.id === selection.contentType);
                return (
                  <div key={`content-row-${rowIndex}`} className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {row.map((type) => {
                        const TypeIcon = type.icon;
                        const isSelected = selection.contentType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => onTypeSelect(type)}
                            style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
                            className={`min-h-[98px] rounded-[8px] border p-4 text-left transition ${
                              isSelected
                                ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                                : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                            } ${isSelected && pulseKey === 'content' ? 'animate-pulse' : ''}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-full ${isSelected ? 'bg-white/12 text-white' : 'bg-white text-[#C9AD98]'}`}>
                              <TypeIcon className="h-4 w-4" />
                            </span>
                            <span className="mt-3 block text-[13px] font-bold">{type.label}</span>
                            <span className={`mt-1 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/58'}`}>
                              {type.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {rowHasSelected && selectedType && selectedType.subTypes.length > 0 && (
                      <div className="grid gap-2 rounded-[8px] bg-[#F5F3EE] p-2 md:grid-cols-3">
                        {selectedType.subTypes.map((subType) => (
                          <button
                            key={subType.id}
                            type="button"
                            onClick={() => onSubTypeSelect(subType.id)}
                            style={selection.subType === subType.id ? { outline: '2px solid #C9AD98' } : undefined}
                            className={`min-h-10 rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
                              selection.subType === subType.id
                                ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                                : 'border-white bg-white text-[#142334]/68 hover:border-[#C9AD98] hover:text-[#142334]'
                            }`}
                          >
                            {subType.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {rowHasSelected && angleReady && (
                      <div
                        className="rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] p-4 outline outline-1 outline-[#C9AD98]/70"
                        style={{ outline: '1px solid rgba(201, 173, 152, 0.7)' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">03 Choose your angle</p>
                            <h4 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">Give the post a job</h4>
                          </div>
                          {selectedAngle && <Badge className="bg-white text-[#8C7466]">{getRegisterLabel(selectedAngle.register)}</Badge>}
                        </div>
                        <div className="mt-4 grid gap-4">
                          {selectedAngleGroups.map((group) => (
                            <div key={group.label} className="border-b border-[#E4D8CB] pb-3 last:border-b-0 last:pb-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">{group.label}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {group.angles.map((angle) => (
                                  <button
                                    key={angle.id}
                                    type="button"
                                    onClick={() => onAngleSelect(angle)}
                                    style={selection.angle === angle.id ? { outline: '2px solid #C9AD98' } : undefined}
                                    className={`rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
                                      selection.angle === angle.id
                                        ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                                        : 'border-[#E4D8CB] bg-white text-[#142334]/72 hover:border-[#C9AD98] hover:text-[#142334]'
                                    } ${selection.angle === angle.id && pulseKey === 'angle' ? 'animate-pulse' : ''}`}
                                  >
                                    {angle.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rowHasSelected && carouselSlideCountSection}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {selection.angle && (
          <section className="rounded-[8px] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">
                  {needsCarouselSlideCount ? '05 Core idea' : '04 Core idea'}
                </p>
                <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">Add a topic, or let AI suggest one</h3>
              </div>
              {selectedAngle && <Badge className="bg-[#F5F3EE] text-[#6B6B6B]">{selectedAngle.label}</Badge>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { value: 'manual' as TopicSource, label: 'Type your own' },
                { value: 'signal' as TopicSource, label: "Use today's signal" },
                { value: 'brief' as TopicSource, label: 'Use a Signal Brief' },
              ].map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => onTopicSourceSelect(source.value)}
                  className={`rounded-full px-3 py-2 text-[12px] font-semibold transition ${
                    topicSource === source.value
                      ? 'bg-[#142334] text-white'
                      : 'bg-[#F5F3EE] text-[#142334]/68 hover:bg-[#EFE6DF] hover:text-[#142334]'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>

            {topicSource === 'brief' && (
              <div className="mt-3 grid gap-2 rounded-[8px] bg-[#F8F6F4] p-3">
                {signalBriefOptions.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-[#142334]/58">
                    No saved Signal Briefs yet. Generate one in Signal Briefs, then return here.
                  </p>
                ) : (
                  signalBriefOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onBriefSelect(option.text)}
                      className="rounded-[8px] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#142334] transition hover:bg-[#F5F3EE]"
                    >
                      {option.title}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-4">
              <TextareaField
                label="Topic / idea"
                value={topic}
                onChange={onTopicChange}
                rows={5}
                placeholder={topicPlaceholder}
                inputRef={topicInputRef}
              />
              {prepopulateNotice && (
                <p className={`mt-2 text-[12px] italic text-[#C9AD98] ${pulseKey === 'topic' ? 'animate-pulse' : ''}`}>
                  {prepopulateNotice}
                </p>
              )}
            </div>

            <button type="button" onClick={onGenerate} disabled={!canGenerate || busy} className="studio-primary-button mt-4 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </button>
          </section>
        )}
      </div>

      <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-32px)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1 [scrollbar-gutter:stable]" onWheel={trapWheel}>
        {generatedPost ? (
          <OutputWithActions
            title={outputTitle}
            value={generatedPost}
            wordCount={getWordCount(generatedPostBody)}
            platformLabel={selectedPlatformLabel || 'LinkedIn'}
            contentTypeLabel={selectedType ? `${selectedType.label}${selectedSubType ? ` / ${selectedSubType.label}` : ''}` : outputTitle}
            registerLabel={selectedAngle ? getRegisterLabel(selectedAngle.register) : undefined}
            pillarLabel={getPillarFocusLabel(pillarFocus)}
            onChange={onGeneratedPostChange}
            onRegenerate={onGenerate}
            onPolish={onPolish}
            onSave={onSave}
            onCalendar={onCalendar}
            outputNote={outputNote}
            extraAction={
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={onFormatCheck}
                  disabled={busy}
                  className="studio-ghost-button w-fit"
                >
                  Format check <ClipboardCheck className="h-4 w-4" />
                </button>
                {formatOutput && <OutputPanel value={formatOutput} className="min-h-[180px] bg-white" />}
              </div>
            }
          />
        ) : (
          <CreateGuidancePanel
            selection={selection}
            selectedType={selectedType}
            selectedAngle={selectedAngle}
            selectedAngleDetail={selectedAngleDetail}
            selectedPlatformLabel={selectedPlatformLabel}
            canGenerate={canGenerate}
            busy={busy}
            onGenerate={onGenerate}
          />
        )}
      </div>
    </div>
  );
}

function CreateGuidancePanel({
  selection,
  selectedType,
  selectedAngle,
  selectedAngleDetail,
  selectedPlatformLabel,
  canGenerate,
  busy,
  onGenerate,
}: {
  selection: CreateSelection;
  selectedType: ContentTypeOption | null;
  selectedAngle: AngleOption | null;
  selectedAngleDetail: ReturnType<typeof getAngleDetail>;
  selectedPlatformLabel: string;
  canGenerate: boolean;
  busy: boolean;
  onGenerate: () => void;
}) {
  const platformOption = createPlatformOptions.find((item) => item.id === selection.platform);
  const TypeIcon = selectedAngle ? Lightbulb : selectedType?.icon || platformOption?.icon || Sparkles;
  const typeGuidance = selectedType ? contentTypeGuidance[getContentTypeGuidanceKey(selection, selectedType)] || contentTypeGuidance[selectedType.id] : null;
  const platformGuide = selection.platform ? platformGuidance[selection.platform] : null;
  const guidance: StudioGuidance = selectedAngle && selectedAngleDetail
    ? {
        eyebrow: 'Angle details',
        title: selectedAngle.label,
        bullets: [
          `Idea: ${selectedAngleDetail.whatItIs}`,
          `Why it works: ${selectedAngleDetail.whyItWorks}`,
          `Example: ${selectedAngleDetail.exampleOpener}`,
        ],
        callout: `Register: ${getRegisterLabel(selectedAngle.register)}. This is the tone the AI will use when generating.`,
      }
    : typeGuidance || platformGuide || {
        eyebrow: 'Studio guide',
        title: 'Ready to create?',
        bullets: [
          'Choose a platform to reveal the right formats.',
          'Each selection opens the next decision directly underneath it.',
          'The draft preview appears here only after content is generated.',
        ],
        callout: 'Start with the channel. The system will narrow the rest.',
      };

  const nextStep = !selection.platform
    ? 'Choose a platform to begin.'
    : !selection.contentType
      ? `Choose what to create for ${selectedPlatformLabel}.`
      : selectedType?.subTypes.length && !selection.subType
        ? 'Choose the post subtype.'
        : !selection.angle
          ? 'Choose the angle.'
          : 'Ready to generate.';

  return (
    <aside className="rounded-[8px] border border-[#E4D8CB] bg-white p-5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-32px)] xl:overflow-y-auto xl:overscroll-contain [scrollbar-gutter:stable]" onWheel={trapWheel}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#F5F3EE] text-[#C9AD98]">
          <TypeIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{guidance.eyebrow}</p>
          <h3 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">{guidance.title}</h3>
        </div>
      </div>

      <div className="mt-5 border-t border-[#E4D8CB] pt-5">
        <ul className="grid gap-3 text-[13px] leading-relaxed text-[#142334]/68">
          {guidance.bullets.map((bullet, index) => (
            <li key={`${guidance.title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9AD98]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-[8px] border border-dashed border-[#D8C8BB] bg-[#F8F6F4] p-4 text-[13px] leading-relaxed text-[#142334]/68">
        {guidance.callout}
      </div>

      <div className="mt-5 rounded-[8px] bg-[#142334] p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9AD98]">Next move</p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/76">{nextStep}</p>
        {canGenerate && (
          <button type="button" onClick={onGenerate} disabled={busy} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-[#C9AD98]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate content
          </button>
        )}
      </div>
    </aside>
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

function TextareaField({
  label,
  value,
  onChange,
  rows = 6,
  placeholder,
  required,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <label className="grid gap-2">
      <span className="studio-label">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={trapWheel}
        rows={rows}
        placeholder={placeholder}
        required={required}
        ref={inputRef}
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
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[8px] bg-white p-5 shadow-[0_18px_50px_rgba(20,35,52,0.18)]" onClick={(event) => event.stopPropagation()} onWheel={trapWheel}>
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

function VaultLimitModal({
  section,
  currentCount,
  onClose,
  onReview,
}: {
  section: VaultSection;
  currentCount: number;
  onClose: () => void;
  onReview: () => void;
}) {
  const policy = vaultPolicies[section];

  return (
    <ModalShell title={`${policy.label} is full`} onClose={onClose}>
      <div className="grid gap-5">
        <div className="rounded-[12px] bg-[#F5F3EE] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Vault guardrail</p>
          <h3 className="mt-2 font-serif text-[26px] leading-tight text-[#142334]">
            Delete older items to make space.
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/68">
            {policy.label} can hold {policy.maxItems} active saves. You currently have {currentCount}. This keeps the Vault useful instead of turning it into another endless storage drawer.
          </p>
        </div>
        <div className="grid gap-3 rounded-[10px] border border-[#E4D8CB] p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Limit</p>
            <p className="mt-1 font-serif text-[24px] text-[#142334]">{policy.maxItems}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Auto-delete</p>
            <p className="mt-1 font-serif text-[24px] text-[#142334]">{policy.retentionDays}d</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">Warning</p>
            <p className="mt-1 font-serif text-[24px] text-[#142334]">{policy.warningDays}d</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="studio-ghost-button">
            Not now
          </button>
          <button type="button" onClick={onReview} className="studio-primary-button">
            Review oldest items
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function MessyMiddleModal({ onClose, onSave }: { onClose: () => void; onSave: (content: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(content);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the rough idea.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Add rough idea" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextareaField
          label="Messy Middle"
          value={content}
          onChange={setContent}
          rows={10}
          placeholder="Drop anything here - half-formed ideas, observations, things you're thinking about, voice note summaries..."
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="studio-ghost-button">
            Cancel
          </button>
          <button type="submit" disabled={busy || !content.trim()} className="studio-primary-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save to Messy Middle
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function InsightsArticleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: InsightsArticleInput) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [pillar, setPillar] = useState<ContentPillar>('career_growth');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        publishedUrl: publishedUrl.trim(),
        pillar,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add the Insights article.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Add Insights article" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextInput label="Title" value={title} onChange={setTitle} required placeholder="Paste the published article title" />
        <TextareaField
          label="Article content"
          value={content}
          onChange={setContent}
          rows={12}
          required
          placeholder="Paste the full Insights article here. Smart Suggest will use the summary for repurposing ideas."
        />
        <TextInput label="Published URL" value={publishedUrl} onChange={setPublishedUrl} placeholder="Optional public URL" />
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="studio-ghost-button">
            Cancel
          </button>
          <button type="submit" disabled={busy || !title.trim() || !content.trim()} className="studio-primary-button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Save & Summarise
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CalendarEntryModal({
  state,
  adminKey,
  onClose,
  onSaved,
  onDelete,
}: {
  state: CalendarModalState;
  adminKey: string;
  onClose: () => void;
  onSaved: (item: ContentCalendarItem) => void;
  onDelete?: () => void;
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            {state.mode === 'edit' ? 'Save changes' : 'Save post'}
          </button>
        </div>
        {onDelete && (
          <div className="mt-2 border-t border-[#E4D8CB] pt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#142334]/70">Delete this post?</span>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-[13px] text-[#142334]/60 hover:text-[#142334]">
                  Cancel
                </button>
                <button type="button" onClick={onDelete} className="text-[13px] font-semibold text-[#DC2626] hover:text-[#B91C1C]">
                  Delete
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-[13px] text-[#DC2626]/70 hover:text-[#DC2626]">
                Delete this post
              </button>
            )}
          </div>
        )}
      </form>
    </ModalShell>
  );
}

function BacklogEntryModal({
  state,
  adminKey,
  onBeforeCreate,
  onClose,
  onSaved,
}: {
  state: BacklogModalState;
  adminKey: string;
  onBeforeCreate?: () => boolean;
  onClose: () => void;
  onSaved: (item: ContentBacklogItem) => void;
}) {
  const [title, setTitle] = useState(
    state.item ? extractCleanTitle(state.item.title, state.item.content ?? '') : state.defaults?.title || '',
  );
  const [pillar, setPillar] = useState<ContentPillar | ''>(state.item?.pillar || state.defaults?.pillar || '');
  const [platform, setPlatform] = useState<ContentPlatform | ''>(state.item?.platform || state.defaults?.platform || '');
  const [status, setStatus] = useState<ContentBacklogStatus>(state.item?.status || state.defaults?.status || 'idea');
  const [source, setSource] = useState<ContentBacklogSource>(state.item?.source || state.defaults?.source || 'manual');
  const [content, setContent] = useState(state.item ? extractPostBody(state.item.content || '') : state.defaults?.content || '');
  const [notes, setNotes] = useState(state.item?.notes || state.defaults?.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.mode === 'create' && onBeforeCreate && !onBeforeCreate()) return;
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="studio-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="studio-input h-11"
      />
    </label>
  );
}

// ─── Research Vault Tab ────────────────────────────────────────────────────────

const researchPillarColors: Record<ContentPillar, { bg: string; text: string; border: string }> = {
  career_growth: { bg: '#BFDBFE', text: '#1E40AF', border: '#3B82F6' },
  leadership: { bg: '#E9D5FF', text: '#6B21A8', border: '#8B5CF6' },
  personal_brand: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  mentorship: { bg: '#CCFBF1', text: '#0F766E', border: '#10B981' },
};

const researchPillarLabels: Record<ContentPillar, string> = {
  career_growth: 'Career Growth',
  leadership: 'Leadership',
  personal_brand: 'Personal Brand',
  mentorship: 'Mentorship',
};

const PROCESSING_MESSAGES = [
  'Reading your research...',
  'Extracting key insights...',
  'Identifying content angles...',
  'Saving to Research Vault...',
];

const RESEARCH_TEMPLATE = `---
Core Insight:
[The single most important thing you found — one paragraph]

Key Facts:
- [Specific stat or data point + source]
- [Another fact]

What This Means for SA Professionals:
[Connect the data to what people actually experience]

Content Angles:
- Contrarian Take: [rough idea]
- Quick Lesson: [rough idea]
- TikTok Hook: [rough opening line]

Kagiso's Perspective:
[Your own coaching experience with this topic — optional]

Sources:
- [URL or reference]
---`;

type ResearchPanelMode = 'idle' | 'add' | 'detail';
type ResearchProcessingState = 'idle' | 'processing' | 'success' | 'error';

function getResearchStatusLabel(entry: ResearchEntry): { label: string; bg: string; text: string } {
  const now = new Date();
  if (entry.expiresAt) {
    const expiresDate = new Date(entry.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      return { label: 'Expiring soon', bg: '#FEE2E2', text: '#DC2626' };
    }
  }
  if (entry.status === 'processing') return { label: 'Processing', bg: '#FEF3C7', text: '#92400E' };
  if (entry.status === 'archived') return { label: 'Archived', bg: '#F3F4F6', text: '#6B7280' };
  return { label: 'Active', bg: '#D1FAE5', text: '#065F46' };
}

function ResearchVaultTab({
  entries,
  adminKey,
  onAdd,
  onUpdate,
  onArchive,
}: {
  entries: ResearchEntry[];
  adminKey: string;
  onAdd: (entry: ResearchEntry) => void;
  onUpdate: (entry: ResearchEntry) => void;
  onArchive: (id: string) => void;
}) {
  const [panelMode, setPanelMode] = useState<ResearchPanelMode>('idle');
  const [selectedEntry, setSelectedEntry] = useState<ResearchEntry | null>(null);
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [filterQuery, setFilterQuery] = useState('');

  // Add form
  const [addTitle, setAddTitle] = useState('');
  const [addPillar, setAddPillar] = useState<ContentPillar>('career_growth');
  const [addContent, setAddContent] = useState('');
  const [addSources, setAddSources] = useState('');
  const [addExpiresAt, setAddExpiresAt] = useState('');
  const [addIsEvergreen, setAddIsEvergreen] = useState(true);
  const [showTemplate, setShowTemplate] = useState(false);
  const [processingState, setProcessingState] = useState<ResearchProcessingState>('idle');
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [processedEntry, setProcessedEntry] = useState<ResearchEntry | null>(null);
  const [processWarning, setProcessWarning] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Edit form
  const [editEntry, setEditEntry] = useState<ResearchEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPillar, setEditPillar] = useState<ContentPillar>('career_growth');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Confirm archive
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  // Cycling processing messages
  useEffect(() => {
    if (processingState !== 'processing') return;
    const interval = setInterval(() => {
      setProcessingMessageIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [processingState]);

  const filteredEntries = entries.filter((entry) => {
    if (filterPillar !== 'all' && entry.pillar !== filterPillar) return false;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      if (
        !entry.title.toLowerCase().includes(q) &&
        !(entry.coreInsight || '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function resetAddForm() {
    setAddTitle('');
    setAddPillar('career_growth');
    setAddContent('');
    setAddSources('');
    setAddExpiresAt('');
    setAddIsEvergreen(true);
    setShowTemplate(false);
    setProcessingState('idle');
    setProcessedEntry(null);
    setProcessWarning(null);
    setProcessError(null);
  }

  async function handleProcessAndSave() {
    setProcessError(null);
    setProcessWarning(null);
    setProcessingMessageIndex(0);
    setProcessingState('processing');
    try {
      const data = await requestJson<{
        entry: ResearchEntry;
        aiProcessed: boolean;
        warning: string | null;
      }>('/api/content/research/process', 'POST', {
        key: adminKey,
        title: addTitle,
        pillar: addPillar,
        rawContent: addContent,
        sources: addSources,
        expiresAt: addIsEvergreen ? null : addExpiresAt || null,
        isEvergreen: addIsEvergreen,
      });
      setProcessedEntry(data.entry);
      setProcessWarning(data.warning);
      setProcessingState('success');
      onAdd(data.entry);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Could not save this research entry.');
      setProcessingState('error');
    }
  }

  async function handleArchive(id: string) {
    setArchiveBusy(true);
    try {
      await requestJson<{ ok: true }>(`/api/content/research/${id}?key=${encodeURIComponent(adminKey)}`, 'DELETE', {});
      onArchive(id);
      setConfirmArchiveId(null);
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
        setPanelMode('idle');
      }
    } catch (err) {
      console.error('Archive failed:', err);
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleEditSave() {
    if (!editEntry) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const data = await requestJson<{ entry: ResearchEntry }>(`/api/content/research/${editEntry.id}`, 'PATCH', {
        key: adminKey,
        title: editTitle,
        pillar: editPillar,
      });
      onUpdate(data.entry);
      setSelectedEntry(data.entry);
      setEditEntry(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update this entry.');
    } finally {
      setEditBusy(false);
    }
  }

  function openDetail(entry: ResearchEntry) {
    setSelectedEntry(entry);
    setPanelMode('detail');
    setEditEntry(null);
    setConfirmArchiveId(null);
  }

  function openAdd() {
    resetAddForm();
    setPanelMode('add');
    setSelectedEntry(null);
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">
            Content / Research
          </p>
          <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Research Vault</h2>
          <p className="mt-1 text-[14px] text-[#6B6B6B]">
            Validated knowledge that powers smarter content suggestions.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#142334] px-5 text-[13px] font-semibold text-white transition hover:bg-[#20354D]"
        >
          <Plus className="h-4 w-4" /> Add Research
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_minmax(320px,0.538fr)]">
        {/* Left: List */}
        <div>
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value)}
              className="studio-input h-9 text-[12px]"
            >
              <option value="all">All pillars</option>
              {(Object.keys(researchPillarLabels) as ContentPillar[]).map((p) => (
                <option key={p} value={p}>
                  {researchPillarLabels[p]}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B6B6B]" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search entries..."
                className="studio-input h-9 w-full pl-8 text-[12px]"
              />
            </div>
          </div>

          {/* Empty state */}
          {filteredEntries.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-[12px] border border-dashed border-[#E4D8CB] bg-[#F5F3EE] p-8 text-center">
              <BookOpen className="h-8 w-8 text-[#C9AD98]" />
              <div>
                <p className="font-semibold text-[#142334]">No research added yet.</p>
                <p className="mt-1 text-[13px] text-[#6B6B6B]">
                  Add your first research entry and Smart Suggest will start using it immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#C9AD98] px-4 text-[12px] font-semibold text-[#142334] transition hover:bg-[#BFA490]"
              >
                <Plus className="h-4 w-4" /> Add Research
              </button>
            </div>
          )}

          {/* Entry cards */}
          <div className="grid gap-3">
            {filteredEntries.map((entry) => {
              const pillarColor = researchPillarColors[entry.pillar];
              const statusBadge = getResearchStatusLabel(entry);
              const isConfirming = confirmArchiveId === entry.id;
              return (
                <article
                  key={entry.id}
                  onClick={() => openDetail(entry)}
                  className={`cursor-pointer rounded-[12px] border bg-white p-5 transition hover:border-[#C9AD98] ${
                    selectedEntry?.id === entry.id ? 'border-[#142334]' : 'border-[#E4D8CB]'
                  }`}
                  style={{ borderLeft: `4px solid ${pillarColor.border}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                      style={{ background: pillarColor.bg, color: pillarColor.text }}
                    >
                      {researchPillarLabels[entry.pillar]}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: statusBadge.bg, color: statusBadge.text }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-[18px] leading-snug text-[#142334]">
                    {entry.title}
                  </h3>
                  {entry.coreInsight && (
                    <p className="mt-1 text-[13px] leading-relaxed text-[#6B6B6B]">
                      {entry.coreInsight.length > 100
                        ? entry.coreInsight.slice(0, 100) + '…'
                        : entry.coreInsight}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#6B6B6B]">
                      {entry.sources.length > 0 && `${entry.sources.length} source${entry.sources.length !== 1 ? 's' : ''} · `}
                      {entry.contentAngles.length > 0 && `${entry.contentAngles.length} angle${entry.contentAngles.length !== 1 ? 's' : ''} · `}
                      {new Date(entry.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="flex gap-1">
                      {isConfirming ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F2C6B8] bg-[#FFF5F2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A2F1D]">
                          Archive?
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmArchiveId(null); }}
                            className="ml-1 text-[#6B6B6B] hover:text-[#142334]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleArchive(entry.id); }}
                            disabled={archiveBusy}
                            className="rounded-full bg-[#A24E37] px-2 py-0.5 text-white hover:bg-[#7F3828]"
                          >
                            Archive
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmArchiveId(entry.id); }}
                          className="rounded-full border border-[#E4D8CB] px-2 py-0.5 text-[11px] text-[#6B6B6B] transition hover:border-[#C9AD98] hover:text-[#142334]"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right: Panel */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          {/* Idle */}
          {panelMode === 'idle' && (
            <div className="flex min-h-[200px] items-center justify-center rounded-[12px] border border-dashed border-[#E4D8CB] bg-[#F5F3EE] p-8 text-center">
              <p className="text-[13px] leading-relaxed text-[#6B6B6B]">
                Select an entry to view details, or click{' '}
                <button
                  type="button"
                  onClick={openAdd}
                  className="font-semibold text-[#142334] underline underline-offset-2"
                >
                  + Add Research
                </button>{' '}
                to contribute new knowledge.
              </p>
            </div>
          )}

          {/* Add panel */}
          {panelMode === 'add' && (
            <div className="rounded-[12px] border border-[#E4D8CB] bg-white p-6">
              {processingState === 'idle' || processingState === 'error' ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">
                      Add Research
                    </p>
                    <button type="button" onClick={() => setPanelMode('idle')} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#F5F3EE]">
                      <X className="h-4 w-4 text-[#6B6B6B]" />
                    </button>
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className="studio-label">Title *</span>
                      <input
                        type="text"
                        required
                        value={addTitle}
                        onChange={(e) => setAddTitle(e.target.value)}
                        placeholder="e.g. SA Retrenchment Trends Q1 2026"
                        className="studio-input h-11"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="studio-label">Pillar *</span>
                      <select
                        value={addPillar}
                        onChange={(e) => setAddPillar(e.target.value as ContentPillar)}
                        className="studio-input h-11"
                      >
                        {(Object.keys(researchPillarLabels) as ContentPillar[]).map((p) => (
                          <option key={p} value={p}>
                            {researchPillarLabels[p]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="studio-label">Content *</span>
                      <textarea
                        required
                        rows={10}
                        value={addContent}
                        onChange={(e) => setAddContent(e.target.value)}
                        onWheel={trapWheel}
                        placeholder="Paste your research here — article excerpts, notes, reports, or use the template below. The AI will do the structuring."
                        className="studio-input resize-y text-[13px] leading-relaxed"
                      />
                    </label>

                    {/* Template helper */}
                    <div className="rounded-[8px] border border-dashed border-[#E4D8CB] bg-[#F5F3EE] p-4">
                      <button
                        type="button"
                        onClick={() => setShowTemplate((v) => !v)}
                        className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]"
                      >
                        {showTemplate ? 'Hide' : 'Show'} Research Template
                        {showTemplate ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {showTemplate && (
                        <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-[#6B6B6B]">
                          {RESEARCH_TEMPLATE}
                        </pre>
                      )}
                    </div>

                    <label className="grid gap-2">
                      <span className="studio-label">Sources (optional)</span>
                      <input
                        type="text"
                        value={addSources}
                        onChange={(e) => setAddSources(e.target.value)}
                        placeholder="Comma-separated URLs or references"
                        className="studio-input h-11"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-[#E4D8CB] px-4 py-3">
                      <span>
                        <span className="block text-[13px] font-semibold text-[#142334]">Evergreen content</span>
                        <span className="block text-[11px] text-[#6B6B6B]">Never expires — always feeds Smart Suggest</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={addIsEvergreen}
                        onChange={(e) => setAddIsEvergreen(e.target.checked)}
                        className="h-4 w-4 accent-[#142334]"
                      />
                    </label>

                    {!addIsEvergreen && (
                      <label className="grid gap-2">
                        <span className="studio-label">Expires (optional)</span>
                        <input
                          type="date"
                          value={addExpiresAt}
                          onChange={(e) => setAddExpiresAt(e.target.value)}
                          className="studio-input h-11"
                        />
                      </label>
                    )}

                    {processError && (
                      <p className="text-[12px] font-semibold text-[#8A2F1D]">{processError}</p>
                    )}

                    <button
                      type="button"
                      disabled={!addTitle.trim() || !addContent.trim()}
                      onClick={() => void handleProcessAndSave()}
                      className="studio-primary-button"
                    >
                      <Sparkles className="h-4 w-4" />
                      Process &amp; Save — AI will structure this in ~10 seconds
                    </button>
                  </div>
                </>
              ) : processingState === 'processing' ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#C9AD98]" />
                  <p className="text-[13px] font-semibold text-[#142334]">
                    {PROCESSING_MESSAGES[processingMessageIndex]}
                  </p>
                </div>
              ) : processingState === 'success' && processedEntry ? (
                <div>
                  <div className="flex items-center gap-2 text-[#065F46]">
                    <span className="text-[18px]">✓</span>
                    <span className="text-[14px] font-semibold">Research added to Vault</span>
                  </div>
                  {processWarning && (
                    <p className="mt-2 rounded-[8px] bg-[#FEF3C7] p-3 text-[12px] text-[#92400E]">
                      {processWarning}
                    </p>
                  )}
                  <ResearchEntryDetail entry={processedEntry} compact />
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { resetAddForm(); }}
                      className="studio-secondary-button"
                    >
                      Add Another
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPanelMode('idle'); }}
                      className="studio-primary-button"
                    >
                      View in List
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Detail panel */}
          {panelMode === 'detail' && selectedEntry && (
            <div className="rounded-[12px] border border-[#E4D8CB] bg-white p-6">
              {editEntry ? (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Edit Entry</p>
                    <button type="button" onClick={() => setEditEntry(null)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#F5F3EE]">
                      <X className="h-4 w-4 text-[#6B6B6B]" />
                    </button>
                  </div>
                  <label className="grid gap-2">
                    <span className="studio-label">Title</span>
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="studio-input h-11" />
                  </label>
                  <label className="grid gap-2">
                    <span className="studio-label">Pillar</span>
                    <select value={editPillar} onChange={(e) => setEditPillar(e.target.value as ContentPillar)} className="studio-input h-11">
                      {(Object.keys(researchPillarLabels) as ContentPillar[]).map((p) => (
                        <option key={p} value={p}>{researchPillarLabels[p]}</option>
                      ))}
                    </select>
                  </label>
                  {editError && <p className="text-[12px] font-semibold text-[#8A2F1D]">{editError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditEntry(null)} className="flex-1 studio-ghost-button">Cancel</button>
                    <button type="button" disabled={editBusy || !editTitle.trim()} onClick={() => void handleEditSave()} className="flex-1 studio-primary-button">
                      {editBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitle(selectedEntry.title);
                        setEditPillar(selectedEntry.pillar);
                        setEditEntry(selectedEntry);
                        setEditError(null);
                      }}
                      className="rounded-full border border-[#E4D8CB] px-3 py-1 text-[11px] font-semibold text-[#142334] transition hover:border-[#C9AD98]"
                    >
                      Edit
                    </button>
                    {confirmArchiveId === selectedEntry.id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#8A2F1D]">
                        Archive?
                        <button type="button" onClick={() => setConfirmArchiveId(null)} className="ml-1 font-semibold underline">Cancel</button>
                        <button type="button" disabled={archiveBusy} onClick={() => void handleArchive(selectedEntry.id)} className="ml-1 rounded-full bg-[#A24E37] px-2 py-0.5 font-semibold text-white hover:bg-[#7F3828]">
                          Archive
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmArchiveId(selectedEntry.id)} className="rounded-full border border-[#E4D8CB] px-3 py-1 text-[11px] text-[#6B6B6B] transition hover:border-[#C9AD98]">
                        Archive
                      </button>
                    )}
                  </div>
                  <ResearchEntryDetail entry={selectedEntry} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResearchEntryDetail({ entry, compact }: { entry: ResearchEntry; compact?: boolean }) {
  const pillarColor = researchPillarColors[entry.pillar];
  const statusBadge = getResearchStatusLabel(entry);

  return (
    <div className="mt-4 grid gap-4">
      <div>
        <h3 className={`font-serif leading-tight text-[#142334] ${compact ? 'text-[18px]' : 'text-[20px]'}`}>
          {entry.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ background: pillarColor.bg, color: pillarColor.text }}
          >
            {researchPillarLabels[entry.pillar]}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ background: statusBadge.bg, color: statusBadge.text }}
          >
            {statusBadge.label}
          </span>
          <span className="text-[11px] text-[#6B6B6B]">
            Added {new Date(entry.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {entry.coreInsight && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Core Insight</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#142334]">{entry.coreInsight}</p>
        </div>
      )}

      {entry.keyFacts.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Key Facts</p>
          <ul className="mt-2 grid gap-1">
            {entry.keyFacts.map((fact, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#142334]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9AD98]" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.audienceRelevance && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Audience Relevance</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">{entry.audienceRelevance}</p>
        </div>
      )}

      {entry.contentAngles.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Content Angles</p>
          <div className="mt-2 grid gap-2">
            {entry.contentAngles.map((angle: ResearchContentAngle, i) => (
              <div key={i} className="rounded-[8px] bg-[#F5F3EE] px-3 py-2">
                <span className="text-[11px] font-semibold text-[#142334]">{angle.angleName}</span>
                <span className="mx-2 text-[#C9AD98]">→</span>
                <span className="text-[12px] text-[#6B6B6B]">{angle.topic}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.kagisoPerspective && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Kagiso&apos;s Perspective</p>
          <p className="mt-2 text-[13px] italic leading-relaxed text-[#142334]">{entry.kagisoPerspective}</p>
        </div>
      )}

      {entry.sources.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">Sources</p>
          <ul className="mt-2 grid gap-1">
            {entry.sources.map((source, i) => (
              <li key={i} className="truncate text-[12px] text-[#6B6B6B]">
                {source.startsWith('http') ? (
                  <a href={source} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] underline underline-offset-2">
                    {source}
                  </a>
                ) : (
                  source
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
