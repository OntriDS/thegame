// lib/utils/points-utils.ts
// ═══════════════════════════════════════════════════════════════════════
// POINTS UTILITIES - DRY Helper Functions for Points System
// ═══════════════════════════════════════════════════════════════════════

import { PointType } from '@/types/enums';

/**
 * Get the canonical order of point types as defined in the enum
 * This is the SINGLE SOURCE OF TRUTH for points order across the entire app
 * 
 * @returns Array of point types in the correct order: XP, RP, FP, HP
 */
export function getPointsOrder(): PointType[] {
  return [PointType.XP, PointType.RP, PointType.FP, PointType.HP];
}

/**
 * Get point type metadata for consistent display across components
 * 
 * @returns Array of point type objects with label, key, and description
 */
export function getPointsMetadata() {
  return [
    { key: PointType.XP, label: 'XP', description: 'Experience Points' },
    { key: PointType.RP, label: 'RP', description: 'Research Points' },
    { key: PointType.FP, label: 'FP', description: 'Family Points' },
    { key: PointType.HP, label: 'HP', description: 'Health Points' },
  ];
}

/**
 * Get point type metadata for conversion modals
 * 
 * @returns Array of conversion objects with key, label, and description
 */
export function getPointsConversionMetadata() {
  return [
    { key: 'xpToJ$', label: 'XP to J$', description: 'Experience Points' },
    { key: 'rpToJ$', label: 'RP to J$', description: 'Research Points' },
    { key: 'fpToJ$', label: 'FP to J$', description: 'Family Points' },
    { key: 'hpToJ$', label: 'HP to J$', description: 'Health Points' },
  ];
}

/**
 * Get points from a points object in the canonical order
 * 
 * @param points - Points object with XP, RP, FP, HP values
 * @returns Array of point values in canonical order
 */
export function getPointsInOrder(points: { xp?: number; rp?: number; fp?: number; hp?: number }): number[] {
  const order = getPointsOrder();
  return order.map(pointType => points[pointType.toLowerCase() as keyof typeof points] || 0);
}

/**
 * Check if any points have values > 0
 * 
 * @param points - Points object
 * @returns true if any point has value > 0
 */
export function hasAnyPoints(points: { xp?: number; rp?: number; fp?: number; hp?: number }): boolean {
  return (points.xp || 0) > 0 || (points.rp || 0) > 0 || (points.fp || 0) > 0 || (points.hp || 0) > 0;
}
