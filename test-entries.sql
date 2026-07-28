-- Test entries for Career Clarity Session and Glow Up VIP Package
-- Using Loretta Danielson's CV data as test client

-- ============================================
-- 1. CAREER CLARITY SESSION (R800)
-- ============================================

-- Insert payment for Career Clarity
INSERT INTO public.payments (
  payment_id,
  service_slug,
  amount,
  status,
  buyer_email,
  buyer_name,
  confirmed_at,
  intake_submitted_at,
  payment_provider,
  provider_status,
  manual_payment_method,
  manual_payment_reference,
  manual_payment_notes,
  confirmed_by,
  is_test
) VALUES (
  'manual-career-clarity-test-001',
  'career-clarity',
  800,
  'confirmed',
  'loretta.danielson.test@example.com',
  'Loretta Danielson',
  now(),
  now(),
  'manual',
  'confirmed',
  'other',
  'TEST-CC-001',
  'Test entry for Career Clarity Session - CV Analyzer testing',
  'dashboard-admin',
  true
);

-- Insert intake submission for Career Clarity
INSERT INTO public.intake_submissions (
  payment_id,
  service_slug,
  form_data,
  cv_file_url,
  source,
  source_reference,
  source_metadata
) VALUES (
  'manual-career-clarity-test-001',
  'career-clarity',
  '{
    "fullName": "Loretta Danielson",
    "email": "loretta.danielson.test@example.com",
    "phone": "312-555-5555",
    "currentRole": "Director – US & International Human Resources at Donovan Corporation",
    "yearsInRole": "18 years (since 2008)",
    "clarityQuestion": "Whether to stay in corporate HR or pivot to independent HR consulting/coaching",
    "previousAttempts": "Reached天花板 in current role, tried applying for VP-level positions but getting passed over",
    "stuckScale": "4",
    "additionalInfo": "Have strong M&A and international experience but feel undervalued after 18 years at same company",
    "briefAcknowledgement": true,
    "briefAcknowledgedAt": "2026-07-21T00:00:00.000Z",
    "cvDeliveryMethod": "not_required"
  }'::jsonb,
  NULL,
  'manual_dashboard',
  'manual-career-clarity-test-001',
  '{
    "entryVersion": 1,
    "recordedAt": "2026-07-21T00:00:00.000Z",
    "recordedBy": "dashboard-admin",
    "sessionDate": null,
    "isTest": true
  }'::jsonb
);

-- Insert strategy workspace for Career Clarity
INSERT INTO public.client_strategy_workspaces (
  payment_id,
  service_slug,
  status,
  debrief,
  version,
  last_changed_by
) VALUES (
  'manual-career-clarity-test-001',
  'career-clarity',
  'draft',
  '{}'::jsonb,
  1,
  'dashboard-admin'
);

-- ============================================
-- 2. GLOW UP VIP PACKAGE (R1,200)
-- ============================================

-- Insert payment for Glow Up VIP
INSERT INTO public.payments (
  payment_id,
  service_slug,
  amount,
  status,
  buyer_email,
  buyer_name,
  confirmed_at,
  intake_submitted_at,
  payment_provider,
  provider_status,
  manual_payment_method,
  manual_payment_reference,
  manual_payment_notes,
  confirmed_by,
  is_test
) VALUES (
  'manual-glow-up-vip-test-002',
  'glow-up-vip',
  1200,
  'confirmed',
  'loretta.danielson.test@example.com',
  'Loretta Danielson',
  now(),
  now(),
  'manual',
  'confirmed',
  'other',
  'TEST-GU-002',
  'Test entry for Glow Up VIP Package - CV Analyzer testing',
  'dashboard-admin',
  true
);

-- Insert intake submission for Glow Up VIP
INSERT INTO public.intake_submissions (
  payment_id,
  service_slug,
  form_data,
  cv_file_url,
  source,
  source_reference,
  source_metadata
) VALUES (
  'manual-glow-up-vip-test-002',
  'glow-up-vip',
  '{
    "fullName": "Loretta Danielson",
    "email": "loretta.danielson.test@example.com",
    "phone": "312-555-5555",
    "currentRole": "Director – US & International Human Resources at Donovan Corporation",
    "yearsInRole": "18 years (since 2008)",
    "clarityQuestion": "Whether to stay in corporate HR or pivot to independent HR consulting/coaching",
    "previousAttempts": "Reached天花板 in current role, tried applying for VP-level positions but getting passed over",
    "stuckScale": "4",
    "additionalInfo": "Have strong M&A and international experience but feel undervalued after 18 years at same company",
    "targetRole": "VP of People/CHRO in tech or consulting, or independent HR consultancy",
    "interviewHistory": "Applied to ~10 VP-level roles, 2 interviews, 0 offers",
    "timeline": "3-6 months",
    "biggestFear": "Starting over at 40+ in a new company, losing the stability built over 18 years",
    "briefAcknowledgement": true,
    "briefAcknowledgedAt": "2026-07-21T00:00:00.000Z",
    "cvDeliveryMethod": "not_required"
  }'::jsonb,
  NULL,
  'manual_dashboard',
  'manual-glow-up-vip-test-002',
  '{
    "entryVersion": 1,
    "recordedAt": "2026-07-21T00:00:00.000Z",
    "recordedBy": "dashboard-admin",
    "sessionDate": null,
    "isTest": true
  }'::jsonb
);

-- Insert strategy workspace for Glow Up VIP
INSERT INTO public.client_strategy_workspaces (
  payment_id,
  service_slug,
  status,
  debrief,
  version,
  last_changed_by
) VALUES (
  'manual-glow-up-vip-test-002',
  'glow-up-vip',
  'draft',
  '{}'::jsonb,
  1,
  'dashboard-admin'
);

-- Verify the inserts
SELECT 
  p.payment_id,
  p.service_slug,
  p.amount,
  p.status,
  p.buyer_name,
  p.is_test,
  i.source as intake_source,
  w.status as workspace_status
FROM public.payments p
LEFT JOIN public.intake_submissions i ON i.payment_id = p.payment_id
LEFT JOIN public.client_strategy_workspaces w ON w.payment_id = p.payment_id
WHERE p.is_test = true
ORDER BY p.created_at DESC;
