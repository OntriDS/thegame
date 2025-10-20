// Financial system constants

export type CurrencyExchangeRates = {
  colonesToUsd: number;
  bitcoinToUsd: number;
  jungleCoinsToUsd: number;
};

export const DEFAULT_CURRENCY_EXCHANGE_RATES: CurrencyExchangeRates = {
  colonesToUsd: 500, // ₡500 = $1 USD
  bitcoinToUsd: 0, // Will be fetched from API
  jungleCoinsToUsd: 10, // 1 J$ = $10 USD
};

export type PointsConversionRates = {
  xpToJ$: number; // Points required for 1 J$
  rpToJ$: number;
  fpToJ$: number;
  hpToJ$: number;
  j$ToUSD: number; // USD value of 1 J$
};

export const DEFAULT_POINTS_CONVERSION_RATES: PointsConversionRates = {
  xpToJ$: 6, // 6 XP = 1 J$
  rpToJ$: 12, // 12 RP = 1 J$
  fpToJ$: 8, // 8 FP = 1 J$
  hpToJ$: 10, // 10 HP = 1 J$
  j$ToUSD: 10, // 1 J$ = $10 USD
};

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
