with canonical_archetypes(source_name, canonical_name) as (
  values
    ('The Plateaued Performer', 'Plateaued Performer'),
    ('The Quiet Pivoter', 'Quiet Pivoter'),
    ('The Burnt-Out Builder', 'Burnt-Out Builder'),
    ('The Burnt Out Builder', 'Burnt-Out Builder'),
    ('The Lost Pivoter', 'Lost Pivoter'),
    ('The Engaged Strategist', 'Engaged Strategist')
)
update public.diagnostic_submissions as submission
set
  archetype_name = canonical_archetypes.canonical_name,
  archetype_payload = jsonb_set(
    submission.archetype_payload,
    '{name}',
    to_jsonb(canonical_archetypes.canonical_name),
    true
  )
from canonical_archetypes
where
  lower(trim(submission.archetype_name)) = lower(canonical_archetypes.source_name)
  or lower(trim(submission.archetype_payload->>'name')) = lower(canonical_archetypes.source_name);

with canonical_archetypes(source_name, canonical_name) as (
  values
    ('The Plateaued Performer', 'Plateaued Performer'),
    ('The Quiet Pivoter', 'Quiet Pivoter'),
    ('The Burnt-Out Builder', 'Burnt-Out Builder'),
    ('The Burnt Out Builder', 'Burnt-Out Builder'),
    ('The Lost Pivoter', 'Lost Pivoter'),
    ('The Engaged Strategist', 'Engaged Strategist')
)
update public.sent_emails as sent_email
set archetype = canonical_archetypes.canonical_name
from canonical_archetypes
where lower(trim(sent_email.archetype)) = lower(canonical_archetypes.source_name);

with canonical_archetypes(source_name, canonical_name) as (
  values
    ('The Plateaued Performer', 'Plateaued Performer'),
    ('The Quiet Pivoter', 'Quiet Pivoter'),
    ('The Burnt-Out Builder', 'Burnt-Out Builder'),
    ('The Burnt Out Builder', 'Burnt-Out Builder'),
    ('The Lost Pivoter', 'Lost Pivoter'),
    ('The Engaged Strategist', 'Engaged Strategist')
)
update public.email_templates as email_template
set archetype_name = canonical_archetypes.canonical_name
from canonical_archetypes
where lower(trim(email_template.archetype_name)) = lower(canonical_archetypes.source_name);
