import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { DEFAULT_SETTINGS, loadSettings, upsertSetting, type BusinessProfileSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

const bucketName = 'coach-kagiso-dashboard';
const maxPhotoBytes = 5 * 1024 * 1024;

function getExtension(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const adminKey = String(formData?.get('adminKey') || formData?.get('key') || '');

  if (!isDiagnosticAdminAuthorized(adminKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = formData?.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a profile photo first.' }, { status: 400 });
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image.' }, { status: 400 });
  }

  if (file.size > maxPhotoBytes) {
    return NextResponse.json({ error: 'Profile photo must be 5MB or smaller.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const bucket = await supabase.storage.getBucket(bucketName);
  if (bucket.error) {
    const created = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxPhotoBytes,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (created.error && !created.error.message.toLowerCase().includes('already exists')) {
      throw new Error(created.error.message);
    }
  }

  const extension = getExtension(file.type);
  const path = `profile/kagiso-${Date.now()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const upload = await supabase.storage.from(bucketName).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  const profilePhotoUrl = data.publicUrl;
  const settings = await loadSettings(supabase).catch(() => DEFAULT_SETTINGS);
  const currentProfile = {
    ...DEFAULT_SETTINGS.business_profile,
    ...((settings.business_profile || {}) as Partial<BusinessProfileSettings>),
  };
  const nextProfile = {
    ...currentProfile,
    profilePhotoUrl,
  };

  await upsertSetting(supabase, 'business_profile', nextProfile);

  return NextResponse.json({ profilePhotoUrl, businessProfile: nextProfile });
}
