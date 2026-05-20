'use client';

import { useRef, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import {
  Bold,
  Check,
  Copy,
  Italic,
  List,
  ListOrdered,
  Plus,
  TextCursorInput,
} from 'lucide-react';

import { extractOutputMetadata } from '@/lib/content/utils';
import DashboardProfileAvatar from '@/components/dashboard/DashboardProfileAvatar';

type DraftMode = 'edit' | 'preview' | 'details';

const draftModeLabels: Record<DraftMode, string> = {
  edit: 'Edit draft',
  preview: 'Preview',
  details: 'Details',
};

const insertCharacters = [
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

const asciiUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const asciiLowercase = 'abcdefghijklmnopqrstuvwxyz';
const asciiDigits = '0123456789';

const boldCharacters = [
  ...Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1D400 + index)),
  ...Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1D41A + index)),
  ...Array.from({ length: 10 }, (_, index) => String.fromCodePoint(0x1D7CE + index)),
];

const italicLowercase = Array.from({ length: 26 }, (_, index) => (
  index === 7 ? String.fromCodePoint(0x210E) : String.fromCodePoint(0x1D44E + (index > 7 ? index + 1 : index))
));

const italicCharacters = [
  ...Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1D434 + index)),
  ...italicLowercase,
];

const boldMap = new Map(
  `${asciiUppercase}${asciiLowercase}${asciiDigits}`
    .split('')
    .map((char, index) => [char, boldCharacters[index] || char]),
);

const italicMap = new Map(
  `${asciiUppercase}${asciiLowercase}`
    .split('')
    .map((char, index) => [char, italicCharacters[index] || char]),
);

function OutputBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]">
      {children}
    </span>
  );
}

function DraftContextPill({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#F5F3EE] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#142334]">
      <span className="text-[#8C7466]">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function stopNestedScroll<T extends HTMLElement>(event: WheelEvent<T>) {
  const el = event.currentTarget;
  if (el.scrollHeight > el.clientHeight) {
    const atTop = el.scrollTop === 0;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 1;
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      event.preventDefault();
    }
    event.stopPropagation();
  }
}

export function OutputPanel({ value, className = '' }: { value: string; className?: string }) {
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

export function OutputWithActions({
  title,
  value,
  wordCount,
  platformLabel = 'LinkedIn',
  contentTypeLabel,
  registerLabel,
  pillarLabel = 'Career Growth',
  profilePhotoUrl,
  onChange,
  onRegenerate,
  onPolish,
  onSave,
  onCalendar,
  saveLabel = 'Save to Vault',
  extraAction,
  outputNote,
}: {
  title: string;
  value: string;
  wordCount: number;
  platformLabel?: string;
  contentTypeLabel?: string;
  registerLabel?: string;
  pillarLabel?: string;
  profilePhotoUrl?: string | null;
  onChange?: (value: string) => void;
  onRegenerate: () => void;
  onPolish: () => void;
  onSave: () => void;
  onCalendar: () => void;
  saveLabel?: string;
  extraAction?: ReactNode;
  outputNote?: ReactNode;
}) {
  const [mode, setMode] = useState<DraftMode>('edit');
  const [insertOpen, setInsertOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const outputMetadata = extractOutputMetadata(value);
  const editableValue = outputMetadata.body || value;
  const displayPlatform = outputMetadata.platform || platformLabel;
  const displayPillar = outputMetadata.pillar || pillarLabel;
  const displayRegister = outputMetadata.register || registerLabel;
  const displayWordCount = editableValue.trim() ? editableValue.trim().split(/\s+/).length : wordCount;
  const hasDraft = Boolean(editableValue.trim());

  function updateDraft(nextValue: string, selection?: { start: number; end: number }) {
    onChange?.(nextValue);
    if (selection) {
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(selection.start, selection.end);
      });
    }
  }

  function getSelection() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? editableValue.length;
    const end = textarea?.selectionEnd ?? editableValue.length;
    return { start, end };
  }

  function insertText(text: string) {
    const { start, end } = getSelection();
    const nextValue = `${editableValue.slice(0, start)}${text}${editableValue.slice(end)}`;
    updateDraft(nextValue, { start: start + text.length, end: start + text.length });
  }

  function transformSelection(transform: (text: string) => string, fallback: string) {
    const { start, end } = getSelection();
    const selectedText = editableValue.slice(start, end) || fallback;
    const replacement = transform(selectedText);
    const nextValue = `${editableValue.slice(0, start)}${replacement}${editableValue.slice(end)}`;
    updateDraft(nextValue, { start, end: start + replacement.length });
  }

  function applyLinePrefix(type: 'bullet' | 'numbered') {
    transformSelection((text) => {
      const lines = text.split('\n');
      if (lines.length === 1 && !text.trim()) return type === 'bullet' ? '\u2022 ' : '1. ';
      return lines
        .map((line, index) => {
          if (!line.trim()) return line;
          return type === 'bullet'
            ? `\u2022 ${line.replace(/^[-\u2022\u25E6\u25AA]\s*/, '')}`
            : `${index + 1}. ${line.replace(/^\d+\.\s*/, '')}`;
        })
        .join('\n');
    }, '');
  }

  function toStyledText(text: string, style: 'bold' | 'italic') {
    const map = style === 'bold' ? boldMap : italicMap;
    return text
      .split('')
      .map((char) => map.get(char) || char)
      .join('');
  }

  async function copyDraft() {
    if (!hasDraft) return;
    await navigator.clipboard.writeText(editableValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-[8px] bg-[#F5F3EE] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">{title}</p>
          <p className="mt-1 text-[12px] text-[#142334]/55">{displayWordCount} words</p>
          {outputNote && <div className="mt-2 text-[12px] italic text-[#142334]/60">{outputNote}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {value && <OutputBadge>Approval required</OutputBadge>}
        </div>
      </div>

      {hasDraft && (
        <div className="mt-4 rounded-[10px] border border-[#E4D8CB] bg-white px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Draft context</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <DraftContextPill label="Platform" value={displayPlatform} />
            <DraftContextPill label="Pillar" value={displayPillar} />
            <DraftContextPill label="Register" value={displayRegister} />
          </div>
        </div>
      )}

      {hasDraft && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[10px] bg-white p-1">
          {(['edit', 'preview', 'details'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`h-10 rounded-[8px] text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                mode === item ? 'bg-[#142334] text-white' : 'text-[#142334]/60 hover:bg-[#F5F3EE] hover:text-[#142334]'
              }`}
            >
              {draftModeLabels[item]}
            </button>
          ))}
        </div>
      )}

      {mode === 'edit' && hasDraft && (
        <div className="mt-4 rounded-[10px] bg-white p-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#E4D8CB] pb-3">
            <button
              type="button"
              onClick={() => transformSelection((text) => toStyledText(text, 'bold'), 'Bold text')}
              className="studio-card-action-icon"
              aria-label="Make selected text bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => transformSelection((text) => toStyledText(text, 'italic'), 'Italic text')}
              className="studio-card-action-icon"
              aria-label="Make selected text italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => applyLinePrefix('bullet')} className="studio-card-action-icon" aria-label="Add bullet list">
              <List className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => applyLinePrefix('numbered')} className="studio-card-action-icon" aria-label="Add numbered list">
              <ListOrdered className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => insertText('\n\n')} className="studio-card-action-button h-8 px-3">
              Line break
            </button>
            <button
              type="button"
              onClick={() => setInsertOpen((current) => !current)}
              className={`studio-card-action-button h-8 px-3 ${insertOpen ? 'border-[#142334] bg-[#142334] text-white' : ''}`}
            >
              <Plus className="h-3.5 w-3.5" /> Insert
            </button>
          </div>

          {insertOpen && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {insertCharacters.map((character) => (
                <button
                  key={character}
                  type="button"
                  onClick={() => insertText(character.length <= 2 ? `${character} ` : character)}
                  className="min-h-9 rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-2 text-[12px] font-semibold text-[#142334] transition hover:border-[#C9AD98] hover:bg-white"
                >
                  {character}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={editableValue}
            onChange={(event) => updateDraft(event.target.value)}
            onWheel={stopNestedScroll}
            className="mt-3 min-h-[420px] max-h-[62vh] w-full resize-y overflow-y-auto overscroll-contain rounded-[8px] border border-[#E4D8CB] bg-[#FBFAF8] px-4 py-4 font-sans text-[14px] leading-[1.75] text-[#142334] outline-none transition focus:border-[#C9AD98] focus:bg-white"
            spellCheck
          />
        </div>
      )}

      {mode === 'preview' && hasDraft && (
        <LinkedInPreview value={editableValue} platformLabel={displayPlatform} profilePhotoUrl={profilePhotoUrl} />
      )}

      {mode === 'details' && hasDraft && (
        <DraftDetails
          platformLabel={displayPlatform}
          contentTypeLabel={contentTypeLabel || title}
          registerLabel={displayRegister}
          pillarLabel={displayPillar}
          wordCount={displayWordCount}
        />
      )}

      {!hasDraft && <OutputPanel value={value} className="mt-4 min-h-[380px] bg-white" />}

      {value && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={copyDraft} className="studio-primary-button">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy draft'}
          </button>
          <button type="button" onClick={onRegenerate} className="studio-ghost-button">
            Regenerate
          </button>
          <button type="button" onClick={onPolish} className="studio-ghost-button">
            Polish this
          </button>
          <button type="button" onClick={onSave} className="studio-secondary-button">
            {saveLabel}
          </button>
          <button type="button" onClick={onCalendar} className="studio-primary-button">
            Add to Editorial Calendar
          </button>
        </div>
      )}
      {extraAction && <div className="mt-3">{extraAction}</div>}
    </div>
  );
}

function DraftDetails({
  platformLabel,
  contentTypeLabel,
  registerLabel,
  pillarLabel,
  wordCount,
}: {
  platformLabel: string;
  contentTypeLabel: string;
  registerLabel?: string;
  pillarLabel: string;
  wordCount: number;
}) {
  const details = [
    ['Writing register', registerLabel || 'Not selected'],
    ['Platform', platformLabel],
    ['Format', contentTypeLabel],
    ['Pillar', pillarLabel],
    ['Length', `${wordCount} words`],
  ];

  return (
    <div className="mt-4 rounded-[10px] bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F5F3EE] text-[#C9AD98]">
          <TextCursorInput className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">Draft details</p>
          <h3 className="mt-1 font-serif text-[24px] leading-tight text-[#142334]">What this draft is trying to do</h3>
        </div>
      </div>
      <dl className="mt-5 grid gap-3">
        {details.map(([label, detail]) => (
          <div key={label} className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-4 py-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">{label}</dt>
            <dd className="mt-1 text-[13px] font-semibold text-[#142334]">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LinkedInPreview({ value, platformLabel, profilePhotoUrl }: { value: string; platformLabel: string; profilePhotoUrl?: string | null }) {
  return (
    <div className="mt-4 rounded-[10px] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7466]">{platformLabel} preview</p>
        <span className="rounded-full bg-[#F5F3EE] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B]">
          Mock post
        </span>
      </div>
      <article className="mt-4 overflow-hidden rounded-[10px] border border-[#E4D8CB] bg-white">
        <div className="flex items-start gap-3 border-b border-[#E4D8CB] p-4">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#E4D8CB] bg-[#F5F3EE]">
            <DashboardProfileAvatar
              src={profilePhotoUrl}
              alt="Kagiso Shabangu"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#142334]">Coach Kagiso</p>
            <p className="text-[12px] leading-relaxed text-[#142334]/55">Kagiso Shabangu AIISA {'\u00B7'} 1st</p>
            <p className="text-[11px] text-[#142334]/45">Now {'\u2022'} Public</p>
          </div>
        </div>
        <div className="max-h-[58vh] overflow-y-auto overscroll-contain p-4" onWheel={stopNestedScroll}>
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7] text-[#142334]">{value}</pre>
        </div>
        <div className="border-t border-[#E4D8CB] px-4 py-3 text-[12px] text-[#142334]/55">
          <div className="flex items-center justify-between">
            <span>Helpful {'\u2022'} Insightful {'\u2022'} Repost</span>
            <span>12 comments</span>
          </div>
          <div className="mt-3 grid grid-cols-4 border-t border-[#E4D8CB] pt-3 text-center font-semibold text-[#142334]/62">
            <span>Like</span>
            <span>Comment</span>
            <span>Repost</span>
            <span>Send</span>
          </div>
        </div>
      </article>
    </div>
  );
}
