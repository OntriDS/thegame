import { EntityType } from '@/types/enums';

/** Query params used across admin pages to open an entity modal from a URL (e.g. from the links submodal). */
export const OPEN_ENTITY_QUERY = 'openEntity' as const;
export const OPEN_ID_QUERY = 'openId' as const;

const ADMIN_BASE = '/admin';

/**
 * Build an absolute-path URL to an admin screen that understands {@link OPEN_ENTITY_QUERY} + {@link OPEN_ID_QUERY}.
 * Returns null for unsupported entity types (e.g. `link`).
 */
export function buildAdminEntityDeepLink(entityType: string, entityId: string): string | null {
  if (!entityId) return null;
  const t = String(entityType).toLowerCase();
  const q = new URLSearchParams();
  q.set(OPEN_ENTITY_QUERY, t);
  q.set(OPEN_ID_QUERY, entityId);

  let path: string | null = null;
  switch (t) {
    case EntityType.SALE:
      path = `${ADMIN_BASE}/sales`;
      break;
    case EntityType.FINANCIAL:
      path = `${ADMIN_BASE}/finances`;
      break;
    case EntityType.ITEM:
      path = `${ADMIN_BASE}/inventories`;
      break;
    case EntityType.SITE:
      path = `${ADMIN_BASE}/map`;
      break;
    case EntityType.CHARACTER:
      path = `${ADMIN_BASE}/characters`;
      break;
    case EntityType.PLAYER:
      path = `${ADMIN_BASE}/player`;
      break;
    case EntityType.ACCOUNT:
      path = `${ADMIN_BASE}/accounts`;
      break;
    case EntityType.TASK:
      path = `${ADMIN_BASE}/control-room`;
      break;
    default:
      path = null;
  }

  if (!path) return null;
  return `${path}?${q.toString()}`;
}

export function monthKeyFromYearMonth(year: number, month: number): string {
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  return `${mm}-${yy}`;
}
