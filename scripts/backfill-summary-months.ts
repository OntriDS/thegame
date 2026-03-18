// scripts/backfill-summary-months.ts
import { kvScan, kvSAdd } from '../data-store/kv';
import { buildSummaryMonthsKey } from '../data-store/keys';

async function backfill() {
  console.log('--- Backfilling Summary Months Index ---');
  
  const indexKey = buildSummaryMonthsKey();
  let count = 0;
  
  try {
    const keys = await kvScan("thegame:summary:monthly:");
    
    for (const key of keys) {
      // Key format: "thegame:summary:monthly:MM-YY"
      const parts = key.split(':');
      const mmyy = parts[parts.length - 1];
      
      // Basic validation of MM-YY format
      if (mmyy && /^\d{2}-\d{2}$/.test(mmyy)) {
        console.log(`Found month: ${mmyy}`);
        await kvSAdd(indexKey, mmyy);
        count++;
      }
    }
  } catch (err) {
    console.error('Error during scan:', err);
  }
  
  console.log(`--- Finished! Indexed ${count} months. ---`);
}

backfill().catch(console.error);
