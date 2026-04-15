import type { Continent, Country, Region } from '@/types/type-aliases';
import {
  SiteType,
  PhysicalBusinessType,
  DigitalSiteType,
  SystemSiteType,
} from '@/types/enums';

const toTitle = (slug: string): string =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  [SiteType.PHYSICAL]: 'Physical',
  [SiteType.DIGITAL]: 'Digital',
  [SiteType.SYSTEM]: 'System',
};

export const PHYSICAL_SITE_TYPE_LABEL: Record<PhysicalBusinessType, string> = {
  [PhysicalBusinessType.STORE]: 'Store',
  [PhysicalBusinessType.SELLING_POINT]: 'Selling Point',
  [PhysicalBusinessType.TEACHING_SPACE]: 'Teaching Space',
  [PhysicalBusinessType.HQ]: 'HQ',
  [PhysicalBusinessType.ART_GALLERY]: 'Art Gallery',
  [PhysicalBusinessType.DESIGN_SPACE]: 'Design Space',
  [PhysicalBusinessType.WORKSHOP]: 'Workshop',
  [PhysicalBusinessType.STORAGE]: 'Storage',
  [PhysicalBusinessType.PROVIDER]: 'Provider',
  [PhysicalBusinessType.LIVING_SPACE]: 'Living Space',
  [PhysicalBusinessType.BANK]: 'Bank',
};

export const DIGITAL_SITE_TYPE_LABEL: Record<DigitalSiteType, string> = {
  [DigitalSiteType.REPOSITORY]: 'Repository',
  [DigitalSiteType.DATABASE]: 'Database',
  [DigitalSiteType.WEBSITEAPP]: 'Website App',
  [DigitalSiteType.NFT_PLATFORM]: 'NFT Platform',
  [DigitalSiteType.SOCIAL_MEDIA]: 'Social Media',
  [DigitalSiteType.LLM_AGENT]: 'LLM Agent',
  [DigitalSiteType.BANKING_PLATFORM]: 'Banking Platform',
};

export const SYSTEM_SITE_TYPE_LABEL: Record<SystemSiteType, string> = {
  [SystemSiteType.UNIVERSAL_TRACKING]: 'Universal Tracking',
  [SystemSiteType.SOLD_ITEMS]: 'Sold Items',
  [SystemSiteType.ARCHIVED]: 'Archived',
};

export const CONTINENT_LABEL: Record<Continent, string> = {
  'north-america': 'North America',
  'central-america': 'Central America',
  'south-america': 'South America',
};

export const COUNTRY_LABEL: Record<Country, string> = {
  'united-states': 'United States',
  canada: 'Canada',
  'costa-rica': 'Costa Rica',
  panama: 'Panama',
  nicaragua: 'Nicaragua',
  'el-salvador': 'El Salvador',
  venezuela: 'Venezuela',
  colombia: 'Colombia',
  uruguay: 'Uruguay',
  chile: 'Chile',
  argentina: 'Argentina',
  brasil: 'Brazil',
  peru: 'Peru',
};

export const REGION_LABEL: Record<Region, string> = {
  'united-states': 'United States',
  canada: 'Canada',
  puntarenas: 'Puntarenas',
  'san-jose': 'San Jose',
  guanacaste: 'Guanacaste',
  limon: 'Limon',
  panama: 'Panama',
  nicaragua: 'Nicaragua',
  'el-salvador': 'El Salvador',
  'margarita-island': 'Margarita Island',
  caracas: 'Caracas',
  bogota: 'Bogota',
  montevideo: 'Montevideo',
  santiago: 'Santiago',
  'buenos-aires': 'Buenos Aires',
  'rio-de-janeiro': 'Rio de Janeiro',
  lima: 'Lima',
};

export function getSiteTypeLabel(siteType: SiteType | string | undefined | null): string {
  if (!siteType) return '';
  if (siteType in SITE_TYPE_LABEL) return SITE_TYPE_LABEL[siteType as SiteType];
  return String(siteType);
}

export function getPhysicalSiteTypeLabel(
  siteSubType: PhysicalBusinessType | string | undefined | null
): string {
  if (!siteSubType) return '';
  if (siteSubType in PHYSICAL_SITE_TYPE_LABEL) {
    return PHYSICAL_SITE_TYPE_LABEL[siteSubType as PhysicalBusinessType];
  }
  return String(siteSubType);
}

export function getDigitalSiteTypeLabel(
  siteSubType: DigitalSiteType | string | undefined | null
): string {
  if (!siteSubType) return '';
  if (siteSubType in DIGITAL_SITE_TYPE_LABEL) {
    return DIGITAL_SITE_TYPE_LABEL[siteSubType as DigitalSiteType];
  }
  return String(siteSubType);
}

export function getSystemSiteTypeLabel(
  siteSubType: SystemSiteType | string | undefined | null
): string {
  if (!siteSubType) return '';
  if (siteSubType in SYSTEM_SITE_TYPE_LABEL) {
    return SYSTEM_SITE_TYPE_LABEL[siteSubType as SystemSiteType];
  }
  return String(siteSubType);
}

export function getContinentLabel(continent: Continent | string | undefined | null): string {
  if (!continent) return '';
  return CONTINENT_LABEL[continent as Continent] || toTitle(String(continent));
}

export function getCountryLabel(country: Country | string | undefined | null): string {
  if (!country) return '';
  return COUNTRY_LABEL[country as Country] || toTitle(String(country));
}

export function getRegionLabel(region: Region | string | undefined | null): string {
  if (!region) return '';
  return REGION_LABEL[region as Region] || toTitle(String(region));
}
