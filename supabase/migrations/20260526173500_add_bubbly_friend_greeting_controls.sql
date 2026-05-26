update settings
set value = value
  || jsonb_build_object(
    'bubblyNicknames', coalesce(value->'bubblyNicknames', '["Kay", "Mush", "Coach", "Ms. CEO"]'::jsonb),
    'encouragementStyle', coalesce(
      value->'encouragementStyle',
      '"Offer short, natural encouragement when it fits. Sound like a friend in her corner, proud of her progress, without turning it into a repeated script."'::jsonb
    ),
    'allowEmojis', coalesce(value->'allowEmojis', 'true'::jsonb)
  )
where key = 'assistant_preferences';

