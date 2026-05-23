export type CarouselPlatform = 'linkedin' | 'instagram_facebook' | 'tiktok' | 'email_voice';
export type CarouselSlideCount = 'auto' | 'quick' | 'full';
export type CarouselAspectRatio = 'auto' | 'square_1_1' | 'portrait_4_5' | 'linkedin_document';
export type CarouselLayoutRecipe = 'authority_framework' | 'guided_shift' | 'diagnostic_reframe';
export type CarouselTemplate =
  | 'editorial_authority'
  | 'editorial_career_notes'
  | 'warm_coaching'
  | 'soft_diagnostic_cards'
  | 'bold_diagnostic';
export type CarouselSlideRole =
  | 'cover'
  | 'reframe'
  | 'framework'
  | 'step'
  | 'proof'
  | 'cta'
  | 'mirror'
  | 'checklist'
  | 'reflection'
  | 'diagnosis'
  | 'myth'
  | 'cost'
  | 'rule';
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
    size: '1080 x 1398',
    description: 'Document-style portrait page for LinkedIn PDF carousel export.',
    prompt: 'Design for a LinkedIn PDF document portrait frame, 1080 by 1398 pixels.',
    cssRatio: '1080 / 1398',
    exportWidth: 1080,
    exportHeight: 1398,
  },
];

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
    palette: {
      background: '#FBFAF8',
      foreground: '#142334',
      muted: '#6B6B6B',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: '#E4D8CB',
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
        background: '#FBFAF8',
        surface: '#FFFFFF',
        ink: '#142334',
        muted: '#6B6B6B',
        accent: '#C9AD98',
        border: '#E4D8CB',
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
    description: 'Print-inspired career-note slides with oversized serif type, fine rules, and hand-drawn movement cues.',
    palette: {
      background: '#F7F4EE',
      foreground: '#142334',
      muted: '#6F6A61',
      accent: '#9F5F4B',
      panel: '#FFFCF6',
      border: '#D8C8BB',
      chipBackground: '#142334',
      chipText: '#F7F4EE',
    },
    designDirection: {
      label: 'Editorial career notes',
      mood: 'Premium, spacious, and print-like. It should feel like a branded mini-publication for career clarity.',
      typography: 'Oversized serif headlines, compact sans metadata, and restrained body copy with wide margins.',
      posture: [
        'Use large quiet type as the primary design asset.',
        'Add thin rules, corner frames, and subtle hand-drawn lines for movement.',
        'Make the deck feel collectible, like a career note worth saving.',
      ],
      tokens: {
        background: '#F7F4EE',
        surface: '#FFFCF6',
        ink: '#142334',
        muted: '#6F6A61',
        accent: '#9F5F4B',
        border: '#D8C8BB',
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
    palette: {
      background: '#F7EFE8',
      foreground: '#142334',
      muted: '#7A6255',
      accent: '#B98567',
      panel: '#FFFDFC',
      border: '#D9BDA9',
      chipBackground: '#EBD8CB',
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
        background: '#F7EFE8',
        surface: '#FFFDFC',
        ink: '#142334',
        muted: '#7A6255',
        accent: '#B98567',
        border: '#D9BDA9',
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
    description: 'Soft textured diagnostic frames with speech-card layering, sage accents, and human note-like emphasis.',
    palette: {
      background: '#6F866D',
      foreground: '#FFF8ED',
      muted: '#F5E9D8',
      accent: '#C9AD98',
      panel: '#FFF3E2',
      border: 'rgba(255,248,237,0.72)',
      chipBackground: '#FFF3E2',
      chipText: '#577057',
    },
    designDirection: {
      label: 'Soft diagnostic cards',
      mood: 'Grounded, tactile, and intimate. It should feel like a calm observation written on textured cards.',
      typography: 'Serif reflection lines, rounded sans card text, and small note-like labels.',
      posture: [
        'Use layered cards and speech-bubble shapes to make diagnostic copy feel conversational.',
        'Let one emotional sentence breathe before offering the practical reframe.',
        'Use sage, cream, and warm accent tones without turning the whole deck beige.',
      ],
      tokens: {
        background: '#6F866D',
        surface: '#FFF3E2',
        ink: '#FFF8ED',
        muted: '#F5E9D8',
        accent: '#C9AD98',
        border: 'rgba(255,248,237,0.72)',
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
    palette: {
      background: '#142334',
      foreground: '#FFFFFF',
      muted: '#D8C8BB',
      accent: '#C9AD98',
      panel: '#FFFFFF',
      border: 'rgba(255,255,255,0.18)',
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
        surface: '#20354D',
        ink: '#FFFFFF',
        muted: '#D8C8BB',
        accent: '#C9AD98',
        border: 'rgba(255,255,255,0.18)',
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
