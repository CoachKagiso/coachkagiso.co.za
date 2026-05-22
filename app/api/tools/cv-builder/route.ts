import { NextResponse } from 'next/server';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import { buildAiRequestBody, resolveAiRuntimeConfig } from '@/lib/ai-config';
import { extractTextFromCvFile } from '@/lib/content/cv-extract';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const cvGoals = [
  'new_role',
  'career_pivot',
  'promotion',
  'leadership_visibility',
  'first_corporate_move',
  'executive_positioning',
] as const;
const seniorityLevels = ['early', 'mid', 'senior', 'executive'] as const;
const analyzerModes = ['simple', 'advanced'] as const;
const MAX_CV_CHARS = 60000;
const MAX_CONTEXT_CHARS = 16000;
const MAX_ANALYSIS_CHARS = 8000;

// A4 page geometry, in twips.
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => compactString(item))
    .filter(Boolean);
}

type BuiltExperience = {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

type BuiltEducation = {
  qualification: string;
  institution: string;
  year: string;
  details: string;
};

function experienceList(value: unknown): BuiltExperience[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 14)
    .map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        title: compactString(record.title),
        company: compactString(record.company),
        location: compactString(record.location),
        startDate: compactString(record.startDate),
        endDate: compactString(record.endDate),
        bullets: stringList(record.bullets, 12),
      };
    })
    .filter((item) => item.title || item.company || item.bullets.length > 0);
}

function educationList(value: unknown): BuiltEducation[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 8)
    .map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        qualification: compactString(record.qualification),
        institution: compactString(record.institution),
        year: compactString(record.year),
        details: compactString(record.details),
      };
    })
    .filter((item) => item.qualification || item.institution);
}

function normalizeBuiltCv(value: unknown) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const contact = record.contact && typeof record.contact === 'object'
    ? record.contact as Record<string, unknown>
    : {};

  return {
    fullName: compactString(record.fullName),
    headline: compactString(record.headline),
    contact: {
      email: compactString(contact.email),
      phone: compactString(contact.phone),
      location: compactString(contact.location),
      linkedin: compactString(contact.linkedin),
    },
    summary: compactString(record.summary),
    coreSkills: stringList(record.coreSkills, 30),
    experience: experienceList(record.experience),
    education: educationList(record.education),
    certifications: stringList(record.certifications, 15),
    additionalInfo: stringList(record.additionalInfo, 10),
  };
}

type BuiltCv = ReturnType<typeof normalizeBuiltCv>;

function buildCvBuilderSystemPrompt() {
  return `
You are Kagiso Shabangu's private CV production engine.

A client has paid for a CV Revamp or a full bundle. Your job is to rebuild their CV into a finished, ATS-optimized document that Kagiso can review, polish, and deliver.

ABSOLUTE INTEGRITY RULES
- Use ONLY facts that are present in the source CV. Never invent employers, job titles, dates, qualifications, certifications, institutions, or metrics.
- Where a measurable result is clearly missing, insert a bracketed placeholder, e.g. "[increased X by Y%]" or "[managed a team of N]", so Kagiso fills it in with the client. Never fabricate a number.
- Where a date is missing or unclear, use a bracketed placeholder like "[start date]". Do not guess.
- You may rephrase, restructure, and sharpen wording. You may not change the meaning of any fact.

ATS-OPTIMIZED WRITING
- Reverse-chronological work history (most recent role first).
- Every experience bullet starts with a strong action verb and is impact-first, not duty-first. Replace "Duties included..." and "Responsible for..." phrasing.
- Tighten every line. No walls of text. No first-person pronouns.
- Use standard, recruiter-readable language. Spell out acronyms once where the field expects it.
- Core skills must be real skills evidenced by the CV, written as short keyword phrases for ATS keyword matching.
- The professional summary is 3-4 sentences: who they are, their strongest evidence, and the direction implied by the career goal.

SOUTH AFRICAN CONTEXT
- Keep South African professional framing (Corporate SA, NQF levels, Matric, SETA credentials) where the source CV supports it.
- STRIP all sensitive data from the output entirely: RSA ID number, date of birth, age, home/residential address, marital status, dependants, next of kin, race/ethnicity/B-BBEE status, photo references, salary history, and "References available on request". Keep only city/province in the location field.
- Keep contact details limited to: professional email, phone number, city/province, and LinkedIn URL if present.

OUTPUT RULES
Respond only with valid JSON. No markdown. No code fences. Use this exact shape:
{
  "fullName": "Candidate full name from the CV",
  "headline": "Short professional headline, e.g. 'Financial Analyst | CIMA Candidate'",
  "contact": {
    "email": "professional email or empty string",
    "phone": "phone number or empty string",
    "location": "city, province or empty string",
    "linkedin": "LinkedIn URL or empty string"
  },
  "summary": "3-4 sentence professional summary.",
  "coreSkills": ["8-14 short keyword skill phrases evidenced by the CV"],
  "experience": [
    {
      "title": "Job title",
      "company": "Employer name",
      "location": "City, province or empty string",
      "startDate": "e.g. 'Jan 2021' or '[start date]'",
      "endDate": "e.g. 'Present' or 'Mar 2023' or '[end date]'",
      "bullets": ["3-6 impact-first achievement bullets per role"]
    }
  ],
  "education": [
    {
      "qualification": "Qualification name",
      "institution": "Institution name",
      "year": "Year or year range or '[year]'",
      "details": "NQF level, subjects, or distinctions if present, else empty string"
    }
  ],
  "certifications": ["Certifications, short courses, or learnerships present in the CV"],
  "additionalInfo": ["Optional: languages, professional memberships, or other credible extras present in the CV"]
}

Return experience in reverse-chronological order. Include every real role from the source CV. Leave arrays empty only when the CV genuinely has nothing for that section.
`.trim();
}

function buildCvBuilderUserPrompt({
  analysisMode,
  cvText,
  targetRole,
  contextNotes,
  goalLabel,
  seniorityLabel,
  analysisSummary,
}: {
  analysisMode: string;
  cvText: string;
  targetRole: string;
  contextNotes: string;
  goalLabel: string;
  seniorityLabel: string;
  analysisSummary: string;
}) {
  return [
    `<build_context>`,
    `Analysis mode: ${analysisMode}`,
    `Career goal: ${goalLabel}`,
    `Seniority: ${seniorityLabel}`,
    targetRole ? `Target role or job description:\n${targetRole}` : 'Target role or job description: Not provided',
    contextNotes ? `Kagiso context notes:\n${contextNotes}` : 'Kagiso context notes: Not provided',
    `</build_context>`,
    '',
    `<analysis_findings>`,
    analysisSummary
      ? `Apply these findings from the positioning analysis where they are supported by the CV:\n${analysisSummary}`
      : 'No prior analysis was provided. Rebuild from the CV directly.',
    `</analysis_findings>`,
    '',
    `<source_cv>`,
    cvText,
    `</source_cv>`,
    '',
    'Rebuild this CV as a finished, ATS-optimized document. Return only the JSON object.',
  ].join('\n');
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: '142334' })],
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21 })],
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 21 })],
  });
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || '';
}

function buildCvDocument(cv: BuiltCv) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: cv.headline ? 20 : 80 },
      children: [new TextRun({ text: cv.fullName || 'Candidate', bold: true, size: 40, color: '142334' })],
    }),
  );

  if (cv.headline) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: cv.headline, size: 23, color: '6B6B6B' })],
      }),
    );
  }

  const contactParts = [cv.contact.email, cv.contact.phone, cv.contact.location, cv.contact.linkedin].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '142334', space: 4 } },
        children: [new TextRun({ text: contactParts.join('   |   '), size: 20 })],
      }),
    );
  }

  if (cv.summary) {
    children.push(sectionHeading('Professional Summary'));
    children.push(bodyParagraph(cv.summary));
  }

  if (cv.coreSkills.length > 0) {
    children.push(sectionHeading('Core Skills'));
    children.push(bodyParagraph(cv.coreSkills.join('  |  ')));
  }

  if (cv.experience.length > 0) {
    children.push(sectionHeading('Professional Experience'));
    cv.experience.forEach((role) => {
      const titleRuns: TextRun[] = [];
      const titleLine = [role.title, role.company].filter(Boolean).join(', ');
      titleRuns.push(new TextRun({ text: titleLine || 'Role', bold: true, size: 22 }));
      const dateRange = formatDateRange(role.startDate, role.endDate);
      if (dateRange) {
        titleRuns.push(new TextRun({ text: `\t${dateRange}`, size: 20, color: '6B6B6B' }));
      }
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 0 },
          tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
          children: titleRuns,
        }),
      );
      if (role.location) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: role.location, italics: true, size: 20, color: '6B6B6B' })],
          }),
        );
      }
      role.bullets.forEach((bullet) => children.push(bulletParagraph(bullet)));
    });
  }

  if (cv.education.length > 0) {
    children.push(sectionHeading('Education'));
    cv.education.forEach((entry) => {
      const headRuns: TextRun[] = [
        new TextRun({ text: entry.qualification || 'Qualification', bold: true, size: 21 }),
      ];
      if (entry.year) {
        headRuns.push(new TextRun({ text: `\t${entry.year}`, size: 20, color: '6B6B6B' }));
      }
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 0 },
          tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
          children: headRuns,
        }),
      );
      const detailLine = [entry.institution, entry.details].filter(Boolean).join(' - ');
      if (detailLine) {
        children.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: detailLine, size: 20, color: '6B6B6B' })],
          }),
        );
      }
    });
  }

  if (cv.certifications.length > 0) {
    children.push(sectionHeading('Certifications & Courses'));
    cv.certifications.forEach((item) => children.push(bulletParagraph(item)));
  }

  if (cv.additionalInfo.length > 0) {
    children.push(sectionHeading('Additional Information'));
    cv.additionalInfo.forEach((item) => children.push(bulletParagraph(item)));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 21, color: '1F2933' },
          paragraph: { alignment: AlignmentType.LEFT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
          },
        },
        children,
      },
    ],
  });
}

function buildFileName(fullName: string) {
  const slug = fullName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'Candidate'}-ATS-CV.docx`;
}

function summarizeAnalysis(analysis: unknown) {
  if (!analysis || typeof analysis !== 'object') return '';
  try {
    return JSON.stringify(analysis).slice(0, MAX_ANALYSIS_CHARS);
  } catch {
    return '';
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  let key = '';
  let cvText = '';
  let targetRole = '';
  let contextNotes = '';
  let rawAnalysisMode = 'simple';
  let rawGoal = '';
  let rawSeniority = '';
  let analysisInput: unknown = null;
  let cvFile: File | null = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      key = String(formData.get('key') || '');
      cvText = compactString(formData.get('cvText'));
      targetRole = compactString(formData.get('targetRole')).slice(0, MAX_CONTEXT_CHARS);
      contextNotes = compactString(formData.get('contextNotes')).slice(0, MAX_CONTEXT_CHARS);
      rawAnalysisMode = String(formData.get('analysisMode') || 'simple');
      rawGoal = String(formData.get('goal') || '');
      rawSeniority = String(formData.get('seniority') || '');
      const rawAnalysis = compactString(formData.get('analysis'));
      analysisInput = rawAnalysis ? JSON.parse(rawAnalysis) : null;
      const uploadedFile = formData.get('cvFile');
      cvFile = uploadedFile instanceof File ? uploadedFile : null;
    } else {
      const body = await request.json().catch(() => null);
      key = String(body?.key || '');
      cvText = compactString(body?.cvText);
      targetRole = compactString(body?.targetRole).slice(0, MAX_CONTEXT_CHARS);
      contextNotes = compactString(body?.contextNotes).slice(0, MAX_CONTEXT_CHARS);
      rawAnalysisMode = String(body?.analysisMode || 'simple');
      rawGoal = String(body?.goal || '');
      rawSeniority = String(body?.seniority || '');
      analysisInput = body?.analysis ?? null;
    }
  } catch {
    return NextResponse.json({ error: 'Could not read CV builder input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analysisMode = includesValue(analyzerModes, rawAnalysisMode) ? rawAnalysisMode : 'simple';
  const goalLabel = analysisMode === 'advanced' && includesValue(cvGoals, rawGoal) ? rawGoal : 'Auto-infer from CV';
  const seniorityLabel = analysisMode === 'advanced' && includesValue(seniorityLevels, rawSeniority)
    ? rawSeniority
    : 'Auto-infer from CV';

  if (cvFile) {
    try {
      cvText = await extractTextFromCvFile(cvFile);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Could not extract text from that CV file.' },
        { status: 400 },
      );
    }
  }

  if (cvText.length < 300) {
    return NextResponse.json(
      { error: cvFile ? 'Could not extract enough readable text from that file. Try a text-based PDF, .docx, or paste the CV text.' : 'Provide the CV text before building.' },
      { status: 400 },
    );
  }

  if (cvText.length > MAX_CV_CHARS) {
    return NextResponse.json({ error: 'This CV is too long for one pass. Shorten it or build one version at a time.' }, { status: 400 });
  }

  const runtime = await resolveAiRuntimeConfig();
  if (!runtime) {
    return NextResponse.json(
      { error: 'AI service not configured. Add the active provider API key in Settings.' },
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: runtime.headers,
      body: JSON.stringify(buildAiRequestBody(runtime, {
        model: runtime.model,
        messages: [
          { role: 'system', content: buildCvBuilderSystemPrompt() },
          {
            role: 'user',
            content: buildCvBuilderUserPrompt({
              analysisMode,
              cvText,
              targetRole,
              contextNotes,
              goalLabel,
              seniorityLabel,
              analysisSummary: summarizeAnalysis(analysisInput),
            }),
          },
        ],
        max_tokens: 5200,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })),
    });
  } catch (error) {
    console.error(`${runtime.provider} CV builder network error:`, error);
    return NextResponse.json(
      { error: 'Failed to reach AI service. Check network and try again.' },
      { status: 502 },
    );
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`${runtime.provider} CV builder API error ${response.status}:`, responseText);
    return NextResponse.json(
      { error: `AI service returned an error (${response.status}). Try again.` },
      { status: response.status },
    );
  }

  let cv: BuiltCv;
  try {
    const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('EMPTY_AI_RESPONSE');
    cv = normalizeBuiltCv(extractToolJsonObject(text));
  } catch (error) {
    console.error('CV builder parse error:', error);
    return NextResponse.json({ error: 'AI service returned an unreadable CV. Try again.' }, { status: 500 });
  }

  if (!cv.summary || cv.experience.length === 0) {
    return NextResponse.json(
      { error: 'The builder returned an incomplete CV. Try again, or check the source CV has clear work history.' },
      { status: 500 },
    );
  }

  try {
    const doc = buildCvDocument(cv);
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${buildFileName(cv.fullName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('CV builder document error:', error);
    return NextResponse.json({ error: 'Could not assemble the CV document. Try again.' }, { status: 500 });
  }
}
