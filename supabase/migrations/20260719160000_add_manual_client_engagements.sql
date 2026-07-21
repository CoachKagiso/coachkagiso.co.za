alter table public.payments
  add column if not exists is_test boolean not null default false,
  add column if not exists manual_payment_method text,
  add column if not exists manual_payment_reference text,
  add column if not exists manual_payment_notes text,
  add column if not exists confirmed_by text;

alter table public.payments
  drop constraint if exists payments_payment_provider_check;

alter table public.payments
  add constraint payments_payment_provider_check
  check (payment_provider in ('payfast', 'peach', 'manual'));

alter table public.payments
  drop constraint if exists payments_manual_payment_method_check;

alter table public.payments
  add constraint payments_manual_payment_method_check
  check (
    (payment_provider = 'manual' and manual_payment_method in ('eft', 'cash', 'card_machine', 'other'))
    or (payment_provider <> 'manual' and manual_payment_method is null)
  );

create index if not exists payments_is_test_idx
  on public.payments (is_test);

create index if not exists payments_manual_reference_idx
  on public.payments (manual_payment_reference)
  where payment_provider = 'manual' and manual_payment_reference is not null;

comment on column public.payments.is_test is
  'True for synthetic engagements that must be excluded from live metrics and external delivery.';

comment on column public.payments.manual_payment_method is
  'Verified offline payment method when payment_provider is manual.';

comment on column public.payments.manual_payment_reference is
  'Bounded bank, receipt, or internal reference supplied during manual capture.';

comment on column public.payments.manual_payment_notes is
  'Private operational note recorded with a manually verified payment.';

comment on column public.payments.confirmed_by is
  'Actor that explicitly confirmed the payment, such as dashboard-admin or a provider webhook.';
