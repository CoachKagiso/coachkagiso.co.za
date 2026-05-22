'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileDown,
  FileSearch,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
  Target,
  TriangleAlert,
  Upload,
} from 'lucide-react';

type CvGoal =
  | 'new_role'
  | 'career_pivot'
  | 'promotion'
  | 'leadership_visibility'
  | 'first_corporate_move'
  | 'executive_positioning';

type Seniority = 'early' | 'mid' | 'senior' | 'executive';
type AnalyzerMode = 'simple' | 'advanced';

type CvAnalyzerResult = {
  snapshot: string;
  scores: {
    positioning: number;
    clarity: number;
    roleFit: number;
    atsReadability: number;
  };
  recruiterRead: {
    headline: string;
    firstImpression: string;
    possibleConcern: string;
  };
  strongestSignals: string[];
  priorityFixes: Array<{ title: string; whyItMatters: string; fix: string }>;
  evidenceGaps: Array<{ title: string; detail: string; fix: string }>;
  rewriteSamples: Array<{ before: string; after: string; why: string }>;
  atsNotes: string[];
  interviewAngles: string[];
  nextActions: Array<{ title: string; detail: string }>;
  recommendedCoachMove: {
    label: string;
    reason: string;
  };
};
type ExportFormat = 'pdf' | 'docx';
type CvReportSection = {
  heading: string;
  lines: string[];
};

const cvGoalOptions: Array<{ value: CvGoal; label: string; detail: string }> = [
  { value: 'new_role', label: 'New role', detail: 'CV needs to compete for a specific next move.' },
  { value: 'career_pivot', label: 'Career pivot', detail: 'Experience needs to translate into a new direction.' },
  { value: 'promotion', label: 'Promotion', detail: 'CV needs stronger evidence of readiness for more.' },
  { value: 'leadership_visibility', label: 'Leadership visibility', detail: 'CV needs presence, judgment, and authority.' },
  { value: 'first_corporate_move', label: 'Corporate move', detail: 'CV needs clearer professional credibility.' },
  { value: 'executive_positioning', label: 'Executive positioning', detail: 'CV needs sharper strategic and commercial weight.' },
];

const seniorityOptions: Array<{ value: Seniority; label: string }> = [
  { value: 'early', label: 'Early career' },
  { value: 'mid', label: 'Mid-career' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];
const cvFileAccept = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
const maxCvFileBytes = 8 * 1024 * 1024;

function scoreLabel(value: number) {
  if (value >= 85) return 'Strong';
  if (value >= 70) return 'Clear';
  if (value >= 50) return 'Needs work';
  return 'Weak signal';
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCvReportSections(result: CvAnalyzerResult): CvReportSection[] {
  return [
    {
      heading: 'Snapshot',
      lines: [result.snapshot],
    },
    {
      heading: 'Scores',
      lines: [
        `Positioning: ${result.scores.positioning}/100`,
        `Clarity: ${result.scores.clarity}/100`,
        `Role fit: ${result.scores.roleFit}/100`,
        `ATS/readability: ${result.scores.atsReadability}/100`,
      ],
    },
    {
      heading: 'Recruiter read',
      lines: [
        result.recruiterRead.headline,
        result.recruiterRead.firstImpression,
        `Concern: ${result.recruiterRead.possibleConcern}`,
      ],
    },
    {
      heading: 'Strongest signals',
      lines: result.strongestSignals.map((item, index) => `${index + 1}. ${item}`),
    },
    {
      heading: 'Priority fixes',
      lines: result.priorityFixes.map((item, index) => (
        `${index + 1}. ${item.title}: ${item.fix}${item.whyItMatters ? ` Why it matters: ${item.whyItMatters}` : ''}`
      )),
    },
    {
      heading: 'Evidence gaps',
      lines: result.evidenceGaps.map((item, index) => `${index + 1}. ${item.title}: ${item.fix || item.detail}`),
    },
    {
      heading: 'Rewrite samples',
      lines: result.rewriteSamples.map((item, index) => {
        const before = item.before ? `Before: ${item.before} ` : '';
        return `${index + 1}. ${before}After: ${item.after}${item.why ? ` Why: ${item.why}` : ''}`;
      }),
    },
    {
      heading: 'ATS notes',
      lines: result.atsNotes.map((item, index) => `${index + 1}. ${item}`),
    },
    {
      heading: 'Interview angles',
      lines: result.interviewAngles.map((item, index) => `${index + 1}. ${item}`),
    },
    {
      heading: 'Next actions',
      lines: result.nextActions.map((item, index) => `${index + 1}. ${item.title}: ${item.detail}`),
    },
    {
      heading: 'Recommended coaching move',
      lines: [`${result.recommendedCoachMove.label}: ${result.recommendedCoachMove.reason}`],
    },
  ].filter((section) => section.lines.some(Boolean));
}

function formatCvReport(result: CvAnalyzerResult) {
  return [
    'CV Positioning Analysis',
    '',
    ...getCvReportSections(result).flatMap((section) => [section.heading, ...section.lines, '']),
  ].join('\n').trim();
}

function getLocalDateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getReportFileName(format: ExportFormat) {
  return `coach-kagiso-cv-analysis-${getLocalDateStamp()}.${format}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createPdfReportBlob(result: CvAnalyzerResult) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 46;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const addLine = (text: string, options: { size?: number; bold?: boolean; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const gap = options.gap ?? 8;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text || '-', textWidth) as string[];
    const lineHeight = size * 1.35;
    ensureSpace(wrapped.length * lineHeight + gap);
    doc.text(wrapped, margin, y);
    y += wrapped.length * lineHeight + gap;
  };

  doc.setTextColor(20, 35, 52);
  addLine('CV Positioning Analysis', { size: 22, bold: true, gap: 10 });
  doc.setTextColor(140, 116, 102);
  addLine(`Coach Kagiso | Generated ${getLocalDateStamp()}`, { size: 9, gap: 18 });

  for (const section of getCvReportSections(result)) {
    doc.setTextColor(20, 35, 52);
    addLine(section.heading, { size: 13, bold: true, gap: 8 });
    doc.setTextColor(52, 65, 79);
    section.lines.forEach((line) => addLine(line, { size: 10, gap: 6 }));
    y += 8;
  }

  return doc.output('blob');
}

async function createDocxReportBlob(result: CvAnalyzerResult) {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'CV Positioning Analysis', bold: true, size: 36, color: '142334' })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Coach Kagiso | Generated ${getLocalDateStamp()}`, size: 20, color: '8C7466' })],
      spacing: { after: 260 },
    }),
  ];

  for (const section of getCvReportSections(result)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, bold: true, size: 26, color: '142334' })],
        spacing: { before: 220, after: 100 },
      }),
    );

    section.lines.forEach((line) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line || '-', size: 21, color: '34414F' })],
          spacing: { after: 90 },
        }),
      );
    });
  }

  const doc = new Document({
    creator: 'Coach Kagiso',
    title: 'CV Positioning Analysis',
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const score = clampScore(value);
  return (
    <div className="rounded-[8px] border border-[#E4D8CB] bg-[#FCFBFA] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">{label}</p>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C7466]">
          {scoreLabel(score)}
        </span>
      </div>
      <p className="mt-4 font-serif text-[42px] leading-none text-[#142334]">{score}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6DDD6]">
        <span className="block h-full rounded-full bg-[#C9AD98]" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; detail?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[8px] border p-3 text-left transition ${
              active
                ? 'border-[#142334] bg-[#142334] text-white'
                : 'border-[#E4D8CB] bg-white text-[#142334] hover:border-[#C9AD98] hover:bg-[#FBFAF8]'
            }`}
          >
            <span className="block text-[13px] font-bold">{option.label}</span>
            {option.detail && (
              <span className={`mt-1 block text-[11px] leading-relaxed ${active ? 'text-white/62' : 'text-[#142334]/55'}`}>
                {option.detail}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; detail?: string; whyItMatters?: string; fix?: string }>;
}) {
  if (!items.length) return null;

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">{title}</p>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-[8px] border border-[#E4D8CB] bg-white p-4">
            <p className="font-semibold leading-tight text-[#142334]">{item.title}</p>
            {item.whyItMatters && <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">{item.whyItMatters}</p>}
            {item.detail && <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">{item.detail}</p>}
            {item.fix && <p className="mt-3 text-[13px] leading-relaxed text-[#142334]/78">{item.fix}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CvAnalyzerDashboard({ adminKey }: { adminKey: string }) {
  const [analyzerMode, setAnalyzerMode] = useState<AnalyzerMode>('simple');
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [targetRole, setTargetRole] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [goal, setGoal] = useState<CvGoal>('new_role');
  const [seniority, setSeniority] = useState<Seniority>('mid');
  const [result, setResult] = useState<CvAnalyzerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [copied, setCopied] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');

  const wordCount = useMemo(() => cvText.trim().split(/\s+/).filter(Boolean).length, [cvText]);
  const canAnalyze = (cvText.trim().length >= 300 || Boolean(cvFile)) && !busy;

  function getCvFileValidationError(file: File) {
    const lowerName = file.name.toLowerCase();
    if (file.size > maxCvFileBytes) return 'CV file must be 8MB or smaller.';
    if (lowerName.endsWith('.doc')) return 'Old .doc files are not supported yet. Save the CV as .docx or PDF first.';
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx') && !lowerName.endsWith('.txt')) {
      return 'Upload a PDF, Word .docx, or plain text CV.';
    }
    return '';
  }

  function handleCvFileSelect(file: File | null) {
    if (!file) return;
    const validationError = getCvFileValidationError(file);
    if (validationError) {
      setError(validationError);
      setCvFile(null);
      setFileInputKey((current) => current + 1);
      return;
    }
    setError('');
    setCopied(false);
    setCvFile(file);
  }

  function clearCvFile() {
    setCvFile(null);
    setFileInputKey((current) => current + 1);
  }

  async function analyzeCv() {
    if (!canAnalyze) return;

    setBusy(true);
    setError('');
    setExportError('');
    setBuildError('');
    setCopied(false);
    try {
      let response: Response;
      if (cvFile) {
        const formData = new FormData();
        formData.append('key', adminKey);
        formData.append('analysisMode', analyzerMode);
        formData.append('cvFile', cvFile);
        formData.append('targetRole', analyzerMode === 'advanced' ? targetRole : '');
        formData.append('contextNotes', analyzerMode === 'advanced' ? contextNotes : '');
        formData.append('goal', analyzerMode === 'advanced' ? goal : '');
        formData.append('seniority', analyzerMode === 'advanced' ? seniority : '');
        response = await fetch('/api/tools/cv-analyzer', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/tools/cv-analyzer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: adminKey,
            analysisMode: analyzerMode,
            cvText,
            targetRole: analyzerMode === 'advanced' ? targetRole : '',
            contextNotes: analyzerMode === 'advanced' ? contextNotes : '',
            goal: analyzerMode === 'advanced' ? goal : '',
            seniority: analyzerMode === 'advanced' ? seniority : '',
          }),
        });
      }
      const data = await response.json().catch(() => null) as { result?: CvAnalyzerResult; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Could not analyse this CV.');
      if (!data?.result) throw new Error('The analyzer returned an empty report.');
      setResult(data.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not analyse this CV.');
    } finally {
      setBusy(false);
    }
  }

  async function copyReport() {
    if (!result) return;
    await navigator.clipboard.writeText(formatCvReport(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function exportReport(format: ExportFormat) {
    if (!result || exporting) return;
    setExporting(format);
    setExportError('');
    try {
      const blob = format === 'pdf'
        ? await createPdfReportBlob(result)
        : await createDocxReportBlob(result);
      downloadBlob(blob, getReportFileName(format));
    } catch (caught) {
      console.error('CV report export error:', caught);
      setExportError('Could not export the report. Try again.');
    } finally {
      setExporting(null);
    }
  }

  async function generateAtsCv() {
    if (!result || building) return;
    setBuilding(true);
    setBuildError('');
    try {
      let response: Response;
      if (cvFile) {
        const formData = new FormData();
        formData.append('key', adminKey);
        formData.append('analysisMode', analyzerMode);
        formData.append('cvFile', cvFile);
        formData.append('targetRole', analyzerMode === 'advanced' ? targetRole : '');
        formData.append('contextNotes', analyzerMode === 'advanced' ? contextNotes : '');
        formData.append('goal', analyzerMode === 'advanced' ? goal : '');
        formData.append('seniority', analyzerMode === 'advanced' ? seniority : '');
        formData.append('analysis', JSON.stringify(result));
        response = await fetch('/api/tools/cv-builder', { method: 'POST', body: formData });
      } else {
        response = await fetch('/api/tools/cv-builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: adminKey,
            analysisMode: analyzerMode,
            cvText,
            targetRole: analyzerMode === 'advanced' ? targetRole : '',
            contextNotes: analyzerMode === 'advanced' ? contextNotes : '',
            goal: analyzerMode === 'advanced' ? goal : '',
            seniority: analyzerMode === 'advanced' ? seniority : '',
            analysis: result,
          }),
        });
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || 'Could not generate the CV.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      downloadBlob(blob, match?.[1] || `coach-kagiso-ats-cv-${getLocalDateStamp()}.docx`);
    } catch (caught) {
      console.error('CV build error:', caught);
      setBuildError(caught instanceof Error ? caught.message : 'Could not generate the CV.');
    } finally {
      setBuilding(false);
    }
  }

  return (
    <section id="career-tools" className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)]">
      <div className="rounded-[8px] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B6B]">Career Tools</p>
            <h1 className="mt-2 font-serif text-[36px] leading-tight text-[#142334]">CV Positioning Analyzer</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#142334]/64">
              Private dashboard analysis for CV clarity, positioning, role fit, and next coaching moves.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-[8px] bg-[#F7F1EC] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">
            <LockKeyhole className="h-3.5 w-3.5" />
            No report saved
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Upload CV</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[#142334]/58">PDF, Word .docx, or plain text. The file is read for this analysis only.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7466]">Max 8MB</span>
            </div>

            <label className="mt-3 grid min-h-[112px] cursor-pointer place-items-center rounded-[8px] border-2 border-dashed border-[#D8C8BB] bg-white p-5 text-center transition hover:border-[#C9AD98] hover:bg-[#FCFBFA]">
              <input
                key={fileInputKey}
                type="file"
                accept={cvFileAccept}
                className="sr-only"
                onChange={(event) => handleCvFileSelect(event.target.files?.[0] || null)}
              />
              <span className="grid justify-items-center">
                <Upload className="h-6 w-6 text-[#C9AD98]" />
                <span className="mt-2 text-[13px] font-bold text-[#142334]">{cvFile ? cvFile.name : 'Upload PDF, Word, or TXT CV'}</span>
                <span className="mt-1 text-[11px] text-[#142334]/55">{cvFile ? 'This file will be used instead of pasted text.' : 'Text-based PDFs work best. Scanned image PDFs may not extract.'}</span>
              </span>
            </label>

            {cvFile && (
              <button type="button" onClick={clearCvFile} className="studio-ghost-button mt-3">
                <RefreshCcw className="h-4 w-4" />
                Clear file
              </button>
            )}
          </div>

          <label className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Paste CV text</span>
            <textarea
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              rows={13}
              placeholder="Paste the CV text here..."
              className="min-h-[330px] rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
            />
            <span className="text-[11px] font-medium text-[#142334]/50">{wordCount} words</span>
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-[8px] bg-[#F8F6F4] p-2">
            {([
              ['simple', 'Simple'],
              ['advanced', 'Advanced'],
            ] as const).map(([value, label]) => {
              const active = analyzerMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAnalyzerMode(value);
                    setError('');
                  }}
                  className={`h-11 rounded-[8px] text-[12px] font-bold uppercase tracking-[0.16em] transition ${
                    active
                      ? 'bg-[#142334] text-white shadow-[0_10px_24px_rgba(20,35,52,0.16)]'
                      : 'bg-white text-[#142334]/62 hover:text-[#142334]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {analyzerMode === 'advanced' && (
            <div className="grid gap-4 rounded-[8px] border border-[#E4D8CB] bg-[#FCFBFA] p-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Career goal</span>
                <div className="mt-2">
                  <PillGroup value={goal} options={cvGoalOptions} onChange={setGoal} />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Seniority</span>
                <div className="mt-2">
                  <PillGroup value={seniority} options={seniorityOptions} onChange={setSeniority} />
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Target role or job description</span>
                <textarea
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  rows={5}
                  placeholder="Optional: paste the role title, job description, or next move..."
                  className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Context notes</span>
                <textarea
                  value={contextNotes}
                  onChange={(event) => setContextNotes(event.target.value)}
                  rows={4}
                  placeholder="Optional: add what Kagiso knows about this person, their concern, or the session context..."
                  className="rounded-[8px] border border-[#E4D8CB] bg-[#F8F6F4] px-4 py-3 text-[14px] leading-relaxed text-[#142334] outline-none transition placeholder:text-[#A09086] focus:border-[#BFA490] focus:bg-white focus:ring-2 focus:ring-[#BFA490]/25"
                />
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[13px] font-semibold text-[#7A2F22]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void analyzeCv()}
            disabled={!canAnalyze}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#142334] px-5 text-[12px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#C9AD98] hover:text-[#142334] disabled:cursor-not-allowed disabled:bg-[#D8C8BB] disabled:text-[#142334]/45"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {busy ? 'Analysing CV...' : 'Analyze CV'}
          </button>
        </div>
      </div>

      <aside className="rounded-[8px] bg-[#142334] p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Analyzer output</p>
            <h2 className="mt-2 font-serif text-[32px] leading-tight">Positioning report</h2>
          </div>
          {result && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyReport()} className="studio-secondary-button">
                <ClipboardCheck className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy report'}
              </button>
              <button
                type="button"
                onClick={() => void exportReport('pdf')}
                disabled={Boolean(exporting)}
                className="studio-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => void exportReport('docx')}
                disabled={Boolean(exporting)}
                className="studio-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Export DOCX
              </button>
            </div>
          )}
        </div>

        {exportError && (
          <div className="mt-3 rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[13px] font-semibold text-[#7A2F22]">
            {exportError}
          </div>
        )}

        {!result ? (
          <div className="mt-5 grid min-h-[640px] place-items-center rounded-[8px] border border-white/10 bg-white/5 p-6 text-center">
            <div className="max-w-sm">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-[#C9AD98]" />
              <p className="mt-5 font-serif text-[28px] leading-tight">Ready for a private CV read.</p>
              <p className="mt-3 text-[13px] leading-relaxed text-white/58">
                Upload or paste the CV for a quick read, or switch to Advanced when you want a specific goal and role lens.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="rounded-[8px] bg-white p-4 text-[#142334]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#F7F1EC] text-[#8C7466]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Snapshot</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#142334]/78">{result.snapshot}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreCard label="Positioning" value={result.scores.positioning} />
              <ScoreCard label="Clarity" value={result.scores.clarity} />
              <ScoreCard label="Role fit" value={result.scores.roleFit} />
              <ScoreCard label="ATS basics" value={result.scores.atsReadability} />
            </div>

            <div className="rounded-[8px] bg-white p-4 text-[#142334]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#F7F1EC] text-[#8C7466]">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8C7466]">Recruiter read</p>
                  <h3 className="mt-2 font-serif text-[24px] leading-tight">{result.recruiterRead.headline}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#142334]/76">{result.recruiterRead.firstImpression}</p>
                  <p className="mt-3 rounded-[8px] bg-[#FFF5F2] px-3 py-2 text-[13px] leading-relaxed text-[#7A2F22]">
                    {result.recruiterRead.possibleConcern}
                  </p>
                </div>
              </div>
            </div>

            {result.strongestSignals.length > 0 && (
              <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Strongest signals</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.strongestSignals.map((item) => (
                    <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[#142334]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#79A580]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <DetailList title="Priority fixes" items={result.priorityFixes} />
              <DetailList title="Evidence gaps" items={result.evidenceGaps} />
            </div>

            {result.rewriteSamples.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Rewrite samples</p>
                <div className="mt-3 grid gap-3">
                  {result.rewriteSamples.map((item, index) => (
                    <div key={`${item.after}-${index}`} className="rounded-[8px] bg-white p-4 text-[#142334]">
                      {item.before && (
                        <p className="rounded-[8px] bg-[#F8F6F4] px-3 py-2 text-[12px] leading-relaxed text-[#142334]/58">
                          {item.before}
                        </p>
                      )}
                      <p className="mt-3 text-[14px] font-semibold leading-relaxed text-[#142334]">{item.after}</p>
                      {item.why && <p className="mt-2 text-[12px] leading-relaxed text-[#142334]/58">{item.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">ATS notes</p>
                <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/74">
                  {result.atsNotes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.08] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Interview angles</p>
                <ul className="mt-3 grid gap-2 text-[13px] leading-relaxed text-white/74">
                  {result.interviewAngles.map((item) => (
                    <li key={item} className="flex gap-2">
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#C9AD98]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <DetailList title="Next actions" items={result.nextActions} />

            <div className="rounded-[8px] bg-[#C9AD98] p-4 text-[#142334]">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#142334]/62">Recommended coaching move</p>
              <h3 className="mt-2 font-serif text-[27px] leading-tight">{result.recommendedCoachMove.label}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#142334]/72">{result.recommendedCoachMove.reason}</p>
            </div>

            <div className="rounded-[8px] border border-white/12 bg-white/[0.08] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">ATS CV builder</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/64">
                Generate a finished, ATS-optimized Word CV for a Revamp or bundle client. It rebuilds the source CV
                using only facts already in it, strips sensitive personal data, and marks any missing numbers with
                [brackets] for you to confirm with the client.
              </p>
              {buildError && (
                <div className="mt-3 rounded-[8px] border border-[#C98672] bg-[#FFF5F2] px-4 py-3 text-[13px] font-semibold text-[#7A2F22]">
                  {buildError}
                </div>
              )}
              <button
                type="button"
                onClick={() => void generateAtsCv()}
                disabled={building}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#C9AD98] px-5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#142334] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {building ? 'Building ATS CV...' : 'Generate ATS-optimized CV (.docx)'}
              </button>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
