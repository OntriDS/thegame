import {
  SiteType,
  PhysicalBusinessType,
  DigitalSiteType,
  SystemSiteType,
} from '@/types/enums';

export const toTitle = (slug: string): string =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  [SiteType.PHYSICAL]: 'Physical',
  [SiteType.DIGITAL_SITE]: 'Digital Site',
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
  [DigitalSiteType.LOCAL]: 'Local',
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

