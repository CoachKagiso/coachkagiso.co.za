export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://coachkagiso.co.za').replace(/\/$/, '');
}

export function getSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

export function getBrevoListId() {
  const raw = process.env.NEXT_PUBLIC_BREVO_LIST_ID || '';
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function getContactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@coachkagiso.co.za';
}

export function getDiagnosticAdminKey() {
  return process.env.DIAGNOSTIC_ADMIN_KEY?.trim() || '';
}
