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
  Download,
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
import DashboardProfileAvatar from '@/components/dashboard/DashboardProfileAvatar';
import DashboardDatePicker from '@/components/DashboardDatePicker';
import FilterDropdown from '@/components/FilterDropdown';
import { OutputPanel, OutputWithActions } from '@/components/content/shared/OutputPanel';
import { EditorialCalendarTab } from '@/components/content/tabs/EditorialCalendarTab';
import { HomeTab } from '@/components/content/tabs/HomeTab';
import { SignalBriefsTab } from '@/components/content/tabs/SignalBriefsTab';
import { StudioTab } from '@/components/content/tabs/StudioTab';
import { VaultTab } from '@/components/content/tabs/VaultTab';
import {
  DEFAULT_CAROUSEL_ASPECT_RATIO,
  DEFAULT_CAROUSEL_LAYOUT_RECIPE,
  DEFAULT_CAROUSEL_SLIDE_COUNT,
  DEFAULT_CAROUSEL_TEMPLATE,
  buildCarouselTemplatePromptBlock,
  carouselAspectRatioOptions,
  carouselLayoutRecipeOptions,
  carouselSlideCountOptions,
  carouselTemplateOptions,
  getCarouselAspectRatioLabel,
  getCarouselAspectRatioOption,
  getCarouselCompositionOption,
  getCarouselCompositionOptionsForRole,
  getCarouselExportDimensions,
  getCarouselLayoutRecipeOption,
  getCarouselSlideCountOption,
  getCarouselTemplateOption,
  isCarouselAspectRatio,
  isCarouselComposition,
  isCarouselLayoutRecipe,
  isCarouselSlideRole,
  isCarouselTemplate,
  type CarouselAspectRatio,
  type CarouselComposition,
  type CarouselLayoutRecipe,
  type CarouselPlatform,
  type CarouselSlideCount,
  type CarouselSlideRole,
  type CarouselTemplate,
} from '@/lib/content/carousel-template-registry';
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
  initialWorkspace?: StudioWorkspace;
  context: DashboardContext;
  calendarItems: ContentCalendarItem[];
  backlogItems: ContentBacklogItem[];
  researchItems: ResearchEntry[];
  followUpNotificationCount: number;
  profilePhotoUrl?: string | null;
};

type StudioWorkspace = 'content' | 'carousel' | 'tools';
type ContentSection = 'home' | 'briefs' | 'studio' | 'vault' | 'editorial' | 'research';
type StudioMode = 'create' | 'transform';
type CreatePlatform = CarouselPlatform;
type TopicSource = 'manual' | 'signal' | 'brief';
type CreatePillarFocus = ContentPillar | 'auto';
type CarouselExportMode = 'pdf' | 'png';
type AiMode =
  | 'signal_brief'
  | 'write_post'
  | 'polish'
  | 'hook_generator'
  | 'cta_generator'
  | 'alchemy_stage1'
  | 'alchemy_stage2'
  | 'alchemy_critique'
  | 'format_recommendation'
  | 'image_prompts'
  | 'voice_note'
  | 'calendar_plan'
  | 'summarise_insights';
type ImagePromptKind = 'editorial_photo' | 'conceptual_visual' | 'designed_graphic';
type ImagePromptOption = {
  kind: ImagePromptKind;
  title: string;
  bestUse: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
};
type StudioToolKind = 'hook' | 'cta' | 'caption' | 'reply';
type StudioGeneratedToolKind = 'hook' | 'cta';
type StudioToolPayload = {
  source: string;
  platform: ContentPlatform | 'auto';
  pillar: ContentPillar | 'auto';
  goal: string;
  quantity: '6' | '10' | '15';
  hookType?: HookType;
};
type StudioToolResult = {
  kind: StudioGeneratedToolKind;
  output: string;
  payload: StudioToolPayload;
  generatedAt: string;
};
type CaptionPlatform = Exclude<ContentPlatform, 'email'>;
type CaptionTone =
  | 'auto'
  | 'tactical_teacher'
  | 'reflective_leader'
  | 'conviction_reframe'
  | 'reflection_friday'
  | 'the_challenger'
  | 'celebration_gratitude';
type CaptionInputMode = 'text' | 'image';
type CaptionResult = {
  captions: Array<{ caption: string; angle: string }>;
  analysis?: string;
};
type ReplyPlatform = Exclude<ContentPlatform, 'email'> | 'email_dm';
type ReplyInputMode = 'text' | 'image';
type ReplyResponseType = 'own_post' | 'other_post';
type ReplyGoal =
  | 'auto'
  | 'continue_conversation'
  | 'answer_question'
  | 'ask_question'
  | 'invite_dm_book'
  | 'acknowledge'
  | 'agree_expand'
  | 'challenge_respectfully'
  | 'add_perspective'
  | 'build_visibility';
type ReplyPersonType = 'lead' | 'client' | 'general_audience' | 'peer' | 'unknown';
type ReplyResult = {
  reply: string;
  shortReply: string;
  chosenGoal?: string;
  analysis?: string;
};
type HookType = 'text_post' | 'spoken_video' | 'visual' | 'visual_spoken';
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
  carouselAspectRatio: CarouselAspectRatio;
  carouselTemplate: CarouselTemplate;
  carouselLayoutRecipe: CarouselLayoutRecipe;
}

type ExtractedFramework = {
  hookPattern: string;
  emotionalTension: string;
  storyStructure: string;
  ctaStyle: string;
  formatLogic: string;
  suggestedPillar?: string;
};

type CarouselSlide = {
  id: string;
  role: CarouselSlideRole;
  composition: CarouselComposition;
  headline: string;
  body: string;
  cta?: string;
  visualSuggestion?: string;
};

type CarouselDraftPayload = {
  kind: 'carousel_draft';
  version: 1;
  title: string;
  caption: string;
  coverDesign?: string;
  platform: CreatePlatform;
  outputPlatform: ContentPlatform;
  pillar: ContentPillar | null;
  register: string | null;
  angle: string | null;
  angleLabel: string | null;
  topic: string;
  slideCount: CarouselSlideCount;
  aspectRatio: CarouselAspectRatio;
  template: CarouselTemplate;
  layoutRecipe: CarouselLayoutRecipe;
  slides: CarouselSlide[];
  accessibilityNote?: string;
  createdAt: string;
};

type CarouselDraftRecord = {
  item: ContentBacklogItem;
  draft: CarouselDraftPayload;
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
  subTypes: Array<{ id: string; label: string; description?: string }>;
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

type CalendarFrequency = 'daily' | 'weekdays' | 'three_per_week' | 'custom';
type CalendarTone =
  | 'auto'
  | 'tactical_teacher'
  | 'reflective_leader'
  | 'reflection_friday'
  | 'conviction_reframe'
  | 'celebration_gratitude'
  | 'the_challenger';
type CalendarPlanLength = 7 | 14 | 30;
type CalendarDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type CalendarDayOption = {
  value: CalendarDayIndex;
  label: string;
  longLabel: string;
};

type CalendarFrequencyOption = {
  value: CalendarFrequency;
  label: string;
  description: string;
  dayIndexes?: CalendarDayIndex[];
};

type CalendarToneOption = {
  value: CalendarTone;
  label: string;
  description: string;
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
const captionPlatformLabels: Record<CaptionPlatform, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};
const replyPlatformLabels: Record<ReplyPlatform, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  email_dm: 'Email / DM',
};
const captionToneLabels: Record<CaptionTone, string> = {
  auto: 'Auto',
  tactical_teacher: 'Tactical Teacher',
  reflective_leader: 'Reflective Leader',
  conviction_reframe: 'Conviction Reframe',
  reflection_friday: 'Reflection Friday',
  the_challenger: 'The Challenger',
  celebration_gratitude: 'Celebration',
};
const replyResponseTypeLabels: Record<ReplyResponseType, { label: string; detail: string }> = {
  own_post: {
    label: 'Reply to my post',
    detail: "Someone commented on Kagiso's content.",
  },
  other_post: {
    label: "Comment on someone else's post",
    detail: "Kagiso wants to engage with another creator's content.",
  },
};
const replyGoalLabels: Record<ReplyGoal, { label: string; detail: string }> = {
  auto: { label: 'Auto', detail: 'Let the AI read the context and pick the best approach.' },
  continue_conversation: { label: 'Continue the conversation', detail: 'Keep it going with an open question or observation.' },
  answer_question: { label: 'Answer their question', detail: 'Give a real, specific answer — not a vague one.' },
  ask_question: { label: 'Ask a thoughtful question', detail: 'Spark a deeper conversation with a genuine question.' },
  invite_dm_book: { label: 'Invite them to DM or book', detail: 'A warm, natural nudge toward a conversation or booking.' },
  acknowledge: { label: 'Simply acknowledge', detail: 'Warm and brief — no CTA, just presence.' },
  agree_expand: { label: 'Agree and expand', detail: 'Validate the point, then deepen it with your own insight or pattern.' },
  challenge_respectfully: { label: 'Challenge the idea', detail: 'Lead with agreement, then push back with nuance.' },
  add_perspective: { label: 'Add your perspective', detail: 'Share a specific observation from your coaching experience.' },
  build_visibility: { label: 'Build visibility', detail: 'Add value while positioning yourself as the authority.' },
};
const replyPersonTypeLabels: Record<ReplyPersonType, string> = {
  lead: 'Lead / potential client',
  client: 'Existing client',
  general_audience: 'General audience',
  peer: 'Peer / fellow professional',
  unknown: 'Unknown',
};
const hookTypeLabels: Record<HookType, { label: string; detail: string; placeholder: string }> = {
  text_post: {
    label: 'Text / post hook',
    detail: 'First line for a LinkedIn post, caption, carousel cover, or written draft.',
    placeholder: 'Paste the post draft, carousel idea, topic, or audience tension...',
  },
  spoken_video: {
    label: 'Video spoken hook',
    detail: 'Opening sentence Kagiso says at the start of a video.',
    placeholder: 'Paste the video idea, rough script, talking points, or the lesson you want to open with...',
  },
  visual: {
    label: 'Visual hook',
    detail: 'First frame, prop, gesture, overlay, or visual interruption before speaking.',
    placeholder: 'Describe the video/photo situation, scene, prop, before/after, or first-frame idea...',
  },
  visual_spoken: {
    label: 'Visual + spoken hook',
    detail: 'First frame plus the first line Kagiso says.',
    placeholder: 'Paste the video idea and any scene details so AI can suggest the visual opening and spoken opener...',
  },
};
const imagePromptKinds: ImagePromptKind[] = ['editorial_photo', 'conceptual_visual', 'designed_graphic'];
const imagePromptFallbacks: Record<ImagePromptKind, { title: string; bestUse: string; aspectRatio: string }> = {
  editorial_photo: {
    title: 'Editorial photo prompt',
    bestUse: 'LinkedIn hero image or post media that needs to feel human and credible.',
    aspectRatio: '4:5 portrait for LinkedIn or Instagram feed',
  },
  conceptual_visual: {
    title: 'Conceptual visual prompt',
    bestUse: 'A metaphor-led image for a post about identity, transition, or decision tension.',
    aspectRatio: '4:5 portrait for feed, 16:9 if used as an article header',
  },
  designed_graphic: {
    title: 'Designed graphic prompt',
    bestUse: 'A branded LinkedIn or Instagram graphic with restrained text and strong composition.',
    aspectRatio: '1:1 square or 4:5 portrait',
  },
};
const imagePromptMeta: Record<ImagePromptKind, { label: string; icon: LucideIcon; className: string; badgeClassName: string }> = {
  editorial_photo: {
    label: 'Editorial photo',
    icon: ImageIcon,
    className: 'border-[#E4D8CB] bg-white',
    badgeClassName: 'bg-[#F5F3EE] text-[#8C7466]',
  },
  conceptual_visual: {
    label: 'Conceptual visual',
    icon: Lightbulb,
    className: 'border-[#D7DEE8] bg-[#F7FAFC]',
    badgeClassName: 'bg-white text-[#445B72]',
  },
  designed_graphic: {
    label: 'Designed graphic',
    icon: LayoutDashboard,
    className: 'border-[#142334] bg-[#142334] text-white',
    badgeClassName: 'bg-white/10 text-white',
  },
};
const captionLoadingMessages = ['Reading your image...', 'Finding three angles...', "Writing in Kagiso's voice..."];
const replyLoadingMessages = ['Reading the content...', 'Finding the right tone...', 'Writing your reply...'];

const studioToolMeta: Record<StudioToolKind, {
  label: string;
  eyebrow: string;
  description: string;
  buttonLabel: string;
  icon: LucideIcon;
  status: 'ready' | 'planned';
  planningNote?: string;
}> = {
  hook: {
    label: 'Hook Generator',
    eyebrow: 'Stop the scroll',
    description: 'First lines that create tension without sounding like generic LinkedIn bait.',
    buttonLabel: 'Generate hooks',
    icon: Zap,
    status: 'ready',
  },
  cta: {
    label: 'CTA Generator',
    eyebrow: 'Move the reader',
    description: 'Clean next steps for replies, saves, DMs, bookings, and soft offers.',
    buttonLabel: 'Generate CTAs',
    icon: Link2,
    status: 'ready',
  },
  caption: {
    label: 'Caption Generator',
    eyebrow: 'Package the post',
    description: 'Caption options for posts, carousels, reels, and saved drafts.',
    buttonLabel: 'Generate captions',
    icon: PenLine,
    status: 'ready',
  },
  reply: {
    label: 'Reply Generator',
    eyebrow: 'Join the conversation',
    description: 'Reply ideas from pasted post text or an uploaded screenshot.',
    buttonLabel: 'Generate replies',
    icon: MessageSquare,
    status: 'ready',
  },
};

const studioToolGoalOptions: Record<StudioToolKind, string[]> = {
  hook: [
    'Stop the scroll',
    'Create a visual interruption',
    'Open a personal story',
    'Challenge a belief',
    'Start a conversation',
    'Make the first frame sharper',
    'Make a carousel cover sharper',
  ],
  cta: [
    'Ask for replies',
    'Invite a DM',
    'Drive a discovery booking',
    'Encourage save or share',
    'Move to a lead magnet',
  ],
  caption: [
    'Educate clearly',
    'Tell a story',
    'Drive comments',
    'Promote softly',
    'Set a carousel caption',
  ],
  reply: [
    'Support the post',
    'Add a useful insight',
    'Ask a thoughtful question',
    'Respectfully disagree',
    'Open a DM bridge',
  ],
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
  assistant: 'Assistant Draft',
};

const calendarDayOptions: CalendarDayOption[] = [
  { value: 1, label: 'Mon', longLabel: 'Monday' },
  { value: 2, label: 'Tue', longLabel: 'Tuesday' },
  { value: 3, label: 'Wed', longLabel: 'Wednesday' },
  { value: 4, label: 'Thu', longLabel: 'Thursday' },
  { value: 5, label: 'Fri', longLabel: 'Friday' },
  { value: 6, label: 'Sat', longLabel: 'Saturday' },
  { value: 0, label: 'Sun', longLabel: 'Sunday' },
];

const calendarFrequencyOptions: CalendarFrequencyOption[] = [
  {
    value: 'daily',
    label: 'Every day',
    description: 'Post across the full week when growth mode needs maximum consistency.',
    dayIndexes: [1, 2, 3, 4, 5, 6, 0],
  },
  {
    value: 'weekdays',
    label: 'Weekdays only',
    description: 'Post Monday to Friday and leave weekends open.',
    dayIndexes: [1, 2, 3, 4, 5],
  },
  {
    value: 'three_per_week',
    label: '3x per week',
    description: 'Balanced visibility using Tuesday, Wednesday, and Thursday.',
    dayIndexes: [2, 3, 4],
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Choose the exact days that match the user schedule.',
  },
];

const calendarToneOptions: CalendarToneOption[] = [
  { value: 'auto', label: 'Auto (AI decides)', description: 'Choose the strongest register for each planned post.' },
  { value: 'tactical_teacher', label: 'Tactical Teacher', description: 'Clear frameworks, direct steps, practical teaching.' },
  { value: 'reflective_leader', label: 'Reflective Leader', description: 'Thought leadership, bigger truth, strategic context.' },
  { value: 'reflection_friday', label: 'Reflection Friday', description: 'Warm, pastoral, intimate, one-to-one reflection.' },
  { value: 'conviction_reframe', label: 'Conviction Reframe', description: 'Sharp reframe that names the hidden cost.' },
  { value: 'celebration_gratitude', label: 'Celebration & Gratitude', description: 'Warm, specific, communal milestone energy.' },
  { value: 'the_challenger', label: 'The Challenger', description: 'Punchy, direct, calls out the unspoken truth.' },
];

const calendarPlanLengthOptions: CalendarPlanLength[] = [7, 14, 30];

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
  { value: 'studio', label: 'Create / Transform', icon: PenLine },
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
  caption_reel_normal_text_post: {
    eyebrow: 'Format path',
    title: 'Normal Text Post',
    bullets: [
      'Use this for an Instagram caption, Facebook feed post, or Reel caption.',
      'The output stays as one complete post, not a comment thread.',
      'Best when the post should stand alone in the feed.',
    ],
    callout: 'Choose this when the idea belongs on Instagram or when Facebook does not need a threaded comment sequence.',
  },
  caption_reel_facebook_thread: {
    eyebrow: 'Format path',
    title: 'Facebook Thread',
    bullets: [
      'Creates one opening post plus a planned sequence of first comments.',
      'Best for step-by-step lessons, story breakdowns, and community discussion prompts.',
      'Keeps the value in Facebook comments instead of turning the idea into an Instagram caption.',
    ],
    callout: 'Choose this when the Facebook version needs depth, conversation, and multiple comment entries.',
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

const NORMAL_CAPTION_REEL_SUBTYPE = 'normal_text_post';
const FACEBOOK_THREAD_SUBTYPE_PREFIX = 'facebook_thread';

const captionReelSubTypes: ContentTypeOption['subTypes'] = [
  {
    id: NORMAL_CAPTION_REEL_SUBTYPE,
    label: 'Normal text post',
    description: 'Instagram caption, Facebook post, or Reel caption',
  },
  {
    id: 'facebook_thread_auto',
    label: 'Thread: auto',
    description: 'Facebook thread, AI chooses the length',
  },
  {
    id: 'facebook_thread_3',
    label: 'Thread: 3 comments',
    description: 'Facebook opening post plus 3 comments',
  },
  {
    id: 'facebook_thread_5',
    label: 'Thread: 5 comments',
    description: 'Facebook opening post plus 5 comments',
  },
  {
    id: 'facebook_thread_7',
    label: 'Thread: 7 comments',
    description: 'Facebook opening post plus 7 comments',
  },
  {
    id: 'facebook_thread_10',
    label: 'Thread: 10 comments',
    description: 'Facebook opening post plus 10 comments',
  },
];

function isFacebookThreadSubType(subType?: string | null) {
  return Boolean(subType?.startsWith(FACEBOOK_THREAD_SUBTYPE_PREFIX));
}

function getFacebookThreadDepthLabel(subType?: string | null) {
  if (!isFacebookThreadSubType(subType)) return '';
  if (subType === 'facebook_thread_auto') return 'AI decides between 3, 5, 7, or 10 comment entries based on the idea.';
  const count = subType?.replace('facebook_thread_', '');
  return count ? `Write exactly ${count} Facebook comment entries after the opening post.` : '';
}

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
        { id: 'caption_reel', label: 'Caption + Reel Hook', description: 'Normal post or FB thread', icon: Sparkles, subTypes: captionReelSubTypes },
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
  caption_reel_facebook_thread: [
    {
      label: 'Build the thread',
      angles: [
        { id: 'step_by_step_thread', label: 'Step-by-Step Thread', register: 'tactical_teacher' },
        { id: 'story_thread', label: 'Story Thread', register: 'reflection_friday' },
        { id: 'myth_busting_thread', label: 'Myth-Busting Thread', register: 'conviction_reframe' },
      ],
    },
    {
      label: 'Start a conversation',
      angles: [
        { id: 'community_discussion_thread', label: 'Community Discussion', register: 'reflection_friday' },
        { id: 'case_breakdown_thread', label: 'Case Breakdown', register: 'reflective_leader' },
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
  hot_observation: {
    whatItIs: 'A sharp, timely observation about something happening in the professional world right now.',
    whyItWorks: 'Speed and specificity. The reader recognises the moment and wants to know your take before the moment passes.',
    exampleOpener: 'Every company just added "AI skills required" to their job posts. Nobody defined what that means.',
    bestPlatform: 'LinkedIn',
  },
  thought_provoking_question: {
    whatItIs: 'Build toward one question that sits with the reader long after they scroll past.',
    whyItWorks: 'Questions that have no easy answer create more reflection and more comments than answers ever do.',
    exampleOpener: 'If your job title disappeared tomorrow, what would you actually be qualified to do?',
    bestPlatform: 'LinkedIn / Facebook',
  },
  quick_lesson: {
    whatItIs: 'One actionable insight, explained clearly.',
    whyItWorks: 'Mid-career professionals want practical tools they can use this week, not theory.',
    exampleOpener: 'Nobody told you your LinkedIn headline was the problem. But it is.',
    bestPlatform: 'LinkedIn / TikTok',
  },
  lessons_learned: {
    whatItIs: 'A specific moment that taught something unexpected about career, leadership, or growth.',
    whyItWorks: 'Grounded lessons from real moments feel earned, not performed. Specificity builds trust.',
    exampleOpener: 'Three months into my first management role, I made a decision that cost me my best team member.',
    bestPlatform: 'LinkedIn / Instagram',
  },
  behind_the_scenes: {
    whatItIs: 'Share what being there actually taught you — something the reader could not learn without you.',
    whyItWorks: 'People follow people, not brands. Behind-the-scenes content builds the kind of trust that leads to DMs and bookings.',
    exampleOpener: 'What no one tells you about running a coaching practice: most weeks, I am the one being coached.',
    bestPlatform: 'Instagram / LinkedIn',
  },
  client_win: {
    whatItIs: 'Share a client transformation with care and specificity.',
    whyItWorks: 'Proof without boasting. A real client story does more selling than any testimonial line.',
    exampleOpener: 'She had been applying for six months with the same CV. Three weeks after we reworked it, she had an interview.',
    bestPlatform: 'LinkedIn / Facebook',
  },
  personal_milestone: {
    whatItIs: 'Share a real achievement or moment of growth.',
    whyItWorks: 'It shows the human behind the coach. Community celebrates with her and trusts her more.',
    exampleOpener: "Growth is no longer accidental for me. It's intentional.",
    bestPlatform: 'LinkedIn / Instagram',
  },
  career_framework: {
    whatItIs: 'Share a practical mental model or decision-making framework for a specific career challenge.',
    whyItWorks: 'Frameworks are saveable and shareable. They position Kagiso as a thinker, not just a motivator.',
    exampleOpener: 'Here is the three-question test I use before accepting any new opportunity.',
    bestPlatform: 'LinkedIn',
  },
  industry_insight: {
    whatItIs: 'Observe a trend, shift, or pattern in the SA or global professional landscape and give your original take.',
    whyItWorks: 'Readers want someone who can connect the dots, not just share the headline. Insight builds authority.',
    exampleOpener: 'The biggest hiring shift in Corporate SA right now has nothing to do with AI.',
    bestPlatform: 'LinkedIn',
  },
  resource_worth_sharing: {
    whatItIs: 'Introduce a useful resource and explain why it matters and how to apply it.',
    whyItWorks: 'The value is in the application, not the link. Curating well is a form of thought leadership.',
    exampleOpener: 'I read something this week that changed how I think about salary negotiations.',
    bestPlatform: 'LinkedIn / Facebook',
  },
  reflection_friday: {
    whatItIs: 'One honest question with no explanation needed.',
    whyItWorks: "It resonates with people carrying career weight they have not named yet.",
    exampleOpener: 'Are you running away from something, or running towards something?',
    bestPlatform: 'LinkedIn',
  },
  community_call: {
    whatItIs: 'Directly address the community and ask for input, experiences, or perspectives.',
    whyItWorks: 'People engage when they feel their voice matters. This builds belonging and conversation.',
    exampleOpener: 'I want to hear from you: what is one career rule you had to unlearn the hard way?',
    bestPlatform: 'LinkedIn / Facebook',
  },
  relatable_observation: {
    whatItIs: 'Name something every professional has experienced but rarely puts into words.',
    whyItWorks: 'The recognition itself is the hook. When someone feels seen, they engage, save, and share.',
    exampleOpener: 'The hardest part of a new job is not the work. It is figuring out who you can trust.',
    bestPlatform: 'LinkedIn / TikTok',
  },
  career_hot_take: {
    whatItIs: 'Take the strongest possible position on a career or workplace topic. No hedging.',
    whyItWorks: 'Bold positions cut through the noise. People respect clarity even when they disagree.',
    exampleOpener: 'Networking events are a waste of time for most professionals. Here is what works instead.',
    bestPlatform: 'LinkedIn / TikTok',
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
  conviction_reframe: {
    whatItIs: 'Take what sounds safe and name the hidden cost.',
    whyItWorks: 'It disrupts comfortable assumptions without being aggressive. It makes people pause.',
    exampleOpener: 'Comfortable is the most dangerous place to be.',
    bestPlatform: 'LinkedIn / TikTok',
  },
  pov_scenario: {
    whatItIs: 'Put the viewer inside a specific, relatable career situation.',
    whyItWorks: 'Immediate recognition. The viewer thinks, this is exactly me.',
    exampleOpener: 'POV: you have been passed over for promotion twice and your manager just called it timing.',
    bestPlatform: 'TikTok',
  },
  step_by_step_thread: {
    whatItIs: 'Break a useful process into an opening post plus clear comment-by-comment steps.',
    whyItWorks: 'Facebook rewards conversation and dwell time, and a step sequence gives people a reason to follow the comments.',
    exampleOpener: 'Stop saying "just checking in" in salary emails. Do this instead.',
    bestPlatform: 'Facebook',
  },
  story_thread: {
    whatItIs: 'Tell a story in layers, with each comment revealing the next beat.',
    whyItWorks: 'It turns a longer lesson into a native Facebook conversation instead of a wall of text.',
    exampleOpener: 'A client nearly talked herself out of asking for the raise she had earned.',
    bestPlatform: 'Facebook',
  },
  myth_busting_thread: {
    whatItIs: 'Use the opening post to name the myth, then unpack the correction across comments.',
    whyItWorks: 'The format keeps disagreement useful and gives readers several points to respond to.',
    exampleOpener: 'The "be grateful you have a job" advice has cost too many women money.',
    bestPlatform: 'Facebook',
  },
  community_discussion_thread: {
    whatItIs: 'Open a real question, then use comments to guide the conversation with prompts and context.',
    whyItWorks: 'It makes the thread feel participatory rather than broadcast-only.',
    exampleOpener: 'What is one career rule you had to unlearn the hard way?',
    bestPlatform: 'Facebook',
  },
  case_breakdown_thread: {
    whatItIs: 'Break down a client-adjacent or anonymised scenario into situation, decision, and lesson comments.',
    whyItWorks: 'It gives proof of thinking without inventing outcomes or overexposing private client details.',
    exampleOpener: 'Here is how I would approach a promotion conversation after being overlooked twice.',
    bestPlatform: 'Facebook',
  },
};

const anglePlaceholders: Record<string, string> = {
  contrarian_take: "What's the conventional wisdom you disagree with?",
  hot_observation: 'What just happened in your industry that nobody is talking about clearly?',
  thought_provoking_question: 'What question do you want the reader to sit with?',
  quick_lesson: 'What is the one thing you wish someone told you earlier?',
  lessons_learned: 'What specific moment taught you something unexpected?',
  behind_the_scenes: 'What did being there teach you that your reader could not learn without you?',
  client_win: 'Describe a client situation or transformation.',
  personal_milestone: 'What moment or achievement do you want to share?',
  career_framework: 'What mental model or decision-making tool do you want to share?',
  industry_insight: 'What trend, shift, or pattern are you noticing in the professional landscape?',
  resource_worth_sharing: 'What resource do you want to share and why does it matter?',
  reflection_friday: 'What are you sitting with this week?',
  community_call: 'Who do you want to invite into a conversation?',
  relatable_observation: 'What universal professional experience do you want to name?',
  career_hot_take: "What's the strongest position you can take on a career topic?",
  the_challenger: 'What bad career advice are you reacting to?',
  warm_checkin: "What do you want to say to someone who's been quiet?",
  conviction_reframe: "What safe choice has a hidden cost?",
  pov_scenario: 'Describe the situation, for example being passed over for promotion again.',
  case_study: 'Describe the situation, the challenge, and what changed.',
  personal_essay: 'What experience shaped how you think about work?',
  step_by_step_thread: 'What process, guide, or sequence should the Facebook thread explain?',
  story_thread: 'What story should unfold across the opening post and comments?',
  myth_busting_thread: 'What myth should the opening post challenge?',
  community_discussion_thread: 'What conversation do you want people to join?',
  case_breakdown_thread: 'What scenario should Kagiso break down for the audience?',
  default: 'What do you want to write about?',
};

const archetypeOptions = ['Lost Pivoter', 'Engaged Strategist', 'Plateaued Performer', 'Quiet Pivoter', 'Burnt-Out Builder'];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sortCalendarDayIndexes(days: CalendarDayIndex[]) {
  return calendarDayOptions.map((option) => option.value).filter((day) => days.includes(day));
}

function getCalendarFrequencyOption(value: CalendarFrequency) {
  return calendarFrequencyOptions.find((option) => option.value === value) || calendarFrequencyOptions[2];
}

function getCalendarToneOption(value: CalendarTone) {
  return calendarToneOptions.find((option) => option.value === value) || calendarToneOptions[0];
}

function getCalendarPostingDayIndexes(frequency: CalendarFrequency, customDays: CalendarDayIndex[]) {
  const option = getCalendarFrequencyOption(frequency);
  return option.dayIndexes ? option.dayIndexes : sortCalendarDayIndexes(customDays);
}

function getCalendarDayLabel(dayIndex: CalendarDayIndex, long = false) {
  const option = calendarDayOptions.find((day) => day.value === dayIndex);
  return long ? option?.longLabel || String(dayIndex) : option?.label || String(dayIndex);
}

function formatCalendarPostingDays(days: CalendarDayIndex[], long = false) {
  if (days.length === 0) return 'No days selected';
  return days.map((day) => getCalendarDayLabel(day, long)).join(', ');
}

function buildCalendarSlotDates(planLength: CalendarPlanLength, postingDays: CalendarDayIndex[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: planLength }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  })
    .filter((date) => postingDays.includes(date.getDay() as CalendarDayIndex))
    .map(getDateKey);
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
  if (contentType === 'caption_reel' && subType === NORMAL_CAPTION_REEL_SUBTYPE) return 'caption_reel';
  if (contentType === 'caption_reel' && isFacebookThreadSubType(subType)) return 'caption_reel_facebook_thread';
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
  if (type.id === 'caption_reel' && selection.subType === NORMAL_CAPTION_REEL_SUBTYPE) return 'caption_reel_normal_text_post';
  if (type.id === 'caption_reel' && isFacebookThreadSubType(selection.subType)) return 'caption_reel_facebook_thread';
  const subtypeKey = getAngleKey(type.id, selection.subType);
  if (contentTypeGuidance[subtypeKey]) return subtypeKey;
  return type.id;
}

function parseBacklogNotes(item: ContentBacklogItem) {
  if (!item.notes?.trim().startsWith('{')) return null;
  try {
    return asPlainObject(JSON.parse(item.notes));
  } catch {
    return null;
  }
}

function getDefaultCreateSelectionForBacklogItem(item: ContentBacklogItem): CreateSelection {
  const platform = createPlatformFromContentPlatform(item.platform);
  const sourceText = `${item.title} ${item.content || ''} ${item.notes || ''}`.toLowerCase();

  if (platform === 'instagram_facebook') {
    const isThreadDraft =
      item.platform === 'facebook' ||
      sourceText.includes('facebook thread') ||
      (sourceText.includes('opening post') && sourceText.includes('comment 1'));

    return {
      platform,
      contentType: 'caption_reel',
      subType: isThreadDraft ? 'facebook_thread_auto' : NORMAL_CAPTION_REEL_SUBTYPE,
      angle: isThreadDraft ? 'step_by_step_thread' : 'lead_with_feeling',
      angleRegister: isThreadDraft ? 'tactical_teacher' : 'reflection_friday',
      carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
      carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
      carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
      carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
    };
  }

  if (platform === 'tiktok') {
    return {
      platform,
      contentType: 'short_script',
      subType: null,
      angle: '3_step_tip',
      angleRegister: 'tactical_teacher',
      carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
      carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
      carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
      carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
    };
  }

  if (platform === 'email_voice') {
    const isVoiceNote = sourceText.includes('voice note') || sourceText.includes('[voice note script]');
    return {
      platform,
      contentType: isVoiceNote ? 'voice_note' : 'value_drop',
      subType: null,
      angle: isVoiceNote ? 'warm_checkin' : 'quick_lesson',
      angleRegister: isVoiceNote ? 'reflection_friday' : 'tactical_teacher',
      carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
      carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
      carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
      carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
    };
  }

  return {
    platform,
    contentType: 'linkedin_post',
    subType: 'text_post',
    angle: 'quick_lesson',
    angleRegister: 'tactical_teacher',
    carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
    carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
    carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
    carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
  };
}

function getCreateSelectionFromBacklogItem(item: ContentBacklogItem): CreateSelection {
  const fallback = getDefaultCreateSelectionForBacklogItem(item);
  const notes = parseBacklogNotes(item);
  if (notes?.kind !== 'smart_suggest') return fallback;

  const platformValue = typeof notes.platform === 'string' ? notes.platform : null;
  const fallbackPlatform: CreatePlatform = fallback.platform || 'linkedin';
  const platform: CreatePlatform = isCreatePlatform(platformValue) ? platformValue : fallbackPlatform;
  const contentType = compactString(notes.contentType);
  const type = contentTypesByPlatform[platform]
    .flatMap((group) => group.types)
    .find((candidate) => candidate.id === contentType);

  if (!type) return { ...fallback, platform };

  const requestedSubType = compactString(notes.subType);
  const subType = type.subTypes.length
    ? type.subTypes.find((candidate) => candidate.id === requestedSubType)?.id || type.subTypes[0].id
    : null;
  const requestedAngle = compactString(notes.angle);
  const angle = (angleGroupsByKey[getAngleKey(type.id, subType)] || [])
    .flatMap((group) => group.angles)
    .find((candidate) => candidate.id === requestedAngle);

  return {
    platform,
    contentType: type.id,
    subType,
    angle: angle?.id || fallback.angle,
    angleRegister: angle?.register || (typeof notes.angleRegister === 'string' ? notes.angleRegister : fallback.angleRegister),
    carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
    carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
    carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
    carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
  };
}

function getBacklogDraftBody(item: ContentBacklogItem) {
  return cleanDraftContent(extractPostBody(item.content || '') || item.content || '').trim();
}

function getRegisterLabel(register?: string | null) {
  if (!register) return 'Not selected';
  return register
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

function getSafeCarouselFileSegment(value: string) {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
  return safe || 'carousel';
}

function getCarouselExportBaseName(draft: CarouselDraftPayload, aspectOption: ReturnType<typeof getCarouselAspectRatioOption>) {
  return `${getSafeCarouselFileSegment(draft.title)}-${getSafeCarouselFileSegment(aspectOption.label)}`;
}

function buildStudioToolUserPrompt(kind: StudioToolKind, payload: StudioToolPayload) {
  const toolLabel = studioToolMeta[kind].label;
  const platformLabel = payload.platform === 'auto' ? 'AI decides the strongest platform fit' : platformLabels[payload.platform];
  const pillarLabel = payload.pillar === 'auto' ? 'AI decides the strongest pillar fit' : pillarMeta[payload.pillar].label;
  return [
    `TOOL: ${toolLabel}`,
    kind === 'hook' && payload.hookType ? `HOOK TYPE: ${hookTypeLabels[payload.hookType].label}` : '',
    `OUTPUT COUNT: ${payload.quantity}`,
    `PLATFORM: ${platformLabel}`,
    `PILLAR: ${pillarLabel}`,
    `GOAL: ${payload.goal}`,
    'SOURCE / IDEA:',
    payload.source.trim(),
  ].filter(Boolean).join('\n');
}

function buildImagePromptUserPrompt({
  post,
  platformLabel,
  contentTypeLabel,
  pillarLabel,
  registerLabel,
  angleLabel,
  topic,
}: {
  post: string;
  platformLabel: string;
  contentTypeLabel: string;
  pillarLabel: string;
  registerLabel: string;
  angleLabel: string;
  topic: string;
}) {
  return [
    `PLATFORM: ${platformLabel || 'LinkedIn'}`,
    `CONTENT FORMAT: ${contentTypeLabel || 'Post'}`,
    `PILLAR: ${pillarLabel}`,
    `REGISTER: ${registerLabel}`,
    angleLabel ? `ANGLE: ${angleLabel}` : '',
    topic ? `TOPIC: ${topic}` : '',
    '',
    'FINISHED POST:',
    post.trim(),
  ].filter((line) => line !== '').join('\n');
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

function buildCaptionReelPromptBlock(selection: CreateSelection) {
  if (selection.contentType !== 'caption_reel') return '';

  if (isFacebookThreadSubType(selection.subType)) {
    return [
      'FACEBOOK THREAD PATH:',
      'The user selected Instagram & Facebook, then Caption + Reel Hook, then a Facebook thread option.',
      'Do not write a normal Instagram caption. Do not write a carousel. Create a Facebook-native thread made from one opening post plus planned first comments.',
      getFacebookThreadDepthLabel(selection.subType),
      'Output exactly these labelled sections:',
      'OPENING POST:',
      'VISUAL / POST MEDIA IDEA:',
      'THREAD CUE:',
      'COMMENT 1 / N:',
      '[Repeat comments until the selected depth is complete.]',
      'CONVERSATION GAP:',
      'FINAL COMMENT / CTA:',
      'POSTING NOTES:',
      'Keep the opening post short enough to invite comments. Each thread comment should make one point only, with white space for mobile reading. Avoid external links in the opening post.',
    ].join('\n');
  }

  if (selection.subType === NORMAL_CAPTION_REEL_SUBTYPE) {
    return [
      'NORMAL INSTAGRAM / FACEBOOK POST PATH:',
      'The user chose the normal post path inside Caption + Reel Hook.',
      'Write one complete feed-ready caption or text post. Do not turn it into a Facebook comment thread.',
      'If the topic sounds like a video or Reel, include a short REEL HOOK line before the caption. If it is clearly a static/text post, use a strong FIRST LINE instead.',
      'Output labelled sections: FIRST LINE / REEL HOOK, CAPTION, CTA / COMMENT PROMPT, HASHTAGS.',
    ].join('\n');
  }

  return '';
}

function buildCreateUserPrompt(selection: CreateSelection, topicValue: string, pillarFocus: CreatePillarFocus = 'auto') {
  const platformLabel = selection.platform ? createPlatformLabels[selection.platform] : '';
  const contentType = findContentTypeOption(selection);
  const subType = contentType?.subTypes.find((item) => item.id === selection.subType);
  const angle = findAngleOption(selection);
  const carouselStructuredOutput = selection.contentType === 'carousel'
    ? [
        'CAROUSEL STUDIO STRUCTURED OUTPUT:',
        'Return valid JSON only. Do not wrap it in markdown or add commentary before or after it.',
        'Use this exact top-level shape: { "kind": "carousel_draft", "version": 1, "title": string, "caption": string, "coverDesign": string, "platform": string, "pillar": string, "register": string, "aspectRatio": string, "template": string, "layoutRecipe": string, "slides": [{ "role": string, "composition": "auto", "headline": string, "body": string, "cta": string, "visualSuggestion": string }], "accessibilityNote": string }.',
        'Every slide must include a role from the allowed slide roles. Use cover for the first slide and cta for the final slide.',
        'Set composition to "auto" unless you have a clear reason to force a layout.',
        'Each slide headline must be 8 words or fewer. Each slide body must be 40 words or fewer.',
        'Every slide must be usable as an HTML/CSS visual slide later. Put layout or image direction in visualSuggestion, not in body.',
        `Carousel slide count: ${getCarouselSlideCountOption(selection.carouselSlideCount).prompt}`,
        `Output frame: ${getCarouselAspectRatioLabel(selection.carouselAspectRatio, selection.platform)}. ${getCarouselAspectRatioOption(selection.carouselAspectRatio, selection.platform).prompt}`,
        buildCarouselTemplatePromptBlock(selection.carouselTemplate, selection.carouselLayoutRecipe),
      ].join('\n')
    : '';
  return [
    `Platform: ${platformLabel}`,
    `Content type: ${contentType?.label || selection.contentType || ''}${subType ? ` (${subType.label})` : ''}`,
    `Angle: ${angle?.label || selection.angle || ''}`,
    `Register: ${getRegisterLabel(selection.angleRegister)}`,
    `Pillar: ${getPillarFocusPrompt(pillarFocus)}`,
    carouselStructuredOutput,
    buildCaptionReelPromptBlock(selection),
    `Topic: ${topicValue.trim() || 'Suggest the strongest topic from the dashboard signal and selected angle.'}`,
  ]
    .filter((item) => item && !item.endsWith(': '))
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

function isContentPlatformValue(value?: string | null): value is ContentPlatform {
  return Boolean(value && Object.prototype.hasOwnProperty.call(platformLabels, value));
}

function createPlatformFromContentPlatform(platform?: ContentPlatform | null): CreatePlatform {
  if (platform === 'instagram' || platform === 'facebook') return 'instagram_facebook';
  if (platform === 'tiktok') return 'tiktok';
  if (platform === 'email') return 'email_voice';
  return 'linkedin';
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function multilineString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractJsonCandidates(raw: string) {
  const trimmed = raw.trim();
  const candidates: string[] = [];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  if (trimmed) candidates.push(trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim());

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function parseJsonFromAiOutput(raw: string): unknown | null {
  for (const candidate of extractJsonCandidates(raw)) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function isImagePromptKind(value: string): value is ImagePromptKind {
  return imagePromptKinds.includes(value as ImagePromptKind);
}

function getImagePromptText(record: Record<string, unknown>) {
  return multilineString(
    record.prompt ??
    record.imagePrompt ??
    record.image_prompt ??
    record.highlyDetailedImagePrompt ??
    record.highly_detailed_image_prompt ??
    record.detailedPrompt ??
    record.detailed_prompt,
  );
}

function normalizeImagePromptOptions(rawOutput: string): ImagePromptOption[] {
  const parsed = parseJsonFromAiOutput(rawOutput);
  const record = asPlainObject(parsed);
  const rawOptions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(record?.visualDirections)
      ? record.visualDirections
      : Array.isArray(record?.visual_directions)
        ? record.visual_directions
        : Array.isArray(record?.imagePrompts)
          ? record.imagePrompts
          : Array.isArray(record?.prompts)
            ? record.prompts
            : [];

  return rawOptions
    .slice(0, 3)
    .map((item, index) => {
      const itemRecord = asPlainObject(item);
      if (!itemRecord) return null;

      const rawKind = compactString(itemRecord.kind ?? itemRecord.type ?? itemRecord.category)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const kind = isImagePromptKind(rawKind) ? rawKind : imagePromptKinds[index] || 'editorial_photo';
      const fallback = imagePromptFallbacks[kind];
      const prompt = getImagePromptText(itemRecord);

      if (!prompt) return null;

      return {
        kind,
        title: compactString(itemRecord.title) || fallback.title,
        bestUse: multilineString(itemRecord.bestUse ?? itemRecord.best_use ?? itemRecord.useCase ?? itemRecord.use_case) || fallback.bestUse,
        prompt,
        negativePrompt: multilineString(itemRecord.negativePrompt ?? itemRecord.negative_prompt) || 'Avoid generic stock-photo styling, plastic corporate smiles, distorted hands, fake text, over-polished AI skin, random logos, and visual cliches.',
        aspectRatio: compactString(itemRecord.aspectRatio ?? itemRecord.aspect_ratio ?? itemRecord.ratio) || fallback.aspectRatio,
      };
    })
    .filter((item): item is ImagePromptOption => Boolean(item));
}

function formatImagePromptForClipboard(option: ImagePromptOption) {
  return [
    `Title: ${option.title}`,
    `Best use: ${option.bestUse}`,
    `Aspect ratio recommendation: ${option.aspectRatio}`,
    '',
    'Highly detailed image prompt:',
    option.prompt,
    '',
    'Negative prompt:',
    option.negativePrompt,
  ].join('\n');
}

function getRawCarouselDraft(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return { slides: value };

  const record = asPlainObject(value);
  if (!record) return null;

  const nested =
    asPlainObject(record.carouselDraft) ||
    asPlainObject(record.carousel_draft) ||
    asPlainObject(record.carousel) ||
    asPlainObject(record.draft);

  if (nested) return nested;
  return record;
}

const carouselSlideRoleLabels: Record<CarouselSlideRole, string> = {
  cover: 'Cover',
  reframe: 'Reframe',
  framework: 'Framework',
  step: 'Step',
  proof: 'Proof cue',
  cta: 'CTA',
  mirror: 'Mirror',
  checklist: 'Checklist',
  reflection: 'Reflection',
  diagnosis: 'Diagnosis',
  myth: 'Myth',
  cost: 'Cost',
  rule: 'Rule',
};

function normalizeCarouselComposition(value: unknown, role: CarouselSlideRole): CarouselComposition {
  const rawComposition = compactString(value);
  const allowed = getCarouselCompositionOptionsForRole(role).map((option) => option.value);
  return isCarouselComposition(rawComposition) && allowed.includes(rawComposition) ? rawComposition : 'auto';
}

function getDefaultCarouselSlideRole(layoutRecipe: CarouselLayoutRecipe, index: number, totalSlides: number): CarouselSlideRole {
  const recipe = getCarouselLayoutRecipeOption(layoutRecipe);
  if (index === 0) return recipe.slideTypes[0] || 'cover';
  if (index === totalSlides - 1) return recipe.slideTypes[recipe.slideTypes.length - 1] || 'cta';
  const middleRoles = recipe.slideTypes.slice(1, -1);
  return middleRoles[Math.min(index - 1, middleRoles.length - 1)] || 'step';
}

function normalizeCarouselSlide(
  value: unknown,
  index: number,
  layoutRecipe: CarouselLayoutRecipe,
  totalSlides: number,
): CarouselSlide | null {
  const record = asPlainObject(value);
  if (!record) return null;

  const rawRole = compactString(record.role ?? record.slideRole ?? record.slide_role ?? record.type ?? record.slideType ?? record.slide_type);
  const role = isCarouselSlideRole(rawRole)
    ? rawRole
    : getDefaultCarouselSlideRole(layoutRecipe, index, totalSlides);
  const composition = normalizeCarouselComposition(record.composition ?? record.layout ?? record.variant, role);
  const headline = compactString(record.headline ?? record.title ?? record.hook);
  const body = multilineString(record.body ?? record.copy ?? record.text ?? record.description);
  const cta = compactString(record.cta ?? record.callToAction ?? record.call_to_action);
  const visualSuggestion = multilineString(
    record.visualSuggestion ?? record.visual_suggestion ?? record.visual ?? record.design ?? record.note,
  );

  if (!headline && !body) return null;

  return {
    id: compactString(record.id) || `slide-${index + 1}`,
    role,
    composition,
    headline: headline || `Slide ${index + 1}`,
    body,
    ...(cta ? { cta } : {}),
    ...(visualSuggestion ? { visualSuggestion } : {}),
  };
}

function buildCarouselDraftFromAiOutput(
  rawOutput: string,
  selection: CreateSelection,
  topicValue: string,
  pillarFocus: CreatePillarFocus,
) {
  const parsed = parseJsonFromAiOutput(rawOutput);
  const rawDraft = getRawCarouselDraft(parsed);
  if (!rawDraft) {
    throw new Error('The AI did not return structured carousel JSON. Try Generate again.');
  }

  const rawSlides = Array.isArray(rawDraft.slides)
    ? rawDraft.slides
    : Array.isArray(rawDraft.carouselSlides)
      ? rawDraft.carouselSlides
      : Array.isArray(rawDraft.carousel_slides)
        ? rawDraft.carousel_slides
        : null;

  const slides = rawSlides
    ?.map((slide, index) => normalizeCarouselSlide(slide, index, selection.carouselLayoutRecipe, rawSlides.length))
    .filter((slide): slide is CarouselSlide => Boolean(slide)) || [];

  if (slides.length < 4) {
    throw new Error('The carousel draft needs at least 4 structured slides. Try Generate again.');
  }

  const platform = selection.platform || 'linkedin';
  const outputPlatform = createPlatformToContentPlatform[platform];
  const topic = topicValue.trim() || 'Dashboard signal carousel';
  const angle = findAngleOption(selection);
  const rawPillar = compactString(rawDraft.pillar ?? rawDraft.contentPillar ?? rawDraft.content_pillar);
  const pillar = normalizeGeneratedPillar(rawPillar) || (pillarFocus !== 'auto' ? pillarFocus : null);
  return {
    kind: 'carousel_draft',
    version: 1,
    title: compactString(rawDraft.title) || titleFromText(slides[0]?.headline || topic, topic),
    caption: multilineString(rawDraft.caption ?? rawDraft.postCaption ?? rawDraft.post_caption),
    coverDesign: multilineString(rawDraft.coverDesign ?? rawDraft.cover_design ?? rawDraft.suggestedCoverDesign),
    platform,
    outputPlatform,
    pillar,
    register: compactString(rawDraft.register ?? rawDraft.writingRegister ?? rawDraft.writing_register) || selection.angleRegister,
    angle: selection.angle,
    angleLabel: angle?.label || selection.angle,
    topic,
    slideCount: selection.carouselSlideCount,
    aspectRatio: selection.carouselAspectRatio,
    template: selection.carouselTemplate,
    layoutRecipe: selection.carouselLayoutRecipe,
    slides,
    accessibilityNote: multilineString(rawDraft.accessibilityNote ?? rawDraft.accessibility_note),
    createdAt: new Date().toISOString(),
  } satisfies CarouselDraftPayload;
}

function normalizeStoredCarouselDraft(value: unknown, item?: ContentBacklogItem): CarouselDraftPayload | null {
  const rawDraft = getRawCarouselDraft(value);
  if (!rawDraft) return null;

  const rawSlides = Array.isArray(rawDraft.slides) ? rawDraft.slides : null;
  const rawPlatform = compactString(rawDraft.platform);
  const platform = isCreatePlatform(rawPlatform)
    ? rawPlatform
    : createPlatformFromContentPlatform(item?.platform || null);
  const rawOutputPlatform = compactString(rawDraft.outputPlatform ?? rawDraft.output_platform);
  const outputPlatform = isContentPlatformValue(rawOutputPlatform)
    ? rawOutputPlatform
    : item?.platform || createPlatformToContentPlatform[platform];
  const rawPillar = compactString(rawDraft.pillar);
  const pillar = normalizeGeneratedPillar(rawPillar) || item?.pillar || null;
  const rawSlideCount = compactString(rawDraft.slideCount ?? rawDraft.slide_count);
  const rawAspectRatio = compactString(rawDraft.aspectRatio ?? rawDraft.aspect_ratio);
  const rawTemplate = compactString(rawDraft.template ?? rawDraft.visualTemplate ?? rawDraft.visual_template);
  const template = isCarouselTemplate(rawTemplate) ? rawTemplate : DEFAULT_CAROUSEL_TEMPLATE;
  const rawLayoutRecipe = compactString(rawDraft.layoutRecipe ?? rawDraft.layout_recipe);
  const layoutRecipe = isCarouselLayoutRecipe(rawLayoutRecipe)
    ? rawLayoutRecipe
    : getCarouselTemplateOption(template).layoutRecipe.value;
  const slides = rawSlides
    ?.map((slide, index) => normalizeCarouselSlide(slide, index, layoutRecipe, rawSlides.length))
    .filter((slide): slide is CarouselSlide => Boolean(slide)) || [];

  if (slides.length < 4) return null;

  return {
    kind: 'carousel_draft',
    version: 1,
    title: compactString(rawDraft.title) || item?.title || titleFromText(slides[0]?.headline || 'Carousel draft', 'Carousel draft'),
    caption: multilineString(rawDraft.caption),
    coverDesign: multilineString(rawDraft.coverDesign ?? rawDraft.cover_design),
    platform,
    outputPlatform,
    pillar,
    register: compactString(rawDraft.register ?? rawDraft.writingRegister ?? rawDraft.writing_register) || null,
    angle: compactString(rawDraft.angle) || null,
    angleLabel: compactString(rawDraft.angleLabel ?? rawDraft.angle_label) || null,
    topic: multilineString(rawDraft.topic) || item?.title || 'Carousel draft',
    slideCount: rawSlideCount === 'quick' || rawSlideCount === 'full' ? rawSlideCount : DEFAULT_CAROUSEL_SLIDE_COUNT,
    aspectRatio: isCarouselAspectRatio(rawAspectRatio) ? rawAspectRatio : DEFAULT_CAROUSEL_ASPECT_RATIO,
    template,
    layoutRecipe,
    slides,
    accessibilityNote: multilineString(rawDraft.accessibilityNote ?? rawDraft.accessibility_note),
    createdAt: compactString(rawDraft.createdAt ?? rawDraft.created_at) || item?.createdAt || new Date().toISOString(),
  };
}

function getCarouselDraftFromBacklogItem(item: ContentBacklogItem): CarouselDraftPayload | null {
  if (!item.notes) return null;
  try {
    const parsed = JSON.parse(item.notes);
    const record = asPlainObject(parsed);
    if (!record || record.kind !== 'carousel_draft') return null;
    return normalizeStoredCarouselDraft(record.draft || record, item);
  } catch {
    return null;
  }
}

function formatCarouselDraftForOutput(draft: CarouselDraftPayload) {
  const pillarLabel = draft.pillar ? pillarMeta[draft.pillar].label : 'AI selected';
  const registerLabel = draft.register ? getRegisterLabel(draft.register) : 'AI selected';
  const slideText = draft.slides
    .map((slide, index) =>
      [
        `SLIDE ${index + 1}`,
        `Role: ${carouselSlideRoleLabels[slide.role]}`,
        `Composition: ${getCarouselCompositionOption(slide.composition).label}`,
        `Headline: ${slide.headline}`,
        slide.body ? `Body: ${slide.body}` : '',
        slide.cta ? `CTA: ${slide.cta}` : '',
        slide.visualSuggestion ? `Visual: ${slide.visualSuggestion}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');

  return [
    `PLATFORM: ${platformLabels[draft.outputPlatform]}`,
    `PILLAR: ${pillarLabel}`,
    `WRITING REGISTER: ${registerLabel}`,
    '',
    `CAROUSEL DRAFT: ${draft.title}`,
    `Slide count: ${draft.slides.length}`,
    `Output frame: ${getCarouselAspectRatioLabel(draft.aspectRatio, draft.platform)}`,
    `Visual template: ${getCarouselTemplateOption(draft.template).label}`,
    `Layout recipe: ${getCarouselLayoutRecipeOption(draft.layoutRecipe).label}`,
    '',
    draft.caption ? `POST CAPTION:\n${draft.caption}` : '',
    draft.coverDesign ? `COVER DESIGN:\n${draft.coverDesign}` : '',
    slideText,
    draft.accessibilityNote ? `ACCESSIBILITY NOTE:\n${draft.accessibilityNote}` : '',
  ]
    .filter((part) => part !== '')
    .join('\n\n');
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
    carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
    carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
    carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
    carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
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

function buildPlanDays(dayCount: CalendarPlanLength = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: dayCount }, (_, index) => {
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
  initialWorkspace = 'content',
  context,
  calendarItems,
  backlogItems,
  researchItems,
  followUpNotificationCount,
  profilePhotoUrl,
}: ContentStudioProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<StudioWorkspace>(initialWorkspace);
  const [activeSection, setActiveSection] = useState<ContentSection>('home');
  const [studioMode, setStudioMode] = useState<StudioMode>('create');
  const [createSelection, setCreateSelection] = useState<CreateSelection>({
    platform: null,
    contentType: null,
    subType: null,
    angle: null,
    angleRegister: null,
    carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
    carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
    carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
    carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
  });
  const [createPillarFocus, setCreatePillarFocus] = useState<CreatePillarFocus>('auto');
  const [brief, setBrief] = useState<string | null>(null);
  const [briefHistory, setBriefHistory] = useState<BriefRecord[]>([]);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [archetypeTarget, setArchetypeTarget] = useState(archetypeOptions[0]);
  const [calendarRecords, setCalendarRecords] = useState(calendarItems);
  const [backlogRecords, setBacklogRecords] = useState(backlogItems);
  const [activeVaultDraftId, setActiveVaultDraftId] = useState<string | null>(null);
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
  const [generatedCarouselDraft, setGeneratedCarouselDraft] = useState<CarouselDraftPayload | null>(null);
  const [carouselStudioSavingId, setCarouselStudioSavingId] = useState<string | null>(null);
  const [carouselStudioError, setCarouselStudioError] = useState<string | null>(null);
  const [selectedCarouselDraftId, setSelectedCarouselDraftId] = useState<string | null>(null);
  const [studioToolBusy, setStudioToolBusy] = useState<StudioToolKind | null>(null);
  const [studioToolError, setStudioToolError] = useState<string | null>(null);
  const [studioToolResult, setStudioToolResult] = useState<StudioToolResult | null>(null);
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
  const [createBusyAction, setCreateBusyAction] = useState<'generate' | 'regenerate' | 'polish' | 'format' | null>(null);
  const [imagePromptOptions, setImagePromptOptions] = useState<ImagePromptOption[]>([]);
  const [imagePromptBusy, setImagePromptBusy] = useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);
  const [calendarPlan, setCalendarPlan] = useState('');
  const [calendarFrequency, setCalendarFrequency] = useState<CalendarFrequency>('three_per_week');
  const [calendarCustomDays, setCalendarCustomDays] = useState<CalendarDayIndex[]>([2, 3, 4]);
  const [calendarTone, setCalendarTone] = useState<CalendarTone>('auto');
  const [calendarPlanLength, setCalendarPlanLength] = useState<CalendarPlanLength>(30);
  const [calendarPillarFocus, setCalendarPillarFocus] = useState<ContentPillar | 'auto'>('auto');
  const [calendarVoiceSample, setCalendarVoiceSample] = useState('');
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
  const calendarFrequencyOption = getCalendarFrequencyOption(calendarFrequency);
  const calendarToneOption = getCalendarToneOption(calendarTone);
  const calendarPostingDays = useMemo(
    () => getCalendarPostingDayIndexes(calendarFrequency, calendarCustomDays),
    [calendarCustomDays, calendarFrequency],
  );
  const calendarSlotDates = useMemo(
    () => buildCalendarSlotDates(calendarPlanLength, calendarPostingDays),
    [calendarPlanLength, calendarPostingDays],
  );
  const calendarSlotDateSet = useMemo(() => new Set(calendarSlotDates), [calendarSlotDates]);
  const selectedCalendarPillarLabel = calendarPillarFocus === 'auto' ? 'Auto-balanced pillars' : pillarMeta[calendarPillarFocus].label;
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
    const actionableRecords = calendarRecords.filter(
      (item) => item.status !== 'idea',
    );
    const pillarCoverage = (Object.keys(pillarMeta) as ContentPillar[]).reduce<Record<string, number>>((acc, pillar) => {
      acc[pillar] = actionableRecords.filter(
        (item) => item.pillar === pillar && item.publishDate >= fourteenDaysAgoKey && item.publishDate <= todayKey,
      ).length;
      return acc;
    }, {});
    const platformCoverage = {
      linkedin: actionableRecords.filter((item) => item.platform === 'linkedin' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
      tiktok: actionableRecords.filter((item) => item.platform === 'tiktok' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
      instagram_facebook: actionableRecords.filter(
        (item) => (item.platform === 'instagram' || item.platform === 'facebook') && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey,
      ).length,
      email: actionableRecords.filter((item) => item.platform === 'email' && item.publishDate >= sevenDaysAgoKey && item.publishDate <= todayKey).length,
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
      .sort((a, b) => {
        const aCov = pillarCoverage[a.pillar] ?? 0;
        const bCov = pillarCoverage[b.pillar] ?? 0;
        return aCov - bCov;
      })
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
  const carouselDraftRecords = useMemo<CarouselDraftRecord[]>(() => {
    const records = backlogRecords
      .map((item) => {
        const draft = getCarouselDraftFromBacklogItem(item);
        return draft ? { item, draft } : null;
      })
      .filter((record): record is CarouselDraftRecord => Boolean(record));
    if (!selectedCarouselDraftId) return records;
    return [...records].sort((a, b) => {
      if (a.item.id === selectedCarouselDraftId) return -1;
      if (b.item.id === selectedCarouselDraftId) return 1;
      return 0;
    });
  }, [backlogRecords, selectedCarouselDraftId]);
  const canGenerateCreate = isCreateSelectionReady(createSelection);

  function resetSmartSuggestSession() {
    setSessionSuggestions([]);
    setSmartSuggestState({ type: 'idle' });
    setSmartSuggestRefreshing(false);
    setSmartSuggestSaveError(null);
    setSmartPrepopulateNotice(null);
    setSmartPulseKey(null);
  }

  function activateWorkspace(workspace: StudioWorkspace) {
    setActiveWorkspace(workspace);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'content');
    url.searchParams.set('studio', workspace);
    window.history.replaceState(window.history.state, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }

  function navigateContent(section: ContentSection, options?: { topic?: string }) {
    activateWorkspace('content');
    if (section !== 'studio' || activeSection !== 'studio') {
      resetSmartSuggestSession();
    }
    if (section === 'vault') {
      setBacklogSearch('');
      setBacklogPillarFilter('all');
      setBacklogStatusFilter('all');
      setBacklogPlatformFilter('all');
      setActiveVaultSection('ideas');
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
    setActiveVaultDraftId(null);
    setCreatePillarFocus('auto');
    setCreateSelection((current) =>
      current.platform === nextPlatform
        ? {
            platform: null,
            contentType: null,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
            carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
            carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
            carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
          }
        : {
            platform: nextPlatform,
            contentType: null,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
            carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
            carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
            carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
          }
    );
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
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
            carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
            carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
            carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
            carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
          }
        : {
            ...current,
            contentType: type.id,
            subType: null,
            angle: null,
            angleRegister: null,
            carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
            carouselAspectRatio: type.id === 'carousel' ? current.carouselAspectRatio : DEFAULT_CAROUSEL_ASPECT_RATIO,
            carouselTemplate: type.id === 'carousel' ? current.carouselTemplate : DEFAULT_CAROUSEL_TEMPLATE,
            carouselLayoutRecipe: type.id === 'carousel' ? current.carouselLayoutRecipe : DEFAULT_CAROUSEL_LAYOUT_RECIPE,
          }
    );
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
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
            carouselSlideCount: DEFAULT_CAROUSEL_SLIDE_COUNT,
            carouselAspectRatio: DEFAULT_CAROUSEL_ASPECT_RATIO,
            carouselTemplate: DEFAULT_CAROUSEL_TEMPLATE,
            carouselLayoutRecipe: DEFAULT_CAROUSEL_LAYOUT_RECIPE,
          }
        : {
            ...current,
            subType,
            angle: null,
            angleRegister: null,
          }
    );
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
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
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
  }

  function selectCarouselSlideCount(slideCount: CarouselSlideCount) {
    setCreateSelection((current) => ({
      ...current,
      carouselSlideCount: slideCount,
    }));
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
  }

  function selectCarouselAspectRatio(aspectRatio: CarouselAspectRatio) {
    setCreateSelection((current) => ({
      ...current,
      carouselAspectRatio: aspectRatio,
    }));
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
  }

  function selectCarouselTemplate(template: CarouselTemplate) {
    setCreateSelection((current) => ({
      ...current,
      carouselTemplate: template,
    }));
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
  }

  function selectCarouselLayoutRecipe(layoutRecipe: CarouselLayoutRecipe) {
    setCreateSelection((current) => ({
      ...current,
      carouselLayoutRecipe: layoutRecipe,
    }));
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
  }

  function applyTopicSource(source: TopicSource) {
    setSmartPrepopulateNotice(null);
    setGeneratedCarouselDraft(null);
    setTopicSource(source);
    if (source === 'signal') {
      setTopic(context.strongestTheme);
    }
  }

  function openVaultSection(section: VaultSection) {
    activateWorkspace('content');
    setActiveVaultSection(section);
    setActiveSection('vault');
  }

  function openBacklogDraftInStudio(item: ContentBacklogItem) {
    const selection = getCreateSelectionFromBacklogItem(item);
    const draftBody = getBacklogDraftBody(item);
    const isSavedSmartSuggestion = isSmartSuggestItem(item);
    const title = extractCleanTitle(item.title, item.content ?? '');

    resetSmartSuggestSession();
    setActiveVaultDraftId(item.id);
    setCreateSelection(selection);
    setCreatePillarFocus(item.pillar || 'auto');
    setTopic(title);
    setTopicSource(isSavedSmartSuggestion ? 'signal' : 'manual');
    setGeneratedPost(isSavedSmartSuggestion ? '' : draftBody);
    setGeneratedCarouselDraft(null);
    setCreateFormatOutput('');
    setCreateError(null);
    setSmartPrepopulateNotice(
      isSavedSmartSuggestion
        ? 'Loaded saved Smart Suggest from Vault. Review the topic, then generate when ready.'
        : 'Loaded saved Vault draft. Edit, copy, polish, update, or schedule it here.',
    );
    setSmartPulseKey(null);
    setStudioMode('create');
    activateWorkspace('content');
    setActiveSection('studio');
  }

  function openVaultItem(item: ContentBacklogItem) {
    resetSmartSuggestSession();
    setBacklogSearch('');
    setBacklogPillarFilter('all');
    setBacklogStatusFilter('all');
    setBacklogPlatformFilter('all');

    const carouselDraft = getCarouselDraftFromBacklogItem(item);
    if (carouselDraft) {
      setSelectedCarouselDraftId(item.id);
      setCarouselStudioError(null);
      activateWorkspace('carousel');
      return;
    }

    const section = getVaultSectionForItem(item);
    setActiveVaultSection(section);
    activateWorkspace('content');
    setActiveSection('vault');

    if (section !== 'messy') {
      openBacklogDraftInStudio(item);
    }
  }

  function openVaultItemById(itemId: string) {
    const item = backlogRecords.find((record) => record.id === itemId);
    if (item) openVaultItem(item);
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
    activateWorkspace('content');
    setBacklogSearch(query);
    setBacklogPillarFilter('all');
    setBacklogStatusFilter('all');
    setBacklogPlatformFilter('all');
    setActiveSection('vault');
  }

  function openContentSearchResult(result: ContentSearchResult) {
    activateWorkspace('content');
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
    activateWorkspace('content');
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
    activateWorkspace('content');
    setActiveSection('vault');
  }

  async function updateActiveVaultDraft(
    content: string,
    titleFallback: string,
    platformOverride: ContentPlatform = defaultOutputPlatform,
    titleOverride?: string,
    pillarOverride?: ContentPillar | null,
  ) {
    if (!activeVaultDraftId || !content.trim()) return false;
    const existing = backlogRecords.find((item) => item.id === activeVaultDraftId);
    if (!existing) {
      setActiveVaultDraftId(null);
      return false;
    }

    const outputMetadata = extractOutputMetadata(content);
    const cleanContent = outputMetadata.body || content.trim();
    const resolvedPillar = pillarOverride || normalizeGeneratedPillar(outputMetadata.pillar) || existing.pillar || 'career_growth';
    setCreateBusy(true);
    setCreateError(null);
    try {
      const data = await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${existing.id}`, 'PATCH', {
        key: adminKey,
        title: titleOverride?.trim() || titleFromText(cleanContent, titleFallback),
        pillar: resolvedPillar,
        platform: platformOverride,
        source: existing.source,
        status: existing.status === 'idea' ? 'draft' : existing.status,
        content: cleanContent,
        notes: existing.notes,
      });
      setBacklogRecords((current) => [data.item, ...current.filter((item) => item.id !== data.item.id)]);
      setActiveVaultDraftId(data.item.id);
      setSmartPrepopulateNotice('Updated the saved Vault draft.');
      return true;
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not update the saved Vault draft.');
      return true;
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveCurrentCreateDraft() {
    if (generatedCarouselDraft) {
      await saveCarouselDraftToBacklog(generatedCarouselDraft);
      return;
    }

    const updatedExisting = await updateActiveVaultDraft(
      generatedPost,
      topic,
      selectedOutputPlatform,
      topic,
      createPillarFocus === 'auto' ? null : createPillarFocus,
    );
    if (updatedExisting) return;

    await saveOutputToBacklog(
      generatedPost,
      topic,
      selectedOutputPlatform,
      topic,
      createPillarFocus === 'auto' ? null : createPillarFocus,
    );
  }

  async function saveCarouselDraftToBacklog(draft: CarouselDraftPayload) {
    if (!canAddToVaultSection('ideas')) return;
    const body = formatCarouselDraftForOutput(draft);
    const data = await requestJson<{ item: ContentBacklogItem }>('/api/content/backlog', 'POST', {
      key: adminKey,
      title: draft.title,
      pillar: draft.pillar,
      platform: draft.outputPlatform,
      source: 'create',
      status: 'draft',
      content: body,
      notes: JSON.stringify(
        {
          kind: 'carousel_draft',
          version: 1,
          draft,
        },
        null,
        2,
      ),
    });
    setBacklogRecords((current) => [data.item, ...current]);
    setSelectedCarouselDraftId(data.item.id);
    activateWorkspace('carousel');
  }

  async function updateCarouselDraftSettings(
    record: CarouselDraftRecord,
    settings: Partial<Pick<CarouselDraftPayload, 'aspectRatio' | 'template' | 'layoutRecipe'>>,
  ) {
    const layoutRecipe = settings.layoutRecipe || record.draft.layoutRecipe;
    const nextDraft = { ...record.draft, ...settings, layoutRecipe };
    const shouldReassignRoles = Boolean(settings.layoutRecipe && settings.layoutRecipe !== record.draft.layoutRecipe);
    await saveCarouselDraftRecord(record, {
      ...nextDraft,
      slides: shouldReassignRoles
        ? nextDraft.slides.map((slide, index) => ({
          ...slide,
          role: getDefaultCarouselSlideRole(layoutRecipe, index, nextDraft.slides.length),
          composition: 'auto',
        }))
        : nextDraft.slides,
    });
  }

  async function saveCarouselDraftRecord(record: CarouselDraftRecord, nextDraft: CarouselDraftPayload) {
    setCarouselStudioSavingId(record.item.id);
    setCarouselStudioError(null);
    try {
      const data = await requestJson<{ item: ContentBacklogItem }>(`/api/content/backlog/${record.item.id}`, 'PATCH', {
        key: adminKey,
        content: formatCarouselDraftForOutput(nextDraft),
        notes: JSON.stringify(
          {
            kind: 'carousel_draft',
            version: 1,
            draft: nextDraft,
          },
          null,
          2,
        ),
      });
      setBacklogRecords((current) => [data.item, ...current.filter((item) => item.id !== data.item.id)]);
      setSelectedCarouselDraftId(data.item.id);
      setCreateSelection((current) => ({
        ...current,
        carouselAspectRatio: nextDraft.aspectRatio,
        carouselTemplate: nextDraft.template,
        carouselLayoutRecipe: nextDraft.layoutRecipe,
      }));
      setGeneratedCarouselDraft((current) => current && current.title === record.draft.title ? nextDraft : current);
    } catch (error) {
      setCarouselStudioError(error instanceof Error ? error.message : 'Could not save the carousel draft.');
    } finally {
      setCarouselStudioSavingId(null);
    }
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
    activateWorkspace('content');
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
    activateWorkspace('content');
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
    setActiveVaultDraftId(null);
    activateWorkspace('content');
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
    setActiveVaultDraftId(null);
    const nextSelection: CreateSelection = {
      platform: normalized.platform,
      contentType: normalized.contentType,
      subType: normalized.subType,
      angle: normalized.angle,
      angleRegister: normalized.angleRegister,
      carouselSlideCount: normalized.contentType === 'carousel' ? createSelection.carouselSlideCount : DEFAULT_CAROUSEL_SLIDE_COUNT,
      carouselAspectRatio: normalized.contentType === 'carousel' ? createSelection.carouselAspectRatio : DEFAULT_CAROUSEL_ASPECT_RATIO,
      carouselTemplate: normalized.contentType === 'carousel' ? createSelection.carouselTemplate : DEFAULT_CAROUSEL_TEMPLATE,
      carouselLayoutRecipe: normalized.contentType === 'carousel' ? createSelection.carouselLayoutRecipe : DEFAULT_CAROUSEL_LAYOUT_RECIPE,
    };

    setStudioMode('create');
    setCreatePillarFocus(normalized.pillar);
    setGeneratedPost('');
    setGeneratedCarouselDraft(null);
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
      carouselAspectRatio: nextSelection.carouselAspectRatio,
      carouselTemplate: nextSelection.carouselTemplate,
      carouselLayoutRecipe: nextSelection.carouselLayoutRecipe,
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
    const busyAction = generatedPost.trim() && !selectionOverride ? 'regenerate' : 'generate';
    setCreateBusy(true);
    setCreateBusyAction(busyAction);
    setCreateError(null);
    try {
      const result = await callAi(
        deriveCreateMode(selectionToUse),
        buildCreateUserPrompt(selectionToUse, topicToUse, pillarToUse),
        selectionToUse,
      );
      if (selectionToUse.contentType === 'carousel') {
        const carouselDraft = buildCarouselDraftFromAiOutput(result, selectionToUse, topicToUse, pillarToUse);
        setGeneratedCarouselDraft(carouselDraft);
        setGeneratedPost(formatCarouselDraftForOutput(carouselDraft));
      } else {
        setGeneratedCarouselDraft(null);
        setGeneratedPost(cleanDraftContent(result));
      }
      setCreateFormatOutput('');
      setImagePromptOptions([]);
      setImagePromptError(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not generate the content.');
    } finally {
      setCreateBusy(false);
      setCreateBusyAction(null);
    }
  }

  async function polishGeneratedPost() {
    const cleanPost = cleanDraftContent(generatedPost);
    if (!cleanPost.trim()) return;
    setCreateBusy(true);
    setCreateBusyAction('polish');
    setCreateError(null);
    try {
      const result = await callAi('polish', cleanPost);
      setGeneratedCarouselDraft(null);
      setGeneratedPost(cleanDraftContent(result));
      setImagePromptOptions([]);
      setImagePromptError(null);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not polish the content.');
    } finally {
      setCreateBusy(false);
      setCreateBusyAction(null);
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
    setCreateBusyAction('format');
    setCreateError(null);
    try {
      const result = await callAi('format_recommendation', source);
      setCreateFormatOutput(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not recommend a format.');
    } finally {
      setCreateBusy(false);
      setCreateBusyAction(null);
    }
  }

  async function generateImagePrompts() {
    const source = cleanDraftContent(generatedPost).trim();
    if (!source) return;

    const selectedSubType = selectedCreateType?.subTypes.find((item) => item.id === createSelection.subType) || null;
    const contentTypeLabel = selectedCreateType
      ? `${selectedCreateType.label}${selectedSubType ? ` / ${selectedSubType.label}` : ''}`
      : 'Post';

    setImagePromptBusy(true);
    setImagePromptError(null);
    try {
      const result = await callAi(
        'image_prompts',
        buildImagePromptUserPrompt({
          post: source,
          platformLabel: selectedCreatePlatformLabel || 'LinkedIn',
          contentTypeLabel,
          pillarLabel: getPillarFocusLabel(createPillarFocus),
          registerLabel: selectedAngle ? getRegisterLabel(selectedAngle.register) : 'AI selected',
          angleLabel: selectedAngle?.label || '',
          topic: topic.trim(),
        }),
        createSelection,
      );
      const options = normalizeImagePromptOptions(result);
      if (options.length !== 3) {
        throw new Error('The AI did not return three usable image prompts. Try again.');
      }
      setImagePromptOptions(options);
    } catch (error) {
      setImagePromptError(error instanceof Error ? error.message : 'Could not generate image prompts.');
    } finally {
      setImagePromptBusy(false);
    }
  }

  async function generateStudioTool(kind: StudioGeneratedToolKind, payload: StudioToolPayload) {
    if (!payload.source.trim()) {
      setStudioToolError('Add a topic, draft, or idea first.');
      return;
    }
    setStudioToolBusy(kind);
    setStudioToolError(null);
    try {
      const result = await callAi(
        kind === 'hook' ? 'hook_generator' : 'cta_generator',
        buildStudioToolUserPrompt(kind, payload),
      );
      setStudioToolResult({
        kind,
        output: result,
        payload,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setStudioToolError(error instanceof Error ? error.message : 'Could not generate this tool output.');
    } finally {
      setStudioToolBusy(null);
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

  function toggleCalendarCustomDay(day: CalendarDayIndex) {
    setCalendarFrequency('custom');
    setCalendarCustomDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) return current;
        return sortCalendarDayIndexes(current.filter((item) => item !== day));
      }
      return sortCalendarDayIndexes([...current, day]);
    });
  }

  async function suggestCalendarPlan() {
    setCreateError(null);
    if (calendarSlotDates.length === 0) {
      setCreateError('Choose at least one posting day before generating a plan.');
      return;
    }
    setCreateBusy(true);
    try {
      const existingPosts = calendarRecords
        .map((item) => `${item.publishDate}: ${item.title}`)
        .join('; ') || 'none';
      const slotList = calendarSlotDates
        .map((date) => `${formatDayLabel(date)} (${date})`)
        .join('; ');
      const prompt = [
        `Create a ${calendarPlanLength}-day editorial calendar plan using only these publishing slots: ${slotList}.`,
        `Posting cadence: ${calendarFrequencyOption.label}. Posting days: ${formatCalendarPostingDays(calendarPostingDays, true)}. Total posts to plan: ${calendarSlotDates.length}.`,
        calendarTone === 'auto'
          ? `Writing register: Auto. Choose the strongest register per post from Kagiso's six registers. ${calendarToneOption.description}`
          : `Writing register: ${calendarToneOption.label} (${calendarToneOption.description}). Use this register for the whole plan unless a specific slot clearly needs a stronger fit.`,
        `Pillar focus: ${selectedCalendarPillarLabel}. If auto-balanced, rotate the four pillars based on dashboard signal strength.`,
        calendarVoiceSample.trim()
          ? `Voice sample to match: ${calendarVoiceSample.trim()}`
          : "Voice sample: none provided, so use Kagiso's established voice rules.",
        `Existing planned posts to avoid repeating: ${existingPosts}.`,
        'Return one editable entry per publishing slot. Each entry must include the exact date, platform, pillar, title, angle, why now, and first draft note.',
        'Do not create posts for empty days. Do not schedule or publish anything.',
      ].join('\n');
      const result = await callAi(
        'calendar_plan',
        prompt,
      );
      setCalendarPlan(result);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not generate the calendar plan.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function deleteBacklogItem(item: ContentBacklogItem) {
    const previous = backlogRecords;
    setConfirmingBacklogDeleteId(null);
    if (selectedCarouselDraftId === item.id) setSelectedCarouselDraftId(null);
    setBacklogRecords((current) => current.filter((record) => record.id !== item.id));
    try {
      await requestJson<{ ok: true }>(`/api/content/backlog/${item.id}`, 'DELETE', { key: adminKey });
    } catch (error) {
      setBacklogRecords(previous);
      if (selectedCarouselDraftId === item.id) setSelectedCarouselDraftId(item.id);
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
          onSelect: () => navigateContent('editorial'),
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
          profilePhotoUrl={profilePhotoUrl}
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

        {activeWorkspace === 'content' && (
          <nav className="grid w-full grid-cols-2 gap-2 rounded-[8px] bg-white p-2 md:grid-cols-6" aria-label="Content Studio tabs">
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
        )}

        {activeWorkspace === 'content' && createError && <Notice tone="error">{createError}</Notice>}

        {activeWorkspace === 'content' && activeSection === 'home' && (
          <HomeTab
            context={context}
            calendarItems={calendarRecords}
            backlogItems={backlogRecords}
            onNavigate={navigateContent}
            onOpenVaultItem={openVaultItemById}
          />
        )}

        {activeWorkspace === 'content' && activeSection === 'briefs' && (
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
                  <div className="grid gap-2">
                    <span className="studio-label">Generate for archetype</span>
                    <FilterDropdown
                      name="signalBriefArchetype"
                      value={archetypeTarget}
                      onChange={setArchetypeTarget}
                      ariaLabel="Choose Signal Brief archetype"
                      options={archetypeOptions.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
                  </div>
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

        {activeWorkspace === 'content' && activeSection === 'studio' && (
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
                className={`studio-mode-card rounded-[12px] border p-5 text-center transition ${
                  studioMode === 'create'
                    ? 'border-[#142334] bg-[#142334] text-white'
                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#142334]'
                }`}
              >
                <span className="block font-serif text-[30px] leading-tight">Create</span>
                <span className="mt-2 block text-[12px] font-semibold uppercase tracking-[0.16em] opacity-70">Build from scratch</span>
              </button>
              <button
                type="button"
                onClick={() => setStudioMode('transform')}
                data-active={studioMode === 'transform'}
                className={`studio-mode-card studio-transform-mode-card rounded-[12px] border p-5 text-center transition ${
                  studioMode === 'transform'
                    ? 'border-[#C9AD98] bg-[#142334] text-white'
                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#142334]'
                }`}
              >
                <span className="block font-serif text-[30px] leading-tight">Transform</span>
                <span className="mt-2 block text-[12px] font-semibold uppercase tracking-[0.16em] opacity-70">Turn anything into a post</span>
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
                imagePromptOptions={imagePromptOptions}
                imagePromptBusy={imagePromptBusy}
                imagePromptError={imagePromptError}
                signalBriefOptions={signalBriefOptions}
                canGenerate={canGenerateCreate}
                busy={createBusy}
                isRegenerating={createBusyAction === 'regenerate'}
                topicInputRef={topicInputRef}
                prepopulateNotice={smartPrepopulateNotice}
                pulseKey={smartPulseKey}
                onPlatformSelect={selectCreatePlatform}
                onTypeSelect={selectCreateType}
                onSubTypeSelect={selectCreateSubType}
                onAngleSelect={selectCreateAngle}
                onCarouselSlideCountSelect={selectCarouselSlideCount}
                onCarouselAspectRatioSelect={selectCarouselAspectRatio}
                onCarouselTemplateSelect={selectCarouselTemplate}
                onCarouselLayoutRecipeSelect={selectCarouselLayoutRecipe}
                onTopicChange={(value) => {
                  setSmartPrepopulateNotice(null);
                  setTopic(value);
                  setTopicSource('manual');
                  setGeneratedCarouselDraft(null);
                }}
                onTopicSourceSelect={applyTopicSource}
                onBriefSelect={(text) => {
                  setTopic(text);
                  setTopicSource('brief');
                  setGeneratedCarouselDraft(null);
                }}
                onGenerate={() => generatePost()}
                onGeneratedPostChange={(value) => {
                  setGeneratedPost(value);
                  setGeneratedCarouselDraft(null);
                  setImagePromptOptions([]);
                  setImagePromptError(null);
                }}
                onPolish={polishGeneratedPost}
                onFormatCheck={checkGeneratedFormat}
                onGenerateImagePrompts={() => void generateImagePrompts()}
                carouselDraft={generatedCarouselDraft}
                onSave={() => {
                  void saveCurrentCreateDraft();
                }}
                saveLabel={activeVaultDraftId && !generatedCarouselDraft ? 'Update Vault Draft' : undefined}
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
                profilePhotoUrl={profilePhotoUrl}
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
                profilePhotoUrl={profilePhotoUrl}
                onDirectionPillarChange={setAlchemyDirectionPillar}
                onDirectionRegisterChange={setAlchemyDirectionRegister}
                onDirectionChange={setAlchemyDirection}
                onRebuildModeChange={setAlchemyRebuildMode}
              />
            )}

          </StudioTab>
        )}

        {activeWorkspace === 'carousel' && (
          <CarouselStudioPanel
            key={`carousel-${selectedCarouselDraftId || carouselDraftRecords[0]?.item.id || 'empty'}`}
            drafts={carouselDraftRecords}
            defaultAspectRatio={createSelection.carouselAspectRatio}
            defaultTemplate={createSelection.carouselTemplate}
            defaultLayoutRecipe={createSelection.carouselLayoutRecipe}
            savingDraftId={carouselStudioSavingId}
            error={carouselStudioError}
            onDefaultAspectRatioChange={selectCarouselAspectRatio}
            onDefaultTemplateChange={selectCarouselTemplate}
            onDefaultLayoutRecipeChange={selectCarouselLayoutRecipe}
            onDraftAspectRatioChange={(record, aspectRatio) => {
              void updateCarouselDraftSettings(record, { aspectRatio });
            }}
            onDraftTemplateChange={(record, template) => {
              void updateCarouselDraftSettings(record, { template });
            }}
            onDraftLayoutRecipeChange={(record, layoutRecipe) => {
              void updateCarouselDraftSettings(record, { layoutRecipe });
            }}
            onDraftSave={(record, draft) => {
              void saveCarouselDraftRecord(record, draft);
            }}
            selectedDraftId={selectedCarouselDraftId}
            onDraftSelect={(record) => {
              setSelectedCarouselDraftId(record.item.id);
              setCarouselStudioError(null);
            }}
            onStartDraft={() => navigateContent('studio', { topic: context.strongestTheme })}
          />
        )}

        {activeWorkspace === 'tools' && (
          <StudioToolsPanel
            adminKey={adminKey}
            defaultSource={cleanDraftContent(generatedPost).trim() || cleanDraftContent(alchemyOutput).trim() || topic.trim() || context.strongestTheme}
            defaultPlatform={selectedOutputPlatform}
            defaultPillar={createPillarFocus === 'auto' ? 'auto' : createPillarFocus}
            busyTool={studioToolBusy}
            error={studioToolError}
            result={studioToolResult}
            onGenerate={(kind, payload) => void generateStudioTool(kind, payload)}
            onOpenDrafting={() => navigateContent('studio', { topic: context.strongestTheme })}
          />
        )}

        {activeWorkspace === 'content' && activeSection === 'editorial' && (
          <EditorialCalendarTab>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Editorial Calendar</p>
                <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Plan the rhythm before the post</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/62">
                  Choose how often Kagiso can realistically show up, then generate a plan around those exact slots.
                </p>
                <p className="mt-2 max-w-2xl text-[12px] italic leading-relaxed text-[#6B6B6B]">
                  This is your editorial calendar for content planning. For sessions and appointments, go to Calendar in the main nav.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={suggestCalendarPlan} disabled={createBusy || calendarSlotDates.length === 0} className="studio-primary-button">
                  {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate plan
                </button>
                <button type="button" onClick={() => setCalendarModal({ mode: 'create' })} className="studio-secondary-button">
                  <Plus className="h-4 w-4" /> Add post
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <div className="rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">How often can you post?</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#142334]/62">{calendarFrequencyOption.description}</p>
                  </div>
                  <div className="flex rounded-[8px] bg-white p-1 ring-1 ring-[#E4D8CB]">
                    {calendarPlanLengthOptions.map((length) => (
                      <button
                        key={length}
                        type="button"
                        onClick={() => setCalendarPlanLength(length)}
                        aria-pressed={calendarPlanLength === length}
                        className={`h-9 rounded-[6px] px-3 text-[12px] font-bold transition ${
                          calendarPlanLength === length
                            ? 'bg-[#142334] text-white'
                            : 'text-[#142334]/60 hover:bg-[#F5F3EE] hover:text-[#142334]'
                        }`}
                      >
                        {length}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {calendarFrequencyOptions.map((option) => {
                    const isSelected = calendarFrequency === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCalendarFrequency(option.value)}
                        aria-pressed={isSelected}
                        className={`min-h-[54px] rounded-[8px] border px-4 py-3 text-left text-[14px] font-bold transition ${
                          isSelected
                            ? 'border-[#142334] bg-[#142334] text-white shadow-[0_8px_20px_rgba(20,35,52,0.12)]'
                            : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#F5F3EE]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {calendarFrequency === 'custom' && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Pick your days</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {calendarDayOptions.map((day) => {
                        const isSelected = calendarCustomDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleCalendarCustomDay(day.value)}
                            aria-pressed={isSelected}
                            className={`h-11 min-w-12 rounded-[8px] border px-3 text-[12px] font-bold transition ${
                              isSelected
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#E4D8CB] bg-white text-[#142334]/70 hover:border-[#C9AD98] hover:text-[#142334]'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 rounded-[8px] border border-[#E4D8CB] bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[13px] leading-relaxed text-[#142334]/72">
                    <span className="font-semibold text-[#142334]">Posting</span>
                    {calendarPostingDays.length ? (
                      calendarPostingDays.map((day) => (
                        <span
                          key={day}
                          className="rounded-full border border-[#D7C2B2] bg-[#F8F6F4] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[#8C7466] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_10px_rgba(20,35,52,0.04)]"
                        >
                          {getCalendarDayLabel(day)}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-[#D7C2B2] bg-[#F8F6F4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                        No days selected
                      </span>
                    )}
                    <span className="text-[#142334]/52">-</span>
                    <span>
                      {calendarSlotDates.length} post{calendarSlotDates.length === 1 ? '' : 's'} over {calendarPlanLength} days
                    </span>
                    <span className="text-[#142334]/52">-</span>
                    <span>
                      Register: <span className="font-semibold text-[#142334]">{calendarToneOption.label}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[8px] border border-[#E4D8CB] bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Voice and pillars</p>
                <div className="mt-3 grid gap-2">
                  {calendarToneOptions.map((option) => {
                    const isSelected = calendarTone === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCalendarTone(option.value)}
                        aria-pressed={isSelected}
                        className={`rounded-[8px] border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? 'border-[#142334] bg-[#142334] text-white'
                            : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                        }`}
                      >
                        <span className="block text-[13px] font-bold">{option.label}</span>
                        <span className={`mt-1 block text-[11px] ${isSelected ? 'text-white/62' : 'text-[#142334]/52'}`}>
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-2">
                  <span className="studio-label">Pillar focus</span>
                  <FilterDropdown
                    name="calendarPillarFocus"
                    value={calendarPillarFocus}
                    onChange={(value) => setCalendarPillarFocus(value as ContentPillar | 'auto')}
                    ariaLabel="Choose editorial calendar pillar focus"
                    options={[
                      { value: 'auto', label: 'Auto-balance from signals' },
                      ...Object.entries(pillarMeta).map(([value, meta]) => ({
                        value,
                        label: meta.label,
                      })),
                    ]}
                  />
                </div>
                <label className="mt-3 grid gap-2">
                  <span className="studio-label">Voice sample</span>
                  <textarea
                    value={calendarVoiceSample}
                    onChange={(event) => setCalendarVoiceSample(event.target.value)}
                    onWheel={trapWheel}
                    rows={3}
                    placeholder="Paste a short sample if this plan should match a specific writing style."
                    className="studio-input resize-y px-4 py-3 text-[13px] leading-relaxed"
                  />
                </label>
              </div>
            </div>

            {calendarPlan && (
              <div className="mt-5 rounded-[8px] bg-[#F5F3EE] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">AI suggested plan</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/62">
                      Built from the selected cadence. Review it, then add only what Kagiso approves.
                    </p>
                  </div>
                  <button type="button" onClick={() => setCalendarPlan('')} className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#142334]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <OutputPanel value={calendarPlan} className="mt-4 min-h-[220px] bg-white" />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Calendar workspace</p>
                <p className="mt-1 text-[13px] text-[#142334]/62">
                  Slot days are highlighted. Empty days stay open unless you add something manually.
                </p>
              </div>
              <div className="rounded-full bg-[#F5F3EE] px-4 py-2 text-[12px] font-bold text-[#142334]/72">
                {calendarSlotDates.length} planned slot{calendarSlotDates.length === 1 ? '' : 's'} in view
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-7">
              {buildPlanDays(calendarPlanLength).map((week, weekIndex) =>
                week.map((day) => {
                  const dayItems = itemsByDate[day] || [];
                  const isSlotDay = calendarSlotDateSet.has(day);
                  return (
                    <div
                      key={day}
                      className={`min-h-[168px] rounded-[8px] border p-3 ${
                        isSlotDay
                          ? 'border-[#C9AD98] bg-[#FBFAF8] shadow-[0_8px_22px_rgba(20,35,52,0.06)]'
                          : 'border-[#E4D8CB] bg-[#F8F6F4]'
                      } ${weekIndex === 0 ? 'lg:min-h-[196px]' : ''}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
                          {formatDayLabel(day)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                          isSlotDay ? 'bg-[#142334] text-white' : 'bg-white text-[#142334]/38'
                        }`}>
                          {isSlotDay ? 'Slot' : 'Open'}
                        </span>
                      </span>
                      <span className="mt-3 grid gap-2">
                        {dayItems.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setCalendarModal({ mode: 'create', defaults: { publishDate: day } })}
                            className={`grid h-24 place-items-center rounded-[8px] border border-dashed text-[12px] transition ${
                              isSlotDay
                                ? 'border-[#C9AD98] bg-white text-[#142334]/70 hover:border-[#142334] hover:bg-[#F2ECE7]'
                                : 'border-[#D8C8BB] text-[#142334]/38 hover:border-[#142334]/45 hover:bg-white hover:text-[#142334]/62'
                            }`}
                          >
                            <span className="flex flex-col items-center gap-1">
                              <Plus className="h-4 w-4" />
                              {isSlotDay ? 'Plan post' : 'Add anyway'}
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

        {activeWorkspace === 'content' && activeSection === 'vault' && (
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
                  <FilterDropdown
                    name="vaultPillarFilter"
                    value={backlogPillarFilter}
                    onChange={(value) => setBacklogPillarFilter(value as 'all' | ContentPillar)}
                    ariaLabel="Filter Vault by pillar"
                    options={[
                      { value: 'all', label: 'All pillars' },
                      ...Object.entries(pillarMeta).map(([value, meta]) => ({
                        value,
                        label: meta.label,
                      })),
                    ]}
                  />
                  <FilterDropdown
                    name="vaultStatusFilter"
                    value={backlogStatusFilter}
                    onChange={(value) => setBacklogStatusFilter(value as 'all' | ContentBacklogStatus)}
                    ariaLabel="Filter Vault by status"
                    options={[
                      { value: 'all', label: 'All statuses' },
                      ...Object.entries(backlogStatusMeta).map(([value, meta]) => ({
                        value,
                        label: meta.label,
                      })),
                    ]}
                  />
                  <FilterDropdown
                    name="vaultPlatformFilter"
                    value={backlogPlatformFilter}
                    onChange={(value) => setBacklogPlatformFilter(value as 'all' | ContentPlatform)}
                    ariaLabel="Filter Vault by platform"
                    options={[
                      { value: 'all', label: 'All platforms' },
                      ...Object.entries(platformLabels).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]}
                  />
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
                    const carouselDraft = getCarouselDraftFromBacklogItem(item);
                    return (
                      <article key={item.id} className="flex min-h-[260px] flex-col justify-between rounded-[10px] border border-[#E4D8CB] bg-white p-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={activeVaultSection === 'messy' ? 'bg-[#F3E8FF] text-[#7C3AED]' : 'bg-[#F5F3EE] text-[#6B6B6B]'}>
                            {activeVaultSection === 'messy' ? 'Rough Thought' : getBacklogSourceLabel(item)}
                          </Badge>
                          {item.isFavorite && (
                            <Badge className="gap-1 border border-[#F2C6B8] bg-[#FFF4EF] text-[#A24E37]">
                              <span aria-hidden="true">❤️</span> Favourite
                            </Badge>
                          )}
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
                            <button type="button" onClick={() => openVaultItem(item)} className="studio-card-action-button">
                              {carouselDraft ? 'Open Carousel Studio' : isSmartSuggestItem(item) ? 'Open in Create' : 'Open Draft'}
                            </button>
                          )}
                          {activeVaultSection !== 'messy' && (
                            <button type="button" onClick={() => setBacklogModal({ mode: 'edit', item })} className="studio-card-action-button">
                              Edit Details
                            </button>
                          )}
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

        {activeWorkspace === 'content' && activeSection === 'research' && (
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
          vaultItems={backlogRecords}
          onClose={() => setCalendarModal(null)}
          onSaved={(item) => {
            setCalendarRecords((current) =>
              calendarModal.mode === 'edit'
                ? current.map((record) => (record.id === item.id ? item : record))
                : [...current, item].sort((a, b) => a.publishDate.localeCompare(b.publishDate)),
            );
            setCalendarModal(null);
            activateWorkspace('content');
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
            activateWorkspace('content');
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
  profilePhotoUrl,
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
  profilePhotoUrl?: string | null;
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
            <DashboardProfileAvatar src={profilePhotoUrl} />
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
  profilePhotoUrl,
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
  profilePhotoUrl?: string | null;
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
              profilePhotoUrl={profilePhotoUrl}
              onChange={onOutputChange}
              onRegenerate={onRebuild}
              onPolish={onPolish}
              onSave={onSave}
              onCalendar={onCalendar}
              outputNote={transformationNote}
              actionsDisabled={busy}
              isRegenerating={stage === 'rebuilding'}
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
  carouselDraft,
  formatOutput,
  imagePromptOptions,
  imagePromptBusy,
  imagePromptError,
  signalBriefOptions,
  canGenerate,
  busy,
  isRegenerating,
  topicInputRef,
  prepopulateNotice,
  pulseKey,
  onPlatformSelect,
  onTypeSelect,
  onSubTypeSelect,
  onAngleSelect,
  onCarouselSlideCountSelect,
  onCarouselAspectRatioSelect,
  onCarouselTemplateSelect,
  onCarouselLayoutRecipeSelect,
  onTopicChange,
  onTopicSourceSelect,
  onBriefSelect,
  onGenerate,
  onGeneratedPostChange,
  onPolish,
  onFormatCheck,
  onGenerateImagePrompts,
  onSave,
  saveLabel,
  onCalendar,
  profilePhotoUrl,
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
  carouselDraft: CarouselDraftPayload | null;
  formatOutput: string;
  imagePromptOptions: ImagePromptOption[];
  imagePromptBusy: boolean;
  imagePromptError: string | null;
  signalBriefOptions: Array<{ id: string; title: string; text: string }>;
  canGenerate: boolean;
  busy: boolean;
  isRegenerating: boolean;
  topicInputRef: Ref<HTMLTextAreaElement>;
  prepopulateNotice: string | null;
  pulseKey: SmartPulseKey | null;
  onPlatformSelect: (platform: CreatePlatform) => void;
  onTypeSelect: (type: ContentTypeOption) => void;
  onSubTypeSelect: (subType: string) => void;
  onAngleSelect: (angle: AngleOption) => void;
  onCarouselSlideCountSelect: (slideCount: CarouselSlideCount) => void;
  onCarouselAspectRatioSelect: (aspectRatio: CarouselAspectRatio) => void;
  onCarouselTemplateSelect: (template: CarouselTemplate) => void;
  onCarouselLayoutRecipeSelect: (layoutRecipe: CarouselLayoutRecipe) => void;
  onTopicChange: (value: string) => void;
  onTopicSourceSelect: (source: TopicSource) => void;
  onBriefSelect: (text: string) => void;
  onGenerate: () => void;
  onGeneratedPostChange: (value: string) => void;
  onPolish: () => void;
  onFormatCheck: () => void;
  onGenerateImagePrompts: () => void;
  onSave: () => void;
  saveLabel?: string;
  onCalendar: () => void;
  profilePhotoUrl?: string | null;
}) {
  const contentTypeGroups = selection.platform ? contentTypesByPlatform[selection.platform] : [];
  const contentTypes = contentTypeGroups.flatMap((group) => group.types);
  const contentRows = chunkItems(contentTypes, 4);
  const selectedSubType = selectedType?.subTypes.find((item) => item.id === selection.subType) || null;
  const isCaptionReelType = selectedType?.id === 'caption_reel';
  const angleReady = Boolean(selectedType && (selectedType.subTypes.length === 0 || selection.subType));
  const needsCarouselSlideCount = selection.contentType === 'carousel' && Boolean(selection.angle);
  const outputTitle = selection.contentType === 'voice_note'
    ? 'Voice note script'
    : selection.contentType === 'carousel'
      ? 'Carousel draft'
      : 'Content preview';
  const generatedPostBody = cleanDraftContent(generatedPost);
  const outputNote = generatedPost ? (
    selection.contentType === 'voice_note' ? (
      <>~{getEstimatedReadSeconds(generatedPostBody)} seconds read time</>
    ) : carouselDraft ? (
      <>
        Structured carousel draft - {carouselDraft.slides.length} slides - {getCarouselTemplateOption(carouselDraft.template).label} - {getCarouselLayoutRecipeOption(carouselDraft.layoutRecipe).label}
      </>
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
  const carouselAspectRatioSection = needsCarouselSlideCount ? (
    <CarouselAspectRatioSelector
      value={selection.carouselAspectRatio}
      platform={selection.platform}
      onChange={onCarouselAspectRatioSelect}
      eyebrow="05 Output frame"
      title="Choose the slide shape"
    />
  ) : null;
  const carouselTemplateSection = needsCarouselSlideCount ? (
    <CarouselTemplateSelector
      value={selection.carouselTemplate}
      onChange={onCarouselTemplateSelect}
      eyebrow="06 Visual style"
      title="Choose the styling system"
    />
  ) : null;
  const carouselLayoutRecipeSection = needsCarouselSlideCount ? (
    <CarouselLayoutRecipeSelector
      value={selection.carouselLayoutRecipe}
      onChange={onCarouselLayoutRecipeSelect}
      eyebrow="07 Story structure"
      title="Choose the slide arc"
    />
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
                      : 'border-[#D7C2B2] bg-[#FBFAF8] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
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
                    <div className="grid gap-3 md:grid-cols-2">
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
                      <div className="rounded-[8px] bg-[#F5F3EE] p-3">
                        {isCaptionReelType && (
                          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Format path</p>
                              <p className="mt-1 text-[13px] leading-relaxed text-[#142334]/68">
                                Choose a normal Instagram/Facebook post or shape the Facebook version as a comment thread.
                              </p>
                            </div>
                            {selectedSubType && <Badge className="bg-white text-[#8C7466]">{selectedSubType.label}</Badge>}
                          </div>
                        )}
                        <div className={`grid gap-2 ${isCaptionReelType ? 'sm:grid-cols-2 2xl:grid-cols-3' : 'md:grid-cols-3'}`}>
                          {selectedType.subTypes.map((subType) => {
                            const isSelected = selection.subType === subType.id;
                            return (
                              <button
                                key={subType.id}
                                type="button"
                                onClick={() => onSubTypeSelect(subType.id)}
                                style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
                                className={`min-h-10 border px-3 py-2 text-[12px] font-semibold transition ${
                                  isCaptionReelType ? 'rounded-[8px] text-left' : 'rounded-full text-center'
                                } ${
                                  isSelected
                                    ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                                    : 'border-white bg-white text-[#142334]/68 hover:border-[#C9AD98] hover:text-[#142334]'
                                }`}
                              >
                                <span className="block">{subType.label}</span>
                                {isCaptionReelType && subType.description && (
                                  <span className={`mt-1 block text-[11px] leading-snug ${isSelected ? 'text-white/62' : 'text-[#142334]/50'}`}>
                                    {subType.description}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
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
                    {rowHasSelected && carouselAspectRatioSection}
                    {rowHasSelected && carouselTemplateSection}
                    {rowHasSelected && carouselLayoutRecipeSection}
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
                  {needsCarouselSlideCount ? '08 Core idea' : '04 Core idea'}
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
            value={generatedPostBody}
            wordCount={getWordCount(generatedPostBody)}
            platformLabel={selectedPlatformLabel || 'LinkedIn'}
            contentTypeLabel={selectedType ? `${selectedType.label}${selectedSubType ? ` / ${selectedSubType.label}` : ''}` : outputTitle}
            registerLabel={selectedAngle ? getRegisterLabel(selectedAngle.register) : undefined}
            pillarLabel={getPillarFocusLabel(pillarFocus)}
            profilePhotoUrl={profilePhotoUrl}
            onChange={onGeneratedPostChange}
            onRegenerate={onGenerate}
            onPolish={onPolish}
            onSave={onSave}
            saveLabel={carouselDraft ? 'Save to Carousel Studio' : saveLabel}
            onCalendar={onCalendar}
            outputNote={outputNote}
            actionsDisabled={busy}
            isRegenerating={isRegenerating}
            extraAction={
              <ContentPreviewHelpers
                busy={busy}
                formatOutput={formatOutput}
                imagePromptOptions={imagePromptOptions}
                imagePromptBusy={imagePromptBusy}
                imagePromptError={imagePromptError}
                onFormatCheck={onFormatCheck}
                onGenerateImagePrompts={onGenerateImagePrompts}
              />
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

function ContentPreviewHelpers({
  busy,
  formatOutput,
  imagePromptOptions,
  imagePromptBusy,
  imagePromptError,
  onFormatCheck,
  onGenerateImagePrompts,
}: {
  busy: boolean;
  formatOutput: string;
  imagePromptOptions: ImagePromptOption[];
  imagePromptBusy: boolean;
  imagePromptError: string | null;
  onFormatCheck: () => void;
  onGenerateImagePrompts: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onFormatCheck}
          disabled={busy}
          className="studio-ghost-button w-fit"
        >
          Format check <ClipboardCheck className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onGenerateImagePrompts}
          disabled={busy || imagePromptBusy}
          className="studio-secondary-button w-fit"
        >
          {imagePromptBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {imagePromptBusy ? 'Generating...' : 'Image prompt'}
        </button>
      </div>

      {formatOutput && <OutputPanel value={formatOutput} className="min-h-[180px] bg-white" />}

      {imagePromptError && <Notice tone="error">{imagePromptError}</Notice>}
      {imagePromptOptions.length > 0 && <ImagePromptCards options={imagePromptOptions} />}
    </div>
  );
}

function ImagePromptCards({ options }: { options: ImagePromptOption[] }) {
  const [copiedKind, setCopiedKind] = useState<ImagePromptKind | null>(null);

  async function copyPrompt(option: ImagePromptOption) {
    await navigator.clipboard.writeText(formatImagePromptForClipboard(option));
    setCopiedKind(option.kind);
    window.setTimeout(() => setCopiedKind(null), 1600);
  }

  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const meta = imagePromptMeta[option.kind];
        const Icon = meta.icon;
        const isDark = option.kind === 'designed_graphic';
        return (
          <article key={option.kind} className={`rounded-[10px] border p-4 ${meta.className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${isDark ? 'bg-white/10 text-white' : 'bg-[#F5F3EE] text-[#8C7466]'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark ? 'text-white/58' : 'text-[#8C7466]'}`}>
                    {meta.label}
                  </p>
                  <h4 className={`mt-1 font-serif text-[23px] leading-tight ${isDark ? 'text-white' : 'text-[#142334]'}`}>
                    {option.title}
                  </h4>
                </div>
              </div>
              <Badge className={meta.badgeClassName}>{option.aspectRatio}</Badge>
            </div>

            <div className={`mt-4 rounded-[8px] p-3 ${isDark ? 'bg-white/[0.08]' : 'bg-[#F8F6F4]'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-white/55' : 'text-[#8C7466]'}`}>Best use</p>
              <p className={`mt-1 text-[13px] leading-relaxed ${isDark ? 'text-white/72' : 'text-[#142334]/68'}`}>{option.bestUse}</p>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-white/55' : 'text-[#8C7466]'}`}>
                  Highly detailed image prompt
                </p>
                <p className={`mt-2 max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-[8px] border p-3 text-[13px] leading-[1.65] ${isDark ? 'border-white/10 bg-white text-[#142334]' : 'border-[#E4D8CB] bg-white text-[#142334]/78'}`} onWheel={trapWheel}>
                  {option.prompt}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDark ? 'text-white/55' : 'text-[#8C7466]'}`}>
                  Negative prompt
                </p>
                <p className={`mt-2 rounded-[8px] border p-3 text-[12px] leading-relaxed ${isDark ? 'border-white/10 bg-white/[0.08] text-white/72' : 'border-[#E4D8CB] bg-white text-[#142334]/64'}`}>
                  {option.negativePrompt}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void copyPrompt(option)}
              className={`mt-4 ${isDark ? 'studio-secondary-button' : 'studio-primary-button'}`}
            >
              <ClipboardCheck className="h-4 w-4" />
              {copiedKind === option.kind ? 'Copied' : 'Copy prompt'}
            </button>
          </article>
        );
      })}
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
        ? selectedType?.id === 'caption_reel'
          ? 'Choose normal post or Facebook thread.'
          : 'Choose the post subtype.'
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

function CarouselAspectRatioSelector({
  value,
  platform,
  onChange,
  eyebrow = 'Output frame',
  title = 'Aspect ratio',
  disabled = false,
}: {
  value: CarouselAspectRatio;
  platform?: CreatePlatform | null;
  onChange: (value: CarouselAspectRatio) => void;
  eyebrow?: string;
  title?: string;
  disabled?: boolean;
}) {
  const selectedOption = carouselAspectRatioOptions.find((option) => option.value === value) || carouselAspectRatioOptions[0];
  const resolvedOption = getCarouselAspectRatioOption(value, platform);

  return (
    <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">{title}</h3>
        </div>
        <Badge className="bg-[#F5F3EE] text-[#8C7466]">
          {value === 'auto' ? `Auto: ${resolvedOption.label}` : selectedOption.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
        {carouselAspectRatioOptions.map((option) => {
          const isSelected = value === option.value;
          const previewOption = option.value === 'auto' ? resolvedOption : option;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
              className={`group min-h-[132px] rounded-[8px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                  : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`grid w-12 shrink-0 place-items-center rounded-[6px] border ${
                    isSelected ? 'border-white/18 bg-white/12' : 'border-[#D8C8BA] bg-white'
                  }`}
                  style={{ aspectRatio: previewOption.cssRatio }}
                >
                  <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-[#C9AD98]' : 'bg-[#142334]'}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{option.label}</span>
                  <span className={`mt-1 block text-[11px] font-semibold ${isSelected ? 'text-white/68' : 'text-[#8C7466]'}`}>
                    {option.value === 'auto' ? resolvedOption.size : option.size}
                  </span>
                </span>
              </span>
              <span className={`mt-3 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/62'}`}>
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CarouselTemplateSelector({
  value,
  onChange,
  eyebrow = 'Visual style',
  title = 'Template',
  disabled = false,
}: {
  value: CarouselTemplate;
  onChange: (value: CarouselTemplate) => void;
  eyebrow?: string;
  title?: string;
  disabled?: boolean;
}) {
  const selectedOption = getCarouselTemplateOption(value);

  return (
    <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">{title}</h3>
        </div>
        <Badge className="bg-[#F5F3EE] text-[#8C7466]">{selectedOption.label}</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {carouselTemplateOptions.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
              className={`min-h-[176px] rounded-[8px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                  : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
              }`}
            >
              <span className="grid grid-cols-3 gap-1">
                {[
                  option.palette.background,
                  option.palette.foreground,
                  option.palette.accent,
                ].map((color) => (
                  <span
                    key={color}
                    className={`h-8 rounded-[6px] border ${isSelected ? 'border-white/20' : 'border-[#E4D8CB]'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="mt-4 block text-[13px] font-bold">{option.label}</span>
              <span className={`mt-1 block text-[11px] font-semibold ${isSelected ? 'text-white/68' : 'text-[#8C7466]'}`}>
                {option.bestFor}
              </span>
              <span className={`mt-2 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/62'}`}>
                {option.description}
              </span>
              <span className={`mt-3 block rounded-[6px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                isSelected
                  ? 'border-white/15 bg-white/10 text-white/76'
                  : 'border-[#E4D8CB] bg-white text-[#8C7466]'
              }`}>
                {option.designDirection.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CarouselLayoutRecipeSelector({
  value,
  onChange,
  eyebrow = 'Story structure',
  title = 'Slide arc',
  disabled = false,
}: {
  value: CarouselLayoutRecipe;
  onChange: (value: CarouselLayoutRecipe) => void;
  eyebrow?: string;
  title?: string;
  disabled?: boolean;
}) {
  const selectedOption = getCarouselLayoutRecipeOption(value);

  return (
    <section className="rounded-[8px] border border-[#E4D8CB] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">{title}</h3>
        </div>
        <Badge className="bg-[#F5F3EE] text-[#8C7466]">{selectedOption.label}</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {carouselLayoutRecipeOptions.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              style={isSelected ? { outline: '2px solid #C9AD98' } : undefined}
              className={`min-h-[168px] rounded-[8px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                  : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
              }`}
            >
              <span className="block text-[13px] font-bold">{option.label}</span>
              <span className={`mt-2 block text-[12px] leading-relaxed ${isSelected ? 'text-white/68' : 'text-[#142334]/62'}`}>
                {option.description}
              </span>
              <span className={`mt-3 block rounded-[6px] border px-2 py-2 text-[11px] font-semibold leading-relaxed ${
                isSelected
                  ? 'border-white/15 bg-white/10 text-white/76'
                  : 'border-[#E4D8CB] bg-white text-[#8C7466]'
              }`}>
                {option.slideArc.join(' -> ')}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getCarouselSlideBodyPoints(body: string, limit = 4) {
  return body
    .split(/\n+|;\s+|(?<=\.)\s+/)
    .map((point) => point.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, limit);
}

function getCarouselSlideTextStats(slide: CarouselSlide) {
  const headlineWords = slide.headline.trim().split(/\s+/).filter(Boolean).length;
  const bodyWords = slide.body.trim().split(/\s+/).filter(Boolean).length;
  const totalChars = `${slide.headline} ${slide.body} ${slide.cta || ''}`.trim().length;

  return {
    headlineWords,
    bodyWords,
    totalChars,
    density: totalChars > 260 || bodyWords > 44 ? 'dense' : totalChars > 160 || bodyWords > 26 ? 'medium' : 'light',
  };
}

function resolveCarouselComposition(
  slide: CarouselSlide,
  role: CarouselSlideRole,
  template: ReturnType<typeof getCarouselTemplateOption>,
  bodyPoints: string[],
): CarouselComposition {
  const selected = normalizeCarouselComposition(slide.composition, role);
  if (selected !== 'auto') return selected;

  const stats = getCarouselSlideTextStats(slide);

  if (role === 'cover') {
    if (stats.headlineWords <= 6 && stats.bodyWords <= 18 && template.value === 'bold_diagnostic') return 'bold_claim';
    if (stats.headlineWords > 10 || stats.bodyWords > 28) return 'quiet_intro';
    return 'editorial_cover';
  }

  if (role === 'cta') {
    const actionText = `${slide.headline} ${slide.body} ${slide.cta || ''}`.toLowerCase();
    if (actionText.includes('save') || actionText.includes('share')) return 'save_share_close';
    if (slide.cta || stats.bodyWords <= 18) return 'direct_action';
    return 'soft_reflection';
  }

  if (role === 'proof') {
    if (stats.bodyWords > 30) return 'example_note';
    if (stats.headlineWords <= 6 && stats.bodyWords <= 18) return 'credibility_cue';
    return 'evidence_card';
  }

  if (role === 'framework' || role === 'step' || role === 'checklist' || role === 'rule') {
    if (bodyPoints.length >= 3 && stats.density !== 'dense') return 'card_grid';
    if (stats.density === 'dense') return 'side_rail';
    return 'numbered_stack';
  }

  if (stats.bodyWords > 34) return 'note_card';
  if (slide.body.includes(':') || slide.body.toLowerCase().includes('not ')) return 'contrast_block';
  return 'quote_panel';
}

function getCarouselHeadlineSize(composition: CarouselComposition, stats: ReturnType<typeof getCarouselSlideTextStats>) {
  if (composition === 'bold_claim') return stats.headlineWords > 7 ? 40 : 48;
  if (composition === 'editorial_cover') return stats.headlineWords > 9 ? 36 : 42;
  if (composition === 'quiet_intro') return 32;
  if (composition === 'direct_action') return 38;
  if (composition === 'save_share_close') return 34;
  if (composition === 'credibility_cue') return 38;
  if (composition === 'card_grid' || composition === 'side_rail' || composition === 'note_card') return 30;
  return stats.headlineWords > 9 ? 30 : 34;
}

type CarouselDeckQualityTone = 'ready' | 'watch' | 'fix';

type CarouselDeckFixAction =
  | { type: 'set_role'; label: string; slideIndex: number; role: CarouselSlideRole }
  | { type: 'set_composition'; label: string; slideIndex: number; composition: CarouselComposition }
  | { type: 'split_slide'; label: string; slideIndex: number }
  | { type: 'add_role_slide'; label: string; role: CarouselSlideRole; insertIndex: number }
  | { type: 'strengthen_cta'; label: string; slideIndex: number }
  | { type: 'rebalance_compositions'; label: string; composition: CarouselComposition };

type CarouselDeckQualityItem = {
  id: string;
  tone: CarouselDeckQualityTone;
  title: string;
  detail: string;
  slideIndex?: number;
  action?: CarouselDeckFixAction;
};

type CarouselDeckQualityReport = {
  score: number;
  tone: CarouselDeckQualityTone;
  statusLabel: string;
  summary: string;
  metrics: {
    denseSlides: number;
    uniqueCompositions: number;
    forcedCompositions: number;
  };
  items: CarouselDeckQualityItem[];
};

type CarouselDraftUndoEntry = {
  draft: CarouselDraftPayload;
  label: string;
  createdAt: string;
};

type CarouselDraftHistoryState = {
  recordId: string | null;
  originalDraft: CarouselDraftPayload | null;
  undoStack: CarouselDraftUndoEntry[];
  notice: string | null;
};

function addCarouselDeckQualityItem(
  items: CarouselDeckQualityItem[],
  item: CarouselDeckQualityItem,
) {
  if (items.some((existing) => existing.id === item.id)) return;
  items.push(item);
}

function getDensitySafeCarouselComposition(role: CarouselSlideRole): CarouselComposition {
  if (role === 'framework' || role === 'step' || role === 'checklist' || role === 'rule') return 'side_rail';
  if (role === 'proof') return 'example_note';
  if (role === 'cta') return 'soft_reflection';
  if (role === 'cover') return 'quiet_intro';
  return 'note_card';
}

function getDefaultCarouselSlideCopy(role: CarouselSlideRole, title: string) {
  const topic = title || 'this idea';
  const copy: Record<CarouselSlideRole, { headline: string; body: string; cta?: string }> = {
    cover: {
      headline: topic,
      body: 'A focused carousel for turning the idea into a clear, useful sequence.',
    },
    reframe: {
      headline: 'The better way to see this',
      body: 'Most people solve the visible problem. The real shift starts when you name the pattern underneath it.',
    },
    framework: {
      headline: 'A simple framework',
      body: 'Name the pattern. Choose the next move. Make it visible. Repeat with proof.',
    },
    step: {
      headline: 'The next practical step',
      body: 'Choose one small action that makes the idea easier to apply today.',
    },
    proof: {
      headline: 'Why this matters',
      body: 'This is where the idea moves from opinion to evidence, example, or lived pattern.',
    },
    cta: {
      headline: 'Your next move',
      body: 'Save this for the moment you need a clearer path forward.',
      cta: 'Save this and message me when you are ready to take the next step.',
    },
    mirror: {
      headline: 'If this feels familiar',
      body: 'You are not the only one navigating this. Naming it clearly is often the first relief.',
    },
    checklist: {
      headline: 'Quick checklist',
      body: 'Check the signal. Clarify the goal. Choose one action. Review what changed.',
    },
    reflection: {
      headline: 'A question to sit with',
      body: 'What would change if you stopped treating this as a personal flaw and started treating it as a pattern?',
    },
    diagnosis: {
      headline: 'The hidden problem',
      body: 'The obvious issue is not always the real blocker. Look for the repeated pattern.',
    },
    myth: {
      headline: 'The myth to drop',
      body: 'The familiar advice sounds useful, but it can keep you solving the wrong problem.',
    },
    cost: {
      headline: 'The cost of ignoring it',
      body: 'When this stays unnamed, the same decision keeps showing up in different forms.',
    },
    rule: {
      headline: 'A better rule',
      body: 'If the action does not create clarity, feedback, or movement, it is probably not the next step.',
    },
  };

  return copy[role];
}

function createCarouselRoleSlide(
  role: CarouselSlideRole,
  index: number,
  title: string,
): CarouselSlide {
  const copy = getDefaultCarouselSlideCopy(role, title);
  return {
    id: `slide-${Date.now()}-${role}-${index}`,
    role,
    composition: 'auto',
    headline: copy.headline,
    body: copy.body,
    ...(copy.cta ? { cta: copy.cta } : {}),
    visualSuggestion: '',
  };
}

function splitCarouselSlideLocally(draft: CarouselDraftPayload, slideIndex: number): CarouselDraftPayload {
  if (draft.slides.length >= carouselMaxSlides) return draft;
  const slide = draft.slides[slideIndex];
  if (!slide) return draft;

  const bodyPoints = getCarouselSlideBodyPoints(slide.body, 8);
  const bodyWords = slide.body.trim().split(/\s+/).filter(Boolean);
  const splitAt = Math.max(1, Math.ceil((bodyPoints.length || bodyWords.length) / 2));
  const firstBody = bodyPoints.length >= 2
    ? bodyPoints.slice(0, splitAt).join('. ')
    : bodyWords.slice(0, Math.ceil(bodyWords.length / 2)).join(' ');
  const secondBody = bodyPoints.length >= 2
    ? bodyPoints.slice(splitAt).join('. ')
    : bodyWords.slice(Math.ceil(bodyWords.length / 2)).join(' ');

  if (!secondBody.trim()) return draft;

  const nextSlide: CarouselSlide = {
    ...slide,
    id: `slide-${Date.now()}-split-${slideIndex}`,
    role: slide.role === 'cover' || slide.role === 'cta' ? 'step' : slide.role,
    composition: 'auto',
    headline: slide.role === 'cover' ? 'The missing context' : `${slide.headline} continued`,
    body: secondBody,
    cta: undefined,
  };

  return {
    ...draft,
    slides: draft.slides.flatMap((currentSlide, index) =>
      index === slideIndex
        ? [{ ...currentSlide, body: firstBody, composition: 'auto' }, nextSlide]
        : [currentSlide],
    ),
  };
}

function rebalanceCarouselCompositions(
  draft: CarouselDraftPayload,
  repeatedComposition: CarouselComposition,
): CarouselDraftPayload {
  let changed = 0;
  return {
    ...draft,
    slides: draft.slides.map((slide, index) => {
      const role = slide.role || getDefaultCarouselSlideRole(draft.layoutRecipe, index, draft.slides.length);
      const resolved = resolveCarouselComposition(
        slide,
        role,
        getCarouselTemplateOption(draft.template),
        getCarouselSlideBodyPoints(slide.body),
      );
      if (resolved !== repeatedComposition || changed >= 2) return slide;
      const alternative = getCarouselCompositionOptionsForRole(role)
        .map((option) => option.value)
        .find((composition) => composition !== 'auto' && composition !== repeatedComposition);
      if (!alternative) return slide;
      changed += 1;
      return { ...slide, composition: alternative };
    }),
  };
}

function applyCarouselDeckFixAction(
  draft: CarouselDraftPayload,
  action: CarouselDeckFixAction,
): CarouselDraftPayload {
  if (action.type === 'split_slide') return splitCarouselSlideLocally(draft, action.slideIndex);

  if (action.type === 'add_role_slide') {
    if (draft.slides.length >= carouselMaxSlides) return draft;
    const insertIndex = Math.max(0, Math.min(action.insertIndex, draft.slides.length));
    const nextSlide = createCarouselRoleSlide(action.role, insertIndex, draft.title);
    return {
      ...draft,
      slides: [
        ...draft.slides.slice(0, insertIndex),
        nextSlide,
        ...draft.slides.slice(insertIndex),
      ],
    };
  }

  if (action.type === 'rebalance_compositions') {
    return rebalanceCarouselCompositions(draft, action.composition);
  }

  return {
    ...draft,
    slides: draft.slides.map((slide, index) => {
      if (index !== action.slideIndex) return slide;

      if (action.type === 'set_role') {
        return {
          ...slide,
          role: action.role,
          composition: 'auto',
        };
      }

      if (action.type === 'set_composition') {
        return {
          ...slide,
          composition: normalizeCarouselComposition(action.composition, slide.role),
        };
      }

      if (action.type === 'strengthen_cta') {
        return {
          ...slide,
          role: 'cta',
          composition: slide.composition === 'auto' ? 'direct_action' : slide.composition,
          cta: slide.cta?.trim() || 'Save this and message me when you are ready to take the next step.',
          body: slide.body.trim() || 'Choose one next move from this deck and act on it before the week closes.',
        };
      }

      return slide;
    }),
  };
}

function buildCarouselDeckQualityReport(
  draft: CarouselDraftPayload,
  template: ReturnType<typeof getCarouselTemplateOption>,
): CarouselDeckQualityReport {
  const items: CarouselDeckQualityItem[] = [];
  const slideReports = draft.slides.map((slide, index) => {
    const role = slide.role || getDefaultCarouselSlideRole(draft.layoutRecipe, index, draft.slides.length);
    const bodyPoints = getCarouselSlideBodyPoints(slide.body, 8);
    const stats = getCarouselSlideTextStats(slide);
    const composition = resolveCarouselComposition(slide, role, template, bodyPoints);

    return {
      slide,
      index,
      role,
      bodyPoints,
      stats,
      composition,
    };
  });

  const firstSlide = slideReports[0];
  const lastSlide = slideReports[slideReports.length - 1];

  if (firstSlide && firstSlide.role !== 'cover') {
    addCarouselDeckQualityItem(items, {
      id: 'cover-role',
      tone: 'fix',
      title: 'First slide is not a cover',
      detail: 'Set slide 1 to Cover so the export opens like a deck, not a middle slide.',
      slideIndex: 0,
      action: { type: 'set_role', label: 'Set as cover', slideIndex: 0, role: 'cover' },
    });
  }

  if (firstSlide && (firstSlide.stats.headlineWords > 12 || firstSlide.stats.totalChars > 240)) {
    addCarouselDeckQualityItem(items, {
      id: 'cover-density',
      tone: firstSlide.stats.headlineWords > 15 ? 'fix' : 'watch',
      title: 'Cover is carrying too much text',
      detail: 'Trim the cover or move context to slide 2 so the opening frame feels sharper.',
      slideIndex: 0,
      action: { type: 'set_composition', label: 'Use quiet intro', slideIndex: 0, composition: 'quiet_intro' },
    });
  }

  slideReports.forEach(({ index, role, stats, composition, bodyPoints }) => {
    if (stats.bodyWords > 58 || stats.totalChars > 360) {
      addCarouselDeckQualityItem(items, {
        id: `slide-${index}-overloaded`,
        tone: 'fix',
        title: `Slide ${index + 1} is overloaded`,
        detail: 'Split this into two slides or cut the body copy before exporting.',
        slideIndex: index,
        ...(draft.slides.length < carouselMaxSlides
          ? { action: { type: 'split_slide', label: 'Split slide', slideIndex: index } satisfies CarouselDeckFixAction }
          : {}),
      });
      return;
    }

    if (stats.density === 'dense') {
      const safeComposition = getDensitySafeCarouselComposition(role);
      addCarouselDeckQualityItem(items, {
        id: `slide-${index}-dense`,
        tone: 'watch',
        title: `Slide ${index + 1} is text-heavy`,
        detail: `Auto fit is using ${getCarouselCompositionOption(composition).label}; still check the exported frame for breathing room.`,
        slideIndex: index,
        action: { type: 'set_composition', label: `Use ${getCarouselCompositionOption(safeComposition).label}`, slideIndex: index, composition: safeComposition },
      });
    }

    if (stats.headlineWords > 13) {
      addCarouselDeckQualityItem(items, {
        id: `slide-${index}-headline`,
        tone: 'watch',
        title: `Slide ${index + 1} headline is long`,
        detail: 'A shorter headline will give the layout more visual authority.',
        slideIndex: index,
        action: { type: 'set_composition', label: 'Use safer layout', slideIndex: index, composition: getDensitySafeCarouselComposition(role) },
      });
    }

    if (bodyPoints.length > 4 && composition !== 'side_rail') {
      const safeComposition = getDensitySafeCarouselComposition(role);
      addCarouselDeckQualityItem(items, {
        id: `slide-${index}-points`,
        tone: 'watch',
        title: `Slide ${index + 1} has many points`,
        detail: 'Consider Side rail or split the list so the slide does not become a mini article.',
        slideIndex: index,
        action: { type: 'set_composition', label: `Use ${getCarouselCompositionOption(safeComposition).label}`, slideIndex: index, composition: safeComposition },
      });
    }
  });

  const compositionCounts = new Map<CarouselComposition, number>();
  slideReports.forEach(({ composition }) => {
    compositionCounts.set(composition, (compositionCounts.get(composition) || 0) + 1);
  });
  const mostRepeated = Array.from(compositionCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  if (mostRepeated && mostRepeated[1] >= Math.max(4, Math.ceil(draft.slides.length * 0.55))) {
    addCarouselDeckQualityItem(items, {
      id: 'composition-repetition',
      tone: 'watch',
      title: 'Composition rhythm is repetitive',
      detail: `${getCarouselCompositionOption(mostRepeated[0]).label} appears on ${mostRepeated[1]} slides. Override 1 or 2 slides for better rhythm.`,
      action: { type: 'rebalance_compositions', label: 'Rebalance layouts', composition: mostRepeated[0] },
    });
  }

  const hasTeachingSlide = slideReports.some(({ role }) =>
    role === 'framework' || role === 'step' || role === 'checklist' || role === 'rule',
  );
  const hasTensionSlide = slideReports.some(({ role }) =>
    role === 'reframe' || role === 'mirror' || role === 'diagnosis' || role === 'myth' || role === 'cost',
  );
  const hasProofSlide = slideReports.some(({ role }) => role === 'proof');

  if (!hasTensionSlide) {
    addCarouselDeckQualityItem(items, {
      id: 'missing-tension',
      tone: 'watch',
      title: 'Deck needs a clearer turn',
      detail: 'Add a reframe, myth, diagnosis, or mirror slide so the story has a stronger shift.',
      ...(draft.slides.length < carouselMaxSlides
        ? { action: { type: 'add_role_slide', label: 'Add reframe slide', role: 'reframe', insertIndex: 1 } satisfies CarouselDeckFixAction }
        : {}),
    });
  }

  if (!hasTeachingSlide) {
    addCarouselDeckQualityItem(items, {
      id: 'missing-teaching',
      tone: 'watch',
      title: 'Deck needs a teaching slide',
      detail: 'Add a framework, step, checklist, or rule slide so the reader leaves with something usable.',
      ...(draft.slides.length < carouselMaxSlides
        ? { action: { type: 'add_role_slide', label: 'Add step slide', role: 'step', insertIndex: Math.max(1, draft.slides.length - 1) } satisfies CarouselDeckFixAction }
        : {}),
    });
  }

  if (draft.slides.length >= 6 && !hasProofSlide) {
    addCarouselDeckQualityItem(items, {
      id: 'missing-proof',
      tone: 'watch',
      title: 'Proof cue is missing',
      detail: 'A proof, example, or credibility slide would make the deck feel less theoretical.',
      ...(draft.slides.length < carouselMaxSlides
        ? { action: { type: 'add_role_slide', label: 'Add proof slide', role: 'proof', insertIndex: Math.max(1, draft.slides.length - 1) } satisfies CarouselDeckFixAction }
        : {}),
    });
  }

  if (lastSlide && lastSlide.role !== 'cta') {
    addCarouselDeckQualityItem(items, {
      id: 'cta-role',
      tone: 'fix',
      title: 'Final slide is not a CTA',
      detail: 'Set the last slide to CTA so the deck closes with a clear next move.',
      slideIndex: lastSlide.index,
      action: { type: 'set_role', label: 'Set as CTA', slideIndex: lastSlide.index, role: 'cta' },
    });
  }

  if (lastSlide) {
    const ctaText = `${lastSlide.slide.headline} ${lastSlide.slide.body} ${lastSlide.slide.cta || ''}`.toLowerCase();
    const hasActionVerb = /\b(reply|book|save|share|comment|dm|message|download|send|start|choose|apply|audit|reach out)\b/.test(ctaText);
    if (!hasActionVerb) {
      addCarouselDeckQualityItem(items, {
        id: 'cta-strength',
        tone: 'watch',
        title: 'CTA could be stronger',
        detail: 'Give the reader one clear action: save, reply, book, comment, or send a message.',
        slideIndex: lastSlide.index,
        action: { type: 'strengthen_cta', label: 'Strengthen CTA', slideIndex: lastSlide.index },
      });
    }
  }

  const denseSlides = slideReports.filter(({ stats }) => stats.density === 'dense').length;
  const forcedCompositions = draft.slides.filter((slide) => slide.composition !== 'auto').length;
  const fixCount = items.filter((item) => item.tone === 'fix').length;
  const watchCount = items.filter((item) => item.tone === 'watch').length;
  const score = Math.max(0, Math.min(100, 100 - fixCount * 16 - watchCount * 7 - Math.max(0, denseSlides - 1) * 3));
  const tone: CarouselDeckQualityTone = fixCount > 0 ? 'fix' : watchCount > 0 ? 'watch' : 'ready';

  if (items.length === 0) {
    items.push({
      id: 'export-ready',
      tone: 'ready',
      title: 'Deck is export-ready',
      detail: 'Density, rhythm, cover, and CTA all look healthy from the local checks.',
    });
  }

  return {
    score,
    tone,
    statusLabel: tone === 'ready' ? 'Export ready' : tone === 'fix' ? 'Needs fixes' : 'Review before export',
    summary:
      tone === 'ready'
        ? 'The deck has a clean rhythm and should survive export well.'
        : tone === 'fix'
          ? 'A few structural issues should be fixed before export.'
          : 'The deck is close, but a few slides deserve a final pass.',
    metrics: {
      denseSlides,
      uniqueCompositions: compositionCounts.size,
      forcedCompositions,
    },
    items,
  };
}

function CarouselSlideFrame({
  slide,
  index,
  total,
  aspectOption,
  template,
  layoutRecipe,
  exportDimensions,
  frameRef,
}: {
  slide: CarouselSlide;
  index: number;
  total: number;
  aspectOption: ReturnType<typeof getCarouselAspectRatioOption>;
  template: ReturnType<typeof getCarouselTemplateOption>;
  layoutRecipe?: ReturnType<typeof getCarouselLayoutRecipeOption>;
  exportDimensions?: { width: number; height: number };
  frameRef?: Ref<HTMLElement>;
}) {
  const isBold = template.value === 'bold_diagnostic';
  const isCareerNotes = template.value === 'editorial_career_notes';
  const isSoftCards = template.value === 'soft_diagnostic_cards';
  const isWarm = template.value === 'warm_coaching' || isSoftCards;
  const isEditorial = template.value === 'editorial_authority' || isCareerNotes;
  const palette = template.palette;
  const role = slide.role || getDefaultCarouselSlideRole((layoutRecipe || template.layoutRecipe).value, index, total);
  const roleLabel = carouselSlideRoleLabels[role];
  const bodyPoints = getCarouselSlideBodyPoints(slide.body);
  const textStats = getCarouselSlideTextStats(slide);
  const composition = resolveCarouselComposition(slide, role, template, bodyPoints);
  const compositionOption = getCarouselCompositionOption(composition);
  const contrastPoints = bodyPoints.length > 1 ? bodyPoints : slide.body.split(/(?:\s+but\s+|\s+instead\s+|\s+not\s+)/i).map((point) => point.trim()).filter(Boolean).slice(0, 2);
  const isCover = role === 'cover';
  const isCta = role === 'cta';
  const headlineSize = getCarouselHeadlineSize(composition, textStats);
  const coverHeadlineSize = Math.min(headlineSize + (isCareerNotes ? 14 : 6), isCareerNotes ? 64 : 52);
  const resolvedHeadlineSize = isCover
    ? coverHeadlineSize
    : isCareerNotes
      ? Math.min(headlineSize + 6, 42)
      : headlineSize;
  const exportScale = exportDimensions ? exportDimensions.width / 600 : 1;
  const exportSize = (value: number) => `${Math.round(value * exportScale * 100) / 100}px`;
  const exportFrameStyles = exportDimensions
    ? {
        width: `${exportDimensions.width}px`,
        height: `${exportDimensions.height}px`,
        minWidth: `${exportDimensions.width}px`,
        maxWidth: `${exportDimensions.width}px`,
        minHeight: `${exportDimensions.height}px`,
        maxHeight: `${exportDimensions.height}px`,
        padding: isCover ? `${exportSize(28)} ${exportSize(24)}` : exportSize(20),
      }
    : {};

  const contentArea = (
    <>
      {isCover ? (
        <>
          <div className="flex items-end justify-between" style={{ gap: exportDimensions ? exportSize(16) : undefined }}>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  color: isBold ? 'rgba(255,255,255,0.58)' : isWarm ? palette.accent : palette.muted,
                  fontSize: exportDimensions ? exportSize(10) : undefined,
                }}
              >
                Coach Kagiso
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                backgroundColor: palette.chipBackground,
                color: palette.chipText,
                fontSize: exportDimensions ? exportSize(10) : undefined,
                padding: exportDimensions ? `${exportSize(4)} ${exportSize(12)}` : undefined,
              }}
            >
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>

          <div
            className="my-auto w-full"
            style={{
              marginBottom: 'auto',
              marginTop: 'auto',
              padding: exportDimensions ? `0 ${exportSize(12)}` : '0 12px',
            }}
          >
            {slide.body && (
              <p
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{
                  color: isBold ? 'rgba(255,255,255,0.55)' : isWarm ? palette.accent : palette.accent,
                  fontSize: exportDimensions ? exportSize(11) : undefined,
                  letterSpacing: exportDimensions ? exportSize(3.2) : undefined,
                  marginBottom: exportDimensions ? exportSize(8) : undefined,
                }}
              >
                {roleLabel}
              </p>
            )}
            <h3
              className="font-serif leading-[1.0] tracking-[-0.01em]"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: exportDimensions ? exportSize(resolvedHeadlineSize) : `${resolvedHeadlineSize}px`,
                fontStyle: isSoftCards ? 'italic' : undefined,
                letterSpacing: 0,
                lineHeight: isCareerNotes ? 0.92 : 1.0,
              }}
            >
              {slide.headline}
            </h3>
            <div
              className="mt-4 h-[3px] w-16 rounded-full"
              style={{
                backgroundColor: palette.accent,
                height: exportDimensions ? exportSize(3) : undefined,
                marginTop: exportDimensions ? exportSize(16) : undefined,
                width: exportDimensions ? exportSize(64) : undefined,
              }}
            />
            {slide.body && (
              isSoftCards ? (
                <div
                  className="mt-5 max-w-[42ch] rounded-[18px] px-5 py-4 text-center text-[13px] font-semibold leading-relaxed shadow-[0_12px_30px_rgba(20,35,52,0.12)]"
                  style={{
                    backgroundColor: palette.panel,
                    color: palette.chipText,
                    fontSize: exportDimensions ? exportSize(13) : undefined,
                    marginTop: exportDimensions ? exportSize(20) : undefined,
                    maxWidth: exportDimensions ? `${42 * 13 * exportScale}px` : undefined,
                    padding: exportDimensions ? `${exportSize(16)} ${exportSize(20)}` : undefined,
                  }}
                >
                  {slide.body}
                </div>
              ) : (
                <p
                  className="mt-4 max-w-[42ch] text-[13px] font-medium leading-relaxed"
                  style={{
                    color: isBold ? 'rgba(255,255,255,0.68)' : palette.muted,
                    fontSize: exportDimensions ? exportSize(13) : undefined,
                    marginTop: exportDimensions ? exportSize(16) : undefined,
                    maxWidth: exportDimensions ? `${42 * 13 * exportScale}px` : undefined,
                  }}
                >
                  {slide.body}
                </p>
              )
            )}
            {slide.cta && (
              <p
                className="mt-4 max-w-[30ch] text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: isSoftCards ? palette.muted : palette.accent,
                  transform: isSoftCards ? 'rotate(-2deg)' : undefined,
                  fontSize: exportDimensions ? exportSize(11) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                }}
              >
                {slide.cta}
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-2"
            style={{ gap: exportDimensions ? exportSize(8) : undefined }}
          >
            <span
              className="h-1.5 w-10 rounded-full"
              style={{
                backgroundColor: palette.accent,
                height: exportDimensions ? exportSize(6) : undefined,
                width: exportDimensions ? exportSize(40) : undefined,
              }}
            />
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{
                color: isBold ? 'rgba(255,255,255,0.35)' : isWarm ? palette.accent : palette.muted,
                fontSize: exportDimensions ? exportSize(9) : undefined,
                opacity: isEditorial ? 0.5 : 1,
              }}
            >
              coachkagiso.com
            </span>
          </div>
        </>
      ) : isCta ? (
        <>
          <div className="flex items-end justify-between" style={{ gap: exportDimensions ? exportSize(16) : undefined }}>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  color: isBold ? 'rgba(255,255,255,0.58)' : palette.muted,
                  fontSize: exportDimensions ? exportSize(10) : undefined,
                }}
              >
                Coach Kagiso
              </p>
              <div
                className="mt-2 h-[2px] w-10 rounded-full"
                style={{
                  backgroundColor: palette.accent,
                  height: exportDimensions ? exportSize(2) : undefined,
                  marginTop: exportDimensions ? exportSize(8) : undefined,
                  width: exportDimensions ? exportSize(40) : undefined,
                }}
              />
            </div>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{
                backgroundColor: palette.chipBackground,
                color: palette.chipText,
                fontSize: exportDimensions ? exportSize(10) : undefined,
                padding: exportDimensions ? `${exportSize(4)} ${exportSize(12)}` : undefined,
              }}
            >
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>

          <div
            className="my-auto w-full"
            style={{
              marginBottom: 'auto',
              marginTop: 'auto',
              padding: exportDimensions ? `0 ${exportSize(8)}` : '0 8px',
            }}
          >
            {composition === 'save_share_close' && (
              <div
                className="mb-3 flex gap-2"
                style={{ gap: exportDimensions ? exportSize(8) : undefined, marginBottom: exportDimensions ? exportSize(12) : undefined }}
              >
                {['Save', 'Share', 'Apply'].map((actionLabel) => (
                  <span
                    key={actionLabel}
                    className="rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      borderColor: palette.border,
                      color: isBold ? 'rgba(255,255,255,0.65)' : palette.muted,
                      fontSize: exportDimensions ? exportSize(9) : undefined,
                      padding: exportDimensions ? `${exportSize(3)} ${exportSize(10)}` : undefined,
                    }}
                  >
                    {actionLabel}
                  </span>
                ))}
              </div>
            )}
            <h3
              className="font-serif leading-[1.0] tracking-[-0.01em]"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: exportDimensions ? exportSize(resolvedHeadlineSize) : `${resolvedHeadlineSize}px`,
                lineHeight: 1.0,
              }}
            >
              {slide.headline}
            </h3>
            <div
              className="mt-3 h-[2px] w-12 rounded-full"
              style={{
                backgroundColor: palette.accent,
                height: exportDimensions ? exportSize(2) : undefined,
                marginTop: exportDimensions ? exportSize(12) : undefined,
                width: exportDimensions ? exportSize(48) : undefined,
              }}
            />
            {slide.body && (
              <div
                className="mt-5 max-w-[40ch] rounded-[8px] border p-4 text-[14px] font-medium leading-relaxed"
                style={{
                  backgroundColor: composition === 'direct_action'
                    ? palette.accent
                    : isBold
                      ? 'rgba(255,255,255,0.08)'
                      : isWarm
                        ? 'rgba(185,133,103,0.12)'
                        : palette.panel,
                  borderColor: composition === 'direct_action' ? palette.accent : palette.border,
                  color: composition === 'direct_action'
                    ? '#142334'
                    : isBold
                      ? 'rgba(255,255,255,0.82)'
                      : palette.muted,
                  fontSize: exportDimensions ? exportSize(14) : undefined,
                  marginTop: exportDimensions ? exportSize(20) : undefined,
                  maxWidth: exportDimensions ? `${40 * 14 * exportScale}px` : undefined,
                  padding: exportDimensions ? exportSize(16) : undefined,
                }}
              >
                {slide.body}
              </div>
            )}
            {slide.cta && (
              <p
                className="mt-4 max-w-[30ch] text-[12px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: palette.accent,
                  fontSize: exportDimensions ? exportSize(12) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                }}
              >
                {slide.cta}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2" style={{ gap: exportDimensions ? exportSize(8) : undefined }}>
            <span className="h-1.5 w-10 rounded-full" style={{ backgroundColor: palette.accent, height: exportDimensions ? exportSize(6) : undefined, width: exportDimensions ? exportSize(40) : undefined }} />
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: isBold ? 'rgba(255,255,255,0.35)' : palette.muted, fontSize: exportDimensions ? exportSize(9) : undefined, opacity: isEditorial ? 0.5 : 1 }}>
              coachkagiso.com
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-end justify-between" style={{ gap: exportDimensions ? exportSize(16) : undefined }}>
            <div className="flex items-center gap-3" style={{ gap: exportDimensions ? exportSize(12) : undefined }}>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: palette.accent,
                  color: isBold ? '#142334' : palette.panel,
                  fontSize: exportDimensions ? exportSize(10) : undefined,
                  height: exportDimensions ? exportSize(28) : undefined,
                  width: exportDimensions ? exportSize(28) : undefined,
                }}
              >
                {index + 1}
              </span>
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    color: isBold ? 'rgba(255,255,255,0.58)' : palette.muted,
                    fontSize: exportDimensions ? exportSize(10) : undefined,
                  }}
                >
                  Coach Kagiso
                </p>
                <p
                  className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
                  style={{
                    color: isBold ? 'rgba(255,255,255,0.38)' : isWarm ? palette.accent : palette.muted,
                    fontSize: exportDimensions ? exportSize(9) : undefined,
                    opacity: isEditorial ? 0.55 : 1,
                    marginTop: exportDimensions ? exportSize(2) : undefined,
                  }}
                >
                  {roleLabel}
                  {slide.composition === 'auto' ? ` / ${compositionOption.label}` : ''}
                </p>
              </div>
            </div>
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{
                color: isBold ? 'rgba(255,255,255,0.3)' : isWarm ? palette.accent : palette.muted,
                fontSize: exportDimensions ? exportSize(10) : undefined,
                opacity: isEditorial ? 0.45 : 1,
              }}
            >
              {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </span>
          </div>

          <div
            className="w-full"
            style={{
              padding: exportDimensions ? `0 ${exportSize(4)}` : '0 4px',
            }}
          >
            <h3
              className="font-serif leading-[1.02] tracking-[-0.008em]"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: exportDimensions ? exportSize(resolvedHeadlineSize) : `${resolvedHeadlineSize}px`,
              }}
            >
              {slide.headline}
            </h3>
            {composition === 'card_grid' && bodyPoints.length > 1 ? (
              <div
                className="mt-4 grid max-w-[44ch] grid-cols-2 gap-2"
                style={{
                  gap: exportDimensions ? exportSize(8) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${44 * 13 * exportScale}px` : undefined,
                }}
              >
                {bodyPoints.map((point, pointIndex) => (
                  <div
                    key={`${slide.id}-card-${pointIndex}`}
                    className="rounded-[8px] border p-3 text-[11px] font-semibold leading-snug md:text-[12px]"
                    style={{
                      backgroundColor: isBold ? 'rgba(255,255,255,0.06)' : palette.panel,
                      borderColor: isBold ? 'rgba(255,255,255,0.12)' : palette.border,
                      color: isBold ? 'rgba(255,255,255,0.78)' : palette.muted,
                      fontSize: exportDimensions ? exportSize(12) : undefined,
                      padding: exportDimensions ? exportSize(12) : undefined,
                      boxShadow: isBold ? 'none' : '0 1px 3px rgba(20,35,52,0.06)',
                    }}
                  >
                    <span
                      className="mb-2 flex h-7 w-7 items-center justify-center rounded-full font-serif text-[14px] leading-none"
                      style={{
                        color: isBold ? palette.accent : palette.foreground,
                        backgroundColor: isBold ? 'rgba(201,173,152,0.18)' : isWarm ? 'rgba(185,133,103,0.15)' : `${palette.accent}18`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: exportDimensions ? exportSize(14) : undefined,
                        height: exportDimensions ? exportSize(28) : undefined,
                        width: exportDimensions ? exportSize(28) : undefined,
                        marginBottom: exportDimensions ? exportSize(8) : undefined,
                      }}
                    >
                      {String(pointIndex + 1).padStart(2, '0')}
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            ) : composition === 'numbered_stack' && bodyPoints.length > 1 ? (
              <ol
                className="mt-4 grid max-w-[42ch] gap-2 text-[12px] font-semibold leading-relaxed md:text-[13px]"
                style={{
                  color: isBold ? 'rgba(255,255,255,0.76)' : palette.muted,
                  fontSize: exportDimensions ? exportSize(13) : undefined,
                  gap: exportDimensions ? exportSize(6) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${42 * 13 * exportScale}px` : undefined,
                }}
              >
                {bodyPoints.map((point, pointIndex) => (
                  <li key={`${slide.id}-point-${pointIndex}`} className="flex items-start gap-3 rounded-[6px] p-2" style={{
                    backgroundColor: isBold ? 'rgba(255,255,255,0.04)' : isWarm ? 'rgba(185,133,103,0.06)' : 'transparent',
                    gap: exportDimensions ? exportSize(12) : undefined,
                    padding: exportDimensions ? exportSize(8) : undefined,
                  }}>
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: palette.accent,
                        color: isBold ? '#142334' : palette.panel,
                        fontSize: exportDimensions ? exportSize(10) : undefined,
                        height: exportDimensions ? exportSize(24) : undefined,
                        width: exportDimensions ? exportSize(24) : undefined,
                      }}
                    >
                      {pointIndex + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            ) : composition === 'side_rail' && slide.body ? (
              <div
                className="mt-4 flex max-w-[44ch] gap-4 rounded-[8px] p-3"
                style={{
                  gap: exportDimensions ? exportSize(16) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${44 * 14 * exportScale}px` : undefined,
                  backgroundColor: isBold ? 'rgba(255,255,255,0.04)' : isWarm ? 'rgba(185,133,103,0.06)' : 'transparent',
                  padding: exportDimensions ? exportSize(12) : undefined,
                }}
              >
                <span
                  className="w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: palette.accent,
                    width: exportDimensions ? exportSize(6) : undefined,
                  }}
                />
                <p
                  className="text-[13px] font-semibold leading-relaxed md:text-[14px]"
                  style={{
                    color: isBold ? 'rgba(255,255,255,0.76)' : palette.muted,
                    fontSize: exportDimensions ? exportSize(14) : undefined,
                  }}
                >
                  {slide.body}
                </p>
              </div>
            ) : composition === 'contrast_block' && slide.body ? (
              <div
                className="mt-4 grid max-w-[44ch] gap-2 sm:grid-cols-2"
                style={{
                  gap: exportDimensions ? exportSize(8) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${44 * 13 * exportScale}px` : undefined,
                }}
              >
                {['Old frame', 'Sharper frame'].map((label, pointIndex) => (
                  <div
                    key={`${slide.id}-contrast-${label}`}
                    className="rounded-[8px] border p-3"
                    style={{
                      backgroundColor: pointIndex === 0
                        ? 'transparent'
                        : isBold
                          ? 'rgba(201,173,152,0.15)'
                          : isWarm
                            ? 'rgba(185,133,103,0.12)'
                            : `${palette.accent}14`,
                      borderColor: pointIndex === 0 ? palette.border : palette.accent,
                      padding: exportDimensions ? exportSize(12) : undefined,
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color: pointIndex === 0
                          ? isBold ? 'rgba(255,255,255,0.4)' : palette.muted
                          : palette.accent,
                        fontSize: exportDimensions ? exportSize(9) : undefined,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="mt-2 text-[12px] font-semibold leading-snug"
                      style={{
                        color: isBold ? 'rgba(255,255,255,0.78)' : palette.muted,
                        fontSize: exportDimensions ? exportSize(12) : undefined,
                        marginTop: exportDimensions ? exportSize(8) : undefined,
                      }}
                    >
                      {contrastPoints[pointIndex] || slide.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : composition === 'quote_panel' && slide.body ? (
              <div
                className="mt-4 relative max-w-[40ch] rounded-[8px] px-5 py-4 text-[14px] font-medium leading-relaxed md:text-[15px]"
                style={{
                  backgroundColor: isBold ? 'rgba(255,255,255,0.06)' : isWarm ? 'rgba(185,133,103,0.08)' : palette.panel,
                  color: isBold ? 'rgba(255,255,255,0.82)' : palette.muted,
                  fontSize: exportDimensions ? exportSize(15) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${40 * 15 * exportScale}px` : undefined,
                  padding: exportDimensions ? `${exportSize(16)} ${exportSize(20)}` : undefined,
                }}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                  style={{
                    backgroundColor: palette.accent,
                    width: exportDimensions ? exportSize(3) : undefined,
                  }}
                />
                <span
                  className="font-serif text-[28px] leading-none"
                  style={{
                    color: palette.accent,
                    fontFamily: 'var(--font-serif)',
                    fontSize: exportDimensions ? exportSize(28) : undefined,
                    opacity: 0.4,
                    display: 'block',
                    marginBottom: exportDimensions ? exportSize(4) : '4px',
                  }}
                >
                  &ldquo;
                </span>
                {slide.body}
              </div>
            ) : (composition === 'evidence_card' || composition === 'example_note' || composition === 'credibility_cue') && slide.body ? (
              <div
                className="mt-4 max-w-[42ch] rounded-[8px] border p-4"
                style={{
                  backgroundColor: isBold ? 'rgba(255,255,255,0.06)' : isWarm ? 'rgba(185,133,103,0.06)' : palette.panel,
                  borderColor: composition === 'credibility_cue' ? palette.accent : isBold ? 'rgba(255,255,255,0.12)' : palette.border,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                  maxWidth: exportDimensions ? `${42 * 14 * exportScale}px` : undefined,
                  padding: exportDimensions ? exportSize(16) : undefined,
                  boxShadow: isBold ? 'none' : '0 1px 3px rgba(20,35,52,0.05)',
                }}
              >
                <div className="flex items-center gap-2" style={{ gap: exportDimensions ? exportSize(8) : undefined }}>
                  <span
                    className="h-1.5 w-6 rounded-full"
                    style={{
                      backgroundColor: palette.accent,
                      height: exportDimensions ? exportSize(6) : undefined,
                      width: exportDimensions ? exportSize(24) : undefined,
                    }}
                  />
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      color: palette.accent,
                      fontSize: exportDimensions ? exportSize(10) : undefined,
                    }}
                  >
                    {composition === 'example_note' ? 'Example' : 'Proof cue'}
                  </p>
                </div>
                <p
                  className="mt-3 text-[13px] font-semibold leading-relaxed md:text-[14px]"
                  style={{
                    color: isBold ? 'rgba(255,255,255,0.78)' : palette.muted,
                    fontSize: exportDimensions ? exportSize(14) : undefined,
                    marginTop: exportDimensions ? exportSize(12) : undefined,
                  }}
                >
                  {slide.body}
                </p>
              </div>
            ) : slide.body ? (
              <p
                className="mt-3 max-w-[40ch] text-[13px] font-medium leading-relaxed md:text-[14px]"
                style={{
                  color: isBold ? 'rgba(255,255,255,0.76)' : palette.muted,
                  fontSize: exportDimensions ? exportSize(14) : undefined,
                  marginTop: exportDimensions ? exportSize(12) : undefined,
                  maxWidth: exportDimensions ? `${40 * 14 * exportScale}px` : undefined,
                }}
              >
                {slide.body}
              </p>
            ) : null}
            {slide.cta && (
              <p
                className="mt-4 max-w-[30ch] text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: palette.accent,
                  fontSize: exportDimensions ? exportSize(11) : undefined,
                  marginTop: exportDimensions ? exportSize(16) : undefined,
                }}
              >
                {slide.cta}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2" style={{ gap: exportDimensions ? exportSize(8) : undefined }}>
            <span
              className="h-1.5 w-10 rounded-full"
              style={{
                backgroundColor: palette.accent,
                height: exportDimensions ? exportSize(6) : undefined,
                width: exportDimensions ? exportSize(40) : undefined,
              }}
            />
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{
                color: isBold ? 'rgba(255,255,255,0.35)' : isWarm ? palette.accent : palette.muted,
                fontSize: exportDimensions ? exportSize(9) : undefined,
                opacity: isEditorial ? 0.5 : 1,
              }}
            >
              coachkagiso.com
            </span>
          </div>
        </>
      )}
    </>
  );

  return (
    <article
      ref={frameRef}
      data-carousel-export-slide="true"
      data-carousel-export-index={index}
      data-carousel-template={template.value}
      data-carousel-layout-recipe={(layoutRecipe || template.layoutRecipe).value}
      data-carousel-slide-role={role}
      data-carousel-composition={composition}
      className={`relative flex w-full overflow-hidden rounded-[8px] border ${
        exportDimensions ? '' : 'min-h-[240px] p-5 shadow-lg shadow-black/15'
      }`}
      style={{
        aspectRatio: aspectOption.cssRatio,
        backgroundColor: palette.background,
        backgroundImage: isCareerNotes
          ? 'linear-gradient(90deg, rgba(20,35,52,0.035) 1px, transparent 1px), linear-gradient(180deg, rgba(20,35,52,0.025) 1px, transparent 1px)'
          : isSoftCards
            ? 'repeating-linear-gradient(90deg, rgba(255,248,237,0.035) 0 1px, transparent 1px 8px), repeating-linear-gradient(180deg, rgba(20,35,52,0.03) 0 1px, transparent 1px 9px)'
            : undefined,
        backgroundSize: isCareerNotes ? '100% 100%, 24px 24px, 28px 28px' : undefined,
        color: palette.foreground,
        borderColor: isCover ? 'transparent' : palette.border,
        fontFamily: 'var(--font-sans)',
        ...exportFrameStyles,
      }}
    >
      {isBold && !isCover && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/3"
          style={{ background: 'linear-gradient(180deg, rgba(201,173,152,0.34), rgba(201,173,152,0))' }}
        />
      )}
      {isBold && isCover && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(201,173,152,0.2) 0%, transparent 50%, rgba(201,173,152,0.08) 100%)' }}
        />
      )}
      {isWarm && !isCover && (
        <div
          aria-hidden="true"
          className={`absolute rounded-full ${exportDimensions ? '' : '-right-10 -top-10 h-32 w-32'}`}
          style={{
            backgroundColor: 'rgba(185,133,103,0.15)',
            height: exportDimensions ? exportSize(128) : undefined,
            right: exportDimensions ? `-${exportSize(40)}` : undefined,
            top: exportDimensions ? `-${exportSize(40)}` : undefined,
            width: exportDimensions ? exportSize(128) : undefined,
          }}
        />
      )}
      {isWarm && isCover && (
        <>
          <div
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              backgroundColor: 'rgba(185,133,103,0.18)',
              height: exportDimensions ? exportSize(200) : '200px',
              right: exportDimensions ? `-${exportSize(60)}` : '-60px',
              top: exportDimensions ? `-${exportSize(60)}` : '-60px',
              width: exportDimensions ? exportSize(200) : '200px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-1/4"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(185,133,103,0.08))' }}
          />
        </>
      )}
      {isEditorial && isCover && (
        <>
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-full w-px"
            style={{
              backgroundColor: palette.accent,
              opacity: 0.2,
              width: exportDimensions ? exportSize(1) : undefined,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-px w-full"
            style={{
              backgroundColor: palette.accent,
              opacity: 0.2,
              height: exportDimensions ? exportSize(1) : undefined,
            }}
          />
        </>
      )}
      {isCareerNotes && (
        <>
          <div
            aria-hidden="true"
            className="absolute font-serif leading-none"
            style={{
              bottom: exportDimensions ? `-${exportSize(36)}` : '-36px',
              color: '#142334',
              fontFamily: 'var(--font-serif)',
              fontSize: exportDimensions ? exportSize(isCover ? 134 : 96) : isCover ? '134px' : '96px',
              left: exportDimensions ? `-${exportSize(8)}` : '-8px',
              letterSpacing: '-0.06em',
              opacity: isCover ? 0.035 : 0.045,
              pointerEvents: 'none',
              textTransform: 'uppercase',
            }}
          >
            NOTE
          </div>
          <div
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              borderTop: `${exportDimensions ? exportSize(2) : '2px'} solid ${palette.accent}`,
              height: exportDimensions ? exportSize(42) : '42px',
              opacity: 0.85,
              right: exportDimensions ? `-${exportSize(18)}` : '-18px',
              top: exportDimensions ? exportSize(isCover ? 96 : 132) : isCover ? '96px' : '132px',
              transform: 'rotate(-12deg)',
              width: exportDimensions ? exportSize(138) : '138px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              borderBottom: `${exportDimensions ? exportSize(1) : '1px'} solid ${palette.foreground}`,
              borderLeft: `${exportDimensions ? exportSize(1) : '1px'} solid ${palette.foreground}`,
              bottom: exportDimensions ? exportSize(42) : '42px',
              height: exportDimensions ? exportSize(82) : '82px',
              left: exportDimensions ? exportSize(38) : '38px',
              opacity: 0.18,
              width: exportDimensions ? exportSize(76) : '76px',
            }}
          />
        </>
      )}
      {isSoftCards && (
        <>
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              backgroundColor: 'rgba(255,243,226,0.16)',
              bottom: exportDimensions ? `-${exportSize(36)}` : '-36px',
              height: exportDimensions ? exportSize(92) : '92px',
              left: exportDimensions ? `-${exportSize(22)}` : '-22px',
              transform: 'rotate(-5deg)',
              width: exportDimensions ? exportSize(210) : '210px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute rounded-[22px]"
            style={{
              border: `${exportDimensions ? exportSize(2) : '2px'} solid rgba(255,248,237,0.42)`,
              height: exportDimensions ? exportSize(92) : '92px',
              opacity: 0.7,
              right: exportDimensions ? `-${exportSize(26)}` : '-26px',
              top: exportDimensions ? exportSize(118) : '118px',
              transform: 'rotate(-7deg)',
              width: exportDimensions ? exportSize(210) : '210px',
            }}
          />
        </>
      )}

      <div
        className="relative z-10 flex w-full flex-col justify-between"
        style={{
          gap: exportDimensions ? exportSize(20) : undefined,
          padding: exportDimensions ? undefined : isCover ? '24px 20px' : undefined,
        }}
      >
        {contentArea}
      </div>
    </article>
  );
}
const carouselMinSlides = 4;
const carouselMaxSlides = 10;

function createBlankCarouselSlide(index: number, layoutRecipe: CarouselLayoutRecipe, totalSlides: number): CarouselSlide {
  return {
    id: `slide-${Date.now()}-${index}`,
    role: getDefaultCarouselSlideRole(layoutRecipe, index, totalSlides),
    composition: 'auto',
    headline: `Slide ${index + 1}`,
    body: 'Add one clear point for this slide.',
    cta: '',
    visualSuggestion: '',
  };
}

function sanitizeCarouselDraft(draft: CarouselDraftPayload, fallbackTitle: string): CarouselDraftPayload {
  return {
    ...draft,
    title: draft.title.trim() || fallbackTitle,
    caption: draft.caption.trim(),
    coverDesign: draft.coverDesign?.trim() || '',
    accessibilityNote: draft.accessibilityNote?.trim() || '',
    slides: draft.slides.map((slide, index) => {
      const role = isCarouselSlideRole(slide.role)
        ? slide.role
        : getDefaultCarouselSlideRole(draft.layoutRecipe, index, draft.slides.length);
      return {
        id: slide.id || `slide-${index + 1}`,
        role,
        composition: normalizeCarouselComposition(slide.composition, role),
        headline: slide.headline.trim() || `Slide ${index + 1}`,
        body: slide.body.trim(),
        ...(slide.cta?.trim() ? { cta: slide.cta.trim() } : {}),
        ...(slide.visualSuggestion?.trim() ? { visualSuggestion: slide.visualSuggestion.trim() } : {}),
      };
    }),
  };
}

function cloneCarouselDraft(draft: CarouselDraftPayload): CarouselDraftPayload {
  return JSON.parse(JSON.stringify(draft)) as CarouselDraftPayload;
}

function areCarouselDraftsEqual(left: CarouselDraftPayload, right: CarouselDraftPayload): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getCarouselExportFontFamilies() {
  const rootStyles = getComputedStyle(document.documentElement);
  return {
    sans: rootStyles.getPropertyValue('--font-sans').trim() || getComputedStyle(document.body).fontFamily || 'Raleway, Arial, sans-serif',
    serif: rootStyles.getPropertyValue('--font-serif').trim() || 'Georgia, "Times New Roman", serif',
  };
}

async function waitForCarouselExportFonts(element: HTMLElement) {
  if (!('fonts' in document)) return;

  await document.fonts.ready;
  const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  const fontRequests = new Set<string>();

  nodes.forEach((node) => {
    const styles = getComputedStyle(node);
    if (!styles.fontFamily || !styles.fontSize) return;
    fontRequests.add(`${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`);
  });

  await Promise.all(
    Array.from(fontRequests)
      .slice(0, 40)
      .map((request) => document.fonts.load(request).catch(() => null)),
  );
  await document.fonts.ready;
}

async function captureCarouselSlideCanvas(
  element: HTMLElement,
  dimensions: { width: number; height: number },
  html2canvas: typeof import('html2canvas').default,
) {
  const fonts = getCarouselExportFontFamilies();
  const rect = element.getBoundingClientRect();
  const layoutWidth = Math.max(1, Math.ceil(rect.width));
  const layoutHeight = Math.max(1, Math.round(layoutWidth * (dimensions.height / dimensions.width)));
  const scale = dimensions.width / layoutWidth;
  const captureId = `carousel-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const exportHost = document.createElement('div');
  const exportElement = element.cloneNode(true) as HTMLElement;

  exportHost.setAttribute('aria-hidden', 'true');
  exportHost.style.position = 'fixed';
  exportHost.style.left = '-10000px';
  exportHost.style.top = '0';
  exportHost.style.width = `${layoutWidth}px`;
  exportHost.style.height = `${layoutHeight}px`;
  exportHost.style.overflow = 'hidden';
  exportHost.style.pointerEvents = 'none';
  exportHost.style.zIndex = '-1';

  exportElement.dataset.carouselExportCaptureId = captureId;
  exportElement.style.width = `${layoutWidth}px`;
  exportElement.style.height = `${layoutHeight}px`;
  exportElement.style.minWidth = `${layoutWidth}px`;
  exportElement.style.maxWidth = `${layoutWidth}px`;
  exportElement.style.minHeight = `${layoutHeight}px`;
  exportElement.style.maxHeight = `${layoutHeight}px`;
  exportElement.style.boxSizing = 'border-box';
  exportElement.style.margin = '0';
  exportElement.style.transform = 'none';

  exportHost.append(exportElement);
  document.body.append(exportHost);

  let captured: HTMLCanvasElement;
  try {
    await waitForCarouselExportFonts(exportElement);
    captured = await html2canvas(exportElement, {
      backgroundColor: null,
      logging: false,
      onclone: (clonedDocument) => {
        clonedDocument.documentElement.className = document.documentElement.className;
        clonedDocument.documentElement.style.setProperty('--font-sans', fonts.sans);
        clonedDocument.documentElement.style.setProperty('--font-serif', fonts.serif);
        const clonedSlide = clonedDocument.querySelector<HTMLElement>(
          `[data-carousel-export-capture-id="${captureId}"]`,
        );

        if (clonedSlide) {
          clonedSlide.style.width = `${layoutWidth}px`;
          clonedSlide.style.height = `${layoutHeight}px`;
          clonedSlide.style.minWidth = `${layoutWidth}px`;
          clonedSlide.style.maxWidth = `${layoutWidth}px`;
          clonedSlide.style.minHeight = `${layoutHeight}px`;
          clonedSlide.style.maxHeight = `${layoutHeight}px`;
          clonedSlide.style.boxSizing = 'border-box';
          clonedSlide.style.margin = '0';
          clonedSlide.style.transform = 'none';
        }

        const fontStyle = clonedDocument.createElement('style');
        fontStyle.textContent = `
          [data-carousel-export-slide="true"] {
            font-family: ${fonts.sans} !important;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }

          [data-carousel-export-slide="true"] .font-serif,
          [data-carousel-export-slide="true"] h1,
          [data-carousel-export-slide="true"] h2,
          [data-carousel-export-slide="true"] h3 {
            font-family: ${fonts.serif} !important;
          }
        `;
        clonedDocument.head.append(fontStyle);
      },
      scale,
      width: layoutWidth,
      height: layoutHeight,
      useCORS: true,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });
  } finally {
    exportHost.remove();
  }

  if (captured.width === dimensions.width && captured.height === dimensions.height) return captured;

  const resized = document.createElement('canvas');
  resized.width = dimensions.width;
  resized.height = dimensions.height;
  const context = resized.getContext('2d');
  if (!context) throw new Error('Could not prepare the carousel export canvas.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(captured, 0, 0, dimensions.width, dimensions.height);
  return resized;
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Could not create the PNG export.'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CarouselDraftEditor({
  record,
  isSaving,
  onSave,
}: {
  record: CarouselDraftRecord;
  isSaving: boolean;
  onSave: (record: CarouselDraftRecord, draft: CarouselDraftPayload) => void;
}) {
  const [draft, setDraft] = useState<CarouselDraftPayload>(record.draft);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(record.draft);
  const hasEnoughSlides = draft.slides.length >= carouselMinSlides;
  const hasValidSlides = draft.slides.every((slide) => slide.headline.trim());
  const canSave = hasChanges && hasEnoughSlides && hasValidSlides && !isSaving;
  const activeRecipeOption = getCarouselLayoutRecipeOption(draft.layoutRecipe);

  function updateDraftField<K extends keyof Pick<CarouselDraftPayload, 'title' | 'caption' | 'coverDesign' | 'accessibilityNote'>>(
    field: K,
    value: CarouselDraftPayload[K],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSlide(slideId: string, updates: Partial<CarouselSlide>) {
    setDraft((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === slideId ? { ...slide, ...updates } : slide)),
    }));
  }

  function moveSlide(slideId: string, direction: -1 | 1) {
    setDraft((current) => {
      const fromIndex = current.slides.findIndex((slide) => slide.id === slideId);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= current.slides.length) return current;
      const nextSlides = [...current.slides];
      const [moved] = nextSlides.splice(fromIndex, 1);
      nextSlides.splice(toIndex, 0, moved);
      return { ...current, slides: nextSlides };
    });
  }

  function addSlide() {
    setDraft((current) => {
      if (current.slides.length >= carouselMaxSlides) return current;
      const nextIndex = current.slides.length;
      return {
        ...current,
        slides: [...current.slides, createBlankCarouselSlide(nextIndex, current.layoutRecipe, nextIndex + 1)],
      };
    });
  }

  function removeSlide(slideId: string) {
    setDraft((current) => {
      if (current.slides.length <= carouselMinSlides) return current;
      return {
        ...current,
        slides: current.slides.filter((slide) => slide.id !== slideId),
      };
    });
  }

  function saveDraft() {
    if (!canSave) return;
    const sanitized = sanitizeCarouselDraft(draft, record.draft.title);
    setDraft(sanitized);
    onSave(record, sanitized);
  }

  return (
    <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Slide editor</p>
          <h4 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">Shape the carousel before export</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">
            Edit each slide, reorder the flow, then save once when it feels ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addSlide}
            disabled={draft.slides.length >= carouselMaxSlides || isSaving}
            className="studio-ghost-button"
          >
            <Plus className="h-4 w-4" /> Add slide
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={!canSave}
            className="studio-primary-button"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save edits
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="studio-label">Carousel title</span>
          <input
            value={draft.title}
            onChange={(event) => updateDraftField('title', event.target.value)}
            className="studio-input h-11 px-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="studio-label">Cover design note</span>
          <input
            value={draft.coverDesign || ''}
            onChange={(event) => updateDraftField('coverDesign', event.target.value)}
            className="studio-input h-11 px-3"
          />
        </label>
      </div>

      <label className="mt-3 grid gap-2">
        <span className="studio-label">Post caption</span>
        <textarea
          value={draft.caption}
          onChange={(event) => updateDraftField('caption', event.target.value)}
          onWheel={trapWheel}
          rows={3}
          className="studio-input resize-y px-3 py-3 leading-relaxed"
        />
      </label>

      <div className="mt-4 grid gap-3">
        {draft.slides.map((slide, index) => {
          const canMoveUp = index > 0;
          const canMoveDown = index < draft.slides.length - 1;
          const canDelete = draft.slides.length > carouselMinSlides;
          const compositionOptions = getCarouselCompositionOptionsForRole(slide.role);
          const previewComposition = resolveCarouselComposition(
            slide,
            slide.role,
            getCarouselTemplateOption(draft.template),
            getCarouselSlideBodyPoints(slide.body),
          );

          return (
            <article key={slide.id} className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white font-serif text-[18px] text-[#C9AD98]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-[#142334]">Slide {index + 1} - {carouselSlideRoleLabels[slide.role]}</p>
                    <p className="text-[11px] text-[#142334]/50">
                      {slide.body.trim().split(/\s+/).filter(Boolean).length} body words - {getCarouselCompositionOption(previewComposition).label}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, -1)}
                    disabled={!canMoveUp || isSaving}
                    className="studio-card-action-icon disabled:opacity-40"
                    aria-label={`Move slide ${index + 1} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, 1)}
                    disabled={!canMoveDown || isSaving}
                    className="studio-card-action-icon disabled:opacity-40"
                    aria-label={`Move slide ${index + 1} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlide(slide.id)}
                    disabled={!canDelete || isSaving}
                    className="studio-card-action-icon text-[#8A2F1D] disabled:opacity-40"
                    aria-label={`Remove slide ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.58fr)_minmax(0,0.72fr)_minmax(0,0.9fr)_minmax(0,0.76fr)]">
                <label className="grid gap-2">
                  <span className="studio-label">Role</span>
                  <select
                    value={slide.role}
                    onChange={(event) => updateSlide(slide.id, { role: event.target.value as CarouselSlideRole, composition: 'auto' })}
                    className="studio-input h-11 px-3"
                  >
                    {activeRecipeOption.slideTypes.map((role) => (
                      <option key={role} value={role}>
                        {carouselSlideRoleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">Composition</span>
                  <select
                    value={slide.composition}
                    onChange={(event) => updateSlide(slide.id, { composition: event.target.value as CarouselComposition })}
                    className="studio-input h-11 px-3"
                  >
                    {compositionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">Headline</span>
                  <input
                    value={slide.headline}
                    onChange={(event) => updateSlide(slide.id, { headline: event.target.value })}
                    className="studio-input h-11 px-3"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="studio-label">CTA</span>
                  <input
                    value={slide.cta || ''}
                    onChange={(event) => updateSlide(slide.id, { cta: event.target.value })}
                    placeholder="Optional"
                    className="studio-input h-11 px-3"
                  />
                </label>
              </div>

              <label className="mt-3 grid gap-2">
                <span className="studio-label">Body</span>
                <textarea
                  value={slide.body}
                  onChange={(event) => updateSlide(slide.id, { body: event.target.value })}
                  onWheel={trapWheel}
                  rows={3}
                  className="studio-input resize-y px-3 py-3 leading-relaxed"
                />
              </label>

              <label className="mt-3 grid gap-2">
                <span className="studio-label">Visual suggestion</span>
                <input
                  value={slide.visualSuggestion || ''}
                  onChange={(event) => updateSlide(slide.id, { visualSuggestion: event.target.value })}
                  placeholder="Optional layout note for this slide"
                  className="studio-input h-11 px-3"
                />
              </label>
            </article>
          );
        })}
      </div>

      {(!hasEnoughSlides || !hasValidSlides) && (
        <div className="mt-3">
          <Notice tone="error">
            Carousels need at least {carouselMinSlides} slides, and every slide needs a headline before saving.
          </Notice>
        </div>
      )}
    </div>
  );
}

function getCarouselQualityToneClasses(tone: CarouselDeckQualityTone) {
  if (tone === 'ready') {
    return {
      shell: 'border-[#D7E2D0] bg-[#F7FAF5] text-[#2E4D34]',
      chip: 'bg-[#E2ECDD] text-[#2E4D34]',
      dot: 'bg-[#6F8F62]',
      bar: 'bg-[#6F8F62]',
    };
  }

  if (tone === 'fix') {
    return {
      shell: 'border-[#F0C5B8] bg-[#FFF7F4] text-[#8A2F1D]',
      chip: 'bg-[#F8DED5] text-[#8A2F1D]',
      dot: 'bg-[#C56D52]',
      bar: 'bg-[#C56D52]',
    };
  }

  return {
    shell: 'border-[#E4D8CB] bg-[#FBFAF8] text-[#8C7466]',
    chip: 'bg-[#F1E5DA] text-[#8C7466]',
    dot: 'bg-[#C9AD98]',
    bar: 'bg-[#C9AD98]',
  };
}

function CarouselDeckQualityPanel({
  report,
  onApplyFix,
  onUndo,
  onRestore,
  canUndo = false,
  canRestore = false,
  historyNotice,
  disabled = false,
}: {
  report: CarouselDeckQualityReport;
  onApplyFix?: (action: CarouselDeckFixAction) => void;
  onUndo?: () => void;
  onRestore?: () => void;
  canUndo?: boolean;
  canRestore?: boolean;
  historyNotice?: string | null;
  disabled?: boolean;
}) {
  const toneClasses = getCarouselQualityToneClasses(report.tone);

  return (
    <section className={`mt-4 rounded-[8px] border p-4 ${toneClasses.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">Deck quality</p>
          <h4 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">{report.statusLabel}</h4>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-[#142334]/62">{report.summary}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClasses.chip}`}>
            {report.score}/100
          </span>
          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/80">
            <span className={`block h-full rounded-full ${toneClasses.bar}`} style={{ width: `${report.score}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-[8px] bg-white/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Dense slides</p>
          <p className="mt-1 font-serif text-[26px] leading-none text-[#142334]">{report.metrics.denseSlides}</p>
        </div>
        <div className="rounded-[8px] bg-white/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Compositions</p>
          <p className="mt-1 font-serif text-[26px] leading-none text-[#142334]">{report.metrics.uniqueCompositions}</p>
        </div>
        <div className="rounded-[8px] bg-white/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Overrides</p>
          <p className="mt-1 font-serif text-[26px] leading-none text-[#142334]">{report.metrics.forcedCompositions}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {report.items.slice(0, 5).map((item) => {
          const itemTone = getCarouselQualityToneClasses(item.tone);
          return (
            <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[8px] bg-white/80 p-3">
              <div className="flex min-w-0 flex-1 gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${itemTone.dot}`} />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#142334]">
                  {item.slideIndex !== undefined ? `Slide ${item.slideIndex + 1}: ` : ''}
                  {item.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/62">{item.detail}</p>
              </div>
              </div>
              {item.action && onApplyFix && (
                <button
                  type="button"
                  onClick={() => onApplyFix(item.action!)}
                  disabled={disabled}
                  className="shrink-0 rounded-full border border-[#E4D8CB] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {item.action.label}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {(historyNotice || onUndo || onRestore) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-white/80 bg-white/70 p-3">
          <p className="max-w-xl text-[12px] leading-relaxed text-[#142334]/62">
            {historyNotice || 'Quality fixes are saved to the active draft. Undo appears after the first fix.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={disabled || !canUndo}
                className="inline-flex items-center gap-2 rounded-full border border-[#E4D8CB] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Undo last fix
              </button>
            )}
            {onRestore && (
              <button
                type="button"
                onClick={onRestore}
                disabled={disabled || !canRestore}
                className="inline-flex items-center gap-2 rounded-full border border-[#E4D8CB] bg-[#F8F6F4] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                Restore original
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CarouselStudioPanel({
  drafts,
  defaultAspectRatio,
  defaultTemplate,
  defaultLayoutRecipe,
  savingDraftId,
  error,
  onDefaultAspectRatioChange,
  onDefaultTemplateChange,
  onDefaultLayoutRecipeChange,
  onDraftAspectRatioChange,
  onDraftTemplateChange,
  onDraftLayoutRecipeChange,
  onDraftSave,
  selectedDraftId,
  onDraftSelect,
  onStartDraft,
}: {
  drafts: CarouselDraftRecord[];
  defaultAspectRatio: CarouselAspectRatio;
  defaultTemplate: CarouselTemplate;
  defaultLayoutRecipe: CarouselLayoutRecipe;
  savingDraftId: string | null;
  error: string | null;
  onDefaultAspectRatioChange: (value: CarouselAspectRatio) => void;
  onDefaultTemplateChange: (value: CarouselTemplate) => void;
  onDefaultLayoutRecipeChange: (value: CarouselLayoutRecipe) => void;
  onDraftAspectRatioChange: (record: CarouselDraftRecord, value: CarouselAspectRatio) => void;
  onDraftTemplateChange: (record: CarouselDraftRecord, value: CarouselTemplate) => void;
  onDraftLayoutRecipeChange: (record: CarouselDraftRecord, value: CarouselLayoutRecipe) => void;
  onDraftSave: (record: CarouselDraftRecord, draft: CarouselDraftPayload) => void;
  selectedDraftId: string | null;
  onDraftSelect: (record: CarouselDraftRecord) => void;
  onStartDraft: () => void;
}) {
  const selectedRecord = selectedDraftId
    ? drafts.find((record) => record.item.id === selectedDraftId) || null
    : null;
  const latestRecord = selectedRecord || drafts[0] || null;
  const latestDraft = latestRecord?.draft || null;
  const displayedAspectRatio = latestDraft?.aspectRatio || defaultAspectRatio;
  const displayedAspectOption = getCarouselAspectRatioOption(displayedAspectRatio, latestDraft?.platform);
  const displayedExportDimensions = getCarouselExportDimensions(displayedAspectOption);
  const displayedTemplate = latestDraft?.template || defaultTemplate;
  const displayedTemplateOption = getCarouselTemplateOption(displayedTemplate);
  const displayedLayoutRecipe = latestDraft?.layoutRecipe || defaultLayoutRecipe;
  const displayedLayoutRecipeOption = getCarouselLayoutRecipeOption(displayedLayoutRecipe);
  const deckQualityReport = latestDraft ? buildCarouselDeckQualityReport(latestDraft, displayedTemplateOption) : null;
  const isSavingLatest = Boolean(latestRecord && savingDraftId === latestRecord.item.id);
  const activeRecordId = latestRecord?.item.id || null;
  const renderedSlides: CarouselSlide[] = latestDraft?.slides || [
    {
      id: 'placeholder-1',
      role: 'cover',
      composition: 'auto',
      headline: displayedTemplateOption.preview.headline,
      body: displayedTemplateOption.preview.body,
    },
    {
      id: 'placeholder-2',
      role: getDefaultCarouselSlideRole(displayedLayoutRecipe, 1, 3),
      composition: 'auto',
      headline: displayedLayoutRecipeOption.label,
      body: displayedLayoutRecipeOption.description,
    },
    {
      id: 'placeholder-3',
      role: 'cta',
      composition: 'auto',
      headline: 'Export stays predictable.',
      body: displayedTemplateOption.exportRules.pdf,
    },
  ];
  const exportSlideFrameRefs = useRef<Array<HTMLElement | null>>([]);
  const [exportState, setExportState] = useState<{
    busy: boolean;
    mode: CarouselExportMode | null;
    message: string;
    tone: 'info' | 'error';
  } | null>(null);
  const [draftHistory, setDraftHistory] = useState<CarouselDraftHistoryState>({
    recordId: null,
    originalDraft: null,
    undoStack: [],
    notice: null,
  });
  const lastHistoryRecordIdRef = useRef<string | null>(null);
  const isExporting = Boolean(exportState?.busy);
  const canUndoDeckFix = draftHistory.recordId === activeRecordId && draftHistory.undoStack.length > 0;
  const canRestoreOriginalDraft = Boolean(
    draftHistory.recordId === activeRecordId
      && draftHistory.originalDraft
      && latestDraft
      && !areCarouselDraftsEqual(draftHistory.originalDraft, latestDraft),
  );

  useEffect(() => {
    if (lastHistoryRecordIdRef.current === activeRecordId) return;
    lastHistoryRecordIdRef.current = activeRecordId;
    setDraftHistory({
      recordId: activeRecordId,
      originalDraft: latestDraft ? cloneCarouselDraft(latestDraft) : null,
      undoStack: [],
      notice: null,
    });
  }, [activeRecordId, latestDraft]);

  async function exportCarousel(mode: CarouselExportMode) {
    if (!latestDraft) return;

    const elements = exportSlideFrameRefs.current
      .slice(0, latestDraft.slides.length)
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length !== latestDraft.slides.length) {
      setExportState({
        busy: false,
        mode,
        message: 'The slides are still rendering. Give the preview a second, then export again.',
        tone: 'error',
      });
      return;
    }

    const dimensions = displayedExportDimensions;
    const baseName = getCarouselExportBaseName(latestDraft, displayedAspectOption);

    try {
      setExportState({
        busy: true,
        mode,
        message: mode === 'pdf' ? 'Preparing LinkedIn PDF...' : 'Preparing PNG frames...',
        tone: 'info',
      });

      const html2canvas = (await import('html2canvas')).default;
      const canvases: HTMLCanvasElement[] = [];
      await waitForCarouselExportFonts(elements[0]);

      for (const [index, element] of elements.entries()) {
        setExportState({
          busy: true,
          mode,
          message: `Rendering slide ${index + 1} of ${elements.length}...`,
          tone: 'info',
        });
        canvases.push(await captureCarouselSlideCanvas(element, dimensions, html2canvas));
      }

      if (mode === 'pdf') {
        setExportState({ busy: true, mode, message: 'Building PDF...', tone: 'info' });
        const { jsPDF } = await import('jspdf');
        const orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [dimensions.width, dimensions.height],
          compress: true,
        });

        canvases.forEach((canvas, index) => {
          if (index > 0) pdf.addPage([dimensions.width, dimensions.height], orientation);
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, dimensions.width, dimensions.height);
        });
        pdf.save(`${baseName}.pdf`);
        setExportState({ busy: false, mode, message: `Downloaded ${canvases.length}-page PDF.`, tone: 'info' });
        return;
      }

      setExportState({ busy: true, mode, message: 'Downloading PNG frames...', tone: 'info' });
      for (const [index, canvas] of canvases.entries()) {
        const blob = await canvasToPngBlob(canvas);
        downloadBlob(blob, `${baseName}-slide-${String(index + 1).padStart(2, '0')}.png`);
      }
      setExportState({ busy: false, mode, message: `Downloaded ${canvases.length} PNG frames.`, tone: 'info' });
    } catch (error) {
      setExportState({
        busy: false,
        mode,
        message: error instanceof Error ? error.message : 'Could not export this carousel.',
        tone: 'error',
      });
    }
  }

  function applyDeckQualityFix(action: CarouselDeckFixAction) {
    if (!latestRecord || !latestDraft || isSavingLatest) return;
    const nextDraft = sanitizeCarouselDraft(
      applyCarouselDeckFixAction(latestDraft, action),
      latestDraft.title,
    );
    if (areCarouselDraftsEqual(latestDraft, nextDraft)) {
      setDraftHistory((current) => ({
        ...current,
        notice: 'That fix is already reflected in this draft.',
      }));
      return;
    }
    setDraftHistory((current) => {
      const isSameRecord = current.recordId === activeRecordId;
      return {
        recordId: activeRecordId,
        originalDraft: isSameRecord
          ? current.originalDraft || cloneCarouselDraft(latestDraft)
          : cloneCarouselDraft(latestDraft),
        undoStack: [
          ...(isSameRecord ? current.undoStack : []),
          {
            draft: cloneCarouselDraft(latestDraft),
            label: action.label,
            createdAt: new Date().toISOString(),
          },
        ].slice(-8),
        notice: `${action.label} applied. You can undo it before you keep moving.`,
      };
    });
    onDraftSave(latestRecord, nextDraft);
  }

  function undoLastDeckQualityFix() {
    if (!latestRecord || !canUndoDeckFix || isSavingLatest) return;
    const previousEntry = draftHistory.undoStack[draftHistory.undoStack.length - 1];
    if (!previousEntry) return;
    const previousDraft = sanitizeCarouselDraft(
      cloneCarouselDraft(previousEntry.draft),
      previousEntry.draft.title,
    );
    setDraftHistory((current) => ({
      ...current,
      undoStack: current.undoStack.slice(0, -1),
      notice: `Undid ${previousEntry.label}.`,
    }));
    onDraftSave(latestRecord, previousDraft);
  }

  function restoreOriginalCarouselDraft() {
    if (!latestRecord || !latestDraft || !canRestoreOriginalDraft || isSavingLatest || !draftHistory.originalDraft) return;
    const originalDraft = sanitizeCarouselDraft(
      cloneCarouselDraft(draftHistory.originalDraft),
      draftHistory.originalDraft.title,
    );
    setDraftHistory((current) => ({
      ...current,
      undoStack: [
        ...current.undoStack,
        {
          draft: cloneCarouselDraft(latestDraft),
          label: 'restore original',
          createdAt: new Date().toISOString(),
        },
      ].slice(-8),
      notice: 'Restored the version from when this draft was opened.',
    }));
    onDraftSave(latestRecord, originalDraft);
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="rounded-[8px] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Studio / Carousel</p>
            <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Carousel Studio</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">
              HTML/CSS slide design for LinkedIn PDF decks and Instagram image carousels.
            </p>
          </div>
          <Badge className="bg-[#F5F3EE] text-[#8C7466]">
            {latestDraft ? `${latestDraft.slides.length} slides - ${displayedTemplateOption.label} + ${displayedLayoutRecipeOption.label}` : 'Build lane'}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3">
          <CarouselAspectRatioSelector
            value={displayedAspectRatio}
            platform={latestDraft?.platform}
            onChange={(nextAspectRatio) => {
              if (latestRecord) {
                onDraftAspectRatioChange(latestRecord, nextAspectRatio);
                return;
              }
              onDefaultAspectRatioChange(nextAspectRatio);
            }}
            eyebrow="Output frame"
            title="Choose before visual export"
            disabled={isSavingLatest}
          />
          <CarouselTemplateSelector
            value={displayedTemplate}
            onChange={(nextTemplate) => {
              if (latestRecord) {
                onDraftTemplateChange(latestRecord, nextTemplate);
                return;
              }
              onDefaultTemplateChange(nextTemplate);
            }}
            eyebrow="Visual style"
            title="Choose the carousel skin"
            disabled={isSavingLatest}
          />
          <CarouselLayoutRecipeSelector
            value={displayedLayoutRecipe}
            onChange={(nextLayoutRecipe) => {
              if (latestRecord) {
                onDraftLayoutRecipeChange(latestRecord, nextLayoutRecipe);
                return;
              }
              onDefaultLayoutRecipeChange(nextLayoutRecipe);
            }}
            eyebrow="Story structure"
            title="Choose the slide arc"
            disabled={isSavingLatest}
          />
        </div>

        {error && (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {latestDraft ? (
          <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Current draft</p>
                <h3 className="mt-2 font-serif text-[28px] leading-tight text-[#142334]">{latestDraft.title}</h3>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#142334]/64">
                  {platformLabels[latestDraft.outputPlatform]} - {latestDraft.pillar ? pillarMeta[latestDraft.pillar].label : 'AI selected pillar'} - {getCarouselAspectRatioLabel(latestDraft.aspectRatio, latestDraft.platform)} - {getCarouselTemplateOption(latestDraft.template).label} - {getCarouselLayoutRecipeOption(latestDraft.layoutRecipe).label}
                </p>
              </div>
              <Badge className="bg-white text-[#8C7466]">
                {new Date(latestDraft.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              </Badge>
            </div>

            {deckQualityReport && (
              <CarouselDeckQualityPanel
                report={deckQualityReport}
                onApplyFix={applyDeckQualityFix}
                onUndo={undoLastDeckQualityFix}
                onRestore={restoreOriginalCarouselDraft}
                canUndo={canUndoDeckFix}
                canRestore={canRestoreOriginalDraft}
                historyNotice={draftHistory.recordId === activeRecordId ? draftHistory.notice : null}
                disabled={isSavingLatest}
              />
            )}

            {latestDraft.caption && (
              <div className="mt-4 rounded-[8px] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Caption</p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#142334]/70">{latestDraft.caption}</p>
              </div>
            )}

            {latestRecord && (
              <CarouselDraftEditor
                key={`${latestRecord.item.id}-${latestRecord.draft.layoutRecipe}`}
                record={latestRecord}
                isSaving={isSavingLatest}
                onSave={onDraftSave}
              />
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ['01', 'Structure', 'Turn an idea into a slide-by-slide story.'],
              ['02', 'Design', 'Render branded slides as real HTML/CSS.'],
              ['03', 'Export', 'PDF for LinkedIn, PNG frames for Instagram.'],
            ].map(([step, title, detail]) => (
              <article key={step} className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
                <span className="font-serif text-[28px] leading-none text-[#C9AD98]">{step}</span>
                <p className="mt-3 text-[13px] font-bold text-[#142334]">{title}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/62">{detail}</p>
              </article>
            ))}
          </div>
        )}

        {drafts.length > 0 && (
          <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Saved carousel drafts</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">
                  Choose which saved draft you want to edit, preview, or export.
                </p>
              </div>
              <Badge className="bg-[#F5F3EE] text-[#8C7466]">{drafts.length} saved</Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {drafts.slice(0, 6).map((record) => {
                const { item, draft } = record;
                const isSelected = latestRecord?.item.id === item.id;
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onDraftSelect(record)}
                  className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                      : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold">{draft.title}</p>
                    <p className={`text-[11px] ${isSelected ? 'text-white/62' : 'text-[#142334]/55'}`}>
                      {draft.slides.length} slides - {getCarouselTemplateOption(draft.template).label} - {getCarouselLayoutRecipeOption(draft.layoutRecipe).label}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge className={isSelected ? 'bg-white/10 text-white' : 'bg-white text-[#8C7466]'}>
                      {isSelected ? 'Active' : item.status}
                    </Badge>
                    {!isSelected && <ChevronRight className="h-4 w-4 text-[#8C7466]" />}
                  </span>
                </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onStartDraft} className="studio-primary-button">
            Start from Content Studio <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void exportCarousel('pdf')}
            disabled={!latestDraft || isExporting}
            className="studio-secondary-button"
          >
            {isExporting && exportState?.mode === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => void exportCarousel('png')}
            disabled={!latestDraft || isExporting}
            className="studio-ghost-button"
          >
            {isExporting && exportState?.mode === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export PNGs
          </button>
        </div>
        {exportState?.message && (
          <div className="mt-3">
            <Notice tone={exportState.tone}>{exportState.message}</Notice>
          </div>
        )}
      </div>

      <aside className="rounded-[8px] bg-[#142334] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Rendered slides</p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/60">
              {displayedTemplateOption.label} + {displayedLayoutRecipeOption.label} - {displayedAspectOption.size}
            </p>
          </div>
          <Badge className="bg-white/10 text-white">HTML/CSS</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {renderedSlides.map((slide, index) => (
            <CarouselSlideFrame
              key={slide.id}
              slide={slide}
              index={index}
              total={renderedSlides.length}
              aspectOption={displayedAspectOption}
              template={displayedTemplateOption}
              layoutRecipe={displayedLayoutRecipeOption}
            />
          ))}
        </div>
      </aside>
      {latestDraft && (
        <div
          aria-hidden="true"
          className="fixed left-[-10000px] top-0 grid pointer-events-none"
          style={{
            gap: 0,
            width: `${displayedExportDimensions.width}px`,
            zIndex: -1,
          }}
        >
          {latestDraft.slides.map((slide, index) => (
            <CarouselSlideFrame
              key={`export-${slide.id}`}
              slide={slide}
              index={index}
              total={latestDraft.slides.length}
              aspectOption={displayedAspectOption}
              template={displayedTemplateOption}
              layoutRecipe={displayedLayoutRecipeOption}
              exportDimensions={displayedExportDimensions}
              frameRef={(node) => {
                exportSlideFrameRefs.current[index] = node;
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StudioToolsPanel({
  adminKey,
  defaultSource,
  defaultPlatform,
  defaultPillar,
  busyTool,
  error,
  result,
  onGenerate,
  onOpenDrafting,
}: {
  adminKey: string;
  defaultSource: string;
  defaultPlatform: ContentPlatform;
  defaultPillar: ContentPillar | 'auto';
  busyTool: StudioToolKind | null;
  error: string | null;
  result: StudioToolResult | null;
  onGenerate: (kind: StudioGeneratedToolKind, payload: StudioToolPayload) => void;
  onOpenDrafting: () => void;
}) {
  const [activeTool, setActiveTool] = useState<StudioToolKind | null>(null);
  const [source, setSource] = useState('');
  const [platform, setPlatform] = useState<ContentPlatform | 'auto'>(defaultPlatform);
  const [pillar, setPillar] = useState<ContentPillar | 'auto'>(defaultPillar);
  const [goal, setGoal] = useState(studioToolGoalOptions.hook[0]);
  const [quantity, setQuantity] = useState<StudioToolPayload['quantity']>('10');
  const [hookType, setHookType] = useState<HookType>('text_post');
  const [copied, setCopied] = useState(false);
  const [captionInputMode, setCaptionInputMode] = useState<CaptionInputMode>('text');
  const [captionImageFile, setCaptionImageFile] = useState<File | null>(null);
  const [captionSourceText, setCaptionSourceText] = useState('');
  const [captionPlatform, setCaptionPlatform] = useState<CaptionPlatform>('linkedin');
  const [captionTone, setCaptionTone] = useState<CaptionTone>('auto');
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
  const [replyInputMode, setReplyInputMode] = useState<ReplyInputMode>('text');
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyOriginalText, setReplyOriginalText] = useState('');
  const [replyPlatform, setReplyPlatform] = useState<ReplyPlatform>('linkedin');
  const [replyResponseType, setReplyResponseType] = useState<ReplyResponseType>('own_post');
  const [replyGoal, setReplyGoal] = useState<ReplyGoal>('auto');
  const [replyPersonType, setReplyPersonType] = useState<ReplyPersonType>('general_audience');
  const [replyResult, setReplyResult] = useState<ReplyResult | null>(null);
  const [localBusyTool, setLocalBusyTool] = useState<'caption' | 'reply' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const activeMeta = activeTool ? studioToolMeta[activeTool] : null;
  const activeGoalOptions = activeTool ? studioToolGoalOptions[activeTool] : studioToolGoalOptions.hook;
  const resolvedGoal = activeGoalOptions.includes(goal) ? goal : activeGoalOptions[0];
  const platformOptions = [
    { value: 'auto', label: 'Auto' },
    ...Object.entries(platformLabels).map(([value, label]) => ({ value, label })),
  ];
  const pillarOptions = [
    { value: 'auto', label: 'Auto' },
    ...Object.entries(pillarMeta).map(([value, meta]) => ({ value, label: meta.label })),
  ];
  const goalOptions = activeGoalOptions.map((option) => ({ value: option, label: option }));
  const quantityOptions = [
    { value: '6', label: '6 options' },
    { value: '10', label: '10 options' },
    { value: '15', label: '15 options' },
  ];
  const hookTypeOptions = Object.entries(hookTypeLabels).map(([value, item]) => ({
    value,
    label: item.label,
    detail: item.detail,
  }));
  const ActiveIcon = activeMeta?.icon || WandSparkles;
  const effectiveBusyTool = busyTool || localBusyTool;
  const isBusy = effectiveBusyTool === activeTool;
  const hasSource = Boolean(source.trim());
  const canGenerateActiveTool = activeTool === 'hook' || activeTool === 'cta';
  const allowedReplyGoals = replyResponseType === 'other_post'
    ? (Object.keys(replyGoalLabels) as ReplyGoal[]).filter((item) => item !== 'invite_dm_book')
    : (Object.keys(replyGoalLabels) as ReplyGoal[]);
  const resolvedReplyGoal = allowedReplyGoals.includes(replyGoal) ? replyGoal : allowedReplyGoals[0];
  const currentLoadingMessage = localBusyTool === 'caption'
    ? captionLoadingMessages[loadingIndex % captionLoadingMessages.length]
    : localBusyTool === 'reply'
      ? replyLoadingMessages[loadingIndex % replyLoadingMessages.length]
      : '';
  const generatedToolResult = result && (!activeTool || activeTool === result.kind) ? result : null;
  const hasCaptionOutput = activeTool === 'caption' && Boolean(captionResult?.captions.length);
  const hasReplyOutput = activeTool === 'reply' && Boolean(replyResult?.reply);
  const outputTitle = activeTool
    ? studioToolMeta[activeTool].label
    : generatedToolResult
      ? studioToolMeta[generatedToolResult.kind].label
      : 'Ready when the idea is';
  const outputSubtitle = activeTool === 'caption'
    ? `${captionPlatformLabels[captionPlatform]} - ${captionToneLabels[captionTone]}`
    : activeTool === 'reply'
      ? `${replyPlatformLabels[replyPlatform]} - ${replyResponseTypeLabels[replyResponseType].label}${replyGoal === 'auto' && replyResult?.chosenGoal ? ` - Auto → ${replyGoalLabels[replyResult.chosenGoal as ReplyGoal]?.label ?? replyResult.chosenGoal}` : ` - ${replyGoalLabels[resolvedReplyGoal].label}`}`
      : generatedToolResult
        ? `${generatedToolResult.kind === 'hook' && generatedToolResult.payload.hookType ? `${hookTypeLabels[generatedToolResult.payload.hookType].label} - ` : ''}${generatedToolResult.payload.platform === 'auto' ? 'Auto platform' : platformLabels[generatedToolResult.payload.platform]} - ${generatedToolResult.payload.pillar === 'auto' ? 'Auto pillar' : pillarMeta[generatedToolResult.payload.pillar].label} - ${generatedToolResult.payload.goal}`
        : '';
  const outputBadge = activeTool === 'caption'
    ? '3 captions'
    : activeTool === 'reply'
      ? '2 versions'
      : generatedToolResult
        ? `${generatedToolResult.payload.quantity} options`
        : '';

  useEffect(() => {
    if (!localBusyTool) return;
    const interval = window.setInterval(() => {
      setLoadingIndex((current) => current + 1);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [localBusyTool]);

  async function copyToolOutput() {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyText(value: string) {
    if (!value.trim()) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function getImageValidationError(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Use a JPEG, PNG, or WebP image.';
    if (file.size > 10 * 1024 * 1024) return 'Image must be 10MB or smaller.';
    return '';
  }

  function handleCaptionImageSelect(file: File | null) {
    if (!file) return;
    const validationError = getImageValidationError(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    setCaptionImageFile(file);
    setCaptionInputMode('image');
  }

  function handleReplyImageSelect(file: File | null) {
    if (!file) return;
    const validationError = getImageValidationError(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    setReplyImageFile(file);
    setReplyInputMode('image');
  }

  function generateActiveTool() {
    if (activeTool !== 'hook' && activeTool !== 'cta') return;
    onGenerate(activeTool, {
      source,
      platform,
      pillar,
      goal: resolvedGoal,
      quantity,
      hookType: activeTool === 'hook' ? hookType : undefined,
    });
  }

  async function generateCaption() {
    if (captionInputMode === 'text' && !captionSourceText.trim()) {
      setLocalError('Paste the post text or upload an image first.');
      return;
    }
    if (captionInputMode === 'image' && !captionImageFile) {
      setLocalError('Upload an image or switch to Text and paste the post text first.');
      return;
    }

    setLocalBusyTool('caption');
    setLoadingIndex(0);
    setLocalError(null);
    try {
      const formData = new FormData();
      formData.append('key', adminKey);
      formData.append('platform', captionPlatform);
      formData.append('tone', captionTone);
      if (captionInputMode === 'text') {
        formData.append('sourceText', captionSourceText);
      }
      if (captionInputMode === 'image' && captionImageFile) {
        formData.append('image', captionImageFile);
      }

      const response = await fetch('/api/tools/caption', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null) as CaptionResult & { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Something went wrong. Try again or simplify your inputs.');
      setCaptionResult({ captions: data?.captions || [], analysis: data?.analysis });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Something went wrong. Try again or simplify your inputs.');
    } finally {
      setLocalBusyTool(null);
    }
  }

  async function generateReply() {
    if (replyInputMode === 'text' && !replyOriginalText.trim()) {
      setLocalError('Paste the original text or upload a screenshot first.');
      return;
    }
    if (replyInputMode === 'image' && !replyImageFile && !replyOriginalText.trim()) {
      setLocalError('Upload a screenshot or paste the original text first.');
      return;
    }

    setLocalBusyTool('reply');
    setLoadingIndex(0);
    setLocalError(null);
    try {
      const formData = new FormData();
      formData.append('key', adminKey);
      formData.append('platform', replyPlatform);
      formData.append('responseType', replyResponseType);
      formData.append('goal', resolvedReplyGoal);
      formData.append('personType', replyPersonType);
      formData.append('originalText', replyOriginalText);
      if (replyInputMode === 'image' && replyImageFile) {
        formData.append('image', replyImageFile);
      }

      const response = await fetch('/api/tools/reply', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null) as ReplyResult & { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Something went wrong. Try again or simplify your inputs.');
      setReplyResult({
        reply: data?.reply || '',
        shortReply: data?.shortReply || '',
        chosenGoal: data?.chosenGoal,
        analysis: data?.analysis,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Something went wrong. Try again or simplify your inputs.');
    } finally {
      setLocalBusyTool(null);
    }
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <div className="rounded-[8px] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Studio / Tools</p>
            <h2 className="mt-2 font-serif text-[32px] leading-tight text-[#142334]">Tools</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">
              Build the opening line and the next step before a post goes live.
            </p>
          </div>
          <button type="button" onClick={onOpenDrafting} className="studio-secondary-button">
            Open drafting <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(Object.keys(studioToolMeta) as StudioToolKind[]).map((kind) => {
            const meta = studioToolMeta[kind];
            const Icon = meta.icon;
            const isSelected = activeTool === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setCopied(false);
                  setActiveTool((current) => (current === kind ? null : kind));
                }}
                className={`rounded-[8px] border p-4 text-left transition ${
                  isSelected
                    ? 'border-[#142334] bg-[#142334] text-white outline outline-2 outline-[#C9AD98]'
                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-[8px] ${isSelected ? 'bg-white/10 text-white' : 'bg-white text-[#C9AD98]'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${isSelected ? 'bg-white/10 text-white/75' : 'bg-white text-[#8C7466]'}`}>
                    {meta.status === 'ready' ? 'Ready' : 'Next'}
                  </span>
                </span>
                <span className={`mt-4 block text-[10px] font-bold uppercase tracking-[0.16em] ${isSelected ? 'text-white/62' : 'text-[#8C7466]'}`}>
                  {meta.eyebrow}
                </span>
                <span className="mt-1 block font-serif text-[25px] leading-tight">{meta.label}</span>
                <span className={`mt-2 block text-[12px] leading-relaxed ${isSelected ? 'text-white/65' : 'text-[#142334]/62'}`}>
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>

        {(activeTool === 'hook' || activeTool === 'cta') && activeMeta && (
        <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{activeMeta.eyebrow}</p>
              <h3 className="mt-1 font-serif text-[27px] leading-tight text-[#142334]">{activeMeta.label}</h3>
            </div>
            <Badge className="bg-white text-[#8C7466]">{quantity} options</Badge>
          </div>

          {activeTool === 'hook' && (
            <div className="mt-4">
              <span className="studio-label">Hook type</span>
              <div className="mt-2">
                <ToolPillGroup
                  value={hookType}
                  onChange={(value) => setHookType(value as HookType)}
                  options={hookTypeOptions}
                />
              </div>
            </div>
          )}

          <label className="mt-4 grid gap-2">
            <span className="studio-label">{activeTool === 'hook' ? 'Draft / topic / scene' : 'Topic or draft'}</span>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              onWheel={trapWheel}
              rows={7}
              placeholder={activeTool === 'hook' ? hookTypeLabels[hookType].placeholder : 'Paste a draft, carousel slide, content idea, or audience tension...'}
              className="studio-input resize-y px-4 py-3 leading-relaxed"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSource(defaultSource)}
              disabled={!defaultSource.trim()}
              className="studio-ghost-button"
            >
              Use current context
            </button>
            <button type="button" onClick={() => setSource('')} className="studio-ghost-button">
              Clear
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <span className="studio-label">Platform</span>
              <FilterDropdown
                name="studioToolPlatform"
                value={platform}
                onChange={(value) => setPlatform(value as ContentPlatform | 'auto')}
                ariaLabel="Choose tool platform"
                options={platformOptions}
              />
            </div>
            <div className="grid gap-2">
              <span className="studio-label">Pillar</span>
              <FilterDropdown
                name="studioToolPillar"
                value={pillar}
                onChange={(value) => setPillar(value as ContentPillar | 'auto')}
                ariaLabel="Choose tool pillar"
                options={pillarOptions}
              />
            </div>
            <div className="grid gap-2">
              <span className="studio-label">Goal</span>
              <FilterDropdown
                name="studioToolGoal"
                value={resolvedGoal}
                onChange={setGoal}
                ariaLabel="Choose tool goal"
                options={goalOptions}
              />
            </div>
            <div className="grid gap-2">
              <span className="studio-label">Options</span>
              <FilterDropdown
                name="studioToolQuantity"
                value={quantity}
                onChange={(value) => setQuantity(value as StudioToolPayload['quantity'])}
                ariaLabel="Choose number of tool options"
                options={quantityOptions}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          )}

          <button
            type="button"
            onClick={generateActiveTool}
            disabled={!hasSource || Boolean(effectiveBusyTool) || !canGenerateActiveTool}
            className="studio-primary-button mt-5 w-full justify-center"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActiveIcon className="h-4 w-4" />}
            {isBusy ? 'Generating...' : activeMeta.buttonLabel}
          </button>
        </div>
        )}

        {activeTool === 'caption' && (
          <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Package the post</p>
                <h3 className="mt-1 font-serif text-[27px] leading-tight text-[#142334]">Caption Generator</h3>
              </div>
              <Badge className="bg-white text-[#8C7466]">3 captions</Badge>
            </div>

            <ToolStep number="01" title="Paste text or upload image">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCaptionInputMode('text')}
                  className={`rounded-[8px] border p-3 text-left text-[13px] font-bold transition ${captionInputMode === 'text' ? 'border-[#142334] bg-[#142334] text-white' : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98]'}`}
                >
                  <span className="block">Text</span>
                  <span className={`mt-1 block text-[11px] leading-relaxed ${captionInputMode === 'text' ? 'text-white/62' : 'text-[#142334]/55'}`}>
                    Explain the video, paste a script, or paste the post text.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionInputMode('image')}
                  className={`rounded-[8px] border p-3 text-left text-[13px] font-bold transition ${captionInputMode === 'image' ? 'border-[#142334] bg-[#142334] text-white' : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98]'}`}
                >
                  <span className="block">Image</span>
                  <span className={`mt-1 block text-[11px] leading-relaxed ${captionInputMode === 'image' ? 'text-white/62' : 'text-[#142334]/55'}`}>
                    Upload the photo or visual you want captioned.
                  </span>
                </button>
              </div>
              {captionInputMode === 'text' ? (
                <textarea
                  value={captionSourceText}
                  onChange={(event) => setCaptionSourceText(event.target.value)}
                  onWheel={trapWheel}
                  rows={5}
                  placeholder="Explain what your video is about, paste the video script, or paste the post text..."
                  className="studio-input mt-3 w-full resize-y px-4 py-3 leading-relaxed"
                />
              ) : (
                <label className="mt-3 grid min-h-[118px] w-full cursor-pointer place-items-center rounded-[8px] border-2 border-dashed border-[#E4D8CB] bg-white p-5 text-center transition hover:border-[#C9AD98] hover:bg-[#FBFAF8]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => handleCaptionImageSelect(event.target.files?.[0] || null)}
                  />
                  <span className="grid justify-items-center">
                    <Upload className="h-6 w-6 text-[#C9AD98]" />
                    <span className="mt-2 text-[13px] font-bold text-[#142334]">{captionImageFile ? captionImageFile.name : 'Drop your image here or click to upload'}</span>
                    <span className="mt-1 text-[11px] text-[#142334]/55">JPEG, PNG, WebP. Max 10MB.</span>
                  </span>
                </label>
              )}
            </ToolStep>

            <ToolStep number="02" title="Select platform">
              <ToolPillGroup
                value={captionPlatform}
                onChange={(value) => setCaptionPlatform(value as CaptionPlatform)}
                options={Object.entries(captionPlatformLabels).map(([value, label]) => ({ value, label }))}
              />
            </ToolStep>

            <ToolStep number="03" title="Caption tone">
              <ToolPillGroup
                value={captionTone}
                onChange={(value) => setCaptionTone(value as CaptionTone)}
                options={Object.entries(captionToneLabels).map(([value, label]) => ({ value, label }))}
              />
            </ToolStep>

            {localError && activeTool === 'caption' && (
              <div className="mt-4">
                <Notice tone="error">{localError}</Notice>
              </div>
            )}
            {localBusyTool === 'caption' && (
              <p className="mt-4 rounded-[8px] bg-white px-4 py-3 text-[13px] font-semibold text-[#142334]/70">{currentLoadingMessage}</p>
            )}
            <button
              type="button"
              onClick={() => void generateCaption()}
              disabled={Boolean(effectiveBusyTool)}
              className="studio-primary-button mt-5 w-full justify-center"
            >
              {localBusyTool === 'caption' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Generate 3 captions
            </button>
          </div>
        )}

        {activeTool === 'reply' && (
          <div className="mt-5 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Join the conversation</p>
                <h3 className="mt-1 font-serif text-[27px] leading-tight text-[#142334]">Reply Generator</h3>
              </div>
              <Badge className="bg-white text-[#8C7466]">Full + short</Badge>
            </div>

            <ToolStep number="01" title="What are you responding to?">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setReplyInputMode('text')}
                  className={`rounded-[8px] border p-3 text-left text-[13px] font-bold transition ${replyInputMode === 'text' ? 'border-[#142334] bg-[#142334] text-white' : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98]'}`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setReplyInputMode('image')}
                  className={`rounded-[8px] border p-3 text-left text-[13px] font-bold transition ${replyInputMode === 'image' ? 'border-[#142334] bg-[#142334] text-white' : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98]'}`}
                >
                  Image / screenshot
                </button>
              </div>
              {replyInputMode === 'text' ? (
                <textarea
                  value={replyOriginalText}
                  onChange={(event) => setReplyOriginalText(event.target.value)}
                  onWheel={trapWheel}
                  rows={6}
                  placeholder="Paste the comment, message, post, or email you want to respond to..."
                  className="studio-input mt-3 w-full resize-y px-4 py-3 leading-relaxed"
                />
              ) : (
                <div className="mt-3 grid w-full gap-3">
                  <label className="grid min-h-[118px] w-full cursor-pointer place-items-center rounded-[8px] border-2 border-dashed border-[#E4D8CB] bg-white p-5 text-center transition hover:border-[#C9AD98] hover:bg-[#FBFAF8]">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => handleReplyImageSelect(event.target.files?.[0] || null)}
                    />
                    <span className="grid justify-items-center">
                      <ImageIcon className="h-6 w-6 text-[#C9AD98]" />
                      <span className="mt-2 text-[13px] font-bold text-[#142334]">{replyImageFile ? replyImageFile.name : 'Upload a screenshot of the comment or post'}</span>
                      <span className="mt-1 text-[11px] text-[#142334]/55">JPEG, PNG, WebP. Max 10MB.</span>
                    </span>
                  </label>
                  <textarea
                    value={replyOriginalText}
                    onChange={(event) => setReplyOriginalText(event.target.value)}
                    onWheel={trapWheel}
                    rows={3}
                    placeholder="Optional: paste or correct the text from the screenshot..."
                    className="studio-input w-full resize-y px-4 py-3 leading-relaxed"
                  />
                </div>
              )}
            </ToolStep>

            <ToolStep number="02" title="Select platform">
              <ToolPillGroup
                value={replyPlatform}
                onChange={(value) => setReplyPlatform(value as ReplyPlatform)}
                options={Object.entries(replyPlatformLabels).map(([value, label]) => ({ value, label }))}
              />
            </ToolStep>

            <ToolStep number="03" title="What type of response is this?">
              <ToolPillGroup
                value={replyResponseType}
                onChange={(value) => setReplyResponseType(value as ReplyResponseType)}
                options={Object.entries(replyResponseTypeLabels).map(([value, item]) => ({
                  value,
                  label: item.label,
                  detail: item.detail,
                }))}
              />
            </ToolStep>

            <ToolStep number="04" title="What's the goal of this reply?">
              <ToolPillGroup
                value={resolvedReplyGoal}
                onChange={(value) => setReplyGoal(value as ReplyGoal)}
                options={allowedReplyGoals.map((value) => ({ value, label: replyGoalLabels[value].label, detail: replyGoalLabels[value].detail }))}
              />
            </ToolStep>

            <ToolStep number="05" title="Who is this person?">
              <ToolPillGroup
                value={replyPersonType}
                onChange={(value) => setReplyPersonType(value as ReplyPersonType)}
                options={Object.entries(replyPersonTypeLabels).map(([value, label]) => ({ value, label }))}
              />
            </ToolStep>

            {localError && activeTool === 'reply' && (
              <div className="mt-4">
                <Notice tone="error">{localError}</Notice>
              </div>
            )}
            {localBusyTool === 'reply' && (
              <p className="mt-4 rounded-[8px] bg-white px-4 py-3 text-[13px] font-semibold text-[#142334]/70">{currentLoadingMessage}</p>
            )}
            <button
              type="button"
              onClick={() => void generateReply()}
              disabled={Boolean(effectiveBusyTool)}
              className="studio-primary-button mt-5 w-full justify-center"
            >
              {localBusyTool === 'reply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Generate reply
            </button>
          </div>
        )}
      </div>

      <aside className="rounded-[8px] bg-[#142334] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Tool output</p>
            <h3 className="mt-2 font-serif text-[30px] leading-tight">
              {outputTitle}
            </h3>
            {outputSubtitle && (
              <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                {outputSubtitle}
              </p>
            )}
          </div>
          {outputBadge && <Badge className="bg-white/10 text-white">{outputBadge}</Badge>}
        </div>

        {generatedToolResult?.output ? (
          <>
            <div className="mt-5 rounded-[8px] border border-white/10 bg-white p-4 text-[#142334]">
              <pre className="max-h-[620px] overflow-y-auto whitespace-pre-wrap font-sans text-[14px] leading-[1.7]">{generatedToolResult.output}</pre>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={copyToolOutput} className="studio-primary-button">
                <ClipboardCheck className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy output'}
              </button>
              <button type="button" onClick={() => setSource(generatedToolResult.output)} className="studio-secondary-button">
                Use as source
              </button>
            </div>
          </>
        ) : hasCaptionOutput ? (
          <>
            {captionResult?.analysis && (
              <div className="mt-5 rounded-[8px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">AI Reasoning</p>
                <p className="mt-1 text-[11px] italic leading-relaxed text-[#8C7466]/80">{captionResult.analysis}</p>
              </div>
            )}
            <div className="mt-5 grid gap-3">
              {captionResult?.captions.map((item, index) => (
                <div key={`${item.angle}-${index}`} className="rounded-[8px] border border-white/10 bg-white p-4 text-[#142334]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Option {String(index + 1).padStart(2, '0')}</p>
                      {item.angle && <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">{item.angle}</p>}
                    </div>
                    <Badge className="bg-[#F5F3EE] text-[#8C7466]">{captionPlatformLabels[captionPlatform]}</Badge>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.7] text-[#142334]/78">{item.caption}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyText(item.caption)} className="studio-primary-button">
                      <ClipboardCheck className="h-4 w-4" />
                      {copied ? 'Copied' : 'Copy caption'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSource(item.caption);
                        setActiveTool('hook');
                      }}
                      className="studio-secondary-button"
                    >
                      Use for hooks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : hasReplyOutput ? (
          <>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[8px] border border-white/10 bg-white p-4 text-[#142334]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Suggested reply</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">{replyGoal === 'auto' && replyResult?.chosenGoal ? `Auto → ${replyGoalLabels[replyResult.chosenGoal as ReplyGoal]?.label ?? replyResult.chosenGoal}` : replyGoalLabels[resolvedReplyGoal].label}</p>
                    {replyGoal === 'auto' && replyResult?.analysis && (
                      <p className="mt-1 text-[11px] italic leading-relaxed text-[#8C7466]/80">{replyResult.analysis}</p>
                    )}
                  </div>
                  <Badge className="bg-[#F5F3EE] text-[#8C7466]">{replyPlatformLabels[replyPlatform]}</Badge>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.7] text-[#142334]/78">{replyResult?.reply}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void copyText(replyResult?.reply || '')} className="studio-primary-button">
                    <ClipboardCheck className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSource(replyResult?.reply || '');
                      setActiveTool('cta');
                    }}
                    className="studio-secondary-button"
                  >
                    Use for CTAs
                  </button>
                </div>
              </div>
              {replyResult?.shortReply && (
                <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/58">Shorter version</p>
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.7] text-white/80">{replyResult.shortReply}</p>
                  <button type="button" onClick={() => void copyText(replyResult.shortReply)} className="studio-secondary-button mt-4">
                    <ClipboardCheck className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy short reply'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5 grid min-h-[420px] place-items-center rounded-[8px] border border-white/10 bg-white/5 p-6 text-center">
            <div className="max-w-sm">
              <WandSparkles className="mx-auto h-9 w-9 text-[#C9AD98]" />
              <p className="mt-5 font-serif text-[26px] leading-tight">Choose a tool, add context, generate.</p>
              <p className="mt-3 text-[13px] leading-relaxed text-white/58">
                Hooks, CTAs, captions, and replies will stay inside Kagiso&apos;s voice rules and the selected platform.
              </p>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

function ToolStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#142334] text-[12px] font-bold text-white">
          {number}
        </span>
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ToolPillGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; detail?: string }>;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[8px] border px-4 py-3 text-left transition ${
              isSelected
                ? 'border-[#142334] bg-[#142334] text-white'
                : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#FBFAF8]'
            }`}
          >
            <span className="block text-[13px] font-bold">{option.label}</span>
            {option.detail && (
              <span className={`mt-1 block text-[11px] leading-relaxed ${isSelected ? 'text-white/62' : 'text-[#142334]/55'}`}>
                {option.detail}
              </span>
            )}
          </button>
        );
      })}
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
        <div className="grid gap-2">
          <span className="studio-label">Pillar</span>
          <FilterDropdown
            name="insightsArticlePillar"
            value={pillar}
            onChange={(value) => setPillar(value as ContentPillar)}
            ariaLabel="Choose Insights article pillar"
            options={Object.entries(pillarMeta).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
        </div>
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
  vaultItems,
  onClose,
  onSaved,
  onDelete,
}: {
  state: CalendarModalState;
  adminKey: string;
  vaultItems: ContentBacklogItem[];
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
  const [sourceMode, setSourceMode] = useState<'blank' | 'vault'>('blank');
  const [vaultSearch, setVaultSearch] = useState('');
  const [selectedVaultItemId, setSelectedVaultItemId] = useState<string | null>(null);
  const usableVaultItems = useMemo(() => {
    const query = vaultSearch.trim().toLowerCase();
    return vaultItems
      .filter((item) => item.status !== 'used' && !isMessyMiddleItem(item))
      .filter((item) => {
        if (!query) return true;
        const haystack = [
          extractCleanTitle(item.title, item.content || ''),
          item.content || '',
          item.notes || '',
          item.pillar ? pillarMeta[item.pillar].label : '',
          item.platform ? platformLabels[item.platform] : '',
          getBacklogSourceLabel(item),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [vaultItems, vaultSearch]);

  function applyVaultItem(item: ContentBacklogItem) {
    const body = getBacklogDraftBody(item);
    const cleanTitle = extractCleanTitle(item.title, item.content || body);
    const sourceNote = `Pulled from Vault: ${cleanTitle}`;

    setSelectedVaultItemId(item.id);
    setTitle(cleanTitle);
    setPillar(item.pillar || pillar);
    setPlatform(item.platform || platform);
    setStatus(item.status === 'idea' ? 'idea' : 'draft');
    setDraftContent(body || extractPreview(item.content || item.notes || cleanTitle, 800));
    setNotes((current) => {
      if (!current.trim()) return sourceNote;
      if (current.includes(sourceNote)) return current;
      return `${current.trim()}\n\n${sourceNote}`;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishDate) {
      setError('Choose a publish date before saving this planned post.');
      return;
    }
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
        <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Start point</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#142334]/62">
                Fill this manually, or pull a saved idea or draft from the Vault.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-[8px] bg-white p-1">
              {[
                { value: 'blank' as const, label: 'Start blank' },
                { value: 'vault' as const, label: 'Pull from Vault' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceMode(option.value)}
                  className={`min-h-9 rounded-[8px] px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                    sourceMode === option.value
                      ? 'bg-[#142334] text-white'
                      : 'text-[#142334]/58 hover:bg-[#F5F3EE] hover:text-[#142334]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === 'vault' && (
            <div className="mt-3 grid gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7466]" />
                <input
                  value={vaultSearch}
                  onChange={(event) => setVaultSearch(event.target.value)}
                  placeholder="Search saved drafts, ideas, Smart Suggests..."
                  className="studio-input h-11 w-full pl-10"
                />
              </label>
              <div className="grid max-h-[280px] gap-2 overflow-y-auto pr-1" onWheel={trapWheel}>
                {usableVaultItems.length === 0 ? (
                  <div className="rounded-[8px] border border-dashed border-[#D7C2B2] bg-white px-4 py-5 text-center">
                    <p className="font-serif text-[20px] leading-tight text-[#142334]">No matching Vault items.</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">
                      Try a different search, or start this calendar post blank.
                    </p>
                  </div>
                ) : (
                  usableVaultItems.map((item) => {
                    const cleanTitle = extractCleanTitle(item.title, item.content || '');
                    const preview = isInsightsBacklogItem(item)
                      ? getInsightsSummary(item)
                      : extractPreview(getBacklogDraftBody(item) || item.content || item.notes || cleanTitle, 150);
                    const isSelected = selectedVaultItemId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyVaultItem(item)}
                        className={`rounded-[8px] border p-3 text-left transition ${
                          isSelected
                            ? 'border-[#142334] bg-[#142334] text-white'
                            : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#FBFAF8]'
                        }`}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                            isSelected ? 'bg-white/12 text-white' : 'bg-[#F5F3EE] text-[#8C7466]'
                          }`}>
                            {getBacklogSourceLabel(item)}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                            isSelected ? 'bg-white/12 text-white' : backlogStatusMeta[item.status].className
                          }`}>
                            {backlogStatusMeta[item.status].label}
                          </span>
                          {item.platform && (
                            <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                              isSelected ? 'bg-white/12 text-white' : 'bg-[#F5F3EE] text-[#6B6B6B]'
                            }`}>
                              {platformLabels[item.platform]}
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block text-[14px] font-bold">{cleanTitle}</span>
                        <span className={`mt-1 block line-clamp-2 text-[12px] leading-relaxed ${isSelected ? 'text-white/62' : 'text-[#142334]/58'}`}>
                          {preview || 'Saved Vault item ready to place on the calendar.'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <TextInput label="Title/topic" value={title} onChange={setTitle} required />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <span className="studio-label">Pillar</span>
            <FilterDropdown
              name="calendarPostPillar"
              value={pillar}
              onChange={(value) => setPillar(value as ContentPillar)}
              ariaLabel="Choose planned post pillar"
              options={Object.entries(pillarMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </div>
          <div className="grid gap-2">
            <span className="studio-label">Platform</span>
            <FilterDropdown
              name="calendarPostPlatform"
              value={platform}
              onChange={(value) => setPlatform(value as ContentPlatform)}
              ariaLabel="Choose planned post platform"
              options={Object.entries(platformLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <div className="grid gap-2">
            <span className="studio-label">Status</span>
            <FilterDropdown
              name="calendarPostStatus"
              value={status}
              onChange={(value) => setStatus(value as ContentCalendarStatus)}
              ariaLabel="Choose planned post status"
              options={Object.entries(calendarStatusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <span className="studio-label">Publish date</span>
          <DashboardDatePicker
            name="publishDate"
            value={publishDate}
            onChange={setPublishDate}
            ariaLabel="Choose planned post publish date"
            placeholder="Publish date"
          />
        </div>
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
  const [isFavorite, setIsFavorite] = useState(Boolean(state.item?.isFavorite || state.defaults?.isFavorite));
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
      const payload = { key: adminKey, title, pillar, platform, status, source, isFavorite, content, notes };
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
        <div className="flex flex-col gap-3 rounded-[12px] border border-[#E4D8CB] bg-[#F8F6F4] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Favourite</p>
            <p className="mt-1 text-[12px] text-[#142334]/62">Keep this idea easy to spot.</p>
          </div>
          <button
            type="button"
            aria-pressed={isFavorite}
            onClick={() => setIsFavorite((current) => !current)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-[12px] font-bold uppercase tracking-[0.12em] transition ${
              isFavorite
                ? 'border-[#A24E37] bg-[#FFF4EF] text-[#A24E37]'
                : 'border-[#D8C8BB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#F5F3EE]'
            }`}
          >
            <span aria-hidden="true">❤️</span>
            {isFavorite ? 'Favourited' : 'Mark favourite'}
          </button>
        </div>
        <TextInput label="Title/topic" value={title} onChange={setTitle} required />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <span className="studio-label">Pillar</span>
            <FilterDropdown
              name="backlogPillar"
              value={pillar}
              onChange={(value) => setPillar(value as ContentPillar | '')}
              ariaLabel="Choose idea pillar"
              options={[
                { value: '', label: 'No pillar yet' },
                ...Object.entries(pillarMeta).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
          </div>
          <div className="grid gap-2">
            <span className="studio-label">Platform</span>
            <FilterDropdown
              name="backlogPlatform"
              value={platform}
              onChange={(value) => setPlatform(value as ContentPlatform | '')}
              ariaLabel="Choose idea platform"
              options={[
                { value: '', label: 'No platform yet' },
                ...Object.entries(platformLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <span className="studio-label">Status</span>
            <FilterDropdown
              name="backlogStatus"
              value={status}
              onChange={(value) => setStatus(value as ContentBacklogStatus)}
              ariaLabel="Choose idea status"
              options={Object.entries(backlogStatusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </div>
          <div className="grid gap-2">
            <span className="studio-label">Source</span>
            <FilterDropdown
              name="backlogSource"
              value={source}
              onChange={(value) => setSource(value as ContentBacklogSource)}
              ariaLabel="Choose idea source"
              options={Object.entries(sourceLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
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
