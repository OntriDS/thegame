// lib/constants/sections.ts
export const ADMIN_SECTIONS = [
  { slug: 'dashboards',     label: 'Dashboards' },
  { slug: 'control-room',   label: 'Control Room' },
  { slug: 'finances',       label: 'Finances' },
  { slug: 'inventories',    label: 'Inventories' },
  { slug: 'sales',          label: 'Sales' },
  { slug: 'map',            label: 'Map' },
  { slug: 'player',         label: 'Player' },
  { slug: 'personas',       label: 'Personas' },
  { slug: 'archive',        label: 'Archive' },
  { slug: 'data-center',    label: 'Data Center' },
  { slug: 'research',       label: 'Research' },
  { slug: 'settings',       label: 'Settings' },
] as const;

export type AdminSectionSlug = typeof ADMIN_SECTIONS[number]['slug']; 


