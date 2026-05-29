alter table public.payments
  add column if not exists payment_provider text not null default 'payfast',
  add column if not exists provider_payment_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists provider_status text,
  add column if not exists provider_result_code text,
  add column if not exists provider_result_description text,
  add column if not exists provider_payload jsonb;

alter table public.payments
  drop constraint if exists payments_payment_provider_check;

alter table public.payments
  add constraint payments_payment_provider_check
  check (payment_provider in ('payfast', 'peach'));

create index if not exists payments_payment_provider_idx
  on public.payments (payment_provider);

create unique index if not exists payments_provider_payment_id_idx
  on public.payments (payment_provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payments_provider_checkout_id_idx
  on public.payments (payment_provider, provider_checkout_id)
  where provider_checkout_id is not null;

create index if not exists payments_provider_result_code_idx
  on public.payments (provider_result_code);
