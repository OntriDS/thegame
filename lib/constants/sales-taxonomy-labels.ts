// lib/constants/sales-taxonomy-labels.ts
import {
  SaleType,
  PaymentMethod,
  BusinessType,
  ContractClauseType,
} from '@/types/enums';

const toTitle = (slug: string): string =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const SALE_TYPE_LABEL: Record<SaleType, string> = {
  [SaleType.DIRECT]: 'Direct',
  [SaleType.BOOTH]: 'Booth',
  [SaleType.NETWORK]: 'Network',
  [SaleType.ONLINE]: 'Online',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.FIAT_USD]: 'USD Cash',
  [PaymentMethod.FIAT_CRC]: 'CRC Cash',
  [PaymentMethod.BTC]: 'Bitcoin',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.SINPE]: 'SINPE',
  [PaymentMethod.PAYPAL]: 'PayPal',
  [PaymentMethod.WIRE_TRANSFER]: 'Wire Transfer',
  [PaymentMethod.GIFT]: 'Gift',
  [PaymentMethod.EXCHANGE]: 'Exchange',
  [PaymentMethod.OTHER]: 'Other',
};

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  [BusinessType.COMPANY]: 'Company',
  [BusinessType.INDIVIDUAL]: 'Individual',
  [BusinessType.DAO]: 'DAO',
  [BusinessType.NON_PROFIT]: 'Non-Profit',
};

export const CONTRACT_CLAUSE_TYPE_LABEL: Record<ContractClauseType, string> = {
  [ContractClauseType.SALES_COMMISSION]: 'Commission',
  [ContractClauseType.SALES_SERVICE]: 'Sales Service',
  [ContractClauseType.EXPENSE_SHARING]: 'Expense Sharing',
  [ContractClauseType.OTHER]: 'Other',
};

export function getSaleTypeLabel(type: SaleType | string | undefined | null): string {
  if (!type) return '';
  if (type in SALE_TYPE_LABEL) return SALE_TYPE_LABEL[type as SaleType];
  return toTitle(String(type));
}

export function getPaymentMethodLabel(
  method: PaymentMethod | string | undefined | null
): string {
  if (!method) return '';
  if (method in PAYMENT_METHOD_LABEL) {
    return PAYMENT_METHOD_LABEL[method as PaymentMethod];
  }
  return toTitle(String(method));
}

export function getBusinessTypeLabel(
  type: BusinessType | string | undefined | null
): string {
  if (!type) return '';
  if (type in BUSINESS_TYPE_LABEL) {
    return BUSINESS_TYPE_LABEL[type as BusinessType];
  }
  return toTitle(String(type));
}

export function getContractClauseTypeLabel(
  type: ContractClauseType | string | undefined | null
): string {
  if (!type) return '';
  if (type in CONTRACT_CLAUSE_TYPE_LABEL) {
    return CONTRACT_CLAUSE_TYPE_LABEL[type as ContractClauseType];
  }
  return toTitle(String(type));
}
