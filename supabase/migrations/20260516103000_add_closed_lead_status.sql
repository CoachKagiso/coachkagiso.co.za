alter table public.diagnostic_submissions
  drop constraint if exists diagnostic_submissions_lead_status_check;

alter table public.diagnostic_submissions
  add constraint diagnostic_submissions_lead_status_check
  check (
    lead_status in (
      'new',
      'contacted',
      'discovery_booked',
      'paid',
      'follow_up_later',
      'not_a_fit',
      'closed',
      'archived'
    )
  );
