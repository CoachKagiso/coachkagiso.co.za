create table if not exists public.client_intake_overrides (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null references public.payments(payment_id),
  field_name text not null,
  value jsonb not null,
  edited_at timestamptz not null default now(),
  edited_by text not null default 'kagiso_dashboard',
  source text not null default 'kagiso_override',
  edit_batch_id uuid not null default gen_random_uuid(),

  constraint client_intake_overrides_field_name_check check (char_length(field_name) between 1 and 180),
  constraint client_intake_overrides_edited_by_check check (char_length(trim(edited_by)) > 0),
  constraint client_intake_overrides_source_check check (source = 'kagiso_override')
);

create index if not exists client_intake_overrides_payment_idx
  on public.client_intake_overrides (payment_id, edited_at asc, id asc);

alter table public.client_intake_overrides enable row level security;

revoke all privileges on table public.client_intake_overrides from PUBLIC, anon, authenticated;
grant select, insert on table public.client_intake_overrides to service_role;

comment on table public.client_intake_overrides is
  'Append-only Kagiso edits to client intake. Original intake_submissions values are never updated or deleted.';

select pg_notify('pgrst', 'reload schema');
