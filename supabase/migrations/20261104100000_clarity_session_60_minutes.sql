-- The Career Clarity Session is 60 minutes, not 75.
-- Replaces only the duration wording, so any other edits to this template are kept.
update public.email_templates
set
  body = replace(body, 'Seventy-five minutes.', 'Sixty minutes.'),
  updated_at = now()
where template_id = 'burnt_out_builder_follow_up_2'
  and body like '%Seventy-five minutes.%';
