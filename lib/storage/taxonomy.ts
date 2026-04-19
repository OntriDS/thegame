/**
 * THEGAME PRIVATE TAXONOMY — private bucket keys: {area}/{station}/{timestamp}_{filename}
 * Game `personal` area maps to R2 prefix `private` (legacy bucket layout).
 */

export enum BusinessArea {
  ADMIN = 'admin',
  RESEARCH = 'research',
  DEV = 'dev',
  ART_DESIGN = 'art-design',
  MAKER_SPACE = 'maker-space',
  SALES = 'sales',
  PERSONAL = 'personal',
}

export enum AdminStation {
  STRATEGY = 'strategy',
  FINANCES = 'finances',
  TEAM = 'team',
  INVENTORY = 'inventory',
  TRANSPORT = 'transport',
  RENTS = 'rents',
  PARTNERSHIPS = 'partnerships',
  PROJECTS = 'projects',
  ITEMS = 'items',
}

export enum ResearchStation {
  LIBRARY = 'library',
  STUDIES = 'studies',
  PROCESSES = 'processes',
  REVIEWS = 'reviews',
  EBOOKS = 'ebooks',
  CLASSES = 'classes',
  INNOVATION = 'innovation',
}

export enum DevStation {
  SYSTEMS_DEV = 'systems-dev',
  APPS_DEV = 'apps-dev',
}

export enum ArtDesignStation {
  PAINT = 'paint',
  DIGITAL = 'digitals',
  DESIGN = 'design',
  ANIMATION = 'animation',
}

export enum MakerSpaceStation {
  CRAFT = 'craft',
}

export enum SalesStation {
  DIRECT_SALES = 'direct-sales',
  BOOTH_SALES = 'booth-sales',
  NETWORK = 'network',
  MARKETING = 'marketing',
  ONLINE_SALES = 'online-sales',
  DISPATCHES = 'dispatches',
  PORTFOLIO = 'portfolio',
  GALLERY_STORE = 'gallery-store',
  BOOKINGS = 'bookings',
}

export enum PersonalStation {
  FAMILY = 'family',
  FOOD = 'food',
  HEALTH = 'health',
  REWARDS = 'rewards',
  TRANSPORT_P = 'transport-p',
  RENT_P = 'rent-p',
  OTHER_P = 'other-p',
}

export enum PrivateFileType {
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
}

/** R2 object key prefix: personal uploads use `private/` segment. */
export function r2PrivateAreaPrefix(area: string): string {
  return area === BusinessArea.PERSONAL || area === 'personal' ? 'private' : area;
}

export function generatePrivatePath(area: string, station: string, filename: string): string {
  const bucketArea = r2PrivateAreaPrefix(area);
  const timestamp = Date.now();
  const base = filename.replace(/^.*[/\\]/, '').replace(/\s+/g, '_').slice(0, 200) || 'file';
  return `${bucketArea}/${station}/${timestamp}_${base}`;
}

export function isValidPrivatePath(path: string): boolean {
  const validAreas = new Set([
    ...Object.values(BusinessArea).map((a) => r2PrivateAreaPrefix(a)),
    'private',
  ]);
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length < 3) return false;
  return validAreas.has(pathParts[0]);
}

export function getStationEnum(area: BusinessArea): object | null {
  switch (area) {
    case BusinessArea.ADMIN:
      return AdminStation;
    case BusinessArea.RESEARCH:
      return ResearchStation;
    case BusinessArea.DEV:
      return DevStation;
    case BusinessArea.ART_DESIGN:
      return ArtDesignStation;
    case BusinessArea.MAKER_SPACE:
      return MakerSpaceStation;
    case BusinessArea.SALES:
      return SalesStation;
    case BusinessArea.PERSONAL:
      return PersonalStation;
    default:
      return null;
  }
}

export function isBusinessArea(value: string): value is BusinessArea {
  return Object.values(BusinessArea).includes(value as BusinessArea);
}

export function isAdminStation(value: string): value is AdminStation {
  return Object.values(AdminStation).includes(value as AdminStation);
}

export function isResearchStation(value: string): value is ResearchStation {
  return Object.values(ResearchStation).includes(value as ResearchStation);
}

export function isSalesStation(value: string): value is SalesStation {
  return Object.values(SalesStation).includes(value as SalesStation);
}
