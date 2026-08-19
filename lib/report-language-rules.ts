/**
 * Shared writing rules for AI-generated reports.
 *
 * Scope note: these apply to REPORTS the reader consumes inside the app (CV analysis,
 * session summary, development plan). They deliberately do NOT apply to the documents
 * generated for use elsewhere (the rebuilt CV, cover letter, LinkedIn About text), which
 * get pasted into Word and LinkedIn where an asterisk would be a defect.
 */

/**
 * Keeps the industry vocabulary while making it land on first read. A numeric reading-grade
 * target was considered and rejected: it forces awkward paraphrase of terms like ATS and NQF
 * that the reader actually needs to learn.
 */
export const REPORT_PLAIN_LANGUAGE_RULES = [
  'Write so a capable person outside HR understands it on first read, without stripping out the craft.',
  'Keep the industry terms. Do not remove or water down ATS, NQF, SETA, matric, B-BBEE, STAR, or similar.',
  'The first time an industry term appears anywhere in your output, define it inline in plain words, then use it freely after that.',
  'Define each term once only. Repeating a definition reads as condescending.',
  'Words that are not industry terms stay everyday. Use "show" not "demonstrate", "use" not "leverage", "start" not "commence".',
  'Keep sentences under 20 words on average. Split anything that runs past 25 words.',
  'One idea per sentence. If a field needs two ideas, write two sentences.',
  'Never put more than 3 sentences in a single field. Say the essential thing and stop.',
];

/**
 * The app renders exactly one inline mark and builds every heading, number and bullet itself
 * from the JSON structure. Anything else the model invents shows up as literal punctuation.
 */
export const REPORT_EMPHASIS_RULES = [
  'You may wrap ONE short phrase per field in double asterisks to mark the single thing the reader must not miss, for example **remove your ID number**.',
  'Put the emphasis on the action or the risk, never on a whole sentence.',
  'One emphasis per field maximum. Most fields should have none.',
  'Use no other formatting. No headings, no hyphens or asterisks as bullets, no italics, no numbered lists inside a field. The app builds all headings, numbering, and bullets from the structure you return.',
];

/**
 * The reader of these reports is the client, not Kagiso. Third-person copy ("the client will
 * evaluate...") reads like a case note about them and is the single fastest way to make a paid,
 * personalised document feel like a template.
 */
export const REPORT_SECOND_PERSON_RULES = [
  'Write to the client, never about them. Address them directly as "you" and "your" in every field.',
  'Never write "the client", "this person", "they", or "the candidate" in any field. Rewrite the sentence in second person instead.',
  'Kagiso stays in the third person and is called Kagiso, because the reader is the client and not Kagiso.',
  'Where the client first name is supplied, you may use it once or twice for warmth. Do not repeat it in every field.',
];

export const CLIENT_REPORT_LANGUAGE_RULES = [
  ...REPORT_PLAIN_LANGUAGE_RULES,
  ...REPORT_SECOND_PERSON_RULES,
  ...REPORT_EMPHASIS_RULES,
];

/** Formats a rule set as a titled, dash-prefixed block for template-literal prompts. */
export function renderReportRuleBlock(title: string, rules: string[]): string {
  return [title, ...rules.map((rule) => `- ${rule}`)].join('\n');
}
