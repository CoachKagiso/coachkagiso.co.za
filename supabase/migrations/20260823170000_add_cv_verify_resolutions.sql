-- Verify items are the analyzer's questions, not its instructions: things it noticed on the page but
-- cannot confirm from the page alone, like a start date that reads 2027 or a designation that may
-- still be in progress. The analyzer raises them; Kagiso answers them with the client in a session.
--
-- Until now there was nowhere to put the answer. Kagiso confirmed a date, re-ran the analysis, and the
-- same question came back - because every run starts from the CV text with no memory of what has
-- already been settled. On a client seen over several sessions that is the same three questions every
-- time, and the coach learns to skim past the one section built to be read carefully.
--
-- A resolution is stored against the client rather than against a report row, because it outlives any
-- single report: the fact was confirmed about the person, not about version 3 of their CV. Matching is
-- by title, semantically, in the prompt - verify titles are model-written and vary in wording between
-- runs, so a foreign key to a specific finding would miss on the next regeneration, which is exactly
-- when it needs to hit.
--
-- The app tolerates this table being absent: listClientCvVerifyResolutions returns an empty list and
-- saving is refused with a clear message, so deploying the code ahead of this migration degrades to
-- today's behaviour rather than breaking the analyzer.

create table if not exists public.cv_verify_resolutions (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null,
  title text not null,
  resolution text not null,
  created_at timestamptz not null default now(),
  constraint cv_verify_resolutions_title_not_blank check (length(btrim(title)) > 0),
  constraint cv_verify_resolutions_resolution_not_blank check (length(btrim(resolution)) > 0)
);

create index if not exists cv_verify_resolutions_payment_id_idx
  on public.cv_verify_resolutions (payment_id, created_at desc);

comment on table public.cv_verify_resolutions is
  'Verify items the coach has already settled with the client. Fed back into the CV analyzer prompt so a confirmed fact is not re-queried on every run.';

comment on column public.cv_verify_resolutions.title is
  'The verify item title as the analyzer wrote it. Matched semantically in the prompt, not by key.';

comment on column public.cv_verify_resolutions.resolution is
  'What the coach established, in their words - e.g. "Confirmed with client: 2027 is a typo for 2023, already corrected."';
