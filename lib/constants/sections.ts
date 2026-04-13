// lib/constants/sections.ts
export const ADMIN_SECTION_SLUGS = [
  'dashboards',
  'control-room',
  'inventories',
  'finances',
  'sales',
  'map',
  'characters',
  'player',
  'accounts',
  'data-center',
  'archive',
  'research',
  'settings',
] as const;

export interface AdminSection {
  slug: (typeof ADMIN_SECTION_SLUGS)[number];
  label: string;
  permissionResource?: string;
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { slug: 'dashboards',     label: 'Dashboards',     permissionResource: 'dashboards' },
  { slug: 'control-room',   label: 'Control Room',   permissionResource: 'control-room' },
  { slug: 'inventories',    label: 'Inventories',    permissionResource: 'inventory' },
  { slug: 'finances',       label: 'Finances',       permissionResource: 'finances' },
  { slug: 'sales',          label: 'Sales',          permissionResource: 'sales' },
  { slug: 'map',            label: 'Map',            permissionResource: 'maps' },
  { slug: 'characters',     label: 'Characters',     permissionResource: 'characters' },
  { slug: 'player',         label: 'Player',         permissionResource: 'players' },
  { slug: 'accounts',       label: 'Accounts',       permissionResource: 'accounts' },
  { slug: 'data-center',    label: 'Data Center' },
  { slug: 'archive',        label: 'Archive' },
  { slug: 'research',       label: 'Research' },
  { slug: 'settings',       label: 'Settings',       permissionResource: 'settings' },
] as const;
export type AdminSectionSlug = typeof ADMIN_SECTION_SLUGS[number];
