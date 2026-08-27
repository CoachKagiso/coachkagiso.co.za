export type AsyncServiceSlug =
  | 'cv-revamp'
  | 'cover-letter'
  | 'linkedin'
  | 'bundle'
  | 'masterclass'
  | 'career-clarity'
  | 'glow-up-vip';
export type BookingSlug = 'discovery' | 'clarity' | 'glow-up';

export type IntakeField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'radio';
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  options?: string[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type AsyncService = {
  slug: AsyncServiceSlug;
  title: string;
  amount: number;
  kind?: 'delivery' | 'event' | 'booking';
  checkoutAccess?: 'public' | 'accepted_booking';
  turnaround: string;
  deliveryDays: number;
  summary: string;
  buyCta: string;
  folder: string;
  requiresCvUpload: boolean;
  cvInstruction?: string;
  fields: IntakeField[];
  faqs: FaqItem[];
  confirmationSubject: string;
  confirmationBody: (firstName: string) => string;
};

export const MASTERCLASS_SESSION_LABEL = 'Saturday 4 July 2026, 10:00 to 12:00 SAST';
export const MASTERCLASS_EARLY_BIRD_AMOUNT = 450;
export const MASTERCLASS_STANDARD_AMOUNT = 500;
export const MASTERCLASS_EARLY_BIRD_ENDS_AT = '2026-06-07T21:00:00+02:00';
export const MASTERCLASS_EARLY_BIRD_ENDS_LABEL = 'Sunday 7 June at 21:00';

export function isMasterclassEarlyBirdOpen(now = new Date()) {
  return now.getTime() < new Date(MASTERCLASS_EARLY_BIRD_ENDS_AT).getTime();
}

export function getMasterclassCheckoutAmount(now = new Date()) {
  return isMasterclassEarlyBirdOpen(now) ? MASTERCLASS_EARLY_BIRD_AMOUNT : MASTERCLASS_STANDARD_AMOUNT;
}

export function getMasterclassPriceLabel(now = new Date()) {
  return isMasterclassEarlyBirdOpen(now)
    ? `R${MASTERCLASS_EARLY_BIRD_AMOUNT} early bird · R${MASTERCLASS_STANDARD_AMOUNT} after ${MASTERCLASS_EARLY_BIRD_ENDS_LABEL}`
    : `R${MASTERCLASS_STANDARD_AMOUNT} standard price`;
}

export function getMasterclassPriceNote(now = new Date()) {
  return isMasterclassEarlyBirdOpen(now)
    ? `Early bird closes ${MASTERCLASS_EARLY_BIRD_ENDS_LABEL}. After that, the standard price is R${MASTERCLASS_STANDARD_AMOUNT}.`
    : `The early bird window has closed. Standard price is R${MASTERCLASS_STANDARD_AMOUNT}.`;
}

export function getServiceCheckoutAmount(service: Pick<AsyncService, 'slug' | 'amount'>, now = new Date()) {
  return service.slug === 'masterclass' ? getMasterclassCheckoutAmount(now) : service.amount;
}

export type BookingPageConfig = {
  title: string;
  envKey: string;
  fallbackUrl: string;
  description: string;
  mode?: 'calendar' | 'reservation';
  ctaLabel?: string;
  availabilityNote?: string;
  faqs: FaqItem[];
};

export const asyncServices: Record<AsyncServiceSlug, AsyncService> = {
  'cv-revamp': {
    slug: 'cv-revamp',
    title: 'CV Revamp',
    amount: 400,
    turnaround: '5 working days',
    deliveryDays: 5,
    buyCta: 'Revamp my CV',
    folder: 'cv-revamp',
    requiresCvUpload: true,
    cvInstruction: 'If you choose the email option instead, send your CV to hello@coachkagiso.co.za with the subject: Your Name - CV Revamp.',
    summary:
      'Your full CV rewritten to read like a story of impact, not a list of duties. ATS-friendly, recruiter-tested, and built for the role you actually want.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'tel', maxLength: 30 },
      {
        name: 'targetRole',
        label: 'What role or industry are you targeting?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'currentRole',
        label: "What's your current role and how long have you been in it?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'cvProblem',
        label: "What do you feel isn't working about your current CV?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
    ],
    faqs: [
      {
        question: 'What is included in the CV Revamp?',
        answer: 'A full rewrite of your CV in Word and PDF, plus a walkthrough explaining the thinking behind the changes.',
      },
      {
        question: 'Do you write for South African employers and ATS systems?',
        answer: 'Yes. The rewrite is shaped for recruiter clarity, role alignment, and ATS-friendly structure.',
      },
      {
        question: 'What if I forget something after I submit?',
        answer: 'Reply to your confirmation email or WhatsApp Kagiso with your order reference and the extra detail.',
      },
    ],
    confirmationSubject: 'Your CV Revamp is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your details. I'll start your rewrite this week and have your new CV back within 5 working days. You'll get the Word file, the PDF, and a 10-minute Loom video where I walk you through every change so you understand the thinking.

One small ask: if you receive any feedback on your old CV from a recruiter, employer, or trusted friend in the next few days, forward it to me. It always helps.

Talk soon,
Kagiso`,
  },
  'cover-letter': {
    slug: 'cover-letter',
    title: 'Cover Letter',
    amount: 150,
    turnaround: '5 working days',
    deliveryDays: 5,
    buyCta: 'Write my cover letter',
    folder: 'cover-letter',
    requiresCvUpload: true,
    cvInstruction: 'If you choose the email option instead, send your CV to hello@coachkagiso.co.za with the subject: Your Name - Cover Letter.',
    summary:
      "A cover letter written for one specific role, tailored to the job description, the company's language, and what makes you the right person for it.",
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      {
        name: 'role',
        label: 'What role are you applying for? Paste the job title and company',
        type: 'textarea',
        required: true,
        maxLength: 700,
      },
      {
        name: 'jobDescription',
        label: 'Paste the job description or key requirements here',
        type: 'textarea',
        required: true,
        maxLength: 4000,
      },
      {
        name: 'whyYou',
        label: 'What makes you the right person for this role?',
        type: 'textarea',
        required: true,
        maxLength: 1200,
      },
    ],
    faqs: [
      {
        question: 'Is this cover letter generic or custom?',
        answer: 'It is written for one specific role and tailored to the job description, company language, and your positioning.',
      },
      {
        question: 'What do you need from me?',
        answer: 'The job title, company, job description, and enough context to understand why you fit the role.',
      },
      {
        question: 'Do I need to send my CV too?',
        answer: 'Yes. Upload it in the brief form or choose the email option and send it right after submitting.',
      },
    ],
    confirmationSubject: 'Your Cover Letter is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your details. I'll write your tailored cover letter and send it back within 5 working days.

If anything changes with the role, deadline, or company requirements before then, reply to this email and let me know.

Talk soon,
Kagiso`,
  },
  linkedin: {
    slug: 'linkedin',
    title: 'LinkedIn Optimisation',
    amount: 300,
    turnaround: '5 working days',
    deliveryDays: 5,
    buyCta: 'Optimise my LinkedIn',
    folder: 'linkedin',
    requiresCvUpload: false,
    summary:
      'Your LinkedIn profile rewritten so the right people can find you. Headline, About, experience positioning, and visibility language sharpened.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      { name: 'linkedinUrl', label: 'Your LinkedIn profile URL', type: 'url', required: true, maxLength: 240 },
      {
        name: 'targetRoles',
        label: 'What roles or industries do you want recruiters to find you for?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'frustration',
        label: "What's the one part of your LinkedIn that frustrates you most right now?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'visibilityMode',
        label: 'Are you currently job hunting or building visibility for the long game?',
        type: 'radio',
        required: true,
        options: ['Job hunting now', 'Building for the long game', 'Both'],
      },
    ],
    faqs: [
      {
        question: 'What parts of my LinkedIn get improved?',
        answer: 'Your headline, about section, experience positioning, and recruiter-facing language all get sharpened.',
      },
      {
        question: 'Do I need to be actively job hunting for this to help?',
        answer: 'No. It works both for immediate job search and for longer-term visibility.',
      },
      {
        question: 'Will you log into my LinkedIn profile?',
        answer: 'No. Kagiso writes the optimised copy and guidance for you to update on your side.',
      },
    ],
    confirmationSubject: 'Your LinkedIn Optimisation is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your details. I'll rebuild the parts of your LinkedIn profile that are not pulling their weight and send your optimised copy back within 5 working days.

Keep an eye on your inbox. If I need one quick clarification, I'll email you.

Talk soon,
Kagiso`,
  },
  bundle: {
    slug: 'bundle',
    title: 'CV + LinkedIn Bundle',
    amount: 500,
    turnaround: '7 working days',
    deliveryDays: 7,
    buyCta: 'Get the bundle',
    folder: 'bundle',
    requiresCvUpload: true,
    cvInstruction: 'If you choose the email option instead, send your CV to hello@coachkagiso.co.za with the subject: Your Name - CV + LinkedIn Bundle.',
    summary:
      'Your full job-search toolkit aligned. Your CV and LinkedIn are built together so they tell the same story and support the same career move.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'tel', maxLength: 30 },
      { name: 'linkedinUrl', label: 'Your LinkedIn profile URL', type: 'url', required: true, maxLength: 240 },
      {
        name: 'targetRole',
        label: 'What role or industry are you targeting?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'currentRole',
        label: "What's your current role and how long have you been in it?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'cvProblem',
        label: "What do you feel isn't working about your current CV?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'recruiterTargets',
        label: 'What roles or industries do you want recruiters to find you for?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
    ],
    faqs: [
      {
        question: 'Why choose the bundle instead of buying separately?',
        answer: 'Because your CV and LinkedIn are written together to tell the same story, and you save money compared to purchasing both on their own.',
      },
      {
        question: 'What do I receive?',
        answer: 'A full CV revamp, LinkedIn optimisation copy, and aligned messaging across both assets.',
      },
      {
        question: 'Do I still need to upload my CV?',
        answer: 'Yes. Upload it in the brief form or choose the email option and send it after you submit.',
      },
    ],
    confirmationSubject: 'Your CV + LinkedIn Bundle is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your details. I'll build your CV and LinkedIn together so the messaging stays aligned. Both deliverables will come back within 7 working days.

If anything important changes about the roles you are targeting, reply to this email and tell me before I start.

Talk soon,
Kagiso`,
  },
  'career-clarity': {
    slug: 'career-clarity',
    title: 'Career Clarity Session',
    amount: 800,
    kind: 'booking',
    checkoutAccess: 'accepted_booking',
    turnaround: '75-minute private session',
    deliveryDays: 1,
    buyCta: 'Pay to confirm my session',
    folder: 'career-clarity',
    requiresCvUpload: false,
    summary: 'Your chosen time is held. Complete payment to confirm your 75-minute Career Clarity Session.',
    fields: [],
    faqs: [
      {
        question: 'Why is this a private payment link?',
        answer: 'The link is tied to the exact time you booked, so payment confirms the correct appointment.',
      },
      {
        question: 'Do I need to send my details again?',
        answer: 'No. The details you submitted when you booked are already connected to your appointment.',
      },
      {
        question: 'When is my appointment confirmed?',
        answer: 'Your held time is fully confirmed once PayFast confirms the payment.',
      },
    ],
    confirmationSubject: 'Your Career Clarity Session is confirmed',
    confirmationBody: (firstName) => `Hi ${firstName},\n\nYour Career Clarity Session is paid and confirmed. Your appointment details remain in your Cal.com confirmation.\n\nTalk soon,\nKagiso`,
  },
  'glow-up-vip': {
    slug: 'glow-up-vip',
    title: 'Glow Up VIP Package',
    amount: 1200,
    kind: 'booking',
    checkoutAccess: 'accepted_booking',
    turnaround: '30-day support package',
    deliveryDays: 30,
    buyCta: 'Pay to confirm my package',
    folder: 'glow-up-vip',
    requiresCvUpload: false,
    summary: 'Your chosen kick-off time is held. Complete payment to confirm your Glow Up VIP Package.',
    fields: [],
    faqs: [
      {
        question: 'Why is this a private payment link?',
        answer: 'The link is tied to the exact kick-off time you booked.',
      },
      {
        question: 'Do I need to send my details again?',
        answer: 'No. The details you submitted when you booked are already connected to your package.',
      },
      {
        question: 'When does the package start?',
        answer: 'Payment confirms the kick-off appointment you booked. The 30-day support journey starts from that agreed handoff.',
      },
    ],
    confirmationSubject: 'Your Glow Up VIP Package is confirmed',
    confirmationBody: (firstName) => `Hi ${firstName},\n\nYour Glow Up VIP Package is paid and confirmed. Your kick-off appointment details remain in your Cal.com confirmation.\n\nTalk soon,\nKagiso`,
  },
  masterclass: {
    slug: 'masterclass',
    title: 'Saturday Masterclass',
    amount: MASTERCLASS_EARLY_BIRD_AMOUNT,
    kind: 'event',
    turnaround: MASTERCLASS_SESSION_LABEL,
    deliveryDays: 30,
    buyCta: 'Secure my spot',
    folder: 'masterclass',
    requiresCvUpload: false,
    summary:
      'A live, small-group coaching session for professionals who feel stuck and need a clear next 90-day move.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'tel', maxLength: 30 },
      {
        name: 'careerStage',
        label: 'Where are you right now?',
        type: 'radio',
        required: true,
        options: ['Graduate or early-career', 'Employed but stuck', 'Changing direction', 'Building visibility'],
      },
      {
        name: 'mainFocus',
        label: 'What do you want this masterclass to help you think through?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'next90Days',
        label: 'If the next 90 days went well, what would be different?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
    ],
    faqs: [
      {
        question: 'Who is the masterclass for?',
        answer: 'Anyone who feels like their career has stalled and cannot pinpoint why. Graduates who are not getting traction, professionals who have not been promoted in over a year, and career changers who are not sure what to pivot into.',
      },
      {
        question: 'Is it interactive or just teaching?',
        answer: 'This is not a webinar. It is a live, interactive session capped at 12 people. You will work through the material as it applies to your own situation.',
      },
      {
        question: 'What happens after I pay?',
        answer: 'You will return to a short prep form. Once that is in, Kagiso can shape the room around the real patterns people are bringing to the session.',
      },
      {
        question: 'What if I cannot attend?',
        answer: 'You may transfer to a future session up to 24 hours before the masterclass. No refunds are available within 24 hours of the session.',
      },
    ],
    confirmationSubject: "You're in for the July Saturday Masterclass",
    confirmationBody: (firstName) => `Hi ${firstName},

Your prep notes are in for the July Saturday Masterclass.

You are confirmed for ${MASTERCLASS_SESSION_LABEL}. Kagiso will use what you shared to shape the room around the real questions people are bringing, not generic career advice.

What happens next:
1. Your Microsoft Teams link and prep notes will arrive before the session.
2. Bring a notebook and the honest version of what feels stuck.
3. After the session, you will receive the take-home pack and follow-up material.

See you on 4 July,
Kagiso`,
  },
};

export const bookingPages: Record<BookingSlug, BookingPageConfig> = {
  discovery: {
    title: 'Free Discovery Call',
    envKey: 'NEXT_PUBLIC_CAL_DISCOVERY_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/discovery-call',
    description: 'A short conversation to understand what you need and whether working together makes sense.',
    faqs: [
      {
        question: 'What happens on the discovery call?',
        answer: 'You talk through where you are, what feels stuck, and what kind of support would actually help next.',
      },
      {
        question: 'Do I need to decide on a package before booking?',
        answer: 'No. The call is there to create clarity before you commit to anything.',
      },
      {
        question: 'Will I be pressured to buy something?',
        answer: 'No. If there is a fit, Kagiso will explain the next step. If not, she will say so honestly.',
      },
    ],
  },
  clarity: {
    title: 'Career Clarity Session',
    envKey: 'NEXT_PUBLIC_CAL_CLARITY_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/career-clarity',
    description: 'Book your 75-minute clarity session and choose a time that works for you.',
    faqs: [
      {
        question: 'What do I leave with after the clarity session?',
        answer: 'Direction, decisions, and a practical action plan rather than vague motivation.',
      },
      {
        question: 'Who is this session best for?',
        answer: 'Professionals who feel stuck, are considering a pivot, or know they want change but need a clearer next move.',
      },
      {
        question: 'How should I prepare?',
        answer: 'Come with the honest version of what is not working. You do not need polished answers before the session.',
      },
    ],
  },
  'glow-up': {
    title: 'Glow Up VIP Package',
    envKey: 'NEXT_PUBLIC_CAL_GLOW_UP_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/glow-up-vip',
    description: 'Book your kick-off session for the full 30-day support package.',
    faqs: [
      {
        question: 'What does the Glow Up package include?',
        answer: 'It combines your key career assets and structured support so you are not left trying to execute everything alone.',
      },
      {
        question: 'Is this for someone actively job hunting?',
        answer: 'Yes, especially if you need deeper support across positioning, materials, and momentum.',
      },
      {
        question: 'What happens after I book?',
        answer: 'You will get the kick-off session booked first, then the rest of the support flows from that starting point.',
      },
    ],
  },
};

export function getAsyncService(slug: string) {
  return asyncServices[slug as AsyncServiceSlug];
}

export function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function getDeadlineDate(deliveryDays: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + deliveryDays);
  return date;
}

export function formatCurrency(amount: number) {
  return `R${amount.toLocaleString('en-ZA')}`;
}

export function formatServicePriceLabel(slug: AsyncServiceSlug, now = new Date()) {
  return slug === 'masterclass'
    ? getMasterclassPriceLabel(now)
    : formatCurrency(asyncServices[slug].amount);
}

export function formatServiceCatalogueLines(
  slugs: readonly AsyncServiceSlug[] = Object.keys(asyncServices) as AsyncServiceSlug[],
  now = new Date(),
) {
  return slugs.map((slug) => `- ${asyncServices[slug].title}: ${formatServicePriceLabel(slug, now)}, ${asyncServices[slug].turnaround}`);
}

// The CV Analyzer may only recommend the async delivery services. Career Clarity, Glow Up VIP,
// and the masterclass are bookings or events, not outcomes of a CV read.
export const CV_COACH_MOVE_SLUGS = [
  'cv-revamp',
  'cover-letter',
  'linkedin',
  'bundle',
] as const satisfies readonly AsyncServiceSlug[];

export type CvCoachMoveSlug = (typeof CV_COACH_MOVE_SLUGS)[number];

const cvCoachMoveGuidance: Record<CvCoachMoveSlug, string> = {
  'cv-revamp': 'Choose this when the CV needs a full rewrite. Best for career pivots, outdated formats, or people who have been applying without results.',
  'cover-letter': 'Choose this when the CV is solid but the person needs a tailored letter for a specific application.',
  linkedin: 'Choose this when the CV is strong but the online presence does not match or support it.',
  bundle: 'Choose this when the person needs both a full CV rewrite and LinkedIn alignment.',
};

// Labels an earlier prompt version invented. Saved cv_analysis_reports rows can still contain them.
const legacyCvCoachMoveLabels: Record<string, CvCoachMoveSlug> = {
  'LinkedIn Profile': 'linkedin',
  'CV + LinkedIn + Cover Letter Bundle': 'bundle',
};

export function getCvCoachMoveLabels() {
  return CV_COACH_MOVE_SLUGS.map((slug) => asyncServices[slug].title);
}

export function isCvCoachMoveLabel(value: string) {
  return getCvCoachMoveLabels().includes(value);
}

export function normalizeCvCoachMoveLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (isCvCoachMoveLabel(trimmed)) return trimmed;
  const legacySlug = legacyCvCoachMoveLabels[trimmed];
  return legacySlug ? asyncServices[legacySlug].title : '';
}

export function buildCvCoachMoveLabelUnion() {
  return getCvCoachMoveLabels().map((label) => `'${label}'`).join(' | ');
}

export function buildCvCoachMoveRulesPrompt() {
  return CV_COACH_MOVE_SLUGS
    .map((slug, index) => `${index + 1}. "${asyncServices[slug].title}" (${formatCurrency(asyncServices[slug].amount)}) - ${cvCoachMoveGuidance[slug]}`)
    .join('\n');
}
