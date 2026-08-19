alter table public.client_strategy_checkpoints
  drop constraint if exists client_strategy_checkpoints_key_check,
  drop constraint if exists client_strategy_checkpoints_status_check,
  drop constraint if exists client_strategy_checkpoints_outcome_check;

alter table public.client_strategy_checkpoints
  add constraint client_strategy_checkpoints_key_check
    check (
      checkpoint_key in (
        'teams_day_14',
        'whatsapp_day_10_14',
        'teams_day_28_30',
        'day_7',
        'day_14',
        'day_21',
        'day_30'
      )
    ),
  add constraint client_strategy_checkpoints_status_check
    check (status in ('pending', 'done', 'not_done', 'completed', 'skipped')),
  add constraint client_strategy_checkpoints_outcome_check
    check (
      (status = 'pending' and progress_status is null and completed_at is null)
      or (
        status in ('done', 'not_done')
        and progress_status is null
        and cardinality(theme_keys) = 0
        and completed_at is not null
      )
      or (status = 'completed' and progress_status is not null and completed_at is not null)
      or (
        status = 'skipped'
        and progress_status is null
        and cardinality(theme_keys) = 0
        and completed_at is not null
      )
    );

create or replace function public.complete_client_strategy_plan_delivery(
  p_delivery_id uuid,
  p_provider_message_id text
)
returns public.client_strategy_plan_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery public.client_strategy_plan_deliveries%rowtype;
  v_plan public.client_strategy_plans%rowtype;
  v_delivered_at timestamptz := now();
begin
  select *
  into v_delivery
  from public.client_strategy_plan_deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'Strategy plan delivery not found';
  end if;

  if v_delivery.status = 'sent' then
    return v_delivery;
  end if;
  if v_delivery.status <> 'sending' then
    raise exception 'Only a reserved delivery can be completed';
  end if;
  if nullif(trim(p_provider_message_id), '') is null then
    raise exception 'Provider message ID is required';
  end if;

  select *
  into v_plan
  from public.client_strategy_plans
  where id = v_delivery.plan_id
  for update;

  if not found or v_plan.status <> 'approved' then
    raise exception 'Approved strategy plan not found';
  end if;

  update public.client_strategy_plan_deliveries
  set
    status = 'sent',
    provider = 'brevo',
    provider_message_id = trim(p_provider_message_id),
    delivered_at = v_delivered_at,
    error_code = null,
    updated_at = v_delivered_at
  where id = p_delivery_id
  returning * into v_delivery;

  update public.client_strategy_plans
  set status = 'sent'
  where id = v_delivery.plan_id;

  if v_plan.service_slug = 'career-clarity' then
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values (
      v_plan.id,
      v_plan.payment_id,
      v_plan.service_slug,
      'teams_day_14',
      '15-minute Microsoft Teams follow-up',
      v_delivered_at + interval '14 days'
    )
    on conflict (plan_id, checkpoint_key) do nothing;
  else
    insert into public.client_strategy_checkpoints (
      plan_id, payment_id, service_slug, checkpoint_key, label, due_at
    ) values
      (
        v_plan.id,
        v_plan.payment_id,
        v_plan.service_slug,
        'whatsapp_day_10_14',
        'WhatsApp check-in',
        v_delivered_at + interval '12 days'
      ),
      (
        v_plan.id,
        v_plan.payment_id,
        v_plan.service_slug,
        'teams_day_28_30',
        '15-minute Microsoft Teams follow-up',
        v_delivered_at + interval '29 days'
      )
    on conflict (plan_id, checkpoint_key) do nothing;
  end if;

  return v_delivery;
end;
$$;

insert into public.client_strategy_checkpoints (
  plan_id,
  payment_id,
  service_slug,
  checkpoint_key,
  label,
  due_at
)
select
  plans.id,
  plans.payment_id,
  plans.service_slug,
  'teams_day_14',
  '15-minute Microsoft Teams follow-up',
  deliveries.delivered_at + interval '14 days'
from public.client_strategy_plans plans
join public.client_strategy_plan_deliveries deliveries
  on deliveries.plan_id = plans.id and deliveries.status = 'sent'
where plans.service_slug = 'career-clarity'
on conflict (plan_id, checkpoint_key) do nothing;

insert into public.client_strategy_checkpoints (
  plan_id,
  payment_id,
  service_slug,
  checkpoint_key,
  label,
  due_at
)
select
  plans.id,
  plans.payment_id,
  plans.service_slug,
  schedule.checkpoint_key,
  schedule.label,
  deliveries.delivered_at + schedule.offset_interval
from public.client_strategy_plans plans
join public.client_strategy_plan_deliveries deliveries
  on deliveries.plan_id = plans.id and deliveries.status = 'sent'
cross join (
  values
    ('whatsapp_day_10_14', 'WhatsApp check-in', interval '12 days'),
    ('teams_day_28_30', '15-minute Microsoft Teams follow-up', interval '29 days')
) as schedule(checkpoint_key, label, offset_interval)
where plans.service_slug = 'glow-up-vip'
on conflict (plan_id, checkpoint_key) do nothing;

create or replace function public.save_client_strategy_follow_up(
  p_checkpoint_id uuid,
  p_due_at timestamptz,
  p_status text,
  p_notes text
)
returns public.client_strategy_checkpoints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkpoint public.client_strategy_checkpoints%rowtype;
begin
  if p_due_at is null then
    raise exception 'Follow-up date is required';
  end if;
  if p_status not in ('pending', 'done', 'not_done') then
    raise exception 'Follow-up status must be pending, done or not done';
  end if;

  update public.client_strategy_checkpoints
  set
    due_at = p_due_at,
    status = p_status,
    progress_status = null,
    notes = left(coalesce(p_notes, ''), 4000),
    theme_keys = '{}'::text[],
    completed_at = case when p_status = 'pending' then null else now() end,
    updated_at = now()
  where id = p_checkpoint_id
  returning * into v_checkpoint;

  if not found then
    raise exception 'Strategy follow-up not found';
  end if;

  return v_checkpoint;
end;
$$;

revoke all on function public.save_client_strategy_follow_up(uuid, timestamptz, text, text)
  from PUBLIC, anon, authenticated;
grant execute on function public.save_client_strategy_follow_up(uuid, timestamptz, text, text)
  to service_role;

revoke execute on function public.save_client_strategy_checkpoint_outcome(uuid, text, text, text, text[])
  from service_role;

comment on table public.client_strategy_checkpoints is
  'Minimal private follow-up records for career development plans. Active records store the agreed due date, done or not-done status, and notes; legacy checkpoint rows remain readable.';

select pg_notify('pgrst', 'reload schema');
