create table if not exists public.diagnostic_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null,
  answers jsonb not null,
  score jsonb not null,
  archetype_key text not null,
  archetype_name text not null,
  archetype_payload jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table public.diagnostic_submissions enable row level security;

create index if not exists diagnostic_submissions_email_idx
  on public.diagnostic_submissions (email);

create index if not exists diagnostic_submissions_archetype_idx
  on public.diagnostic_submissions (archetype_key);

create index if not exists diagnostic_submissions_submitted_at_idx
  on public.diagnostic_submissions (submitted_at desc);

alter table public.diagnostic_submissions
  add column if not exists lead_status text not null default 'new',
  add column if not exists lead_notes text,
  add column if not exists next_follow_up_at date,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists updated_at timestamptz;

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
      'archived'
    )
  );

create index if not exists diagnostic_submissions_lead_status_idx
  on public.diagnostic_submissions (lead_status);

create index if not exists diagnostic_submissions_next_follow_up_at_idx
  on public.diagnostic_submissions (next_follow_up_at);

-- The Next.js API route writes with the Supabase service role key.
-- Do not add anon insert policies unless you intentionally move writes to the browser.
