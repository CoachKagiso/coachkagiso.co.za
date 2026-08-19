alter table public.client_session_preparations
  add column if not exists edited_content jsonb,
  add column if not exists updated_at timestamptz not null default now();

update public.client_session_preparations
set edited_content = content
where edited_content is null;

alter table public.client_session_preparations
  alter column edited_content set not null;

create or replace function public.guard_client_session_preparation_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.payment_id is distinct from old.payment_id
    or new.service_slug is distinct from old.service_slug
    or new.version is distinct from old.version
    or new.content is distinct from old.content
    or new.source_snapshot is distinct from old.source_snapshot
    or new.generator_provider is distinct from old.generator_provider
    or new.generator_model is distinct from old.generator_model
    or new.prompt_version is distinct from old.prompt_version
    or new.created_at is distinct from old.created_at then
    raise exception 'Generated session preparation provenance is immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_client_session_preparation_update_trigger
  on public.client_session_preparations;

create trigger guard_client_session_preparation_update_trigger
before update on public.client_session_preparations
for each row execute function public.guard_client_session_preparation_update();

grant update on table public.client_session_preparations to service_role;

comment on table public.client_session_preparations is
  'Versioned AI-assisted session preparation. Generated content and provenance are immutable; edited_content is Kagiso''s private working copy.';

select pg_notify('pgrst', 'reload schema');
