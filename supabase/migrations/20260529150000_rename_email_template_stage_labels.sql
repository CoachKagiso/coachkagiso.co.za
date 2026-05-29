alter table public.email_templates
  drop constraint if exists email_templates_stage_label_check;

update public.email_templates
set
  stage_label = case
    when stage_label = 'Follow-up 1' then 'Second contact'
    when stage_label = 'Follow-up 2' then 'Third contact'
    else stage_label
  end,
  updated_at = now()
where stage_label in ('Follow-up 1', 'Follow-up 2');

update public.email_templates
set
  body = replace(
    body,
    'I sent you an email last week asking what "better" looks like for you six months from now.',
    'I sent you an email a few days ago asking what "better" looks like for you six months from now.'
  ),
  updated_at = now()
where template_id = 'lost_pivoter_follow_up_1'
  and body like '%I sent you an email last week asking what "better" looks like for you six months from now.%';

update public.email_templates
set
  body = replace(
    body,
    'I sent you an email last week asking what made you take the diagnostic',
    'I sent you an email a few days ago asking what made you take the diagnostic'
  ),
  updated_at = now()
where template_id = 'engaged_strategist_follow_up_1'
  and body like '%I sent you an email last week asking what made you take the diagnostic%';

update public.email_templates
set
  body = replace(
    body,
    'I asked you a question last week about your LinkedIn',
    'I asked you a question a few days ago about your LinkedIn'
  ),
  updated_at = now()
where template_id = 'quiet_pivoter_follow_up_1'
  and body like '%I asked you a question last week about your LinkedIn%';

update public.email_templates
set
  body = replace(
    body,
    'I sent you an email last week just asking how you''re doing.',
    'I sent you an email a few days ago just asking how you''re doing.'
  ),
  updated_at = now()
where template_id = 'burnt_out_builder_follow_up_1'
  and body like '%I sent you an email last week just asking how you''re doing.%';

update public.email_templates
set
  body = replace(
    body,
    'I sent you the First 90 Days checklist last week and wanted to follow up.',
    'I sent you the First 90 Days checklist a few days ago and wanted to follow up.'
  ),
  updated_at = now()
where template_id = 'first_90_days_follow_up_1'
  and body like '%I sent you the First 90 Days checklist last week and wanted to follow up.%';

update public.email_templates
set
  body = replace(
    body,
    'I wanted to follow up on the LinkedIn Headline Builder I sent last week.',
    'I wanted to follow up on the LinkedIn Headline Builder I sent a few days ago.'
  ),
  updated_at = now()
where template_id = 'linkedin_headline_follow_up_1'
  and body like '%I wanted to follow up on the LinkedIn Headline Builder I sent last week.%';

alter table public.email_templates
  add constraint email_templates_stage_label_check
  check (stage_label in (
    'First contact',
    'Second contact',
    'Third contact',
    'Newsletter bridge',
    'Waitlist confirmation',
    'Bookings open'
  ));

select pg_notify('pgrst', 'reload schema');
