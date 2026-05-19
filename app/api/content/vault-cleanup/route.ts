import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { pruneExpiredVaultItems } from '@/lib/content/vault-maintenance';

export const dynamic = 'force-dynamic';

function isCleanupAuthorized(request: Request, key: string) {
  if (isDiagnosticAdminAuthorized(key)) return true;

  const cleanupSecret = process.env.VAULT_CLEANUP_SECRET || process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';
  return Boolean(cleanupSecret && authHeader === `Bearer ${cleanupSecret}`);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = String(body?.key || '');

  if (!isCleanupAuthorized(request, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runCleanup();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';

  if (!isCleanupAuthorized(request, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runCleanup();
}

async function runCleanup() {
  const { deletedIds } = await pruneExpiredVaultItems();

  if (deletedIds.length > 0) {
    revalidatePath('/resources/career-diagnostic/submissions');
  }

  return NextResponse.json({
    deletedIds,
    deletedCount: deletedIds.length,
  });
}
