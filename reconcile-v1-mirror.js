require('dotenv').config({ path: './.env.local' });
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function run() {
  const keys = [];
  let cursor = '0';
  
  do {
    const [nextCursor, batch] = await redis.scan(cursor, { match: 'thegame:v1:data:*', count: 1000 });
    cursor = nextCursor;
    if (batch.length > 0) {
      keys.push(...batch);
    }
  } while (cursor !== '0');

  console.log(`Found ${keys.length} v1 mirror keys`);
  let reconciled = 0;
  for (const v1Key of keys) {
    const v1Data = await redis.get(v1Key);
    const baseKey = v1Key.replace('thegame:v1:data:', 'thegame:data:');
    
    // Write the V1 data to the base key
    if (v1Data) {
      await redis.set(baseKey, v1Data);
      console.log(`Reconciled ${v1Key} -> ${baseKey}`);
      reconciled++;
    }
    
    // Delete the v1 mirror key
    await redis.del(v1Key);
  }
  console.log(`Reconciled ${reconciled} records. Deleted all ${keys.length} v1 mirror keys.`);
}
run().catch(console.error);
