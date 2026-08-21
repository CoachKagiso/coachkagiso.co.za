-- The design being worked on moved off browser localStorage.
--
-- Design Studio kept exactly one design, under
-- 'coach-kagiso-design-studio-v3-manifesto'. That meant one browser, no second
-- device, and a cleared site wiped the work. It also meant importing a second
-- carousel silently replaced the first with no way back.
--
-- Storing designs as rows fixes all three: the working design survives, and more
-- than one can exist at a time.

create table if not exists public.design_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled design',
  format text not null default 'social_graphic' check (format in ('social_graphic', 'carousel', 'presentation')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_documents_document_is_object check (jsonb_typeof(document) = 'object')
);

create index if not exists design_documents_updated_at_idx
  on public.design_documents (updated_at desc);

alter table public.design_documents enable row level security;

grant select, insert, update, delete on table public.design_documents to service_role;

drop trigger if exists set_design_documents_updated_at on public.design_documents;
create trigger set_design_documents_updated_at
before update on public.design_documents
for each row
execute function public.set_dashboard_updated_at();
