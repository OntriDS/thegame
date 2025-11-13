// lib/analytics/financial-analytics.ts
// Link-powered multi-dimensional financial analytics utilities

import type { FinancialRecord, Item, Sale } from '@/types/entities';
import { LinkType, EntityType, ItemType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';
import { getItemById, getAllItems } from '@/data-store/datastore';
import { getSaleById, getAllSales } from '@/data-store/datastore';
import type { Station } from '@/types/type-aliases';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductPerformance {
  itemType: ItemType | string;
  subItemType?: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  quantitySold: number;
  itemIds: string[];
}

export interface ChannelPerformance {
  salesChannel: Station | string;
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface ProductChannelMatrix {
  [productKey: string]: {
    [channelKey: string]: {
      revenue: number;
      quantity: number;
    };
  };
}

export interface StationPerformance {
  station: Station | string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  recordCount: number;
}

// ============================================================================
// PRODUCT PERFORMANCE (by Item Type/SubType)
// ============================================================================

/**
 * Calculate product performance by traversing FINREC_ITEM links
 * Groups by Item.type and optionally Item.subItemType
 */
export async function getProductPerformance(
  records: FinancialRecord[],
  groupBySubType: boolean = false
): Promise<ProductPerformance[]> {
  const productMap = new Map<string, ProductPerformance>();

  for (const record of records) {
    // Get items linked to this financial record
    const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
    const itemLinks = links.filter(link => link.linkType === LinkType.FINREC_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productKey = groupBySubType && item.subItemType
        ? `${item.type}:${item.subItemType}`
        : item.type;

      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          itemType: item.type,
          subItemType: item.subItemType,
          totalCost: 0,
          totalRevenue: 0,
          netProfit: 0,
          quantitySold: 0,
          itemIds: []
        });
      }

      const perf = productMap.get(productKey)!;
      const linkMetadata = link.metadata || {};
      const quantity = linkMetadata.quantity || 0;
      const unitPrice = linkMetadata.unitPrice || 0;
      const revenue = linkMetadata.totalRevenue || (quantity * unitPrice);

      // Cost comes from the financial record (if it's a cost record)
      if (record.cost > 0) {
        perf.totalCost += record.cost;
      }
      
      // Revenue comes from the link metadata or record
      if (record.revenue > 0 || revenue > 0) {
        perf.totalRevenue += revenue || record.revenue;
      }

      perf.quantitySold += quantity;
      if (!perf.itemIds.includes(item.id)) {
        perf.itemIds.push(item.id);
      }
    }
  }

  // Calculate net profit for each product
  const results = Array.from(productMap.values()).map(perf => ({
    ...perf,
    netProfit: perf.totalRevenue - perf.totalCost
  }));

  return results;
}

// ============================================================================
// CHANNEL PERFORMANCE (by Sales Channel)
// ============================================================================

/**
 * Calculate sales channel performance from FinancialRecords with salesChannel
 * Groups by FinancialRecord.salesChannel
 */
export async function getChannelPerformance(
  records: FinancialRecord[]
): Promise<ChannelPerformance[]> {
  const channelMap = new Map<string, ChannelPerformance>();

  for (const record of records) {
    if (!record.salesChannel || record.revenue <= 0) continue;

    const channel = record.salesChannel;

    if (!channelMap.has(channel)) {
      channelMap.set(channel, {
        salesChannel: channel,
        totalRevenue: 0,
        transactionCount: 0,
        averageTransaction: 0
      });
    }

    const perf = channelMap.get(channel)!;
    perf.totalRevenue += record.revenue;
    perf.transactionCount += 1;
  }

  // Calculate averages
  return Array.from(channelMap.values()).map(perf => ({
    ...perf,
    averageTransaction: perf.transactionCount > 0 
      ? perf.totalRevenue / perf.transactionCount 
      : 0
  }));
}

// ============================================================================
// PRODUCT x CHANNEL MATRIX
// ============================================================================

/**
 * Create a 2D matrix of Product x Sales Channel performance
 * Traverses SALE_FINREC → SALE_ITEM → ITEM to get product info
 */
export async function getProductChannelMatrix(
  records: FinancialRecord[]
): Promise<ProductChannelMatrix> {
  const matrix: ProductChannelMatrix = {};

  for (const record of records) {
    if (!record.salesChannel || !record.sourceSaleId) continue;

    // Get the sale to find items
    const sale = await getSaleById(record.sourceSaleId);
    if (!sale) continue;

    // Get items from sale via SALE_ITEM links
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    const itemLinks = saleLinks.filter(link => link.linkType === LinkType.SALE_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productKey = item.type;
      const channelKey = record.salesChannel;

      if (!matrix[productKey]) {
        matrix[productKey] = {};
      }
      if (!matrix[productKey][channelKey]) {
        matrix[productKey][channelKey] = { revenue: 0, quantity: 0 };
      }

      const linkMetadata = link.metadata || {};
      const quantity = linkMetadata.quantity || 0;
      const unitPrice = linkMetadata.unitPrice || 0;
      const revenue = quantity * unitPrice;

      matrix[productKey][channelKey].revenue += revenue;
      matrix[productKey][channelKey].quantity += quantity;
    }
  }

  return matrix;
}

// ============================================================================
// STATION PERFORMANCE (Process Stations)
// ============================================================================

/**
 * Calculate performance by process station
 * Groups by FinancialRecord.station
 */
export function getStationPerformance(
  records: FinancialRecord[]
): StationPerformance[] {
  const stationMap = new Map<string, StationPerformance>();

  for (const record of records) {
    const station = record.station;

    if (!stationMap.has(station)) {
      stationMap.set(station, {
        station,
        totalCost: 0,
        totalRevenue: 0,
        netProfit: 0,
        recordCount: 0
      });
    }

    const perf = stationMap.get(station)!;
    perf.totalCost += record.cost;
    perf.totalRevenue += record.revenue;
    perf.recordCount += 1;
  }

  // Calculate net profit
  return Array.from(stationMap.values()).map(perf => ({
    ...perf,
    netProfit: perf.totalRevenue - perf.totalCost
  }));
}

// ============================================================================
// COSTS BY PRODUCT STATION (Item.station via FINREC_ITEM)
// ============================================================================

/**
 * Calculate costs grouped by Item.station (product station)
 * Traverses FINREC_ITEM links to get Item.station
 */
export async function getCostsByProductStation(
  records: FinancialRecord[]
): Promise<Record<string, { cost: number; recordCount: number }>> {
  const stationMap: Record<string, { cost: number; recordCount: number }> = {};

  for (const record of records) {
    if (record.cost <= 0) continue;

    // Get items linked to this financial record
    const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
    const itemLinks = links.filter(link => link.linkType === LinkType.FINREC_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productStation = item.station;
      if (!stationMap[productStation]) {
        stationMap[productStation] = { cost: 0, recordCount: 0 };
      }

      stationMap[productStation].cost += record.cost;
      stationMap[productStation].recordCount += 1;
    }
  }

  return stationMap;
}

// ============================================================================
// REVENUES BY PRODUCT STATION (Item.station via SALE_FINREC → SALE_ITEM)
// ============================================================================

/**
 * Calculate revenues grouped by Item.station (product station)
 * Traverses SALE_FINREC → SALE_ITEM → ITEM to get Item.station
 */
export async function getRevenuesByProductStation(
  records: FinancialRecord[]
): Promise<Record<string, { revenue: number; transactionCount: number }>> {
  const stationMap: Record<string, { revenue: number; transactionCount: number }> = {};

  for (const record of records) {
    if (record.revenue <= 0 || !record.sourceSaleId) continue;

    // Get the sale
    const sale = await getSaleById(record.sourceSaleId);
    if (!sale) continue;

    // Get items from sale via SALE_ITEM links
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    const itemLinks = saleLinks.filter(link => link.linkType === LinkType.SALE_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productStation = item.station;
      if (!stationMap[productStation]) {
        stationMap[productStation] = { revenue: 0, transactionCount: 0 };
      }

      const linkMetadata = link.metadata || {};
      const quantity = linkMetadata.quantity || 0;
      const unitPrice = linkMetadata.unitPrice || 0;
      const revenue = quantity * unitPrice;

      stationMap[productStation].revenue += revenue;
      stationMap[productStation].transactionCount += 1;
    }
  }

  return stationMap;
}

