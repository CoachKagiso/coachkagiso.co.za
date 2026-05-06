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
  confirmationSubject: string;
  confirmationBody: (firstName: string) => string;
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
    confirmationSubject: 'Your CV Review is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your CV. I'll record your review and have it back to you within 48 hours.

When the Loom video lands in your inbox, watch it once through, then watch it again with your CV open and make the changes as I call them out. Most people find that takes about 30 minutes.

If you want a full rewrite after the review, the CV Revamp at R400 picks up where the review leaves off, with R150 credit applied since you've already paid for the review.

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
    confirmationSubject: 'Your CV + LinkedIn Bundle is in motion',
    confirmationBody: (firstName) => `Hi ${firstName},

Got your details. I'll build your CV and LinkedIn together so the messaging stays aligned. Both deliverables will come back within 7 working days.

If anything important changes about the roles you are targeting, reply to this email and tell me before I start.

Talk soon,
Kagiso`,
  },
};

export const bookingPages: Record<BookingSlug, { title: string; envKey: string; fallbackUrl: string; description: string }> = {
  discovery: {
    title: 'Free Discovery Call',
    envKey: 'NEXT_PUBLIC_CAL_DISCOVERY_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/discovery-call',
    description: 'A short conversation to understand what you need and whether working together makes sense.',
  },
  clarity: {
    title: 'Career Clarity Session',
    envKey: 'NEXT_PUBLIC_CAL_CLARITY_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/career-clarity',
    description: 'Book your 75-minute clarity session and choose a time that works for you.',
  },
  'glow-up': {
    title: 'Glow Up VIP Package',
    envKey: 'NEXT_PUBLIC_CAL_GLOW_UP_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/glow-up-vip',
    description: 'Book your kick-off session for the full 30-day support package.',
  },
  masterclass: {
    title: 'Saturday Masterclass',
    envKey: 'NEXT_PUBLIC_CAL_MASTERCLASS_URL',
    fallbackUrl: 'https://cal.com/coachkagiso/saturday-masterclass',
    description: 'Choose an upcoming Saturday Masterclass session and hold your spot.',
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
