import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config({ path: '.env.local' });
async function run() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  const [_, keys] = await redis.scan('0', { match: '*0036a600-215a-4a3e-b3d7-c644b9dbebfe*', count: 1000 });
  console.log('Keys matching user example:', keys);
}
run();
