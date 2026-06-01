export type AsyncServiceSlug = 'cv-review' | 'cv-revamp' | 'cover-letter' | 'linkedin' | 'bundle';
export type BookingSlug = 'discovery' | 'clarity' | 'glow-up' | 'masterclass';

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
  'cv-review': {
    slug: 'cv-review',
    title: '48-Hour CV Review',
    amount: 150,
    turnaround: '48 hours',
    deliveryDays: 2,
    buyCta: 'Get my CV reviewed',
    folder: 'cv-review',
    requiresCvUpload: true,
    cvInstruction: 'If you choose the email option instead, send your CV to hello@coachkagiso.co.za with the subject: Your Name - CV Review.',
    summary:
      "Your CV, my expert eye. Send your current CV and I'll show you what's working, what's broken, and what to fix first.",
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
      { name: 'email', label: 'Email address', type: 'email', required: true, maxLength: 120 },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'tel', maxLength: 30 },
      {
        name: 'targetRoles',
        label: 'What role or roles are you currently applying for?',
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
      {
        name: 'mainFocus',
        label: "What's the one thing you most want me to look at?",
        type: 'textarea',
        required: true,
        maxLength: 900,
      },
    ],
    faqs: [
      {
        question: 'What do I get in a CV Review?',
        answer: 'You get expert feedback on what is working, what is weakening your positioning, and what to fix first. It is feedback, not a rewrite.',
      },
      {
        question: 'Do I need to upload my CV right away?',
        answer: 'Yes, either upload it in the brief form or choose the email option and send it straight after submitting.',
      },
      {
        question: 'Can I upgrade later to the full revamp?',
        answer: 'Yes. If you want Kagiso to do the rewrite after the review, your R150 review fee is credited toward the R400 CV Revamp, so you only pay the R250 difference.',
      },
    ],
    confirmationSubject: 'Your CV Review is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your CV. I'll record your review and have it back to you within 48 hours.

When the Loom video lands in your inbox, watch it once through, then watch it again with your CV open and make the changes as I call them out. Most people find that takes about 30 minutes.

If you want a full rewrite after the review, the CV Revamp picks up where the review leaves off. Your R150 review fee is credited, so you only pay the R250 difference.

Talk soon,
Kagiso`,
  },
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
  masterclass: {
    title: 'Saturday Masterclass',
    envKey: 'NEXT_PUBLIC_CAL_MASTERCLASS_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/saturday-masterclass',
    description: 'Book your seat for the July Saturday Masterclass. Early bird is R450 until Sunday, 7 June 2026; from Monday, 8 June, the standard price is R500.',
    mode: 'calendar',
    ctaLabel: 'Book my seat',
    faqs: [
      {
        question: 'Who is the masterclass for?',
        answer: 'It is for professionals who want structured group coaching with practical takeaways they can use immediately.',
      },
      {
        question: 'Is it interactive or just teaching?',
        answer: 'It is interactive. You will learn, reflect, and leave with a clearer plan than you started with.',
      },
      {
        question: 'What happens after I book?',
        answer: 'You will choose the available masterclass slot and complete the booking through Cal.com. Your confirmation details will be emailed after booking.',
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
