'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  Circle,
  ChevronDown,
  ChevronUp,
  Copy,
  Diamond,
  Download,
  FlipHorizontal,
  FlipVertical,
  GripVertical,
  Hexagon,
  Image as ImageIcon,
  Italic,
  Layers3,
  Lock,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Redo2,
  RefreshCcw,
  RotateCw,
  Save,
  Search,
  SendToBack,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Ungroup,
  Underline,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  getCarouselAspectRatioOption,
  getCarouselExportDimensions,
  getCarouselLayoutRecipeOption,
  getCarouselTemplateOption,
  type CarouselAspectRatio,
  type CarouselLayoutRecipe,
  type CarouselPlatform,
  type CarouselSlideRole,
  type CarouselTemplate,
} from '@/lib/content/carousel-template-registry';
import { copyTextToClipboard } from '@/lib/clipboard';
import FilterDropdown from '@/components/FilterDropdown';

type DesignFormat = 'social_graphic' | 'carousel' | 'presentation';
type DesignLayerType = 'text' | 'asset' | 'shape';
type DesignCanvasGuides = {
  grid: boolean;
  safeArea: boolean;
  bleed: boolean;
};
type DesignBackgroundEffects = {
  grain: boolean;
  noise: boolean;
  notebookLines: boolean;
  ruledLines: boolean;
  gridLines: boolean;
  gridSize: number;
};
type DesignShapeKind = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'line';
type DesignAssetId = string;
type DesignBrandIconKind =
  | 'envelope'
  | 'trashCan'
  | 'materialDelete'
  | 'uploadTray'
  | 'moreVertical'
  | 'heartLoopArrow'
  | 'dashedLoopArrow'
  | 'curvedDownArrow'
  | 'loopUpArrow'
  | 'chatOutline'
  | 'chatFilled'
  | 'paperPlane'
  | 'fontAwesomePaperPlane'
  | 'heartFilled';
type DesignFontFamily =
  | 'serif'
  | 'sans'
  | 'interTight'
  | 'hand'
  | 'alohaLover'
  | 'daughterHand'
  | 'heroIn'
  | 'bableya'
  | 'linebrush'
  | 'mibrush'
  | 'walesiaSignatureBrush'
  | 'walkingDream'
  | 'sweetBulky'
  | 'simpleNotes'
  | 'kaliebLuxury';
type DesignTextAlign = 'left' | 'center' | 'right';
type DesignTextDecoration = 'none' | 'underline';
type DesignTextInlineFormat = 'bold' | 'italic' | 'underline' | 'uppercase';
type DesignTextSelectionRange = {
  layerId: string;
  start: number;
  end: number;
};
type DesignTextRun = {
  start: number;
  end: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: DesignTextDecoration;
  textTransform?: 'none' | 'uppercase';
};
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type ColorInputMode = 'hex' | 'rgb';
type DesignSnapGuide = {
  x?: number;
  y?: number;
};
type DesignSelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type DesignLayerAlignment = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
type DesignSidebarTab = 'layers' | 'add' | 'arrange';
type DesignInspectorTab = 'content' | 'style' | 'position' | 'effects';
type DesignTemplateSlotKey = 'brand' | 'eyebrow' | 'headline' | 'body' | 'cta' | 'pageNumber' | 'visualNote';
type DesignTemplateSlot = {
  kind: 'carousel' | 'text';
  key: DesignTemplateSlotKey;
  label: string;
};

type DesignAsset = {
  id: DesignAssetId;
  name: string;
  src: string;
  category: string;
  custom?: boolean;
  recolorable?: boolean;
  defaultColor?: string;
  textureRecolor?: boolean;
  iconKind?: DesignBrandIconKind;
  naturalWidth?: number;
  naturalHeight?: number;
  groupBounds?: DesignSelectionBounds;
  groupedLayers?: DesignLayer[];
};

type BaseDesignLayer = {
  id: string;
  type: DesignLayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked?: boolean;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  outlineEnabled?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  blurEnabled?: boolean;
  blurAmount?: number;
  flipX?: boolean;
  flipY?: boolean;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
  templateSlot?: DesignTemplateSlot;
};

type DesignTextLayer = BaseDesignLayer & {
  type: 'text';
  text: string;
  fontFamily: DesignFontFamily;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight: number;
  textAlign: DesignTextAlign;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: DesignTextDecoration;
  textTransform?: 'none' | 'uppercase';
  letterSpacing?: number;
  richTextRuns?: DesignTextRun[];
};

type DesignAssetLayer = BaseDesignLayer & {
  type: 'asset';
  assetId: DesignAssetId;
  fit: 'contain' | 'cover';
  color?: string;
};

type DesignShapeLayer = BaseDesignLayer & {
  type: 'shape';
  shape: DesignShapeKind;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
};

type DesignLayer = DesignTextLayer | DesignAssetLayer | DesignShapeLayer;

type DesignPage = {
  id: string;
  name: string;
  background: string;
  backgroundEffects?: Partial<DesignBackgroundEffects>;
  layers: DesignLayer[];
};

type DesignDocument = {
  id: string;
  title: string;
  format: DesignFormat;
  width: number;
  height: number;
  pages: DesignPage[];
  templateSourceId?: string;
  templateSourceName?: string;
  templateUpdatedAt?: string;
  carouselTemplate?: CarouselTemplate;
  carouselLayoutRecipe?: CarouselLayoutRecipe;
};

export type DesignStudioCarouselSlideInput = {
  id: string;
  role: CarouselSlideRole;
  headline: string;
  body: string;
  cta?: string;
  visualSuggestion?: string;
};

export type DesignStudioCarouselDraftInput = {
  title: string;
  platform: CarouselPlatform;
  aspectRatio: CarouselAspectRatio;
  template: CarouselTemplate;
  layoutRecipe: CarouselLayoutRecipe;
  slides: DesignStudioCarouselSlideInput[];
  caption?: string;
  createdAt?: string;
};

export type DesignStudioCarouselImport = {
  id: string;
  label: string;
  sourceLabel: string;
  draft: DesignStudioCarouselDraftInput;
};

export type DesignStudioTextImport = {
  id: string;
  label: string;
  sourceLabel: string;
  title: string;
  text: string;
};

export type DesignStudioVaultImport = DesignStudioTextImport & {
  statusLabel: string;
  platformLabel?: string;
  updatedAt?: string;
};

export type DesignStudioImportRequest = {
  id: string;
  kind: 'carousel' | 'text';
  requestId: number;
};

type DesignStudioPendingImport =
  | {
      kind: 'carousel';
      source: DesignStudioCarouselImport;
    }
  | {
      kind: 'text';
      source: DesignStudioTextImport;
    };

type DesignTemplateRecord = {
  id: string;
  name: string;
  format: DesignFormat;
  width: number;
  height: number;
  sourceCarouselTemplate?: CarouselTemplate;
  sourceCarouselLayoutRecipe?: CarouselLayoutRecipe;
  document: DesignDocument;
  createdAt: string;
  updatedAt: string;
};

type ExportState = {
  busy: boolean;
  message: string;
  tone: 'info' | 'error';
};

type DesignHistoryEntry = {
  design: DesignDocument;
  activePageId: string;
  selectedLayerId: string | null;
  selectedLayerIds: string[];
};

type DesignHistory = {
  past: DesignHistoryEntry[];
  future: DesignHistoryEntry[];
};

type DesignLayerClipboard = {
  layers: DesignLayer[];
  sourceDesignId: string;
  sourcePageId: string;
};

type DesignPatchOptions = {
  recordHistory?: boolean;
};

const DESIGN_STORAGE_KEY = 'coach-kagiso-design-studio-v3-manifesto';
const BRAND_ASSETS_STORAGE_KEY = 'coach-kagiso-design-studio-v3-brand-assets';
const DELETED_ASSETS_STORAGE_KEY = 'coach-kagiso-design-studio-v3-deleted-assets';
const LEGACY_HIDDEN_ASSETS_STORAGE_KEY = 'coach-kagiso-design-studio-v3-hidden-assets';
const DESIGN_TEMPLATES_STORAGE_KEY = 'coach-kagiso-design-studio-v1-templates';
const CONTENT_VAULT_COLLAPSED_STORAGE_KEY = 'coach-kagiso-design-studio-v1-content-vault-collapsed';
const DESIGN_LAYER_CLIPBOARD_TEXT = 'Coach Kagiso Design Studio layer selection';
export const DESIGN_STUDIO_PENDING_IMPORT_STORAGE_KEY = 'coach-kagiso-design-studio-v1-pending-import';
const DEFAULT_DESIGN_WIDTH = 1080;
const DEFAULT_DESIGN_HEIGHT = 1350;
const DEFAULT_SAFE_AREA_MARGIN = 90;
const DEFAULT_BLEED_MARGIN = 36;
const SNAP_GUIDE_PIXEL_THRESHOLD = 10;
const TEXT_LAYER_AUTO_FIT_TOLERANCE = 4;
const MAX_BRAND_ASSET_BYTES = 2 * 1024 * 1024;
const DEFAULT_BACKGROUND_GRID_SIZE = 84;
const MIN_CANVAS_ZOOM = 50;
const MAX_CANVAS_ZOOM = 200;
const CANVAS_ZOOM_STEP = 25;
const CANVAS_FIT_WIDTH = 680;
const SAVED_GROUP_PADDING = 24;
const MAX_DESIGN_HISTORY_ENTRIES = 80;
const designAspectRatioPresets = [
  { label: '1:1', width: 1080, height: 1080 },
  { label: '4:5', width: 1080, height: 1350 },
  { label: '9:16', width: 1080, height: 1920 },
];
const designBrandSwatches = [
  '#142334',
  '#C9AD98',
  '#B98567',
  '#EFD8CA',
  '#F5F2ED',
  '#FBFAF8',
  '#8AA6C8',
  '#79A580',
  '#C98672',
  '#F7F1EC',
  '#FFFFFF',
  '#000000',
];
const designSidebarTabs: Array<{ value: DesignSidebarTab; label: string }> = [
  { value: 'layers', label: 'Layers' },
  { value: 'add', label: 'Add' },
  { value: 'arrange', label: 'Arrange' },
];
const designInspectorTabs: Array<{ value: DesignInspectorTab; label: string }> = [
  { value: 'content', label: 'Content' },
  { value: 'style', label: 'Style' },
  { value: 'position', label: 'Position' },
  { value: 'effects', label: 'Effects' },
];
const backgroundEffectOptions: Array<{ key: keyof Omit<DesignBackgroundEffects, 'gridSize'>; label: string; detail: string }> = [
  { key: 'grain', label: 'Grain', detail: 'Soft paper speckle.' },
  { key: 'noise', label: 'Noise', detail: 'Subtle texture.' },
  { key: 'notebookLines', label: 'Notebook', detail: 'Ruled lines with margin.' },
  { key: 'ruledLines', label: 'Lines', detail: 'Clean horizontal lines.' },
  { key: 'gridLines', label: 'Grid', detail: 'Adjustable grid lines.' },
];
const designTemplateSlotOptions: Array<{ value: DesignTemplateSlotKey; label: string }> = [
  { value: 'brand', label: 'Brand' },
  { value: 'eyebrow', label: 'Eyebrow' },
  { value: 'headline', label: 'Headline' },
  { value: 'body', label: 'Body' },
  { value: 'cta', label: 'CTA' },
  { value: 'pageNumber', label: 'Page number' },
  { value: 'visualNote', label: 'Visual note' },
];

const textInsertCharacters = [
  '\u2022',
  '\u25E6',
  '\u25AA',
  '\u2192',
  '\u21B3',
  '\u2713',
  '\u2726',
  '\u2605',
  '\u2500\u2500\u2500\u2500',
  '\u2022 \u2022 \u2022',
  '01',
  '02',
  '03',
  'P.S.',
  'Note:',
  'Try this:',
] as const;

const designAssetLibrary: Record<string, DesignAsset> = {
  paper_texture: {
    id: 'paper_texture',
    name: 'Paper texture',
    src: '/design-elements/manifesto/paper-texture.svg',
    category: 'Background',
    naturalWidth: 1080,
    naturalHeight: 1350,
  },
  paper_resource_6_1: {
    id: 'paper_resource_6_1',
    name: 'Paper resource 6',
    src: '/design-elements/paper-resources/paper-resource-6-1.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 434,
    naturalHeight: 392,
  },
  paper_resource_06: {
    id: 'paper_resource_06',
    name: 'Paper resource 06',
    src: '/design-elements/paper-resources/paper-resource-06.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 2457,
    naturalHeight: 837,
  },
  paper_resource_13: {
    id: 'paper_resource_13',
    name: 'Paper resource 13',
    src: '/design-elements/paper-resources/paper-resource-13.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 2677,
    naturalHeight: 932,
  },
  paper_resource_18: {
    id: 'paper_resource_18',
    name: 'Paper resource 18',
    src: '/design-elements/paper-resources/paper-resource-18.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 2771,
    naturalHeight: 1007,
  },
  paper_strip_38: {
    id: 'paper_strip_38',
    name: 'Paper strip 38',
    src: '/design-elements/paper-resources/paper-strip-38.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1001,
    naturalHeight: 275,
  },
  paper_strip_40: {
    id: 'paper_strip_40',
    name: 'Paper strip 40',
    src: '/design-elements/paper-resources/paper-strip-40.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1002,
    naturalHeight: 288,
  },
  paper_piece_2_1: {
    id: 'paper_piece_2_1',
    name: 'Paper piece 2',
    src: '/design-elements/paper-resources/paper-piece-2-1.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 190,
    naturalHeight: 144,
  },
  paper_piece_3_1: {
    id: 'paper_piece_3_1',
    name: 'Paper piece 3',
    src: '/design-elements/paper-resources/paper-piece-3-1.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 337,
    naturalHeight: 144,
  },
  paper_middle_section: {
    id: 'paper_middle_section',
    name: 'Paper middle section',
    src: '/design-elements/paper-resources/paper-middle-section.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1920,
    naturalHeight: 1138,
  },
  paper_photo_frame: {
    id: 'paper_photo_frame',
    name: 'Paper photo frame',
    src: '/design-elements/paper-resources/paper-photo-frame.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1020,
    naturalHeight: 1524,
  },
  paper_yunusovael_8: {
    id: 'paper_yunusovael_8',
    name: 'Paper texture 8',
    src: '/design-elements/paper-resources/paper-yunusovael-8.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1073,
    naturalHeight: 1248,
  },
  torn_paper_2: {
    id: 'torn_paper_2',
    name: 'Torn paper 2',
    src: '/design-elements/paper-resources/torn-paper-2.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 4096,
    naturalHeight: 1950,
  },
  torn_paper_4: {
    id: 'torn_paper_4',
    name: 'Torn paper 4',
    src: '/design-elements/paper-resources/torn-paper-4.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 4096,
    naturalHeight: 2246,
  },
  paper_resource_03: {
    id: 'paper_resource_03',
    name: 'Paper resource 03',
    src: '/design-elements/paper-resources/paper-resource-03.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 1974,
    naturalHeight: 2123,
  },
  paper_resource_04: {
    id: 'paper_resource_04',
    name: 'Paper resource 04',
    src: '/design-elements/paper-resources/paper-resource-04.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 3627,
    naturalHeight: 2355,
  },
  paper_resource_10: {
    id: 'paper_resource_10',
    name: 'Paper resource 10',
    src: '/design-elements/paper-resources/paper-resource-10.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 2152,
    naturalHeight: 1181,
  },
  paper_resource_21: {
    id: 'paper_resource_21',
    name: 'Paper resource 21',
    src: '/design-elements/paper-resources/paper-resource-21.svg',
    category: 'Paper resources',
    recolorable: true,
    defaultColor: '#F5F2ED',
    textureRecolor: true,
    naturalWidth: 2201,
    naturalHeight: 2194,
  },
  torn_paper_note: {
    id: 'torn_paper_note',
    name: 'Torn paper note',
    src: '/design-elements/manifesto/torn-paper-note.svg',
    category: 'Manifesto',
    naturalWidth: 520,
    naturalHeight: 360,
  },
  tape_left: {
    id: 'tape_left',
    name: 'Tape left',
    src: '/design-elements/manifesto/tape-left.svg',
    category: 'Manifesto',
    naturalWidth: 150,
    naturalHeight: 78,
  },
  tape_right: {
    id: 'tape_right',
    name: 'Tape right',
    src: '/design-elements/manifesto/tape-right.svg',
    category: 'Manifesto',
    naturalWidth: 150,
    naturalHeight: 78,
  },
  plastic_tape_overlay_6: {
    id: 'plastic_tape_overlay_6',
    name: 'Plastic tape overlay 6',
    src: '/design-elements/tape-overlays/plastic-tape-overlay-6.png',
    category: 'Tape overlays',
    naturalWidth: 4500,
    naturalHeight: 1374,
  },
  plastic_tape_overlay_1: {
    id: 'plastic_tape_overlay_1',
    name: 'Plastic tape overlay 1',
    src: '/design-elements/tape-overlays/plastic-tape-overlay-1.png',
    category: 'Tape overlays',
    naturalWidth: 4498,
    naturalHeight: 1944,
  },
  plastic_tape_overlay_3: {
    id: 'plastic_tape_overlay_3',
    name: 'Plastic tape overlay 3',
    src: '/design-elements/tape-overlays/plastic-tape-overlay-3.png',
    category: 'Tape overlays',
    naturalWidth: 4500,
    naturalHeight: 1778,
  },
  plastic_tape_overlay_8: {
    id: 'plastic_tape_overlay_8',
    name: 'Plastic tape overlay 8',
    src: '/design-elements/tape-overlays/plastic-tape-overlay-8.png',
    category: 'Tape overlays',
    naturalWidth: 4494,
    naturalHeight: 2219,
  },
  plastic_tape_22: {
    id: 'plastic_tape_22',
    name: 'Plastic tape 22',
    src: '/design-elements/tape-overlays/plastic-tape-22.png',
    category: 'Tape overlays',
    naturalWidth: 737,
    naturalHeight: 1830,
  },
  plastic_tape_16: {
    id: 'plastic_tape_16',
    name: 'Plastic tape 16',
    src: '/design-elements/tape-overlays/plastic-tape-16.png',
    category: 'Tape overlays',
    naturalWidth: 1056,
    naturalHeight: 2647,
  },
  plastic_tape_08: {
    id: 'plastic_tape_08',
    name: 'Plastic tape 08',
    src: '/design-elements/tape-overlays/plastic-tape-08.png',
    category: 'Tape overlays',
    naturalWidth: 1648,
    naturalHeight: 1670,
  },
  hand_arrow: {
    id: 'hand_arrow',
    name: 'Hand arrow',
    src: '/design-elements/manifesto/hand-arrow.svg',
    category: 'Marks',
    naturalWidth: 250,
    naturalHeight: 190,
  },
  bookmark: {
    id: 'bookmark',
    name: 'Bookmark',
    src: '/design-elements/manifesto/bookmark.svg',
    category: 'Marks',
    naturalWidth: 72,
    naturalHeight: 108,
  },
  scribble_circle: {
    id: 'scribble_circle',
    name: 'Scribble circle',
    src: '/design-elements/manifesto/scribble-circle.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 220,
    naturalHeight: 160,
  },
  scribble_circle_loose: {
    id: 'scribble_circle_loose',
    name: 'Scribble circle loose',
    src: '/design-elements/manifesto/scribble-circle-loose.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 240,
    naturalHeight: 180,
  },
  scribble_circle_double: {
    id: 'scribble_circle_double',
    name: 'Scribble circle double',
    src: '/design-elements/manifesto/scribble-circle-double.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 240,
    naturalHeight: 180,
  },
  scribble_circle_rough: {
    id: 'scribble_circle_rough',
    name: 'Scribble circle rough',
    src: '/design-elements/manifesto/scribble-circle-rough.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 240,
    naturalHeight: 180,
  },
  scribble_circle_oval: {
    id: 'scribble_circle_oval',
    name: 'Scribble circle oval',
    src: '/design-elements/manifesto/scribble-circle-oval.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 260,
    naturalHeight: 170,
  },
  scribble_circle_bold: {
    id: 'scribble_circle_bold',
    name: 'Scribble circle bold',
    src: '/design-elements/manifesto/scribble-circle-bold.svg',
    category: 'Marks',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 230,
    naturalHeight: 180,
  },
  curvy_bold_line_sweep: {
    id: 'curvy_bold_line_sweep',
    name: 'Curvy bold sweep',
    src: '/design-elements/curvy-lines/curvy-bold-line-sweep.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 960,
    naturalHeight: 760,
  },
  curvy_bold_line_loop: {
    id: 'curvy_bold_line_loop',
    name: 'Curvy bold loop',
    src: '/design-elements/curvy-lines/curvy-bold-line-loop.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 960,
    naturalHeight: 1000,
  },
  curvy_bold_line_ribbon: {
    id: 'curvy_bold_line_ribbon',
    name: 'Curvy bold ribbon',
    src: '/design-elements/curvy-lines/curvy-bold-line-ribbon.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 980,
    naturalHeight: 560,
  },
  curvy_bold_line_snake: {
    id: 'curvy_bold_line_snake',
    name: 'Curvy bold snake',
    src: '/design-elements/curvy-lines/curvy-bold-line-snake.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 640,
    naturalHeight: 1000,
  },
  curvy_bold_line_arch: {
    id: 'curvy_bold_line_arch',
    name: 'Curvy bold arch',
    src: '/design-elements/curvy-lines/curvy-bold-line-arch.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 1000,
    naturalHeight: 880,
  },
  curvy_bold_line_corner: {
    id: 'curvy_bold_line_corner',
    name: 'Curvy bold corner',
    src: '/design-elements/curvy-lines/curvy-bold-line-corner.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 860,
    naturalHeight: 820,
  },
  curvy_bold_line_wave: {
    id: 'curvy_bold_line_wave',
    name: 'Curvy bold wave',
    src: '/design-elements/curvy-lines/curvy-bold-line-wave.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 1040,
    naturalHeight: 480,
  },
  curvy_bold_line_hook: {
    id: 'curvy_bold_line_hook',
    name: 'Curvy bold hook',
    src: '/design-elements/curvy-lines/curvy-bold-line-hook.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#B50707',
    naturalWidth: 620,
    naturalHeight: 860,
  },
  curvy_bold_line_tall_river: {
    id: 'curvy_bold_line_tall_river',
    name: 'Curvy bold tall river',
    src: '/design-elements/curvy-lines/curvy-bold-line-tall-river.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#000000',
    naturalWidth: 980,
    naturalHeight: 1900,
  },
  curvy_bold_line_giant_loop: {
    id: 'curvy_bold_line_giant_loop',
    name: 'Curvy bold giant loop',
    src: '/design-elements/curvy-lines/curvy-bold-line-giant-loop.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#263D34',
    naturalWidth: 1380,
    naturalHeight: 1240,
  },
  curvy_bold_line_crossing_loop: {
    id: 'curvy_bold_line_crossing_loop',
    name: 'Curvy bold crossing loop',
    src: '/design-elements/curvy-lines/curvy-bold-line-crossing-loop.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#263D34',
    naturalWidth: 1380,
    naturalHeight: 1400,
  },
  curvy_bold_line_edge_s: {
    id: 'curvy_bold_line_edge_s',
    name: 'Curvy bold edge S',
    src: '/design-elements/curvy-lines/curvy-bold-line-edge-s.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#000000',
    naturalWidth: 880,
    naturalHeight: 1580,
  },
  curvy_bold_line_low_loop: {
    id: 'curvy_bold_line_low_loop',
    name: 'Curvy bold low loop',
    src: '/design-elements/curvy-lines/curvy-bold-line-low-loop.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#263D34',
    naturalWidth: 1240,
    naturalHeight: 920,
  },
  curvy_bold_line_side_arc: {
    id: 'curvy_bold_line_side_arc',
    name: 'Curvy bold side arc',
    src: '/design-elements/curvy-lines/curvy-bold-line-side-arc.svg',
    category: 'Curvy lines',
    recolorable: true,
    defaultColor: '#000000',
    naturalWidth: 1080,
    naturalHeight: 1220,
  },
  abstract_line_1: {
    id: 'abstract_line_1',
    name: 'Abstract line 1',
    src: '/design-elements/abstract-lines/abstract-line-1.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7771,
    naturalHeight: 4299,
  },
  abstract_line_2: {
    id: 'abstract_line_2',
    name: 'Abstract line 2',
    src: '/design-elements/abstract-lines/abstract-line-2.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7516,
    naturalHeight: 3573,
  },
  abstract_line_4: {
    id: 'abstract_line_4',
    name: 'Abstract line 4',
    src: '/design-elements/abstract-lines/abstract-line-4.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7495,
    naturalHeight: 3765,
  },
  abstract_line_5: {
    id: 'abstract_line_5',
    name: 'Abstract line 5',
    src: '/design-elements/abstract-lines/abstract-line-5.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7540,
    naturalHeight: 4307,
  },
  abstract_line_6: {
    id: 'abstract_line_6',
    name: 'Abstract line 6',
    src: '/design-elements/abstract-lines/abstract-line-6.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 9132,
    naturalHeight: 3906,
  },
  abstract_line_7: {
    id: 'abstract_line_7',
    name: 'Abstract line 7',
    src: '/design-elements/abstract-lines/abstract-line-7.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7067,
    naturalHeight: 4897,
  },
  abstract_line_8: {
    id: 'abstract_line_8',
    name: 'Abstract line 8',
    src: '/design-elements/abstract-lines/abstract-line-8.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 7541,
    naturalHeight: 4640,
  },
  abstract_line_9: {
    id: 'abstract_line_9',
    name: 'Abstract line 9',
    src: '/design-elements/abstract-lines/abstract-line-9.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 8583,
    naturalHeight: 3712,
  },
  abstract_vector_line_1: {
    id: 'abstract_vector_line_1',
    name: 'Abstract vector line 1',
    src: '/design-elements/abstract-lines/abstract-vector-line-1.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 470,
    naturalHeight: 328,
  },
  abstract_vector_line_4: {
    id: 'abstract_vector_line_4',
    name: 'Abstract vector line 4',
    src: '/design-elements/abstract-lines/abstract-vector-line-4.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 438,
    naturalHeight: 358,
  },
  abstract_vector_line_5: {
    id: 'abstract_vector_line_5',
    name: 'Abstract vector line 5',
    src: '/design-elements/abstract-lines/abstract-vector-line-5.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 493,
    naturalHeight: 412,
  },
  abstract_vector_line_6: {
    id: 'abstract_vector_line_6',
    name: 'Abstract vector line 6',
    src: '/design-elements/abstract-lines/abstract-vector-line-6.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 322,
    naturalHeight: 313,
  },
  abstract_vector_line_8: {
    id: 'abstract_vector_line_8',
    name: 'Abstract vector line 8',
    src: '/design-elements/abstract-lines/abstract-vector-line-8.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 366,
    naturalHeight: 298,
  },
  abstract_vector_line_10: {
    id: 'abstract_vector_line_10',
    name: 'Abstract vector line 10',
    src: '/design-elements/abstract-lines/abstract-vector-line-10.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 380,
    naturalHeight: 445,
  },
  abstract_vector_line_12: {
    id: 'abstract_vector_line_12',
    name: 'Abstract vector line 12',
    src: '/design-elements/abstract-lines/abstract-vector-line-12.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 496,
    naturalHeight: 304,
  },
  abstract_vector_line_14: {
    id: 'abstract_vector_line_14',
    name: 'Abstract vector line 14',
    src: '/design-elements/abstract-lines/abstract-vector-line-14.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 370,
    naturalHeight: 373,
  },
  abstract_vector_line_15: {
    id: 'abstract_vector_line_15',
    name: 'Abstract vector line 15',
    src: '/design-elements/abstract-lines/abstract-vector-line-15.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 483,
    naturalHeight: 373,
  },
  abstract_vector_line_16: {
    id: 'abstract_vector_line_16',
    name: 'Abstract vector line 16',
    src: '/design-elements/abstract-lines/abstract-vector-line-16.svg',
    category: 'Abstract lines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 334,
    naturalHeight: 334,
  },
  handy_underline_20: {
    id: 'handy_underline_20',
    name: 'Underline 20',
    src: '/design-elements/handy-arrows/underlines/underline_20.svg',
    category: 'Handy underlines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 222,
    naturalHeight: 40,
  },
  handy_underline_23: {
    id: 'handy_underline_23',
    name: 'Underline 23',
    src: '/design-elements/handy-arrows/underlines/underline_23.svg',
    category: 'Handy underlines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 273,
    naturalHeight: 64,
  },
  handy_underline_27: {
    id: 'handy_underline_27',
    name: 'Underline 27',
    src: '/design-elements/handy-arrows/underlines/underline_27.svg',
    category: 'Handy underlines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 401,
    naturalHeight: 52,
  },
  handy_underline_1: {
    id: 'handy_underline_1',
    name: 'Underline 1',
    src: '/design-elements/handy-arrows/underlines/underline_1.svg',
    category: 'Handy underlines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 494,
    naturalHeight: 161,
  },
  handy_underline_10: {
    id: 'handy_underline_10',
    name: 'Underline 10',
    src: '/design-elements/handy-arrows/underlines/underline_10.svg',
    category: 'Handy underlines',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 454,
    naturalHeight: 126,
  },
  handy_arrow_43: {
    id: 'handy_arrow_43',
    name: 'Arrow 43',
    src: '/design-elements/handy-arrows/arrows/arrow-43.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 126,
    naturalHeight: 100,
  },
  handy_arrow_2: {
    id: 'handy_arrow_2',
    name: 'Arrow 2',
    src: '/design-elements/handy-arrows/arrows/arrow-2.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 149,
    naturalHeight: 122,
  },
  handy_arrow_3: {
    id: 'handy_arrow_3',
    name: 'Arrow 3',
    src: '/design-elements/handy-arrows/arrows/arrow-3.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 122,
    naturalHeight: 97,
  },
  handy_arrow_5: {
    id: 'handy_arrow_5',
    name: 'Arrow 5',
    src: '/design-elements/handy-arrows/arrows/arrow-5.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 202,
    naturalHeight: 139,
  },
  handy_arrow_8: {
    id: 'handy_arrow_8',
    name: 'Arrow 8',
    src: '/design-elements/handy-arrows/arrows/arrow-8.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 144,
    naturalHeight: 141,
  },
  handy_arrow_14: {
    id: 'handy_arrow_14',
    name: 'Arrow 14',
    src: '/design-elements/handy-arrows/arrows/arrow-14.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 70,
    naturalHeight: 119,
  },
  handy_arrow_15: {
    id: 'handy_arrow_15',
    name: 'Arrow 15',
    src: '/design-elements/handy-arrows/arrows/arrow-15.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 91,
    naturalHeight: 195,
  },
  handy_arrow_25: {
    id: 'handy_arrow_25',
    name: 'Arrow 25',
    src: '/design-elements/handy-arrows/arrows/arrow-25.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 80,
    naturalHeight: 227,
  },
  handy_arrow_40: {
    id: 'handy_arrow_40',
    name: 'Arrow 40',
    src: '/design-elements/handy-arrows/arrows/arrow-40.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 106,
    naturalHeight: 212,
  },
  handy_arrow_42: {
    id: 'handy_arrow_42',
    name: 'Arrow 42',
    src: '/design-elements/handy-arrows/arrows/arrow-42.svg',
    category: 'Handy arrows',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 166,
    naturalHeight: 199,
  },
  brand_rotated_right_arrow_broken: {
    id: 'brand_rotated_right_arrow_broken',
    name: 'Rotated right arrow broken line',
    src: '/design-elements/brand-assets/rotated-right-arrow-broken-line.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 220,
    naturalHeight: 220,
  },
  brand_rotated_right_arrow: {
    id: 'brand_rotated_right_arrow',
    name: 'Rotated right arrow',
    src: '/design-elements/brand-assets/rotated-right-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 220,
    naturalHeight: 220,
  },
  brand_bookmark_outline: {
    id: 'brand_bookmark_outline',
    name: 'Bookmark outline icon',
    src: '/design-elements/brand-assets/bookmark-outline.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_bookmark_filled: {
    id: 'brand_bookmark_filled',
    name: 'Bookmark filled icon',
    src: '/design-elements/brand-assets/bookmark-filled.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_scribble_mark: {
    id: 'brand_scribble_mark',
    name: 'Scribble mark',
    src: '/design-elements/brand-assets/scribble-mark.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 220,
    naturalHeight: 220,
  },
  brand_envelope: {
    id: 'brand_envelope',
    name: 'Envelope icon',
    src: '/design-elements/brand-assets/envelope.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'envelope',
    naturalWidth: 160,
    naturalHeight: 120,
  },
  brand_trash_can: {
    id: 'brand_trash_can',
    name: 'Trash icon',
    src: '/design-elements/brand-assets/trash-can.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'trashCan',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_material_delete: {
    id: 'brand_material_delete',
    name: 'Material delete icon',
    src: '/design-elements/brand-assets/material-delete.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'materialDelete',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_upload_tray: {
    id: 'brand_upload_tray',
    name: 'Upload icon',
    src: '/design-elements/brand-assets/upload-tray.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'uploadTray',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_more_vertical: {
    id: 'brand_more_vertical',
    name: 'More menu icon',
    src: '/design-elements/brand-assets/more-vertical.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'moreVertical',
    naturalWidth: 80,
    naturalHeight: 120,
  },
  brand_heart_loop_arrow: {
    id: 'brand_heart_loop_arrow',
    name: 'Heart loop arrow',
    src: '/design-elements/brand-assets/heart-loop-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'heartLoopArrow',
    naturalWidth: 260,
    naturalHeight: 140,
  },
  brand_dashed_loop_arrow: {
    id: 'brand_dashed_loop_arrow',
    name: 'Dashed loop arrow',
    src: '/design-elements/brand-assets/dashed-loop-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'dashedLoopArrow',
    naturalWidth: 190,
    naturalHeight: 160,
  },
  brand_curved_down_arrow: {
    id: 'brand_curved_down_arrow',
    name: 'Curved down arrow',
    src: '/design-elements/brand-assets/curved-down-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'curvedDownArrow',
    naturalWidth: 140,
    naturalHeight: 170,
  },
  brand_loop_up_arrow: {
    id: 'brand_loop_up_arrow',
    name: 'Loop up arrow',
    src: '/design-elements/brand-assets/loop-up-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'loopUpArrow',
    naturalWidth: 260,
    naturalHeight: 140,
  },
  brand_chat_outline: {
    id: 'brand_chat_outline',
    name: 'Chat outline icon',
    src: '/design-elements/brand-assets/chat-outline.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'chatOutline',
    naturalWidth: 150,
    naturalHeight: 135,
  },
  brand_chat_filled: {
    id: 'brand_chat_filled',
    name: 'Chat filled icon',
    src: '/design-elements/brand-assets/chat-filled.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'chatFilled',
    naturalWidth: 150,
    naturalHeight: 135,
  },
  brand_paper_plane: {
    id: 'brand_paper_plane',
    name: 'Paper plane icon',
    src: '/design-elements/brand-assets/paper-plane.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'paperPlane',
    naturalWidth: 150,
    naturalHeight: 135,
  },
  brand_font_awesome_paper_plane: {
    id: 'brand_font_awesome_paper_plane',
    name: 'Font Awesome paper plane',
    src: '/design-elements/brand-assets/font-awesome-paper-plane.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'fontAwesomePaperPlane',
    naturalWidth: 144,
    naturalHeight: 128,
  },
  brand_heart_filled: {
    id: 'brand_heart_filled',
    name: 'Heart filled icon',
    src: '/design-elements/brand-assets/heart-filled.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    iconKind: 'heartFilled',
    naturalWidth: 150,
    naturalHeight: 135,
  },
  brand_swipe_left: {
    id: 'brand_swipe_left',
    name: 'Swipe left icon',
    src: '/design-elements/brand-assets/swipe-left.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 150,
    naturalHeight: 150,
  },
  brand_heart_outline: {
    id: 'brand_heart_outline',
    name: 'Heart outline icon',
    src: '/design-elements/brand-assets/heart-outline.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_share_arrow: {
    id: 'brand_share_arrow',
    name: 'Share arrow icon',
    src: '/design-elements/brand-assets/share-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_navigation_arrow: {
    id: 'brand_navigation_arrow',
    name: 'Navigation arrow icon',
    src: '/design-elements/brand-assets/navigation-arrow.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_arrow_forward_circle_sharp: {
    id: 'brand_arrow_forward_circle_sharp',
    name: 'Arrow forward circle sharp',
    src: '/design-elements/brand-assets/arrow-forward-circle-sharp.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_arrow_right_filled: {
    id: 'brand_arrow_right_filled',
    name: 'Arrow right filled',
    src: '/design-elements/brand-assets/arrow-right-filled.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 160,
    naturalHeight: 80,
  },
  brand_arrow_right_line: {
    id: 'brand_arrow_right_line',
    name: 'Arrow right line',
    src: '/design-elements/brand-assets/arrow-right-line.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 160,
    naturalHeight: 80,
  },
  brand_arrow_right_sm: {
    id: 'brand_arrow_right_sm',
    name: 'Arrow right small',
    src: '/design-elements/brand-assets/arrow-right-sm.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 140,
    naturalHeight: 90,
  },
  brand_arrow_redo_circle_sharp: {
    id: 'brand_arrow_redo_circle_sharp',
    name: 'Arrow redo circle sharp',
    src: '/design-elements/brand-assets/arrow-redo-circle-sharp.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_arrow_forward_sharp: {
    id: 'brand_arrow_forward_sharp',
    name: 'Arrow forward sharp',
    src: '/design-elements/brand-assets/arrow-forward-sharp.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 160,
    naturalHeight: 90,
  },
  brand_arrow_forward_navigation: {
    id: 'brand_arrow_forward_navigation',
    name: 'Arrow forward navigation',
    src: '/design-elements/brand-assets/arrow-forward-navigation.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_turn_around_up_right: {
    id: 'brand_turn_around_up_right',
    name: 'Turn around arrow icon',
    src: '/design-elements/brand-assets/turn-around-up-right.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_menu: {
    id: 'brand_menu',
    name: 'Menu icon',
    src: '/design-elements/brand-assets/menu.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_home: {
    id: 'brand_home',
    name: 'Home icon',
    src: '/design-elements/brand-assets/home.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_search: {
    id: 'brand_search',
    name: 'Search icon',
    src: '/design-elements/brand-assets/search.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_add_square: {
    id: 'brand_add_square',
    name: 'Add square icon',
    src: '/design-elements/brand-assets/add-square.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_home_alt: {
    id: 'brand_home_alt',
    name: 'Home alternate icon',
    src: '/design-elements/brand-assets/home-alt.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_bell_off: {
    id: 'brand_bell_off',
    name: 'Bell off icon',
    src: '/design-elements/brand-assets/bell-off.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_bell: {
    id: 'brand_bell',
    name: 'Bell icon',
    src: '/design-elements/brand-assets/bell.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_user: {
    id: 'brand_user',
    name: 'User icon',
    src: '/design-elements/brand-assets/user.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_chat: {
    id: 'brand_chat',
    name: 'Chat icon',
    src: '/design-elements/brand-assets/chat.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_chat_circle: {
    id: 'brand_chat_circle',
    name: 'Chat circle icon',
    src: '/design-elements/brand-assets/chat-circle.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_camera: {
    id: 'brand_camera',
    name: 'Camera icon',
    src: '/design-elements/brand-assets/camera.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_list_task: {
    id: 'brand_list_task',
    name: 'List task icon',
    src: '/design-elements/brand-assets/list-task.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_todo_failed: {
    id: 'brand_todo_failed',
    name: 'Todo failed icon',
    src: '/design-elements/brand-assets/todo-failed.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_write: {
    id: 'brand_write',
    name: 'Write icon',
    src: '/design-elements/brand-assets/write.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_design_pencil: {
    id: 'brand_design_pencil',
    name: 'Design pencil icon',
    src: '/design-elements/brand-assets/design-pencil.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
  brand_video_play: {
    id: 'brand_video_play',
    name: 'Video play icon',
    src: '/design-elements/brand-assets/video-play.svg',
    category: 'Brand assets',
    recolorable: true,
    defaultColor: '#142334',
    naturalWidth: 120,
    naturalHeight: 120,
  },
};

const designFormatOptions: Array<{ value: DesignFormat; label: string; detail: string }> = [
  {
    value: 'social_graphic',
    label: 'Social graphic',
    detail: 'Manifesto notes, quote cards, and Reflection Friday visuals.',
  },
  {
    value: 'carousel',
    label: 'Carousel',
    detail: 'Multi-page visual posts using the same page engine.',
  },
  {
    value: 'presentation',
    label: 'Presentation',
    detail: 'Masterclass or workshop slides once deck export is connected.',
  },
];

const designFontOptions: Array<{ value: DesignFontFamily; label: string; fontFamily: string }> = [
  { value: 'serif', label: 'Serif', fontFamily: 'var(--font-serif), Georgia, "Times New Roman", serif' },
  { value: 'sans', label: 'Sans', fontFamily: 'var(--font-sans), Raleway, Arial, sans-serif' },
  { value: 'interTight', label: 'Poppins', fontFamily: 'var(--font-primary), "Poppins", sans-serif' },
  { value: 'hand', label: 'Hand', fontFamily: '"Comic Sans MS", "Segoe Print", "Bradley Hand", cursive' },
  { value: 'alohaLover', label: 'Aloha Lover', fontFamily: '"Aloha Lover", "Segoe Print", cursive' },
  { value: 'daughterHand', label: 'Daughter Hand', fontFamily: '"Daughter Hand", "Segoe Print", cursive' },
  { value: 'heroIn', label: 'Hero In', fontFamily: '"Hero In", "Segoe Print", cursive' },
  { value: 'bableya', label: 'Bableya', fontFamily: '"Bableya", "Segoe Print", cursive' },
  { value: 'linebrush', label: 'Linebrush', fontFamily: '"Linebrush", "Segoe Print", cursive' },
  { value: 'mibrush', label: 'Mibrush', fontFamily: '"Mibrush", "Segoe Print", cursive' },
  {
    value: 'walesiaSignatureBrush',
    label: 'Walesia Signature',
    fontFamily: '"Walesia Signature Brush", "Segoe Print", cursive',
  },
  { value: 'walkingDream', label: 'Walking Dream', fontFamily: '"Walking Dream", "Segoe Print", cursive' },
  { value: 'sweetBulky', label: 'Sweet Bulky', fontFamily: '"Sweet Bulky", "Segoe Print", cursive' },
  { value: 'simpleNotes', label: 'Simple Notes', fontFamily: '"Simple Notes", "Segoe Print", cursive' },
  { value: 'kaliebLuxury', label: 'Kalieb Luxury', fontFamily: '"Kalieb Luxury", "Times New Roman", serif' },
];

const designShapeOptions: Array<{ value: DesignShapeKind; label: string; icon: typeof Square }> = [
  { value: 'rectangle', label: 'Rectangle', icon: Square },
  { value: 'circle', label: 'Circle', icon: Circle },
  { value: 'triangle', label: 'Triangle', icon: Triangle },
  { value: 'diamond', label: 'Diamond', icon: Diamond },
  { value: 'hexagon', label: 'Hexagon', icon: Hexagon },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'line', label: 'Line', icon: Minus },
];

function createDesignId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDesignShapeLabel(shape: DesignShapeKind) {
  return designShapeOptions.find((option) => option.value === shape)?.label || 'Shape';
}

function createDefaultManifestoDesign(): DesignDocument {
  return {
    id: 'manifesto-note-v1',
    title: 'Career Clarity Manifesto Note',
    format: 'social_graphic',
    width: DEFAULT_DESIGN_WIDTH,
    height: DEFAULT_DESIGN_HEIGHT,
    pages: [
      {
        id: 'page-1',
        name: 'Manifesto note',
        background: '#F5F2ED',
        backgroundEffects: getDefaultBackgroundEffects(),
        layers: [
          {
            id: 'asset-paper-texture',
            type: 'asset',
            name: 'Paper texture',
            assetId: 'paper_texture',
            x: 0,
            y: 0,
            width: DEFAULT_DESIGN_WIDTH,
            height: DEFAULT_DESIGN_HEIGHT,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: true,
            fit: 'cover',
          },
          {
            id: 'brand-top',
            type: 'text',
            name: 'Top brand',
            text: 'COACH KAGISO',
            x: 104,
            y: 138,
            width: 360,
            height: 48,
            rotation: 0,
            opacity: 1,
            visible: true,
            fontFamily: 'sans',
            fontSize: 30,
            fontWeight: 800,
            color: '#B98567',
            lineHeight: 1,
            textAlign: 'left',
            textTransform: 'uppercase',
            letterSpacing: 5,
          },
          {
            id: 'series-chip',
            type: 'text',
            name: 'Series chip',
            text: 'notes   the manifesto series',
            x: 102,
            y: 242,
            width: 390,
            height: 58,
            rotation: 0,
            opacity: 1,
            visible: true,
            fontFamily: 'sans',
            fontSize: 26,
            fontWeight: 600,
            color: '#142334',
            lineHeight: 1.1,
            textAlign: 'center',
            backgroundColor: '#FBFAF8',
            borderColor: '#142334',
            borderRadius: 32,
            padding: 14,
          },
          {
            id: 'manifesto-pill',
            type: 'text',
            name: 'Manifesto label',
            text: 'The Career Clarity Manifesto',
            x: 144,
            y: 360,
            width: 500,
            height: 62,
            rotation: 0,
            opacity: 1,
            visible: true,
            fontFamily: 'serif',
            fontSize: 40,
            fontWeight: 700,
            color: '#142334',
            lineHeight: 1,
            textAlign: 'center',
            backgroundColor: '#EFD8CA',
            borderRadius: 34,
            padding: 11,
          },
          {
            id: 'main-headline',
            type: 'text',
            name: 'Main headline',
            text: 'You are not confused.\nYou are avoiding the truth you already know.',
            x: 102,
            y: 452,
            width: 820,
            height: 280,
            rotation: 0,
            opacity: 1,
            visible: true,
            fontFamily: 'serif',
            fontSize: 72,
            fontWeight: 800,
            color: '#142334',
            lineHeight: 0.98,
            textAlign: 'left',
          },
          {
            id: 'hand-arrow',
            type: 'asset',
            name: 'Hand arrow',
            assetId: 'hand_arrow',
            x: 210,
            y: 802,
            width: 210,
            height: 164,
            rotation: 12,
            opacity: 1,
            visible: true,
            fit: 'contain',
          },
          {
            id: 'note-paper',
            type: 'asset',
            name: 'Torn paper note',
            assetId: 'torn_paper_note',
            x: 540,
            y: 790,
            width: 430,
            height: 298,
            rotation: -8,
            opacity: 1,
            visible: true,
            fit: 'contain',
          },
          {
            id: 'tape-left',
            type: 'asset',
            name: 'Tape left',
            assetId: 'tape_left',
            x: 522,
            y: 764,
            width: 122,
            height: 64,
            rotation: -18,
            opacity: 1,
            visible: true,
            fit: 'contain',
          },
          {
            id: 'tape-right',
            type: 'asset',
            name: 'Tape right',
            assetId: 'tape_right',
            x: 835,
            y: 748,
            width: 118,
            height: 62,
            rotation: 18,
            opacity: 1,
            visible: true,
            fit: 'contain',
          },
          {
            id: 'hand-note',
            type: 'text',
            name: 'Handwritten note',
            text: 'Love, clarity gets louder when you stop negotiating with old versions of yourself.',
            x: 590,
            y: 858,
            width: 310,
            height: 170,
            rotation: -8,
            opacity: 1,
            visible: true,
            fontFamily: 'daughterHand',
            fontSize: 34,
            fontWeight: 700,
            color: '#142334',
            lineHeight: 1.18,
            textAlign: 'center',
          },
          {
            id: 'footer-brand',
            type: 'text',
            name: 'Footer brand',
            text: 'COACH KAGISO',
            x: 104,
            y: 1202,
            width: 360,
            height: 48,
            rotation: 0,
            opacity: 1,
            visible: true,
            fontFamily: 'sans',
            fontSize: 30,
            fontWeight: 800,
            color: '#B98567',
            lineHeight: 1,
            textAlign: 'left',
            textTransform: 'uppercase',
            letterSpacing: 5,
          },
          {
            id: 'bookmark',
            type: 'asset',
            name: 'Bookmark',
            assetId: 'bookmark',
            x: 944,
            y: 1196,
            width: 44,
            height: 66,
            rotation: 0,
            opacity: 1,
            visible: true,
            fit: 'contain',
          },
        ],
      },
    ],
  };
}

function createBlankDesignDocument(
  format: DesignFormat = 'social_graphic',
  width: number = DEFAULT_DESIGN_WIDTH,
  height: number = DEFAULT_DESIGN_HEIGHT,
): DesignDocument {
  const page = createBlankDesignPage('Page 1', width, height, '#FBFAF8');
  return {
    id: createDesignId('blank-design'),
    title: format === 'carousel' ? 'Untitled carousel template' : format === 'presentation' ? 'Untitled presentation template' : 'Untitled design',
    format,
    width,
    height,
    pages: [page],
  };
}

function createBlankDesignPage(
  name: string,
  width: number,
  height: number,
  background: string = '#F5F2ED',
  includePaperTexture: boolean = false,
): DesignPage {
  return {
    id: createDesignId('page'),
    name,
    background,
    backgroundEffects: getDefaultBackgroundEffects(),
    layers: includePaperTexture
      ? [
          {
            id: createDesignId('asset'),
            type: 'asset',
            name: 'Paper texture',
            assetId: 'paper_texture',
            x: 0,
            y: 0,
            width,
            height,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: true,
            fit: 'cover',
          },
        ]
      : [],
  };
}

function cloneDesignDocument(document: DesignDocument): DesignDocument {
  return JSON.parse(JSON.stringify(document)) as DesignDocument;
}

function cloneDesignLayer(layer: DesignLayer): DesignLayer {
  return JSON.parse(JSON.stringify(layer)) as DesignLayer;
}

function createPastedDesignLayer(layer: DesignLayer, design: DesignDocument, offset: number) {
  const pastedLayer = {
    ...cloneDesignLayer(layer),
    id: createDesignId(layer.type),
    locked: false,
    x: clamp(layer.x + offset, -layer.width + 24, design.width - 24),
    y: clamp(layer.y + offset, -layer.height + 24, design.height - 24),
  } as DesignLayer;

  return pastedLayer;
}

function getDesignTemplateSlotLabel(slot?: DesignTemplateSlot | null) {
  if (!slot) return '';
  return slot.label || designTemplateSlotOptions.find((option) => option.value === slot.key)?.label || slot.key;
}

function createTemplateSlot(kind: DesignTemplateSlot['kind'], key: DesignTemplateSlotKey): DesignTemplateSlot {
  return {
    kind,
    key,
    label: designTemplateSlotOptions.find((option) => option.value === key)?.label || key,
  };
}

function getTemplateSlotPatch(kind: DesignTemplateSlot['kind'], value: DesignTemplateSlotKey | 'none'): Partial<DesignLayer> {
  return {
    templateSlot: value === 'none' ? undefined : createTemplateSlot(kind, value),
  };
}

function isDesignTemplateRecord(value: unknown): value is DesignTemplateRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignTemplateRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.format === 'string' &&
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    isDesignDocument(record.document)
  );
}

function isDesignStudioCarouselImport(value: unknown): value is DesignStudioCarouselImport {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignStudioCarouselImport>;
  return (
    typeof record.id === 'string' &&
    typeof record.label === 'string' &&
    typeof record.sourceLabel === 'string' &&
    Boolean(record.draft) &&
    typeof record.draft?.title === 'string' &&
    Array.isArray(record.draft?.slides)
  );
}

function isDesignStudioTextImport(value: unknown): value is DesignStudioTextImport {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignStudioTextImport>;
  return (
    typeof record.id === 'string' &&
    typeof record.label === 'string' &&
    typeof record.sourceLabel === 'string' &&
    typeof record.title === 'string' &&
    typeof record.text === 'string'
  );
}

function isDesignStudioPendingImport(value: unknown): value is DesignStudioPendingImport {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignStudioPendingImport>;
  return (
    (record.kind === 'carousel' && isDesignStudioCarouselImport(record.source)) ||
    (record.kind === 'text' && isDesignStudioTextImport(record.source))
  );
}

function getCarouselRoleLabel(role: CarouselSlideRole, index: number, layoutRecipe: CarouselLayoutRecipe, total: number) {
  const recipe = getCarouselLayoutRecipeOption(layoutRecipe);
  return recipe.slideArc[index] || (index === total - 1 ? 'Close' : role.replace(/_/g, ' '));
}

function getCarouselDraftVisualBody(slide: DesignStudioCarouselSlideInput) {
  return slide.body.trim() || slide.visualSuggestion?.trim() || '';
}

function getCarouselDraftVisualCta(slide: DesignStudioCarouselSlideInput, index: number, total: number) {
  if (slide.cta?.trim()) return slide.cta.trim();
  if (index === total - 1) return 'Save this for your next career decision.';
  return '';
}

function normalizeDesignText(value: string, fallback: string) {
  return (value || '').trim() || fallback;
}

function createCarouselTextLayer(params: {
  id: string;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: DesignFontFamily;
  fontSize: number;
  fontWeight: number;
  color: string;
  lineHeight?: number;
  textAlign?: DesignTextAlign;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  textTransform?: 'none' | 'uppercase';
  letterSpacing?: number;
  templateSlot?: DesignTemplateSlot;
}): DesignTextLayer {
  return {
    id: params.id,
    type: 'text',
    name: params.name,
    text: params.text,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    fontFamily: params.fontFamily,
    fontSize: params.fontSize,
    fontWeight: params.fontWeight,
    color: params.color,
    lineHeight: params.lineHeight ?? 1.08,
    textAlign: params.textAlign ?? 'left',
    backgroundColor: params.backgroundColor,
    borderColor: params.borderColor,
    borderRadius: params.borderRadius,
    padding: params.padding,
    textTransform: params.textTransform,
    letterSpacing: params.letterSpacing,
    templateSlot: params.templateSlot,
  };
}

function createCarouselShapeLayer(params: {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  opacity?: number;
}): DesignShapeLayer {
  return {
    id: params.id,
    type: 'shape',
    name: params.name,
    shape: 'rectangle',
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    rotation: 0,
    opacity: params.opacity ?? 1,
    visible: true,
    fillColor: params.fillColor,
    strokeColor: params.strokeColor ?? 'transparent',
    strokeWidth: params.strokeWidth ?? 0,
    borderRadius: params.borderRadius ?? 0,
  };
}

function buildCarouselDesignPage(
  draft: DesignStudioCarouselDraftInput,
  slide: DesignStudioCarouselSlideInput,
  index: number,
  total: number,
  width: number,
  height: number,
): DesignPage {
  const template = getCarouselTemplateOption(draft.template);
  const palette = template.palette;
  const margin = Math.round(width * 0.078);
  const contentWidth = width - margin * 2;
  const isCover = index === 0 || slide.role === 'cover';
  const isClose = index === total - 1 || slide.role === 'cta';
  const roleLabel = getCarouselRoleLabel(slide.role, index, draft.layoutRecipe, total);
  const bodyText = getCarouselDraftVisualBody(slide);
  const ctaText = getCarouselDraftVisualCta(slide, index, total);
  const headlineSize = isCover ? Math.round(height * 0.064) : Math.round(height * 0.052);
  const bodyTop = isCover ? Math.round(height * 0.62) : Math.round(height * 0.48);
  const bodyHeight = isCover ? Math.round(height * 0.18) : Math.round(height * 0.28);
  const panelY = Math.max(bodyTop - 28, margin + 260);
  const mutedInk = palette.foreground === '#FFFFFF' ? '#FFFFFF' : palette.muted;

  const layers: DesignLayer[] = [
    createCarouselShapeLayer({
      id: createDesignId('shape'),
      name: 'Editorial frame',
      x: margin,
      y: margin,
      width: contentWidth,
      height: height - margin * 2,
      fillColor: 'transparent',
      strokeColor: palette.border,
      strokeWidth: 2,
      borderRadius: 0,
      opacity: 0.9,
    }),
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Brand',
      text: 'COACH KAGISO',
      x: margin,
      y: margin + 34,
      width: Math.round(contentWidth * 0.45),
      height: 44,
      fontFamily: 'sans',
      fontSize: 24,
      fontWeight: 800,
      color: palette.accent,
      lineHeight: 1,
      textTransform: 'uppercase',
      letterSpacing: 4,
      templateSlot: createTemplateSlot('carousel', 'brand'),
    }),
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Page number',
      text: `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
      x: width - margin - 188,
      y: margin + 34,
      width: 188,
      height: 38,
      fontFamily: 'sans',
      fontSize: 20,
      fontWeight: 700,
      color: mutedInk,
      lineHeight: 1,
      textAlign: 'right',
      templateSlot: createTemplateSlot('carousel', 'pageNumber'),
    }),
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Slide role',
      text: roleLabel,
      x: margin,
      y: margin + 108,
      width: Math.min(380, contentWidth),
      height: 54,
      fontFamily: 'sans',
      fontSize: 20,
      fontWeight: 800,
      color: palette.chipText,
      lineHeight: 1,
      textAlign: 'center',
      backgroundColor: palette.chipBackground,
      borderRadius: 28,
      padding: 14,
      textTransform: 'uppercase',
      letterSpacing: 2,
      templateSlot: createTemplateSlot('carousel', 'eyebrow'),
    }),
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Headline',
      text: normalizeDesignText(slide.headline, draft.title),
      x: margin,
      y: isCover ? Math.round(height * 0.25) : Math.round(height * 0.23),
      width: contentWidth,
      height: isCover ? Math.round(height * 0.29) : Math.round(height * 0.22),
      fontFamily: 'serif',
      fontSize: headlineSize,
      fontWeight: 800,
      color: palette.foreground,
      lineHeight: isCover ? 0.96 : 1,
      textAlign: isClose ? 'center' : 'left',
      templateSlot: createTemplateSlot('carousel', 'headline'),
    }),
  ];

  if (bodyText) {
    layers.push(
      createCarouselShapeLayer({
        id: createDesignId('shape'),
        name: 'Body panel',
        x: margin,
        y: panelY,
        width: contentWidth,
        height: bodyHeight + 52,
        fillColor: palette.panel,
        strokeColor: palette.border,
        strokeWidth: 2,
        borderRadius: 8,
        opacity: template.value === 'bold_diagnostic' ? 0.1 : 0.94,
      }),
      createCarouselTextLayer({
        id: createDesignId('text'),
        name: 'Body',
        text: bodyText,
        x: margin + 44,
        y: panelY + 36,
        width: contentWidth - 88,
        height: bodyHeight,
        fontFamily: 'sans',
        fontSize: isCover ? 34 : 32,
        fontWeight: 600,
        color: template.value === 'bold_diagnostic' ? palette.foreground : '#142334',
        lineHeight: 1.26,
        textAlign: isClose ? 'center' : 'left',
        templateSlot: createTemplateSlot('carousel', 'body'),
      }),
    );
  }

  if (slide.visualSuggestion?.trim()) {
    layers.push(
      createCarouselTextLayer({
        id: createDesignId('text'),
        name: 'Visual note',
        text: slide.visualSuggestion.trim(),
        x: margin,
        y: height - margin - 168,
        width: contentWidth,
        height: 72,
        fontFamily: 'sans',
        fontSize: 20,
        fontWeight: 600,
        color: mutedInk,
        lineHeight: 1.2,
        textAlign: 'left',
        templateSlot: createTemplateSlot('carousel', 'visualNote'),
      }),
    );
  }

  if (ctaText) {
    layers.push(
      createCarouselTextLayer({
        id: createDesignId('text'),
        name: 'CTA',
        text: ctaText,
        x: margin,
        y: height - margin - 104,
        width: contentWidth,
        height: 64,
        fontFamily: 'sans',
        fontSize: 24,
        fontWeight: 800,
        color: palette.chipText,
        lineHeight: 1,
        textAlign: 'center',
        backgroundColor: palette.chipBackground,
        borderRadius: 32,
        padding: 18,
        templateSlot: createTemplateSlot('carousel', 'cta'),
      }),
    );
  }

  return {
    id: createDesignId('page'),
    name: `Slide ${index + 1}`,
    background: palette.background,
    backgroundEffects: {
      grain: template.value !== 'bold_diagnostic',
      noise: template.value === 'soft_diagnostic_cards',
      gridLines: template.value === 'editorial_career_notes',
      gridSize: 96,
    },
    layers,
  };
}

function getCarouselSlotText(
  slot: DesignTemplateSlot,
  draft: DesignStudioCarouselDraftInput,
  slide: DesignStudioCarouselSlideInput,
  index: number,
  total: number,
) {
  switch (slot.key) {
    case 'brand':
      return 'COACH KAGISO';
    case 'eyebrow':
      return getCarouselRoleLabel(slide.role, index, draft.layoutRecipe, total);
    case 'headline':
      return normalizeDesignText(slide.headline, draft.title);
    case 'body':
      return getCarouselDraftVisualBody(slide);
    case 'cta':
      return getCarouselDraftVisualCta(slide, index, total);
    case 'pageNumber':
      return `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    case 'visualNote':
      return slide.visualSuggestion?.trim() || '';
    default:
      return '';
  }
}

function hydrateCarouselTemplatePage(
  page: DesignPage,
  draft: DesignStudioCarouselDraftInput,
  slide: DesignStudioCarouselSlideInput,
  index: number,
  total: number,
) {
  return {
    ...page,
    id: createDesignId('page'),
    name: `Slide ${index + 1}`,
    layers: page.layers.map((layer) => {
      const nextLayer = {
        ...layer,
        id: createDesignId(layer.type),
      } as DesignLayer;
      if (nextLayer.type !== 'text' || nextLayer.templateSlot?.kind !== 'carousel') return nextLayer;
      const nextText = getCarouselSlotText(nextLayer.templateSlot, draft, slide, index, total);
      return {
        ...nextLayer,
        text: nextText || nextLayer.text,
      } as DesignLayer;
    }),
  };
}

function createDesignDocumentFromCarouselDraft(draft: DesignStudioCarouselDraftInput, templateRecord?: DesignTemplateRecord | null) {
  const aspectOption = getCarouselAspectRatioOption(draft.aspectRatio, draft.platform);
  const dimensions = getCarouselExportDimensions(aspectOption);
  const template = getCarouselTemplateOption(draft.template);
  const matchingTemplate = templateRecord && templateRecord.document.pages.length > 0 ? templateRecord : null;

  if (matchingTemplate) {
    const normalizedTemplateDocument = resizeDesignCanvas(
      cloneDesignDocument(matchingTemplate.document),
      dimensions.width,
      dimensions.height,
    );
    return {
      ...normalizedTemplateDocument,
      id: createDesignId('design-carousel'),
      title: draft.title || matchingTemplate.name,
      format: 'carousel',
      width: dimensions.width,
      height: dimensions.height,
      templateSourceId: matchingTemplate.id,
      templateSourceName: matchingTemplate.name,
      carouselTemplate: draft.template,
      carouselLayoutRecipe: draft.layoutRecipe,
      pages: draft.slides.map((slide, index) => {
        const pagePattern = normalizedTemplateDocument.pages[index] || normalizedTemplateDocument.pages[normalizedTemplateDocument.pages.length - 1];
        return hydrateCarouselTemplatePage(pagePattern, draft, slide, index, draft.slides.length);
      }),
    } satisfies DesignDocument;
  }

  return {
    id: createDesignId('design-carousel'),
    title: draft.title || `${template.label} carousel`,
    format: 'carousel',
    width: dimensions.width,
    height: dimensions.height,
    templateSourceName: template.label,
    carouselTemplate: draft.template,
    carouselLayoutRecipe: draft.layoutRecipe,
    pages: draft.slides.map((slide, index) => (
      buildCarouselDesignPage(draft, slide, index, draft.slides.length, dimensions.width, dimensions.height)
    )),
  } satisfies DesignDocument;
}

function splitTextImportForDesign(text: string, title: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = lines[0] || title || 'New design note';
  const body = lines.slice(1).join('\n') || text.replace(headline, '').trim();
  return {
    headline: headline.slice(0, 180),
    body: body.slice(0, 700),
  };
}

function getTextSlotValue(slot: DesignTemplateSlot, source: DesignStudioTextImport) {
  const { headline, body } = splitTextImportForDesign(source.text, source.title);
  switch (slot.key) {
    case 'brand':
      return 'COACH KAGISO';
    case 'eyebrow':
      return source.sourceLabel || 'Generated text';
    case 'headline':
      return headline;
    case 'body':
      return body;
    case 'cta':
      return 'Save this for later.';
    case 'pageNumber':
      return '01 / 01';
    case 'visualNote':
      return '';
    default:
      return '';
  }
}

function hydrateTextTemplatePage(page: DesignPage, source: DesignStudioTextImport) {
  return {
    ...page,
    id: createDesignId('page'),
    name: 'Text visual',
    layers: page.layers.map((layer) => {
      const nextLayer = {
        ...layer,
        id: createDesignId(layer.type),
      } as DesignLayer;
      if (nextLayer.type !== 'text' || nextLayer.templateSlot?.kind !== 'text') return nextLayer;
      const nextText = getTextSlotValue(nextLayer.templateSlot, source);
      return {
        ...nextLayer,
        text: nextText || nextLayer.text,
      } as DesignLayer;
    }),
  };
}

function createDesignDocumentFromTextImport(source: DesignStudioTextImport, templateRecord?: DesignTemplateRecord | null): DesignDocument {
  if (templateRecord?.document.pages.length) {
    const templateDocument = cloneDesignDocument(templateRecord.document);
    const firstPage = templateDocument.pages[0];
    return {
      ...templateDocument,
      id: createDesignId('design-text'),
      title: source.title || templateRecord.name,
      format: 'social_graphic',
      templateSourceId: templateRecord.id,
      templateSourceName: templateRecord.name,
      pages: [hydrateTextTemplatePage(firstPage, source)],
    } satisfies DesignDocument;
  }

  const { headline, body } = splitTextImportForDesign(source.text, source.title);
  const layers: DesignLayer[] = [
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Brand',
      text: 'COACH KAGISO',
      x: 92,
      y: 118,
      width: 420,
      height: 48,
      fontFamily: 'sans',
      fontSize: 28,
      fontWeight: 800,
      color: '#B98567',
      lineHeight: 1,
      textTransform: 'uppercase',
      letterSpacing: 4,
      templateSlot: createTemplateSlot('text', 'brand'),
    }),
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Headline',
      text: headline,
      x: 92,
      y: 310,
      width: 896,
      height: 360,
      fontFamily: 'serif',
      fontSize: 74,
      fontWeight: 800,
      color: '#142334',
      lineHeight: 0.98,
      templateSlot: createTemplateSlot('text', 'headline'),
    }),
  ];

  if (body) {
    layers.push(
      createCarouselShapeLayer({
        id: createDesignId('shape'),
        name: 'Body panel',
        x: 92,
        y: 748,
        width: 896,
        height: 300,
        fillColor: '#FFFFFF',
        strokeColor: '#E4D8CB',
        strokeWidth: 2,
        borderRadius: 8,
        opacity: 0.92,
      }),
      createCarouselTextLayer({
        id: createDesignId('text'),
        name: 'Body',
        text: body,
        x: 136,
        y: 800,
        width: 808,
        height: 200,
        fontFamily: 'sans',
        fontSize: 34,
        fontWeight: 600,
        color: '#142334',
        lineHeight: 1.22,
        templateSlot: createTemplateSlot('text', 'body'),
      }),
    );
  }

  layers.push(
    createCarouselTextLayer({
      id: createDesignId('text'),
      name: 'Footer',
      text: 'Save this for later.',
      x: 92,
      y: 1190,
      width: 896,
      height: 64,
      fontFamily: 'sans',
      fontSize: 24,
      fontWeight: 800,
      color: '#142334',
      lineHeight: 1,
      textAlign: 'center',
      backgroundColor: '#EFD8CA',
      borderRadius: 32,
      padding: 18,
      templateSlot: createTemplateSlot('text', 'cta'),
    }),
  );

  return {
    id: createDesignId('design-text'),
    title: source.title || 'Generated text visual',
    format: 'social_graphic',
    width: DEFAULT_DESIGN_WIDTH,
    height: DEFAULT_DESIGN_HEIGHT,
    pages: [
      {
        id: createDesignId('page'),
        name: 'Text visual',
        background: '#F5F2ED',
        backgroundEffects: {
          grain: true,
          ruledLines: false,
          gridSize: DEFAULT_BACKGROUND_GRID_SIZE,
        },
        layers,
      },
    ],
  };
}

function isDesignDocument(value: unknown): value is DesignDocument {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignDocument>;
  return typeof record.title === 'string' && Array.isArray(record.pages) && record.pages.length > 0;
}

function isDesignAsset(value: unknown): value is DesignAsset {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DesignAsset>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.src === 'string' &&
    typeof record.category === 'string'
  );
}

function getActivePage(design: DesignDocument, activePageId: string) {
  return design.pages.find((page) => page.id === activePageId) || design.pages[0];
}

function getActiveAspectRatioLabel(design: DesignDocument) {
  return designAspectRatioPresets.find((preset) => design.width === preset.width && design.height === preset.height)?.label || null;
}

function isFullCanvasLayer(layer: DesignLayer, width: number, height: number) {
  return layer.locked && layer.x === 0 && layer.y === 0 && layer.width >= width && layer.height >= height;
}

function isCanvasCoveringLayer(layer: DesignLayer, width: number, height: number) {
  const tolerance = 2;
  return (
    layer.x <= tolerance &&
    layer.y <= tolerance &&
    layer.x + layer.width >= width - tolerance &&
    layer.y + layer.height >= height - tolerance
  );
}

function resizeLayerForCanvas(layer: DesignLayer, currentWidth: number, currentHeight: number, nextWidth: number, nextHeight: number) {
  const scaleX = nextWidth / currentWidth;
  const scaleY = nextHeight / currentHeight;

  if (isFullCanvasLayer(layer, currentWidth, currentHeight)) {
    return {
      ...layer,
      x: 0,
      y: 0,
      width: nextWidth,
      height: nextHeight,
    } as DesignLayer;
  }

  if (layer.type === 'shape' && layer.shape === 'circle') {
    const centerX = (layer.x + layer.width / 2) * scaleX;
    const centerY = (layer.y + layer.height / 2) * scaleY;
    const size = Math.max(24, layer.width * Math.min(scaleX, scaleY));
    return {
      ...layer,
      x: centerX - size / 2,
      y: centerY - size / 2,
      width: size,
      height: size,
    } as DesignLayer;
  }

  return {
    ...layer,
    x: layer.x * scaleX,
    y: layer.y * scaleY,
    width: layer.width * scaleX,
    height: layer.height * scaleY,
  } as DesignLayer;
}

function resizeDesignCanvas(design: DesignDocument, nextWidth: number, nextHeight: number) {
  if (design.width === nextWidth && design.height === nextHeight) return design;
  return {
    ...design,
    width: nextWidth,
    height: nextHeight,
    pages: design.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) => resizeLayerForCanvas(layer, design.width, design.height, nextWidth, nextHeight)),
    })),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLayerVisualBounds(layer: DesignLayer): DesignSelectionBounds {
  const angle = (layer.rotation * Math.PI) / 180;
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const corners = [
    { x: layer.x, y: layer.y },
    { x: layer.x + layer.width, y: layer.y },
    { x: layer.x + layer.width, y: layer.y + layer.height },
    { x: layer.x, y: layer.y + layer.height },
  ].map((point) => {
    const offsetX = point.x - centerX;
    const offsetY = point.y - centerY;
    return {
      x: centerX + offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
      y: centerY + offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
    };
  });

  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getLayerSelectionBounds(layers: DesignLayer[]): DesignSelectionBounds | null {
  if (!layers.length) return null;
  const bounds = layers.map(getLayerVisualBounds);
  const minX = Math.min(...bounds.map((item) => item.x));
  const maxX = Math.max(...bounds.map((item) => item.x + item.width));
  const minY = Math.min(...bounds.map((item) => item.y));
  const maxY = Math.max(...bounds.map((item) => item.y + item.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getClippedSelectionBounds(bounds: DesignSelectionBounds, design: DesignDocument): DesignSelectionBounds {
  const left = clamp(Math.floor(bounds.x), 0, design.width - 1);
  const top = clamp(Math.floor(bounds.y), 0, design.height - 1);
  const right = clamp(Math.ceil(bounds.x + bounds.width), left + 1, design.width);
  const bottom = clamp(Math.ceil(bounds.y + bounds.height), top + 1, design.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function createTransparentSvgDataUrl(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(width))}" height="${Math.max(1, Math.round(height))}" viewBox="0 0 ${Math.max(1, Math.round(width))} ${Math.max(1, Math.round(height))}"></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getSavedGroupBounds(asset: DesignAsset): DesignSelectionBounds {
  return asset.groupBounds || {
    x: 0,
    y: 0,
    width: asset.naturalWidth || 1,
    height: asset.naturalHeight || 1,
  };
}

function getSavedGroupLayers(asset: DesignAsset) {
  return Array.isArray(asset.groupedLayers) ? asset.groupedLayers : [];
}

function createSavedGroupLayerSnapshot(layer: DesignLayer, bounds: DesignSelectionBounds): DesignLayer {
  return {
    ...layer,
    x: layer.x - bounds.x,
    y: layer.y - bounds.y,
    locked: false,
  } as DesignLayer;
}

function rotatePoint(x: number, y: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

function createUngroupedLayerSnapshot(layer: DesignLayer, groupedLayer: DesignAssetLayer, asset: DesignAsset): DesignLayer {
  const bounds = getSavedGroupBounds(asset);
  const scaleX = groupedLayer.width / Math.max(1, bounds.width);
  const scaleY = groupedLayer.height / Math.max(1, bounds.height);
  const scaledWidth = layer.width * scaleX;
  const scaledHeight = layer.height * scaleY;
  let localCenterX = (layer.x - bounds.x + layer.width / 2) * scaleX;
  let localCenterY = (layer.y - bounds.y + layer.height / 2) * scaleY;

  if (groupedLayer.flipX) localCenterX = groupedLayer.width - localCenterX;
  if (groupedLayer.flipY) localCenterY = groupedLayer.height - localCenterY;

  const groupCenterX = groupedLayer.x + groupedLayer.width / 2;
  const groupCenterY = groupedLayer.y + groupedLayer.height / 2;
  const rotatedCenter = rotatePoint(
    localCenterX - groupedLayer.width / 2,
    localCenterY - groupedLayer.height / 2,
    groupedLayer.rotation,
  );

  return {
    ...layer,
    id: createDesignId(layer.type),
    x: Math.round((groupCenterX + rotatedCenter.x - scaledWidth / 2) * 10) / 10,
    y: Math.round((groupCenterY + rotatedCenter.y - scaledHeight / 2) * 10) / 10,
    width: Math.round(scaledWidth * 10) / 10,
    height: Math.round(scaledHeight * 10) / 10,
    rotation: normalizeRotation(layer.rotation + groupedLayer.rotation),
    opacity: clamp(layer.opacity * groupedLayer.opacity, 0, 1),
    locked: false,
    flipX: groupedLayer.flipX ? !layer.flipX : layer.flipX,
    flipY: groupedLayer.flipY ? !layer.flipY : layer.flipY,
  } as DesignLayer;
}

function getDefaultBackgroundEffects(): DesignBackgroundEffects {
  return {
    grain: false,
    noise: false,
    notebookLines: false,
    ruledLines: false,
    gridLines: false,
    gridSize: DEFAULT_BACKGROUND_GRID_SIZE,
  };
}

function getPageBackgroundEffects(effects?: Partial<DesignBackgroundEffects>): DesignBackgroundEffects {
  return {
    ...getDefaultBackgroundEffects(),
    ...effects,
    gridSize: clamp(effects?.gridSize ?? DEFAULT_BACKGROUND_GRID_SIZE, 32, 180),
  };
}

function snapLayerAxis(position: number, size: number, canvasSize: number, threshold: number) {
  const candidates: Array<{ coordinate: number; anchor: 'start' | 'center' | 'end' }> = [
    { coordinate: 0, anchor: 'start' },
    { coordinate: DEFAULT_SAFE_AREA_MARGIN, anchor: 'start' },
    { coordinate: canvasSize / 2, anchor: 'center' },
    { coordinate: canvasSize - DEFAULT_SAFE_AREA_MARGIN, anchor: 'end' },
    { coordinate: canvasSize, anchor: 'end' },
  ];
  let bestMatch: { coordinate: number; anchorValue: number; distance: number } | null = null;

  for (const candidate of candidates) {
    const anchorValue = candidate.anchor === 'center'
      ? position + size / 2
      : candidate.anchor === 'end'
        ? position + size
        : position;
    const distance = Math.abs(anchorValue - candidate.coordinate);
    if (distance <= threshold && (!bestMatch || distance < bestMatch.distance)) {
      bestMatch = { coordinate: candidate.coordinate, anchorValue, distance };
    }
  }

  if (!bestMatch) return { position };

  return {
    position: position + bestMatch.coordinate - bestMatch.anchorValue,
    guide: bestMatch.coordinate,
  };
}

function normalizeHexColor(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim();
  const raw = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return '';
}

function hexToRgb(value?: string | null) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function stripAssetFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').trim() || 'Brand asset';
}

function isSupportedBrandAssetFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
}

function isSvgBrandAssetFile(file: File) {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

function readBrandAssetFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read this asset.'));
    };
    reader.onerror = () => reject(new Error('Could not read this asset.'));
    reader.readAsDataURL(file);
  });
}

function getImageNaturalSize(src: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function isSvgDesignAsset(asset: DesignAsset) {
  return asset.src.startsWith('data:image/svg+xml') || asset.src.toLowerCase().endsWith('.svg');
}

function canRecolorDesignAsset(asset: DesignAsset) {
  return Boolean(asset.recolorable || (asset.custom && isSvgDesignAsset(asset)));
}

function decodeSvgDataUrl(src: string) {
  if (!src.startsWith('data:image/svg+xml')) return '';
  const commaIndex = src.indexOf(',');
  if (commaIndex < 0) return '';
  const metadata = src.slice(0, commaIndex).toLowerCase();
  const payload = src.slice(commaIndex + 1);

  try {
    if (metadata.includes(';base64')) {
      const decoded = atob(payload);
      return decodeURIComponent(
        Array.from(decoded)
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''),
      );
    }
    return decodeURIComponent(payload);
  } catch {
    return '';
  }
}

function sanitizeSvgMarkup(markup: string) {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function recolorSvgMarkup(markup: string, color: string) {
  const safeColor = normalizeHexColor(color) || '#142334';
  let nextMarkup = sanitizeSvgMarkup(markup);
  nextMarkup = nextMarkup.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleanedAttrs = attrs.replace(/\scolor=(["']).*?\1/gi, '');
    return `<svg${cleanedAttrs} color="${safeColor}">`;
  });
  nextMarkup = nextMarkup.replace(/\s(fill|stroke)=(["'])(?!none\b|transparent\b|url\()[^"']*\2/gi, (_match, property: string) => {
    return ` ${property}="${safeColor}"`;
  });
  nextMarkup = nextMarkup.replace(/(fill|stroke)\s*:\s*(?!none\b|transparent\b|url\()[^;"'}]+/gi, (_match, property: string) => {
    return `${property}: ${safeColor}`;
  });
  return nextMarkup;
}

function getRecoloredSvgDataUrl(asset: DesignAsset, color: string) {
  const decoded = decodeSvgDataUrl(asset.src);
  if (!decoded) return asset.src;
  return getRecoloredSvgDataUrlFromMarkup(decoded, color);
}

function getRecoloredSvgDataUrlFromMarkup(markup: string, color: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolorSvgMarkup(markup, color))}`;
}

function shouldUseSvgMaskRecolor(asset: DesignAsset) {
  return Boolean(
    asset.recolorable &&
      !asset.textureRecolor &&
      !asset.iconKind &&
      isSvgDesignAsset(asset) &&
      !asset.src.startsWith('data:image/svg+xml'),
  );
}

function shouldUseTexturedSvgRecolor(asset: DesignAsset) {
  return Boolean(asset.textureRecolor && canRecolorDesignAsset(asset) && isSvgDesignAsset(asset) && !asset.iconKind);
}

function getSvgMaskRecolorStyle(asset: DesignAsset, color: string, fit: 'contain' | 'cover'): CSSProperties {
  const maskImage = `url("${asset.src}")`;

  return {
    backgroundColor: color,
    maskImage,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: fit,
    WebkitMaskImage: maskImage,
    WebkitMaskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskSize: fit,
  };
}

const recoloredSvgExportCache = new Map<string, Promise<string>>();

async function getExportableRecoloredSvgDataUrl(src: string, color: string) {
  const safeColor = normalizeHexColor(color) || '#142334';
  const cacheKey = `${src}::${safeColor}`;
  const cached = recoloredSvgExportCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    if (src.startsWith('data:image/svg+xml')) {
      const decoded = decodeSvgDataUrl(src);
      return decoded ? getRecoloredSvgDataUrlFromMarkup(decoded, safeColor) : src;
    }

    const response = await fetch(src, { cache: 'force-cache' });
    if (!response.ok) return src;
    const markup = await response.text();
    if (!/<svg[\s>]/i.test(markup)) return src;
    return getRecoloredSvgDataUrlFromMarkup(markup, safeColor);
  })().catch(() => src);

  recoloredSvgExportCache.set(cacheKey, request);
  return request;
}

function getAssetImageBackgroundStyle(src: string, fit: 'contain' | 'cover'): CSSProperties {
  return {
    backgroundImage: `url(${src})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: fit,
  };
}

function getAssetImageFrameStyle(
  src: string,
  fit: 'contain' | 'cover',
  layerWidth: number,
  layerHeight: number,
  naturalWidth?: number,
  naturalHeight?: number,
): CSSProperties {
  const baseStyle = {
    backgroundImage: `url(${src})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  } satisfies CSSProperties;

  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0 || layerWidth <= 0 || layerHeight <= 0) {
    return {
      ...baseStyle,
      position: 'absolute',
      inset: 0,
      backgroundSize: fit,
    };
  }

  const assetRatio = naturalWidth / naturalHeight;
  const layerRatio = layerWidth / layerHeight;
  const fitByWidth = fit === 'contain' ? assetRatio >= layerRatio : assetRatio < layerRatio;
  const widthPercent = fitByWidth ? 100 : (layerHeight * assetRatio / layerWidth) * 100;
  const heightPercent = fitByWidth ? (layerWidth / assetRatio / layerHeight) * 100 : 100;

  return {
    ...baseStyle,
    position: 'absolute',
    left: `${(100 - widthPercent) / 2}%`,
    top: `${(100 - heightPercent) / 2}%`,
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
    backgroundSize: '100% 100%',
  };
}

function getDesignAssetPreviewSrc(asset: DesignAsset) {
  if (!asset.src.startsWith('/design-elements/')) return asset.src;
  const fileName = asset.src.split('/').pop();
  if (!fileName) return asset.src;
  const previewFileName = fileName.replace(/\.[^.]+$/, '.webp');
  if (asset.category === 'Paper resources') return `/design-elements/paper-resources/previews/${previewFileName}`;
  if (asset.category === 'Tape overlays') return `/design-elements/tape-overlays/previews/${previewFileName}`;
  return asset.src;
}

function getDefaultAssetLayerSize(asset: DesignAsset) {
  if (asset.id.includes('tape')) return { width: 160, height: 84 };
  if (asset.naturalWidth && asset.naturalHeight) {
    const maxWidth = 340;
    const maxHeight = 260;
    const ratio = Math.min(maxWidth / asset.naturalWidth, maxHeight / asset.naturalHeight, 1);
    return {
      width: Math.max(80, Math.round(asset.naturalWidth * ratio)),
      height: Math.max(64, Math.round(asset.naturalHeight * ratio)),
    };
  }
  return { width: 240, height: 180 };
}

function normalizeRotation(value: number) {
  const rotated = ((((value + 180) % 360) + 360) % 360) - 180;
  return Math.round(rotated * 10) / 10;
}

function normalizeShadowDirection(value: number) {
  return Math.round(((value % 360) + 360) % 360);
}

function getShadowDirection(offsetX: number, offsetY: number) {
  if (offsetX === 0 && offsetY === 0) return 0;
  return normalizeShadowDirection((Math.atan2(offsetY, offsetX) * 180) / Math.PI);
}

function getShadowOffsetDistance(offsetX: number, offsetY: number) {
  return Math.round(Math.sqrt(offsetX * offsetX + offsetY * offsetY));
}

function getShadowOffsetPatch(direction: number, offset: number) {
  const radians = (normalizeShadowDirection(direction) * Math.PI) / 180;
  const offsetX = Math.round(Math.cos(radians) * offset);
  const offsetY = Math.round(Math.sin(radians) * offset);
  return {
    shadowOffsetX: Object.is(offsetX, -0) ? 0 : offsetX,
    shadowOffsetY: Object.is(offsetY, -0) ? 0 : offsetY,
  };
}

function isTransparentColor(value?: string | null) {
  return !value || value === 'transparent';
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function sizeToCqw(value: number, designWidth: number) {
  return `${(value / designWidth) * 100}cqw`;
}

function getDesignFontFamily(layer: DesignTextLayer) {
  return designFontOptions.find((option) => option.value === layer.fontFamily)?.fontFamily || designFontOptions[1].fontFamily;
}

function getLayerShadowFilter(layer: DesignLayer, design: DesignDocument) {
  if (!layer.shadowEnabled) return undefined;
  const color = hexToRgb(layer.shadowColor || '#142334') || { r: 20, g: 35, b: 52 };
  const opacity = clamp(layer.shadowOpacity ?? 0.28, 0, 1);
  return `drop-shadow(${sizeToCqw(layer.shadowOffsetX ?? 10, design.width)} ${sizeToCqw(
    layer.shadowOffsetY ?? 14,
    design.width,
  )} ${sizeToCqw(layer.shadowBlur ?? 22, design.width)} rgba(${color.r}, ${color.g}, ${color.b}, ${opacity}))`;
}

function getLayerOutlineFilters(layer: DesignLayer, design: DesignDocument) {
  if (!layer.outlineEnabled) return [];
  const width = clamp(layer.outlineWidth ?? 4, 0, 32);
  if (width <= 0) return [];
  const color = layer.outlineColor || '#142334';
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.707, 0.707],
    [-0.707, 0.707],
    [0.707, -0.707],
    [-0.707, -0.707],
  ];

  return directions.map(([x, y]) => (
    `drop-shadow(${sizeToCqw(x * width, design.width)} ${sizeToCqw(y * width, design.width)} 0 ${color})`
  ));
}

function getLayerEffectFilter(layer: DesignLayer, design: DesignDocument) {
  const filters = layer.blurEnabled && (layer.blurAmount ?? 0) > 0
    ? [`blur(${sizeToCqw(layer.blurAmount ?? 0, design.width)})`, ...getLayerOutlineFilters(layer, design)]
    : [...getLayerOutlineFilters(layer, design)];
  const shadowFilter = getLayerShadowFilter(layer, design);
  if (shadowFilter) filters.push(shadowFilter);
  return filters.length ? filters.join(' ') : undefined;
}

function getLayerBoundsStyle(layer: DesignLayer, design: DesignDocument) {
  return {
    left: `${(layer.x / design.width) * 100}%`,
    top: `${(layer.y / design.height) * 100}%`,
    width: `${(layer.width / design.width) * 100}%`,
    height: `${(layer.height / design.height) * 100}%`,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: 'center',
  };
}

function getLayerContentTransformStyle(layer: DesignLayer) {
  const transforms = [
    layer.flipX ? 'scaleX(-1)' : '',
    layer.flipY ? 'scaleY(-1)' : '',
  ].filter(Boolean);

  return transforms.length
    ? {
        transform: transforms.join(' '),
        transformOrigin: 'center',
      } satisfies CSSProperties
    : undefined;
}

type DesignCornerRadiusKey =
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomLeftRadius';

const designCornerRadiusControls: Array<{ key: DesignCornerRadiusKey; label: string }> = [
  { key: 'borderTopLeftRadius', label: 'Top left' },
  { key: 'borderTopRightRadius', label: 'Top right' },
  { key: 'borderBottomRightRadius', label: 'Bottom right' },
  { key: 'borderBottomLeftRadius', label: 'Bottom left' },
];

function getLayerBaseBorderRadius(layer: DesignLayer) {
  if (layer.type === 'text') return layer.borderRadius ?? 0;
  if (layer.type === 'asset') return layer.borderRadius ?? 0;
  if (layer.type === 'shape') return layer.borderRadius;
  return 0;
}

function getLayerCornerRadius(layer: DesignLayer, key: DesignCornerRadiusKey) {
  return layer[key] ?? getLayerBaseBorderRadius(layer);
}

function getLayerCornerRadii(layer: DesignLayer) {
  return {
    topLeft: getLayerCornerRadius(layer, 'borderTopLeftRadius'),
    topRight: getLayerCornerRadius(layer, 'borderTopRightRadius'),
    bottomRight: getLayerCornerRadius(layer, 'borderBottomRightRadius'),
    bottomLeft: getLayerCornerRadius(layer, 'borderBottomLeftRadius'),
  };
}

function getUnifiedCornerRadiusPatch(value: number): Partial<DesignLayer> {
  return {
    borderRadius: value,
    borderTopLeftRadius: value,
    borderTopRightRadius: value,
    borderBottomRightRadius: value,
    borderBottomLeftRadius: value,
  } as Partial<DesignLayer>;
}

function getLayerCornerRadiusCss(layer: DesignLayer, design: DesignDocument) {
  const radii = getLayerCornerRadii(layer);
  if (!radii.topLeft && !radii.topRight && !radii.bottomRight && !radii.bottomLeft) return undefined;
  return [
    sizeToCqw(radii.topLeft, design.width),
    sizeToCqw(radii.topRight, design.width),
    sizeToCqw(radii.bottomRight, design.width),
    sizeToCqw(radii.bottomLeft, design.width),
  ].join(' ');
}

function getTextLayerStyle(layer: DesignTextLayer, design: DesignDocument) {
  return {
    color: layer.color,
    fontFamily: getDesignFontFamily(layer),
    fontSize: sizeToCqw(layer.fontSize, design.width),
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle || 'normal',
    textDecorationLine: layer.textDecoration === 'underline' ? 'underline' : 'none',
    lineHeight: layer.lineHeight,
    textAlign: layer.textAlign,
    letterSpacing: layer.letterSpacing ? sizeToCqw(layer.letterSpacing, design.width) : 0,
    textTransform: layer.textTransform || 'none',
    backgroundColor: layer.backgroundColor || 'transparent',
    border: layer.borderColor ? `${sizeToCqw(1.5, design.width)} solid ${layer.borderColor}` : undefined,
    borderRadius: getLayerCornerRadiusCss(layer, design),
    padding: layer.padding ? sizeToCqw(layer.padding, design.width) : undefined,
  };
}

function getBaseTextRunStyle(layer: DesignTextLayer) {
  return {
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle || 'normal',
    textDecoration: layer.textDecoration || 'none',
    textTransform: layer.textTransform || 'none',
  };
}

function normalizeTextRunRange(run: DesignTextRun, textLength: number): DesignTextRun | null {
  const start = clamp(Math.floor(run.start), 0, textLength);
  const end = clamp(Math.floor(run.end), 0, textLength);
  if (end <= start) return null;
  return { ...run, start, end };
}

function getNormalizedTextRuns(layer: DesignTextLayer) {
  return (layer.richTextRuns || [])
    .map((run) => normalizeTextRunRange(run, layer.text.length))
    .filter((run): run is DesignTextRun => Boolean(run))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function textRunStyleEquals(a: Omit<DesignTextRun, 'start' | 'end'>, b: Omit<DesignTextRun, 'start' | 'end'>) {
  return (
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.textDecoration === b.textDecoration &&
    a.textTransform === b.textTransform
  );
}

function mergeTextRuns(runs: DesignTextRun[]) {
  return runs.reduce<DesignTextRun[]>((merged, run) => {
    const previous = merged.at(-1);
    if (previous && previous.end === run.start && textRunStyleEquals(previous, run)) {
      previous.end = run.end;
      return merged;
    }
    merged.push({ ...run });
    return merged;
  }, []);
}

function getInlineTextStyleAt(layer: DesignTextLayer, index: number) {
  const style = getBaseTextRunStyle(layer);
  getNormalizedTextRuns(layer).forEach((run) => {
    if (index < run.start || index >= run.end) return;
    if (run.fontWeight !== undefined) style.fontWeight = run.fontWeight;
    if (run.fontStyle !== undefined) style.fontStyle = run.fontStyle;
    if (run.textDecoration !== undefined) style.textDecoration = run.textDecoration;
    if (run.textTransform !== undefined) style.textTransform = run.textTransform;
  });
  return style;
}

function getInlineTextRunFromStyle(layer: DesignTextLayer, start: number, end: number, style: ReturnType<typeof getBaseTextRunStyle>) {
  const base = getBaseTextRunStyle(layer);
  const run: DesignTextRun = { start, end };
  if (style.fontWeight !== base.fontWeight) run.fontWeight = style.fontWeight;
  if (style.fontStyle !== base.fontStyle) run.fontStyle = style.fontStyle;
  if (style.textDecoration !== base.textDecoration) run.textDecoration = style.textDecoration;
  if (style.textTransform !== base.textTransform) run.textTransform = style.textTransform;
  return Object.keys(run).length > 2 ? run : null;
}

function getTextLayerSegments(layer: DesignTextLayer) {
  const text = layer.text || ' ';
  if (!layer.text) return [{ text, style: getBaseTextRunStyle(layer) }];
  const boundaries = new Set<number>([0, layer.text.length]);
  getNormalizedTextRuns(layer).forEach((run) => {
    boundaries.add(run.start);
    boundaries.add(run.end);
  });
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  return sortedBoundaries.slice(0, -1).map((start, index) => {
    const end = sortedBoundaries[index + 1];
    return {
      text: layer.text.slice(start, end),
      style: getInlineTextStyleAt(layer, start),
    };
  }).filter((segment) => segment.text.length > 0);
}

function getTextSegmentStyle(style: ReturnType<typeof getBaseTextRunStyle>): CSSProperties {
  return {
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    textDecorationLine: style.textDecoration === 'underline' ? 'underline' : 'none',
    textTransform: style.textTransform,
  };
}

function isInlineTextFormatActive(layer: DesignTextLayer, format: DesignTextInlineFormat, range?: Omit<DesignTextSelectionRange, 'layerId'> | null) {
  if (!range || range.end <= range.start) {
    if (format === 'bold') return layer.fontWeight >= 700;
    if (format === 'italic') return layer.fontStyle === 'italic';
    if (format === 'underline') return layer.textDecoration === 'underline';
    return layer.textTransform === 'uppercase';
  }

  const start = clamp(range.start, 0, layer.text.length);
  const end = clamp(range.end, 0, layer.text.length);
  if (end <= start) return false;
  for (let index = start; index < end; index += 1) {
    const style = getInlineTextStyleAt(layer, index);
    if (format === 'bold' && style.fontWeight < 700) return false;
    if (format === 'italic' && style.fontStyle !== 'italic') return false;
    if (format === 'underline' && style.textDecoration !== 'underline') return false;
    if (format === 'uppercase' && style.textTransform !== 'uppercase') return false;
  }
  return true;
}

function getInlineFormatPatch(format: DesignTextInlineFormat, active: boolean) {
  if (format === 'bold') return { fontWeight: active ? 500 : 800 };
  if (format === 'italic') return { fontStyle: active ? 'normal' : 'italic' } as const;
  if (format === 'underline') return { textDecoration: active ? 'none' : 'underline' } as const;
  return { textTransform: active ? 'none' : 'uppercase' } as const;
}

function applyInlineTextFormat(layer: DesignTextLayer, format: DesignTextInlineFormat, range: Omit<DesignTextSelectionRange, 'layerId'>) {
  const start = clamp(Math.min(range.start, range.end), 0, layer.text.length);
  const end = clamp(Math.max(range.start, range.end), 0, layer.text.length);
  if (end <= start) return layer.richTextRuns || [];
  const active = isInlineTextFormatActive(layer, format, { start, end });
  const patch = getInlineFormatPatch(format, active);
  const boundaries = new Set<number>([0, layer.text.length, start, end]);
  getNormalizedTextRuns(layer).forEach((run) => {
    boundaries.add(run.start);
    boundaries.add(run.end);
  });

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const nextRuns = sortedBoundaries.slice(0, -1).reduce<DesignTextRun[]>((runs, segmentStart, index) => {
    const segmentEnd = sortedBoundaries[index + 1];
    if (segmentEnd <= segmentStart) return runs;
    const style = getInlineTextStyleAt(layer, segmentStart);
    if (segmentStart >= start && segmentEnd <= end) {
      Object.assign(style, patch);
    }
    const run = getInlineTextRunFromStyle(layer, segmentStart, segmentEnd, style);
    if (run) runs.push(run);
    return runs;
  }, []);

  return mergeTextRuns(nextRuns);
}

function clampInlineTextRuns(runs: DesignTextRun[] | undefined, textLength: number) {
  return mergeTextRuns(
    (runs || [])
      .map((run) => normalizeTextRunRange(run, textLength))
      .filter((run): run is DesignTextRun => Boolean(run)),
  );
}

function shiftInlineTextRunsForReplacement(layer: DesignTextLayer, start: number, end: number, insertedLength: number) {
  const delta = insertedLength - (end - start);
  const nextRuns = getNormalizedTextRuns(layer).reduce<DesignTextRun[]>((runs, run) => {
    if (run.end <= start) {
      runs.push(run);
      return runs;
    }
    if (run.start >= end) {
      runs.push({ ...run, start: run.start + delta, end: run.end + delta });
      return runs;
    }
    if (run.start < start && run.end > end) {
      runs.push({ ...run, end: Math.max(start, run.end + delta) });
      return runs;
    }
    if (run.start < start) {
      runs.push({ ...run, end: start });
      return runs;
    }
    if (run.end > end) {
      runs.push({ ...run, start: start + insertedLength, end: run.end + delta });
    }
    return runs;
  }, []);
  return clampInlineTextRuns(nextRuns, layer.text.length + delta);
}

function getTextSelectionOffset(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

function getCanvasTextSelectionRange(layerId: string, textLength: number): Omit<DesignTextSelectionRange, 'layerId'> | null {
  if (typeof window === 'undefined') return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const root = document.querySelector<HTMLElement>(`[data-design-layer-id="${layerId}"] [data-design-text-content="true"]`);
  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  if (!root || !anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode)) return null;
  const start = getTextSelectionOffset(root, anchorNode, selection.anchorOffset);
  const end = getTextSelectionOffset(root, focusNode, selection.focusOffset);
  return {
    start: clamp(Math.min(start, end), 0, textLength),
    end: clamp(Math.max(start, end), 0, textLength),
  };
}

function getLayerPreviewLabel(layer: DesignLayer, assetLibrary: Record<string, DesignAsset>) {
  if (layer.type === 'asset') return assetLibrary[layer.assetId]?.name || layer.name;
  if (layer.type === 'shape') return layer.name || getDesignShapeLabel(layer.shape);
  return layer.text.replace(/\s+/g, ' ').trim().slice(0, 48) || layer.name;
}

function getLayerCompactPreviewLabel(layer: DesignLayer, assetLibrary: Record<string, DesignAsset>) {
  const label = getLayerPreviewLabel(layer, assetLibrary);
  if (layer.type !== 'text') return label;
  const words = label.split(/\s+/).filter(Boolean);
  const compact = words.slice(0, 5).join(' ');
  return compact || layer.name;
}

function getStarPoints(width: number, height: number, strokeWidth: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.max(0, Math.min(width, height) / 2 - strokeWidth);
  const innerRadius = outerRadius * 0.45;

  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 5);
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(' ');
}

function getPolygonShapePoints(shape: Exclude<DesignShapeKind, 'rectangle' | 'circle' | 'line' | 'star'>, width: number, height: number, strokeWidth: number) {
  const inset = Math.max(strokeWidth / 2, 1);
  if (shape === 'triangle') {
    return `${width / 2},${inset} ${width - inset},${height - inset} ${inset},${height - inset}`;
  }
  if (shape === 'diamond') {
    return `${width / 2},${inset} ${width - inset},${height / 2} ${width / 2},${height - inset} ${inset},${height / 2}`;
  }
  return `${width * 0.26},${inset} ${width * 0.74},${inset} ${width - inset},${height / 2} ${width * 0.74},${height - inset} ${width * 0.26},${height - inset} ${inset},${height / 2}`;
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'design-studio-export';
}

function getCompactVaultHeading(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 130 ? `${cleaned.slice(0, 127)}...` : cleaned;
}

async function waitForDesignFonts(element: HTMLElement) {
  if (!('fonts' in document)) return;
  await document.fonts.ready;
  const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  const requests = new Set<string>();
  nodes.forEach((node) => {
    const style = getComputedStyle(node);
    if (!style.fontFamily || !style.fontSize) return;
    requests.add(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`);
  });
  await Promise.all(Array.from(requests).slice(0, 40).map((request) => document.fonts.load(request).catch(() => null)));
  await document.fonts.ready;
}

async function canvasToPngBlob(canvas: HTMLCanvasElement) {
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

function cropCanvasToPngDataUrl(canvas: HTMLCanvasElement, bounds: DesignSelectionBounds) {
  const cropCanvas = document.createElement('canvas');
  const cropWidth = Math.max(1, Math.round(bounds.width));
  const cropHeight = Math.max(1, Math.round(bounds.height));
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const context = cropCanvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the grouped asset.');
  context.drawImage(canvas, bounds.x, bounds.y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return cropCanvas.toDataURL('image/png');
}

async function prepareSvgMaskNodesForExport(element: HTMLElement) {
  const nodes = Array.from(element.querySelectorAll<HTMLElement>('[data-design-svg-mask-src]'));
  await Promise.all(
    nodes.map(async (node) => {
      const src = node.dataset.designSvgMaskSrc;
      if (!src) return;
      const color = node.dataset.designSvgMaskColor || '#142334';
      const fit = node.dataset.designSvgMaskFit === 'cover' ? 'cover' : 'contain';
      const naturalWidth = Number.parseFloat(node.dataset.designSvgMaskNaturalWidth || '');
      const naturalHeight = Number.parseFloat(node.dataset.designSvgMaskNaturalHeight || '');
      const imageSrc = await getExportableRecoloredSvgDataUrl(src, color);
      const child = node.ownerDocument.createElement('div');
      const childStyle = getAssetImageFrameStyle(
        imageSrc,
        fit,
        node.offsetWidth || 1,
        node.offsetHeight || 1,
        Number.isFinite(naturalWidth) ? naturalWidth : undefined,
        Number.isFinite(naturalHeight) ? naturalHeight : undefined,
      );

      node.replaceChildren();
      node.style.background = 'transparent';
      node.style.backgroundColor = 'transparent';
      node.style.backgroundImage = 'none';
      node.style.maskImage = 'none';
      node.style.maskPosition = 'initial';
      node.style.maskRepeat = 'initial';
      node.style.maskSize = 'initial';
      node.style.webkitMaskImage = 'none';
      node.style.webkitMaskPosition = 'initial';
      node.style.webkitMaskRepeat = 'initial';
      node.style.webkitMaskSize = 'initial';
      node.style.position = node.style.position || 'relative';
      node.style.overflow = 'hidden';
      Object.assign(child.style, childStyle);
      node.append(child);
    }),
  );
}

async function waitForDesignImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return image.decode?.().catch(() => null) ?? Promise.resolve(null);
      }

      return new Promise<null>((resolve) => {
        let timeoutId: number | undefined;
        const done = () => {
          image.removeEventListener('load', done);
          image.removeEventListener('error', done);
          if (timeoutId) window.clearTimeout(timeoutId);
          resolve(null);
        };

        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
        timeoutId = window.setTimeout(done, 2500);
      });
    }),
  );
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

function waitForNextDesignPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function captureDesignCanvas(
  element: HTMLElement,
  design: DesignDocument,
  html2canvas: typeof import('html2canvas').default,
  options?: {
    transparentBackground?: boolean;
    visibleLayerIds?: string[];
  },
) {
  const exportHost = document.createElement('div');
  const exportElement = element.cloneNode(true) as HTMLElement;
  const captureId = `design-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const visibleLayerIds = options?.visibleLayerIds ? new Set(options.visibleLayerIds) : null;

  exportHost.setAttribute('aria-hidden', 'true');
  exportHost.style.position = 'fixed';
  exportHost.style.left = '-10000px';
  exportHost.style.top = '0';
  exportHost.style.width = `${design.width}px`;
  exportHost.style.height = `${design.height}px`;
  exportHost.style.overflow = 'hidden';
  exportHost.style.pointerEvents = 'none';
  exportHost.style.zIndex = '-1';

  exportElement.dataset.designExportCaptureId = captureId;
  exportElement.style.width = `${design.width}px`;
  exportElement.style.height = `${design.height}px`;
  exportElement.style.minWidth = `${design.width}px`;
  exportElement.style.maxWidth = `${design.width}px`;
  exportElement.style.minHeight = `${design.height}px`;
  exportElement.style.maxHeight = `${design.height}px`;
  exportElement.style.margin = '0';
  exportElement.style.border = '0';
  exportElement.style.borderRadius = '0';
  exportElement.style.boxShadow = 'none';

  exportHost.append(exportElement);
  document.body.append(exportHost);

  try {
    await prepareSvgMaskNodesForExport(exportElement);
    await waitForDesignImages(exportElement);
    await waitForDesignFonts(exportElement);
    return await html2canvas(exportElement, {
      backgroundColor: null,
      logging: false,
      scale: 1,
      width: design.width,
      height: design.height,
      useCORS: true,
      windowWidth: design.width,
      windowHeight: design.height,
      onclone: (clonedDocument) => {
        const clonedCanvas = clonedDocument.querySelector<HTMLElement>(`[data-design-export-capture-id="${captureId}"]`);
        if (clonedCanvas) {
          clonedCanvas.style.width = `${design.width}px`;
          clonedCanvas.style.height = `${design.height}px`;
          clonedCanvas.style.minWidth = `${design.width}px`;
          clonedCanvas.style.maxWidth = `${design.width}px`;
          clonedCanvas.style.minHeight = `${design.height}px`;
          clonedCanvas.style.maxHeight = `${design.height}px`;
          clonedCanvas.style.margin = '0';
          clonedCanvas.style.border = '0';
          clonedCanvas.style.borderRadius = '0';
          clonedCanvas.style.boxShadow = 'none';
          if (options?.transparentBackground) {
            clonedCanvas.style.background = 'transparent';
            clonedCanvas.style.backgroundColor = 'transparent';
          }
        }

        clonedDocument.querySelectorAll<HTMLElement>('[data-design-guide="true"], [data-design-control="true"]').forEach((node) => {
          node.remove();
        });
        if (options?.transparentBackground) {
          clonedDocument.querySelectorAll<HTMLElement>('[data-design-background-effects="true"]').forEach((node) => {
            node.style.display = 'none';
          });
        }
        clonedDocument.querySelectorAll<HTMLElement>('[data-design-layer-id]').forEach((node) => {
          if (visibleLayerIds && !visibleLayerIds.has(node.dataset.designLayerId || '')) {
            node.style.display = 'none';
          }
          node.style.boxShadow = 'none';
        });
      },
    });
  } finally {
    exportHost.remove();
  }
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">{children}</span>;
}

function PanelTabs<TValue extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="flex rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-1">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={`min-h-9 flex-1 rounded-[6px] px-2 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
              active
                ? 'bg-[#142334] text-white shadow-sm'
                : 'text-[#142334]/58 hover:bg-white hover:text-[#142334]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function EffectToggleButton({
  label,
  detail,
  active,
  onClick,
}: {
  label: string;
  detail: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[76px] rounded-[8px] border p-3 text-left transition ${
        active
          ? 'border-[#142334] bg-[#142334] text-white'
          : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
      }`}
    >
      <span className="block text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
      <span className={`mt-1 block text-[11px] leading-snug ${active ? 'text-white/64' : 'text-[#142334]/52'}`}>
        {detail}
      </span>
    </button>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[11px] font-semibold text-[#142334]/58">{Math.round(value * 10) / 10}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-[#142334]"
      />
    </label>
  );
}

function CornerRadiusControl({
  layer,
  max = 120,
  onChange,
}: {
  layer: DesignLayer;
  max?: number;
  onChange: (patch: Partial<DesignLayer>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
      <NumberControl
        label="Corner radius"
        value={getLayerBaseBorderRadius(layer)}
        min={0}
        max={max}
        onChange={(value) => onChange(getUnifiedCornerRadiusPatch(value))}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {designCornerRadiusControls.map((corner) => (
          <NumberControl
            key={corner.key}
            label={corner.label}
            value={getLayerCornerRadius(layer, corner.key)}
            min={0}
            max={max}
            onChange={(value) => onChange({ [corner.key]: value } as Partial<DesignLayer>)}
          />
        ))}
      </div>
    </div>
  );
}

function AlignmentControl({
  value,
  onChange,
}: {
  value: DesignTextAlign;
  onChange: (value: DesignTextAlign) => void;
}) {
  const options: Array<{ value: DesignTextAlign; label: string; icon: typeof AlignLeft }> = [
    { value: 'left', label: 'Left', icon: AlignLeft },
    { value: 'center', label: 'Center', icon: AlignCenter },
    { value: 'right', label: 'Right', icon: AlignRight },
  ];
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const current = options[currentIndex];
  const next = options[(currentIndex + 1) % options.length];
  const CurrentIcon = current.icon;

  return (
    <div className="grid gap-2">
      <FieldLabel>Align</FieldLabel>
      <button
        type="button"
        title={`Current: ${current.label}. Click for ${next.label}.`}
        aria-label={`Text alignment: ${current.label}. Click for ${next.label}.`}
        onClick={() => onChange(next.value)}
        className="flex min-h-11 items-center gap-3 rounded-[8px] border border-[#E4D8CB] bg-white px-3 text-left text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#FBFAF8]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[#F8F6F4]">
          <CurrentIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-[12px] font-bold uppercase tracking-[0.12em]">{current.label}</span>
      </button>
    </div>
  );
}

function CanvasAlignmentControl({
  disabled,
  onAlign,
}: {
  disabled?: boolean;
  onAlign: (alignment: DesignLayerAlignment) => void;
}) {
  const rows: Array<Array<{ value: DesignLayerAlignment; label: string; icon: typeof AlignLeft }>> = [
    [
      { value: 'left', label: 'Align left edge', icon: AlignHorizontalJustifyStart },
      { value: 'centerX', label: 'Center horizontally', icon: AlignHorizontalJustifyCenter },
      { value: 'right', label: 'Align right edge', icon: AlignHorizontalJustifyEnd },
    ],
    [
      { value: 'top', label: 'Align top edge', icon: AlignVerticalJustifyStart },
      { value: 'centerY', label: 'Center vertically', icon: AlignVerticalJustifyCenter },
      { value: 'bottom', label: 'Align bottom edge', icon: AlignVerticalJustifyEnd },
    ],
  ];

  return (
    <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
      <FieldLabel>Align on canvas</FieldLabel>
      <div className="mt-3 grid gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex === 0 ? 'horizontal' : 'vertical'} className="grid grid-cols-3 gap-2">
            {row.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  disabled={disabled}
                  onClick={() => onAlign(option.value)}
                  className="grid min-h-10 place-items-center rounded-[8px] border border-[#E4D8CB] bg-white text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#FBFAF8] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function FontFamilyControl({
  value,
  onChange,
}: {
  value: DesignFontFamily;
  onChange: (value: DesignFontFamily) => void;
}) {
  const selectedFont = designFontOptions.find((option) => option.value === value) || designFontOptions[1];

  return (
    <div className="grid gap-2">
      <FieldLabel>Font</FieldLabel>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-stretch overflow-hidden rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4]">
        <div className="grid place-items-center border-r border-[#E4D8CB] bg-white px-3 text-[19px] leading-none text-[#142334]" style={{ fontFamily: selectedFont.fontFamily }}>
          Aa
        </div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as DesignFontFamily)}
          className="min-h-11 w-full appearance-none bg-transparent px-3 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#142334] outline-none"
        >
          {designFontOptions.map((option) => (
            <option key={option.value} value={option.value} style={{ fontFamily: option.fontFamily }}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
  disabled = false,
  allowTransparent = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  allowTransparent?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; left: number; top: number } | null>(null);
  const normalized = normalizeHexColor(value);
  const displayValue = normalized || (allowTransparent && isTransparentColor(value) ? 'transparent' : '#FFFFFF');
  const displayRgb = hexToRgb(normalized) || { r: 255, g: 255, b: 255 };
  const [open, setOpen] = useState(false);
  const [colorMode, setColorMode] = useState<ColorInputMode>('hex');
  const [hexInput, setHexInput] = useState(normalized || '');
  const [rgbInput, setRgbInput] = useState(displayRgb);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setPosition({
        left: clamp(drag.left + event.clientX - drag.startX, 12, window.innerWidth - 300),
        top: clamp(drag.top + event.clientY - drag.startY, 12, window.innerHeight - 360),
      });
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  function openPicker() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    setHexInput(normalized || '');
    setRgbInput(hexToRgb(normalized) || { r: 255, g: 255, b: 255 });
    setPosition({
      left: clamp(rect ? rect.left : 24, 12, window.innerWidth - 300),
      top: clamp(rect ? rect.bottom + 8 : 120, 12, window.innerHeight - 360),
    });
    setOpen(true);
  }

  function commitColor(nextValue: string) {
    const nextHex = normalizeHexColor(nextValue);
    setHexInput(nextValue);
    const nextRgb = hexToRgb(nextHex);
    if (nextRgb) setRgbInput(nextRgb);
    if (nextHex) onChange(nextHex);
  }

  function commitRgbChannel(channel: 'r' | 'g' | 'b', nextValue: string) {
    const nextRgb = {
      ...rgbInput,
      [channel]: clamp(Number.parseInt(nextValue || '0', 10) || 0, 0, 255),
    };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setRgbInput(nextRgb);
    setHexInput(nextHex);
    onChange(nextHex);
  }

  return (
    <div className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="flex min-h-11 w-full items-center gap-3 rounded-[8px] border border-[#E4D8CB] bg-white px-3 py-2 text-left transition hover:border-[#C9AD98] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span
          className="h-6 w-10 rounded-[6px] border border-[#D8C8BB]"
          style={{
            background: displayValue === 'transparent'
              ? 'repeating-linear-gradient(45deg, #E4D8CB 0 6px, #fff 6px 12px)'
              : displayValue,
          }}
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#142334]/74">
          {displayValue}
        </span>
      </button>

      {open && (
        <div
          className="fixed z-[9999] w-[288px] rounded-[10px] border-2 border-[#142334]/30 bg-white p-3 shadow-[0_18px_50px_rgba(20,35,52,0.24)] ring-1 ring-white/80"
          style={{ left: position.left, top: position.top }}
        >
          <div
            role="button"
            tabIndex={0}
            onPointerDown={(event) => {
              dragRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                left: position.left,
                top: position.top,
              };
            }}
            className="flex cursor-move items-center justify-between gap-3 rounded-[8px] bg-[#F8F6F4] px-3 py-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#142334] transition hover:bg-[#EFE6DF]"
              aria-label="Close color picker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <div
              className="relative h-[72px] overflow-hidden rounded-[8px] border border-[#D8C8BB]"
              style={{
                background: displayValue === 'transparent'
                  ? 'repeating-linear-gradient(45deg, #E4D8CB 0 6px, #fff 6px 12px)'
                  : displayValue,
              }}
            >
              <input
                type="color"
                value={normalized || '#FFFFFF'}
                onChange={(event) => commitColor(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={`Pick ${label} with color picker`}
              />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#142334]/72">
                Picker
              </span>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>{colorMode === 'hex' ? 'Hex code' : 'RGB'}</FieldLabel>
                <div className="grid grid-cols-2 rounded-full bg-[#F8F6F4] p-1">
                  {(['hex', 'rgb'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setColorMode(mode)}
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] transition ${
                        colorMode === mode ? 'bg-[#142334] text-white' : 'text-[#142334]/54 hover:text-[#142334]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              {colorMode === 'hex' ? (
                <input
                  value={hexInput}
                  placeholder="#142334"
                  onChange={(event) => commitColor(event.target.value)}
                  className="studio-input"
                />
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {(['r', 'g', 'b'] as const).map((channel) => (
                    <label key={channel} className="grid gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#142334]/44">{channel}</span>
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={rgbInput[channel]}
                        onChange={(event) => commitRgbChannel(channel, event.target.value)}
                        className="studio-input px-2"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-6 gap-2">
            {designBrandSwatches.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => commitColor(swatch)}
                title={swatch}
                className={`h-8 rounded-[6px] border transition hover:scale-105 ${
                  normalizeHexColor(displayValue) === swatch ? 'border-[#142334] ring-2 ring-[#C9AD98]' : 'border-[#D8C8BB]'
                }`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          {allowTransparent && (
            <button
              type="button"
              onClick={() => {
                setHexInput('');
                setRgbInput({ r: 255, g: 255, b: 255 });
                onChange(undefined);
              }}
              className="mt-3 w-full rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334]/68 transition hover:border-[#C9AD98] hover:bg-white hover:text-[#142334]"
            >
              Set transparent
            </button>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-[#142334]/52">
            Drag this panel by the header if it covers the canvas.
          </p>
        </div>
      )}
    </div>
  );
}

function PanelNotice({ tone, children }: { tone: 'info' | 'error'; children: string }) {
  return (
    <div
      className={`rounded-[8px] border px-4 py-3 text-[13px] font-medium leading-relaxed ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334]/72'
      }`}
    >
      {children}
    </div>
  );
}

function trapDesignWheel(event: React.WheelEvent<HTMLElement>) {
  const el = event.currentTarget;
  if (el.scrollHeight <= el.clientHeight) return;
  const atTop = el.scrollTop <= 0;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;
  if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
    event.preventDefault();
  }
  event.stopPropagation();
}

function getNormalizedRectangleRadii(layer: DesignShapeLayer, width: number, height: number) {
  const raw = getLayerCornerRadii(layer);
  const maxRadius = Math.max(0, Math.min(width, height) / 2);
  const radii = {
    topLeft: clamp(raw.topLeft, 0, maxRadius),
    topRight: clamp(raw.topRight, 0, maxRadius),
    bottomRight: clamp(raw.bottomRight, 0, maxRadius),
    bottomLeft: clamp(raw.bottomLeft, 0, maxRadius),
  };
  const scale = Math.min(
    1,
    radii.topLeft + radii.topRight > 0 ? width / (radii.topLeft + radii.topRight) : 1,
    radii.bottomLeft + radii.bottomRight > 0 ? width / (radii.bottomLeft + radii.bottomRight) : 1,
    radii.topLeft + radii.bottomLeft > 0 ? height / (radii.topLeft + radii.bottomLeft) : 1,
    radii.topRight + radii.bottomRight > 0 ? height / (radii.topRight + radii.bottomRight) : 1,
  );

  return {
    topLeft: radii.topLeft * scale,
    topRight: radii.topRight * scale,
    bottomRight: radii.bottomRight * scale,
    bottomLeft: radii.bottomLeft * scale,
  };
}

function getRoundedRectanglePath(layer: DesignShapeLayer, strokeWidth: number) {
  const halfStroke = strokeWidth / 2;
  const x = halfStroke;
  const y = halfStroke;
  const width = Math.max(0, layer.width - strokeWidth);
  const height = Math.max(0, layer.height - strokeWidth);
  const radii = getNormalizedRectangleRadii(layer, width, height);
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x + radii.topLeft} ${y}`,
    `H ${right - radii.topRight}`,
    radii.topRight ? `Q ${right} ${y} ${right} ${y + radii.topRight}` : `L ${right} ${y}`,
    `V ${bottom - radii.bottomRight}`,
    radii.bottomRight ? `Q ${right} ${bottom} ${right - radii.bottomRight} ${bottom}` : `L ${right} ${bottom}`,
    `H ${x + radii.bottomLeft}`,
    radii.bottomLeft ? `Q ${x} ${bottom} ${x} ${bottom - radii.bottomLeft}` : `L ${x} ${bottom}`,
    `V ${y + radii.topLeft}`,
    radii.topLeft ? `Q ${x} ${y} ${x + radii.topLeft} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ');
}

function ShapeLayerBody({ layer }: { layer: DesignShapeLayer }) {
  const strokeWidth = Math.max(layer.strokeWidth, 0);
  const halfStroke = strokeWidth / 2;
  const fill = layer.shape === 'line' ? 'transparent' : layer.fillColor;

  if (layer.shape === 'line') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${layer.width} ${layer.height}`} preserveAspectRatio="none" aria-hidden="true">
        <line
          x1={0}
          y1={layer.height / 2}
          x2={layer.width}
          y2={layer.height / 2}
          stroke={layer.strokeColor}
          strokeOpacity={1}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  if (layer.shape === 'rectangle') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${layer.width} ${layer.height}`} preserveAspectRatio="none" aria-hidden="true">
        <path
          d={getRoundedRectanglePath(layer, strokeWidth)}
          fill={fill}
          fillOpacity={1}
          stroke={layer.strokeColor}
          strokeOpacity={1}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  if (layer.shape === 'circle') {
    const radius = Math.max(0, Math.min(layer.width, layer.height) / 2 - halfStroke);
    return (
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${layer.width} ${layer.height}`} preserveAspectRatio="none" aria-hidden="true">
        <circle
          cx={layer.width / 2}
          cy={layer.height / 2}
          r={radius}
          fill={fill}
          fillOpacity={1}
          stroke={layer.strokeColor}
          strokeOpacity={1}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  const points = layer.shape === 'star'
    ? getStarPoints(layer.width, layer.height, strokeWidth)
    : getPolygonShapePoints(layer.shape, layer.width, layer.height, strokeWidth);

  return (
    <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${layer.width} ${layer.height}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon
        points={points}
        fill={fill}
        fillOpacity={1}
        stroke={layer.strokeColor}
        strokeOpacity={1}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

function BrandIconSvg({ kind, color }: { kind: DesignBrandIconKind; color: string }) {
  if (kind === 'chatOutline') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 150 135" fill="none" aria-hidden="true">
        <path
          d="M76 19C41 19 15 41 15 70C15 100 43 118 76 116C91 115 103 111 113 105L133 121L128 94C136 86 140 78 140 66C140 39 113 19 76 19Z"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === 'chatFilled') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 150 135" fill="none" aria-hidden="true">
        <path
          d="M26 20H123C137 20 146 30 146 45V83C146 98 136 107 121 107H74L37 127C32 130 28 128 28 122V107H25C12 107 4 98 4 84V44C4 29 13 20 26 20Z"
          fill={color}
        />
      </svg>
    );
  }

  if (kind === 'paperPlane') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 150 135" fill="none" aria-hidden="true">
        <path
          d="M16 20L137 65L16 116L53 70L16 20Z"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M53 70L137 65" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M53 70L61 115" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'fontAwesomePaperPlane') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 576 512" fill={color} aria-hidden="true">
        <path d="M290.5 287.7L491.4 86.9 359 456.3 290.5 287.7zM457.4 53L256.6 253.8 88 185.3 457.4 53zM38.1 216.8l205.8 83.6 83.6 205.8c5.3 13.1 18.1 21.7 32.3 21.7 14.7 0 27.8-9.2 32.8-23.1L570.6 8c3.5-9.8 1-20.6-6.3-28s-18.2-9.8-28-6.3L39.4 151.7c-13.9 5-23.1 18.1-23.1 32.8 0 14.2 8.6 27 21.7 32.3z" />
      </svg>
    );
  }

  if (kind === 'heartFilled') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 150 135" fill="none" aria-hidden="true">
        <path
          d="M75 124C72 124 69 122 66 119C28 85 11 67 11 42C11 21 27 7 48 7C60 7 70 14 75 24C81 14 91 7 103 7C124 7 140 21 140 42C140 67 122 86 84 119C81 122 78 124 75 124Z"
          fill={color}
        />
      </svg>
    );
  }

  if (kind === 'heartLoopArrow') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 260 140" fill="none" aria-hidden="true">
        <path
          d="M44 22C10 53 4 120 76 115C110 113 130 89 113 72C96 55 73 76 88 104C109 141 181 121 226 96"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M92 104C74 88 77 61 96 70C107 75 108 94 92 104C77 92 83 68 104 71C124 74 123 101 100 113"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M225 96L203 89L214 121Z" fill={color} />
      </svg>
    );
  }

  if (kind === 'dashedLoopArrow') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 190 160" fill="none" aria-hidden="true">
        <path
          d="M30 45C45 17 89 12 101 42C115 77 74 112 58 85C42 57 83 38 122 50C158 61 171 96 177 128"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="10 12"
        />
        <path d="M177 128L155 117L174 153Z" fill={color} />
      </svg>
    );
  }

  if (kind === 'curvedDownArrow') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 140 170" fill="none" aria-hidden="true">
        <path
          d="M110 18C45 27 18 97 62 145"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M62 145L42 122" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M62 145L84 130" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'loopUpArrow') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 260 140" fill="none" aria-hidden="true">
        <path
          d="M38 106C78 136 145 92 125 50C112 22 76 20 68 50C58 88 105 104 158 87C204 72 230 44 239 21"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M239 21L241 69" stroke={color} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M239 21L198 52" stroke={color} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'envelope') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 160 120" fill="none" aria-hidden="true">
        <rect x="18" y="28" width="124" height="76" rx="5" stroke={color} strokeWidth="8" strokeLinejoin="round" />
        <path d="M23 32L80 76L137 32" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 100L64 64" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path d="M136 100L96 64" stroke={color} strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'trashCan') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path d="M31 37C31 32 89 32 89 37" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M35 38L39 101C39.4 106.4 43.8 110 49.2 110H70.8C76.2 110 80.6 106.4 81 101L85 38" stroke={color} strokeWidth="7" strokeLinejoin="round" />
        <path d="M25 31C36 27 84 27 95 31" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M52 20H68" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M60 20V28" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M51 47V98" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M60 45V100" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <path d="M69 47V98" stroke={color} strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'materialDelete') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 -960 960 960" fill={color} aria-hidden="true">
        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
      </svg>
    );
  }

  if (kind === 'uploadTray') {
    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <rect x="26" y="55" width="68" height="44" rx="10" stroke={color} strokeWidth="8" strokeLinejoin="round" />
        <path d="M60 82V20" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <path d="M43 37L60 20L77 37" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M60 20V76" stroke={color} strokeWidth="8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="h-full w-full overflow-visible" viewBox="0 0 80 120" fill="none" aria-hidden="true">
      <circle cx="40" cy="24" r="8" fill={color} />
      <circle cx="40" cy="60" r="8" fill={color} />
      <circle cx="40" cy="96" r="8" fill={color} />
    </svg>
  );
}

function GroupedAssetLayerBody({
  asset,
  assetLibrary,
  depth,
}: {
  asset: DesignAsset;
  assetLibrary: Record<string, DesignAsset>;
  depth: number;
}) {
  const groupLayers = getSavedGroupLayers(asset);
  const bounds = getSavedGroupBounds(asset);
  const virtualDesign = {
    width: Math.max(1, bounds.width),
    height: Math.max(1, bounds.height),
  } as DesignDocument;

  return (
    <div className="relative h-full w-full overflow-visible" style={{ containerType: 'inline-size' }}>
      {groupLayers.map((childLayer, index) => {
        if (!childLayer.visible) return null;
        const childAsset = childLayer.type === 'asset' ? assetLibrary[childLayer.assetId] : null;
        return (
          <div
            key={`${childLayer.id}-${index}`}
            data-design-group-child-id={childLayer.id}
            className="absolute"
            style={{
              ...getLayerBoundsStyle(childLayer, virtualDesign),
              zIndex: index + 1,
            }}
          >
            <div
              className="h-full w-full"
              style={{
                filter: getLayerEffectFilter(childLayer, virtualDesign),
                ...getLayerContentTransformStyle(childLayer),
              }}
            >
              {childLayer.type === 'asset' && childAsset ? (
                <DesignAssetBody asset={childAsset} layer={childLayer} assetLibrary={assetLibrary} depth={depth + 1} />
              ) : childLayer.type === 'asset' ? (
                <div className="grid h-full w-full place-items-center rounded-[6px] border border-dashed border-[#C9AD98] bg-[#F8F6F4] px-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334]/48">
                  Missing asset
                </div>
              ) : childLayer.type === 'shape' ? (
                <ShapeLayerBody layer={childLayer} />
              ) : (
                <div
                  className="flex h-full w-full whitespace-pre-wrap break-words"
                  style={{
                    ...getTextLayerStyle(childLayer, virtualDesign),
                    alignItems: childLayer.textAlign === 'center' ? 'center' : 'flex-start',
                    justifyContent: childLayer.textAlign === 'center' ? 'center' : childLayer.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {childLayer.text}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DesignAssetBody({
  asset,
  layer,
  assetLibrary,
  depth = 0,
}: {
  asset: DesignAsset;
  layer: DesignAssetLayer;
  assetLibrary: Record<string, DesignAsset>;
  depth?: number;
}) {
  const assetColor = layer.color || asset.defaultColor || '#142334';

  if (asset.groupedLayers?.length && depth < 5) {
    return <GroupedAssetLayerBody asset={asset} assetLibrary={assetLibrary} depth={depth} />;
  }

  if (asset.recolorable && asset.iconKind) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <BrandIconSvg kind={asset.iconKind} color={assetColor} />
      </div>
    );
  }

  if (shouldUseTexturedSvgRecolor(asset)) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="absolute inset-0"
          data-design-svg-mask-src={asset.src}
          data-design-svg-mask-color={assetColor}
          data-design-svg-mask-fit={layer.fit}
          data-design-svg-mask-natural-width={asset.naturalWidth}
          data-design-svg-mask-natural-height={asset.naturalHeight}
          style={getSvgMaskRecolorStyle(asset, assetColor, layer.fit)}
        />
        <div
          className="absolute inset-0 opacity-70 mix-blend-multiply"
          style={getAssetImageBackgroundStyle(asset.src, layer.fit)}
        />
      </div>
    );
  }

  if (shouldUseSvgMaskRecolor(asset)) {
    return (
      <div
        className="relative h-full w-full"
        data-design-svg-mask-src={asset.src}
        data-design-svg-mask-color={assetColor}
        data-design-svg-mask-fit={layer.fit}
        data-design-svg-mask-natural-width={asset.naturalWidth}
        data-design-svg-mask-natural-height={asset.naturalHeight}
        style={getSvgMaskRecolorStyle(asset, assetColor, layer.fit)}
      />
    );
  }

  const assetSrc = canRecolorDesignAsset(asset) && isSvgDesignAsset(asset)
    ? getRecoloredSvgDataUrl(asset, assetColor)
    : asset.src;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        style={getAssetImageFrameStyle(
          assetSrc,
          layer.fit,
          layer.width,
          layer.height,
          asset.naturalWidth,
          asset.naturalHeight,
        )}
      />
    </div>
  );
}

function DesignAssetPreview({ asset, assetLibrary }: { asset: DesignAsset; assetLibrary: Record<string, DesignAsset> }) {
  const assetColor = asset.defaultColor || '#142334';

  if (asset.groupedLayers?.length) {
    return (
      <span className="block h-16 rounded-[6px] bg-white p-2">
        <span className="block h-full w-full">
          <GroupedAssetLayerBody asset={asset} assetLibrary={assetLibrary} depth={0} />
        </span>
      </span>
    );
  }

  if (asset.recolorable && asset.iconKind) {
    return (
      <span className="flex h-16 items-center justify-center rounded-[6px] bg-white p-3">
        <BrandIconSvg kind={asset.iconKind} color={assetColor} />
      </span>
    );
  }

  if (shouldUseTexturedSvgRecolor(asset)) {
    const previewSrc = getDesignAssetPreviewSrc(asset);
    return (
      <span className="block h-16 rounded-[6px] bg-[#E4D8CB] p-2">
        <span
          className="block h-full w-full rounded-[4px]"
          style={{
            backgroundColor: assetColor,
            backgroundImage: `url(${previewSrc})`,
            backgroundBlendMode: 'multiply',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
          }}
        />
      </span>
    );
  }

  if (shouldUseSvgMaskRecolor(asset)) {
    return (
      <span className="block h-16 rounded-[6px] bg-white p-3">
        <span className="block h-full w-full" style={getSvgMaskRecolorStyle(asset, assetColor, 'contain')} />
      </span>
    );
  }

  const previewSrc = getDesignAssetPreviewSrc(asset);
  const assetSrc = canRecolorDesignAsset(asset) && isSvgDesignAsset(asset)
    ? getRecoloredSvgDataUrl(asset, assetColor)
    : previewSrc;
  const isTapeOverlay = asset.category === 'Tape overlays';
  const isPaperResource = asset.category === 'Paper resources';

  return (
    <span
      className="block h-16 rounded-[6px]"
      style={{
        backgroundColor: isTapeOverlay || isPaperResource ? '#E4D8CB' : '#FFFFFF',
        backgroundImage: isTapeOverlay
          ? [
              `url(${assetSrc})`,
              'linear-gradient(45deg, rgba(255,255,255,0.38) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.38) 75%)',
              'linear-gradient(45deg, rgba(255,255,255,0.38) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.38) 75%)',
            ].join(', ')
          : `url(${assetSrc})`,
        backgroundPosition: isTapeOverlay ? 'center, 0 0, 6px 6px' : 'center',
        backgroundRepeat: isTapeOverlay ? 'no-repeat, repeat, repeat' : 'no-repeat',
        backgroundSize: isTapeOverlay ? 'contain, 12px 12px, 12px 12px' : 'contain',
      }}
    />
  );
}

function ShapeKindControl({
  value,
  onChange,
}: {
  value: DesignShapeKind;
  onChange: (value: DesignShapeKind) => void;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel>Shape</FieldLabel>
      <div className="grid grid-cols-4 gap-1 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-1">
        {designShapeOptions.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-label={`Use ${option.label.toLowerCase()} shape`}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`grid min-h-11 place-items-center rounded-[6px] transition ${
                selected
                  ? 'bg-[#142334] text-white shadow-sm'
                  : 'bg-white text-[#142334]/62 hover:bg-[#EFE6DF] hover:text-[#142334]'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineTextLayerEditor({
  layer,
  design,
  onCommit,
  onCancel,
}: {
  layer: DesignTextLayer;
  design: DesignDocument;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(layer.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const skipCommitRef = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function commitText() {
    if (skipCommitRef.current) return;
    if (draft !== layer.text) onCommit(draft);
    onCancel();
  }

  function cancelEdit() {
    skipCommitRef.current = true;
    onCancel();
  }

  return (
    <textarea
      ref={textareaRef}
      data-design-inline-editor="true"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitText}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelEdit();
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          commitText();
        }
      }}
      className="h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words rounded-[4px]"
      style={{
        ...getTextLayerStyle(layer, design),
        outline: 'none',
        boxShadow: '0 0 0 2px #0284FF, 0 0 0 6px rgba(2,132,255,0.14)',
        caretColor: '#0284FF',
      }}
    />
  );
}

function RichTextLayerContent({ layer }: { layer: DesignTextLayer }) {
  return (
    <>
      {getTextLayerSegments(layer).map((segment, index) => (
        <span key={`${index}-${segment.text}`} style={getTextSegmentStyle(segment.style)}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

function DesignLayerView({
  layer,
  design,
  assetLibrary,
  stackIndex,
  selected,
  showControls,
  onSelect,
  onDragStart,
  onResizeStart,
  onRotateStart,
  onDuplicateLayer,
  onDeleteLayer,
  onToggleLock,
  onPatchLayer,
  onStartTextEdit,
  onStopTextEdit,
  isTextEditing,
}: {
  layer: DesignLayer;
  design: DesignDocument;
  assetLibrary: Record<string, DesignAsset>;
  stackIndex: number;
  selected: boolean;
  showControls: boolean;
  onSelect: (additive?: boolean) => void;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>, layer: DesignLayer) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>, layer: DesignLayer, handle: ResizeHandle) => void;
  onRotateStart: (event: React.PointerEvent<HTMLButtonElement>, layer: DesignLayer) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleLock: (id: string) => void;
  onPatchLayer: (id: string, patch: Partial<DesignLayer>, options?: DesignPatchOptions) => void;
  onStartTextEdit: (id: string) => void;
  onStopTextEdit: () => void;
  isTextEditing: boolean;
}) {
  const textMeasureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selected || layer.type !== 'text' || layer.locked || isTextEditing) return;
    const measureElement = textMeasureRef.current;
    if (!measureElement) return;
    const textMeasureElement: HTMLDivElement = measureElement;
    let frameId: number | null = null;

    function fitTextLayerHeight() {
      const canvasElement = textMeasureElement.closest('[data-design-export-canvas="true"]') as HTMLElement | null;
      const canvasRect = canvasElement?.getBoundingClientRect();
      const textRect = textMeasureElement.getBoundingClientRect();
      if (!canvasRect?.height || !textRect.height) return;

      const measuredHeight = (textRect.height / canvasRect.height) * design.height;
      const nextHeight = clamp(Math.ceil(measuredHeight), 24, design.height * 1.5);
      if (Math.abs(nextHeight - layer.height) > TEXT_LAYER_AUTO_FIT_TOLERANCE) {
        onPatchLayer(layer.id, { height: nextHeight } as Partial<DesignLayer>, { recordHistory: false });
      }
    }

    function scheduleFit() {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(fitTextLayerHeight);
    }

    scheduleFit();
    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(textMeasureElement);
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [design.height, isTextEditing, layer, onPatchLayer, selected]);

  if (!layer.visible) return null;
  const isCanvasBackground = layer.locked && layer.x === 0 && layer.y === 0 && layer.width >= design.width && layer.height >= design.height;
  const shouldPreserveStackWhenSelected = isCanvasCoveringLayer(layer, design.width, design.height);
  const baseLayerZIndex = isCanvasBackground ? 2 : 20 + stackIndex;
  const layerZIndex = selected && !shouldPreserveStackWhenSelected ? 90 : baseLayerZIndex;
  const layerAsset = layer.type === 'asset' ? assetLibrary[layer.assetId] : null;
  const assetBorderRadius = layer.type === 'asset' ? getLayerCornerRadiusCss(layer, design) : undefined;
  const canSelectTextContent = selected && layer.type === 'text' && !layer.locked && !isTextEditing;

  return (
    <div
      data-design-layer-id={layer.id}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => onDragStart(event, layer)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event.shiftKey || event.metaKey || event.ctrlKey);
      }}
      onDoubleClick={(event) => {
        if (layer.type !== 'text' || layer.locked) return;
        event.stopPropagation();
        onSelect(false);
        onStartTextEdit(layer.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(event.shiftKey || event.metaKey || event.ctrlKey);
      }}
      className={`absolute ${canSelectTextContent ? 'select-text' : 'select-none'} ${isTextEditing || canSelectTextContent ? 'cursor-text' : layer.locked ? 'cursor-default' : 'cursor-move'} ${
        selected ? 'ring-2 ring-[#0284FF] ring-offset-2 ring-offset-transparent' : ''
      }`}
      style={{
        ...getLayerBoundsStyle(layer, design),
        pointerEvents: layer.locked && !selected ? 'none' : undefined,
        zIndex: layerZIndex,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          filter: getLayerEffectFilter(layer, design),
          ...(layer.type === 'asset'
            ? {
                borderRadius: assetBorderRadius,
                overflow: assetBorderRadius ? 'hidden' : undefined,
              }
            : {}),
          ...getLayerContentTransformStyle(layer),
        }}
      >
        {layer.type === 'asset' && layerAsset ? (
          <DesignAssetBody asset={layerAsset} layer={layer} assetLibrary={assetLibrary} />
        ) : layer.type === 'asset' ? (
          <div className="grid h-full w-full place-items-center rounded-[6px] border border-dashed border-[#C9AD98] bg-[#F8F6F4] px-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334]/48">
            Missing asset
          </div>
        ) : layer.type === 'shape' ? (
          <div className="h-full w-full">
            <ShapeLayerBody layer={layer} />
          </div>
        ) : isTextEditing ? (
          <InlineTextLayerEditor
            layer={layer}
            design={design}
            onCommit={(text) => onPatchLayer(layer.id, { text, richTextRuns: clampInlineTextRuns(layer.richTextRuns, text.length) } as Partial<DesignLayer>)}
            onCancel={onStopTextEdit}
          />
        ) : (
          <>
            <div
              ref={textMeasureRef}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 h-auto w-full whitespace-pre-wrap break-words"
              style={getTextLayerStyle(layer, design)}
            >
              <RichTextLayerContent layer={layer} />
            </div>
            <div
              data-design-text-content="true"
              className="flex h-full w-full whitespace-pre-wrap break-words"
              style={{
                ...getTextLayerStyle(layer, design),
                alignItems: layer.textAlign === 'center' ? 'center' : 'flex-start',
                justifyContent: layer.textAlign === 'center' ? 'center' : layer.textAlign === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <RichTextLayerContent layer={layer} />
            </div>
          </>
        )}
      </div>
      {showControls && !isTextEditing && (
        <div
          data-design-control="true"
          className="absolute -right-2 -top-11 z-[130] flex items-center gap-1 rounded-full border border-[#D8C8BB] bg-white/95 p-1 shadow-[0_10px_28px_rgba(20,35,52,0.18)]"
        >
          <button
            type="button"
            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock(layer.id);
            }}
            className="grid h-7 w-7 place-items-center rounded-full text-[#142334] transition hover:bg-[#F8F6F4]"
          >
            {layer.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </button>
          {!layer.locked && (
            <>
              {layer.type === 'text' && (
                <button
                  type="button"
                  title="Edit text"
                  aria-label="Edit text"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartTextEdit(layer.id);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-[#142334] transition hover:bg-[#F8F6F4]"
                >
                  <Type className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                title="Duplicate layer"
                aria-label="Duplicate layer"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicateLayer(layer.id);
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-[#142334] transition hover:bg-[#F8F6F4]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Delete layer"
                aria-label="Delete layer"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteLayer(layer.id);
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {showControls && !layer.locked && (
        <>
          {(layer.width < 72 || layer.height < 48 ? (['se'] as const) : (['nw', 'ne', 'sw', 'se'] as const)).map((handle) => {
            const compactHandle = layer.width < 72 || layer.height < 48;
            const verticalClass = compactHandle ? '-bottom-1.5' : handle.startsWith('n') ? '-top-1.5' : '-bottom-1.5';
            const horizontalClass = compactHandle ? '-right-1.5' : handle.endsWith('w') ? '-left-1.5' : '-right-1.5';
            const cursorClass = handle === 'nw' || handle === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize';
            return (
              <button
                key={handle}
                type="button"
                aria-label={`Resize ${handle}`}
                data-design-control="true"
                onPointerDown={(event) => onResizeStart(event, layer, handle)}
                className={`absolute z-[120] ${compactHandle ? 'h-3 w-3' : 'h-2.5 w-2.5'} rounded-full border border-white bg-[#0284FF] shadow-sm transition hover:scale-125 ${verticalClass} ${horizontalClass} ${cursorClass}`}
              />
            );
          })}
          <button
            type="button"
            aria-label="Rotate layer"
            title="Rotate layer"
            data-design-control="true"
            onPointerDown={(event) => onRotateStart(event, layer)}
            className="absolute -bottom-10 left-1/2 z-[125] grid h-8 w-8 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-white bg-[#142334] text-white shadow-[0_10px_24px_rgba(20,35,52,0.24)] active:cursor-grabbing"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function BackgroundEffectsLayer({ design, effects }: { design: DesignDocument; effects: DesignBackgroundEffects }) {
  const overlays: Array<{ key: string; style: CSSProperties }> = [];

  if (effects.grain) {
    overlays.push({
      key: 'grain',
      style: {
        backgroundImage: [
          'radial-gradient(circle, rgba(20,35,52,0.16) 0 0.7px, transparent 0.8px)',
          'radial-gradient(circle, rgba(185,133,103,0.13) 0 0.6px, transparent 0.7px)',
        ].join(', '),
        backgroundPosition: '0 0, 4px 5px',
        backgroundSize: `${sizeToCqw(10, design.width)} ${sizeToCqw(10, design.width)}, ${sizeToCqw(13, design.width)} ${sizeToCqw(13, design.width)}`,
        mixBlendMode: 'multiply',
        opacity: 0.28,
      },
    });
  }

  if (effects.noise) {
    overlays.push({
      key: 'noise',
      style: {
        backgroundImage: [
          'repeating-linear-gradient(0deg, rgba(20,35,52,0.04) 0 1px, transparent 1px 2px)',
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)',
        ].join(', '),
        backgroundSize: `${sizeToCqw(7, design.width)} ${sizeToCqw(7, design.width)}`,
        mixBlendMode: 'soft-light',
        opacity: 0.32,
      },
    });
  }

  if (effects.notebookLines) {
    overlays.push({
      key: 'notebook-lines',
      style: {
        backgroundImage: [
          `repeating-linear-gradient(to bottom, transparent 0 ${sizeToCqw(46, design.width)}, rgba(72,102,135,0.2) ${sizeToCqw(46, design.width)} ${sizeToCqw(48, design.width)})`,
          'linear-gradient(to right, transparent 0 12%, rgba(185,92,92,0.24) 12% calc(12% + 1px), transparent calc(12% + 1px))',
        ].join(', '),
        opacity: 0.62,
      },
    });
  }

  if (effects.ruledLines) {
    overlays.push({
      key: 'ruled-lines',
      style: {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${sizeToCqw(58, design.width)}, rgba(20,35,52,0.14) ${sizeToCqw(58, design.width)} ${sizeToCqw(60, design.width)})`,
        opacity: 0.5,
      },
    });
  }

  if (effects.gridLines) {
    const gridSize = sizeToCqw(effects.gridSize, design.width);
    overlays.push({
      key: 'grid-lines',
      style: {
        backgroundImage: [
          'linear-gradient(to right, rgba(20,35,52,0.13) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(20,35,52,0.13) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: `${gridSize} ${gridSize}`,
        opacity: 0.52,
      },
    });
  }

  if (!overlays.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" data-design-background-effects="true" aria-hidden="true">
      {overlays.map((overlay) => (
        <div key={overlay.key} className="absolute inset-0" style={overlay.style} />
      ))}
    </div>
  );
}

function DesignCanvas({
  design,
  page,
  assetLibrary,
  selectedLayerId,
  selectedLayerIds,
  guides,
  zoom,
  canvasRef,
  onSelectLayer,
  onPatchLayer,
  onPatchLayers,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleLayerLock,
}: {
  design: DesignDocument;
  page: DesignPage;
  assetLibrary: Record<string, DesignAsset>;
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  guides: DesignCanvasGuides;
  zoom: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelectLayer: (id: string | null, additive?: boolean) => void;
  onPatchLayer: (id: string, patch: Partial<DesignLayer>, options?: DesignPatchOptions) => void;
  onPatchLayers: (patches: Array<{ id: string; patch: Partial<DesignLayer> }>, options?: DesignPatchOptions) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
}) {
  const [snapGuide, setSnapGuide] = useState<DesignSnapGuide | null>(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const backgroundEffects = getPageBackgroundEffects(page.backgroundEffects);
  const selectedLayerIdSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds]);
  const selectedLayers = page.layers.filter((layer) => selectedLayerIdSet.has(layer.id));
  const multiSelectionBounds = selectedLayers.length > 1 ? getLayerSelectionBounds(selectedLayers) : null;
  const activeEditingTextLayerId = page.layers.some((layer) => layer.id === editingTextLayerId && layer.type === 'text')
    ? editingTextLayerId
    : null;
  const suppressClickSelectionRef = useRef(false);
  const dragRef = useRef<{
    mode: 'move' | 'resize' | 'rotate';
    id: string;
    layerSnapshots?: Array<{ id: string; x: number; y: number; width: number; height: number }>;
    selectionBounds?: DesignSelectionBounds;
    handle?: ResizeHandle;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    lockAspectRatio?: boolean;
    centerClientX?: number;
    centerClientY?: number;
    startAngle?: number;
    startRotation?: number;
  } | null>(null);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      const element = canvasRef.current;
      if (!drag || !element) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const deltaX = ((event.clientX - drag.startClientX) / rect.width) * design.width;
      const deltaY = ((event.clientY - drag.startClientY) / rect.height) * design.height;
      if (drag.mode === 'rotate') {
        setSnapGuide(null);
        const centerClientX = drag.centerClientX ?? drag.startClientX;
        const centerClientY = drag.centerClientY ?? drag.startClientY;
        const nextAngle = (Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180) / Math.PI;
        const startAngle = drag.startAngle ?? nextAngle;
        onPatchLayer(drag.id, {
          rotation: normalizeRotation((drag.startRotation ?? 0) + nextAngle - startAngle),
        } as Partial<DesignLayer>);
        return;
      }

      if (drag.mode === 'move') {
        if (drag.layerSnapshots && drag.layerSnapshots.length > 1 && drag.selectionBounds) {
          const initialX = clamp(drag.selectionBounds.x + deltaX, -drag.selectionBounds.width + 24, design.width - 24);
          const initialY = clamp(drag.selectionBounds.y + deltaY, -drag.selectionBounds.height + 24, design.height - 24);
          const snappedX = snapLayerAxis(initialX, drag.selectionBounds.width, design.width, (SNAP_GUIDE_PIXEL_THRESHOLD / rect.width) * design.width);
          const snappedY = snapLayerAxis(initialY, drag.selectionBounds.height, design.height, (SNAP_GUIDE_PIXEL_THRESHOLD / rect.height) * design.height);
          const nextDeltaX = snappedX.position - drag.selectionBounds.x;
          const nextDeltaY = snappedY.position - drag.selectionBounds.y;
          setSnapGuide(snappedX.guide === undefined && snappedY.guide === undefined ? null : { x: snappedX.guide, y: snappedY.guide });
          onPatchLayers(
            drag.layerSnapshots.map((snapshot) => ({
              id: snapshot.id,
              patch: {
                x: snapshot.x + nextDeltaX,
                y: snapshot.y + nextDeltaY,
              } as Partial<DesignLayer>,
            })),
          );
          return;
        }

        const initialX = clamp(drag.startX + deltaX, -drag.width + 24, design.width - 24);
        const initialY = clamp(drag.startY + deltaY, -drag.height + 24, design.height - 24);
        const snappedX = snapLayerAxis(initialX, drag.width, design.width, (SNAP_GUIDE_PIXEL_THRESHOLD / rect.width) * design.width);
        const snappedY = snapLayerAxis(initialY, drag.height, design.height, (SNAP_GUIDE_PIXEL_THRESHOLD / rect.height) * design.height);
        setSnapGuide(snappedX.guide === undefined && snappedY.guide === undefined ? null : { x: snappedX.guide, y: snappedY.guide });
        onPatchLayer(drag.id, {
          x: clamp(snappedX.position, -drag.width + 24, design.width - 24),
          y: clamp(snappedY.position, -drag.height + 24, design.height - 24),
        } as Partial<DesignLayer>);
        return;
      }

      setSnapGuide(null);
      const handle = drag.handle || 'se';
      const nextWidth = handle.endsWith('w') ? drag.width - deltaX : drag.width + deltaX;
      const nextHeight = handle.startsWith('n') ? drag.height - deltaY : drag.height + deltaY;
      const width = clamp(nextWidth, 24, design.width * 1.5);
      const height = clamp(nextHeight, 24, design.height * 1.5);
      if (drag.lockAspectRatio) {
        const size = clamp(Math.max(width, height), 24, Math.min(design.width, design.height) * 1.5);
        onPatchLayer(drag.id, {
          width: size,
          height: size,
          x: handle.endsWith('w') ? drag.startX + (drag.width - size) : drag.startX,
          y: handle.startsWith('n') ? drag.startY + (drag.height - size) : drag.startY,
        } as Partial<DesignLayer>);
        return;
      }

      onPatchLayer(drag.id, {
        width,
        height,
        x: handle.endsWith('w') ? drag.startX + (drag.width - width) : drag.startX,
        y: handle.startsWith('n') ? drag.startY + (drag.height - height) : drag.startY,
      } as Partial<DesignLayer>);
    }

    function onUp() {
      dragRef.current = null;
      setSnapGuide(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [canvasRef, design.height, design.width, onPatchLayer, onPatchLayers]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>, layer: DesignLayer) {
    event.stopPropagation();
    if (activeEditingTextLayerId === layer.id) return;
    const target = event.target as HTMLElement | null;
    if (
      layer.type === 'text' &&
      selectedLayerIdSet.has(layer.id) &&
      target?.closest('[data-design-text-content="true"]')
    ) {
      suppressClickSelectionRef.current = true;
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      suppressClickSelectionRef.current = true;
      onSelectLayer(layer.id, true);
      return;
    }

    if (layer.locked) return;
    const isLayerInSelection = selectedLayerIdSet.has(layer.id);
    const movableLayers = isLayerInSelection && selectedLayers.length > 1
      ? selectedLayers.filter((item) => !item.locked)
      : [layer];
    const selectionBounds = movableLayers.length > 1 ? getLayerSelectionBounds(movableLayers) : null;

    if (isLayerInSelection && movableLayers.length > 1) {
      suppressClickSelectionRef.current = true;
    } else {
      onSelectLayer(layer.id);
    }

    setSnapGuide(null);
    dragRef.current = {
      mode: 'move',
      id: layer.id,
      layerSnapshots: movableLayers.map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      })),
      selectionBounds: selectionBounds || undefined,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      width: layer.width,
      height: layer.height,
      lockAspectRatio: layer.type === 'shape' && layer.shape === 'circle',
    };
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>, layer: DesignLayer, handle: ResizeHandle) {
    event.stopPropagation();
    event.preventDefault();
    onSelectLayer(layer.id);
    if (layer.locked) return;
    setSnapGuide(null);
    dragRef.current = {
      mode: 'resize',
      id: layer.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      width: layer.width,
      height: layer.height,
    };
  }

  function startRotate(event: React.PointerEvent<HTMLButtonElement>, layer: DesignLayer) {
    event.stopPropagation();
    event.preventDefault();
    onSelectLayer(layer.id);
    if (layer.locked) return;
    setSnapGuide(null);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerClientX = rect.left + ((layer.x + layer.width / 2) / design.width) * rect.width;
    const centerClientY = rect.top + ((layer.y + layer.height / 2) / design.height) * rect.height;
    dragRef.current = {
      mode: 'rotate',
      id: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      width: layer.width,
      height: layer.height,
      centerClientX,
      centerClientY,
      startAngle: (Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180) / Math.PI,
      startRotation: layer.rotation,
    };
  }

  return (
    <div
      className="w-full overflow-auto rounded-[10px] bg-[#F8F6F4]/70 p-1.5"
      data-design-canvas-viewport="true"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        setEditingTextLayerId(null);
        onSelectLayer(null);
      }}
    >
      <div
        className="mx-auto"
        style={{
          width: `${zoom}%`,
          maxWidth: zoom <= 100 ? `${CANVAS_FIT_WIDTH}px` : `${Math.round((CANVAS_FIT_WIDTH * zoom) / 100)}px`,
          minWidth: zoom > 100 ? `${Math.round((CANVAS_FIT_WIDTH * zoom) / 100)}px` : undefined,
        }}
      >
        <div
          ref={canvasRef}
          data-design-export-canvas="true"
          onClick={() => {
            setEditingTextLayerId(null);
            onSelectLayer(null);
          }}
          className="relative w-full overflow-hidden rounded-[8px] border border-[#D8C8BB] shadow-[0_20px_60px_rgba(20,35,52,0.15)]"
          style={{
            aspectRatio: `${design.width} / ${design.height}`,
            backgroundColor: page.background,
            containerType: 'inline-size',
          }}
        >
        <BackgroundEffectsLayer design={design} effects={backgroundEffects} />
        {page.layers.map((layer, index) => (
          <DesignLayerView
            key={layer.id}
            layer={layer}
            design={design}
            assetLibrary={assetLibrary}
            stackIndex={index}
            selected={selectedLayerIdSet.has(layer.id)}
            showControls={selectedLayerIds.length === 1 && selectedLayerId === layer.id}
            onSelect={(additive) => {
              if (suppressClickSelectionRef.current) {
                suppressClickSelectionRef.current = false;
                return;
              }
              onSelectLayer(layer.id, additive);
            }}
            onDragStart={startDrag}
            onResizeStart={startResize}
            onRotateStart={startRotate}
            onDuplicateLayer={onDuplicateLayer}
            onDeleteLayer={onDeleteLayer}
            onToggleLock={onToggleLayerLock}
            onPatchLayer={onPatchLayer}
            onStartTextEdit={(id) => {
              setEditingTextLayerId(id);
              onSelectLayer(id);
            }}
            onStopTextEdit={() => setEditingTextLayerId(null)}
            isTextEditing={activeEditingTextLayerId === layer.id}
          />
        ))}
        {guides.grid && (
          <div
            data-design-guide="true"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[105]"
            style={{
              backgroundImage: [
                'linear-gradient(to right, rgba(20,35,52,0.09) 1px, transparent 1px)',
                'linear-gradient(to bottom, rgba(20,35,52,0.09) 1px, transparent 1px)',
                'linear-gradient(to right, rgba(185,133,103,0.2) 1px, transparent 1px)',
                'linear-gradient(to bottom, rgba(185,133,103,0.2) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '6.25% 6.25%, 6.25% 6.25%, 25% 25%, 25% 25%',
            }}
          />
        )}
        {guides.bleed && (
          <div
            data-design-guide="true"
            aria-hidden="true"
            className="pointer-events-none absolute z-[106] border border-[#B98567]/80"
            style={{
              bottom: `${(DEFAULT_BLEED_MARGIN / design.height) * 100}%`,
              left: `${(DEFAULT_BLEED_MARGIN / design.width) * 100}%`,
              right: `${(DEFAULT_BLEED_MARGIN / design.width) * 100}%`,
              top: `${(DEFAULT_BLEED_MARGIN / design.height) * 100}%`,
              boxShadow: '0 0 0 9999px rgba(185,133,103,0.05)',
            }}
          >
            <span className="absolute left-2 top-2 rounded-full bg-[#B98567] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Bleed
            </span>
          </div>
        )}
        {guides.safeArea && (
          <div
            data-design-guide="true"
            aria-hidden="true"
            className="pointer-events-none absolute z-[107] border-2 border-dashed border-[#142334]/60"
            style={{
              bottom: `${(DEFAULT_SAFE_AREA_MARGIN / design.height) * 100}%`,
              left: `${(DEFAULT_SAFE_AREA_MARGIN / design.width) * 100}%`,
              right: `${(DEFAULT_SAFE_AREA_MARGIN / design.width) * 100}%`,
              top: `${(DEFAULT_SAFE_AREA_MARGIN / design.height) * 100}%`,
            }}
          />
        )}
        {snapGuide?.x !== undefined && (
          <div
            data-design-guide="true"
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-[118] border-l-2 border-[#0284FF]"
            style={{ left: `${(snapGuide.x / design.width) * 100}%` }}
          />
        )}
        {snapGuide?.y !== undefined && (
          <div
            data-design-guide="true"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-[118] border-t-2 border-[#0284FF]"
            style={{ top: `${(snapGuide.y / design.height) * 100}%` }}
          />
        )}
        {multiSelectionBounds && (
          <div
            data-design-control="true"
            className="pointer-events-none absolute z-[115] rounded-[6px] border-2 border-[#0284FF] bg-[#0284FF]/5 ring-4 ring-[#0284FF]/10"
            style={{
              left: `${(multiSelectionBounds.x / design.width) * 100}%`,
              top: `${(multiSelectionBounds.y / design.height) * 100}%`,
              width: `${(multiSelectionBounds.width / design.width) * 100}%`,
              height: `${(multiSelectionBounds.height / design.height) * 100}%`,
            }}
          >
            <span className="absolute -top-8 left-0 rounded-full bg-[#0284FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
              {selectedLayers.length} selected
            </span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default function DesignStudioPanel({
  carouselImports = [],
  textImports = [],
  vaultImports = [],
  importRequest = null,
  onImportRequestHandled,
}: {
  carouselImports?: DesignStudioCarouselImport[];
  textImports?: DesignStudioTextImport[];
  vaultImports?: DesignStudioVaultImport[];
  importRequest?: DesignStudioImportRequest | null;
  onImportRequestHandled?: () => void;
}) {
  const [design, setDesign] = useState<DesignDocument>(() => createDefaultManifestoDesign());
  const [designHistory, setDesignHistory] = useState<DesignHistory>({ past: [], future: [] });
  const [activePageId, setActivePageId] = useState('page-1');
  const [selectedLayerId, setSelectedLayerIdState] = useState<string | null>('main-headline');
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(['main-headline']);
  const [sidebarTab, setSidebarTab] = useState<DesignSidebarTab>('layers');
  const [inspectorTab, setInspectorTab] = useState<DesignInspectorTab>('content');
  const [saveMessage, setSaveMessage] = useState('');
  const [assetLibraryMessage, setAssetLibraryMessage] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [selectedVaultImportId, setSelectedVaultImportId] = useState('');
  const [vaultMessage, setVaultMessage] = useState('');
  const [isVaultPanelCollapsed, setIsVaultPanelCollapsed] = useState(false);
  const [vaultPanelPreferenceLoaded, setVaultPanelPreferenceLoaded] = useState(false);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [pageDropTargetId, setPageDropTargetId] = useState<string | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [layerDropTargetId, setLayerDropTargetId] = useState<string | null>(null);
  const [textSelectionRange, setTextSelectionRange] = useState<DesignTextSelectionRange | null>(null);
  const [textInsertOpen, setTextInsertOpen] = useState(false);
  const [brandAssets, setBrandAssets] = useState<DesignAsset[]>([]);
  const [brandAssetsLoaded, setBrandAssetsLoaded] = useState(false);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
  const [deletedAssetsLoaded, setDeletedAssetsLoaded] = useState(false);
  const [exportState, setExportState] = useState<ExportState | null>(null);
  const [designTemplates, setDesignTemplates] = useState<DesignTemplateRecord[]>([]);
  const [designTemplatesLoaded, setDesignTemplatesLoaded] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [canvasGuides, setCanvasGuides] = useState<DesignCanvasGuides>({
    grid: true,
    safeArea: true,
    bleed: false,
  });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const brandAssetInputRef = useRef<HTMLInputElement | null>(null);
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const textLayerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const designRef = useRef(design);
  const designHistoryRef = useRef(designHistory);
  const activePageIdRef = useRef(activePageId);
  const selectedLayerIdRef = useRef(selectedLayerId);
  const selectedLayerIdsRef = useRef(selectedLayerIds);
  const handledImportRequestRef = useRef<number | null>(null);
  const layerClipboardRef = useRef<DesignLayerClipboard | null>(null);
  const activePage = getActivePage(design, activePageId);
  const selectedLayers = useMemo(
    () => selectedLayerIds
      .map((id) => activePage.layers.find((layer) => layer.id === id))
      .filter((layer): layer is DesignLayer => Boolean(layer)),
    [activePage.layers, selectedLayerIds],
  );
  const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const selectedTextFormatRange = selectedLayer?.type === 'text' && textSelectionRange?.layerId === selectedLayer.id && textSelectionRange.end > textSelectionRange.start
    ? {
        start: clamp(textSelectionRange.start, 0, selectedLayer.text.length),
        end: clamp(textSelectionRange.end, 0, selectedLayer.text.length),
      }
    : null;
  const hasMultiSelection = selectedLayers.length > 1;
  const selectedGroupableLayers = selectedLayers.filter((layer) => layer.visible && !layer.locked);
  const visibleLayerCount = activePage.layers.filter((layer) => layer.visible).length;
  const activeAspectRatioLabel = getActiveAspectRatioLabel(design);
  const selectedShadowOffsetX = selectedLayer?.shadowOffsetX ?? 10;
  const selectedShadowOffsetY = selectedLayer?.shadowOffsetY ?? 14;
  const selectedShadowDirection = getShadowDirection(selectedShadowOffsetX, selectedShadowOffsetY);
  const selectedShadowOffset = getShadowOffsetDistance(selectedShadowOffsetX, selectedShadowOffsetY);
  const selectedShadowTransparency = Math.round((selectedLayer?.shadowOpacity ?? 0.28) * 100);
  const selectedOutlineWidth = selectedLayer?.outlineWidth ?? 4;
  const selectedBlurAmount = selectedLayer?.blurAmount ?? 6;
  const activeBackgroundEffects = getPageBackgroundEffects(activePage.backgroundEffects);
  const activePageHasPaperTexture = activePage.layers.some((layer) => layer.type === 'asset' && layer.assetId === 'paper_texture');
  const canUndo = designHistory.past.length > 0;
  const canRedo = designHistory.future.length > 0;
  const activeTemplateRecord = design.templateSourceId
    ? designTemplates.find((template) => template.id === design.templateSourceId) || null
    : null;
  const carouselImportCount = carouselImports.length;
  const textImportCount = textImports.length;
  const vaultImportCount = vaultImports.length;
  const normalizedVaultSearchQuery = vaultSearchQuery.trim().toLowerCase();
  const filteredVaultImports = useMemo(() => {
    if (!normalizedVaultSearchQuery) return vaultImports.slice(0, 8);
    return vaultImports
      .filter((item) =>
        [
          item.label,
          item.title,
          item.sourceLabel,
          item.statusLabel,
          item.platformLabel,
          item.text,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedVaultSearchQuery),
      )
      .slice(0, 8);
  }, [normalizedVaultSearchQuery, vaultImports]);
  const vaultDropdownOptions = useMemo(() => (
    filteredVaultImports.length
      ? filteredVaultImports.map((source) => ({ value: source.id, label: getCompactVaultHeading(source.label) }))
      : [{ value: '', label: vaultImportCount === 0 ? 'No saved Vault copy yet' : 'No matching Vault headings' }]
  ), [filteredVaultImports, vaultImportCount]);
  const selectedVaultImport =
    filteredVaultImports.find((source) => source.id === selectedVaultImportId) ||
    filteredVaultImports[0] ||
    vaultImports.find((source) => source.id === selectedVaultImportId) ||
    null;

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  useEffect(() => {
    designHistoryRef.current = designHistory;
  }, [designHistory]);

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  useEffect(() => {
    selectedLayerIdRef.current = selectedLayerId;
  }, [selectedLayerId]);

  useEffect(() => {
    selectedLayerIdsRef.current = selectedLayerIds;
  }, [selectedLayerIds]);

  useEffect(() => {
    if (selectedLayer?.type !== 'text') return;
    function onSelectionChange() {
      if (selectedLayer?.type !== 'text') return;
      const range = getCanvasTextSelectionRange(selectedLayer.id, selectedLayer.text.length);
      if (!range || range.end <= range.start) return;
      setTextSelectionRange({ layerId: selectedLayer.id, ...range });
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [selectedLayer]);

  useEffect(() => {
    const raw = window.localStorage.getItem(DESIGN_STORAGE_KEY);
    if (!raw) return;
    let timeoutId: number | null = null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isDesignDocument(parsed)) return;
      timeoutId = window.setTimeout(() => {
        const emptyHistory: DesignHistory = { past: [], future: [] };
        designRef.current = parsed;
        designHistoryRef.current = emptyHistory;
        activePageIdRef.current = parsed.pages[0]?.id || 'page-1';
        setDesign(parsed);
        setDesignHistory(emptyHistory);
        setActivePageId(activePageIdRef.current);
        selectSingleLayer(parsed.pages[0]?.layers.find((layer) => !layer.locked)?.id || null);
      }, 0);
    } catch {
      window.localStorage.removeItem(DESIGN_STORAGE_KEY);
    }
    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const raw = window.localStorage.getItem(BRAND_ASSETS_STORAGE_KEY);
      if (!raw) {
        setBrandAssetsLoaded(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        setBrandAssets(Array.isArray(parsed) ? parsed.filter((asset): asset is DesignAsset => isDesignAsset(asset)) : []);
      } catch {
        window.localStorage.removeItem(BRAND_ASSETS_STORAGE_KEY);
      } finally {
        setBrandAssetsLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!brandAssetsLoaded) return;
    try {
      window.localStorage.setItem(BRAND_ASSETS_STORAGE_KEY, JSON.stringify(brandAssets));
    } catch {
      window.setTimeout(() => {
        setAssetLibraryMessage('Brand asset storage is full. Remove a large asset or upload a smaller file.');
      }, 0);
    }
  }, [brandAssets, brandAssetsLoaded]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const raw =
        window.localStorage.getItem(DELETED_ASSETS_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_HIDDEN_ASSETS_STORAGE_KEY);
      if (!raw) {
        setDeletedAssetsLoaded(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
        setDeletedAssetIds(ids);
        window.localStorage.setItem(DELETED_ASSETS_STORAGE_KEY, JSON.stringify(ids));
        window.localStorage.removeItem(LEGACY_HIDDEN_ASSETS_STORAGE_KEY);
      } catch {
        window.localStorage.removeItem(DELETED_ASSETS_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_HIDDEN_ASSETS_STORAGE_KEY);
      } finally {
        setDeletedAssetsLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!deletedAssetsLoaded) return;
    window.localStorage.setItem(DELETED_ASSETS_STORAGE_KEY, JSON.stringify(deletedAssetIds));
  }, [deletedAssetIds, deletedAssetsLoaded]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const raw = window.localStorage.getItem(DESIGN_TEMPLATES_STORAGE_KEY);
      if (!raw) {
        setDesignTemplatesLoaded(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        setDesignTemplates(Array.isArray(parsed) ? parsed.filter((record): record is DesignTemplateRecord => isDesignTemplateRecord(record)) : []);
      } catch {
        window.localStorage.removeItem(DESIGN_TEMPLATES_STORAGE_KEY);
      } finally {
        setDesignTemplatesLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!designTemplatesLoaded) return;
    try {
      window.localStorage.setItem(DESIGN_TEMPLATES_STORAGE_KEY, JSON.stringify(designTemplates));
    } catch {
      window.setTimeout(() => {
        setTemplateMessage('Template storage is full. Remove an older template, then save again.');
      }, 0);
    }
  }, [designTemplates, designTemplatesLoaded]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const raw = window.localStorage.getItem(CONTENT_VAULT_COLLAPSED_STORAGE_KEY);
      setIsVaultPanelCollapsed(raw === 'true');
      setVaultPanelPreferenceLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!vaultPanelPreferenceLoaded) return;
    window.localStorage.setItem(CONTENT_VAULT_COLLAPSED_STORAGE_KEY, String(isVaultPanelCollapsed));
  }, [isVaultPanelCollapsed, vaultPanelPreferenceLoaded]);

  const replaceImportedDesignDocument = useCallback((nextDesign: DesignDocument, message: string) => {
    const nextPage = nextDesign.pages[0];
    const nextSelectedLayerId = nextPage?.layers.find((layer) => !layer.locked)?.id || null;
    const emptyHistory: DesignHistory = { past: [], future: [] };

    designRef.current = nextDesign;
    designHistoryRef.current = emptyHistory;
    activePageIdRef.current = nextPage?.id || 'page-1';
    selectedLayerIdRef.current = nextSelectedLayerId;
    selectedLayerIdsRef.current = nextSelectedLayerId ? [nextSelectedLayerId] : [];
    setDesign(nextDesign);
    setDesignHistory(emptyHistory);
    setActivePageId(activePageIdRef.current);
    setSelectedLayerIdState(nextSelectedLayerId);
    setSelectedLayerIds(selectedLayerIdsRef.current);
    setSaveMessage(message);
    setTemplateMessage('');
    setCanvasZoom(100);
  }, []);

  const getPreferredImportedCarouselTemplateRecord = useCallback((draft: DesignStudioCarouselDraftInput) => {
    const aspectOption = getCarouselAspectRatioOption(draft.aspectRatio, draft.platform);
    const dimensions = getCarouselExportDimensions(aspectOption);
    return designTemplates.find((template) => (
      template.format === 'carousel' &&
      template.sourceCarouselTemplate === draft.template &&
      template.width === dimensions.width &&
      template.height === dimensions.height
    )) || designTemplates.find((template) => (
      template.format === 'carousel' &&
      template.sourceCarouselTemplate === draft.template
    )) || designTemplates.find((template) => (
      template.format === 'carousel' &&
      template.width === dimensions.width &&
      template.height === dimensions.height
    )) || designTemplates.find((template) => (
      template.format === 'carousel'
    )) || null;
  }, [designTemplates]);

  const getPreferredImportedTextTemplateRecord = useCallback(() => (
    designTemplates.find((template) => (
      template.format === 'social_graphic' &&
      template.width === DEFAULT_DESIGN_WIDTH &&
      template.height === DEFAULT_DESIGN_HEIGHT &&
      template.document.pages.some((page) => page.layers.some((layer) => layer.type === 'text' && layer.templateSlot?.kind === 'text'))
    )) || designTemplates.find((template) => (
      template.format === 'social_graphic' &&
      template.document.pages.some((page) => page.layers.some((layer) => layer.type === 'text' && layer.templateSlot?.kind === 'text'))
    )) || null
  ), [designTemplates]);

  const importCarouselDraftFromRequest = useCallback((source: DesignStudioCarouselImport) => {
    const templateRecord = getPreferredImportedCarouselTemplateRecord(source.draft);
    const nextDesign = createDesignDocumentFromCarouselDraft(source.draft, templateRecord);
    replaceImportedDesignDocument(
      nextDesign,
      templateRecord
        ? `Opened ${source.label} with "${templateRecord.name}".`
        : `Opened ${source.label} as editable carousel pages.`,
    );
  }, [getPreferredImportedCarouselTemplateRecord, replaceImportedDesignDocument]);

  const importTextDraftFromRequest = useCallback((source: DesignStudioTextImport) => {
    const templateRecord = getPreferredImportedTextTemplateRecord();
    const nextDesign = createDesignDocumentFromTextImport(source, templateRecord);
    replaceImportedDesignDocument(
      nextDesign,
      templateRecord
        ? `Opened ${source.label} with "${templateRecord.name}".`
        : `Opened ${source.label} as an editable graphic.`,
    );
  }, [getPreferredImportedTextTemplateRecord, replaceImportedDesignDocument]);

  useEffect(() => {
    if (!importRequest || handledImportRequestRef.current === importRequest.requestId) return;
    handledImportRequestRef.current = importRequest.requestId;
    const timeoutId = window.setTimeout(() => {
      if (importRequest.kind === 'carousel') {
        const source = carouselImports.find((item) => item.id === importRequest.id);
        if (source) {
          importCarouselDraftFromRequest(source);
          onImportRequestHandled?.();
          return;
        }
      }

      if (importRequest.kind === 'text') {
        const source = textImports.find((item) => item.id === importRequest.id);
        if (source) {
          importTextDraftFromRequest(source);
          onImportRequestHandled?.();
          return;
        }
      }

      setTemplateMessage('That source is no longer available in Design Studio.');
      onImportRequestHandled?.();
    }, 20);
    return () => window.clearTimeout(timeoutId);
  }, [carouselImports, importCarouselDraftFromRequest, importRequest, importTextDraftFromRequest, onImportRequestHandled, textImports]);

  useEffect(() => {
    const raw = window.localStorage.getItem(DESIGN_STUDIO_PENDING_IMPORT_STORAGE_KEY);
    if (!raw) return;
    let pendingImport: unknown;
    try {
      pendingImport = JSON.parse(raw) as unknown;
    } catch {
      window.localStorage.removeItem(DESIGN_STUDIO_PENDING_IMPORT_STORAGE_KEY);
      window.setTimeout(() => setTemplateMessage('Could not read the pending Design Studio import.'), 0);
      return;
    }
    if (!isDesignStudioPendingImport(pendingImport)) {
      window.localStorage.removeItem(DESIGN_STUDIO_PENDING_IMPORT_STORAGE_KEY);
      window.setTimeout(() => setTemplateMessage('That Design Studio import was not in the expected format.'), 0);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      window.localStorage.removeItem(DESIGN_STUDIO_PENDING_IMPORT_STORAGE_KEY);
      if (pendingImport.kind === 'carousel') {
        importCarouselDraftFromRequest(pendingImport.source);
        return;
      }
      importTextDraftFromRequest(pendingImport.source);
    }, 30);
    return () => window.clearTimeout(timeoutId);
  }, [importCarouselDraftFromRequest, importTextDraftFromRequest]);

  const assetLibrary = useMemo(() => {
    return brandAssets.reduce<Record<string, DesignAsset>>(
      (acc, asset) => {
        acc[asset.id] = asset;
        return acc;
      },
      { ...designAssetLibrary },
    );
  }, [brandAssets]);
  const selectedAsset = selectedLayer?.type === 'asset' ? assetLibrary[selectedLayer.assetId] || null : null;
  const normalizedAssetSearchQuery = assetSearchQuery.trim().toLowerCase();
  const assetSearchTerms = useMemo(
    () => normalizedAssetSearchQuery.split(/\s+/).filter(Boolean),
    [normalizedAssetSearchQuery],
  );

  const groupedAssets = useMemo(() => {
    return [...brandAssets, ...Object.values(designAssetLibrary)].reduce<Record<string, DesignAsset[]>>((acc, asset) => {
      if (deletedAssetIds.includes(asset.id)) return acc;
      const haystack = `${asset.name} ${asset.category} ${asset.id}`.toLowerCase();
      if (assetSearchTerms.length && !assetSearchTerms.every((term) => haystack.includes(term))) return acc;
      acc[asset.category] = [...(acc[asset.category] || []), asset];
      return acc;
    }, {});
  }, [assetSearchTerms, brandAssets, deletedAssetIds]);

  function selectSingleLayer(id: string | null) {
    selectedLayerIdRef.current = id;
    selectedLayerIdsRef.current = id ? [id] : [];
    setSelectedLayerIdState(id);
    setSelectedLayerIds(selectedLayerIdsRef.current);
  }

  function selectLayer(id: string | null, additive = false) {
    if (!id) {
      selectSingleLayer(null);
      return;
    }

    if (!additive) {
      selectSingleLayer(id);
      return;
    }

    const nextSelection = selectedLayerIds.includes(id)
      ? selectedLayerIds.filter((selectedId) => selectedId !== id)
      : [...selectedLayerIds, id];
    selectedLayerIdsRef.current = nextSelection;
    selectedLayerIdRef.current = nextSelection.at(-1) || null;
    setSelectedLayerIds(nextSelection);
    setSelectedLayerIdState(selectedLayerIdRef.current);
  }

  const getCurrentHistoryEntry = useCallback((): DesignHistoryEntry => {
    return {
      design: designRef.current,
      activePageId: activePageIdRef.current,
      selectedLayerId: selectedLayerIdRef.current,
      selectedLayerIds: selectedLayerIdsRef.current,
    };
  }, []);

  const restoreHistoryEntry = useCallback((entry: DesignHistoryEntry) => {
    const nextPage = entry.design.pages.find((page) => page.id === entry.activePageId) || entry.design.pages[0];
    const nextActivePageId = nextPage?.id || 'page-1';
    const nextLayerIds = new Set(nextPage?.layers.map((layer) => layer.id) || []);
    const nextSelectedLayerIds = entry.selectedLayerIds.filter((id) => nextLayerIds.has(id));
    const nextSelectedLayerId = entry.selectedLayerId && nextLayerIds.has(entry.selectedLayerId)
      ? entry.selectedLayerId
      : nextSelectedLayerIds.at(-1) || null;

    designRef.current = entry.design;
    activePageIdRef.current = nextActivePageId;
    selectedLayerIdRef.current = nextSelectedLayerId;
    selectedLayerIdsRef.current = nextSelectedLayerIds;
    setDesign(entry.design);
    setActivePageId(nextActivePageId);
    setSelectedLayerIds(nextSelectedLayerIds);
    setSelectedLayerIdState(nextSelectedLayerId);
    setSaveMessage('');
  }, []);

  const undoDesignChange = useCallback(() => {
    const history = designHistoryRef.current;
    const previous = history.past.at(-1);
    if (!previous) return;
    const current = getCurrentHistoryEntry();
    const nextHistory = {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, MAX_DESIGN_HISTORY_ENTRIES),
    };
    designHistoryRef.current = nextHistory;
    restoreHistoryEntry(previous);
    setDesignHistory(nextHistory);
  }, [getCurrentHistoryEntry, restoreHistoryEntry]);

  const redoDesignChange = useCallback(() => {
    const history = designHistoryRef.current;
    const next = history.future[0];
    if (!next) return;
    const current = getCurrentHistoryEntry();
    const nextHistory = {
      past: [...history.past.slice(-(MAX_DESIGN_HISTORY_ENTRIES - 1)), current],
      future: history.future.slice(1),
    };
    designHistoryRef.current = nextHistory;
    restoreHistoryEntry(next);
    setDesignHistory(nextHistory);
  }, [getCurrentHistoryEntry, restoreHistoryEntry]);

  const pasteTextIntoSelectedTextLayer = useCallback((pastedText: string) => {
    const current = designRef.current;
    const selectedIds = selectedLayerIdsRef.current;
    if (selectedIds.length !== 1) return false;

    const selectedId = selectedIds[0];
    let changed = false;
    const pages = current.pages.map((page) => {
      if (page.id !== activePageIdRef.current) return page;
      const layers = page.layers.map((layer) => {
        if (layer.id !== selectedId) return layer;
        if (layer.type !== 'text' || layer.locked || layer.text === pastedText) return layer;
        changed = true;
        return { ...layer, text: pastedText, richTextRuns: [] } as DesignLayer;
      });
      return changed ? { ...page, layers } : page;
    });

    if (!changed) return false;

    const previous: DesignHistoryEntry = {
      design: current,
      activePageId: activePageIdRef.current,
      selectedLayerId: selectedLayerIdRef.current,
      selectedLayerIds: selectedLayerIdsRef.current,
    };
    const history = designHistoryRef.current;
    const nextHistory = {
      past: [...history.past.slice(-(MAX_DESIGN_HISTORY_ENTRIES - 1)), previous],
      future: [],
    };
    const nextDesign = { ...current, pages };
    designHistoryRef.current = nextHistory;
    designRef.current = nextDesign;
    setDesignHistory(nextHistory);
    setDesign(nextDesign);
    setSaveMessage('');
    return true;
  }, []);

  async function copyVaultImportText(source: DesignStudioVaultImport) {
    const copied = await copyTextToClipboard(source.text);
    setVaultMessage(copied ? `Copied "${source.label}".` : 'Could not copy this Vault item.');
  }

  function placeVaultImportText(source: DesignStudioVaultImport) {
    if (!selectedLayer) {
      setVaultMessage('Select one text layer, then place the Vault copy.');
      return;
    }
    if (selectedLayer.type !== 'text') {
      setVaultMessage('Select a text layer before placing Vault copy.');
      return;
    }
    if (selectedLayer.locked) {
      setVaultMessage('Unlock the selected text layer before placing Vault copy.');
      return;
    }

    const placed = pasteTextIntoSelectedTextLayer(source.text);
    setVaultMessage(placed ? `Placed "${source.label}" into the selected text layer.` : 'That text is already on the selected layer.');
  }

  function scrollRightPanelToTop() {
    rightPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const copySelectedLayersToClipboard = useCallback(() => {
    const current = designRef.current;
    const page = getActivePage(current, activePageIdRef.current);
    if (!page) return false;
    const selectedIdSet = new Set(selectedLayerIdsRef.current);
    const layersToCopy = page.layers.filter((layer) => selectedIdSet.has(layer.id) && !layer.locked);
    if (!layersToCopy.length) return false;

    layerClipboardRef.current = {
      layers: layersToCopy.map(cloneDesignLayer),
      sourceDesignId: current.id,
      sourcePageId: page.id,
    };
    setAssetLibraryMessage(`${layersToCopy.length} layer${layersToCopy.length === 1 ? '' : 's'} copied. Switch pages or templates, then paste.`);
    return true;
  }, []);

  const pasteCopiedLayersIntoActivePage = useCallback(() => {
    const clipboard = layerClipboardRef.current;
    if (!clipboard?.layers.length) return false;

    const current = designRef.current;
    const targetPage = getActivePage(current, activePageIdRef.current);
    if (!targetPage) return false;
    const pasteOffset = clipboard.sourceDesignId === current.id && clipboard.sourcePageId === targetPage.id ? 32 : 0;
    const pastedLayers = clipboard.layers.map((layer) => createPastedDesignLayer(layer, current, pasteOffset));
    const pastedLayerIds = pastedLayers.map((layer) => layer.id);

    const previous: DesignHistoryEntry = {
      design: current,
      activePageId: activePageIdRef.current,
      selectedLayerId: selectedLayerIdRef.current,
      selectedLayerIds: selectedLayerIdsRef.current,
    };
    const history = designHistoryRef.current;
    const nextHistory = {
      past: [...history.past.slice(-(MAX_DESIGN_HISTORY_ENTRIES - 1)), previous],
      future: [],
    };
    const nextDesign = {
      ...current,
      pages: current.pages.map((page) => (
        page.id === targetPage.id
          ? { ...page, layers: [...page.layers, ...pastedLayers] }
          : page
      )),
    };

    layerClipboardRef.current = {
      layers: pastedLayers.map(cloneDesignLayer),
      sourceDesignId: nextDesign.id,
      sourcePageId: targetPage.id,
    };
    designHistoryRef.current = nextHistory;
    designRef.current = nextDesign;
    selectedLayerIdsRef.current = pastedLayerIds;
    selectedLayerIdRef.current = pastedLayerIds.at(-1) || null;
    setDesignHistory(nextHistory);
    setDesign(nextDesign);
    setSelectedLayerIds(pastedLayerIds);
    setSelectedLayerIdState(selectedLayerIdRef.current);
    setAssetLibraryMessage(`${pastedLayers.length} layer${pastedLayers.length === 1 ? '' : 's'} pasted.`);
    setSaveMessage('');
    return true;
  }, []);

  useEffect(() => {
    function onCopy(event: ClipboardEvent) {
      if (isEditableKeyboardTarget(event.target)) return;
      const handled = copySelectedLayersToClipboard();
      if (!handled) return;

      event.clipboardData?.setData('text/plain', DESIGN_LAYER_CLIPBOARD_TEXT);
      event.preventDefault();
    }

    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [copySelectedLayersToClipboard]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModifierKey = event.ctrlKey || event.metaKey;
      const normalizedKey = event.key.toLowerCase();
      const isUndoShortcut = isModifierKey && !event.altKey && normalizedKey === 'z' && !event.shiftKey;
      const isRedoShortcut = isModifierKey && !event.altKey && (normalizedKey === 'y' || (normalizedKey === 'z' && event.shiftKey));
      if ((isUndoShortcut || isRedoShortcut) && !isEditableKeyboardTarget(event.target)) {
        event.preventDefault();
        if (isUndoShortcut) {
          undoDesignChange();
        } else {
          redoDesignChange();
        }
        return;
      }

      const movableSelectedLayers = selectedLayers.filter((layer) => !layer.locked);
      if (!movableSelectedLayers.length || isEditableKeyboardTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const selectedIdSet = new Set(movableSelectedLayers.map((layer) => layer.id));
        updateDesign((current) => ({
          ...current,
          pages: current.pages.map((page) => (
            page.id === activePage.id
              ? { ...page, layers: page.layers.filter((layer) => !selectedIdSet.has(layer.id) || layer.locked) }
              : page
          )),
        }));
        selectSingleLayer(null);
        return;
      }

      const directions: Record<string, { x: number; y: number }> = {
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
      };
      const direction = directions[event.key];
      if (!direction) return;

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const selectedIdSet = new Set(movableSelectedLayers.map((layer) => layer.id));
      updateDesign((current) => ({
        ...current,
        pages: current.pages.map((page) => (
          page.id === activePage.id
            ? {
                ...page,
                layers: page.layers.map((layer) => {
                  if (!selectedIdSet.has(layer.id) || layer.locked) return layer;
                  return {
                    ...layer,
                    x: clamp(layer.x + direction.x * step, -layer.width + 24, current.width - 24),
                    y: clamp(layer.y + direction.y * step, -layer.height + 24, current.height - 24),
                  } as DesignLayer;
                }),
              }
            : page
        )),
      }));
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePage.id, selectedLayers, undoDesignChange, redoDesignChange]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (isEditableKeyboardTarget(event.target)) return;

      const pastedText = event.clipboardData?.getData('text/plain');
      const shouldPasteLayerSelection = pastedText === DESIGN_LAYER_CLIPBOARD_TEXT && Boolean(layerClipboardRef.current?.layers.length);
      const handled = shouldPasteLayerSelection
        ? pasteCopiedLayersIntoActivePage()
        : pastedText
          ? pasteTextIntoSelectedTextLayer(pastedText) || pasteCopiedLayersIntoActivePage()
        : pasteCopiedLayersIntoActivePage();
      if (!handled) return;

      event.preventDefault();
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [pasteCopiedLayersIntoActivePage, pasteTextIntoSelectedTextLayer]);

  function updateDesign(updater: (current: DesignDocument) => DesignDocument, options: DesignPatchOptions = {}) {
    const current = designRef.current;
    const next = updater(current);
    if (next === current) return;
    if (options.recordHistory !== false) {
      const previous: DesignHistoryEntry = {
        design: current,
        activePageId: activePageIdRef.current,
        selectedLayerId: selectedLayerIdRef.current,
        selectedLayerIds: selectedLayerIdsRef.current,
      };
      const history = designHistoryRef.current;
      const nextHistory = {
        past: [...history.past.slice(-(MAX_DESIGN_HISTORY_ENTRIES - 1)), previous],
        future: [],
      };
      designHistoryRef.current = nextHistory;
      setDesignHistory(nextHistory);
    }
    designRef.current = next;
    setDesign(next);
    setSaveMessage('');
  }

  function updateActivePage(updater: (page: DesignPage) => DesignPage, options: DesignPatchOptions = {}) {
    updateDesign((current) => {
      let changed = false;
      const pages = current.pages.map((page) => {
        if (page.id !== activePage.id) return page;
        const nextPage = updater(page);
        if (nextPage !== page) changed = true;
        return nextPage;
      });
      return changed ? { ...current, pages } : current;
    }, options);
  }

  function replaceDesignDocument(nextDesign: DesignDocument, message: string) {
    const nextPage = nextDesign.pages[0];
    const nextSelectedLayerId = nextPage?.layers.find((layer) => !layer.locked)?.id || null;
    const emptyHistory: DesignHistory = { past: [], future: [] };

    designRef.current = nextDesign;
    designHistoryRef.current = emptyHistory;
    activePageIdRef.current = nextPage?.id || 'page-1';
    selectedLayerIdRef.current = nextSelectedLayerId;
    selectedLayerIdsRef.current = nextSelectedLayerId ? [nextSelectedLayerId] : [];
    setDesign(nextDesign);
    setDesignHistory(emptyHistory);
    setActivePageId(activePageIdRef.current);
    setSelectedLayerIdState(nextSelectedLayerId);
    setSelectedLayerIds(selectedLayerIdsRef.current);
    setSaveMessage(message);
    setTemplateMessage('');
    setCanvasZoom(100);
  }

  function getPreferredCarouselTemplateRecord(draft: DesignStudioCarouselDraftInput) {
    const aspectOption = getCarouselAspectRatioOption(draft.aspectRatio, draft.platform);
    const dimensions = getCarouselExportDimensions(aspectOption);
    return designTemplates.find((template) => (
      template.format === 'carousel' &&
      template.sourceCarouselTemplate === draft.template &&
      template.width === dimensions.width &&
      template.height === dimensions.height
    )) || designTemplates.find((template) => (
      template.format === 'carousel' &&
      template.sourceCarouselTemplate === draft.template
    )) || null;
  }

  function importCarouselDraft(source: DesignStudioCarouselImport, templateRecord = getPreferredCarouselTemplateRecord(source.draft)) {
    const nextDesign = createDesignDocumentFromCarouselDraft(source.draft, templateRecord);
    replaceDesignDocument(
      nextDesign,
      templateRecord
        ? `Opened ${source.label} with "${templateRecord.name}".`
        : `Opened ${source.label} as editable carousel pages.`,
    );
  }

  function importTextDraft(source: DesignStudioTextImport) {
    const templateRecord = getPreferredImportedTextTemplateRecord();
    const nextDesign = createDesignDocumentFromTextImport(source, templateRecord);
    replaceDesignDocument(
      nextDesign,
      templateRecord
        ? `Opened ${source.label} with "${templateRecord.name}".`
        : `Opened ${source.label} as an editable graphic.`,
    );
  }

  function startBlankDesign() {
    if (design.pages.some((page) => page.layers.length > 0)) {
      const confirmed = window.confirm('Start a blank design? Save your current design first if you need to keep it.');
      if (!confirmed) return;
    }
    replaceDesignDocument(createBlankDesignDocument(design.format, design.width, design.height), 'Blank design started.');
  }

  function persistDesignTemplates(records: DesignTemplateRecord[]) {
    try {
      window.localStorage.setItem(DESIGN_TEMPLATES_STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch {
      setTemplateMessage('Template storage is full. Delete an older template, then save again.');
      return false;
    }
  }

  function saveCurrentDesignAsTemplate() {
    const fallbackName = design.templateSourceName || design.title || 'Design template';
    const name = window.prompt('Template name', fallbackName);
    if (!name?.trim()) return;

    const now = new Date().toISOString();
    const id = createDesignId('template');
    const templateDocument: DesignDocument = {
      ...cloneDesignDocument(design),
      id: createDesignId('template-doc'),
      title: name.trim(),
      templateSourceId: id,
      templateSourceName: name.trim(),
      templateUpdatedAt: now,
    };
    const record: DesignTemplateRecord = {
      id,
      name: name.trim(),
      format: design.format,
      width: design.width,
      height: design.height,
      sourceCarouselTemplate: design.carouselTemplate,
      sourceCarouselLayoutRecipe: design.carouselLayoutRecipe,
      document: templateDocument,
      createdAt: now,
      updatedAt: now,
    };

    const nextTemplates = [record, ...designTemplates];
    if (!persistDesignTemplates(nextTemplates)) return;
    setDesignTemplates(nextTemplates);
    updateDesign((current) => ({
      ...current,
      templateSourceId: id,
      templateSourceName: record.name,
      templateUpdatedAt: now,
    }), { recordHistory: false });
    setTemplateMessage(`"${record.name}" saved and will stay in Saved templates on this browser.`);
  }

  function updateCurrentTemplate() {
    if (!activeTemplateRecord) return;
    const confirmed = window.confirm(`Update "${activeTemplateRecord.name}" with this design?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const nextDocument: DesignDocument = {
      ...cloneDesignDocument(design),
      title: activeTemplateRecord.name,
      templateSourceId: activeTemplateRecord.id,
      templateSourceName: activeTemplateRecord.name,
      templateUpdatedAt: now,
    };
    const nextTemplates = designTemplates.map((template) => (
      template.id === activeTemplateRecord.id
        ? {
            ...template,
            format: design.format,
            width: design.width,
            height: design.height,
            sourceCarouselTemplate: design.carouselTemplate,
            sourceCarouselLayoutRecipe: design.carouselLayoutRecipe,
            document: nextDocument,
            updatedAt: now,
          }
        : template
    ));
    if (!persistDesignTemplates(nextTemplates)) return;
    setDesignTemplates(nextTemplates);
    updateDesign((current) => ({ ...current, templateUpdatedAt: now }), { recordHistory: false });
    setTemplateMessage(`"${activeTemplateRecord.name}" updated and saved.`);
  }

  function loadTemplateRecord(template: DesignTemplateRecord) {
    const nextDesign = {
      ...cloneDesignDocument(template.document),
      id: createDesignId('design-template'),
      templateSourceId: template.id,
      templateSourceName: template.name,
      templateUpdatedAt: template.updatedAt,
    };
    replaceDesignDocument(nextDesign, `Loaded "${template.name}".`);
  }

  function deleteTemplateRecord(template: DesignTemplateRecord) {
    const confirmed = window.confirm(`Delete "${template.name}" from saved templates?`);
    if (!confirmed) return;
    const nextTemplates = designTemplates.filter((item) => item.id !== template.id);
    if (!persistDesignTemplates(nextTemplates)) return;
    setDesignTemplates(nextTemplates);
    if (design.templateSourceId === template.id) {
      updateDesign((current) => ({
        ...current,
        templateSourceId: undefined,
        templateSourceName: undefined,
        templateUpdatedAt: undefined,
      }), { recordHistory: false });
    }
    setTemplateMessage(`"${template.name}" deleted.`);
  }

  function patchActivePageBackgroundEffects(patch: Partial<DesignBackgroundEffects>) {
    updateActivePage((page) => ({
      ...page,
      backgroundEffects: {
        ...getPageBackgroundEffects(page.backgroundEffects),
        ...patch,
      },
    }));
  }

  function removePaperTextureLayer() {
    updateActivePage((page) => ({
      ...page,
      layers: page.layers.filter((layer) => !(layer.type === 'asset' && layer.assetId === 'paper_texture')),
    }));
  }

  function restorePaperTextureLayer() {
    const paperTextureLayer: DesignAssetLayer = {
      id: createDesignId('asset'),
      type: 'asset',
      name: 'Paper texture',
      assetId: 'paper_texture',
      x: 0,
      y: 0,
      width: design.width,
      height: design.height,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: true,
      fit: 'cover',
    };

    updateActivePage((page) => ({
      ...page,
      layers: [
        paperTextureLayer,
        ...page.layers.filter((layer) => !(layer.type === 'asset' && layer.assetId === 'paper_texture')),
      ],
    }));
  }

  function patchLayer(id: string, patch: Partial<DesignLayer>, options: DesignPatchOptions = {}) {
    updateActivePage((page) => ({
      ...page,
      layers: page.layers.map((layer) => (layer.id === id ? ({ ...layer, ...patch } as DesignLayer) : layer)),
    }), options);
  }

  function patchLayers(patches: Array<{ id: string; patch: Partial<DesignLayer> }>, options: DesignPatchOptions = {}) {
    const patchMap = new Map(patches.map((item) => [item.id, item.patch]));
    updateActivePage((page) => ({
      ...page,
      layers: page.layers.map((layer) => {
        const patch = patchMap.get(layer.id);
        return patch ? ({ ...layer, ...patch } as DesignLayer) : layer;
      }),
    }), options);
  }

  function addTextLayer() {
    const id = createDesignId('text');
    const layer: DesignTextLayer = {
      id,
      type: 'text',
      name: 'New text',
      text: 'New design note',
      x: 180,
      y: 520,
      width: 520,
      height: 120,
      rotation: 0,
      opacity: 1,
      visible: true,
      fontFamily: 'serif',
      fontSize: 52,
      fontWeight: 700,
      color: '#142334',
      lineHeight: 1.05,
      textAlign: 'left',
    };
    updateActivePage((page) => ({ ...page, layers: [...page.layers, layer] }));
    selectSingleLayer(id);
  }

  function addAssetLayer(assetId: DesignAssetId) {
    const asset = assetLibrary[assetId];
    if (!asset) return;
    const id = createDesignId('asset');
    const size = getDefaultAssetLayerSize(asset);
    const layer: DesignAssetLayer = {
      id,
      type: 'asset',
      name: asset.name,
      assetId,
      x: 380,
      y: 560,
      width: size.width,
      height: size.height,
      rotation: 0,
      opacity: 1,
      visible: true,
      fit: 'contain',
      color: canRecolorDesignAsset(asset) ? asset.defaultColor || '#142334' : undefined,
    };
    updateActivePage((page) => ({ ...page, layers: [...page.layers, layer] }));
    selectSingleLayer(id);
  }

  async function importBrandAssetFiles(files: FileList | null) {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const supportedFiles = selectedFiles.filter(isSupportedBrandAssetFile);
    const usableFiles = supportedFiles.filter((file) => file.size <= MAX_BRAND_ASSET_BYTES);
    const skippedUnsupported = selectedFiles.length - supportedFiles.length;
    const skippedOversized = supportedFiles.length - usableFiles.length;

    if (!usableFiles.length) {
      setAssetLibraryMessage(
        skippedOversized > 0
          ? 'Those files are too large. Use brand assets under 2MB each.'
          : 'Upload PNG, JPG, WebP, or SVG brand assets.',
      );
      return;
    }

    try {
      const importedAssets = await Promise.all(
        usableFiles.map(async (file) => {
          const src = await readBrandAssetFile(file);
          const size = await getImageNaturalSize(src);
          const isSvg = isSvgBrandAssetFile(file);
          return {
            id: createDesignId('brand-asset'),
            name: stripAssetFileExtension(file.name),
            src,
            category: 'Brand assets',
            custom: true,
            recolorable: isSvg,
            defaultColor: isSvg ? '#142334' : undefined,
            naturalWidth: size?.width,
            naturalHeight: size?.height,
          } satisfies DesignAsset;
        }),
      );

      setBrandAssets((current) => [...importedAssets, ...current]);
      const skippedParts = [
        skippedUnsupported ? `${skippedUnsupported} unsupported` : '',
        skippedOversized ? `${skippedOversized} over 2MB` : '',
      ].filter(Boolean);
      setAssetLibraryMessage(
        `${importedAssets.length} brand asset${importedAssets.length === 1 ? '' : 's'} imported.${
          skippedParts.length ? ` Skipped ${skippedParts.join(', ')}.` : ''
        }`,
      );
    } catch (error) {
      setAssetLibraryMessage(error instanceof Error ? error.message : 'Could not import those brand assets.');
    }
  }

  function removeAssetFromLibrary(assetId: DesignAssetId) {
    const asset = assetLibrary[assetId];
    if (!asset) return;
    const shouldRemove = window.confirm(
      asset.custom
        ? `Remove "${asset.name}" from Brand assets? Any canvas layers using it will be removed too.`
        : `Delete "${asset.name}" from the Asset library? Any canvas layers using it will be removed too.`,
    );
    if (!shouldRemove) return;
    if (asset.custom) {
      const nextBrandAssets = brandAssets.filter((item) => item.id !== assetId);
      try {
        window.localStorage.setItem(BRAND_ASSETS_STORAGE_KEY, JSON.stringify(nextBrandAssets));
      } catch {
        setAssetLibraryMessage('Could not save the asset deletion. Try deleting another large asset first.');
        return;
      }
      setBrandAssets(nextBrandAssets);
    } else {
      const nextDeletedAssetIds = deletedAssetIds.includes(assetId) ? deletedAssetIds : [...deletedAssetIds, assetId];
      try {
        window.localStorage.setItem(DELETED_ASSETS_STORAGE_KEY, JSON.stringify(nextDeletedAssetIds));
      } catch {
        setAssetLibraryMessage('Could not save the asset deletion. Try again after deleting another saved asset.');
        return;
      }
      setDeletedAssetIds(nextDeletedAssetIds);
    }
    updateDesign((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        layers: page.layers.filter((layer) => !(layer.type === 'asset' && layer.assetId === assetId)),
      })),
    }));
    if (selectedLayer?.type === 'asset' && selectedLayer.assetId === assetId) selectSingleLayer(null);
    setAssetLibraryMessage(`${asset.name} deleted from the Asset library.`);
  }

  function addShapeLayer(shape: DesignShapeKind) {
    const id = createDesignId('shape');
    const isLine = shape === 'line';
    const isCircle = shape === 'circle';
    const defaultWidth = isLine ? 420 : 260;
    const defaultHeight = isLine ? 36 : isCircle ? defaultWidth : 200;
    const layer: DesignShapeLayer = {
      id,
      type: 'shape',
      name: getDesignShapeLabel(shape),
      shape,
      x: isLine ? 240 : 360,
      y: isLine ? 640 : 520,
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      opacity: 1,
      visible: true,
      fillColor: isLine ? 'transparent' : '#EFD8CA',
      strokeColor: isLine ? '#142334' : '#C9AD98',
      strokeWidth: isLine ? 6 : 2,
      borderRadius: shape === 'rectangle' ? 22 : 0,
    };
    updateActivePage((page) => ({ ...page, layers: [...page.layers, layer] }));
    selectSingleLayer(id);
  }

  function changeShapeLayerShape(id: string, shape: DesignShapeKind) {
    const layer = activePage.layers.find((item): item is DesignShapeLayer => item.id === id && item.type === 'shape');
    if (!layer) return;
    const isLine = shape === 'line';
    const nextPatch: Partial<DesignShapeLayer> = {
      shape,
      name: getDesignShapeLabel(shape),
      fillColor: isLine || isTransparentColor(layer.fillColor) ? (isLine ? 'transparent' : '#EFD8CA') : layer.fillColor,
      strokeColor: layer.strokeColor || (isLine ? '#142334' : '#C9AD98'),
      strokeWidth: layer.strokeWidth || (isLine ? 6 : 2),
      borderRadius: shape === 'rectangle' ? layer.borderRadius || 22 : 0,
    };

    if (shape === 'circle') {
      const size = layer.shape === 'line' ? 220 : Math.max(24, Math.min(layer.width, layer.height));
      nextPatch.width = size;
      nextPatch.height = size;
      nextPatch.x = layer.x + (layer.width - size) / 2;
      nextPatch.y = layer.y + (layer.height - size) / 2;
    } else if (shape === 'line') {
      nextPatch.height = 36;
      nextPatch.fillColor = 'transparent';
    } else if (layer.shape === 'line') {
      nextPatch.width = 260;
      nextPatch.height = 200;
    }

    patchLayer(id, nextPatch as Partial<DesignLayer>);
  }

  function duplicatePage() {
    const nextPage: DesignPage = {
      ...activePage,
      id: createDesignId('page'),
      name: `${activePage.name} copy`,
      layers: activePage.layers.map((layer) => ({ ...layer, id: createDesignId(layer.type) } as DesignLayer)),
    };
    updateDesign((current) => ({ ...current, pages: [...current.pages, nextPage] }));
    activePageIdRef.current = nextPage.id;
    setActivePageId(nextPage.id);
    selectSingleLayer(nextPage.layers.find((layer) => !layer.locked)?.id || null);
  }

  function renamePage(pageId: string) {
    const page = design.pages.find((item) => item.id === pageId);
    if (!page) return;
    const nextName = window.prompt('Page name', page.name);
    if (!nextName?.trim() || nextName.trim() === page.name) return;
    updateDesign((current) => ({
      ...current,
      pages: current.pages.map((item) => (
        item.id === pageId ? { ...item, name: nextName.trim() } : item
      )),
    }));
  }

  function deletePage(pageId: string) {
    const page = design.pages.find((item) => item.id === pageId);
    if (!page) return;
    const confirmed = window.confirm(`Delete "${page.name}"? This removes the page and all layers on it.`);
    if (!confirmed) return;

    let nextActivePageId = activePageIdRef.current;
    let nextSelectedLayerId: string | null = selectedLayerIdRef.current;
    updateDesign((current) => {
      const deleteIndex = current.pages.findIndex((item) => item.id === pageId);
      if (deleteIndex < 0) return current;
      let nextPages = current.pages.filter((item) => item.id !== pageId);
      if (!nextPages.length) {
        nextPages = [createBlankDesignPage('Page 1', current.width, current.height)];
      }
      if (activePageIdRef.current === pageId || !nextPages.some((item) => item.id === activePageIdRef.current)) {
        const nextPage = nextPages[Math.min(deleteIndex, nextPages.length - 1)] || nextPages[0];
        nextActivePageId = nextPage.id;
        nextSelectedLayerId = nextPage.layers.find((layer) => !layer.locked)?.id || null;
      }
      return { ...current, pages: nextPages };
    });
    activePageIdRef.current = nextActivePageId;
    selectedLayerIdRef.current = nextSelectedLayerId;
    selectedLayerIdsRef.current = nextSelectedLayerId ? [nextSelectedLayerId] : [];
    setActivePageId(nextActivePageId);
    setSelectedLayerIdState(nextSelectedLayerId);
    setSelectedLayerIds(selectedLayerIdsRef.current);
  }

  function reorderPage(id: string, targetId: string) {
    if (id === targetId) return;
    updateDesign((current) => {
      const sourceIndex = current.pages.findIndex((page) => page.id === id);
      const targetIndex = current.pages.findIndex((page) => page.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const nextPages = [...current.pages];
      const [page] = nextPages.splice(sourceIndex, 1);
      nextPages.splice(targetIndex, 0, page);
      return { ...current, pages: nextPages };
    });
  }

  function addBlankPage() {
    const nextPage = createBlankDesignPage(`Page ${design.pages.length + 1}`, design.width, design.height, '#F5F2ED', true);
    updateDesign((current) => ({ ...current, pages: [...current.pages, nextPage] }));
    activePageIdRef.current = nextPage.id;
    setActivePageId(nextPage.id);
    selectSingleLayer(null);
  }

  function moveLayer(id: string, direction: 'up' | 'down') {
    updateActivePage((page) => {
      const index = page.layers.findIndex((layer) => layer.id === id);
      if (index < 0) return page;
      const nextIndex = direction === 'up' ? Math.min(page.layers.length - 1, index + 1) : Math.max(0, index - 1);
      if (nextIndex === index) return page;
      const nextLayers = [...page.layers];
      const [layer] = nextLayers.splice(index, 1);
      nextLayers.splice(nextIndex, 0, layer);
      return { ...page, layers: nextLayers };
    });
  }

  function moveLayerToEdge(id: string, edge: 'front' | 'back') {
    updateActivePage((page) => {
      const index = page.layers.findIndex((layer) => layer.id === id);
      if (index < 0) return page;
      const nextIndex = edge === 'front' ? page.layers.length - 1 : 0;
      if (index === nextIndex) return page;
      const nextLayers = [...page.layers];
      const [layer] = nextLayers.splice(index, 1);
      nextLayers.splice(nextIndex, 0, layer);
      return { ...page, layers: nextLayers };
    });
  }

  function reorderLayer(id: string, targetId: string) {
    if (id === targetId) return;
    updateActivePage((page) => {
      const sourceIndex = page.layers.findIndex((layer) => layer.id === id);
      const targetIndex = page.layers.findIndex((layer) => layer.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return page;
      const nextLayers = [...page.layers];
      const [layer] = nextLayers.splice(sourceIndex, 1);
      nextLayers.splice(targetIndex, 0, layer);
      return { ...page, layers: nextLayers };
    });
  }

  function deleteLayer(id: string) {
    const layer = activePage.layers.find((item) => item.id === id);
    if (layer?.locked) return;
    updateActivePage((page) => ({ ...page, layers: page.layers.filter((item) => item.id !== id) }));
    selectSingleLayer(null);
  }

  function duplicateLayer(id: string) {
    const sourceLayer = activePage.layers.find((item) => item.id === id);
    if (!sourceLayer || sourceLayer.locked) return;
    const duplicatedLayer = {
      ...sourceLayer,
      id: createDesignId(sourceLayer.type),
      name: `${sourceLayer.name} copy`,
      x: clamp(sourceLayer.x + 32, -sourceLayer.width + 24, design.width - 24),
      y: clamp(sourceLayer.y + 32, -sourceLayer.height + 24, design.height - 24),
      locked: false,
    } as DesignLayer;

    updateActivePage((page) => {
      const sourceIndex = page.layers.findIndex((item) => item.id === id);
      if (sourceIndex < 0) return page;
      const nextLayers = [...page.layers];
      nextLayers.splice(sourceIndex + 1, 0, duplicatedLayer);
      return { ...page, layers: nextLayers };
    });
    selectSingleLayer(duplicatedLayer.id);
  }

  function deleteSelectedLayers() {
    const selectedIdSet = new Set(selectedLayers.filter((layer) => !layer.locked).map((layer) => layer.id));
    if (!selectedIdSet.size) return;
    updateActivePage((page) => ({ ...page, layers: page.layers.filter((layer) => !selectedIdSet.has(layer.id)) }));
    selectSingleLayer(null);
  }

  function duplicateSelectedLayers() {
    const selectedIdSet = new Set(selectedLayers.filter((layer) => !layer.locked).map((layer) => layer.id));
    if (!selectedIdSet.size) return;
    const duplicatedLayers = activePage.layers
      .filter((layer) => selectedIdSet.has(layer.id))
      .map((layer) => ({
        ...layer,
        id: createDesignId(layer.type),
        name: `${layer.name} copy`,
        x: clamp(layer.x + 32, -layer.width + 24, design.width - 24),
        y: clamp(layer.y + 32, -layer.height + 24, design.height - 24),
        locked: false,
      } as DesignLayer));

    updateActivePage((page) => ({ ...page, layers: [...page.layers, ...duplicatedLayers] }));
    selectedLayerIdsRef.current = duplicatedLayers.map((layer) => layer.id);
    selectedLayerIdRef.current = duplicatedLayers.at(-1)?.id || null;
    setSelectedLayerIds(selectedLayerIdsRef.current);
    setSelectedLayerIdState(selectedLayerIdRef.current);
  }

  async function saveSelectionAsAsset({ replaceSelection }: { replaceSelection: boolean }) {
    const layersToSave = selectedGroupableLayers;
    if (layersToSave.length < 2 || !canvasRef.current) {
      setAssetLibraryMessage('Select at least two unlocked visible layers first.');
      return;
    }

    const selectionBounds = getLayerSelectionBounds(layersToSave);
    if (!selectionBounds) return;

    const paddedBounds = getClippedSelectionBounds(
      {
        x: selectionBounds.x - SAVED_GROUP_PADDING,
        y: selectionBounds.y - SAVED_GROUP_PADDING,
        width: selectionBounds.width + SAVED_GROUP_PADDING * 2,
        height: selectionBounds.height + SAVED_GROUP_PADDING * 2,
      },
      design,
    );
    const assetId = createDesignId('saved-group');
    const assetName = `Saved group ${brandAssets.filter((asset) => asset.category === 'Saved groups').length + 1}`;

    setAssetLibraryMessage(replaceSelection ? 'Grouping selection into a reusable asset...' : 'Saving selection as a reusable asset...');

    try {
      const asset: DesignAsset = {
        id: assetId,
        name: assetName,
        src: createTransparentSvgDataUrl(paddedBounds.width, paddedBounds.height),
        category: 'Saved groups',
        custom: true,
        naturalWidth: paddedBounds.width,
        naturalHeight: paddedBounds.height,
        groupBounds: {
          x: 0,
          y: 0,
          width: paddedBounds.width,
          height: paddedBounds.height,
        },
        groupedLayers: layersToSave.map((layer) => createSavedGroupLayerSnapshot(layer, paddedBounds)),
      };

      setBrandAssets((current) => [asset, ...current]);

      if (replaceSelection) {
        const selectedIdSet = new Set(layersToSave.map((layer) => layer.id));
        const firstSelectedIndex = activePage.layers.findIndex((layer) => selectedIdSet.has(layer.id));
        const groupedLayer: DesignAssetLayer = {
          id: createDesignId('asset'),
          type: 'asset',
          name: assetName,
          assetId,
          x: paddedBounds.x,
          y: paddedBounds.y,
          width: paddedBounds.width,
          height: paddedBounds.height,
          rotation: 0,
          opacity: 1,
          visible: true,
          fit: 'contain',
        };

        updateActivePage((page) => {
          const nextLayers = page.layers.filter((layer) => !selectedIdSet.has(layer.id));
          const insertIndex = firstSelectedIndex < 0
            ? nextLayers.length
            : page.layers.slice(0, firstSelectedIndex).filter((layer) => !selectedIdSet.has(layer.id)).length;
          nextLayers.splice(insertIndex, 0, groupedLayer);
          return { ...page, layers: nextLayers };
        });
        selectSingleLayer(groupedLayer.id);
        setAssetLibraryMessage(`${assetName} saved and placed as one grouped asset.`);
        return;
      }

      setAssetLibraryMessage(`${assetName} saved to the Asset library.`);
    } catch (error) {
      setAssetLibraryMessage(error instanceof Error ? error.message : 'Could not save this selection as an asset.');
    }
  }

  function ungroupAssetLayer(layer: DesignAssetLayer) {
    if (layer.locked) return;
    const asset = assetLibrary[layer.assetId];
    const groupedLayers = getSavedGroupLayers(asset || ({} as DesignAsset));
    if (!asset || groupedLayers.length === 0) {
      setAssetLibraryMessage('This asset was not saved with editable group layers.');
      return;
    }

    const restoredLayers = groupedLayers.map((savedLayer) => createUngroupedLayerSnapshot(savedLayer, layer, asset));
    updateActivePage((page) => {
      const layerIndex = page.layers.findIndex((item) => item.id === layer.id);
      if (layerIndex < 0) return page;
      const nextLayers = [...page.layers];
      nextLayers.splice(layerIndex, 1, ...restoredLayers);
      return { ...page, layers: nextLayers };
    });

    const restoredLayerIds = restoredLayers.map((restoredLayer) => restoredLayer.id);
    selectedLayerIdsRef.current = restoredLayerIds;
    selectedLayerIdRef.current = restoredLayerIds.at(-1) || null;
    setSelectedLayerIds(restoredLayerIds);
    setSelectedLayerIdState(selectedLayerIdRef.current);
    setAssetLibraryMessage(`${asset.name} ungrouped into ${restoredLayers.length} layers.`);
  }

  function toggleLayerLock(id: string) {
    const layer = activePage.layers.find((item) => item.id === id);
    if (!layer) return;
    patchLayer(id, { locked: !layer.locked } as Partial<DesignLayer>);
  }

  function patchLayerDimension(layer: DesignLayer, dimension: 'width' | 'height', value: number) {
    if (layer.type === 'shape' && layer.shape === 'circle') {
      patchLayer(layer.id, { width: value, height: value } as Partial<DesignLayer>);
      return;
    }
    patchLayer(layer.id, { [dimension]: value } as Partial<DesignLayer>);
  }

  function insertTextIntoLayer(layer: DesignTextLayer, text: string) {
    const textarea = textLayerTextareaRef.current;
    const start = textarea?.selectionStart ?? layer.text.length;
    const end = textarea?.selectionEnd ?? layer.text.length;
    const insertion = text.startsWith('\n') ? text : text.length <= 2 ? `${text} ` : text;
    const nextText = `${layer.text.slice(0, start)}${insertion}${layer.text.slice(end)}`;
    patchLayer(layer.id, {
      text: nextText,
      richTextRuns: shiftInlineTextRunsForReplacement(layer, start, end, insertion.length),
    } as Partial<DesignLayer>);
    window.requestAnimationFrame(() => {
      const cursor = start + insertion.length;
      textLayerTextareaRef.current?.focus();
      textLayerTextareaRef.current?.setSelectionRange(cursor, cursor);
      setTextSelectionRange({ layerId: layer.id, start: cursor, end: cursor });
    });
  }

  function rememberTextSelection(layer: DesignTextLayer, element: HTMLTextAreaElement) {
    setTextSelectionRange({
      layerId: layer.id,
      start: element.selectionStart,
      end: element.selectionEnd,
    });
  }

  function getInspectorTextSelectionRange(layer: DesignTextLayer) {
    const textarea = textLayerTextareaRef.current;
    if (textarea && textarea.value === layer.text) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (end > start) return { start, end };
    }
    if (textSelectionRange?.layerId !== layer.id || textSelectionRange.end <= textSelectionRange.start) return null;
    return {
      start: clamp(textSelectionRange.start, 0, layer.text.length),
      end: clamp(textSelectionRange.end, 0, layer.text.length),
    };
  }

  function getActiveTextFormattingRange(layer: DesignTextLayer) {
    const canvasRange = getCanvasTextSelectionRange(layer.id, layer.text.length);
    if (canvasRange && canvasRange.end > canvasRange.start) return canvasRange;
    return getInspectorTextSelectionRange(layer);
  }

  function patchTextLayerFormat(layer: DesignTextLayer, format: DesignTextInlineFormat) {
    if (layer.locked) return;
    const range = getActiveTextFormattingRange(layer);
    if (range && range.end > range.start) {
      const richTextRuns = applyInlineTextFormat(layer, format, range);
      patchLayer(layer.id, { richTextRuns } as Partial<DesignLayer>);
      setTextSelectionRange({ layerId: layer.id, ...range });
      return;
    }

    if (format === 'bold') {
      patchLayer(layer.id, { fontWeight: layer.fontWeight >= 700 ? 500 : 800 } as Partial<DesignLayer>);
      return;
    }
    if (format === 'italic') {
      patchLayer(layer.id, { fontStyle: layer.fontStyle === 'italic' ? 'normal' : 'italic' } as Partial<DesignLayer>);
      return;
    }
    if (format === 'underline') {
      patchLayer(layer.id, { textDecoration: layer.textDecoration === 'underline' ? 'none' : 'underline' } as Partial<DesignLayer>);
      return;
    }
    patchLayer(layer.id, { textTransform: layer.textTransform === 'uppercase' ? 'none' : 'uppercase' } as Partial<DesignLayer>);
  }

  function alignLayerOnCanvas(layer: DesignLayer, alignment: DesignLayerAlignment) {
    if (layer.locked) return;
    const patch: Partial<DesignLayer> = {};
    if (alignment === 'left') patch.x = 0;
    if (alignment === 'centerX') patch.x = Math.round((design.width - layer.width) / 2);
    if (alignment === 'right') patch.x = Math.round(design.width - layer.width);
    if (alignment === 'top') patch.y = 0;
    if (alignment === 'centerY') patch.y = Math.round((design.height - layer.height) / 2);
    if (alignment === 'bottom') patch.y = Math.round(design.height - layer.height);
    patchLayer(layer.id, patch);
  }

  function changeAssetLayerAsset(layer: DesignAssetLayer, assetId: DesignAssetId) {
    const asset = assetLibrary[assetId];
    if (!asset) return;
    const patch: Partial<DesignAssetLayer> = {
      assetId,
      name: asset.name,
      color: canRecolorDesignAsset(asset) ? layer.color || asset.defaultColor || '#142334' : undefined,
    };
    patchLayer(layer.id, patch as Partial<DesignLayer>);
  }

  function saveDesign() {
    window.localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(designRef.current));
    setSaveMessage('Design saved on this browser.');
  }

  function resetDesign() {
    const nextDesign = createDefaultManifestoDesign();
    updateDesign(() => nextDesign);
    activePageIdRef.current = nextDesign.pages[0].id;
    setActivePageId(nextDesign.pages[0].id);
    selectSingleLayer('main-headline');
    setSaveMessage('');
    window.localStorage.removeItem(DESIGN_STORAGE_KEY);
  }

  function toggleCanvasGuide(key: keyof DesignCanvasGuides) {
    setCanvasGuides((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function changeCanvasZoom(delta: number) {
    setCanvasZoom((current) => clamp(current + delta, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM));
  }

  function fitCanvasZoom() {
    setCanvasZoom(100);
  }

  function setCanvasAspectRatio(width: number, height: number) {
    updateDesign((current) => resizeDesignCanvas(current, width, height));
  }

  function invertCanvasAspectRatio() {
    updateDesign((current) => resizeDesignCanvas(current, current.height, current.width));
  }

  async function exportPng() {
    if (!canvasRef.current) return;
    setExportState({ busy: true, message: 'Preparing PNG export...', tone: 'info' });
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await captureDesignCanvas(canvasRef.current, design, html2canvas);
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, `${slugifyFileName(`${design.title}-${activePage.name}`)}.png`);
      setExportState({ busy: false, message: 'PNG exported.', tone: 'info' });
    } catch (error) {
      setExportState({
        busy: false,
        message: error instanceof Error ? error.message : 'Could not export this design.',
        tone: 'error',
      });
    }
  }

  async function exportPdf() {
    if (!canvasRef.current) return;
    const exportDesign = designRef.current;
    if (!exportDesign.pages.length) return;

    const previousPageId = activePageIdRef.current;
    const previousSelectedLayerId = selectedLayerIdRef.current;
    const previousSelectedLayerIds = selectedLayerIdsRef.current;
    setExportState({
      busy: true,
      message: `Preparing ${exportDesign.pages.length}-page PDF export...`,
      tone: 'info',
    });

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const orientation = exportDesign.width > exportDesign.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [exportDesign.width, exportDesign.height],
        compress: true,
      });

      for (let index = 0; index < exportDesign.pages.length; index += 1) {
        const page = exportDesign.pages[index];
        activePageIdRef.current = page.id;
        selectedLayerIdRef.current = null;
        selectedLayerIdsRef.current = [];
        setActivePageId(page.id);
        setSelectedLayerIdState(null);
        setSelectedLayerIds([]);
        await waitForNextDesignPaint();

        const activeCanvasElement = canvasRef.current;
        if (!activeCanvasElement) throw new Error('Could not find the design canvas for PDF export.');

        const canvas = await captureDesignCanvas(activeCanvasElement, exportDesign, html2canvas);
        if (index > 0) pdf.addPage([exportDesign.width, exportDesign.height], orientation);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, exportDesign.width, exportDesign.height);
      }

      downloadBlob(pdf.output('blob'), `${slugifyFileName(`${exportDesign.title}-all-pages`)}.pdf`);
      setExportState({
        busy: false,
        message: `PDF exported with ${exportDesign.pages.length} page${exportDesign.pages.length === 1 ? '' : 's'}.`,
        tone: 'info',
      });
    } catch (error) {
      setExportState({
        busy: false,
        message: error instanceof Error ? error.message : 'Could not export this design as a PDF.',
        tone: 'error',
      });
    } finally {
      activePageIdRef.current = previousPageId;
      selectedLayerIdRef.current = previousSelectedLayerId;
      selectedLayerIdsRef.current = previousSelectedLayerIds;
      setActivePageId(previousPageId);
      setSelectedLayerIdState(previousSelectedLayerId);
      setSelectedLayerIds(previousSelectedLayerIds);
    }
  }

  return (
    <section data-hide-custom-cursor className="pb-10">
      <div className="grid gap-4">
        <div className="rounded-[8px] bg-white p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Design Studio</p>
              <h2 className="mt-2 font-serif text-[34px] leading-tight text-[#142334]">Build editable visual assets</h2>
              <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#142334]/64">
                Start with the Manifesto Note Graphic, then use the same page and layer engine for carousel and presentation formats.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDesign} className="studio-secondary-button">
                <Save className="h-4 w-4" />
                Save design
              </button>
              <button type="button" onClick={() => void exportPdf()} disabled={exportState?.busy} className="studio-secondary-button">
                {exportState?.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </button>
              <button type="button" onClick={() => void exportPng()} disabled={exportState?.busy} className="studio-primary-button">
                {exportState?.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PNG
              </button>
              <button type="button" onClick={resetDesign} className="studio-ghost-button">
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {designFormatOptions.map((option) => {
              const selected = design.format === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateDesign((current) => ({ ...current, format: option.value }))}
                  className={`min-h-[96px] rounded-[8px] border p-4 text-left transition ${
                    selected
                      ? 'border-[#142334] bg-[#142334] text-white'
                      : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                  }`}
                >
                  <span className="block text-[12px] font-bold">{option.label}</span>
                  <span className={`mt-2 block text-[12px] leading-relaxed ${selected ? 'text-white/62' : 'text-[#142334]/58'}`}>
                    {option.detail}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Template workflow</p>
                <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">
                  {activeTemplateRecord ? `Editing "${activeTemplateRecord.name}"` : `${designTemplates.length} saved template${designTemplates.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startBlankDesign} className="studio-ghost-button">
                  <Plus className="h-4 w-4" />
                  Blank design
                </button>
                <button type="button" onClick={saveCurrentDesignAsTemplate} className="studio-secondary-button">
                  <Save className="h-4 w-4" />
                  Save as template
                </button>
                <button
                  type="button"
                  onClick={updateCurrentTemplate}
                  disabled={!activeTemplateRecord}
                  className="studio-primary-button disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Update template
                </button>
              </div>
            </div>

            {(carouselImportCount > 0 || textImportCount > 0) && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {carouselImportCount > 0 && (
                  <div className="rounded-[8px] bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel>Carousel drafts</FieldLabel>
                      <span className="rounded-full bg-[#F5F3EE] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                        {carouselImportCount}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {carouselImports.slice(0, 4).map((source) => {
                        const template = getCarouselTemplateOption(source.draft.template);
                        const preferredTemplate = getPreferredCarouselTemplateRecord(source.draft);
                        return (
                          <button
                            key={source.id}
                            type="button"
                            onClick={() => importCarouselDraft(source, preferredTemplate)}
                            className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 py-2 text-left transition hover:border-[#C9AD98] hover:bg-white"
                          >
                            <span className="block truncate text-[12px] font-bold text-[#142334]">{source.label}</span>
                            <span className="mt-1 block truncate text-[11px] text-[#142334]/55">
                              {source.sourceLabel} - {template.label}{preferredTemplate ? ` - ${preferredTemplate.name}` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {textImportCount > 0 && (
                  <div className="rounded-[8px] bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel>Generated text</FieldLabel>
                      <span className="rounded-full bg-[#F5F3EE] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                        {textImportCount}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {textImports.slice(0, 3).map((source) => (
                        (() => {
                          const preferredTemplate = getPreferredImportedTextTemplateRecord();
                          return (
                            <button
                              key={source.id}
                              type="button"
                              onClick={() => importTextDraft(source)}
                              className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 py-2 text-left transition hover:border-[#C9AD98] hover:bg-white"
                            >
                              <span className="block truncate text-[12px] font-bold text-[#142334]">{source.label}</span>
                              <span className="mt-1 block truncate text-[11px] text-[#142334]/55">
                                {source.sourceLabel}{preferredTemplate ? ` - ${preferredTemplate.name}` : ''}
                              </span>
                            </button>
                          );
                        })()
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {designTemplates.length > 0 && (
              <div className="mt-4 rounded-[8px] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Saved templates</FieldLabel>
                  <span className="rounded-full bg-[#F5F3EE] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
                    {designTemplates.length}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {designTemplates.slice(0, 8).map((template) => (
                    <div
                      key={template.id}
                      className={`group relative rounded-[8px] border bg-[#F8F6F4] p-3 transition ${
                        activeTemplateRecord?.id === template.id
                          ? 'border-[#142334] outline outline-2 outline-[#C9AD98]'
                          : 'border-[#E4D8CB] hover:border-[#C9AD98] hover:bg-white'
                      }`}
                    >
                      <button type="button" onClick={() => loadTemplateRecord(template)} className="block w-full text-left">
                        <span className="block truncate text-[12px] font-bold text-[#142334]">{template.name}</span>
                        <span className="mt-1 block truncate text-[11px] text-[#142334]/55">
                          {template.format === 'carousel' && template.sourceCarouselTemplate
                            ? getCarouselTemplateOption(template.sourceCarouselTemplate).label
                            : template.format.replace(/_/g, ' ')}
                        </span>
                      </button>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => loadTemplateRecord(template)}
                          className="min-h-8 rounded-[8px] border border-[#E4D8CB] bg-white px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#FBFAF8]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplateRecord(template)}
                          className="flex min-h-8 items-center justify-center gap-1 rounded-[8px] border border-red-100 bg-white px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templateMessage && (
              <p className="mt-3 rounded-[8px] bg-white px-3 py-2 text-[12px] leading-relaxed text-[#142334]/64">
                {templateMessage}
              </p>
            )}
          </div>

          {(saveMessage || exportState?.message) && (
            <div className="mt-4">
              {saveMessage && <PanelNotice tone="info">{saveMessage}</PanelNotice>}
              {exportState?.message && <PanelNotice tone={exportState.tone}>{exportState.message}</PanelNotice>}
            </div>
          )}
        </div>

        <div className="grid gap-3 xl:min-h-[calc(100vh-32px)] xl:grid-cols-[350px_minmax(0,750px)_420px] xl:items-start xl:justify-center 2xl:grid-cols-[380px_minmax(0,750px)_480px]">
          <aside
            className="grid min-w-0 gap-4 overflow-visible xl:sticky xl:top-4 xl:self-start"
            onWheel={trapDesignWheel}
          >
            <section className="rounded-[8px] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Pages</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">{design.pages.length} page{design.pages.length === 1 ? '' : 's'}</p>
                </div>
                <button type="button" onClick={addBlankPage} className="grid h-9 w-9 place-items-center rounded-full bg-[#142334] text-white transition hover:bg-[#27415E]" title="Add page">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {design.pages.map((page, index) => {
                  const pageIsActive = activePage.id === page.id;
                  return (
                    <div
                      key={page.id}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        if (draggingPageId && draggingPageId !== page.id) setPageDropTargetId(page.id);
                      }}
                      onDragOver={(event) => {
                        if (!draggingPageId || draggingPageId === page.id) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        if (pageDropTargetId !== page.id) setPageDropTargetId(page.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggingPageId) reorderPage(draggingPageId, page.id);
                        setDraggingPageId(null);
                        setPageDropTargetId(null);
                      }}
                      className={`group/page relative rounded-[8px] border transition ${
                        pageIsActive
                          ? 'border-[#142334] bg-[#142334] text-white'
                          : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                      } ${
                        draggingPageId === page.id ? 'opacity-45' : ''
                      } ${
                        pageDropTargetId === page.id && draggingPageId !== page.id ? 'ring-2 ring-[#C9AD98] ring-offset-2 ring-offset-[#F8F6F4]' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          activePageIdRef.current = page.id;
                          setActivePageId(page.id);
                          selectSingleLayer(page.layers.find((layer) => !layer.locked)?.id || null);
                        }}
                        className="min-w-0 w-full px-3 py-3 pr-28 text-left"
                      >
                        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] opacity-60">Page {index + 1}</span>
                        <span className="mt-1 block truncate text-[13px] font-semibold">{page.name}</span>
                      </button>
                      <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition group-hover/page:pointer-events-auto group-hover/page:opacity-100 group-focus-within/page:pointer-events-auto group-focus-within/page:opacity-100">
                        <span
                          draggable
                          title={`Drag ${page.name}`}
                          aria-label={`Drag ${page.name}`}
                          onMouseDown={(event) => event.stopPropagation()}
                          onDragStart={(event) => {
                            event.stopPropagation();
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', page.id);
                            setDraggingPageId(page.id);
                            setPageDropTargetId(null);
                          }}
                          onDragEnd={() => {
                            setDraggingPageId(null);
                            setPageDropTargetId(null);
                          }}
                          className={`grid h-7 w-7 cursor-grab place-items-center rounded-full border shadow-sm transition active:cursor-grabbing ${
                            pageIsActive
                              ? 'border-white/20 bg-white/10 text-white hover:bg-white/18'
                              : 'border-[#E4D8CB] bg-white/95 text-[#142334] hover:border-[#C9AD98] hover:bg-[#F8F6F4]'
                          }`}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                        <button
                          type="button"
                          title="Rename page"
                          aria-label={`Rename ${page.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            renamePage(page.id);
                          }}
                          className={`grid h-7 w-7 place-items-center rounded-full border shadow-sm transition ${
                            pageIsActive
                              ? 'border-white/20 bg-white/10 text-white hover:bg-white/18'
                              : 'border-[#E4D8CB] bg-white/95 text-[#142334] hover:border-[#C9AD98] hover:bg-[#F8F6F4]'
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete page"
                          aria-label={`Delete ${page.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePage(page.id);
                          }}
                          className={`grid h-7 w-7 place-items-center rounded-full border shadow-sm transition ${
                            pageIsActive
                              ? 'border-white/20 bg-white/10 text-red-100 hover:bg-white/18'
                              : 'border-red-100 bg-white/95 text-red-600 hover:border-red-200 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={duplicatePage} className="studio-ghost-button mt-3 w-full justify-center whitespace-normal text-center">
                <Layers3 className="h-4 w-4" />
                Duplicate page
              </button>
            </section>

            <section className="rounded-[8px] bg-white p-4 xl:min-h-[calc(100vh-360px)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Layers</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">{visibleLayerCount} visible</p>
                </div>
                <Layers3 className="h-4 w-4 text-[#C9AD98]" />
              </div>

              <div className="mt-3">
                <PanelTabs tabs={designSidebarTabs} value={sidebarTab} onChange={setSidebarTab} />
              </div>

              {sidebarTab === 'layers' && (
                <>
                  <p className="mt-3 rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[11px] leading-relaxed text-[#142334]/58">
                    Shift-click or Ctrl-click layers to select more than one.
                  </p>
                  <div className="design-studio-scroll-area mt-3 grid max-h-[520px] gap-2 overflow-y-auto overflow-x-hidden pr-2 xl:max-h-[calc(100vh-500px)]" onWheel={trapDesignWheel}>
                    {[...activePage.layers].reverse().map((layer) => {
                      const layerStackIndex = activePage.layers.findIndex((item) => item.id === layer.id);
                      const canMoveLayerUp = layerStackIndex >= 0 && layerStackIndex < activePage.layers.length - 1;
                      const canMoveLayerDown = layerStackIndex > 0;
                      const layerIsSelected = selectedLayerIds.includes(layer.id);
                      const layerPreviewLabel = getLayerPreviewLabel(layer, assetLibrary);
                      return (
                      <div
                        key={layer.id}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          if (draggingLayerId && draggingLayerId !== layer.id) setLayerDropTargetId(layer.id);
                        }}
                        onDragOver={(event) => {
                          if (!draggingLayerId || draggingLayerId === layer.id) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                          if (layerDropTargetId !== layer.id) setLayerDropTargetId(layer.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggingLayerId) reorderLayer(draggingLayerId, layer.id);
                          setDraggingLayerId(null);
                          setLayerDropTargetId(null);
                        }}
                        className={`group/layer relative grid min-w-0 grid-cols-1 items-center rounded-[8px] border transition ${
                          layerIsSelected
                            ? 'border-[#142334] bg-[#142334] text-white'
                            : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                        } ${
                          draggingLayerId === layer.id ? 'opacity-45' : ''
                        } ${
                          layerDropTargetId === layer.id && draggingLayerId !== layer.id ? 'ring-2 ring-[#C9AD98] ring-offset-2 ring-offset-[#F8F6F4]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(event) => selectLayer(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)}
                          className="min-w-0 px-3 py-2 text-left transition-[padding] group-hover/layer:pr-48 group-focus-within/layer:pr-48"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] opacity-60" title={layer.templateSlot ? getDesignTemplateSlotLabel(layer.templateSlot) : undefined}>
                            {layer.type === 'text' ? <Type className="h-3.5 w-3.5 shrink-0" /> : layer.type === 'shape' ? <Square className="h-3.5 w-3.5 shrink-0" /> : <ImageIcon className="h-3.5 w-3.5 shrink-0" />}
                            {layer.locked ? 'Locked' : layer.type}
                          </span>
                          <span className="mt-1 block truncate text-[12px] font-semibold" title={layerPreviewLabel}>
                            {getLayerCompactPreviewLabel(layer, assetLibrary)}
                          </span>
                        </button>
                        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition group-hover/layer:pointer-events-auto group-hover/layer:opacity-100 group-focus-within/layer:pointer-events-auto group-focus-within/layer:opacity-100">
                          <span
                            draggable
                            title={`Drag ${layerPreviewLabel}`}
                            aria-label={`Drag ${layerPreviewLabel}`}
                            onMouseDown={(event) => event.stopPropagation()}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', layer.id);
                              setDraggingLayerId(layer.id);
                              setLayerDropTargetId(null);
                            }}
                            onDragEnd={() => {
                              setDraggingLayerId(null);
                              setLayerDropTargetId(null);
                            }}
                            className="grid h-7 w-7 cursor-grab place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334] shadow-sm transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] active:cursor-grabbing"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </span>
                          <button
                            type="button"
                            title="Bring layer forward"
                            aria-label={`Bring ${layerPreviewLabel} forward`}
                            disabled={!canMoveLayerUp}
                            onClick={(event) => {
                              event.stopPropagation();
                              moveLayer(layer.id, 'up');
                            }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334] shadow-sm transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Send layer back"
                            aria-label={`Send ${layerPreviewLabel} back`}
                            disabled={!canMoveLayerDown}
                            onClick={(event) => {
                              event.stopPropagation();
                              moveLayer(layer.id, 'down');
                            }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334] shadow-sm transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                            aria-label={layer.locked ? `Unlock ${layerPreviewLabel}` : `Lock ${layerPreviewLabel}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334] shadow-sm transition hover:border-[#C9AD98] hover:bg-[#F8F6F4]"
                          >
                            {layer.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </button>
                          {!layer.locked && (
                            <>
                              <button
                                type="button"
                                title="Duplicate layer"
                                aria-label={`Duplicate ${layerPreviewLabel}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  duplicateLayer(layer.id);
                                }}
                                className="grid h-7 w-7 place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334] shadow-sm transition hover:border-[#C9AD98] hover:bg-[#F8F6F4]"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete layer"
                                aria-label={`Delete ${layerPreviewLabel}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteLayer(layer.id);
                                }}
                                className="grid h-7 w-7 place-items-center rounded-full border border-red-100 bg-white/95 text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              )}

              {sidebarTab === 'add' && (
                <div className="mt-3 grid gap-3">
                  <button
                    type="button"
                    onClick={addTextLayer}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-white"
                  >
                    <Type className="h-4 w-4" />
                    Text
                  </button>
                  <div className="grid grid-cols-4 gap-2">
                    {designShapeOptions.map((shape) => {
                      const Icon = shape.icon;
                      return (
                        <button
                          key={shape.value}
                          type="button"
                          onClick={() => addShapeLayer(shape.value)}
                          className="grid min-h-11 place-items-center rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] transition hover:border-[#C9AD98] hover:bg-white"
                          title={`Add ${shape.label.toLowerCase()}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sidebarTab === 'arrange' && (
                <div className="mt-3 grid gap-3">
                  {hasMultiSelection ? (
                    <>
                      <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Selection</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#142334]">{selectedLayers.length} layers selected</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#142334]/58">
                          Drag any selected unlocked layer to move the selection together.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => void saveSelectionAsAsset({ replaceSelection: false })}
                          disabled={selectedGroupableLayers.length < 2}
                          className="studio-secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Save selection as asset
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveSelectionAsAsset({ replaceSelection: true })}
                          disabled={selectedGroupableLayers.length < 2}
                          className="studio-primary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Group into asset
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button type="button" onClick={duplicateSelectedLayers} className="studio-ghost-button justify-center">
                          Duplicate
                        </button>
                        <button type="button" onClick={deleteSelectedLayers} className="studio-ghost-button justify-center">
                          Delete
                        </button>
                      </div>
                    </>
                  ) : !selectedLayer ? (
                    <p className="rounded-[8px] border border-dashed border-[#E4D8CB] bg-[#F8F6F4] px-3 py-4 text-center text-[12px] leading-relaxed text-[#142334]/56">
                      Select a layer to arrange it.
                    </p>
                  ) : (
                    <>
                      <CanvasAlignmentControl
                        disabled={selectedLayer.locked}
                        onAlign={(alignment) => alignLayerOnCanvas(selectedLayer, alignment)}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => moveLayer(selectedLayer.id, 'up')}
                          disabled={selectedLayer.locked || activePage.layers.findIndex((layer) => layer.id === selectedLayer.id) >= activePage.layers.length - 1}
                          className="studio-ghost-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ArrowUp className="h-4 w-4" />
                          Forward
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLayer(selectedLayer.id, 'down')}
                          disabled={selectedLayer.locked || activePage.layers.findIndex((layer) => layer.id === selectedLayer.id) <= 0}
                          className="studio-ghost-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ArrowDown className="h-4 w-4" />
                          Backward
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLayerToEdge(selectedLayer.id, 'front')}
                          disabled={selectedLayer.locked || activePage.layers.findIndex((layer) => layer.id === selectedLayer.id) >= activePage.layers.length - 1}
                          className="studio-ghost-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <BringToFront className="h-4 w-4" />
                          To front
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLayerToEdge(selectedLayer.id, 'back')}
                          disabled={selectedLayer.locked || activePage.layers.findIndex((layer) => layer.id === selectedLayer.id) <= 0}
                          className="studio-ghost-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <SendToBack className="h-4 w-4" />
                          To back
                        </button>
                      </div>
                      {selectedLayer.type === 'asset' && selectedAsset?.groupedLayers?.length ? (
                        <button
                          type="button"
                          onClick={() => ungroupAssetLayer(selectedLayer)}
                          disabled={selectedLayer.locked}
                          className="studio-secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Ungroup className="h-4 w-4" />
                          Ungroup asset
                        </button>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => patchLayer(selectedLayer.id, { visible: !selectedLayer.visible } as Partial<DesignLayer>)}
                          className="studio-secondary-button justify-center"
                        >
                          {selectedLayer.visible ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLayer(selectedLayer.id)}
                          disabled={selectedLayer.locked}
                          className="studio-ghost-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </aside>

          <main
            className="design-studio-scroll-area min-w-0 rounded-[8px] bg-[#F8F6F4] p-1.5 xl:sticky xl:top-4 xl:self-start xl:overflow-x-hidden"
            onWheel={trapDesignWheel}
          >
            <div className="mb-3 flex flex-col items-center gap-3 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Canvas</p>
                <h3 className="mt-1 font-serif text-[26px] leading-tight text-[#142334]">{activePage.name}</h3>
              </div>
              <div className="grid w-full justify-items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-[#E4D8CB] bg-white p-1">
                    {designAspectRatioPresets.map((preset) => {
                      const active = activeAspectRatioLabel === preset.label;
                      const ratio = preset.height / preset.width;
                      const isSquare = Math.abs(ratio - 1) < 0.01;
                      const isTall = ratio > 1.5;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setCanvasAspectRatio(preset.width, preset.height)}
                          aria-pressed={active}
                          title={`Set canvas to ${preset.label}`}
                          className={`flex min-h-8 items-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                            active ? 'bg-[#142334] text-white' : 'text-[#142334]/62 hover:bg-[#F8F6F4] hover:text-[#142334]'
                          }`}
                        >
                          <span className="grid h-5 w-4 place-items-center" aria-hidden="true">
                            <span
                              className="block rounded-[2px] border border-current"
                              style={{ width: isSquare ? 14 : isTall ? 8 : 11, height: isSquare ? 14 : isTall ? 16 : 14 }}
                            />
                          </span>
                          {preset.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={invertCanvasAspectRatio}
                      title="Invert canvas aspect ratio"
                      aria-label="Invert canvas aspect ratio"
                      className="grid min-h-8 min-w-8 place-items-center rounded-full text-[#142334]/62 transition hover:bg-[#F8F6F4] hover:text-[#142334]"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-[#E4D8CB] bg-white p-1" aria-label="Canvas zoom controls">
                    <button
                      type="button"
                      onClick={() => changeCanvasZoom(-CANVAS_ZOOM_STEP)}
                      disabled={canvasZoom <= MIN_CANVAS_ZOOM}
                      title="Zoom out"
                      aria-label="Zoom out"
                      className="grid min-h-8 min-w-8 place-items-center rounded-full text-[#142334]/62 transition hover:bg-[#F8F6F4] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-12 text-center text-[11px] font-bold tabular-nums tracking-[0.08em] text-[#142334]">{canvasZoom}%</span>
                    <button
                      type="button"
                      onClick={() => changeCanvasZoom(CANVAS_ZOOM_STEP)}
                      disabled={canvasZoom >= MAX_CANVAS_ZOOM}
                      title="Zoom in"
                      aria-label="Zoom in"
                      className="grid min-h-8 min-w-8 place-items-center rounded-full text-[#142334]/62 transition hover:bg-[#F8F6F4] hover:text-[#142334] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={fitCanvasZoom}
                      className="min-h-8 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334]/62 transition hover:bg-[#F8F6F4] hover:text-[#142334]"
                    >
                      Fit
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { key: 'grid' as const, label: 'Grid' },
                    { key: 'safeArea' as const, label: 'Safe area' },
                    { key: 'bleed' as const, label: 'Bleed' },
                  ].map((guide) => {
                    const active = canvasGuides[guide.key];
                    return (
                      <button
                        key={guide.key}
                        type="button"
                        onClick={() => toggleCanvasGuide(guide.key)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                          active
                            ? 'border-[#142334] bg-[#142334] text-white'
                            : 'border-[#E4D8CB] bg-white text-[#142334]/58 hover:border-[#C9AD98] hover:text-[#142334]'
                        }`}
                      >
                        {guide.label}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1 rounded-full border border-[#E4D8CB] bg-white p-1" aria-label="Design history controls">
                    <button
                      type="button"
                      onClick={undoDesignChange}
                      disabled={!canUndo}
                      title="Undo"
                      aria-label="Undo"
                      className={`grid min-h-8 min-w-8 place-items-center rounded-full transition ${
                        canUndo ? 'text-[#142334]/70 hover:bg-[#F8F6F4] hover:text-[#142334]' : 'cursor-not-allowed text-[#142334]/26'
                      }`}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={redoDesignChange}
                      disabled={!canRedo}
                      title="Redo"
                      aria-label="Redo"
                      className={`grid min-h-8 min-w-8 place-items-center rounded-full transition ${
                        canRedo ? 'text-[#142334]/70 hover:bg-[#F8F6F4] hover:text-[#142334]' : 'cursor-not-allowed text-[#142334]/26'
                      }`}
                    >
                      <Redo2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <DesignCanvas
              design={design}
              page={activePage}
              assetLibrary={assetLibrary}
              selectedLayerId={selectedLayerId}
              selectedLayerIds={selectedLayerIds}
              guides={canvasGuides}
              zoom={canvasZoom}
              canvasRef={canvasRef}
              onSelectLayer={selectLayer}
              onPatchLayer={patchLayer}
              onPatchLayers={patchLayers}
              onDeleteLayer={deleteLayer}
              onDuplicateLayer={duplicateLayer}
              onToggleLayerLock={toggleLayerLock}
            />
          </main>

          <aside
            ref={rightPanelRef}
            className="design-studio-scroll-area grid min-w-0 gap-4 overflow-x-hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-120px)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-2 [scrollbar-gutter:stable]"
            onWheel={trapDesignWheel}
          >
            <section className="rounded-[8px] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Content Vault</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#142334]/58">
                    {vaultImportCount} saved source{vaultImportCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-[#C9AD98]" />
                  <button
                    type="button"
                    onClick={() => setIsVaultPanelCollapsed((current) => !current)}
                    aria-expanded={!isVaultPanelCollapsed}
                    aria-controls="design-studio-content-vault-panel"
                    title={isVaultPanelCollapsed ? 'Expand Content Vault' : 'Collapse Content Vault'}
                    aria-label={isVaultPanelCollapsed ? 'Expand Content Vault' : 'Collapse Content Vault'}
                    className="grid h-8 w-8 place-items-center rounded-full border border-[#E4D8CB] bg-white text-[#142334]/62 transition hover:border-[#C9AD98] hover:bg-[#F8F6F4] hover:text-[#142334]"
                  >
                    {isVaultPanelCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {!isVaultPanelCollapsed && (
                <div id="design-studio-content-vault-panel">
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7466]" />
                    <input
                      value={vaultSearchQuery}
                      onChange={(event) => setVaultSearchQuery(event.target.value)}
                      placeholder="Search Vault copy"
                      className="studio-input pl-9 pr-9"
                    />
                    {vaultSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setVaultSearchQuery('')}
                        title="Clear Vault search"
                        aria-label="Clear Vault search"
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#142334]/45 transition hover:bg-[#F8F6F4] hover:text-[#142334]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    <FieldLabel>Select heading</FieldLabel>
                    <FilterDropdown
                      name="designVaultSource"
                      value={selectedVaultImport?.id || ''}
                      onChange={setSelectedVaultImportId}
                      ariaLabel="Select Vault content heading"
                      options={vaultDropdownOptions}
                      className="mt-2"
                      wrapLabels
                    />
                  </div>

                  {vaultMessage && (
                    <p className="mt-3 rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[12px] leading-relaxed text-[#142334]/62">
                      {vaultMessage}
                    </p>
                  )}

                  <div className="mt-3" onWheel={trapDesignWheel}>
                    {!selectedVaultImport ? (
                      <p className="rounded-[8px] border border-dashed border-[#E4D8CB] bg-[#F8F6F4] px-3 py-4 text-center text-[12px] leading-relaxed text-[#142334]/56">
                        {vaultImportCount === 0 ? 'No saved Vault copy yet.' : 'No Vault copy matches this search.'}
                      </p>
                    ) : (
                      <article className="min-w-0 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                        <div className="min-w-0">
                          <p className="break-words text-[12px] font-bold leading-snug text-[#142334]" title={selectedVaultImport.label}>
                            {getCompactVaultHeading(selectedVaultImport.label)}
                          </p>
                          <p className="mt-1 break-words text-[11px] leading-relaxed text-[#142334]/55">
                            {[selectedVaultImport.sourceLabel, selectedVaultImport.statusLabel, selectedVaultImport.platformLabel].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                        <div className="design-studio-scroll-area mt-3 max-h-[calc(100vh-430px)] min-h-48 overflow-y-auto overflow-x-hidden rounded-[8px] bg-white px-3 py-3 text-[12px] leading-relaxed text-[#142334]/72 [scrollbar-gutter:stable]">
                          <p className="whitespace-pre-wrap break-words">{selectedVaultImport.text}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => void copyVaultImportText(selectedVaultImport)} className="studio-ghost-button justify-center">
                              <Copy className="h-4 w-4" />
                              Copy
                          </button>
                          <button type="button" onClick={() => placeVaultImportText(selectedVaultImport)} className="studio-secondary-button justify-center">
                              <Type className="h-4 w-4" />
                              Place
                          </button>
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[8px] bg-white p-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#C9AD98]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Inspector</p>
              </div>

              {hasMultiSelection ? (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[8px] bg-[#F8F6F4] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Selection</p>
                    <p className="mt-2 font-serif text-[28px] leading-none text-[#142334]">{selectedLayers.length} layers</p>
                    <p className="mt-3 text-[12px] leading-relaxed text-[#142334]/62">
                      Move them together with drag or arrow keys, then save the selection as a reusable asset.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveSelectionAsAsset({ replaceSelection: false })}
                    disabled={selectedGroupableLayers.length < 2}
                    className="studio-secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Save selection as asset
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSelectionAsAsset({ replaceSelection: true })}
                    disabled={selectedGroupableLayers.length < 2}
                    className="studio-primary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Group into asset
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={duplicateSelectedLayers} className="studio-ghost-button justify-center">
                      Duplicate
                    </button>
                    <button type="button" onClick={deleteSelectedLayers} className="studio-ghost-button justify-center">
                      Delete
                    </button>
                  </div>
                </div>
              ) : !selectedLayer ? (
                <div className="mt-4 rounded-[8px] bg-[#F8F6F4] p-4 text-[13px] leading-relaxed text-[#142334]/62">
                  Select a layer on the canvas or layer list to edit its text, size, position, and styling.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <PanelTabs tabs={designInspectorTabs} value={inspectorTab} onChange={setInspectorTab} />

                  {inspectorTab === 'content' && (
                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <FieldLabel>Layer name</FieldLabel>
                        <input
                          value={selectedLayer.name}
                          onChange={(event) => patchLayer(selectedLayer.id, { name: event.target.value } as Partial<DesignLayer>)}
                          className="studio-input"
                        />
                      </label>

                      {selectedLayer.type === 'text' && (
                        <>
                          <label className="grid gap-2">
                            <FieldLabel>Text</FieldLabel>
                            <textarea
                              ref={textLayerTextareaRef}
                              value={selectedLayer.text}
                              onChange={(event) => {
                                patchLayer(selectedLayer.id, {
                                  text: event.target.value,
                                  richTextRuns: clampInlineTextRuns(selectedLayer.richTextRuns, event.target.value.length),
                                } as Partial<DesignLayer>);
                                rememberTextSelection(selectedLayer, event.currentTarget);
                              }}
                              onSelect={(event) => rememberTextSelection(selectedLayer, event.currentTarget)}
                              onKeyUp={(event) => rememberTextSelection(selectedLayer, event.currentTarget)}
                              onMouseUp={(event) => rememberTextSelection(selectedLayer, event.currentTarget)}
                              rows={5}
                              className="studio-input resize-y"
                            />
                          </label>

                          <label className="grid gap-2">
                            <FieldLabel>Template slot</FieldLabel>
                            <select
                              value={selectedLayer.templateSlot?.key || 'none'}
                              onChange={(event) =>
                                patchLayer(
                                  selectedLayer.id,
                                  getTemplateSlotPatch(design.format === 'carousel' ? 'carousel' : 'text', event.target.value as DesignTemplateSlotKey | 'none'),
                                )
                              }
                              className="studio-input"
                            >
                              <option value="none">None</option>
                              {designTemplateSlotOptions.map((slot) => (
                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                              ))}
                            </select>
                          </label>

                          <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => insertTextIntoLayer(selectedLayer, '\n')}
                                className="studio-card-action-button h-8 px-3"
                              >
                                Line break
                              </button>
                              <button
                                type="button"
                                onClick={() => setTextInsertOpen((current) => !current)}
                                className={`studio-card-action-button h-8 px-3 ${textInsertOpen ? 'border-[#142334] bg-[#142334] text-white' : ''}`}
                              >
                                <Plus className="h-3.5 w-3.5" /> Insert
                              </button>
                            </div>

                            {textInsertOpen && (
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                {textInsertCharacters.map((character) => (
                                  <button
                                    key={character}
                                    type="button"
                                    onClick={() => insertTextIntoLayer(selectedLayer, character)}
                                    className="min-h-9 rounded-[8px] border border-[#E4D8CB] bg-white px-2 text-[12px] font-semibold text-[#142334] transition hover:border-[#C9AD98] hover:bg-[#FBFAF8]"
                                  >
                                    {character}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {selectedLayer.type === 'asset' && (
                        <>
                          <label className="grid gap-2">
                            <FieldLabel>Asset</FieldLabel>
                            <select
                              value={selectedLayer.assetId}
                              disabled={selectedLayer.locked}
                              onChange={(event) => changeAssetLayerAsset(selectedLayer, event.target.value)}
                              className="studio-input"
                            >
                              {Object.values(assetLibrary).map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                              ))}
                            </select>
                          </label>
                          {selectedAsset?.groupedLayers?.length ? (
                            <button
                              type="button"
                              onClick={() => ungroupAssetLayer(selectedLayer)}
                              disabled={selectedLayer.locked}
                              className="studio-secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Ungroup className="h-4 w-4" />
                              Ungroup asset
                            </button>
                          ) : null}
                        </>
                      )}

                      {selectedLayer.type === 'shape' && (
                        <ShapeKindControl
                          value={selectedLayer.shape}
                          onChange={(value) => changeShapeLayerShape(selectedLayer.id, value)}
                        />
                      )}
                    </div>
                  )}

                  {inspectorTab === 'style' && (
                    <div className="grid gap-4">
                      {selectedLayer.type === 'text' && (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FontFamilyControl
                              value={selectedLayer.fontFamily}
                              onChange={(value) => patchLayer(selectedLayer.id, { fontFamily: value } as Partial<DesignLayer>)}
                            />
                            <AlignmentControl
                              value={selectedLayer.textAlign}
                              onChange={(value) => patchLayer(selectedLayer.id, { textAlign: value } as Partial<DesignLayer>)}
                            />
                          </div>

                          <div className="grid gap-2">
                            <FieldLabel>Format</FieldLabel>
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                type="button"
                                title="Bold"
                                aria-label="Bold"
                                aria-pressed={isInlineTextFormatActive(selectedLayer, 'bold', selectedTextFormatRange)}
                                onClick={() => patchTextLayerFormat(selectedLayer, 'bold')}
                                className={`grid min-h-10 place-items-center rounded-[8px] border transition ${
                                  isInlineTextFormatActive(selectedLayer, 'bold', selectedTextFormatRange)
                                    ? 'border-[#142334] bg-[#142334] text-white'
                                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                                }`}
                              >
                                <Bold className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Italic"
                                aria-label="Italic"
                                aria-pressed={isInlineTextFormatActive(selectedLayer, 'italic', selectedTextFormatRange)}
                                onClick={() => patchTextLayerFormat(selectedLayer, 'italic')}
                                className={`grid min-h-10 place-items-center rounded-[8px] border transition ${
                                  isInlineTextFormatActive(selectedLayer, 'italic', selectedTextFormatRange)
                                    ? 'border-[#142334] bg-[#142334] text-white'
                                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                                }`}
                              >
                                <Italic className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Underline"
                                aria-label="Underline"
                                aria-pressed={isInlineTextFormatActive(selectedLayer, 'underline', selectedTextFormatRange)}
                                onClick={() => patchTextLayerFormat(selectedLayer, 'underline')}
                                className={`grid min-h-10 place-items-center rounded-[8px] border transition ${
                                  isInlineTextFormatActive(selectedLayer, 'underline', selectedTextFormatRange)
                                    ? 'border-[#142334] bg-[#142334] text-white'
                                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                                }`}
                              >
                                <Underline className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Uppercase"
                                aria-label="Uppercase"
                                aria-pressed={isInlineTextFormatActive(selectedLayer, 'uppercase', selectedTextFormatRange)}
                                onClick={() => patchTextLayerFormat(selectedLayer, 'uppercase')}
                                className={`grid min-h-10 place-items-center rounded-[8px] border transition ${
                                  isInlineTextFormatActive(selectedLayer, 'uppercase', selectedTextFormatRange)
                                    ? 'border-[#142334] bg-[#142334] text-white'
                                    : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                                }`}
                              >
                                <Type className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <ColorControl
                              label="Text color"
                              value={selectedLayer.color}
                              onChange={(value) => {
                                if (value) patchLayer(selectedLayer.id, { color: value } as Partial<DesignLayer>);
                              }}
                            />
                            <ColorControl
                              label="Background"
                              value={selectedLayer.backgroundColor}
                              allowTransparent
                              onChange={(value) => patchLayer(selectedLayer.id, { backgroundColor: value } as Partial<DesignLayer>)}
                            />
                          </div>

                          <NumberControl label="Font size" value={selectedLayer.fontSize} min={10} max={120} onChange={(value) => patchLayer(selectedLayer.id, { fontSize: value } as Partial<DesignLayer>)} />
                          <NumberControl label="Font weight" value={selectedLayer.fontWeight} min={300} max={900} step={100} onChange={(value) => patchLayer(selectedLayer.id, { fontWeight: value } as Partial<DesignLayer>)} />
                          <NumberControl label="Line height" value={selectedLayer.lineHeight} min={0.8} max={1.8} step={0.02} onChange={(value) => patchLayer(selectedLayer.id, { lineHeight: value } as Partial<DesignLayer>)} />
                          <NumberControl label="Letter spacing" value={selectedLayer.letterSpacing || 0} min={0} max={12} step={0.5} onChange={(value) => patchLayer(selectedLayer.id, { letterSpacing: value } as Partial<DesignLayer>)} />
                          <CornerRadiusControl
                            layer={selectedLayer}
                            onChange={(patch) => patchLayer(selectedLayer.id, patch)}
                          />
                        </>
                      )}

                      {selectedLayer.type === 'asset' && (
                        <>
                          {selectedAsset && canRecolorDesignAsset(selectedAsset) ? (
                            <ColorControl
                              label="Icon color"
                              value={selectedLayer.color || selectedAsset.defaultColor || '#142334'}
                              onChange={(value) => {
                                if (value) patchLayer(selectedLayer.id, { color: value } as Partial<DesignLayer>);
                              }}
                            />
                          ) : (
                            <p className="rounded-[8px] border border-dashed border-[#E4D8CB] bg-[#F8F6F4] px-3 py-4 text-center text-[12px] leading-relaxed text-[#142334]/56">
                              This asset has no editable color controls.
                            </p>
                          )}
                          <CornerRadiusControl
                            layer={selectedLayer}
                            onChange={(patch) => patchLayer(selectedLayer.id, patch)}
                          />
                        </>
                      )}

                      {selectedLayer.type === 'shape' && (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <ColorControl
                              label="Fill"
                              value={selectedLayer.fillColor}
                              disabled={selectedLayer.shape === 'line'}
                              allowTransparent
                              onChange={(value) => patchLayer(selectedLayer.id, { fillColor: value || 'transparent' } as Partial<DesignLayer>)}
                            />
                            <ColorControl
                              label="Stroke"
                              value={selectedLayer.strokeColor}
                              onChange={(value) => {
                                if (value) patchLayer(selectedLayer.id, { strokeColor: value } as Partial<DesignLayer>);
                              }}
                            />
                          </div>

                          <NumberControl label="Stroke width" value={selectedLayer.strokeWidth} min={0} max={24} onChange={(value) => patchLayer(selectedLayer.id, { strokeWidth: value } as Partial<DesignLayer>)} />
                          {selectedLayer.shape === 'rectangle' && (
                            <CornerRadiusControl
                              layer={selectedLayer}
                              onChange={(patch) => patchLayer(selectedLayer.id, patch)}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {inspectorTab === 'position' && (
                    <div className="grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <NumberControl label="X" value={selectedLayer.x} min={-300} max={design.width} onChange={(value) => patchLayer(selectedLayer.id, { x: value } as Partial<DesignLayer>)} />
                        <NumberControl label="Y" value={selectedLayer.y} min={-300} max={design.height} onChange={(value) => patchLayer(selectedLayer.id, { y: value } as Partial<DesignLayer>)} />
                        <NumberControl label="Width" value={selectedLayer.width} min={24} max={design.width} onChange={(value) => patchLayerDimension(selectedLayer, 'width', value)} />
                        <NumberControl label="Height" value={selectedLayer.height} min={24} max={design.height} onChange={(value) => patchLayerDimension(selectedLayer, 'height', value)} />
                      </div>

                      <NumberControl label="Rotation" value={selectedLayer.rotation} min={-180} max={180} onChange={(value) => patchLayer(selectedLayer.id, { rotation: value } as Partial<DesignLayer>)} />
                      <NumberControl label="Opacity" value={selectedLayer.opacity} min={0.1} max={1} step={0.05} onChange={(value) => patchLayer(selectedLayer.id, { opacity: value } as Partial<DesignLayer>)} />

                      <div className="grid gap-2">
                        <FieldLabel>Flip</FieldLabel>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            title="Flip horizontal"
                            aria-label="Flip horizontal"
                            aria-pressed={Boolean(selectedLayer.flipX)}
                            onClick={() => patchLayer(selectedLayer.id, { flipX: !selectedLayer.flipX } as Partial<DesignLayer>)}
                            className={`flex min-h-10 items-center justify-center gap-2 rounded-[8px] border px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                              selectedLayer.flipX
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                            }`}
                          >
                            <FlipHorizontal className="h-4 w-4" />
                            Horizontal
                          </button>
                          <button
                            type="button"
                            title="Flip vertical"
                            aria-label="Flip vertical"
                            aria-pressed={Boolean(selectedLayer.flipY)}
                            onClick={() => patchLayer(selectedLayer.id, { flipY: !selectedLayer.flipY } as Partial<DesignLayer>)}
                            className={`flex min-h-10 items-center justify-center gap-2 rounded-[8px] border px-3 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                              selectedLayer.flipY
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] hover:border-[#C9AD98] hover:bg-white'
                            }`}
                          >
                            <FlipVertical className="h-4 w-4" />
                            Vertical
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectorTab === 'effects' && (
                    <div className="grid gap-3">
                      <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <FieldLabel>Outline</FieldLabel>
                          <button
                            type="button"
                            aria-pressed={Boolean(selectedLayer.outlineEnabled)}
                            onClick={() =>
                              patchLayer(selectedLayer.id, {
                                outlineEnabled: !selectedLayer.outlineEnabled,
                                outlineColor: selectedLayer.outlineColor || '#142334',
                                outlineWidth: selectedLayer.outlineWidth ?? 4,
                              } as Partial<DesignLayer>)
                            }
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                              selectedLayer.outlineEnabled
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#D8C8BB] bg-white text-[#142334]/62 hover:border-[#C9AD98] hover:text-[#142334]'
                            }`}
                          >
                            {selectedLayer.outlineEnabled ? 'On' : 'Off'}
                          </button>
                        </div>
                        {selectedLayer.outlineEnabled && (
                          <div className="mt-3 grid gap-3">
                            <ColorControl
                              label="Outline color"
                              value={selectedLayer.outlineColor || '#142334'}
                              onChange={(value) => {
                                if (value) patchLayer(selectedLayer.id, { outlineColor: value } as Partial<DesignLayer>);
                              }}
                            />
                            <NumberControl
                              label="Thickness"
                              value={selectedOutlineWidth}
                              min={1}
                              max={32}
                              onChange={(value) => patchLayer(selectedLayer.id, { outlineWidth: value } as Partial<DesignLayer>)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <FieldLabel>Blur</FieldLabel>
                          <button
                            type="button"
                            aria-pressed={Boolean(selectedLayer.blurEnabled)}
                            onClick={() =>
                              patchLayer(selectedLayer.id, {
                                blurEnabled: !selectedLayer.blurEnabled,
                                blurAmount: selectedLayer.blurAmount && selectedLayer.blurAmount > 0 ? selectedLayer.blurAmount : 6,
                              } as Partial<DesignLayer>)
                            }
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                              selectedLayer.blurEnabled
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#D8C8BB] bg-white text-[#142334]/62 hover:border-[#C9AD98] hover:text-[#142334]'
                            }`}
                          >
                            {selectedLayer.blurEnabled ? 'On' : 'Off'}
                          </button>
                        </div>
                        {selectedLayer.blurEnabled && (
                          <div className="mt-3">
                            <NumberControl
                              label="Amount"
                              value={selectedBlurAmount}
                              min={0}
                              max={40}
                              step={0.5}
                              onChange={(value) => patchLayer(selectedLayer.id, { blurAmount: value } as Partial<DesignLayer>)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <FieldLabel>Drop shadow</FieldLabel>
                          <button
                            type="button"
                            aria-pressed={Boolean(selectedLayer.shadowEnabled)}
                            onClick={() =>
                              patchLayer(selectedLayer.id, {
                                shadowEnabled: !selectedLayer.shadowEnabled,
                                shadowColor: selectedLayer.shadowColor || '#142334',
                                shadowOpacity: selectedLayer.shadowOpacity ?? 0.28,
                                shadowBlur: selectedLayer.shadowBlur ?? 22,
                                shadowOffsetX: selectedLayer.shadowOffsetX ?? 10,
                                shadowOffsetY: selectedLayer.shadowOffsetY ?? 14,
                              } as Partial<DesignLayer>)
                            }
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                              selectedLayer.shadowEnabled
                                ? 'border-[#142334] bg-[#142334] text-white'
                                : 'border-[#D8C8BB] bg-white text-[#142334]/62 hover:border-[#C9AD98] hover:text-[#142334]'
                            }`}
                          >
                            {selectedLayer.shadowEnabled ? 'On' : 'Off'}
                          </button>
                        </div>
                        {selectedLayer.shadowEnabled && (
                          <div className="mt-3 grid gap-3">
                            <ColorControl
                              label="Shadow color"
                              value={selectedLayer.shadowColor || '#142334'}
                              onChange={(value) => {
                                if (value) patchLayer(selectedLayer.id, { shadowColor: value } as Partial<DesignLayer>);
                              }}
                            />
                            <NumberControl
                              label="Direction"
                              value={selectedShadowDirection}
                              min={0}
                              max={359}
                              onChange={(value) =>
                                patchLayer(selectedLayer.id, getShadowOffsetPatch(value, selectedShadowOffset) as Partial<DesignLayer>)
                              }
                            />
                            <NumberControl
                              label="Offset"
                              value={selectedShadowOffset}
                              min={0}
                              max={100}
                              onChange={(value) =>
                                patchLayer(selectedLayer.id, getShadowOffsetPatch(selectedShadowDirection, value) as Partial<DesignLayer>)
                              }
                            />
                            <NumberControl label="Blur" value={selectedLayer.shadowBlur ?? 22} min={0} max={80} onChange={(value) => patchLayer(selectedLayer.id, { shadowBlur: value } as Partial<DesignLayer>)} />
                            <NumberControl
                              label="Transparency"
                              value={selectedShadowTransparency}
                              min={0}
                              max={100}
                              onChange={(value) => patchLayer(selectedLayer.id, { shadowOpacity: value / 100 } as Partial<DesignLayer>)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[8px] bg-white p-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#C9AD98]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Background</p>
              </div>
              <div className="mt-4 grid gap-4">
                <ColorControl
                  label="Background color"
                  value={activePage.background}
                  onChange={(value) => {
                    if (value) updateActivePage((page) => ({ ...page, background: value }));
                  }}
                />

                <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <FieldLabel>Paper texture</FieldLabel>
                      <p className="mt-1 text-[12px] leading-snug text-[#142334]/58">
                        {activePageHasPaperTexture ? 'Texture layer is on this page.' : 'Texture layer removed from this page.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={activePageHasPaperTexture ? removePaperTextureLayer : restorePaperTextureLayer}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                        activePageHasPaperTexture
                          ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                          : 'border-[#D8C8BB] bg-white text-[#142334]/62 hover:border-[#C9AD98] hover:text-[#142334]'
                      }`}
                    >
                      {activePageHasPaperTexture ? 'Remove' : 'Restore'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <FieldLabel>Background effects</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {backgroundEffectOptions.map((effect) => (
                      <EffectToggleButton
                        key={effect.key}
                        label={effect.label}
                        detail={effect.detail}
                        active={Boolean(activeBackgroundEffects[effect.key])}
                        onClick={() =>
                          patchActivePageBackgroundEffects({ [effect.key]: !activeBackgroundEffects[effect.key] } as Partial<DesignBackgroundEffects>)
                        }
                      />
                    ))}
                  </div>
                </div>

                {activeBackgroundEffects.gridLines && (
                  <NumberControl
                    label="Grid size"
                    value={activeBackgroundEffects.gridSize}
                    min={32}
                    max={180}
                    onChange={(value) => patchActivePageBackgroundEffects({ gridSize: value })}
                  />
                )}
              </div>
            </section>

            <section className="rounded-[8px] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#C9AD98]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Asset library</p>
                </div>
                <button
                  type="button"
                  onClick={() => brandAssetInputRef.current?.click()}
                  className="grid min-h-9 min-w-9 place-items-center rounded-full border border-[#E4D8CB] bg-[#F8F6F4] text-[#142334] transition hover:border-[#C9AD98] hover:bg-white"
                  title="Import brand assets"
                  aria-label="Import brand assets"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>
              <input
                ref={brandAssetInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  void importBrandAssetFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => brandAssetInputRef.current?.click()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#C9AD98] bg-[#F8F6F4] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:bg-white"
              >
                <Upload className="h-4 w-4" />
                Import brand assets
              </button>
              <label className="mt-3 block">
                <span className="sr-only">Search asset library</span>
                <span className="flex min-h-11 items-center gap-2 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 transition focus-within:border-[#C9AD98] focus-within:bg-white">
                  <Search className="h-4 w-4 shrink-0 text-[#142334]/45" />
                  <input
                    value={assetSearchQuery}
                    onChange={(event) => setAssetSearchQuery(event.target.value)}
                    placeholder="Search assets..."
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#142334] outline-none placeholder:text-[#142334]/38"
                  />
                  {assetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAssetSearchQuery('')}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#142334]/45 transition hover:bg-[#EFE6DF] hover:text-[#142334]"
                      aria-label="Clear asset search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </label>
              {assetLibraryMessage && (
                <p className="mt-2 rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[12px] leading-relaxed text-[#142334]/64">{assetLibraryMessage}</p>
              )}
              <div className="mt-4 grid gap-4">
                {Object.keys(groupedAssets).length === 0 && (
                  <p className="rounded-[8px] border border-dashed border-[#E4D8CB] bg-[#F8F6F4] px-3 py-4 text-center text-[12px] leading-relaxed text-[#142334]/56">
                    No assets match that search.
                  </p>
                )}
                {Object.entries(groupedAssets).map(([category, assets]) => (
                  <div key={category}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334]/48">{category}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="group relative rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-2 transition hover:border-[#C9AD98] hover:bg-white"
                        >
                          <button type="button" onClick={() => addAssetLayer(asset.id)} className="block w-full text-left">
                            <DesignAssetPreview asset={asset} assetLibrary={assetLibrary} />
                            <span className="mt-2 block truncate text-[11px] font-semibold leading-tight text-[#142334]/70">{asset.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAssetFromLibrary(asset.id)}
                            title={`Delete ${asset.name}`}
                            aria-label={`Delete ${asset.name}`}
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-[#E4D8CB] bg-white/95 text-[#142334]/62 opacity-100 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#C9AD98] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={scrollRightPanelToTop}
                data-design-right-rail-back-to-top="true"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#142334] transition hover:border-[#C9AD98] hover:bg-white"
              >
                <ArrowUp className="h-4 w-4" />
                Back to top
              </button>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
