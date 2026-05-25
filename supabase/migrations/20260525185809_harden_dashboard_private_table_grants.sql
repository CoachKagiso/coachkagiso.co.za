revoke all privileges on table public.dashboard_notifications from anon, authenticated;
revoke all privileges on table public.diagnostic_submissions from anon, authenticated;
revoke all privileges on table public.email_templates from anon, authenticated;
revoke all privileges on table public.sent_emails from anon, authenticated;
revoke all privileges on table public.settings from anon, authenticated;

grant select, insert, update, delete on table public.dashboard_notifications to service_role;
grant select, insert, update, delete on table public.diagnostic_submissions to service_role;
grant select, insert, update, delete on table public.email_templates to service_role;
grant select, insert on table public.sent_emails to service_role;
grant select, insert, update on table public.settings to service_role;

drop index if exists public.email_templates_template_id_idx;

select pg_notify('pgrst', 'reload schema');
