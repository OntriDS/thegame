import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We manually initialize Redis to bypass the server-only check in lib/utils/kv.ts
const kv = Redis.fromEnv();

async function main() {
  console.log("Fetching map data...");
  
  const regionsIds = await kv.smembers('thegame:index:region');
  const regions = regionsIds.length ? await kv.mget(regionsIds.map(id => `thegame:data:region:${id}`)) : [];
  
  console.log(`\n--- Regions (${regions.length}) ---`);
  regions.forEach((r: any) => {
    if (r) console.log(`- ${r.id} | ${r.name} | active: ${r.isActive} | unlocked: ${r.isUnlocked}`);
  });

  const settlementIds = await kv.smembers('thegame:index:settlement');
  const settlements = settlementIds.length ? await kv.mget(settlementIds.map(id => `thegame:data:settlement:${id}`)) : [];
  
  console.log(`\n--- Settlements (${settlements.length}) ---`);
  settlements.forEach((s: any) => {
    if (s) console.log(`- ${s.id} | ${s.name} | regionId: ${s.regionId} | active: ${s.isActive} | unlocked: ${s.isUnlocked} | coords: ${JSON.stringify(s.coordinates)}`);
  });

  const siteIds = await kv.smembers('thegame:index:site');
  const sites = siteIds.length ? await kv.mget(siteIds.map(id => `thegame:data:site:${id}`)) : [];
  
  console.log(`\n--- Sites (${sites.length}) ---`);
  sites.forEach((s: any) => {
    if (s && s.status === 'active' && s.type === 'physical') {
      console.log(`- ${s.id} | ${s.name} | settlementId: ${s.settlementId} | coords: ${JSON.stringify(s.coordinates)}`);
    }
  });

  // check if cache is present
  const cache = await kv.get('thegame:readmodel:map');
  console.log(`\n--- Cached Map Read Model ---`);
  if (cache) {
    const c = cache as any;
    console.log(`Regions: ${c.regions?.length}, Settlements: ${c.settlements?.length}, Markers: ${c.markers?.length}`);
  } else {
    console.log(`No cache found.`);
  }
}

main().catch(console.error);
