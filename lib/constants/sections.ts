// lib/constants/sections.ts
export const ADMIN_SECTIONS = [
  { slug: 'dashboards',     label: 'Dashboards' },
  { slug: 'control-room',   label: 'Control Room' },
  { slug: 'inventories',    label: 'Inventories' },
  { slug: 'finances',       label: 'Finances' },
  { slug: 'sales',          label: 'Sales' },
  { slug: 'map',            label: 'Map' },
  { slug: 'character',      label: 'Character' },
  { slug: 'archive',        label: 'Archive' },
  { slug: 'data-center',    label: 'Data Center' },
  { slug: 'research',       label: 'Research' },
  { slug: 'settings',       label: 'Settings' },
] as const;

export type AdminSectionSlug = typeof ADMIN_SECTIONS[number]['slug']; 


