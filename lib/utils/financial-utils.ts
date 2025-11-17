const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string) {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      })
    );
  }
  return currencyFormatters.get(currency)!;
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = getFormatter(currency);
  return formatter.format(amount ?? 0);
}
// lib/utils/financial-utils.ts
// Consolidated financial utilities following DRY principles

import { FinancialRecord } from '@/types/entities';
import type { Station } from '@/types/type-aliases';
import { BITCOIN_SATOSHIS_PER_BTC } from '@/lib/constants/financial-constants';
import { FinancialStatus } from '@/types/enums';

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface ExchangeRates {
  colonesToUsd: number;
  bitcoinToUsd: number;
  j$ToUSD: number;
}

export interface StationBreakdown {
  revenue: number;
  cost: number;
  net: number;
  jungleCoins: number;
}

export interface AreaBreakdown {
  [station: string]: StationBreakdown;
}

export interface MonetaryAssets {
  cash?: number;
  bank?: number;
  bitcoin?: number;
  crypto?: number;
  toCharge?: number;
  toPay?: number;
  cashColones?: number;
  bankColones?: number;
  toChargeColones?: number;
  toPayColones?: number;
  bitcoinSats?: number;
}

export interface InventoryAssets {
  materials: { value: number; cost: number };
  equipment: { value: number; cost: number };
  artworks: { value: number; cost: number };
  prints: { value: number; cost: number };
  stickers: { value: number; cost: number };
  merch: { value: number; cost: number };
}

export interface OtherAssets {
  vehicle: number;
  properties: number;
  nfts: number;
  other: number;
}

// ============================================================================
// RECORD AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Aggregate financial records by station
 * @param records - Financial records to aggregate
 * @param stations - List of stations to include in breakdown
 * @returns Object mapping station names to their financial breakdown
 */
export function aggregateRecordsByStation(
  records: FinancialRecord[],
  stations: readonly Station[]
): AreaBreakdown {
  // Initialize breakdown with zeros for all stations
  const breakdown: AreaBreakdown = {};
  stations.forEach(station => {
    breakdown[station] = {
      revenue: 0,
      cost: 0,
      net: 0,
      jungleCoins: 0
    };
  });

  // Aggregate records by station, excluding PENDING records
  records.forEach(record => {
    // CRITICAL: Exclude PENDING records from cashflow calculations
    if (record.status === FinancialStatus.PENDING) {
      return; // Skip PENDING records
    }

    if (breakdown[record.station]) {
      breakdown[record.station].revenue += record.revenue;
      breakdown[record.station].cost += record.cost;
      breakdown[record.station].net += (record.revenue - record.cost);
      breakdown[record.station].jungleCoins += record.jungleCoins;
    }
  });

  return breakdown;
}

/**
 * Calculate totals across all stations
 */
export function calculateTotals(breakdown: AreaBreakdown) {
  return Object.values(breakdown).reduce(
    (totals, station) => ({
      totalRevenue: totals.totalRevenue + station.revenue,
      totalCost: totals.totalCost + station.cost,
      net: totals.net + station.net,
      totalJungleCoins: totals.totalJungleCoins + station.jungleCoins
    }),
    { totalRevenue: 0, totalCost: 0, net: 0, totalJungleCoins: 0 }
  );
}

// ============================================================================
// ASSET CALCULATION FUNCTIONS
// ============================================================================

// Helper function for proper decimal formatting
export const formatDecimal = (value: number): string => {
  // Guard against NaN and Infinity
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return value.toString(); // No decimals for whole numbers
  } else {
    return Number(value.toFixed(1)).toString(); // Round to 1 decimal, remove trailing zeros
  }
};

// Calculate total USD value for cash (USD + Colones converted)
export const getCashTotal = (cash: number = 0, cashColones: number = 0, exchangeRates: ExchangeRates): number => {
  return cash + (cashColones / exchangeRates.colonesToUsd);
};

// Calculate total USD value for bank (USD + Colones converted)
export const getBankTotal = (bank: number = 0, bankColones: number = 0, exchangeRates: ExchangeRates): number => {
  return bank + (bankColones / exchangeRates.colonesToUsd);
};

// Calculate total USD value for bitcoin (USD + Sats converted)
export const getBitcoinTotal = (bitcoin: number = 0, bitcoinSats: number = 0, exchangeRates: ExchangeRates): number => {
  return bitcoin + ((bitcoinSats / BITCOIN_SATOSHIS_PER_BTC) * exchangeRates.bitcoinToUsd);
};

// Calculate total USD value for toCharge (USD + Colones converted)
export const getToChargeTotal = (toCharge: number = 0, toChargeColones: number = 0, exchangeRates: ExchangeRates): number => {
  return toCharge + (toChargeColones / exchangeRates.colonesToUsd);
};

// Calculate total USD value for toPay (USD + Colones converted)
export const getToPayTotal = (toPay: number = 0, toPayColones: number = 0, exchangeRates: ExchangeRates): number => {
  return toPay + (toPayColones / exchangeRates.colonesToUsd);
};

// Calculate core monetary total (cash + bank + bitcoin + crypto)
export const getCoreMonetaryTotal = (assets: MonetaryAssets, exchangeRates: ExchangeRates, includeCrypto: boolean = false): number => {
  const cashTotal = getCashTotal(assets.cash, assets.cashColones, exchangeRates);
  const bankTotal = getBankTotal(assets.bank, assets.bankColones, exchangeRates);
  const bitcoinTotal = getBitcoinTotal(assets.bitcoin, assets.bitcoinSats, exchangeRates);
  const cryptoTotal = includeCrypto ? (assets.crypto || 0) : 0;
  
  return cashTotal + bankTotal + bitcoinTotal + cryptoTotal;
};

// Calculate full monetary total (core + toCharge + toPay)
export const getMonetaryTotal = (assets: MonetaryAssets, exchangeRates: ExchangeRates, includeCrypto: boolean = false): number => {
  const coreTotal = getCoreMonetaryTotal(assets, exchangeRates, includeCrypto);
  const toChargeTotal = getToChargeTotal(assets.toCharge, assets.toChargeColones, exchangeRates);
  const toPayTotal = getToPayTotal(assets.toPay, assets.toPayColones, exchangeRates);
  
  return coreTotal + toChargeTotal + toPayTotal;
};

// Calculate jungle coins total in USD
export const getJungleCoinsTotal = (jungleCoins: number, exchangeRates: ExchangeRates): number => {
  return jungleCoins * exchangeRates.j$ToUSD;
};

// Calculate inventory total value
export const getInventoryTotal = (inventory: InventoryAssets): number => {
  return Object.values(inventory).reduce((total, item) => total + item.value, 0);
};

// Calculate inventory total cost
export const getInventoryCost = (inventory: InventoryAssets): number => {
  return Object.values(inventory).reduce((total, item) => total + item.cost, 0);
};

// Calculate other assets total
export const getOtherAssetsTotal = (otherAssets: OtherAssets): number => {
  return otherAssets.properties + otherAssets.nfts + otherAssets.other;
};

// Calculate total net worth for a complete asset set
export const getTotalNetWorth = (
  monetaryAssets: MonetaryAssets,
  jungleCoins: number,
  inventory: InventoryAssets,
  otherAssets: OtherAssets,
  exchangeRates: ExchangeRates,
  includeCrypto: boolean = false
): number => {
  const monetaryTotal = getMonetaryTotal(monetaryAssets, exchangeRates, includeCrypto);
  const jungleCoinsTotal = getJungleCoinsTotal(jungleCoins, exchangeRates);
  const inventoryTotal = getInventoryTotal(inventory);
  const otherTotal = getOtherAssetsTotal(otherAssets);
  
  return monetaryTotal + jungleCoinsTotal + inventoryTotal + otherTotal;
};

