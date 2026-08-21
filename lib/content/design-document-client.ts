// Browser-side access to saved designs.
//
// The working design used to live in localStorage under
// DESIGN_DOCUMENT_LEGACY_STORAGE_KEY - one browser, no second device, and a
// cleared site wiped it. It now lives in Supabase, with the local copy kept as a
// mirror so the studio still opens if the API is unreachable.

export const DESIGN_DOCUMENT_LEGACY_STORAGE_KEY = 'coach-kagiso-design-studio-v3-manifesto';

const ENDPOINT = '/api/content/design-documents';

export type DesignDocumentSummaryRecord = {
  id: string;
  title: string;
  format: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export type DesignDocumentRecord = DesignDocumentSummaryRecord & { document: unknown };

export type DesignDocumentSaveInput = {
  title: string;
  format: string;
  width: number;
  height: number;
  document: unknown;
};

async function requestDesigns<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not reach saved designs.');
  return data;
}

export function readLocalDesignMirror(): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DESIGN_DOCUMENT_LEGACY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeLocalDesignMirror(document: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DESIGN_DOCUMENT_LEGACY_STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Quota or blocked storage. The Supabase copy is authoritative.
  }
}

export function clearLocalDesignMirror() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DESIGN_DOCUMENT_LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

export async function listSavedDesigns(adminKey?: string): Promise<DesignDocumentSummaryRecord[]> {
  const url = adminKey ? `${ENDPOINT}?key=${encodeURIComponent(adminKey)}` : ENDPOINT;
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as {
    designs?: DesignDocumentSummaryRecord[];
    error?: string;
  };
  if (!response.ok) throw new Error(data.error || 'Could not list saved designs.');
  return data.designs || [];
}

export async function fetchSavedDesign(id: string, adminKey?: string): Promise<DesignDocumentRecord> {
  const params = new URLSearchParams({ id });
  if (adminKey) params.set('key', adminKey);
  const response = await fetch(`${ENDPOINT}?${params.toString()}`);
  const data = (await response.json().catch(() => ({}))) as { design?: DesignDocumentRecord; error?: string };
  if (!response.ok || !data.design) throw new Error(data.error || 'Could not open that design.');
  return data.design;
}

export async function createSavedDesign(
  input: DesignDocumentSaveInput,
  adminKey?: string,
): Promise<DesignDocumentRecord> {
  const data = await requestDesigns<{ design: DesignDocumentRecord }>('POST', { key: adminKey, ...input });
  return data.design;
}

export async function updateSavedDesign(
  id: string,
  input: Partial<DesignDocumentSaveInput>,
  adminKey?: string,
): Promise<DesignDocumentRecord> {
  const data = await requestDesigns<{ design: DesignDocumentRecord }>('PATCH', { key: adminKey, id, ...input });
  return data.design;
}

export async function deleteSavedDesign(id: string, adminKey?: string): Promise<void> {
  await requestDesigns<{ ok: boolean }>('DELETE', { key: adminKey, id });
}
