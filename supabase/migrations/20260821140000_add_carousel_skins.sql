-- Custom carousel skins.
--
-- A skin is a look, not a layout: a palette and the furniture around it. The
-- slide layout, the layout recipe and the generation prompts all keep coming
-- from a built-in template, named here as base_template, and the stored values
-- are laid over it. That is what lets a custom skin render everywhere the
-- built-ins do, including the vector PDF, which draws its own layout from these
-- tokens rather than reproducing a design.
--
-- palette and furniture are partial overrides, so a skin that only changes the
-- background stores only the background.

create table if not exists public.carousel_skins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_template text not null default 'editorial_authority',
  palette jsonb not null default '{}'::jsonb,
  furniture jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.carousel_skins is
  'User-defined carousel looks. Palette and furniture overlay a built-in template named by base_template.';

create index if not exists carousel_skins_updated_at_idx
  on public.carousel_skins (updated_at desc);
