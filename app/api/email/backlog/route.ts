import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { buildEmailBacklog } from '@/lib/email-backlog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = request.headers.get('x-diagnostic-admin-key') || url.searchParams.get('key') || '';

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeTomorrow = url.searchParams.get('includeTomorrow') !== 'false';

  try {
    const backlog = await buildEmailBacklog({ includeTomorrow });
    return NextResponse.json(backlog);
  } catch (error) {
    console.error('Email backlog build failed', error);
    return NextResponse.json({ error: 'Could not load the email backlog.' }, { status: 500 });
  }
}
