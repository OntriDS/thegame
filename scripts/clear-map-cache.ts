import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const kv = Redis.fromEnv();

async function main() {
  console.log("Deleting map readmodel cache...");
  await kv.del('thegame:readmodel:map');
  console.log("Deleted!");
}

main().catch(console.error);
