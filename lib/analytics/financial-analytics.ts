// @ts-nocheck
// lib/analytics/financial-analytics.ts
// Link-powered multi-dimensional financial analytics utilities

import type { FinancialRecord, Item, ItemSaleLine, Sale } from '@/types/entities';
import { LinkType, EntityType, ItemType } from '@/types/enums';
import { getLinksFor } from '@/links/link-registry';
import { getItemById, getAllItems } from '@/data-store/datastore';
import { getSaleById, getAllSales } from '@/data-store/datastore';
import type { Station } from '@/types/type-aliases';
import { extractMoneyValue } from '@/lib/utils/financial-utils';

async function getLinkedSaleId(record: FinancialRecord): Promise<string | null> {
  const legacy = (record as any).sourceSaleId;
  if (legacy) return legacy;
  const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
  const link = links.find((candidate: any) =>
    (candidate.linkType === LinkType.FINREC_SALE && candidate.target?.type === EntityType.SALE) ||
    (candidate.linkType === LinkType.SALE_FINREC && candidate.source?.type === EntityType.SALE)
  ) as any;
  return link?.target?.type === EntityType.SALE ? link.target.id :
    link?.source?.type === EntityType.SALE ? link.source.id : null;
}

async function metricsForFinrecItemLink(
  record: FinancialRecord,
  itemId: string
): Promise<{ quantity: number; unitPrice: number; revenue: number }> {
  const linkedSaleId = await getLinkedSaleId(record);
  if (linkedSaleId) {
    const sale = await getSaleById(linkedSaleId);
    if (sale?.lines) {
      const line = sale.lines.find(
        (l): l is ItemSaleLine => l.kind === 'item' && 'itemId' in l && l.itemId === itemId
      );
      if (line) {
        const q = line.quantity || 0;
        const up = line.unitPrice || 0;
        return { quantity: q, unitPrice: up, revenue: q * up };
      }
    }
  }
  const plan = record.context?.productionPlan;
  if (plan?.outputQuantity) {
    const q = plan.outputQuantity;
    const revenue = extractMoneyValue(record.revenue);
    const up = extractMoneyValue(plan.outputItemPrice) || (revenue > 0 && q ? revenue / q : 0);
    return { quantity: q, unitPrice: up, revenue: q * up };
  }
  const revenue = extractMoneyValue(record.revenue);
  if (revenue > 0) {
    return { quantity: 1, unitPrice: revenue, revenue };
  }
  return { quantity: 0, unitPrice: 0, revenue: 0 };
}

async function metricsForSaleItemLink(
  saleId: string,
  itemId: string
): Promise<{ quantity: number; unitPrice: number; revenue: number }> {
  const sale = await getSaleById(saleId);
  if (!sale?.lines) return { quantity: 0, unitPrice: 0, revenue: 0 };
  const line = sale.lines.find(
    (l): l is ItemSaleLine => l.kind === 'item' && 'itemId' in l && l.itemId === itemId
  );
  if (!line) return { quantity: 0, unitPrice: 0, revenue: 0 };
  const q = line.quantity || 0;
  const up = line.unitPrice || 0;
  return { quantity: q, unitPrice: up, revenue: q * up };
}

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

      const productKey = groupBySubType && (item as any).subItemType
        ? `${item.type}:${(item as any).subItemType}`
        : item.type;

      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          itemType: item.type,
          subItemType: (item as any).subItemType,
          totalCost: 0,
          totalRevenue: 0,
          netProfit: 0,
          quantitySold: 0,
          itemIds: []
        });
      }

      const perf = productMap.get(productKey)!;
      const { quantity, unitPrice, revenue: lineRevenue } = await metricsForFinrecItemLink(record, link.target.id);
      const revenue = lineRevenue || (quantity * unitPrice);

      // Cost comes from the financial record (if it's a cost record)
      if (extractMoneyValue(record.cost) > 0) {
        perf.totalCost += extractMoneyValue(record.cost);
      }
      
      // Revenue comes from the link metadata or record
      if (extractMoneyValue(record.revenue) > 0 || revenue > 0) {
        perf.totalRevenue += revenue || extractMoneyValue(record.revenue);
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
    if (!record.salesChannel || extractMoneyValue(record.revenue) <= 0) continue;

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
    perf.totalRevenue += extractMoneyValue(record.revenue);
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
    if (!record.salesChannel) continue;
    const linkedSaleId = await getLinkedSaleId(record);
    if (!linkedSaleId) continue;

    // Get the sale to find items
    const sale = await getSaleById(linkedSaleId);
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

      const { quantity, unitPrice, revenue } = await metricsForSaleItemLink(sale.id, link.target.id);

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
    perf.totalCost += extractMoneyValue(record.cost);
    perf.totalRevenue += extractMoneyValue(record.revenue);
    perf.recordCount += 1;
  }

  // Calculate net profit
  return Array.from(stationMap.values()).map(perf => ({
    ...perf,
    netProfit: perf.totalRevenue - perf.totalCost
  }));
}

// ============================================================================
// COSTS BY PRODUCT TYPE/SUBTYPE (via FINREC_ITEM)
// ============================================================================

/**
 * Calculate costs grouped by Item type and subtype.
 */
export async function getCostsByProductStation(
  records: FinancialRecord[]
): Promise<Record<string, { cost: number; recordCount: number }>> {
  const stationMap: Record<string, { cost: number; recordCount: number }> = {};

  for (const record of records) {
    if (extractMoneyValue(record.cost) <= 0) continue;

    // Get items linked to this financial record
    const links = await getLinksFor({ type: EntityType.FINANCIAL, id: record.id });
    const itemLinks = links.filter(link => link.linkType === LinkType.FINREC_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productType = `${item.type}:${item.subItemType || 'none'}`;
      if (!stationMap[productType]) {
        stationMap[productType] = { cost: 0, recordCount: 0 };
      }

      stationMap[productType].cost += extractMoneyValue(record.cost);
      stationMap[productType].recordCount += 1;
    }
  }

  return stationMap;
}

// ============================================================================
// REVENUES BY PRODUCT TYPE/SUBTYPE (SALE_FINREC → SALE_ITEM)
// ============================================================================

/**
 * Calculate revenues grouped by Item type and subtype.
 */
export async function getRevenuesByProductStation(
  records: FinancialRecord[]
): Promise<Record<string, { revenue: number; transactionCount: number }>> {
  const stationMap: Record<string, { revenue: number; transactionCount: number }> = {};

  for (const record of records) {
    if (extractMoneyValue(record.revenue) <= 0) continue;
    const linkedSaleId = await getLinkedSaleId(record);
    if (!linkedSaleId) continue;

    // Get the sale
    const sale = await getSaleById(linkedSaleId);
    if (!sale) continue;

    // Get items from sale via SALE_ITEM links
    const saleLinks = await getLinksFor({ type: EntityType.SALE, id: sale.id });
    const itemLinks = saleLinks.filter(link => link.linkType === LinkType.SALE_ITEM);

    for (const link of itemLinks) {
      const item = await getItemById(link.target.id);
      if (!item) continue;

      const productType = `${item.type}:${item.subItemType || 'none'}`;
      if (!stationMap[productType]) {
        stationMap[productType] = { revenue: 0, transactionCount: 0 };
      }

      const { quantity, unitPrice, revenue } = await metricsForSaleItemLink(sale.id, link.target.id);

      stationMap[productType].revenue += revenue;
      stationMap[productType].transactionCount += 1;
    }
  }

  return stationMap;
}


