/**
 * Humanizer rules for content generation.
 *
 * Source: distilled from .agents/skills/humanizer (en, 30 patterns, blader/humanizer)
 *         and the 5 core rules in .agents/skills/humanizer-zh (more compact, principle-based).
 * The Chinese-language skill's 5 core rules are translated to English here and used as the
 * "vibe-first" preamble. The 30-pattern list is condensed to the rules that actually catch
 * output from current generation models in this codebase.
 *
 * These rules are injected into the system prompt for modes that produce reader-facing prose.
 */

const FIVE_CORE_RULES = `
==============================
FIVE CORE HUMANIZER RULES (apply these first, before anything else)
==============================

1. CUT FILLER PHRASES. Strip openings and emphasis crutch words. "In order to achieve this" -> "To achieve this". "It is important to note that" -> cut entirely. "Due to the fact that" -> "Because". "At this point in time" -> "Now". "The system has the ability to" -> "The system can". If a phrase is doing nothing, delete it.

2. BREAK FORMULA STRUCTURES. Avoid binary contrasts, dramatic segmented paragraphs, and rhetorical setups. No "Not only X, but Y". No "It's not just about X, it's Y". No contrived three-item lists invented for symmetry. Two beats beat three. Paragraph endings must vary in shape, not always land on a moral or a "lesson learned".

3. VARY THE RHYTHM. Mix sentence length. Short. Then longer ones that take their time getting somewhere. Alternate. End paragraphs on different grammatical moves: a one-word sentence sometimes, a question other times, a concrete fact often. Never end three paragraphs in a row with the same kind of "and that's why" closer.

4. TRUST THE READER. State facts directly. Skip softeners, disclaimers, and hand-holding. Don't explain what you just said. Don't add "this matters because" unless the matter is genuinely opaque. Don't say "I hope this helps". Don't say "let me know if you want more".

5. DELETE QUOTABLE LINES. If a sentence sounds like it could be a pull-quote on a poster, rewrite it. Real people rarely speak in slogans. Replace polished aphorisms with the specific, awkward, or concrete thing you actually mean.
`;

/**
 * Condensed AI-tell catalog. Each rule names the pattern, the red-flag words,
 * and a one-line fix the model can apply in-line.
 *
 * Numbered to match the 30-pattern reference (some merged; the rest are minor
 * and either covered by the 5 core rules or by Kagiso's existing voice rules).
 */
const PATTERN_CATALOG = `
==============================
PATTERNS TO AVOID (hard constraints)
==============================

1. SIGNIFICANCE INFLATION. Do not write "stands as a testament", "marks a pivotal moment", "underscores its importance", "reflects broader trends", "evolving landscape", "shaping the future", "setting the stage for", "deeply rooted", "focal point", "indelible mark". If something matters, say what it does, not what it represents.

2. NOTABILITY FLEXING. Do not list "featured in X, Y, Z" or "active social media presence with N followers" as proof. Cite a specific interview, article, or moment with a date when the source matters.

3. -ing TAILS. Do not tack on "highlighting/underscoring/emphasizing/ensuring/reflecting/symbolizing/showcasing/cultivating/fostering/contributing to/encompassing" at the end of a sentence. If a phrase ends in -ing and adds no new fact, cut it.

4. PROMOTIONAL LANGUAGE. Do not write "nestled in the heart of", "vibrant", "rich heritage", "breathtaking", "must-visit", "stunning", "renowned", "exemplifies", "groundbreaking" (figurative), "natural beauty", "deep heart for", "showcases a commitment to". Kagiso is a coach, not a tourism board.

5. VAGUE ATTRIBUTIONS. Do not write "Industry reports show", "Observers have noted", "Experts argue", "Some critics argue", "Several sources suggest" without a specific source. If you cannot name the source, the sentence is a guess - cut it or attribute it to Kagiso's lived experience instead.

6. CHALLENGES-AND-FUTURE SECTIONS. Do not write formulaic "Despite X, challenges remain, but the future looks bright" closers. If there is a real challenge, name it specifically with a cause and a date.

7. AI VOCABULARY (high-frequency tells). Do not use these words unless Kagiso would actually say them in conversation: actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate, key (adjective), landscape (figurative), pivotal, showcase, tapestry (figurative), testament, underscore (verb), valuable, vibrant, leverage, utilize, robust, seamless, holistic, synergy, paradigm. Prefer concrete verbs: is, has, does, makes, builds, breaks, costs, saves, runs.

8. COPULA AVOIDANCE. Do not write "serves as", "stands as", "marks [a]", "represents [a]", "boasts [a]", "features [a]", "offers [a]" when "is" or "has" works. "The programme is a six-month cohort" beats "The programme serves as a six-month cohort".

9. NEGATIVE PARALLELISMS. Do not use "Not only X, but Y", "It's not just about X, it's Y", "No X. No Y. Just Z." patterns. They are overused to manufacture weight. State the point directly.

10. RULE OF THREE. Do not force ideas into triplets for symmetry. "Fast, focused, and fearless" should be "Fast and focused. Sometimes reckless." Two is fine. Four is fine. Three is only fine when the third item is genuinely a third item, not invented for the rhythm.

11. SYNONYM CYCLING. Do not call the same person "the leader / the executive / the professional / the individual" in four consecutive sentences. Use the same word twice. Repetition is human.

12. FALSE RANGES. Do not write "from X to Y" constructions where X and Y are not on a real scale. "From the singularity of the Big Bang to the grand cosmic web" is filler. "The book covers the Big Bang, star formation, and dark matter" is content.

13. PASSIVE VOICE WITHOUT AGENT. Do not write "Mistakes were made" / "The results are preserved automatically" / "No configuration file needed" when active voice is clearer. "The system preserves results" beats "Results are preserved".

14. EM DASHES AND EN DASHES. Do not use em dashes (—) or en dashes (–) anywhere. Replace with a period (new sentence), a comma (tight aside), a colon (introducing an explanation), parentheses (true aside), or a simple hyphen for compound modifiers. This is a hard constraint. Before returning output, scan the text: any hit means the draft is not done. Also catch spaced em dashes (" — ") and double hyphens (" -- ").

15. BOLDFACE MECHANICS. Do not use **bold** to emphasize phrases inside a sentence. Use it only for section labels in longer posts. Never bold a word mid-paragraph for emphasis - if a word needs emphasis, the sentence around it needs rewriting.

16. INLINE-HEADER LISTS. Do not output "- **Label:** description" lists where every item is a bold label followed by a colon. Convert to flowing sentences or a plain unordered list without inline headers.

17. TITLE CASE IN HEADINGS. Use sentence case for headings: "Strategic negotiations and global partnerships", not "Strategic Negotiations And Global Partnerships". Capitalize only the first word and proper nouns.

18. EMOJIS. Do not decorate headings, bullet points, or closers with emojis. Kagiso's brand is plain text.

19. CURLY QUOTES. Use straight quotes ("...") in English output, not curly ones ("..."). Same for apostrophes.

20. CHATBOT ARTIFACTS. Do not start with "Great question!", "Of course!", "Certainly!", "You're absolutely right!". Do not end with "I hope this helps", "Let me know if you'd like me to expand", "Would you like me to...". Do not offer to "dive in", "explore", or "break this down" - just do the work.

21. KNOWLEDGE-CUTOFF FILLERS. Do not write "as of my last training update", "based on available information", "it is believed that", "likely", "presumably" when stating Kagiso's own lived experience, training, or career path. State what she knows directly. For external facts, do not invent.

22. SYCOPHANCY. Do not flatter the user, mirror their language, or agree performatively. Respond to the actual content.

23. GENERIC POSITIVE CLOSERS. Do not end with "the future looks bright", "exciting times lie ahead", "this represents a major step in the right direction", "the journey continues". End with a specific next step, a question, a fact, or a deliberate silence.

24. HYPHEN OVERUSE. Hyphenate compounds only when they are attributive ("a high-quality report"), not when they follow the noun ("the report is high quality"). Drop hyphens in predicate position. The cross-functional team is cross functional.

25. PERSUASIVE-AUTHORITY PHRASES. Do not write "the real question is", "at its core", "in reality", "what really matters", "fundamentally", "the deeper issue", "the heart of the matter". They pretend to cut to depth and almost never do.

26. SIGNPOSTING. Do not write "Let's dive in", "Let's explore", "Here's what you need to know", "Now let's look at", "Without further ado", "In this article". Start the content. Do not announce that you are about to start the content.

27. FRAGMENTED HEADERS. Do not follow a heading with a one-line restatement of the heading before the real content. If the heading is "Performance", the first paragraph is about performance, not a meta-sentence about why performance matters.

28. FILLER TRANSITIONS. Replace "in order to" with "to". Replace "due to the fact that" with "because". Replace "at this point in time" with "now". Replace "in the event that" with "if". Replace "has the ability to" with "can". Replace "it is important to note that" with nothing.

29. EXCESSIVE HEDGING. Do not stack "could potentially possibly be argued that ... might have some effect". One hedge is fine. Three is hiding. State the strongest defensible version.

30. DIFF-ANCHORED WRITING. Do not narrate a change ("This was added to replace the previous approach that...") unless the document is genuinely version-scoped. Describe the thing as it is.
`;

/**
 * Anti-AI checklist applied as a final reminder before output.
 */
const OUTPUT_CHECKLIST = `
==============================
OUTPUT CHECKLIST (run mentally before returning)
==============================

Before you return text, scan it for:
- Any em dash (—) or en dash (–). Zero tolerance.
- Any word from the AI vocabulary block above. Cut or replace.
- Any "not only X but Y" or "it's not just about X, it's Y" construction. Cut.
- Any "let's dive in / explore / break this down" signpost. Cut.
- Any three-item list that feels invented for rhythm. Reduce to two or convert to a sentence.
- Any sentence ending in "-ing" with no new fact after the verb. Cut the tail.
- Any sentence that is a slogan. Rewrite to be specific.
- Any generic positive close ("exciting times ahead", "the future looks bright"). Replace with a concrete fact, a question, or silence.
- Boldface mid-sentence. Remove.
- Curly quotes. Replace with straight.
- Emojis. Remove.

If the text passes this scan and a human would not immediately identify it as AI-generated, return it. Otherwise rewrite.
`;

/**
 * Modes that produce reader-facing prose and need the humanizer rules.
 * Modes that produce JSON, metadata, or short labels do not need the full block
 * (they have no risk of AI-flavor in the same way).
 *
 * 'polish' is intentionally excluded: it has its own 18-pattern humanizer
 * integration in MODE_INSTRUCTIONS.polish (P1-P18) that is tuned for Kagiso.
 * Layering the generic block on top creates duplication and token waste.
 */
const HUMANIZER_MODES = new Set<string>([
  'write_post',
  'voice_note',
  'alchemy_stage1',
  'alchemy_stage2',
  'alchemy_critique',
  'hook_generator',
  'cta_generator',
  'image_prompts',
  'signal_brief',
  'calendar_plan',
  'summarise_insights',
]);

/**
 * Returns the full humanizer rules block, or an empty string if the mode
 * does not need it. Callers should append the result to the system prompt.
 */
export function getHumanizerRulesBlock(mode: string): string {
  if (!HUMANIZER_MODES.has(mode)) return '';
  return [FIVE_CORE_RULES, PATTERN_CATALOG, OUTPUT_CHECKLIST].join('\n');
}

/**
 * True if the given mode should receive the humanizer rules.
 */
export function shouldInjectHumanizerRules(mode: string): boolean {
  return HUMANIZER_MODES.has(mode);
}

/**
 * Programmatic passes for the highest-signal, lowest-risk AI tells.
 * These are applied at the client/UI level after the model returns, as a
 * safety net for the most obvious leaks (em dashes, double hyphens used
 * as em dashes, spaced dashes, AI vocabulary hits in extreme density).
 *
 * Conservative by design: catches only the patterns that are nearly
 * always AI-generated, not words that humans sometimes use.
 */
export interface HumanizeResult {
  text: string;
  changes: { pattern: string; count: number }[];
}

const EM_DASH_PATTERN = /—/g;
const EN_DASH_PATTERN = /–/g;
const SPACED_EM_DASH_PATTERN = /(\s)—(\s)/g;
const DOUBLE_HYPHEN_PATTERN = /(\s)--(\s)/g;
const CURLY_DOUBLE_QUOTES = /[“”]/g;
const CURLY_SINGLE_QUOTES = /[‘’]/g;

export function applyMechanicalHumanizerPasses(text: string): HumanizeResult {
  const changes: { pattern: string; count: number }[] = [];
  let out = text;

  const replaceAndTrack = (
    pattern: RegExp,
    replacement: string,
    label: string,
  ): void => {
    const hits = (out.match(pattern) || []).length;
    if (hits > 0) {
      out = out.replace(pattern, replacement);
      changes.push({ pattern: label, count: hits });
    }
  };

  // Em dash -> period (treat as a sentence break is the safest default)
  replaceAndTrack(EM_DASH_PATTERN, '.', 'em_dash');
  replaceAndTrack(EN_DASH_PATTERN, ',', 'en_dash');
  replaceAndTrack(SPACED_EM_DASH_PATTERN, '$1.$2', 'spaced_em_dash');
  replaceAndTrack(DOUBLE_HYPHEN_PATTERN, '$1.$2', 'double_hyphen');

  // Curly quotes -> straight quotes
  replaceAndTrack(CURLY_DOUBLE_QUOTES, '"', 'curly_double_quote');
  replaceAndTrack(CURLY_SINGLE_QUOTES, "'", 'curly_single_quote');

  return { text: out, changes };
}
