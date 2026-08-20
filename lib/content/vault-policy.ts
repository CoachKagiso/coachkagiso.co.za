import type { ContentBacklogItem } from '@/lib/content-studio';

type VaultBacklogShape = Pick<ContentBacklogItem, 'source' | 'notes'>;

// 'templates' is backed by carousel_dna rather than the backlog table, so it
// never holds ContentBacklogItems and is excluded from expiry sweeps.
export type VaultSection = 'ideas' | 'smart' | 'messy' | 'insights' | 'templates';

export const BACKLOG_VAULT_SECTIONS = ['ideas', 'smart', 'messy', 'insights'] as const;
export type BacklogVaultSection = (typeof BACKLOG_VAULT_SECTIONS)[number];

export function isBacklogVaultSection(section: VaultSection): section is BacklogVaultSection {
  return (BACKLOG_VAULT_SECTIONS as readonly string[]).includes(section);
}

export type VaultPolicy = {
  label: string;
  maxItems: number;
  retentionDays: number;
  warningDays: number;
};

export const messyMiddleMarker = '[vault:messy-middle]';

export const vaultPolicies: Record<VaultSection, VaultPolicy> = {
  ideas: {
    label: 'Idea Backlog',
    maxItems: 60,
    retentionDays: 60,
    warningDays: 10,
  },
  smart: {
    label: 'Smart Suggest',
    maxItems: 30,
    retentionDays: 21,
    warningDays: 5,
  },
  messy: {
    label: 'Messy Middle',
    maxItems: 40,
    retentionDays: 30,
    warningDays: 7,
  },
  insights: {
    label: 'Insights',
    maxItems: 40,
    retentionDays: 90,
    warningDays: 14,
  },
  // Templates are deliberately long-lived: a mould is worth keeping far longer
  // than a raw idea, and it is the reusable asset the whole Transform flow exists
  // to produce.
  templates: {
    label: 'Templates',
    maxItems: 40,
    retentionDays: 3650,
    warningDays: 0,
  },
};

export function getBacklogNotesKind(item: VaultBacklogShape) {
  const notes = item.notes?.trim();
  if (!notes?.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(notes) as { kind?: unknown };
    return typeof parsed.kind === 'string' ? parsed.kind : null;
  } catch {
    return null;
  }
}

export function isMessyMiddleItem(item: VaultBacklogShape) {
  return Boolean(item.notes?.includes(messyMiddleMarker));
}

export function isSmartSuggestItem(item: VaultBacklogShape) {
  return getBacklogNotesKind(item) === 'smart_suggest';
}

export function isInsightsBacklogItem(item: VaultBacklogShape) {
  const kind = getBacklogNotesKind(item);
  return item.source === 'insights' || kind === 'insights_summary' || kind === 'insights_article';
}

export function getVaultSectionForItem(item: VaultBacklogShape): VaultSection {
  if (isMessyMiddleItem(item)) return 'messy';
  if (isSmartSuggestItem(item)) return 'smart';
  if (isInsightsBacklogItem(item)) return 'insights';
  return 'ideas';
}

export function cleanMessyMiddleNotes(notes?: string | null) {
  return (notes || '').replace(messyMiddleMarker, '').trim() || null;
}

export function getVaultExpiryInfo(item: ContentBacklogItem, now = new Date()) {
  const section = getVaultSectionForItem(item);
  const policy = vaultPolicies[section];
  const createdAt = new Date(item.createdAt);
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? now : createdAt;
  const expiresAt = new Date(safeCreatedAt);
  expiresAt.setDate(expiresAt.getDate() + policy.retentionDays);

  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86_400_000));
  const isExpired = msRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= policy.warningDays;

  return {
    section,
    policy,
    createdAt: safeCreatedAt,
    expiresAt,
    daysRemaining,
    isExpired,
    isExpiringSoon,
  };
}

export function getVaultSectionCount(items: ContentBacklogItem[], section: VaultSection) {
  return items.filter((item) => getVaultSectionForItem(item) === section).length;
}
