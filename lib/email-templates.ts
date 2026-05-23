const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://coachkagiso.co.za').replace(/\/$/, '');

export type BaseEmailTemplateId =
  | 'lost_pivoter'
  | 'engaged_strategist'
  | 'plateaued_performer'
  | 'quiet_pivoter'
  | 'burnt_out_builder';

export type FollowUpEmailTemplateId =
  | `${BaseEmailTemplateId}_follow_up_1`
  | `${BaseEmailTemplateId}_follow_up_2`
  | `${BaseEmailTemplateId}_newsletter_bridge`;

export type EmailTemplateId = BaseEmailTemplateId | FollowUpEmailTemplateId;

export type EmailTemplate = {
  id: EmailTemplateId;
  archetypeName: string;
  subject: string;
  body: string;
  recommendedService: string;
  bookingKey: string;
  variant: 1 | 2 | 3 | 4;
  sequenceIndex: 1 | 2 | 3 | 4;
  stageLabel: 'First contact' | 'Follow-up 1' | 'Follow-up 2' | 'Newsletter bridge';
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
  // ============================================================================
  // LOST PIVOTER
  // ============================================================================
  {
    id: 'lost_pivoter',
    archetypeName: 'Lost Pivoter',
    recommendedService: 'Glow Up VIP Package',
    bookingKey: 'Glow Up VIP Package',
    variant: 1,
    sequenceIndex: 1,
    stageLabel: 'First contact',
    subject: 'I went through your diagnostic, {{firstName}}',
    body: `Hi {{firstName}},

I just went through your responses, and something jumped out.

You said you know something needs to change, but you're not sure what to fix first. That line stopped me because it's the most common thing I hear from people right before they actually make a move. Not "I'm lost," but "I know the direction, I just can't see the first step."

Can I ask you something?

When you think about your career six months from now, what does "better" actually look like? Not the inspirational version. The real one.

Is it a different role? A different company? Same job, but people finally see what you're capable of? Something else entirely?

Reply and let me know. I read everything.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'lost_pivoter_follow_up_1',
    archetypeName: 'Lost Pivoter',
    recommendedService: 'Glow Up VIP Package',
    bookingKey: 'Glow Up VIP Package',
    variant: 2,
    sequenceIndex: 2,
    stageLabel: 'Follow-up 1',
    subject: 'Still thinking about your answer, {{firstName}}',
    body: `Hi {{firstName}},

I sent you an email a few days ago asking what "better" looks like for you six months from now.

You didn't reply, which is completely fine. Most people don't. Not because they're not interested, but because it's a hard question to answer when you're in the middle of it.

So let me ask a smaller one.

What's the part of your current job that you would keep if you could design the next thing from scratch?

Not the title. Not the company. The actual work. The part that makes you feel like you're good at what you do.

I'm asking because most people I talk to think they need to blow everything up and start over. But usually there's one or two things worth keeping. Those are the clues.

Reply if you want. I'm just thinking out loud here.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'lost_pivoter_follow_up_2',
    archetypeName: 'Lost Pivoter',
    recommendedService: 'Glow Up VIP Package',
    bookingKey: 'Glow Up VIP Package',
    variant: 3,
    sequenceIndex: 3,
    stageLabel: 'Follow-up 2',
    subject: 'Last one from me, {{firstName}}',
    body: `Hi {{firstName}},

I've sent you a couple of emails now, and you haven't replied, so I'm going to stop sending these personalized follow-ups after this one.

But before I do, I want to tell you what I think is happening based on your diagnostic.

You're stuck in the gap between knowing something needs to change and knowing what to actually do about it. That gap is where most people live for months (sometimes years) because they're waiting for the answer to become obvious.

It doesn't become obvious on its own. You have to work through it with someone who can ask you better questions than you're asking yourself.

That's what the Glow Up VIP Package is. It's 30 days where we build the picture together. You leave with a clear direction, a brand that reflects who you actually are, and a plan you can act on.

If you want that, here's where you book: [BOOKING LINK]

If you're not ready, I'll stop sending these direct emails. But you'll keep getting my weekly newsletter where I share what I'm thinking about careers, pivots, and personal branding. Real examples, no fluff. You'll always have the option to opt out.

If you ever want to talk, just reply. I'll make time.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'lost_pivoter_newsletter_bridge',
    archetypeName: 'Lost Pivoter',
    recommendedService: 'Glow Up VIP Package',
    bookingKey: 'Glow Up VIP Package',
    variant: 4,
    sequenceIndex: 4,
    stageLabel: 'Newsletter bridge',
    subject: 'Quick update, {{firstName}}',
    body: `Hi {{firstName}},

I said I'd stop sending you personalized follow-ups, and I meant it. This is the last one.

I'm adding you to my upcoming newsletter. When it launches, it'll be a regular email with something I'm thinking about related to careers, pivots, and personal branding.

Usually, it's a real example from someone I'm working with (anonymized), sometimes it's a pattern I'm seeing across multiple clients, sometimes it's just a useful reframe that helped someone get unstuck.

No pitches every week. No "book my calendar" in every email. Just the thing I'm chewing on that might help you figure out your next move.

If that's not useful to you, there's an unsubscribe link at the bottom. No hard feelings.

And if you ever want to pick up the conversation we started, just reply to any email. I read everything.

Kagiso
hello@coachkagiso.co.za`,
  },

  // ============================================================================
  // ENGAGED STRATEGIST
  // ============================================================================
  {
    id: 'engaged_strategist',
    archetypeName: 'Engaged Strategist',
    recommendedService: 'Saturday Masterclass Series',
    bookingKey: 'Saturday Masterclass',
    variant: 1,
    sequenceIndex: 1,
    stageLabel: 'First contact',
    subject: 'Your diagnostic came back different, {{firstName}}',
    body: `Hi {{firstName}},

Most people who take the diagnostic are stuck. You're not.

Your answers tell me you already know where you're going. You're clear on what you want, you're moving toward it, and honestly? You're probably doing fine on your own.

So here's my guess about what you actually need: other people who are moving at the same speed you are.

The Saturday Masterclass series is less about teaching and more about the room. Across the series, we go deep on the things that actually move careers: how you build and use your network strategically, how you make yourself visible to the right people, how you position your personal brand so opportunities find you, and how to find mentors worth having. 

Each session is 2 hours online, and the people who show up are the kind who push you to think differently just by being there.

We're still finalising the agenda, and we'll share it once official bookings open. But because you scored in the top tier of this diagnostic, you can bypass the waitlist and grab an early bird spot for R450 right now
[BOOKING LINK]

If you'd rather wait for the final schedule, no stress. I'll email you when it's live.

But I'm also curious. What made you take the diagnostic in the first place? If you're already moving, what are you trying to figure out?

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'engaged_strategist_follow_up_1',
    archetypeName: 'Engaged Strategist',
    recommendedService: 'Saturday Masterclass Series',
    bookingKey: 'Saturday Masterclass',
    variant: 2,
    sequenceIndex: 2,
    stageLabel: 'Follow-up 1',
    subject: 'You never told me, {{firstName}}',
    body: `Hi {{firstName}},

I sent you an email last week asking what made you take the diagnostic in the first place.

You didn't answer, which tells me one of two things: either you're still figuring out how to put it into words, or the question didn't land.

So here's a different one.

What's the thing you're trying to get better at right now that you can't just Google your way through?

Not a skill you can learn from a course. The thing where you actually need to be in a room with people who've done it before and can tell you what actually works.

That's the thing I'm curious about.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'engaged_strategist_follow_up_2',
    archetypeName: 'Engaged Strategist',
    recommendedService: 'Saturday Masterclass Series',
    bookingKey: 'Saturday Masterclass',
    variant: 3,
    sequenceIndex: 3,
    stageLabel: 'Follow-up 2',
    subject: 'Stepping back now, {{firstName}}',
    body: `Hi {{firstName}},

This is my last personalized follow-up.

You're already moving in the right direction. You don't need me to tell you what to do. But if you ever want to be in a room with other people who are serious about their careers, the Saturday Masterclass is that room.

Details here if you want them: [BOOKING LINK]

If not, no worries, keep going. I'm adding you to my upcoming newsletter with what I'm thinking about, but I'll stop sending these direct follow-ups.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'engaged_strategist_newsletter_bridge',
    archetypeName: 'Engaged Strategist',
    recommendedService: 'Saturday Masterclass Series',
    bookingKey: 'Saturday Masterclass',
    variant: 4,
    sequenceIndex: 4,
    stageLabel: 'Newsletter bridge',
    subject: 'One last admin thing, {{firstName}}',
    body: `Hi {{firstName}},

Quick heads up: I'm adding you to my upcoming newsletter.

When it launches, it'll be a regular email about something I'm seeing in my work with clients. Career moves that worked, pivots that didn't, patterns that keep showing up.

It's not promotional. It's just me thinking out loud about the stuff you're probably already dealing with.

You'll always have the option to opt out. If you do want to continue the conversation we started, just reply.

Kagiso
hello@coachkagiso.co.za`,
  },

  // ============================================================================
  // PLATEAUED PERFORMER
  // ============================================================================
  {
    id: 'plateaued_performer',
    archetypeName: 'Plateaued Performer',
    recommendedService: 'Saturday Masterclass - From Stuck to Strategic',
    bookingKey: 'Saturday Masterclass',
    variant: 1,
    sequenceIndex: 1,
    stageLabel: 'First contact',
    subject: 'This one hit close, {{firstName}}',
    body: `Hi {{firstName}},

I just read through your diagnostic, and this one hit close for me because I know this feeling.

You're good at your job. You've been good at it for long enough that people trust you. But somewhere in the last year or two, it started feeling flat. Not bad. Just flat.

Here's the question I can't answer from the diagnostic alone:

Do you think you've outgrown the role, or do you think the role stopped challenging you?

Because those are two different problems with two different solutions. One means you leave. The other means you find a way to stretch inside the job you already have.

I run a workshop on this (From Stuck to Strategic). But before I talk about that, I actually want to know what you think the answer is.

Reply and tell me.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'plateaued_performer_follow_up_1',
    archetypeName: 'Plateaued Performer',
    recommendedService: 'Saturday Masterclass - From Stuck to Strategic',
    bookingKey: 'Saturday Masterclass',
    variant: 2,
    sequenceIndex: 2,
    stageLabel: 'Follow-up 1',
    subject: 'I have a theory, {{firstName}}',
    body: `Hi {{firstName}},

You didn't reply to my last email, but I've been thinking about your diagnostic anyway.

I have a theory about plateaus. Most of the time, people plateau because they got really good at something and then kept doing that same thing for two more years. The role didn't grow with them.

But here's the part that messes people up: they think the only way out is to leave. New company, new title, fresh start.

Sometimes that's true. But a lot of times, the next level of growth is available right where you are. You just have to know what to ask for and how to position it.

Do you think your current company would let you stretch if you knew what to propose?

Or are you already sure the answer is no?

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'plateaued_performer_follow_up_2',
    archetypeName: 'Plateaued Performer',
    recommendedService: 'Saturday Masterclass - From Stuck to Strategic',
    bookingKey: 'Saturday Masterclass',
    variant: 3,
    sequenceIndex: 3,
    stageLabel: 'Follow-up 2',
    subject: 'One last thing, {{firstName}}',
    body: `Hi {{firstName}},

I'm going to stop sending these personalized emails after this one, but I want to leave you with one thought.

Staying where you are feels safe. But if you're someone who still has more to give, comfortable is actually the riskiest place to be. Because a year from now, you'll be in the same spot, just more frustrated.

I run a workshop called From Stuck to Strategic. It's for people who are good at their jobs but can't figure out why the growth stopped. If you want in, it's here: [BOOKING LINK]

If you're not ready, that's fine. You'll keep getting my weekly newsletter, where I share what I'm seeing with other people in similar spots.

Don't wait for it to get so bad that you have to leave. There's usually a move available before that.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'plateaued_performer_newsletter_bridge',
    archetypeName: 'Plateaued Performer',
    recommendedService: 'Saturday Masterclass - From Stuck to Strategic',
    bookingKey: 'Saturday Masterclass',
    variant: 4,
    sequenceIndex: 4,
    stageLabel: 'Newsletter bridge',
    subject: 'Transitioning you to the newsletter, {{firstName}}',
    body: `Hi {{firstName}},

I said I'd stop sending personalized follow-ups, so this is the last one.

I'm adding you to my upcoming newsletter. When it launches, it'll be a regular email about career moves, growth, and what to do when you've plateaued but don't want to leave.

Most of it comes from real situations I'm seeing with clients. Pattern recognition stuff that might help you spot your own next move.

No hard sell every week. Just useful thinking.

If you don't want it, the unsubscribe link is at the bottom. If you ever want to continue this conversation, just reply to any email.

Kagiso
hello@coachkagiso.co.za`,
  },

  // ============================================================================
  // QUIET PIVOTER
  // ============================================================================
  {
    id: 'quiet_pivoter',
    archetypeName: 'Quiet Pivoter',
    recommendedService: 'CV + LinkedIn Bundle',
    bookingKey: 'CV + LinkedIn Bundle',
    variant: 1,
    sequenceIndex: 1,
    stageLabel: 'First contact',
    subject: 'I think I know what this is, {{firstName}}',
    body: `Hi {{firstName}},

I read through your responses, and I think I know what's happening.

You're not unhappy. You don't hate your job. But you can't remember the last time you felt genuinely excited about what you're building. And the worst part is you're starting to wonder if the problem is you.

It's probably not you.

In most cases I see, this is a visibility problem. The work you're doing isn't being seen by the people who matter. Or the way you're showing up (CV, LinkedIn, conversations) is still describing the version of you from two years ago, not who you're becoming.

Question: If someone looked at your LinkedIn right now, would they know what you actually want to do next?

Not what you've done. What you want.

Reply and let me know. If the answer is no, I can help you fix that.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'quiet_pivoter_follow_up_1',
    archetypeName: 'Quiet Pivoter',
    recommendedService: 'CV + LinkedIn Bundle',
    bookingKey: 'CV + LinkedIn Bundle',
    variant: 2,
    sequenceIndex: 2,
    stageLabel: 'Follow-up 1',
    subject: 'I think I know why you didn\'t reply, {{firstName}}',
    body: `Hi {{firstName}},

I asked you a question last week about your LinkedIn, and you didn't reply.

I think I know why. It's not that you don't care. It's that looking at your own LinkedIn and being honest about what's missing feels like admitting you've been invisible.

And that's uncomfortable.

But here's the thing: invisible isn't a personality trait. It's a positioning problem.

The right people aren't finding you because your profile is still describing the job you're trying to move away from. It's telling the story of where you've been, not where you're going.

That's fixable. It just requires deciding that being seen is worth the discomfort of updating the story.

Are you there yet?

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'quiet_pivoter_follow_up_2',
    archetypeName: 'Quiet Pivoter',
    recommendedService: 'CV + LinkedIn Bundle',
    bookingKey: 'CV + LinkedIn Bundle',
    variant: 3,
    sequenceIndex: 3,
    stageLabel: 'Follow-up 2',
    subject: 'Signing off, {{firstName}}',
    body: `Hi {{firstName}},

I've reached out a few times now, and I'm going to stop sending these personalized emails after this one.

Before I do, I want to say: the internal work matters. The quiet figuring out, the private journaling, the thinking it through on your own. That's not wasted time.

But at some point, the thinking has to turn into something visible. A different resume. A different LinkedIn. A different way of talking about what you do.

If you want help with that, the CV + LinkedIn Bundle is here: [BOOKING LINK]

If you're not there yet, I'm adding you to my upcoming newsletter. I write about visibility, positioning, and how to make your work seen by the people who matter.

When you're ready to make the change, just reply.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'quiet_pivoter_newsletter_bridge',
    archetypeName: 'Quiet Pivoter',
    recommendedService: 'CV + LinkedIn Bundle',
    bookingKey: 'CV + LinkedIn Bundle',
    variant: 4,
    sequenceIndex: 4,
    stageLabel: 'Newsletter bridge',
    subject: 'About that newsletter, {{firstName}}',
    body: `Hi {{firstName}},

I'm done with the personalized follow-ups. This is just a quick note to let you know what's next.

I'm adding you to my upcoming newsletter. When it launches, it'll be a regular email about visibility, positioning, and making career moves when you're the type of person who doesn't naturally self-promote.

It's for people like you. People who do good work quietly and then wonder why no one notices.

Most of what I share comes from real clients (anonymized) who figured out how to be seen without feeling fake.

If you don't want it, unsubscribe at the bottom. If something I write ever resonates and you want to talk, just reply.

Kagiso
hello@coachkagiso.co.za`,
  },

  // ============================================================================
  // BURNT-OUT BUILDER
  // ============================================================================
  {
    id: 'burnt_out_builder',
    archetypeName: 'Burnt-Out Builder',
    recommendedService: 'Career Clarity Session',
    bookingKey: 'Career Clarity Session',
    variant: 1,
    sequenceIndex: 1,
    stageLabel: 'First contact',
    subject: 'How are you doing, {{firstName}}',
    body: `Hi {{firstName}},

I just read your diagnostic responses, and I'm not going to pitch you anything in this email.

I just want to ask: how are you doing right now?

Not the work stuff. Not the career stuff. Just you.

Because your answers tell me you've been carrying a lot for a long time. Projects, people, expectations. And the kind of tired you're describing isn't the kind that a weekend fixes.

You don't have to reply to this. But if you want to, I read everything.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'burnt_out_builder_follow_up_1',
    archetypeName: 'Burnt-Out Builder',
    recommendedService: 'Career Clarity Session',
    bookingKey: 'Career Clarity Session',
    variant: 2,
    sequenceIndex: 2,
    stageLabel: 'Follow-up 1',
    subject: 'No agenda here, {{firstName}}',
    body: `Hi {{firstName}},

I sent you an email last week just asking how you're doing. You didn't reply, which is fine. I know what inbox overload looks like.

But I meant it. I wasn't trying to soften you up for a pitch. I just know that when someone answers a diagnostic the way you did, they're usually holding more than they're saying out loud.

So this is the same email again, just in case the first one got buried.

How are you?

Not your career. Not your goals. Just you.

If you want to reply, I'm here. If you don't, that's fine too.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'burnt_out_builder_follow_up_2',
    archetypeName: 'Burnt-Out Builder',
    recommendedService: 'Career Clarity Session',
    bookingKey: 'Career Clarity Session',
    variant: 3,
    sequenceIndex: 3,
    stageLabel: 'Follow-up 2',
    subject: 'Leaving this here, {{firstName}}',
    body: `Hi {{firstName}},

This is the last personalized email I'll send unless you reach out.

I know you're tired. I know you've been carrying a lot. And I know that one more person telling you what to do is probably the last thing you need right now.

So I'm not going to do that.

If you ever want to just talk through what's going on without any pressure to fix it all in one conversation, I do a 75-minute Career Clarity Session. No homework. No big commitment. Just space to think out loud with someone who gets it.

It's here if you want it: [BOOKING LINK]

If you're not ready, I'm adding you to my upcoming newsletter. I write about burnout, boundaries, and what to do when the career you built is costing you too much.

Rest when you need to. I'll be here if you ever want to talk.

Kagiso
hello@coachkagiso.co.za`,
  },
  {
    id: 'burnt_out_builder_newsletter_bridge',
    archetypeName: 'Burnt-Out Builder',
    recommendedService: 'Career Clarity Session',
    bookingKey: 'Career Clarity Session',
    variant: 4,
    sequenceIndex: 4,
    stageLabel: 'Newsletter bridge',
    subject: "You're on the newsletter now, {{firstName}}",
    body: `Hi {{firstName}},

I said I'd stop the personalized emails, so this is the last one.

I'm adding you to my upcoming newsletter. When it launches, it'll cover burnout, career sustainability, and what to do when the thing you built is wearing you down.

I don't have all the answers. But I work with a lot of people who are where you are, and I share what's actually helping them.

No pressure to read everyone. No pressure to respond. It's just there if you need it.

If you ever want to talk, reply to any email. I'll make time.

Kagiso
hello@coachkagiso.co.za`,
  },
];

export const EMAIL_TEMPLATE_MAP: Record<string, BaseEmailTemplateId> = {
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

export function getTemplateIdForArchetype(
  archetypeName?: string | null,
  archetypeKey?: string | null
): BaseEmailTemplateId {
  const byName = EMAIL_TEMPLATE_MAP[(archetypeName || '').toLowerCase().trim()];
  if (byName) return byName;

  const byKey: Record<string, BaseEmailTemplateId> = {
    A: 'plateaued_performer',
    B: 'quiet_pivoter',
    C: 'burnt_out_builder',
    D: 'lost_pivoter',
    E: 'engaged_strategist',
  };

  return byKey[archetypeKey || ''] || 'lost_pivoter';
}

export function getTemplateIdForLeadStage({
  archetypeName,
  archetypeKey,
  followUpCount,
  leadStatus,
  lastContactedAt,
}: {
  archetypeName?: string | null;
  archetypeKey?: string | null;
  followUpCount?: number | null;
  leadStatus?: string | null;
  lastContactedAt?: string | null;
}): EmailTemplateId {
  const baseTemplateId = getTemplateIdForArchetype(archetypeName, archetypeKey);
  const count = Math.max(0, followUpCount ?? 0);

  if (leadStatus === 'new' || !lastContactedAt) return baseTemplateId;
  if (leadStatus !== 'contacted') return baseTemplateId;
  if (count === 0) return `${baseTemplateId}_follow_up_1` as EmailTemplateId;
  if (count === 1) return `${baseTemplateId}_follow_up_2` as EmailTemplateId;
  if (count === 2) return `${baseTemplateId}_newsletter_bridge` as EmailTemplateId;
  return baseTemplateId;
}

export function getEmailTemplate(id: EmailTemplateId) {
  return EMAIL_TEMPLATES.find((template) => template.id === id) || EMAIL_TEMPLATES[0];
}

export function getEmailSequenceDots(templateId: EmailTemplateId) {
  const sequenceIndex = getEmailTemplate(templateId).sequenceIndex;
  return Array.from({ length: 4 }, (_, index) => (index < sequenceIndex ? '●' : '○')).join('');
}

export function getEmailTemplateOptionLabel(template: EmailTemplate) {
  return `${template.stageLabel} - ${template.archetypeName}`;
}

export function isFollowUpOneTemplate(templateId?: string | null) {
  return Boolean(templateId?.endsWith('_follow_up_1'));
}

export function isFollowUpTwoTemplate(templateId?: string | null) {
  return Boolean(templateId?.endsWith('_follow_up_2'));
}

export function isNewsletterBridgeTemplate(templateId?: string | null) {
  return Boolean(templateId?.endsWith('_newsletter_bridge'));
}

export function getBookingLink(bookingKey: string) {
  return bookingLinks[bookingKey] || publicSiteUrl;
}
