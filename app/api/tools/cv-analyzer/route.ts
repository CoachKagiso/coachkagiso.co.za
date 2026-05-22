import { NextResponse } from 'next/server';
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
const coachMoveLabels = [
  '48-Hour CV Review',
  'CV Revamp',
  'Cover Letter',
  'LinkedIn Profile',
  'CV + LinkedIn + Cover Letter Bundle',
] as const;
const MAX_CV_CHARS = 60000;
const MAX_CONTEXT_CHARS = 16000;

type CvGoal = (typeof cvGoals)[number];
type Seniority = (typeof seniorityLevels)[number];
type AnalyzerMode = (typeof analyzerModes)[number];
type CvGoalContext = CvGoal | 'auto_infer';
type SeniorityContext = Seniority | 'auto_infer';

function includesValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}

function compactString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseScore(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => compactString(item))
    .filter(Boolean);
}

function objectList<T extends Record<string, string>>(
  value: unknown,
  limit: number,
  shape: T,
) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      const parsed = Object.keys(shape).reduce<Record<string, string>>((acc, key) => {
        acc[key] = compactString(record[key]);
        return acc;
      }, {});
      return parsed as T;
    })
    .filter((item) => Object.values(item).some(Boolean));
}

function buildCvAnalyzerSystemPrompt() {
  return `
You are Kagiso Shabangu's private CV positioning analyst.

Your job is to read a CV like a South African career coach, recruiter, and positioning editor at the same time.
Do not behave like a generic ATS scanner. You may include ATS/readability notes, but the primary value is career positioning.

ANALYSIS STANDARD
- Explain what the CV currently makes a recruiter believe.
- Identify what the person is underselling, overexplaining, or failing to prove.
- Connect the advice to the selected or inferred career goal and seniority.
- Use South African professional context where useful, especially Corporate SA, career pivots, promotion readiness, leadership visibility, and first-generation career pressure.
- Never invent qualifications, employers, metrics, promotions, or outcomes.
- If impact evidence is missing, name it as a gap and show how to rewrite without inventing facts.
- Keep feedback direct, practical, and useful for a coaching session.

SENSITIVE DATA RULES
If the CV contains any of the following, flag it immediately in the first atsNotes entry and advise removal:
- RSA ID number (13-digit number, or any national ID)
- Home address or residential details
- Banking or financial account details
- B-BBEE status, race, ethnicity, or citizenship disclosures
- Marital status, dependants, or next of kin
- Date of birth or age
- Photo (advise removal unless the specific industry requires it)
- Salary history or current salary figures
Do not reproduce any sensitive data in your output. Refer to it generically: "Your CV includes your ID number. Remove it."

SA CV RED FLAGS
Check for these common South African CV issues and include in atsNotes if found:
- "References available on request" (outdated, remove)
- "Curriculum Vitae" as a header on the document (wastes space)
- Matric listed as "Grade 12" or vice versa without subjects or achievement level
- NQF level not mentioned where qualifications are listed
- Seta learnership or short course credentials buried instead of highlighted (especially for career pivoters)
- "Duties included" language instead of impact statements
- Generic objective statement at the top ("Seeking a challenging position in a dynamic organisation")
- CV exceeds 4 pages for non-academic roles

GOAL-SPECIFIC ANALYSIS LENS
Adjust your analysis emphasis based on the career goal:
- new_role: Focus on how competitive this CV is against other applicants for similar roles. Is the person clearly hirable at a glance?
- career_pivot: Focus on transferable skills visibility. Does the CV make the pivot direction obvious, or does it read like the old career?
- promotion: Focus on leadership language, strategic scope, and decision-making evidence. Does the CV sound like someone ready for more, or someone still doing?
- leadership_visibility: Focus on executive presence, stakeholder language, and authority. Does the CV read like a leader or a doer?
- first_corporate_move: Focus on professional credibility signals. Does the CV translate non-corporate or academic experience into corporate language?
- executive_positioning: Focus on commercial impact, board-level language, and strategic narrative. Does the CV command executive-level respect?
- Auto-infer from CV (simple mode): Infer the most likely career goal and seniority from the CV. Give a general positioning read without forcing the person into a target role.

SCORE CALIBRATION (0-100 scale, integers only. Do NOT use 1-10 scale.)
Positioning:
- 85-100: The CV tells a clear, compelling career story. A recruiter immediately understands who this person is and where they are going.
- 70-84: The positioning is mostly clear but one or two elements could be sharper.
- 50-69: The CV lists experience but does not position the person. It reads as a history document, not a career narrative.
- 25-49: The positioning is confusing or contradictory. A recruiter cannot tell what this person wants or offers.
- 0-24: No detectable positioning. The CV is a generic list of jobs.

Clarity:
- 85-100: Every sentence is direct, specific, and easy to scan. Bullet points are tight. No walls of text.
- 70-84: Mostly clear but some sections overexplain or use vague language.
- 50-69: Several sections are verbose, repetitive, or buried in jargon. A recruiter would skim past key information.
- 25-49: The CV is hard to follow. Important achievements are hidden inside paragraphs.
- 0-24: Nearly unreadable. Dense paragraphs, no structure, no scannable formatting.

Role Fit:
- 85-100: The CV clearly matches the target role or goal. Key requirements are addressed with evidence.
- 70-84: Good fit for the target but one or two key requirements are weakly supported.
- 50-69: Partial fit. The CV has relevant experience but does not connect it to the target role.
- 25-49: Weak fit. The CV reads as a generalist document with no clear role alignment.
- 0-24: No visible connection between the CV content and the stated career goal.
If no target role or job description was provided, score roleFit based on how clearly the CV signals a specific career direction.

ATS/Readability:
- 85-100: Clean formatting, standard section headers, no tables/columns/graphics that break parsing. Keywords present naturally.
- 70-84: Mostly ATS-friendly but minor issues (unusual headers, light formatting quirks).
- 50-69: Moderate ATS risk. Non-standard section names, tables, or missing keywords for the field.
- 25-49: Significant ATS problems. Graphics, columns, unusual fonts, or critical keyword gaps.
- 0-24: Likely unparseable by ATS. Heavy design, image-based, or severely non-standard formatting.

OUTPUT RULES
Respond only with valid JSON. No markdown. No code fences. Use this exact shape:
All score values must be integers from 0 to 100. Do not use a 1-10 scale.
{
  "snapshot": "2-3 sentence high-level read of the CV's current positioning.",
  "scores": {
    "positioning": 0,
    "clarity": 0,
    "roleFit": 0,
    "atsReadability": 0
  },
  "recruiterRead": {
    "headline": "The strongest honest read of this person from the CV.",
    "firstImpression": "What a recruiter is likely to think first.",
    "possibleConcern": "The main hesitation or confusion the CV creates."
  },
  "strongestSignals": ["3-5 credible strengths visible in the CV"],
  "priorityFixes": [
    {
      "title": "Fix title",
      "whyItMatters": "Why this matters for the selected goal.",
      "fix": "Specific action to take."
    }
  ],
  "evidenceGaps": [
    {
      "title": "Gap title",
      "detail": "What is missing or weak.",
      "fix": "How to add proof without inventing facts."
    }
  ],
  "rewriteSamples": [
    {
      "before": "A direct quote from the CV text. If no specific weak line can be quoted exactly, set this to an empty string.",
      "after": "A stronger rewrite using only facts already present in the CV. Use [brackets] only where the person must supply missing numbers.",
      "why": "Why the rewrite is stronger."
    }
  ],
  "atsNotes": ["3-5 ATS, readability, or SA-specific formatting notes"],
  "interviewAngles": ["3 interview stories or talking points this CV could support"],
  "nextActions": [
    {
      "title": "Action title",
      "detail": "Concrete next step Kagiso can give the person."
    }
  ],
  "recommendedCoachMove": {
    "label": "Must be exactly one of: '48-Hour CV Review' | 'CV Revamp' | 'Cover Letter' | 'LinkedIn Profile' | 'CV + LinkedIn + Cover Letter Bundle'",
    "reason": "Why this is the right service for this person's situation."
  }
}

Return 3-5 priorityFixes, 2-4 evidenceGaps, 1-3 rewriteSamples, 3-5 atsNotes, 3 interviewAngles, and 3 nextActions.

REWRITE SAMPLE RULES:
- The "before" field MUST be a direct verbatim quote from the CV text provided. Do not paraphrase or invent a weak line.
- If you cannot find a specific weak line to quote, set "before" to an empty string and focus the "after" on what should be added.
- Never quote a "before" line that contains or sits next to sensitive data (ID number, date of birth, home address, salary, banking details). Skip that line and choose a different one to rewrite, or set "before" to an empty string.
- The "after" field must only use facts already in the CV. Use [brackets] for numbers the person needs to fill in.

RECOMMENDED COACH MOVE RULES:
You MUST choose exactly one of these five real Coach Kagiso services:
1. "48-Hour CV Review" (R150) - Choose this when the CV is mostly okay but needs a professional eye to identify specific fixes. Best for people close to applying.
2. "CV Revamp" (R400) - Choose this when the CV needs a full rewrite. Best for career pivots, outdated formats, or people who have been applying without results.
3. "Cover Letter" (R150) - Choose this when the CV is solid but the person needs a tailored letter for a specific application.
4. "LinkedIn Profile" (R350) - Choose this when the CV is strong but the online presence does not match or support it.
5. "CV + LinkedIn + Cover Letter Bundle" (R750) - Choose this when the person needs all three: full CV rewrite, LinkedIn alignment, and a cover letter.
Do NOT invent or recommend services that are not in this list. Do NOT recommend "coaching," "consulting," "discovery calls," or "mentoring."
`.trim();
}

function buildCvAnalyzerUserPrompt({
  analysisMode,
  cvText,
  targetRole,
  contextNotes,
  goal,
  seniority,
}: {
  analysisMode: AnalyzerMode;
  cvText: string;
  targetRole: string;
  contextNotes: string;
  goal: CvGoalContext;
  seniority: SeniorityContext;
}) {
  const goalLabel = goal === 'auto_infer' ? 'Auto-infer from CV' : goal;
  const seniorityLabel = seniority === 'auto_infer' ? 'Auto-infer from CV' : seniority;

  return [
    `<analysis_context>`,
    `Analysis mode: ${analysisMode}`,
    `Career goal: ${goalLabel}`,
    `Seniority: ${seniorityLabel}`,
    targetRole ? `Target role or job description:\n${targetRole}` : 'Target role or job description: Not provided',
    contextNotes ? `Kagiso context notes:\n${contextNotes}` : 'Kagiso context notes: Not provided',
    `</analysis_context>`,
    '',
    `<cv_text>`,
    cvText,
    `</cv_text>`,
  ].join('\n');
}

function normalizeAnalyzerResult(value: unknown) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const scores = record.scores && typeof record.scores === 'object' ? record.scores as Record<string, unknown> : {};
  const recruiterRead = record.recruiterRead && typeof record.recruiterRead === 'object'
    ? record.recruiterRead as Record<string, unknown>
    : {};
  const recommendedCoachMove = record.recommendedCoachMove && typeof record.recommendedCoachMove === 'object'
    ? record.recommendedCoachMove as Record<string, unknown>
    : {};

  return {
    snapshot: compactString(record.snapshot),
    scores: {
      positioning: clampScore(parseScore(scores.positioning)),
      clarity: clampScore(parseScore(scores.clarity)),
      roleFit: clampScore(parseScore(scores.roleFit)),
      atsReadability: clampScore(parseScore(scores.atsReadability)),
    },
    recruiterRead: {
      headline: compactString(recruiterRead.headline),
      firstImpression: compactString(recruiterRead.firstImpression),
      possibleConcern: compactString(recruiterRead.possibleConcern),
    },
    strongestSignals: stringList(record.strongestSignals, 5),
    priorityFixes: objectList(record.priorityFixes, 5, { title: '', whyItMatters: '', fix: '' }),
    evidenceGaps: objectList(record.evidenceGaps, 4, { title: '', detail: '', fix: '' }),
    rewriteSamples: objectList(record.rewriteSamples, 3, { before: '', after: '', why: '' }),
    atsNotes: stringList(record.atsNotes, 5),
    interviewAngles: stringList(record.interviewAngles, 3),
    nextActions: objectList(record.nextActions, 3, { title: '', detail: '' }),
    recommendedCoachMove: {
      label: includesValue(coachMoveLabels, compactString(recommendedCoachMove.label))
        ? compactString(recommendedCoachMove.label)
        : '',
      reason: compactString(recommendedCoachMove.reason),
    },
  };
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
    }
  } catch {
    return NextResponse.json({ error: 'Could not read CV analyzer input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const analysisMode = includesValue(analyzerModes, rawAnalysisMode) ? rawAnalysisMode : 'simple';

  if (analysisMode === 'advanced' && !includesValue(cvGoals, rawGoal)) {
    return NextResponse.json({ error: 'Choose a career goal.' }, { status: 400 });
  }

  if (analysisMode === 'advanced' && !includesValue(seniorityLevels, rawSeniority)) {
    return NextResponse.json({ error: 'Choose a seniority level.' }, { status: 400 });
  }

  const resolvedGoal: CvGoalContext = analysisMode === 'advanced' && includesValue(cvGoals, rawGoal) ? rawGoal : 'auto_infer';
  const resolvedSeniority: SeniorityContext = analysisMode === 'advanced' && includesValue(seniorityLevels, rawSeniority)
    ? rawSeniority
    : 'auto_infer';

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
    return NextResponse.json({ error: cvFile ? 'Could not extract enough readable text from that file. Try a text-based PDF, .docx, or paste the CV text.' : 'Paste more CV text before analysing.' }, { status: 400 });
  }

  if (cvText.length > MAX_CV_CHARS) {
    return NextResponse.json({ error: 'This CV is too long for one pass. Shorten it or analyse one version at a time.' }, { status: 400 });
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
          { role: 'system', content: buildCvAnalyzerSystemPrompt() },
          {
            role: 'user',
            content: buildCvAnalyzerUserPrompt({
              analysisMode,
              cvText,
              targetRole,
              contextNotes,
              goal: resolvedGoal,
              seniority: resolvedSeniority,
            }),
          },
        ],
        max_tokens: 4096,
        temperature: 0.45,
        response_format: { type: 'json_object' },
      })),
    });
  } catch (error) {
    console.error(`${runtime.provider} CV analyzer network error:`, error);
    return NextResponse.json(
      { error: 'Failed to reach AI service. Check network and try again.' },
      { status: 502 },
    );
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`${runtime.provider} CV analyzer API error ${response.status}:`, responseText);
    return NextResponse.json(
      { error: `AI service returned an error (${response.status}). Try again.` },
      { status: response.status },
    );
  }

  try {
    const data = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('EMPTY_AI_RESPONSE');
    const result = normalizeAnalyzerResult(extractToolJsonObject(text));

    if (!result.snapshot || !result.priorityFixes.length || !result.nextActions.length || !result.recommendedCoachMove.label) {
      return NextResponse.json({ error: 'The analyzer returned an incomplete report. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('CV analyzer parse error:', error);
    return NextResponse.json({ error: 'AI service returned an unreadable report. Try again.' }, { status: 500 });
  }
}
