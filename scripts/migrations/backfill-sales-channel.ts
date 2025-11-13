// scripts/migrations/backfill-sales-channel.ts
// Backfill salesChannel field for existing FinancialRecords created from Sales

import { getAllFinancials, upsertFinancial } from '@/data-store/datastore';
import { getAllSales } from '@/data-store/datastore';
import { getLinksFor } from '@/links/link-registry';
import { LinkType, EntityType } from '@/types/enums';
import { getSalesChannelFromSaleType } from '@/lib/utils/business-structure-utils';
import type { FinancialRecord, Sale } from '@/types/entities';

/**
 * Backfill salesChannel for FinancialRecords that have sourceSaleId
 * but are missing the salesChannel field
 */
export async function backfillSalesChannel(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  console.log('[backfillSalesChannel] Starting salesChannel backfill...');
  
  const stats = {
    processed: 0,
    updated: 0,
    errors: 0
  };

  try {
    // Get all financial records
    const allFinrecs = await getAllFinancials();
    console.log(`[backfillSalesChannel] Found ${allFinrecs.length} financial records`);

    // Get all sales for lookup
    const allSales = await getAllSales();
    const salesMap = new Map<string, Sale>();
    allSales.forEach(sale => salesMap.set(sale.id, sale));
    console.log(`[backfillSalesChannel] Loaded ${allSales.length} sales for lookup`);

    // Process each financial record
    for (const finrec of allFinrecs) {
      stats.processed++;

      // Skip if already has salesChannel
      if (finrec.salesChannel) {
        continue;
      }

      // Skip if no sourceSaleId
      if (!finrec.sourceSaleId) {
        continue;
      }

      // Get the sale
      const sale = salesMap.get(finrec.sourceSaleId);
      if (!sale) {
        console.warn(`[backfillSalesChannel] Sale ${finrec.sourceSaleId} not found for finrec ${finrec.id}`);
        stats.errors++;
        continue;
      }

      // Determine sales channel from sale
      const salesChannel = sale.salesChannel || getSalesChannelFromSaleType(sale.type);
      
      if (!salesChannel) {
        console.warn(`[backfillSalesChannel] Could not determine salesChannel for sale ${sale.id} (type: ${sale.type})`);
        stats.errors++;
        continue;
      }

      // Update financial record
      const updatedFinrec: FinancialRecord = {
        ...finrec,
        salesChannel: salesChannel,
        updatedAt: new Date()
      };

      await upsertFinancial(updatedFinrec);
      stats.updated++;
      
      console.log(`[backfillSalesChannel] ✅ Updated finrec ${finrec.id} with salesChannel: ${salesChannel}`);
    }

    console.log(`[backfillSalesChannel] ✅ Completed: ${stats.updated} updated, ${stats.errors} errors`);
    return stats;

  } catch (error) {
    console.error('[backfillSalesChannel] ❌ Failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  backfillSalesChannel()
    .then(stats => {
      console.log('Backfill complete:', stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

