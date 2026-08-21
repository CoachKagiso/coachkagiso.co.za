import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import {
  createCarouselSkin,
  deleteCarouselSkin,
  listCarouselSkins,
  updateCarouselSkin,
} from '@/lib/content/carousel-skins-store';

export const dynamic = 'force-dynamic';

function readInput(body: Record<string, unknown> | null) {
  const name = String(body?.name || '').trim();
  if (!name) return null;
  return {
    name,
    baseTemplate: String(body?.baseTemplate || 'editorial_authority'),
    palette: (body?.palette as Record<string, unknown>) || {},
    furniture: (body?.furniture as Record<string, unknown>) || {},
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isDiagnosticAdminAuthorized(url.searchParams.get('key') || '', request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ skins: await listCarouselSkins() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isDiagnosticAdminAuthorized(String(body?.key || ''), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const input = readInput(body);
  if (!input) return NextResponse.json({ error: 'Give this skin a name.' }, { status: 400 });

  try {
    return NextResponse.json({ skin: await createCarouselSkin(input) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save this skin.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isDiagnosticAdminAuthorized(String(body?.key || ''), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = String(body?.id || '').trim();
  const input = readInput(body);
  if (!id) return NextResponse.json({ error: 'Skin id is required.' }, { status: 400 });
  if (!input) return NextResponse.json({ error: 'Give this skin a name.' }, { status: 400 });

  try {
    return NextResponse.json({ skin: await updateCarouselSkin(id, input) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update this skin.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isDiagnosticAdminAuthorized(String(body?.key || ''), request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Skin id is required.' }, { status: 400 });

  try {
    await deleteCarouselSkin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not delete this skin.' },
      { status: 500 },
    );
  }
}
