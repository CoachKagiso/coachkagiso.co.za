alter table public.diagnostic_submissions
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists next_follow_up_at date;

alter table public.diagnostic_submissions
  drop constraint if exists diagnostic_submissions_lead_status_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_lead_status_check
  check (
    lead_status in (
      'new',
      'contacted',
      'discovery_booked',
      'paid',
      'follow_up_later',
      'not_a_fit',
      'nurture',
      'closed',
      'archived'
    )
  );

create index if not exists diagnostic_submissions_next_follow_up_idx
  on public.diagnostic_submissions (next_follow_up_at)
  where lead_status = 'contacted';

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text,
  archetype_name text,
  subject text,
  body text,
  recommended_service text,
  booking_key text,
  variant integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_templates
  add column if not exists template_id text,
  add column if not exists archetype_name text,
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists recommended_service text,
  add column if not exists booking_key text,
  add column if not exists variant integer,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists email_templates_template_id_idx
  on public.email_templates (template_id);

alter table public.email_templates enable row level security;

grant select, insert, update on table public.email_templates to service_role;

insert into public.email_templates
  (template_id, archetype_name, subject, body, recommended_service, booking_key, variant, active, updated_at)
values
  (
    'lost_pivoter_follow_up_1',
    'Lost Pivoter',
    'Still thinking about you, {{firstName}}',
    $template$Hi {{firstName}},

I sent you your diagnostic results a few days ago and I've been thinking about you since.

Lost Pivoters are on my mind a lot right now. Not because you're doing anything wrong — but because the pressure you're feeling is real, and it's heavier than people around you probably realise.

You know something needs to change. You're just not sure what to reach for first.

I want to ask you one question — and you don't have to have a polished answer.

Where do you feel most stuck right now: knowing what you want, knowing how to get there, or believing it's actually possible for you?

Reply with whichever one fits. That's all.

Your career matters, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Glow Up VIP Package',
    'Glow Up VIP Package',
    2,
    true,
    now()
  ),
  (
    'engaged_strategist_follow_up_1',
    'Engaged Strategist',
    'A quick question, {{firstName}}',
    $template$Hi {{firstName}},

I wanted to check in after sending your diagnostic results.

Engaged Strategists are interesting to me — because you're already moving. You're not stuck in the way most people think of stuck. But there's a specific kind of frustration that comes with knowing where you want to go and not being in the right room yet.

Is that where you are?

The Saturday Masterclass is designed for exactly that season. Not to teach you what to want — you already know that. But to put you in a room with people who are serious about the same things you are.

If that sounds useful, I'd love to have you there. You can see the details here: [BOOKING LINK]

But even if it's not the right time — I'm curious. What's the next move you're trying to figure out?

Your career matters.

Kagiso
hello@coachkagiso.co.za$template$,
    'Saturday Masterclass Series',
    'Saturday Masterclass',
    2,
    true,
    now()
  ),
  (
    'plateaued_performer_follow_up_1',
    'Plateaued Performer',
    'Checking in, {{firstName}}',
    $template$Hi {{firstName}},

I've been thinking about your results since I sent them.

The Plateaued Performer pattern is one I see often — and it's one of the most frustrating places to be. You've worked hard to get where you are. You're good at your job. And yet something about the last year or two has felt... flat.

It's not that you've stopped caring. It's that the role stopped stretching you.

I want to ask you something directly: do you think the answer is a new role, or do you think there's still growth available in the one you're in?

There's no wrong answer. It just changes what the right next step looks like for you.

Reply and let me know where your head is.

Your career matters, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Saturday Masterclass - From Stuck to Strategic',
    'Saturday Masterclass',
    2,
    true,
    now()
  ),
  (
    'quiet_pivoter_follow_up_1',
    'Quiet Pivoter',
    'A thought I wanted to share, {{firstName}}',
    $template$Hi {{firstName}},

I sent your diagnostic results a few days ago and wanted to follow up.

Quiet Pivoters often don't reach out — not because they're not interested, but because they're still quietly trying to figure things out before they say anything out loud. I understand that completely.

But here's what I've noticed: the visibility problem doesn't solve itself by waiting.

The right people aren't going to find you if your CV and LinkedIn are still describing the role you're moving away from instead of where you want to go.

I'm not saying you need to have it all figured out. You just need one thing to change to start getting different results.

If you're open to a conversation about what that one thing could be — reply to this email. I'll make time.

Your career matters, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'CV + LinkedIn Bundle',
    'CV + LinkedIn Bundle',
    2,
    true,
    now()
  ),
  (
    'burnt_out_builder_follow_up_1',
    'Burnt-Out Builder',
    'No pressure — just checking in',
    $template$Hi {{firstName}},

I sent you your diagnostic results a few days ago. I know life gets busy, so I just wanted to check in.

I think about Burnt-Out Builders often. Because the exhaustion is real — and the tricky part is that it's not the kind of tired that sleep fixes. It's the tired that comes from carrying too much for too long without a clear sense of where it's all going.

I'm not going to fill this email with things to do. I just want to ask one thing:

How are you actually doing right now?

Not professionally. Just — how are you?

Reply if you want to. I read every message.

Your career matters, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Career Clarity Session',
    'Career Clarity Session',
    2,
    true,
    now()
  ),
  (
    'lost_pivoter_follow_up_2',
    'Lost Pivoter',
    'Before I stop filling your inbox, {{firstName}}',
    $template$Hi {{firstName}},

I've reached out a couple of times now and I don't want to keep showing up uninvited — so this will be my last email for a while.

But I want to say this clearly before I go quiet:

Where you are right now is not where you have to stay. The feeling of knowing something needs to change but not knowing what to reach for — that's not a personality flaw. It's a clarity problem. And clarity is something we can actually work on together.

The Glow Up VIP Package is exactly that — a 30-day reset where we build the picture together, starting with where you actually want to go.

If you're ready to explore it, the details are here: [BOOKING LINK]

And if the timing isn't right — no pressure at all. I'll still be here when it is. You'll see me on LinkedIn and TikTok in the meantime.

Take the risk anyway, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Glow Up VIP Package',
    'Glow Up VIP Package',
    3,
    true,
    now()
  ),
  (
    'engaged_strategist_follow_up_2',
    'Engaged Strategist',
    'Last email for now, {{firstName}}',
    $template$Hi {{firstName}},

I've sent a couple of emails now and I don't want to overdo it — so I'll keep this one short.

You're already moving in the right direction. The Engaged Strategist doesn't need to be rescued — you need the right room and the right people around you to keep stretching.

The Saturday Masterclass is that room. If you'd like to be part of it, the details are here: [BOOKING LINK]

If the timing isn't right, I completely understand. Keep showing up — I'll keep watching you grow from LinkedIn.

It's possible, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Saturday Masterclass Series',
    'Saturday Masterclass',
    3,
    true,
    now()
  ),
  (
    'plateaued_performer_follow_up_2',
    'Plateaued Performer',
    'My last email for a while, {{firstName}}',
    $template$Hi {{firstName}},

This is my last follow-up — I don't want to overstay my welcome in your inbox.

I just want to leave you with one thought:

Staying where you are isn't the safe option. It feels like it is. But comfortable is the most dangerous place to be when you're someone who still has more to give.

If you're ready to figure out what "more" looks like for you, the Saturday Masterclass is a good place to start: [BOOKING LINK]

If not — that's okay. Keep growing in whatever way makes sense for you right now. I'll be here when the time is right.

Your career matters, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Saturday Masterclass - From Stuck to Strategic',
    'Saturday Masterclass',
    3,
    true,
    now()
  ),
  (
    'quiet_pivoter_follow_up_2',
    'Quiet Pivoter',
    'Signing off for now, {{firstName}}',
    $template$Hi {{firstName}},

I've reached out a few times now and I want to respect your inbox — so this is my last email for a while.

Before I go quiet, I want to say: the work you're doing internally — the quiet figuring-out — matters. It's not wasted time. But at some point, the thinking has to turn into a visible change.

That's what the CV + LinkedIn Bundle is for. Not to reinvent you — to make sure the world can actually see who you already are.

If you're ready for that: [BOOKING LINK]

If not, I'll still be creating content on LinkedIn and TikTok. You'll find me there.

Small steps, better information, and the courage to try again.

Kagiso
hello@coachkagiso.co.za$template$,
    'CV + LinkedIn Bundle',
    'CV + LinkedIn Bundle',
    3,
    true,
    now()
  ),
  (
    'burnt_out_builder_follow_up_2',
    'Burnt-Out Builder',
    'One last thing, {{firstName}}',
    $template$Hi {{firstName}},

I've sent a few emails now and I don't want to add to the noise — so this is the last one for a while.

I just want you to know: what you're carrying is real. And you don't have to figure out the whole picture before you're allowed to ask for help.

The Career Clarity Session is one conversation. Seventy-five minutes. No homework. No pressure to have it all mapped out. Just a space to think out loud with someone who's paid attention to your situation.

If you want that: [BOOKING LINK]

If now isn't the time — I understand completely. Rest when you need to. I'll be here when you're ready.

You don't have to figure this out alone, {{firstName}}.

Kagiso
hello@coachkagiso.co.za$template$,
    'Career Clarity Session',
    'Career Clarity Session',
    3,
    true,
    now()
  )
on conflict (template_id) do update
set
  archetype_name = excluded.archetype_name,
  subject = excluded.subject,
  body = excluded.body,
  recommended_service = excluded.recommended_service,
  booking_key = excluded.booking_key,
  variant = excluded.variant,
  active = excluded.active,
  updated_at = now();
