// Human-readable labels for canonical kebab-case area / station slugs (KV & entities).
// Same pattern as status-display-labels.ts — storage uses slugs; UI uses these maps.

import type { Area, Station } from '@/types/type-aliases';

export const AREA_DISPLAY_LABEL: Record<Area, string> = {
  admin: 'Admin',
  research: 'Research',
  dev: 'Dev',
  'art-design': 'Art/Design',
  'maker-space': 'Makerspace',
  sales: 'Sales',
  personal: 'Personal',
};

export const STATION_DISPLAY_LABEL: Record<Station, string> = {
  strategy: 'Strategy',
  finances: 'Finances',
  team: 'Team',
  inventory: 'Inventory',
  transport: 'Transport',
  rents: 'Rents',
  partnerships: 'Partnerships',
  projects: 'Projects',
  items: 'Items',
  library: 'Library',
  studies: 'Studies',
  processes: 'Processes',
  reviews: 'Reviews',
  ebooks: 'Ebooks',
  innovation: 'Innovation',
  classes: 'Classes',
  'systems-dev': 'Systems-Dev',
  paint: 'Paint',
  'digital-art': 'Digital-Art',
  design: 'Design',
  animation: 'Animation',
  craft: 'Craft',
  'direct-sales': 'Direct-Sales',
  'booth-sales': 'Booth-Sales',
  network: 'Network',
  marketing: 'Marketing',
  'online-sales': 'Online-Sales',
  portfolio: 'Portfolio',
  dispatches: 'Dispatches',
  'gallery-store': 'Gallery-Store',
  bookings: 'Bookings',
  family: 'Family',
  food: 'Food',
  health: 'Health',
  rewards: 'Rewards',
  'transport-p': 'Transport-P',
  'rent-p': 'Rent-P',
  'other-p': 'Other-P',
};

export function getAreaDisplayLabel(area: Area | string | undefined | null): string {
  if (!area) return '';
  if (area in AREA_DISPLAY_LABEL) return AREA_DISPLAY_LABEL[area as Area];
  return String(area);
}

export function getStationDisplayLabel(station: Station | string | undefined | null): string {
  if (!station) return '';
  if (station in STATION_DISPLAY_LABEL) return STATION_DISPLAY_LABEL[station as Station];
  return String(station);
}
