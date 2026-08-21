export type CarouselPlatform = 'linkedin' | 'instagram_facebook' | 'tiktok' | 'email_voice';
export type CarouselSlideCount = 'auto' | 'quick' | 'full';
export type CarouselAspectRatio = 'auto' | 'square_1_1' | 'portrait_4_5' | 'linkedin_document';
export type CarouselLayoutRecipe = 'authority_framework' | 'guided_shift' | 'diagnostic_reframe' | 'narrative_launch';
export type CarouselTemplate =
  | 'editorial_authority'
  | 'editorial_career_notes'
  | 'warm_coaching'
  | 'soft_diagnostic_cards'
  | 'bold_diagnostic'
  | 'signature_narrative';
// The canonical slide-role vocabulary. Anything that validates, prompts for, or
// renders a role reads this array rather than repeating the list, so the
// extractor can never offer a role the generator refuses (it previously offered
// "insight", which is not a role, and it reached the UI unlabelled).
export const CAROUSEL_SLIDE_ROLES = [
  'cover',
  'reframe',
  'framework',
  'step',
  'proof',
  'cta',
  'mirror',
  'checklist',
  'reflection',
  'diagnosis',
  'myth',
  'cost',
  'rule',
  'sign',
  'turn',
] as const;

export type CarouselSlideRole = (typeof CAROUSEL_SLIDE_ROLES)[number];

// One line per role, written for the extraction model rather than the UI. Typed
// as a full Record so adding a role to the array above fails the build until it
// is described here — that is what stops the two lists drifting apart again.
export const CAROUSEL_SLIDE_ROLE_GLOSSES: Record<CarouselSlideRole, string> = {
  cover: 'the opening slide that carries the hook',
  reframe: 'shifts how the reader sees the problem',
  framework: 'names or lays out a model',
  step: 'one numbered action or principle in a sequence',
  proof: 'evidence, example, or result that backs a claim',
  cta: 'the closing ask',
  mirror: 'reflects the reader’s situation back at them',
  checklist: 'a list of checks, criteria, or signals',
  reflection: 'invites the reader to pause and consider',
  diagnosis: 'names what is actually going wrong',
  myth: 'states a common belief in order to break it',
  cost: 'what the mistake costs, or what avoiding it prevents',
  rule: 'a sharp prescriptive rule to follow',
  sign: 'an indicator the reader can spot',
  turn: 'a pivot in the narrative',
};
export type CarouselComposition =
  | 'auto'
  | 'editorial_cover'
  | 'bold_claim'
  | 'quiet_intro'
  | 'quote_panel'
  | 'contrast_block'
  | 'note_card'
  | 'numbered_stack'
  | 'side_rail'
  | 'card_grid'
  | 'evidence_card'
  | 'example_note'
  | 'credibility_cue'
  | 'soft_reflection'
  | 'direct_action'
  | 'save_share_close';

export type CarouselTemplatePalette = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  panel: string;
  border: string;
  chipBackground: string;
  chipText: string;
};

// Per-template furniture config for the slide renderer (CHANGE F of the Carousel Studio v2 brief).
export type CarouselFurniture = {
  wordmark: string;
  wordmarkWeight: number;
  wordmarkSize: number;
  wordmarkTracking: string;
  wordmarkColor: string;
  counter: 'pill' | 'strip';
  topRight?: { text: string; color: string };
  footerDash: string;
  footerLeft: string;
  footerColor: string;
  footerRight: string;
  footerRightLast: string;
  swipeCue: boolean;
  handle: boolean;
};

// Audience-facing stage eyebrows per layout recipe (CHANGE E of the brief). The renderer
// reads stageEyebrows[recipe][role] and never renders internal role/composition identifiers.
export type CarouselStageEyebrows = Record<CarouselLayoutRecipe, Partial<Record<CarouselSlideRole, string>>>;

export const carouselStageEyebrows: CarouselStageEyebrows = {
  authority_framework: {
    reframe: 'THE REFRAME',
    framework: 'THE FRAMEWORK',
    step: 'THE PRACTICE',
    proof: 'THE COST',
    cta: 'YOUR MOVE',
  },
  guided_shift: {
    mirror: 'SOUND FAMILIAR?',
    diagnosis: 'NAME IT',
    reframe: 'THE SHIFT',
    step: 'START SMALL',
    reflection: 'REFLECT',
    cta: 'YOUR MOVE',
  },
  diagnostic_reframe: {
    diagnosis: 'THE HIDDEN PROBLEM',
    myth: 'THE MISTAKE',
    cost: 'THE COST',
    rule: 'THE BETTER RULE',
    step: 'THE MOVE',
    cta: 'YOUR MOVE',
  },
  narrative_launch: {
    sign: 'SIGN {n}',
    turn: 'REFLECTION',
    cta: 'JOIN US',
  },
};

// Brand-canonical type stacks (Inter + Playfair Display) for html2canvas export clones.
// Do not read CSS vars here: they resolve to off-brand Raleway / Noto Serif Display.
export const CAROUSEL_EXPORT_FONT_SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const CAROUSEL_EXPORT_FONT_SERIF = '"Playfair Display", Georgia, serif';

const defaultCarouselFurniture: CarouselFurniture = {
  wordmark: 'COACH KAGISO',
  wordmarkWeight: 600,
  wordmarkSize: 26,
  wordmarkTracking: '0.18em',
  wordmarkColor: '#142334',
  counter: 'pill',
  footerDash: '#C9AD98',
  footerLeft: 'COACHKAGISO.CO.ZA',
  footerColor: '#A09086',
  footerRight: '@coach.kagiso',
  footerRightLast: 'LINK IN COMMENTS',
  swipeCue: true,
  handle: false,
};

const signatureNarrativeFurniture: CarouselFurniture = {
  ...defaultCarouselFurniture,
  wordmark: 'COACHKAGISO',
  wordmarkWeight: 700,
  wordmarkTracking: '0.08em',
  counter: 'strip',
  topRight: { text: '@coach.kagiso', color: '#A09086' },
};

export type CarouselSlideCountOption = {
  value: CarouselSlideCount;
  label: string;
  description: string;
  prompt: string;
};

export type CarouselAspectRatioOption = {
  value: CarouselAspectRatio;
  label: string;
  size: string;
  description: string;
  prompt: string;
  cssRatio: string;
  exportWidth: number;
  exportHeight: number;
};

export type CarouselLayoutRecipeOption = {
  value: CarouselLayoutRecipe;
  label: string;
  description: string;
  prompt: string;
  slideArc: string[];
  slideTypes: CarouselSlideRole[];
};

export type CarouselCompositionOption = {
  value: CarouselComposition;
  label: string;
  description: string;
};

export type CarouselTemplateOption = {
  value: CarouselTemplate;
  label: string;
  bestFor: string;
  description: string;
  palette: CarouselTemplatePalette;
  furniture: CarouselFurniture;
  designDirection: {
    label: string;
    mood: string;
    typography: string;
    posture: string[];
    tokens: {
      background: string;
      surface: string;
      ink: string;
      muted: string;
      accent: string;
      border: string;
    };
  };
  layoutRecipe: CarouselLayoutRecipeOption;
  promptBehavior: {
    generation: string[];
    slideRules: string[];
  };
  preview: {
    eyebrow: string;
    headline: string;
    body: string;
  };
  exportRules: {
    pdf: string;
    png: string;
  };
};

export const DEFAULT_CAROUSEL_SLIDE_COUNT: CarouselSlideCount = 'auto';
export const DEFAULT_CAROUSEL_ASPECT_RATIO: CarouselAspectRatio = 'auto';
export const DEFAULT_CAROUSEL_TEMPLATE: CarouselTemplate = 'editorial_authority';
export const DEFAULT_CAROUSEL_LAYOUT_RECIPE: CarouselLayoutRecipe = 'authority_framework';

export const carouselSlideCountOptions: CarouselSlideCountOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'AI decides the ideal number of slides based on your content',
    prompt: 'AI should decide the ideal number of carousel slides based on the topic, angle, and audience pressure.',
  },
  {
    value: 'quick',
    label: 'Quick',
    description: '5 to 6 slides, lean and fast to consume',
    prompt: 'Create a quick carousel with 5 to 6 slides. Keep it lean, easy to consume, and focused on one useful idea.',
  },
  {
    value: 'full',
    label: 'Full',
    description: '8 to 10 slides, comprehensive and in depth',
    prompt: 'Create a full carousel with 8 to 10 slides. Make it comprehensive, structured, and in depth without padding.',
  },
];

export const carouselAspectRatioOptions: CarouselAspectRatioOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    size: 'Platform fit',
    description: 'Use LinkedIn document portrait for LinkedIn and 4:5 portrait for Instagram/Facebook.',
    prompt: 'Use the strongest aspect ratio for the selected platform.',
    cssRatio: '4 / 5',
    exportWidth: 1080,
    exportHeight: 1350,
  },
  {
    value: 'square_1_1',
    label: 'Square',
    size: '1080 x 1080',
    description: 'Clean universal frame for feed-safe carousel slides.',
    prompt: 'Design for a 1:1 square frame, 1080 by 1080 pixels.',
    cssRatio: '1 / 1',
    exportWidth: 1080,
    exportHeight: 1080,
  },
  {
    value: 'portrait_4_5',
    label: 'Portrait',
    size: '1080 x 1350',
    description: 'Tall mobile feed frame with more breathing room for text.',
    prompt: 'Design for a 4:5 portrait frame, 1080 by 1350 pixels.',
    cssRatio: '4 / 5',
    exportWidth: 1080,
    exportHeight: 1350,
  },
  {
    value: 'linkedin_document',
    label: 'LinkedIn PDF',
    size: '1080 x 1350',
    description: 'Document-style portrait page for LinkedIn PDF carousel export.',
    prompt: 'Design for a LinkedIn PDF document portrait frame, 1080 by 1350 pixels.',
    cssRatio: '4 / 5',
    exportWidth: 1080,
    exportHeight: 1350,
  },
];

const narrativeLaunch: CarouselLayoutRecipeOption = {
  value: 'narrative_launch',
  label: 'Narrative Launch',
  description: 'Hook -> Signs -> Personal turn -> Event CTA. A story-driven launch sequence.',
  prompt: 'Structure the carousel as a story-driven launch: open with a big personal hook, show 2 to 4 signs the reader recognises, make a personal turn in Reflection-Friday register, then close with a warm event invitation.',
  slideArc: ['Hook', 'Signs', 'Personal turn', 'CTA'],
  slideTypes: ['cover', 'sign', 'turn', 'cta'],
};

export const carouselLayoutRecipeOptions: CarouselLayoutRecipeOption[] = [
  {
    value: 'authority_framework',
    label: 'Authority Framework',
    description: 'A print-style thought leadership sequence for LinkedIn credibility.',
    prompt: 'Structure the carousel as a concise authority deck: name the tension, define the frame, teach the steps, then close with a grounded invitation.',
    slideArc: ['Tension', 'Reframe', 'Framework', 'Steps', 'Proof cue', 'CTA'],
    slideTypes: ['cover', 'reframe', 'framework', 'step', 'proof', 'cta'],
  },
  {
    value: 'guided_shift',
    label: 'Guided Shift',
    description: 'A warm coaching sequence that moves the reader from feeling seen to taking one step.',
    prompt: 'Structure the carousel as a gentle guided shift: mirror the reader, name what is happening, offer a calmer lens, give small actions, then invite reflection.',
    slideArc: ['Mirror', 'Name it', 'New lens', 'Small actions', 'Reflection', 'CTA'],
    slideTypes: ['cover', 'mirror', 'reframe', 'checklist', 'reflection', 'cta'],
  },
  {
    value: 'diagnostic_reframe',
    label: 'Diagnostic Reframe',
    description: 'A sharp problem-first sequence for hooks, myths, and pattern interrupts.',
    prompt: 'Structure the carousel as a diagnostic reframe: open with the hidden problem, expose the mistake, show the cost, replace it with a sharper rule, then close with action.',
    slideArc: ['Hidden problem', 'Mistake', 'Cost', 'Better rule', 'Action', 'CTA'],
    slideTypes: ['cover', 'diagnosis', 'myth', 'cost', 'rule', 'cta'],
  },
  narrativeLaunch,
];

export const carouselCompositionOptions: CarouselCompositionOption[] = [
  {
    value: 'auto',
    label: 'Auto fit',
    description: 'Let the renderer choose the strongest layout for the copy length, role, and template.',
  },
  {
    value: 'editorial_cover',
    label: 'Editorial cover',
    description: 'A premium title-page cover with clear hierarchy and calm support copy.',
  },
  {
    value: 'bold_claim',
    label: 'Bold claim',
    description: 'A larger statement layout for short, high-impact cover lines.',
  },
  {
    value: 'quiet_intro',
    label: 'Quiet intro',
    description: 'A softer cover layout for longer headlines or reflective openings.',
  },
  {
    value: 'quote_panel',
    label: 'Quote panel',
    description: 'A framed insight or reframe that reads like a pull quote.',
  },
  {
    value: 'contrast_block',
    label: 'Contrast block',
    description: 'A before-and-after or old-frame/new-frame comparison.',
  },
  {
    value: 'note_card',
    label: 'Note card',
    description: 'A dense-friendly note panel for nuanced explanation.',
  },
  {
    value: 'numbered_stack',
    label: 'Numbered stack',
    description: 'A structured list for steps, rules, and frameworks.',
  },
  {
    value: 'side_rail',
    label: 'Side rail',
    description: 'A text-safe teaching layout with a strong vertical anchor.',
  },
  {
    value: 'card_grid',
    label: 'Card grid',
    description: 'A compact grid for short checklist or framework points.',
  },
  {
    value: 'evidence_card',
    label: 'Evidence card',
    description: 'A proof-focused panel for credibility cues or results logic.',
  },
  {
    value: 'example_note',
    label: 'Example note',
    description: 'A story-like proof layout for examples and lived observations.',
  },
  {
    value: 'credibility_cue',
    label: 'Credibility cue',
    description: 'A small authority marker for proof without over-explaining.',
  },
  {
    value: 'soft_reflection',
    label: 'Soft reflection',
    description: 'A gentle close for coaching, reflection, and reply prompts.',
  },
  {
    value: 'direct_action',
    label: 'Direct action',
    description: 'A stronger final-step layout for clear CTA copy.',
  },
  {
    value: 'save_share_close',
    label: 'Save/share close',
    description: 'A closing frame that nudges saving, sharing, or returning to the deck.',
  },
];

export const carouselCompositionsByRole: Record<CarouselSlideRole, CarouselComposition[]> = {
  cover: ['auto', 'editorial_cover', 'bold_claim', 'quiet_intro'],
  reframe: ['auto', 'quote_panel', 'contrast_block', 'note_card'],
  framework: ['auto', 'numbered_stack', 'side_rail', 'card_grid'],
  step: ['auto', 'numbered_stack', 'side_rail', 'card_grid'],
  proof: ['auto', 'evidence_card', 'example_note', 'credibility_cue'],
  cta: ['auto', 'soft_reflection', 'direct_action', 'save_share_close'],
  mirror: ['auto', 'quote_panel', 'note_card', 'soft_reflection'],
  checklist: ['auto', 'numbered_stack', 'card_grid', 'side_rail'],
  reflection: ['auto', 'soft_reflection', 'quote_panel', 'note_card'],
  diagnosis: ['auto', 'contrast_block', 'quote_panel', 'note_card'],
  myth: ['auto', 'contrast_block', 'quote_panel', 'note_card'],
  cost: ['auto', 'evidence_card', 'contrast_block', 'note_card'],
  rule: ['auto', 'numbered_stack', 'side_rail', 'card_grid'],
  sign: ['auto', 'note_card', 'example_note', 'quote_panel'],
  turn: ['auto', 'soft_reflection', 'example_note'],
};

const authorityFramework = carouselLayoutRecipeOptions[0];
const guidedShift = carouselLayoutRecipeOptions[1];
const diagnosticReframe = carouselLayoutRecipeOptions[2];

export const carouselTemplateOptions: CarouselTemplateOption[] = [
  {
    value: 'editorial_authority',
    label: 'Editorial Authority',
    bestFor: 'LinkedIn authority decks',
    description: 'Refined, quiet, high-trust slides with strong editorial hierarchy.',
    furniture: defaultCarouselFurniture,
    palette: {
      background: '#E8E3DF',
      foreground: '#142334',
      muted: '#A09086',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: '#CDC6C3',
      chipBackground: '#142334',
      chipText: '#FFFFFF',
    },
    designDirection: {
      label: 'Editorial authority',
      mood: 'Print-led, restrained, and high trust. It should feel like a career column, not a social template.',
      typography: 'Serif display headlines, calm sans body copy, small uppercase metadata.',
      posture: [
        'Use whitespace, borders, and hierarchy before decoration.',
        'Keep one warm accent and use it sparingly.',
        'Make each slide feel like a page from the same editorial deck.',
      ],
      tokens: {
        background: '#E8E3DF',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#A09086',
        accent: '#C9AD98',
        border: '#CDC6C3',
      },
    },
    layoutRecipe: authorityFramework,
    promptBehavior: {
      generation: [
        'Prioritize credibility, clarity, and original insight.',
        'Avoid hype language, generic motivation, and vague inspiration.',
        'Make the argument feel structured enough to save as a reference.',
      ],
      slideRules: [
        'One headline-level idea per slide.',
        'Use proof cues or lived examples when the topic allows it.',
        'End with a professional next step, not a loud sales push.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Authority deck',
      headline: 'The pattern is the point.',
      body: 'A quiet, structured sequence for LinkedIn credibility and trust.',
    },
    exportRules: {
      pdf: 'Preserve one slide per portrait PDF page for LinkedIn document carousels.',
      png: 'Keep each PNG readable as a standalone feed frame.',
    },
  },
  {
    value: 'editorial_career_notes',
    label: 'Editorial Career Notes',
    bestFor: 'Premium career frameworks',
    description: 'Print-inspired career-note slides with oversized serif type, fine rules, and Rodeo Dust movement cues.',
    furniture: defaultCarouselFurniture,
    palette: {
      background: '#E4D8CB',
      foreground: '#142334',
      muted: '#A09086',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: '#A09086',
      chipBackground: '#142334',
      chipText: '#FFFFFF',
    },
    designDirection: {
      label: 'Editorial career notes',
      mood: 'Premium, spacious, and print-like. It should feel like a branded mini-publication for career clarity.',
      typography: 'Oversized serif headlines, compact sans metadata, and restrained body copy with wide margins.',
      posture: [
        'Use large quiet type as the primary design asset.',
        'Add thin rules, corner frames, and Rodeo Dust vector arrows and underlines for movement.',
        'Make the deck feel collectible, like a career note worth saving.',
      ],
      tokens: {
        background: '#E4D8CB',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#A09086',
        accent: '#C9AD98',
        border: '#A09086',
      },
    },
    layoutRecipe: authorityFramework,
    promptBehavior: {
      generation: [
        'Build a polished editorial argument with one clear career insight per slide.',
        'Favor frameworks, roadmaps, principles, and practical reframes over motivational copy.',
        'Write copy that can hold large serif type without becoming crowded.',
      ],
      slideRules: [
        'Keep cover headlines strong enough to stand alone as a poster.',
        'Use numbered steps or short proof cues in the middle slides.',
        'End with a save-worthy roadmap, reflection, or calm professional CTA.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Career note',
      headline: 'Before you pivot, build the signal.',
      body: 'A print-led deck style for frameworks, roadmaps, and authority-building career insights.',
    },
    exportRules: {
      pdf: 'Preserve wide page margins and one slide per LinkedIn PDF page.',
      png: 'Keep thin rules and serif hierarchy sharp on 4:5 mobile frames.',
    },
  },
  {
    value: 'warm_coaching',
    label: 'Warm Coaching',
    bestFor: 'Instagram relationship posts',
    description: 'Soft, human, calm frames for reassurance, reflection, and trust.',
    furniture: defaultCarouselFurniture,
    palette: {
      background: '#E4D8CB',
      foreground: '#142334',
      muted: '#A09086',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: '#CDC6C3',
      chipBackground: '#C9AD98',
      chipText: '#142334',
    },
    designDirection: {
      label: 'Warm coaching',
      mood: 'Gentle, reflective, and human. It should feel like being guided through a useful realisation.',
      typography: 'Serif display headlines with warm sans body copy and softer detail labels.',
      posture: [
        'Lead with empathy before instruction.',
        'Use soft contrast and warm surfaces without becoming beige or sleepy.',
        'Make the reader feel seen, then give them one useful move.',
      ],
      tokens: {
        background: '#E4D8CB',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#A09086',
        accent: '#C9AD98',
        border: '#CDC6C3',
      },
    },
    layoutRecipe: guidedShift,
    promptBehavior: {
      generation: [
        'Write like a coach who is calm, observant, and practical.',
        'Avoid therapy cosplay, over-soft language, and generic affirmations.',
        'Make every slide feel emotionally specific to the reader.',
      ],
      slideRules: [
        'Use plain language and short body copy.',
        'Let the middle slides build relief through clarity.',
        'End with a reflective CTA or a soft invitation to reply.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Guided shift',
      headline: 'You are not behind. You are unclear.',
      body: 'A softer sequence for reflection, trust, and relationship-driven posts.',
    },
    exportRules: {
      pdf: 'Keep enough margin so soft surfaces still feel premium in PDF.',
      png: 'Favor 4:5 portrait frames for Instagram and Facebook readability.',
    },
  },
  {
    value: 'soft_diagnostic_cards',
    label: 'Soft Diagnostic Cards',
    bestFor: 'Emotional diagnostic posts',
    description: 'Soft textured diagnostic frames with speech-card layering and human note-like emphasis.',
    furniture: defaultCarouselFurniture,
    palette: {
      background: '#E8E3DF',
      foreground: '#142334',
      muted: '#A09086',
      accent: '#A09086',
      panel: '#FFFFFF',
      border: '#A09086',
      chipBackground: '#E4D8CB',
      chipText: '#142334',
    },
    designDirection: {
      label: 'Soft diagnostic cards',
      mood: 'Grounded, tactile, and intimate. It should feel like a calm observation written on textured cards.',
      typography: 'Serif reflection lines, rounded sans card text, and small note-like labels.',
      posture: [
        'Use layered cards and speech-bubble shapes to make diagnostic copy feel conversational.',
        'Let one emotional sentence breathe before offering the practical reframe.',
        'Use Chai, Creme, and Rodeo Dust accents without turning the whole deck beige.',
      ],
      tokens: {
        background: '#E8E3DF',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#A09086',
        accent: '#A09086',
        border: '#A09086',
      },
    },
    layoutRecipe: guidedShift,
    promptBehavior: {
      generation: [
        'Open with a felt diagnostic truth, not a generic lesson.',
        'Use specific reader language around burnout, pivoting, confidence, visibility, or career fog.',
        'Balance emotional recognition with one practical next step.',
      ],
      slideRules: [
        'Keep card text short enough to feel like a note, not an essay.',
        'Use one strong reframe or question per slide.',
        'Close with a reflective prompt or low-pressure invitation.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Tension slides use the conviction-reframe pattern: name the comfortable default, then flip it as a risk.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Diagnostic note',
      headline: 'You do not need more pressure.',
      body: 'A softer card-led deck for emotional pattern recognition and warm career coaching.',
    },
    exportRules: {
      pdf: 'Keep card edges and texture visible while preserving text contrast.',
      png: 'Favor portrait frames so layered cards have enough breathing room.',
    },
  },
  {
    value: 'bold_diagnostic',
    label: 'Bold Diagnostic',
    bestFor: 'Hooks, myths, sharp reframes',
    description: 'High-contrast, decisive slides for stopping the scroll and naming the problem.',
    furniture: defaultCarouselFurniture,
    palette: {
      background: '#142334',
      foreground: '#FFFFFF',
      muted: '#CDC6C3',
      accent: '#C9AD98',
      panel: '#142334',
      border: '#C9AD98',
      chipBackground: '#C9AD98',
      chipText: '#142334',
    },
    designDirection: {
      label: 'Bold diagnostic',
      mood: 'Decisive, direct, and pattern-breaking. It should name the uncomfortable thing without becoming aggressive.',
      typography: 'Large serif statements, compact sans support copy, strong contrast.',
      posture: [
        'Open with a problem the audience recognises immediately.',
        'Use contrast and restraint instead of loud decoration.',
        'Keep each slide punchy enough to understand in one glance.',
      ],
      tokens: {
        background: '#142334',
        surface: '#142334',
        ink: '#FFFFFF',
        muted: '#CDC6C3',
        accent: '#C9AD98',
        border: '#C9AD98',
      },
    },
    layoutRecipe: diagnosticReframe,
    promptBehavior: {
      generation: [
        'Lead with the hidden cost or mistaken belief.',
        'Use strong, specific language without clickbait.',
        'Replace the mistake with a practical career or leadership rule.',
      ],
      slideRules: [
        'Keep headlines short and high-impact.',
        'Do not overcrowd dark slides with dense body copy.',
        'End with a clear action or diagnostic question.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Tension slides use the conviction-reframe pattern: name the comfortable default, then flip it as a risk.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Diagnostic reframe',
      headline: 'This is not a visibility problem.',
      body: 'A sharper sequence for hooks, myths, and scroll-stopping reframes.',
    },
    exportRules: {
      pdf: 'Keep high contrast intact when captured into LinkedIn PDF pages.',
      png: 'Avoid tiny text so each dark frame survives mobile compression.',
    },
  },
  {
    value: 'signature_narrative',
    label: 'Signature Narrative',
    bestFor: 'Launch & story decks',
    description: 'Progress strip, handle, swipe cue, personal story beats, event CTA.',
    furniture: signatureNarrativeFurniture,
    palette: {
      background: '#E8E3DF',
      foreground: '#142334',
      muted: '#A09086',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: '#CDC6C3',
      chipBackground: '#142334',
      chipText: '#FFFFFF',
    },
    designDirection: {
      label: 'Signature narrative',
      mood: 'Intimate, story-led, and launch-shaped. It should feel like a personal letter with a clear event ask at the end.',
      typography: 'Large Playfair statements for hooks and turns, Inter 600 key lines inside short body blocks.',
      posture: [
        'Open with one big personal hook and a single-line sub.',
        'Use 2 to 4 sign slides that name the pattern the reader recognises.',
        'Turn personal in the Reflection-Friday register, then close with a warm event invitation.',
      ],
      tokens: {
        background: '#E8E3DF',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#A09086',
        accent: '#C9AD98',
        border: '#CDC6C3',
      },
    },
    layoutRecipe: narrativeLaunch,
    promptBehavior: {
      generation: [
        'Structure the deck as a personal story: hook, signs the reader recognises, a personal turn, then a soft event CTA.',
        'Sign slides: a Playfair headline plus two short body blocks with one Inter 600 key line.',
        'Turn slides: first-person reflection in the Reflection-Friday register, e.g. "I had to learn this myself."',
      ],
      slideRules: [
        'CTA slide: headline plus up to 4 emoji bullets (live-virtual-workshop, duration, capacity, outcome) and one footnote line for price and early-bird deadline.',
        'Event date, price, and deadline are per-deck editable content; never hardcode dates or prices.',
        'Use at most one em dash across the entire deck; prefer periods or commas.',
        'Use her vocabulary sparingly: elevate, show up, stretch, pour into, hold space, intentional, visibility, "your career matters".',
        'Avoid forbidden words: strategist, leverage, synergy, empowerment, manifestation, hustle.',
        'Never use internal template labels like role or composition names in slide copy.',
      ],
    },
    preview: {
      eyebrow: 'Narrative launch',
      headline: 'There are two others.',
      body: 'A story-driven launch sequence with a personal hook, signs, turn, and event CTA.',
    },
    exportRules: {
      pdf: 'Keep the progress strip and swipe cue crisp on every LinkedIn PDF page.',
      png: 'Favor 4:5 portrait frames so the story blocks and event CTA stay readable.',
    },
  },
];

export function getCarouselSlideCountOption(value: CarouselSlideCount) {
  return carouselSlideCountOptions.find((option) => option.value === value) || carouselSlideCountOptions[0];
}

export function isCarouselAspectRatio(value?: string | null): value is CarouselAspectRatio {
  return Boolean(value && carouselAspectRatioOptions.some((option) => option.value === value));
}

export function getCarouselAspectRatioOption(value: CarouselAspectRatio, platform?: CarouselPlatform | null) {
  if (value !== 'auto') {
    return carouselAspectRatioOptions.find((option) => option.value === value) || carouselAspectRatioOptions[0];
  }

  if (platform === 'linkedin') {
    return carouselAspectRatioOptions.find((option) => option.value === 'linkedin_document') || carouselAspectRatioOptions[0];
  }

  if (platform === 'instagram_facebook') {
    return carouselAspectRatioOptions.find((option) => option.value === 'portrait_4_5') || carouselAspectRatioOptions[0];
  }

  return carouselAspectRatioOptions.find((option) => option.value === 'linkedin_document') || carouselAspectRatioOptions[0];
}

export function getCarouselAspectRatioLabel(value: CarouselAspectRatio, platform?: CarouselPlatform | null) {
  const selected = carouselAspectRatioOptions.find((option) => option.value === value) || carouselAspectRatioOptions[0];
  if (value !== 'auto') return `${selected.label} - ${selected.size}`;
  const resolved = getCarouselAspectRatioOption(value, platform);
  return `Auto - ${resolved.label} (${resolved.size})`;
}

export function getCarouselExportDimensions(aspectOption: CarouselAspectRatioOption) {
  return {
    width: aspectOption.exportWidth,
    height: aspectOption.exportHeight,
  };
}

export function isCarouselLayoutRecipe(value?: string | null): value is CarouselLayoutRecipe {
  return Boolean(value && carouselLayoutRecipeOptions.some((option) => option.value === value));
}

export function getCarouselLayoutRecipeOption(value?: CarouselLayoutRecipe | null) {
  return carouselLayoutRecipeOptions.find((option) => option.value === value) || carouselLayoutRecipeOptions[0];
}

export function isCarouselSlideRole(value?: string | null): value is CarouselSlideRole {
  return Boolean(
    value &&
      carouselLayoutRecipeOptions.some((option) =>
        option.slideTypes.some((slideType) => slideType === value),
      ),
  );
}

export function isCarouselComposition(value?: string | null): value is CarouselComposition {
  return Boolean(value && carouselCompositionOptions.some((option) => option.value === value));
}

export function getCarouselCompositionOption(value?: CarouselComposition | null) {
  return carouselCompositionOptions.find((option) => option.value === value) || carouselCompositionOptions[0];
}

export function getCarouselCompositionOptionsForRole(role: CarouselSlideRole) {
  const allowed = carouselCompositionsByRole[role] || carouselCompositionsByRole.step;
  return allowed
    .map((value) => getCarouselCompositionOption(value))
    .filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index);
}

export function isCarouselTemplate(value?: string | null): value is CarouselTemplate {
  return Boolean(value && carouselTemplateOptions.some((option) => option.value === value));
}

export function getCarouselTemplateOption(value?: CarouselTemplate | null) {
  return carouselTemplateOptions.find((option) => option.value === value) || carouselTemplateOptions[0];
}

export function buildCarouselTemplatePromptBlock(value: CarouselTemplate, layoutRecipeValue?: CarouselLayoutRecipe | null) {
  const template = getCarouselTemplateOption(value);
  const layoutRecipe = getCarouselLayoutRecipeOption(layoutRecipeValue || template.layoutRecipe.value);
  return [
    `Visual template: ${template.label}. ${template.description}`,
    `Design direction: ${template.designDirection.label}. ${template.designDirection.mood}`,
    `Typography: ${template.designDirection.typography}`,
    `Layout recipe: ${layoutRecipe.label}. ${layoutRecipe.prompt}`,
    `Slide arc: ${layoutRecipe.slideArc.join(' -> ')}`,
    `Allowed slide roles: ${layoutRecipe.slideTypes.join(', ')}`,
    'Template behavior:',
    ...template.promptBehavior.generation.map((rule) => `- ${rule}`),
    'Slide rules:',
    ...template.promptBehavior.slideRules.map((rule) => `- ${rule}`),
    `PDF export rule: ${template.exportRules.pdf}`,
    `PNG export rule: ${template.exportRules.png}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// CHANGE P: shared slide geometry and sizing.
//
// Three lanes draw the same slide: the HTML preview (which the PNG export
// rasterises), the react-pdf vector document, and Design Studio's layer canvas.
// Each used to carry its own numbers, so "Open in Design Studio" produced a
// visibly different slide from the one in the preview - different margins,
// different type sizes, different composition choices.
//
// These are the preview-baseline values at CAROUSEL_PREVIEW_BASE_WIDTH. Any lane
// rendering at a different width multiplies by (targetWidth / base). The PDF lane
// keeps its own tuned page padding on purpose; everything else reads from here.
// ---------------------------------------------------------------------------

export const CAROUSEL_PREVIEW_BASE_WIDTH = 600;

export const carouselLayoutMetrics = {
  /** Outer frame padding on a standard slide. */
  outerPadding: 40,
  /** Cover slides get slightly wider side margins. */
  coverSidePadding: 53,
  /** Vertical guard rails keeping headline and body clear of the frame edges. */
  safeBandY: 140,
  /** Gap between the header row and the content column. */
  headerGap: 16,
  brandFontSize: 13,
  counterFontSize: 13.3,
  eyebrowFontSize: 12,
  bodyFontSize: 17,
  ctaFontSize: 15,
  /** Leading applied to headline text when measuring stacked height. */
  headlineLineHeight: 1.08,
  bodyLineHeight: 1.5,
} as const;

export function getCarouselLayoutScale(targetWidth: number) {
  return targetWidth / CAROUSEL_PREVIEW_BASE_WIDTH;
}

export type CarouselSlideTextInput = {
  headline: string;
  body: string;
  cta?: string;
  composition?: CarouselComposition;
};

export function getCarouselSlideBodyPoints(body: string, limit = 4) {
  return body
    .split(/\n+|;\s+|(?<=\.)\s+/)
    .map((point) => point.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .slice(0, limit);
}

export function getCarouselSlideTextStats(slide: CarouselSlideTextInput) {
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

export function normalizeCarouselCompositionForRole(
  value: unknown,
  role: CarouselSlideRole,
): CarouselComposition {
  const raw = typeof value === 'string' ? value : '';
  const allowed = getCarouselCompositionOptionsForRole(role).map((option) => option.value);
  return isCarouselComposition(raw) && allowed.includes(raw) ? raw : 'auto';
}

export function resolveCarouselComposition(
  slide: CarouselSlideTextInput,
  role: CarouselSlideRole,
  template: CarouselTemplateOption,
  bodyPoints: string[],
): CarouselComposition {
  const selected = normalizeCarouselCompositionForRole(slide.composition, role);
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

export function getCarouselHeadlineSize(
  composition: CarouselComposition,
  stats: ReturnType<typeof getCarouselSlideTextStats>,
) {
  // Brand type scale at 1080x1350: cover 96-110px, inner 72-84px. These are the
  // preview baseline; each lane scales by its own width ratio.
  if (composition === 'bold_claim') return stats.headlineWords > 7 ? 53 : 61;
  if (composition === 'editorial_cover') return stats.headlineWords > 9 ? 53 : 59;
  if (composition === 'quiet_intro') return 53;
  if (composition === 'direct_action') return 44;
  if (composition === 'save_share_close') return 42;
  if (composition === 'credibility_cue') return 42;
  if (composition === 'card_grid' || composition === 'side_rail' || composition === 'note_card') return 40;
  return stats.headlineWords > 9 ? 40 : 46;
}

/**
 * The size actually rendered, after the cover bump and the Career Notes
 * adjustment. The preview applied these inline while Design Studio did not,
 * which left covers a step smaller on import. Both lanes now call this.
 */
export function getCarouselResolvedHeadlineSize(
  composition: CarouselComposition,
  stats: ReturnType<typeof getCarouselSlideTextStats>,
  options: { isCover: boolean; template: CarouselTemplate },
) {
  const base = getCarouselHeadlineSize(composition, stats);
  const isCareerNotes = options.template === 'editorial_career_notes';
  if (options.isCover) return Math.min(base + (isCareerNotes ? 8 : 6), 61);
  if (isCareerNotes) return Math.min(base + 4, 46);
  return base;
}
