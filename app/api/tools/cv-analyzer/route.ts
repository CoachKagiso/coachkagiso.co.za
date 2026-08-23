import { NextResponse } from 'next/server';
import { postAiChat, resolveAiRuntimeConfig } from '@/lib/ai-config';
import {
  buildCvCoachMoveLabelUnion,
  buildCvCoachMoveRulesPrompt,
  isCvCoachMoveLabel,
} from '@/lib/buying-flow';
import { extractCvDocument } from '@/lib/content/cv-extract';
import { extractToolJsonObject } from '@/lib/content/tools-ai';
import { getClientCvSource, saveClientCvAnalysisReport, saveClientCvVersion } from '@/lib/client-cv-store';
import { getClientLiveIntake } from '@/lib/client-intake-store';
import { loadClientStrategyCvText } from '@/lib/client-strategy-cv-server';
import { sanitizeClientStrategyIntake } from '@/lib/client-strategy-cv';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  REPORT_EMPHASIS_RULES,
  REPORT_PLAIN_LANGUAGE_RULES,
  renderReportRuleBlock,
} from '@/lib/report-language-rules';

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

/**
 * Role Fit is the one score whose meaning changes with the input: with a target role it measures fit
 * against that role, without one the prompt scores directional clarity instead. Same label, different
 * question, and nothing on the report said which. This is derived from the request rather than asked
 * of the model, so it cannot drift from what was actually sent.
 */
function buildRoleFitBasis(targetRole: string) {
  const firstLine = targetRole.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
  if (!firstLine) {
    return 'No target role given - scored on how clearly the CV signals a direction.';
  }
  const trimmed = firstLine.length > 120 ? `${firstLine.slice(0, 119).trimEnd()}...` : firstLine;
  return `Measured against: ${trimmed}`;
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

/**
 * Priority fixes carry the one enum the model returns, so they are parsed here rather than through
 * objectList: the kind has to be read off the same raw entry the strings came from, and objectList
 * drops empty entries, which would slide every kind onto the wrong fix.
 *
 * An unrecognised or absent kind falls back to 'fix'. That is the safe direction - a verify item
 * mislabelled as a fix reads as ordinary advice, where the reverse would hedge a real problem.
 */
function priorityFixList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      const kind: 'fix' | 'verify' = compactString(record.kind).toLowerCase() === 'verify' ? 'verify' : 'fix';
      return {
        kind,
        title: compactString(record.title),
        whyItMatters: compactString(record.whyItMatters),
        fix: compactString(record.fix),
      };
    })
    .filter((item) => Boolean(item.title || item.whyItMatters || item.fix));
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

VERIFY VS FIX
Not inventing a fact is not the same as not asserting one. You can only see the page, so you cannot
know whether something that looks wrong on it is actually wrong in the person's life. Every entry in
priorityFixes therefore carries a "kind":
- "fix" - a problem visible in the CV text itself. Duty-list language, a buried achievement, a vague
  summary, a formatting choice. You are judging the writing, which is yours to judge.
- "verify" - anything that depends on a fact you cannot check. A date that looks wrong, a gap between
  roles, a title that may not match the real scope, a qualification that may still be in progress.
  You are inferring something about the person's real life.
Never instruct a correction on a "verify" item. Ask for confirmation first, then say what to do if it
turns out to be wrong. Telling someone to fix something that was never broken costs you their trust in
everything else on the page.
Wrong: "Listing a start date of May 2025 is a typo. Correct it to 2024."
Right: "The Santam start date reads May 2025. Confirm that is right - if it is a typo, correct it before
the CV goes out; if the date is correct, leave it and expect to be asked about it."

PRIORITY FIXES AND EVIDENCE GAPS ARE DIFFERENT LISTS
They must never describe the same underlying problem. A priority fix is something to rewrite or
restructure using what is already on the page. An evidence gap is a fact the person has to go and
retrieve before anything can be written. If one issue needs both, put it in priorityFixes only and name
the missing proof inside its "fix".

${renderReportRuleBlock('PLAIN LANGUAGE STANDARD', REPORT_PLAIN_LANGUAGE_RULES)}
- Worked example: "the CV is unlikely to survive an ATS (the software that filters CVs before a person reads them)".

${renderReportRuleBlock('EMPHASIS', REPORT_EMPHASIS_RULES)}

WHAT YOU CANNOT SEE
You are reading text pulled out of the original document. Layout did not survive the extraction.
Columns, tables, text boxes, fonts, font sizes, colours, margins, white space, logos, icons and any
photograph are all gone before the text reaches you - their absence from what you read is not evidence
they were absent from the CV. Never state, imply, or score anything about them. "Remove the photo",
"the two-column layout breaks parsing", "the font is unusual" are claims you have no way to check, and
one of them landing on a CV that had no photo costs you the reader's trust in everything else.
If layout genuinely matters for this person, raise it as a verify item asking Kagiso to look at the
original document - he has it open, you do not.
The document_facts block carries the two structural facts that do survive: the file name and, for PDFs
only, the page count. Those you may use directly. When the page count is not available, say nothing
about length in pages - word count is not a page count.

SENSITIVE DATA RULES
If the CV contains any of the following, flag it immediately in the first atsNotes entry and advise removal:
- RSA ID number (13-digit number, or any national ID)
- Home address or residential details
- Banking or financial account details
- B-BBEE status, race, ethnicity, or citizenship disclosures
- Marital status, dependants, or next of kin
- Date of birth or age
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
- CV exceeds 4 pages for non-academic roles (only when document_facts gives you a page count)
- A file name that would embarrass the person in a recruiter's inbox, or that does not identify them
  (only when document_facts gives you a file name). "Firstname-Surname-CV" is the standard to aim at.

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
This score covers everything you put in atsNotes, not section headers alone - that list also carries SA
red flags, missing credentials (NQF level, professional registrations), and sensitive data. Score the
whole of it, or the number will tell the person they are fine while the notes underneath say they are not.
Score only what the text and document_facts actually show you - see WHAT YOU CANNOT SEE above.
- 85-100: Standard, recognisable section headings. Content reads cleanly in extracted order. Keywords present naturally. Credentials the field screens on are stated. Length suits the level.
- 70-84: Mostly sound but minor issues - an unusual section name, a thin keyword set, or one soft credential gap.
- 50-69: Moderate risk. Non-standard section names, scrambled or interleaved text, missing keywords for the field, or a credential recruiters filter on is absent.
- 25-49: Significant problems. Several unrecognisable headings, badly disordered text, or critical keyword gaps.
- 0-24: The extracted text is barely usable as a CV - no discernible structure or almost no substantive content.
Hard ceilings, applied after you pick a band: three or more substantive atsNotes entries caps this at
74. Any sensitive-data flag caps it at 60. Where the score and the notes disagree, the notes win.

OUTPUT RULES
Respond only with valid JSON. No code fences. The only formatting mark permitted inside a string value is the bold mark described in EMPHASIS. Use this exact shape:
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
      "kind": "fix or verify - see VERIFY VS FIX above. Default to fix.",
      "title": "Fix title",
      "whyItMatters": "Why this matters for the selected goal.",
      "fix": "Specific action to take, or the confirmation to ask for when kind is verify."
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
    "label": "Must be exactly one of: ${buildCvCoachMoveLabelUnion()}",
    "reason": "Why this is the right service for this person's situation."
  }
}

Return 3-5 priorityFixes, 2-4 evidenceGaps, 1-3 rewriteSamples, 3-5 atsNotes, 3 interviewAngles, and 3 nextActions.

REWRITE SAMPLE RULES:
- Spread the samples across the CV. Do not stack two rewrites on the same role or section while another
  role with the same weak language goes untouched - the person will fix the one you showed and leave the rest.
- The "before" field MUST be a direct verbatim quote from the CV text provided. Do not paraphrase or invent a weak line.
- If you cannot find a specific weak line to quote, set "before" to an empty string and focus the "after" on what should be added.
- Never quote a "before" line that contains or sits next to sensitive data (ID number, date of birth, home address, salary, banking details). Skip that line and choose a different one to rewrite, or set "before" to an empty string.
- The "after" field must only use facts already in the CV. Use [brackets] for numbers the person needs to fill in.

RECOMMENDED COACH MOVE RULES:
You MUST choose exactly one of these real Coach Kagiso services, using the label exactly as written:
${buildCvCoachMoveRulesPrompt()}
Do NOT invent or recommend services that are not in this list. Do NOT invent prices. Do NOT recommend "coaching," "consulting," "discovery calls," or "mentoring."
`.trim();
}

function buildCvAnalyzerUserPrompt({
  analysisMode,
  cvText,
  targetRole,
  contextNotes,
  goal,
  seniority,
  intakeData,
  cvFileName,
  cvPageCount,
}: {
  analysisMode: AnalyzerMode;
  cvText: string;
  targetRole: string;
  contextNotes: string;
  goal: CvGoalContext;
  seniority: SeniorityContext;
  intakeData: Record<string, unknown> | null;
  cvFileName: string;
  cvPageCount: number | null;
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
    `<document_facts>`,
    cvFileName ? `File name: ${cvFileName}` : 'File name: Not available - the CV was pasted as text.',
    cvPageCount === null
      ? 'Pages: Not available - only PDFs report a page count, so say nothing about length in pages.'
      : `Pages: ${cvPageCount}`,
    `</document_facts>`,
    intakeData ? `<client_intake>\n${JSON.stringify(intakeData)}\n</client_intake>` : '',
    '',
    `<cv_text>`,
    cvText,
    `</cv_text>`,
  ].join('\n');
}

function normalizeAnalyzerResult(value: unknown, roleFitBasis: string) {
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
    roleFitBasis,
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
    priorityFixes: priorityFixList(record.priorityFixes, 5),
    evidenceGaps: objectList(record.evidenceGaps, 4, { title: '', detail: '', fix: '' }),
    rewriteSamples: objectList(record.rewriteSamples, 3, { before: '', after: '', why: '' }),
    atsNotes: stringList(record.atsNotes, 5),
    interviewAngles: stringList(record.interviewAngles, 3),
    nextActions: objectList(record.nextActions, 3, { title: '', detail: '' }),
    recommendedCoachMove: {
      label: isCvCoachMoveLabel(compactString(recommendedCoachMove.label))
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
  let paymentId = '';
  // Structural facts about the uploaded document. They survive extraction where layout does not, so
  // they are the only formatting evidence the analyst legitimately has.
  let cvFileName = '';
  let cvPageCount: number | null = null;

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
      paymentId = compactString(formData.get('paymentId'));
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
      paymentId = compactString(body?.paymentId);
    }
  } catch {
    return NextResponse.json({ error: 'Could not read CV analyzer input.' }, { status: 400 });
  }

  if (!isDiagnosticAdminAuthorized(key, request)) {
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

  let intakeData: Record<string, unknown> | null = null;
  let clientCvPath: string | null = null;
  let clientCvFileName: string | null = null;

  if (paymentId) {
    try {
      const source = await getClientCvSource(paymentId);
      if (source) {
        clientCvPath = source.storagePath;
        clientCvFileName = source.fileName;
      }

      const liveIntake = await getClientLiveIntake(paymentId);
      intakeData = liveIntake.hasIntake
        ? sanitizeClientStrategyIntake(liveIntake.formData)
        : null;

      if (!cvFile && !cvText.trim() && source) {
        const loaded = await loadClientStrategyCvText(source);
        if (loaded.included) {
          cvText = loaded.text;
        } else {
          return NextResponse.json({ error: loaded.issue || 'The saved CV could not be read.' }, { status: 400 });
        }
      }
    } catch (error) {
      console.error('Client CV source load failed:', error instanceof Error ? error.message : 'unknown error');
      return NextResponse.json({ error: 'Could not load the selected client context or CV.' }, { status: 400 });
    }
  }

  if (cvFile) {
    try {
      if (paymentId) {
        const saved = await saveClientCvVersion({ paymentId, file: cvFile, source: 'analyzer' });
        clientCvPath = saved.source.storagePath;
        clientCvFileName = saved.source.fileName;
      }
      const extracted = await extractCvDocument(cvFile);
      cvText = extracted.text;
      cvFileName = cvFile.name;
      cvPageCount = extracted.pageCount;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Could not extract text from that CV file.' },
        { status: 400 },
      );
    }
  }

  if (!cvFileName && clientCvFileName) {
    cvFileName = clientCvFileName;
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
    // postAiChat rather than a bare fetch so a model that starts mandating reasoning without the
    // catalogue knowing yet is retried instead of failing the whole analysis.
    response = await postAiChat(runtime, {
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
            intakeData,
            cvFileName,
            cvPageCount,
          }),
        },
      ],
      max_tokens: 4096,
      temperature: 0.45,
      response_format: { type: 'json_object' },
    }, { zeroRetention: true });
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

  let data: {
    model?: string;
    choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
  };
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error('CV analyzer response was not JSON:', error);
    return NextResponse.json({ error: 'AI service returned an unreadable report. Try again.' }, { status: 500 });
  }

  // A cut-off report and a schema mismatch both end up as unparseable JSON, so name the cause
  // here instead of letting a budget problem read as a broken model.
  const finishReason = data.choices?.[0]?.finish_reason || 'unknown';
  if (finishReason === 'length') {
    console.error('CV analyzer response truncated:', { model: data.model || runtime.model });
    return NextResponse.json({
      error: 'The AI ran out of room before finishing this analysis. '
        + 'This usually means the model spent its budget on reasoning. Try again, or switch the primary model in Settings.',
      code: 'CV_ANALYZER_OUTPUT_TRUNCATED',
    }, { status: 502 });
  }

  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    console.error('CV analyzer returned no content:', { model: data.model || runtime.model, finishReason });
    return NextResponse.json({ error: 'The analyzer returned an empty report. Try again.' }, { status: 502 });
  }

  try {
    const result = normalizeAnalyzerResult(extractToolJsonObject(text), buildRoleFitBasis(targetRole));

    if (!result.snapshot || !result.priorityFixes.length || !result.nextActions.length || !result.recommendedCoachMove.label) {
      return NextResponse.json({ error: 'The analyzer returned an incomplete report. Try again.' }, { status: 500 });
    }

    let savedReport: { id: string; createdAt: string } | null = null;
    if (paymentId) {
      let report;
      try {
        report = await saveClientCvAnalysisReport({
          paymentId,
          report: result,
          analysisMode,
          targetRole,
          cvFileName: clientCvFileName,
          cvPath: clientCvPath,
        });
      } catch (error) {
        console.error('CV analyzer report save failed:', error instanceof Error ? error.message : 'unknown error');
        return NextResponse.json({ error: 'The analysis completed, but the report could not be saved.' }, { status: 500 });
      }
      savedReport = { id: report.id, createdAt: report.created_at };
    }

    return NextResponse.json({ result, savedReport });
  } catch (error) {
    console.error('CV analyzer parse error:', error);
    return NextResponse.json({ error: 'AI service returned an unreadable report. Try again.' }, { status: 500 });
  }
}
