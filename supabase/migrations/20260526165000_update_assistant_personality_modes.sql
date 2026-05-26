update settings
set value = jsonb_set(value, '{tone}', '"strategic_partner"'::jsonb, true)
where key = 'assistant_preferences'
  and value->>'tone' in ('warm_partner', 'gentle_coach', 'strategic_advisor');

update settings
set value = jsonb_set(value, '{tone}', '"focused_operator"'::jsonb, true)
where key = 'assistant_preferences'
  and value->>'tone' = 'direct_operator';

