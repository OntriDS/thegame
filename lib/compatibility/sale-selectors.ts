import { Sale, Money } from '@/types/entities';

/**
 * COMPATIBILITY SELECTORS - (Sales & Financials)
 * These functions safely extract fields from a Sale entity whether it is using the
 * legacy root structure (LegacyCompatibility) or the strict V1 Facet contexts.
 */

export function getSaleLinks(sale: Sale): any[] {
  // Links are technically replaced by lines, but UI currently iterates through links
  return (sale as any).links || [];
}

export function getSaleMetadata(sale: Sale): any {
  return (sale as any).metadata;
}

export function getSaleBoothFee(sale: Sale): Money | undefined {
  return sale.context?.boothFee || (sale as any).boothFee;
}
