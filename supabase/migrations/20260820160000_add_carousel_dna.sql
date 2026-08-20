-- Reference decks analysed in Transform, kept as a reusable swipe file.
--
-- Deliberately its own table rather than a content_backlog row: vault items fall
-- through to the 'ideas' section, which has a 60-day retention and is hard
-- deleted by pruneExpiredVaultItems. Reference material should not expire.
--
-- `framework` holds the Stage 1 output. Its shape is owned by the app, so it is
-- not constrained here beyond being an object. slide_arc and layout_recipe are
-- promoted to columns because they are what the generator reads back.

create table if not exists public.carousel_dna (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  source_name text,
  slide_count integer not null default 0 check (slide_count >= 0),
  layout_recipe text check (
    layout_recipe is null
    or layout_recipe in ('authority_framework', 'guided_shift', 'diagnostic_reframe', 'narrative_launch')
  ),
  slide_arc text[] not null default '{}',
  framework jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carousel_dna_framework_is_object check (jsonb_typeof(framework) = 'object')
);

create index if not exists carousel_dna_updated_at_idx
  on public.carousel_dna (updated_at desc);

alter table public.carousel_dna enable row level security;

grant select, insert, update, delete on table public.carousel_dna to service_role;

drop trigger if exists set_carousel_dna_updated_at on public.carousel_dna;
create trigger set_carousel_dna_updated_at
before update on public.carousel_dna
for each row
execute function public.set_dashboard_updated_at();
