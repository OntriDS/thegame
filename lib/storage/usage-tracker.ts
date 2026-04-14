import 'server-only';

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const MONTHLY_KEY_PREFIX = 'r2_monthly';
const BYTE_LIMIT = 8 * 1024 * 1024 * 1024;
const UPLOAD_LIMIT = 800_000;

export class R2UsageTracker {
  private static getMonthKey(suffix: string): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `${MONTHLY_KEY_PREFIX}_${suffix}:${yearMonth}`;
  }

  static async checkLimits(): Promise<{ allowed: boolean; reason?: string }> {
    const uploadsKey = this.getMonthKey('uploads');
    const bytesKey = this.getMonthKey('bytes');

    const [uploadsRaw, bytesRaw] = await Promise.all([
      redis.get<number>(uploadsKey),
      redis.get<number>(bytesKey),
    ]);
    const uploads = Number(uploadsRaw ?? 0);
    const bytes = Number(bytesRaw ?? 0);

    if (bytes >= BYTE_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly bytes exceeded safety limit (${(bytes / 1024 ** 3).toFixed(1)}GB >= 8GB)`,
      };
    }
    if (uploads >= UPLOAD_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly uploads exceeded safety limit (${uploads} >= 800k)`,
      };
    }

    return { allowed: true };
  }

  static async recordUsage(bytes: number, isUpload = true): Promise<void> {
    const uploadsKey = this.getMonthKey('uploads');
    const bytesKey = this.getMonthKey('bytes');
    const safeBytes = Math.max(0, Math.floor(bytes));

    if (isUpload) {
      await Promise.all([redis.incr(uploadsKey), redis.incrby(bytesKey, safeBytes)]);
    } else {
      await redis.incrby(bytesKey, safeBytes);
    }
  }

  static async getUsageStats() {
    const uploadsKey = this.getMonthKey('uploads');
    const bytesKey = this.getMonthKey('bytes');
    const [uploadsRaw, bytesRaw] = await Promise.all([
      redis.get<number>(uploadsKey),
      redis.get<number>(bytesKey),
    ]);
    const uploads = Number(uploadsRaw ?? 0);
    const bytes = Number(bytesRaw ?? 0);
    return { uploads, bytes, bytesGB: (bytes / 1024 ** 3).toFixed(2) };
  }
}
