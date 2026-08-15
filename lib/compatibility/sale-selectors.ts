import { Sale } from '@/types/entities';

/**
 * Canonical selectors for sale relationship data.
 */

export function getSaleLinks(sale: Sale): any[] {
  // Links are technically replaced by lines, but UI currently iterates through links
  return (sale as any).links || [];
}
