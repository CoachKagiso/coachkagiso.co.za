-- Design Studio templates moved off browser localStorage.
--
-- They were stored under 'coach-kagiso-design-studio-v1-templates', which meant
-- one browser only, no history, and a site-data clear destroyed them. Custom CTA
-- slides are now referenced by carousel drafts in content_backlog, so a template
-- disappearing breaks a saved draft.
--
-- `document` holds the full DesignDocument (pages and layers) as jsonb. The shape
-- is owned by the app, not the database, so it is deliberately not constrained
-- here beyond being an object.

create table if not exists public.design_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'deck' check (kind in ('deck', 'cover', 'cta')),
  format text not null default 'social_graphic' check (format in ('social_graphic', 'carousel', 'presentation')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  source_carousel_template text,
  source_carousel_layout_recipe text,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_templates_document_is_object check (jsonb_typeof(document) = 'object')
);

create index if not exists design_templates_kind_idx
  on public.design_templates (kind);

create index if not exists design_templates_updated_at_idx
  on public.design_templates (updated_at desc);

alter table public.design_templates enable row level security;

grant select, insert, update, delete on table public.design_templates to service_role;

drop trigger if exists set_design_templates_updated_at on public.design_templates;
create trigger set_design_templates_updated_at
before update on public.design_templates
for each row
execute function public.set_dashboard_updated_at();
