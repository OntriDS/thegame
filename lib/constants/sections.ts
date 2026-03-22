// lib/constants/sections.ts
export const ADMIN_SECTIONS = [
  { slug: 'dashboards',     label: 'Dashboards' },
  { slug: 'control-room',   label: 'Control Room' },
  { slug: 'inventories',    label: 'Inventories' },
  { slug: 'finances',       label: 'Finances' },
  { slug: 'sales',          label: 'Sales' },
  { slug: 'map',            label: 'Map' },
  { slug: 'characters',     label: 'Characters' },
  { slug: 'player',         label: 'Player' },
  { slug: 'accounts',       label: 'Accounts' },
  { slug: 'data-center',    label: 'Data Center' },
  { slug: 'archive',        label: 'Archive' },
  { slug: 'research',       label: 'Research' },
  { slug: 'settings',       label: 'Settings' },
] as const;

export type AdminSectionSlug = typeof ADMIN_SECTIONS[number]['slug'];
