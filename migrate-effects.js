require('dotenv').config({ path: './.env.local' });
const { Redis } = require('@upstash/redis');

// Initialize Redis using the variables from .env.local
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function run() {
  const EffectClaimStatus = { COMPLETED: 'COMPLETED' };
  const keys = [];
  let cursor = '0';
  
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: 'thegame:effects:*', count: 1000 });
    cursor = nextCursor;
    if (batch.length > 0) {
      keys.push(...batch);
    }
  } while (cursor !== '0');

  console.log(`Found ${keys.length} legacy effect keys`);
  let migrated = 0;
  for (const key of keys) {
    const isCompleted = await redis.get(key);
    if (isCompleted === true || isCompleted === 'true') {
      const effectKey = key.replace('thegame:effects:', '');
      const existingClaim = await redis.get(`effect:${effectKey}`);
      if (!existingClaim) {
        await redis.set(`effect:${effectKey}`, {
          idempotencyKey: effectKey,
          status: EffectClaimStatus.COMPLETED,
          commandId: 'migration',
          ownerId: 'system',
          attempts: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leaseToken: 'none',
          leaseExpiresAt: new Date().toISOString()
        });
        migrated++;
      }
    }
    await redis.del(key);
  }
  console.log(`Migrated ${migrated} legacy effects to claims. Deleted all ${keys.length} legacy boolean flags.`);
}
run().catch(console.error);
