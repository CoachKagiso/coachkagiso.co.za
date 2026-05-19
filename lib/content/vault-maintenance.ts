import {
  deleteContentBacklogItem,
  listContentBacklogItems,
  type ContentBacklogItem,
} from '@/lib/content-studio';
import { getVaultExpiryInfo } from '@/lib/content/vault-policy';

export async function pruneExpiredVaultItems(now = new Date()) {
  const items = await listContentBacklogItems();
  const expiredItems = items.filter((item) => getVaultExpiryInfo(item, now).isExpired);
  const expiredIds = new Set(expiredItems.map((item) => item.id));

  await Promise.all(expiredItems.map((item) => deleteContentBacklogItem(item.id)));

  return {
    activeItems: items.filter((item) => !expiredIds.has(item.id)),
    deletedIds: expiredItems.map((item) => item.id),
  } satisfies { activeItems: ContentBacklogItem[]; deletedIds: string[] };
}
