import type { UtcIsoString } from '@/types/entities';

export function utcNow(): Date {
  return new Date();
}

export function toUtcIsoString(date: Date): UtcIsoString {
  return date.toISOString();
}
