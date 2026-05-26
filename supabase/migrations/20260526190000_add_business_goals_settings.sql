insert into public.settings (key, value)
values (
  'business_goals',
  jsonb_build_object(
    'goals', '[]'::jsonb,
    'updatedAt', null
  )
)
on conflict (key) do nothing;
