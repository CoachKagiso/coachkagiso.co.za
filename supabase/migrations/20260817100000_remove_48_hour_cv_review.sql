-- Remove the 48-Hour CV Review service from dashboard settings.
-- Idempotent: no-op if the service is already absent.

update settings
set value = jsonb_set(
  value,
  '{services}',
  coalesce(
    (
      select jsonb_agg(item)
      from jsonb_array_elements(value->'services') as item
      where item->>'slug' <> 'cv-review-48hr'
        and item->>'name' <> '48-Hour CV Review'
    ),
    '[]'::jsonb
  ),
  false
)
where key = 'services'
  and jsonb_typeof(value->'services') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(value->'services') as item
    where item->>'slug' = 'cv-review-48hr'
       or item->>'name' = '48-Hour CV Review'
  );