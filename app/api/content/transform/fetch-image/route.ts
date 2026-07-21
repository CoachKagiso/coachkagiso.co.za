import { NextRequest, NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = String(body?.key || '');
  const url = String(body?.url || '').trim();

  if (!isDiagnosticAdminAuthorized(key, req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Could not fetch image.' }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!['image/jpeg', 'image/png', 'image/webp'].some((type) => contentType.toLowerCase().startsWith(type))) {
      return NextResponse.json({ error: 'URL does not point to a JPEG, PNG, or WebP image.' }, { status: 400 });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
    }

    return NextResponse.json({
      base64: buffer.toString('base64'),
      mediaType: contentType,
      filename: parsedUrl.pathname.split('/').pop() || 'screenshot',
      size: buffer.byteLength,
    });
  } catch (error) {
    console.error('Transform image fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch image.' }, { status: 500 });
  }
}
