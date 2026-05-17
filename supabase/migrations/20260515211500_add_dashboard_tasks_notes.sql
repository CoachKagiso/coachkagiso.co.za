create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('LEAD', 'DELIVERY', 'CONTENT', 'PERSONAL')),
  status text not null default 'todo' check (status in ('todo', 'waiting', 'in_progress', 'done')),
  priority integer not null default 50 check (priority between 1 and 100),
  due_date date,
  due_time time,
  linked_lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  linked_payment_id text references public.payments(payment_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  linked_task_id uuid references public.tasks(id) on delete cascade,
  linked_lead_id uuid references public.diagnostic_submissions(id) on delete set null,
  linked_payment_id text references public.payments(payment_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx
  on public.tasks (status);

create index if not exists tasks_type_idx
  on public.tasks (type);

create index if not exists tasks_due_date_idx
  on public.tasks (due_date);

create index if not exists tasks_linked_lead_id_idx
  on public.tasks (linked_lead_id);

create index if not exists tasks_linked_payment_id_idx
  on public.tasks (linked_payment_id);

create index if not exists notes_linked_task_id_idx
  on public.notes (linked_task_id);

create index if not exists notes_linked_lead_id_idx
  on public.notes (linked_lead_id);

create index if not exists notes_linked_payment_id_idx
  on public.notes (linked_payment_id);

alter table public.tasks enable row level security;
alter table public.notes enable row level security;

create or replace function public.set_dashboard_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_dashboard_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_dashboard_updated_at();
