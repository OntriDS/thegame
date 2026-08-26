require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');

async function checkKeys() {
  const redis = Redis.fromEnv();

  let effectCursor = 0;
  let deletedCount = 0;
  do {
    const [nextCursor, keys] = await redis.scan(effectCursor, { match: 'effect:*entity-test*', count: 1000 });
    if (keys.length > 0) {
      await redis.del(...keys);
      deletedCount += keys.length;
    }
    effectCursor = parseInt(nextCursor);
  } while (effectCursor !== 0);

  console.log(`Deleted ${deletedCount} entity-test effect claims`);
}

checkKeys().catch(console.error);
