const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://coachkagiso.co.za').replace(/\/$/, '');

export type EmailTemplateId =
  | 'lost_pivoter'
  | 'engaged_strategist'
  | 'plateaued_performer'
  | 'quiet_pivoter'
  | 'burnt_out_builder';

export type EmailTemplate = {
  id: EmailTemplateId;
  archetypeName: string;
  subject: string;
  body: string;
  recommendedService: string;
  bookingKey: string;
};

export const bookingLinks: Record<string, string> = {
  'Glow Up VIP Package': process.env.NEXT_PUBLIC_CAL_GLOW_UP_URL ?? `${publicSiteUrl}/book/glow-up`,
  'Saturday Masterclass': process.env.NEXT_PUBLIC_CAL_MASTERCLASS_URL ?? `${publicSiteUrl}/book/masterclass`,
  'CV + LinkedIn Bundle': `${publicSiteUrl}/buy/bundle`,
  'Career Clarity Session': process.env.NEXT_PUBLIC_CAL_CLARITY_URL ?? `${publicSiteUrl}/book/clarity`,
  'CV Revamp': `${publicSiteUrl}/buy/cv-revamp`,
  'LinkedIn Optimisation': `${publicSiteUrl}/buy/linkedin`,
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'lost_pivoter',
    archetypeName: 'Lost Pivoter',
    recommendedService: 'Glow Up VIP Package',
    bookingKey: 'Glow Up VIP Package',
    subject: 'Your diagnostic results are in, {{firstName}}',
    body: `Hi {{firstName}},

Thank you for taking the Career Diagnostic - I'm glad you did.

Your results came back as The Lost Pivoter.

That means you already know something needs to change. You're just not sure what to fix first, and the generic advice out there isn't landing because it wasn't written for your situation.

That's exactly what the Glow Up VIP Package is for.

It's a full strategic reset - we work through your career picture together over 30 days, and you leave with a clear direction, a personal brand that reflects who you actually are, and a plan you can act on.

If that sounds like what you need, reply to this email or book directly here: [BOOKING LINK]

No pressure. But if something in this email resonated, it's worth a conversation.

Your career matters, {{firstName}}.

Kagiso
Career Development & Personal Brand Coach
hello@coachkagiso.co.za
coachkagiso.co.za`,
  },
  {
    id: 'engaged_strategist',
    archetypeName: 'Engaged Strategist',
    recommendedService: 'Saturday Masterclass Series',
    bookingKey: 'Saturday Masterclass',
    subject: 'Your diagnostic results are in, {{firstName}}',
    body: `Hi {{firstName}},

Thank you for taking the Career Diagnostic.

Your results came back as The Engaged Strategist.

You're not stuck - you're sharpening. You know what you want, you're already moving toward it, and what you're looking for now is the right environment to keep growing.

The Saturday Masterclass series is built for exactly where you are.

Every session is a focused 2-hour deep dive into one career topic - mentorship, visibility, salary negotiation, personal branding. You'll be in a room with other professionals who are serious about their careers. The kind of people who push you to think differently.

The next session details are here: [BOOKING LINK]

Early bird pricing is R450. It closes once spots fill.

See you there, {{firstName}}.

Kagiso
Career Development & Personal Brand Coach
hello@coachkagiso.co.za
coachkagiso.co.za`,
  },
  {
    id: 'plateaued_performer',
    archetypeName: 'Plateaued Performer',
    recommendedService: 'Saturday Masterclass - From Stuck to Strategic',
    bookingKey: 'Saturday Masterclass',
    subject: 'Your diagnostic results are in, {{firstName}}',
    body: `Hi {{firstName}},

Thank you for taking the Career Diagnostic.

Your results came back as The Plateaued Performer.

Here's what that usually means: you're good at what you do. You've been good at it for a while. And somewhere along the way, the growth stopped - not because you stopped trying, but because the role stopped stretching you.

You don't need a new job. You need a new chapter inside the one you have.

The Saturday Masterclass - From Stuck to Strategic - is where we work through exactly that. How to identify where your growth has stalled, how to stretch in your current role, and how to position yourself for what's next.

Book your spot here: [BOOKING LINK]

R450 early bird. Limited seats.

Your career matters, {{firstName}}.

Kagiso
Career Development & Personal Brand Coach
hello@coachkagiso.co.za
coachkagiso.co.za`,
  },
  {
    id: 'quiet_pivoter',
    archetypeName: 'Quiet Pivoter',
    recommendedService: 'CV + LinkedIn Bundle',
    bookingKey: 'CV + LinkedIn Bundle',
    subject: 'Your diagnostic results are in, {{firstName}}',
    body: `Hi {{firstName}},

Thank you for taking the Career Diagnostic.

Your results came back as The Quiet Pivoter.

You're not unhappy. But you're not energised either. You sense your value isn't being seen - and you're starting to wonder if it's the company, the manager, or you.

In most cases I see, it's neither. It's a visibility problem.

Your CV and LinkedIn aren't reflecting who you actually are and what you're capable of. That gap is what's keeping you invisible to the right opportunities.

The CV + LinkedIn Bundle is the fastest way to close that gap. I rewrite both, aligned to where you want to go - not just where you've been.

R500. Turnaround in 7 working days.

Book here: [BOOKING LINK]

Let's make sure the right people can find you, {{firstName}}.

Kagiso
Career Development & Personal Brand Coach
hello@coachkagiso.co.za
coachkagiso.co.za`,
  },
  {
    id: 'burnt_out_builder',
    archetypeName: 'Burnt-Out Builder',
    recommendedService: 'Career Clarity Session',
    bookingKey: 'Career Clarity Session',
    subject: 'Your diagnostic results are in, {{firstName}}',
    body: `Hi {{firstName}},

Thank you for taking the Career Diagnostic.

Your results came back as The Burnt-Out Builder.

You've been carrying a lot - projects, people, expectations. You're tired in a way that a holiday won't fix. And you already know that staying where you are isn't sustainable.

What you need isn't more advice. You need clarity on what a different shape of career could look like for you specifically.

The Career Clarity Session is a 75-minute 1-on-1 where we go deep on your situation. Not generic frameworks - your actual career, your skills, your options. You leave with a clear diagnosis and a specific next step.

R800. Includes a 14-day follow-up check-in.

Book here: [BOOKING LINK]

You don't have to figure this out alone, {{firstName}}.

Kagiso
Career Development & Personal Brand Coach
hello@coachkagiso.co.za
coachkagiso.co.za`,
  },
];

export const EMAIL_TEMPLATE_MAP: Record<string, EmailTemplateId> = {
  'lost pivoter': 'lost_pivoter',
  'the lost pivoter': 'lost_pivoter',
  'engaged strategist': 'engaged_strategist',
  'the engaged strategist': 'engaged_strategist',
  'plateaued performer': 'plateaued_performer',
  'the plateaued performer': 'plateaued_performer',
  'quiet pivoter': 'quiet_pivoter',
  'the quiet pivoter': 'quiet_pivoter',
  'burnt-out builder': 'burnt_out_builder',
  'burnt out builder': 'burnt_out_builder',
  'the burnt-out builder': 'burnt_out_builder',
  'the burnt out builder': 'burnt_out_builder',
};

export function getTemplateIdForArchetype(archetypeName?: string | null, archetypeKey?: string | null): EmailTemplateId {
  const byName = EMAIL_TEMPLATE_MAP[(archetypeName || '').toLowerCase().trim()];
  if (byName) return byName;

  const byKey: Record<string, EmailTemplateId> = {
    A: 'plateaued_performer',
    B: 'quiet_pivoter',
    C: 'burnt_out_builder',
    D: 'lost_pivoter',
    E: 'engaged_strategist',
  };

  return byKey[archetypeKey || ''] || 'lost_pivoter';
}

export function getEmailTemplate(id: EmailTemplateId) {
  return EMAIL_TEMPLATES.find((template) => template.id === id) || EMAIL_TEMPLATES[0];
}

export function getBookingLink(bookingKey: string) {
  return bookingLinks[bookingKey] || publicSiteUrl;
}
