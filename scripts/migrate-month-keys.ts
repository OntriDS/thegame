/**
 * Migration Script: Redis Month Key Standardization
 * 
 * This script renames keys from MM-YYYY to MM-YY
 * with the correct 'thegame:' namespace.
 */
import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const redis = Redis.fromEnv();
const NAMESPACE = 'thegame:';

async function migrateKeys() {
  console.log('--- Starting Month Key Migration (MM-YYYY -> MM-YY) ---');
  
  // Refined patterns based on keys.ts
  const patterns = [
    `${NAMESPACE}index:*:by-month:*-20*`,
    `${NAMESPACE}logs:*:*-20*`,
    `${NAMESPACE}archive:*:*-20*:*`,
    `${NAMESPACE}index:*:collected:*-20*`
  ];

  for (const pattern of patterns) {
    console.log(`Scanning for pattern: ${pattern}`);
    const keys = await redis.keys(pattern);
    console.log(`Found ${keys.length} keys.`);

    for (const oldKey of keys) {
      // Find the MM-YYYY part (it might not be at the very end for archive keys)
      const match = oldKey.match(/(\d{2})-(20\d{2})/);
      
      if (match) {
        const [fullMatch, mm, yyyy] = match;
        const yy = yyyy.slice(-2);
        const newMonthKey = `${mm}-${yy}`;
        
        const newKey = oldKey.replace(fullMatch, newMonthKey);
        
        // Skip if new key already exists (to avoid overwriting if MM-YY was already there)
        const exists = await redis.exists(newKey);
        if (exists && newKey !== oldKey) {
          console.log(`SKIPPING (target exists): ${oldKey} -> ${newKey}`);
          // Optional: merge sets if they are index keys, but for now we'll just log
          continue;
        }

        console.log(`Renaming: ${oldKey} -> ${newKey}`);
        await redis.rename(oldKey, newKey);
      }
    }
  }

  console.log('--- Migration Complete ---');
}

migrateKeys().catch(console.error);
