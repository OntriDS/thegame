import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

async function fetchRedis(command: string, ...args: (string | number)[]) {
  const req = await fetch(`${url}/${command}/${args.join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!req.ok) throw new Error(`Redis error: ${req.statusText}`);
  const data = await req.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function kvScan(match: string, count: number): Promise<string[]> {
  let cursor = 0;
  const keys: string[] = [];
  do {
    const res = await fetchRedis('scan', cursor, 'match', match, 'count', count);
    cursor = Number(res[0]);
    keys.push(...res[1]);
  } while (cursor !== 0);
  return keys;
}

async function kvGet(key: string) {
  const res = await fetchRedis('get', key);
  if (!res) return null;
  try { return typeof res === 'string' ? JSON.parse(res) : res; } catch { return res; }
}

async function kvSMembers(key: string) {
  return (await fetchRedis('smembers', key)) || [];
}

async function main() {
  console.log("Fetching all tasks containing 'Pago de Tigo'...");
  const keys = await kvScan('thegame:task:task-', 1000);
  
  let foundTaskId = null;
  for (const k of keys) {
    const t = await kvGet(k);
    if (t && t.name && t.name.includes('Pago de Tigo') && !t.isTemplate) {
      console.log(`Found instance: ${t.id} - ${t.name} (Status: ${t.status})`);
      foundTaskId = t.id;
    }
  }

  if (foundTaskId) {
    console.log(`\nChecking links for task: ${foundTaskId}`);
    const taskLinksIndex = `thegame:index:links:by-entity:task:${foundTaskId}`;
    let linkIds = await kvSMembers(taskLinksIndex);
    if (!Array.isArray(linkIds)) linkIds = [];
    console.log(`Index has ${linkIds.length} link IDs:`, linkIds);
    
    for (const lid of linkIds) {
      const linkData = await kvGet(`thegame:links:link:${lid}`);
      console.log(`Link Data for ${lid}:`, linkData ? Object.keys(linkData) : 'MISSING (ORPHANED ID!)');
      if (linkData) {
         console.log(`Type: ${linkData.linkType}, Target: ${linkData.target.type}:${linkData.target.id}`);
      }
    }

    console.log(`\nChecking Financials by sourceTaskId...`);
    const finKeysIndex = `thegame:index:financial:sourceTaskId:${foundTaskId}`;
    let finIds = await kvSMembers(finKeysIndex);
    if (!Array.isArray(finIds)) finIds = [];
    console.log(`Index has ${finIds.length} financial IDs:`, finIds);
    
    if (finIds.length > 0) {
      for (const fid of finIds) {
        const finLinkIndex = `thegame:index:links:by-entity:financial:${fid}`;
        let fLinkIds = await kvSMembers(finLinkIndex);
        if (!Array.isArray(fLinkIds)) fLinkIds = [];
        console.log(`Financial ${fid} Links index has ${fLinkIds.length} link IDs:`, fLinkIds);
        for (const lid of fLinkIds) {
          const lData = await kvGet(`thegame:links:link:${lid}`);
          console.log(`  Fin Link Data for ${lid}:`, lData ? lData.linkType : 'MISSING');
        }
      }
    }

  } else {
    console.log('No task found.');
  }

  process.exit(0);
}

main().catch(console.error);
