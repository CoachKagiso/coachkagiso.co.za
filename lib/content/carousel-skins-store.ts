import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  sanitiseFurniture,
  sanitisePalette,
  type CarouselSkin,
  type CarouselSkinInput,
} from '@/lib/content/carousel-skins';

// Kept apart from carousel-skins.ts so the pure helpers there stay importable by
// the test runner, which cannot resolve the Supabase client.

type CarouselSkinRow = {
  id: string;
  name: string;
  base_template: string;
  palette: unknown;
  furniture: unknown;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = 'id, name, base_template, palette, furniture, created_at, updated_at';

function isMissingSkinsTable(message?: string) {
  return Boolean(
    message &&
      (message.includes('carousel_skins') ||
        message.includes('Could not find the table') ||
        message.includes('does not exist')),
  );
}

function normalizeRow(row: CarouselSkinRow): CarouselSkin {
  return {
    id: row.id,
    name: row.name,
    baseTemplate: row.base_template,
    palette: sanitisePalette(row.palette),
    furniture: sanitiseFurniture(row.furniture),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayload(input: CarouselSkinInput) {
  return {
    name: input.name.trim() || 'Custom skin',
    base_template: input.baseTemplate,
    palette: sanitisePalette(input.palette),
    furniture: sanitiseFurniture(input.furniture),
  };
}

/** Returns an empty list when the table is absent, so the picker keeps working before the migration lands. */
export async function listCarouselSkins(): Promise<CarouselSkin[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_skins')
    .select(SELECT_COLUMNS)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingSkinsTable(error.message)) return [];
    console.error('Failed to fetch carousel skins:', error.message);
    return [];
  }
  return ((data || []) as CarouselSkinRow[]).map(normalizeRow);
}

export async function createCarouselSkin(input: CarouselSkinInput): Promise<CarouselSkin> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_skins')
    .insert(toPayload(input))
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return normalizeRow(data as CarouselSkinRow);
}

export async function updateCarouselSkin(id: string, input: CarouselSkinInput): Promise<CarouselSkin> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('carousel_skins')
    .update({ ...toPayload(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return normalizeRow(data as CarouselSkinRow);
}

export async function deleteCarouselSkin(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('carousel_skins').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
