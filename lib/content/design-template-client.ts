// Browser-side access to Design Studio templates.
//
// Templates used to live in localStorage under DESIGN_TEMPLATE_LEGACY_STORAGE_KEY.
// They now live in Supabase so they survive a cleared browser and are reachable
// from any device - which matters because carousel drafts reference custom CTA
// templates by id, so a lost template breaks a saved draft.
//
// Two things keep that move safe:
//   1. Anything still in localStorage is uploaded once, then the local copy is
//      cleared. Nothing Kagiso already designed is lost.
//   2. If the API is unreachable - most likely the migration has not been
//      applied yet - every call falls back to localStorage so Design Studio
//      keeps working, degraded but not broken.

export const DESIGN_TEMPLATE_LEGACY_STORAGE_KEY = 'coach-kagiso-design-studio-v1-templates';

const ENDPOINT = '/api/content/design-templates';

// Deliberately permissive: the authoritative shape lives in DesignStudioPanel,
// which validates every record with isDesignTemplateRecord before use. Keeping
// this loose avoids duplicating the DesignDocument type across the boundary.
export type DesignTemplateApiRecord<TDocument = unknown> = {
  id: string;
  name: string;
  kind?: 'deck' | 'cover' | 'cta';
  format: string;
  width: number;
  height: number;
  sourceCarouselTemplate?: string | null;
  sourceCarouselLayoutRecipe?: string | null;
  document: TDocument;
  createdAt: string;
  updatedAt: string;
};

export type DesignTemplateSaveInput<TDocument = unknown> = {
  name: string;
  kind: 'deck' | 'cover' | 'cta';
  format: string;
  width: number;
  height: number;
  sourceCarouselTemplate?: string | null;
  sourceCarouselLayoutRecipe?: string | null;
  document: TDocument;
};

export type DesignTemplateLoadResult = {
  templates: unknown[];
  /** True when the API could not be reached and localStorage was used instead. */
  usedLocalFallback: boolean;
  /** Number of legacy localStorage templates uploaded during this load. */
  migratedCount: number;
  error: string | null;
};

function readLegacyTemplates<TDocument>(): DesignTemplateApiRecord<TDocument>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DESIGN_TEMPLATE_LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as DesignTemplateApiRecord<TDocument>[];
  } catch {
    return [];
  }
}

function writeLegacyTemplates(templates: unknown[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DESIGN_TEMPLATE_LEGACY_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Storage full or blocked. The Supabase copy is authoritative anyway.
  }
}

function clearLegacyTemplates() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DESIGN_TEMPLATE_LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to do; a stale local copy is harmless once the API is the source.
  }
}

async function requestTemplates<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not reach design templates.');
  return data;
}

export async function loadDesignTemplates(adminKey?: string): Promise<DesignTemplateLoadResult> {
  const legacy = readLegacyTemplates<unknown>();

  try {
    const url = adminKey ? `${ENDPOINT}?key=${encodeURIComponent(adminKey)}` : ENDPOINT;
    const response = await fetch(url);
    const data = (await response.json().catch(() => ({}))) as {
      templates?: DesignTemplateApiRecord[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || 'Could not load design templates.');

    let templates = data.templates || [];
    let migratedCount = 0;

    // One-time upload of whatever is still sitting in this browser. Matching on
    // name plus dimensions rather than id, because ids were generated locally
    // and the database assigns its own.
    if (legacy.length > 0) {
      const existing = new Set(templates.map((template) => `${template.name}|${template.width}x${template.height}`));
      const pending = legacy.filter(
        (template) => !existing.has(`${template.name}|${template.width}x${template.height}`),
      );

      for (const template of pending) {
        try {
          await saveDesignTemplate(
            {
              name: template.name,
              kind: template.kind || 'deck',
              format: template.format,
              width: template.width,
              height: template.height,
              sourceCarouselTemplate: template.sourceCarouselTemplate ?? null,
              sourceCarouselLayoutRecipe: template.sourceCarouselLayoutRecipe ?? null,
              document: template.document,
            },
            adminKey,
          );
          migratedCount += 1;
        } catch {
          // Leave the local copy in place if any upload fails, so the next load
          // can retry rather than dropping the template.
        }
      }

      if (migratedCount === pending.length) {
        clearLegacyTemplates();
        const refreshed = await fetch(url);
        const refreshedData = (await refreshed.json().catch(() => ({}))) as {
          templates?: DesignTemplateApiRecord[];
        };
        if (refreshed.ok && refreshedData.templates) templates = refreshedData.templates;
      } else {
        // Uploads failed - almost always because the design_templates migration
        // has not been applied, in which case the list endpoint answers 200 with
        // an empty array rather than an error. Keep showing the local templates
        // instead of letting them silently vanish from the UI, and stay in
        // fallback mode so new saves are written locally too.
        const uploaded = new Set(
          pending.slice(0, migratedCount).map((template) => `${template.name}|${template.width}x${template.height}`),
        );
        const stillLocal = pending.filter(
          (template) => !uploaded.has(`${template.name}|${template.width}x${template.height}`),
        );
        return {
          templates: [...templates, ...stillLocal],
          usedLocalFallback: true,
          migratedCount,
          error: 'the templates table is not available yet',
        };
      }
    }

    return { templates, usedLocalFallback: false, migratedCount, error: null };
  } catch (error) {
    return {
      templates: legacy,
      usedLocalFallback: true,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Could not load design templates.',
    };
  }
}

export async function saveDesignTemplate<TDocument>(
  input: DesignTemplateSaveInput<TDocument>,
  adminKey?: string,
): Promise<DesignTemplateApiRecord<TDocument>> {
  const data = await requestTemplates<{ template: DesignTemplateApiRecord<TDocument> }>('POST', {
    key: adminKey,
    ...input,
  });
  return data.template;
}

export async function updateDesignTemplateRecord<TDocument>(
  id: string,
  input: Partial<DesignTemplateSaveInput<TDocument>>,
  adminKey?: string,
): Promise<DesignTemplateApiRecord<TDocument>> {
  const data = await requestTemplates<{ template: DesignTemplateApiRecord<TDocument> }>('PATCH', {
    key: adminKey,
    id,
    ...input,
  });
  return data.template;
}

export async function deleteDesignTemplateRecord(id: string, adminKey?: string): Promise<void> {
  await requestTemplates<{ ok: boolean }>('DELETE', { key: adminKey, id });
}

// Used by the local fallback path so a template saved while the API is down is
// not lost when the tab closes.
export function persistLocalFallbackTemplates(templates: unknown[]) {
  writeLegacyTemplates(templates);
}
