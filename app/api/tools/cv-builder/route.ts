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
const deliverables = ['cv', 'cover_letter', 'linkedin'] as const;
const MAX_CV_CHARS = 60000;
const MAX_CONTEXT_CHARS = 16000;
const MAX_ANALYSIS_CHARS = 8000;

type Deliverable = (typeof deliverables)[number];

// A4 page geometry, in twips.
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => compactString(item))
    .filter(Boolean);
}

function getLetterDate() {
  const date = new Date();
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/* ----------------------------- shared shapes ----------------------------- */

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
      const record = asRecord(item);
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
      const record = asRecord(item);
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
  const record = asRecord(value);
  const contact = asRecord(record.contact);

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

function normalizeCoverLetter(value: unknown) {
  const record = asRecord(value);
  return {
    candidateName: compactString(record.candidateName),
    contactLine: compactString(record.contactLine),
    recipientLine: compactString(record.recipientLine),
    salutation: compactString(record.salutation),
    bodyParagraphs: stringList(record.bodyParagraphs, 8),
    closingLine: compactString(record.closingLine),
    signature: compactString(record.signature),
  };
}

function linkedInExperienceList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 14)
    .map((item) => {
      const record = asRecord(item);
      return {
        title: compactString(record.title),
        company: compactString(record.company),
        summary: compactString(record.summary),
      };
    })
    .filter((item) => item.summary || item.title);
}

function normalizeLinkedIn(value: unknown) {
  const record = asRecord(value);
  return {
    fullName: compactString(record.fullName),
    headline: compactString(record.headline).slice(0, 220),
    about: compactString(record.about),
    experienceBlurbs: linkedInExperienceList(record.experienceBlurbs),
    skills: stringList(record.skills, 30),
  };
}

type BuiltCv = ReturnType<typeof normalizeBuiltCv>;
type BuiltCoverLetter = ReturnType<typeof normalizeCoverLetter>;
type BuiltLinkedIn = ReturnType<typeof normalizeLinkedIn>;

/* ------------------------------ AI prompts ------------------------------- */

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

TAILORING TO A TARGET ROLE
- If the build context includes a target role or job description, optimise this CV for that specific role: mirror its key terminology, surface the most relevant experience and skills first, and align the professional summary and headline to it.
- Tailoring means re-emphasising and re-wording real content. It NEVER means adding a skill, tool, or claim the CV does not support just because the job asks for it.

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

function buildCoverLetterSystemPrompt() {
  return `
You are Kagiso Shabangu's private cover letter writer.

A client has paid for a Cover Letter or a full bundle. Write a tailored, professional cover letter built from their CV.

ABSOLUTE INTEGRITY RULES
- Use ONLY facts present in the source CV. Never invent employers, achievements, metrics, or qualifications.
- If a target role or job description is provided, tailor the letter to it directly: mirror its priorities and language where the CV genuinely supports it.
- If no target role is provided, write a strong role-directed letter and use bracketed placeholders such as [Company Name], [Role Title], and [specific reason for interest]. Never invent a company or role.
- Use [brackets] for any specific detail the client must supply.

STYLE
- South African professional tone: confident, warm, and direct. Not generic, not flowery.
- 3-4 short body paragraphs: why this role, strongest relevant evidence, a second proof point or culture-fit angle, and a confident close.
- First person. Never "To whom it may concern". Do not restate the whole CV.
- Around 250-350 words across the body paragraphs.

OUTPUT RULES
Respond only with valid JSON. No markdown. No code fences. Use this exact shape:
{
  "candidateName": "Candidate full name from the CV",
  "contactLine": "email | phone | city | LinkedIn - include only what the CV provides",
  "recipientLine": "e.g. 'Hiring Manager' or '[Company Name] Hiring Team'",
  "salutation": "e.g. 'Dear Hiring Manager,'",
  "bodyParagraphs": ["3-4 body paragraphs, each a single string"],
  "closingLine": "e.g. 'Sincerely,'",
  "signature": "Candidate full name"
}
`.trim();
}

function buildLinkedInSystemPrompt() {
  return `
You are Kagiso Shabangu's private LinkedIn profile writer.

A client has paid for a LinkedIn Profile rewrite or a full bundle. Produce LinkedIn-ready copy built from their CV.

ABSOLUTE INTEGRITY RULES
- Use ONLY facts present in the source CV. Never invent employers, titles, metrics, or qualifications.
- Use [brackets] for any missing number the client must supply.

STYLE
- Headline: a sharp, keyword-rich positioning line, maximum 200 characters.
- About: written in FIRST PERSON, 3-5 short paragraphs, conversational but professional, ending with a light invitation to connect. This is LinkedIn convention, not CV convention.
- Experience blurbs: 2-4 sentences per role, impact-first, first person.
- Skills: short keyword phrases suitable for the LinkedIn skills section.
- Keep South African professional context where the CV supports it.

OUTPUT RULES
Respond only with valid JSON. No markdown. No code fences. Use this exact shape:
{
  "fullName": "Candidate full name from the CV",
  "headline": "LinkedIn headline, max 200 characters",
  "about": "About section text. Separate paragraphs with a blank line.",
  "experienceBlurbs": [
    { "title": "Job title", "company": "Employer name", "summary": "2-4 sentence first-person blurb" }
  ],
  "skills": ["15-25 skill keyword phrases evidenced by the CV"]
}

Return experience blurbs in reverse-chronological order, one per real role in the CV.
`.trim();
}

function systemPromptFor(deliverable: Deliverable) {
  if (deliverable === 'cover_letter') return buildCoverLetterSystemPrompt();
  if (deliverable === 'linkedin') return buildLinkedInSystemPrompt();
  return buildCvBuilderSystemPrompt();
}

function closingInstructionFor(deliverable: Deliverable) {
  if (deliverable === 'cover_letter') return 'Write the tailored cover letter. Return only the JSON object.';
  if (deliverable === 'linkedin') return 'Write the LinkedIn profile copy. Return only the JSON object.';
  return 'Rebuild this CV as a finished, ATS-optimized document. Return only the JSON object.';
}

function buildDeliverableUserPrompt({
  deliverable,
  analysisMode,
  cvText,
  targetRole,
  contextNotes,
  goalLabel,
  seniorityLabel,
  analysisSummary,
}: {
  deliverable: Deliverable;
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
      : 'No prior analysis was provided. Work from the CV directly.',
    `</analysis_findings>`,
    '',
    `<source_cv>`,
    cvText,
    `</source_cv>`,
    '',
    closingInstructionFor(deliverable),
  ].join('\n');
}

/* ---------------------------- docx rendering ----------------------------- */

const CV_BODY_FONT_SIZE = 24; // 12pt
const CV_SECTION_HEADING_FONT_SIZE = 28; // 14pt
const CV_SUBHEADING_FONT_SIZE = 26; // 13pt
const CV_META_FONT_SIZE = 23; // 11.5pt

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 2 } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: CV_SECTION_HEADING_FONT_SIZE,
        color: '142334',
      }),
    ],
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: CV_BODY_FONT_SIZE })],
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: CV_BODY_FONT_SIZE })],
  });
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || '';
}

function wrapDocument(children: Paragraph[]) {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: CV_BODY_FONT_SIZE, color: '1F2933' },
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
        children: [new TextRun({ text: cv.headline, size: CV_SUBHEADING_FONT_SIZE, color: '6B6B6B' })],
      }),
    );
  }

  const contactParts = [cv.contact.email, cv.contact.phone, cv.contact.location, cv.contact.linkedin].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '142334', space: 4 } },
        children: [new TextRun({ text: contactParts.join('   |   '), size: CV_META_FONT_SIZE })],
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
      titleRuns.push(new TextRun({ text: titleLine || 'Role', bold: true, size: CV_SUBHEADING_FONT_SIZE }));
      const dateRange = formatDateRange(role.startDate, role.endDate);
      if (dateRange) {
        titleRuns.push(new TextRun({ text: `\t${dateRange}`, size: CV_META_FONT_SIZE, color: '6B6B6B' }));
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
            children: [
              new TextRun({
                text: role.location,
                italics: true,
                size: CV_META_FONT_SIZE,
                color: '6B6B6B',
              }),
            ],
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
        new TextRun({ text: entry.qualification || 'Qualification', bold: true, size: CV_SUBHEADING_FONT_SIZE }),
      ];
      if (entry.year) {
        headRuns.push(new TextRun({ text: `\t${entry.year}`, size: CV_META_FONT_SIZE, color: '6B6B6B' }));
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
            children: [new TextRun({ text: detailLine, size: CV_META_FONT_SIZE, color: '6B6B6B' })],
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

  return wrapDocument(children);
}

function buildCoverLetterDocument(letter: BuiltCoverLetter, dateText: string) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: letter.contactLine ? 20 : 200 },
      children: [new TextRun({ text: letter.candidateName || 'Candidate', bold: true, size: 34, color: '142334' })],
    }),
  );

  if (letter.contactLine) {
    children.push(
      new Paragraph({
        spacing: { after: 220 },
        children: [new TextRun({ text: letter.contactLine, size: 20, color: '6B6B6B' })],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: dateText, size: 21 })],
    }),
  );

  if (letter.recipientLine) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: letter.recipientLine, size: 21 })],
      }),
    );
  }

  if (letter.salutation) {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: letter.salutation, size: 21 })],
      }),
    );
  }

  letter.bodyParagraphs.forEach((paragraph) => {
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: paragraph, size: 21 })],
      }),
    );
  });

  if (letter.closingLine) {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 0 },
        children: [new TextRun({ text: letter.closingLine, size: 21 })],
      }),
    );
  }

  if (letter.signature) {
    children.push(
      new Paragraph({
        spacing: { before: 220 },
        children: [new TextRun({ text: letter.signature, bold: true, size: 21 })],
      }),
    );
  }

  return wrapDocument(children);
}

function buildLinkedInDocument(profile: BuiltLinkedIn) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: `LinkedIn Profile - ${profile.fullName || 'Candidate'}`,
          bold: true,
          size: 34,
          color: '142334',
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'Copy each section below into the matching field on LinkedIn.',
          italics: true,
          size: 19,
          color: '6B6B6B',
        }),
      ],
    }),
  );

  if (profile.headline) {
    children.push(sectionHeading('Headline'));
    children.push(bodyParagraph(profile.headline));
  }

  if (profile.about) {
    children.push(sectionHeading('About'));
    profile.about
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => children.push(bodyParagraph(part)));
  }

  if (profile.experienceBlurbs.length > 0) {
    children.push(sectionHeading('Experience'));
    profile.experienceBlurbs.forEach((blurb) => {
      const head = [blurb.title, blurb.company].filter(Boolean).join(', ');
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 0 },
          children: [new TextRun({ text: head || 'Role', bold: true, size: 21 })],
        }),
      );
      if (blurb.summary) children.push(bodyParagraph(blurb.summary));
    });
  }

  if (profile.skills.length > 0) {
    children.push(sectionHeading('Skills'));
    children.push(bodyParagraph(profile.skills.join('  |  ')));
  }

  return wrapDocument(children);
}

/* -------------------------------- helpers -------------------------------- */

function buildFileName(fullName: string, suffix: string) {
  const slug = fullName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'Candidate'}-${suffix}.docx`;
}

function summarizeAnalysis(analysis: unknown) {
  if (!analysis || typeof analysis !== 'object') return '';
  try {
    return JSON.stringify(analysis).slice(0, MAX_ANALYSIS_CHARS);
  } catch {
    return '';
  }
}

function maxTokensFor(deliverable: Deliverable) {
  if (deliverable === 'cover_letter') return 2400;
  if (deliverable === 'linkedin') return 3000;
  return 5200;
}

/* --------------------------------- route --------------------------------- */

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  let key = '';
  let cvText = '';
  let targetRole = '';
  let contextNotes = '';
  let rawAnalysisMode = 'simple';
  let rawGoal = '';
  let rawSeniority = '';
  let rawDeliverable = 'cv';
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
      rawDeliverable = String(formData.get('deliverable') || 'cv');
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
      rawDeliverable = String(body?.deliverable || 'cv');
      analysisInput = body?.analysis ?? null;
    }
  } catch {
    return NextResponse.json({ error: 'Could not read CV builder input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deliverable: Deliverable = includesValue(deliverables, rawDeliverable) ? rawDeliverable : 'cv';

  if (deliverable === 'cover_letter' && !targetRole) {
    return NextResponse.json(
      { error: 'Paste the job description before generating a cover letter.' },
      { status: 400 },
    );
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
          { role: 'system', content: systemPromptFor(deliverable) },
          {
            role: 'user',
            content: buildDeliverableUserPrompt({
              deliverable,
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
        max_tokens: maxTokensFor(deliverable),
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

  let parsed: Record<string, unknown>;
  try {
    const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('EMPTY_AI_RESPONSE');
    parsed = extractToolJsonObject(text);
  } catch (error) {
    console.error('CV builder parse error:', error);
    return NextResponse.json({ error: 'AI service returned an unreadable document. Try again.' }, { status: 500 });
  }

  let doc: Document;
  let fileName: string;

  if (deliverable === 'cover_letter') {
    const letter = normalizeCoverLetter(parsed);
    if (letter.bodyParagraphs.length < 2 || !letter.candidateName) {
      return NextResponse.json({ error: 'The builder returned an incomplete cover letter. Try again.' }, { status: 500 });
    }
    doc = buildCoverLetterDocument(letter, getLetterDate());
    fileName = buildFileName(letter.candidateName, 'Cover-Letter');
  } else if (deliverable === 'linkedin') {
    const profile = normalizeLinkedIn(parsed);
    if (!profile.headline || !profile.about) {
      return NextResponse.json({ error: 'The builder returned an incomplete LinkedIn profile. Try again.' }, { status: 500 });
    }
    doc = buildLinkedInDocument(profile);
    fileName = buildFileName(profile.fullName, 'LinkedIn-Profile');
  } else {
    const cv = normalizeBuiltCv(parsed);
    if (!cv.summary || cv.experience.length === 0) {
      return NextResponse.json(
        { error: 'The builder returned an incomplete CV. Try again, or check the source CV has clear work history.' },
        { status: 500 },
      );
    }
    doc = buildCvDocument(cv);
    fileName = buildFileName(cv.fullName, 'ATS-CV');
  }

  try {
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('CV builder document error:', error);
    return NextResponse.json({ error: 'Could not assemble the document. Try again.' }, { status: 500 });
  }
}
