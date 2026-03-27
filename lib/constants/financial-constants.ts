// Financial system constants

export type CurrencyExchangeRates = {
  colonesToUsd: number;
  bitcoinToUsd: number;
  j$ToUSD: number;
};

export const DEFAULT_CURRENCY_EXCHANGE_RATES: CurrencyExchangeRates = {
  colonesToUsd: 500, // ₡500 = $1 USD
  bitcoinToUsd: 100000, // Default until fetched from API
  j$ToUSD: 10, // 1 J$ = $10 USD
};

export type PointsConversionRates = {
  xpToJ$: number; // Points required for 1 J$
  rpToJ$: number;
  fpToJ$: number;
  hpToJ$: number;
  j$ToUSD: number; // USD value of 1 J$
};

/** Shape stored under `thegame:data:player-conversion-rates` (and mirrored in financial KV when saved there) — set only via the admin conversion modal → KV. */
export type PlayerConversionRatesKv = PointsConversionRates &
  Pick<CurrencyExchangeRates, 'colonesToUsd' | 'bitcoinToUsd'>;

/**
 * Blank form values only (nothing saved in KV yet). Not product defaults — users define rates in the conversion modal.
 */
export function createEmptyPlayerConversionRatesForm(): PlayerConversionRatesKv {
  return {
    xpToJ$: 0,
    rpToJ$: 0,
    fpToJ$: 0,
    hpToJ$: 0,
    j$ToUSD: 0,
    colonesToUsd: 0,
    bitcoinToUsd: 0,
  };
}

export function hasConfiguredPlayerConversionRates(r: PlayerConversionRatesKv | null | undefined): boolean {
  if (!r) return false;
  return (
    r.xpToJ$ > 0 &&
    r.rpToJ$ > 0 &&
    r.fpToJ$ > 0 &&
    r.hpToJ$ > 0 &&
    r.j$ToUSD > 0
  );
}

export const FALLBACK_BITCOIN_PRICE = 100000; // Fallback price if API fails

export const BITCOIN_SATOSHIS_PER_BTC = 100000000; // 1 BTC = 100,000,000 sats

export const REFRESH_DELAY_MS = 100; // Delay for refreshing records after tab switch

export const CURRENCY_SYMBOLS = {
  USD: '$',
  COLONES: '₡',
  BITCOIN: '₿',
  JUNGLE_COINS: 'J$',
  TOTAL: 'T$',
} as const;

export const ASSET_SECTIONS = {
  MONETARY: 'monetary',
  JUNGLE_COINS: 'jungleCoins',
  INVENTORIES: 'inventories',
  OTHER_ASSETS: 'otherAssets',
} as const;

export const ASSET_TYPES = {
  COMPANY: 'company',
  PERSONAL: 'personal',
} as const;

// Validation Constants
export const VALIDATION_CONSTANTS = {
  MIN_QUANTITY: 0,
  MIN_COST: 0,
  MIN_REVENUE: 0,
  DEFAULT_NUMERIC_VALUE: 0,
  DEFAULT_EXCHANGE_RATE: 0,
} as const;