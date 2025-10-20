// lib/utils/business-utils.ts
// Business calculation formulas and utilities

import { Item } from '@/types/entities';
import { StockPoint } from '@/types/entities';

/**
 * Calculate the total quantity across all stock sites
 */
export function calculateTotalQuantity(stock: StockPoint[]): number {
  return stock.reduce((total, stockPoint) => total + stockPoint.quantity, 0);
}

/**
 * Calculate the total value of an item (price × total quantity)
 */
export function calculateItemValue(item: Item): number {
  const totalQuantity = calculateTotalQuantity(item.stock);
  return item.price * totalQuantity;
}

/**
 * Calculate the total cost of an item (unitCost × total quantity)
 */
export function calculateItemTotalCost(item: Item): number {
  const totalQuantity = calculateTotalQuantity(item.stock);
  return item.unitCost * totalQuantity;
}

/**
 * Calculate the profit margin for an item
 */
export function calculateItemProfit(item: Item): number {
  const totalValue = calculateItemValue(item);
  const totalCost = calculateItemTotalCost(item);
  return totalValue - totalCost;
}

/**
 * Calculate the profit margin percentage for an item
 */
export function calculateItemProfitPercentage(item: Item): number {
  const totalValue = calculateItemValue(item);
  if (totalValue === 0) return 0;
  
  const profit = calculateItemProfit(item);
  return (profit / totalValue) * 100;
}

/**
 * Calculate the net profit/loss for a task based on revenue and cost
 */
export function calculateTaskProfit(revenue: number, cost: number): number {
  return revenue - cost;
}

/**
 * Calculate the profit margin percentage for a task
 */
export function calculateTaskProfitPercentage(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  const profit = calculateTaskProfit(revenue, cost);
  return (profit / revenue) * 100;
}