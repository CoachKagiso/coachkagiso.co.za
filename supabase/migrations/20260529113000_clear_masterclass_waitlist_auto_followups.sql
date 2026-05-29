update public.diagnostic_submissions
set
  next_follow_up_at = null,
  updated_at = now()
where
  source = 'masterclass_waitlist'
  and next_follow_up_at is not null;
