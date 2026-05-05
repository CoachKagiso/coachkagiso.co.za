import { NextResponse } from 'next/server';
import {
  buildDiagnosticCsv,
  isDiagnosticAdminAuthorized,
  listDiagnosticSubmissions,
} from '@/lib/diagnostic-submissions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || request.headers.get('x-diagnostic-admin-key');
  const archetype = searchParams.get('archetype');

  if (!isDiagnosticAdminAuthorized(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const submissions = await listDiagnosticSubmissions(archetype);
  const csv = buildDiagnosticCsv(submissions);
  const suffix = archetype ? `-${archetype.toLowerCase()}` : '';

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="career-diagnostic-submissions${suffix}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
