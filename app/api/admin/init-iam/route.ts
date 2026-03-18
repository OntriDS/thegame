import { NextResponse } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';
import { 
  kv, 
  kvGet, 
  kvSet, 
  kvSMembers, 
  kvSAdd, 
  kvSRem, 
  kvDelMany, 
  kvMGet, 
  kvMSet 
} from '@/data-store/kv';
import { 
  buildDataKey, 
  buildIndexKey, 
  buildAccountKey, 
  buildLinkKey as buildLegacyLinkKey 
} from '@/data-store/keys';
import { 
  IAM_ACCOUNTS_INDEX, 
  IAM_CHARACTERS_INDEX, 
  IAM_PLAYERS_INDEX 
} from '@/lib/keys';
import { EntityType, PLAYER_ONE_ID } from '@/types/enums';

/**
 * IAM System Genesis & Migration Route
 */

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>TheGame: IAM Step-Migration</title>
        <style>
          body { font-family: 'Courier New', monospace; background: #050505; color: #00ff00; margin: 2rem; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #00ff00; padding: 2rem; box-shadow: 0 0 15px #00ff00; }
          h1 { text-align: center; border-bottom: 2px solid #00ff00; padding-bottom: 1rem; }
          .step-card { border: 1px solid #333; padding: 1rem; margin: 1rem 0; background: #111; position: relative; }
          .step-card.active { border-color: #00ff00; box-shadow: 0 0 5px #00ff00; }
          .step-card.completed { border-color: #004400; opacity: 0.7; }
          .step-card button { position: absolute; right: 1rem; top: 1rem; background: #00ff00; color: #000; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: bold; }
          .step-card button:disabled { background: #333; color: #666; cursor: not-allowed; }
          #logs { background: #000; border: 1px solid #00ff00; padding: 1rem; height: 300px; overflow-y: auto; font-size: 0.9rem; color: #00cc00; }
          .status { color: #facc15; font-weight: bold; }
          .error-msg { color: #ef4444; border: 1px solid #ef4444; padding: 1rem; margin: 1rem 0; display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>IAM GENESIS PROTOCOL</h1>
          
          <div id="error-box" class="error-msg"></div>

          <div class="step-card" id="step1">
            <h3>STEP 1: IDENTITY BOOTSTRAP</h3>
            <p>Creates new UUID-based Account, Character, and Player.</p>
            <button onclick="runStep('bootstrap', 1)">EXECUTE</button>
          </div>

          <div class="step-card" id="step2">
            <h3>STEP 2: DATA MERGE</h3>
            <p>Port legacy 'player-one' points and profile to new IDs.</p>
            <button onclick="runStep('merge', 2)">EXECUTE</button>
          </div>

          <div class="step-card" id="step3">
            <h3>STEP 3: GLOBAL REFERENCE SCAN</h3>
            <p>Update Tasks, Items, Sales, and Finances to point to UUIDs.</p>
            <button onclick="runStep('scan', 3)" disabled>EXECUTE</button>
          </div>

          <div class="step-card" id="step4">
            <h3>STEP 4: LINK SYSTEM RE-KEYING</h3>
            <p>Migrate all relationships to new entity IDs.</p>
            <button onclick="runStep('links', 4)" disabled>EXECUTE</button>
          </div>

          <div class="step-card" id="step5">
            <h3>STEP 5: LEGACY PURGE</h3>
            <p>Delete 'player-one' keys and indices.</p>
            <button onclick="runStep('cleanup', 5)" disabled>EXECUTE</button>
          </div>

          <div id="logs">
            [SYS] Waiting for instructions...<br>
          </div>
        </div>

        <script>
          const passphrase = prompt('Enter ADMIN_ACCESS_KEY to authorize:');
          const logs = document.getElementById('logs');
          const errBox = document.getElementById('error-box');

          function log(msg) {
            logs.innerHTML += \`[\${new Date().toLocaleTimeString()}] \${msg}<br>\`;
            logs.scrollTop = logs.scrollHeight;
          }

          async function runStep(stepName, stepNum) {
            const btn = document.querySelector(\`#step\${stepNum} button\`);
            btn.disabled = true;
            log(\`Initiating step \${stepNum}: \${stepName}...\`);
            
            try {
              const res = await fetch('/api/admin/init-iam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passphrase, step: stepName })
              });
              const data = await res.json();
              
              if (data.success) {
                log(\`<span class="status">DONE: \${data.message}</span>\`);
                document.getElementById(\`step\${stepNum}\`).classList.add('completed');
                if (stepNum < 5) {
                  const nextBtn = document.querySelector(\`#step\${stepNum + 1} button\`);
                  if (nextBtn) nextBtn.disabled = false;
                }
              } else {
                log(\`<span style="color:red">FAILED: \${data.error} (\${data.details || 'No details'})</span>\`);
                errBox.style.display = 'block';
                errBox.textContent = \`Step \${stepNum} failed: \${data.error}. Check server console.\`;
              }
            } catch (err) {
              log(\`<span style="color:red">NETWORK ERROR: \${err.message}</span>\`);
            }
          }
        </script>
      </body>
    </html>
  `;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function POST(req: Request) {
  try {
    const { passphrase, step } = await req.json();

    if (!passphrase || passphrase !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized genesis' }, { status: 401 });
    }

    const FOUNDER_EMAIL = (process.env.FOUNDER_EMAIL || 'aquiles.segovia.villamizar@gmail.com').toLowerCase();
    const oldId = PLAYER_ONE_ID;

    // Determine the active new IDs from the IAM index (since bootstrap already ran)
    let nAccId = '', nPlyId = '', nCharId = '';
    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);

    for (const id of accountIds) {
      if (id === oldId) continue;
      const acc = await iamService.getAccountById(id);
      if (acc && acc.email.toLowerCase() === FOUNDER_EMAIL) {
        nAccId = acc.id;
        // Find links or character/player directly from IAM service
        const character = await iamService.getCharacterByAccountId(nAccId);
        if (character) {
          nCharId = character.id;
          const player = await iamService.getPlayerByCharacterId(nCharId);
          if (player) nPlyId = player.id;
        }
        break;
      }
    }

    // STEP 1: BOOTSTRAP (If not already created)
    if (step === 'bootstrap') {
      if (nAccId) {
        return NextResponse.json({ success: true, message: 'Identity already bootstrapped', ids: { nAccId, nCharId, nPlyId } });
      }
      const newAccount = await iamService.createAccount({
        name: 'Akiles',
        email: FOUNDER_EMAIL,
        passphraseFlag: true
      });
      const newCharacter = await iamService.createCharacter(newAccount.id, {
        name: 'Akiles',
        roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.TEAM, CharacterRole.PLAYER],
        profile: { bio: 'Founder of Digital Universe' }
      });
      const newPlayer = await iamService.createPlayer(newCharacter.id);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Identities created',
        ids: { accountId: newAccount.id, characterId: newCharacter.id, playerId: newPlayer.id }
      });
    }

    if (!nAccId) return NextResponse.json({ error: 'Bootstrap data not found' }, { status: 404 });

    // STEP 2: MERGE
    if (step === 'merge') {
      const legacyPly = await kvGet<any>(buildDataKey(EntityType.PLAYER, oldId));
      const legacyChar = await kvGet<any>(buildDataKey(EntityType.CHARACTER, oldId));

      if (legacyPly) {
        const currentPly = await kvGet<any>(buildDataKey(EntityType.PLAYER, nPlyId));
        await kvSet(buildDataKey(EntityType.PLAYER, nPlyId), { ...currentPly, ...legacyPly, id: nPlyId, accountId: nAccId, characterIds: [nCharId] });
      }
      if (legacyChar) {
        const currentChar = await kvGet<any>(buildDataKey(EntityType.CHARACTER, nCharId));
        await kvSet(buildDataKey(EntityType.CHARACTER, nCharId), { ...currentChar, ...legacyChar, id: nCharId, accountId: nAccId, playerId: nPlyId });
      }
      return NextResponse.json({ success: true, message: 'Legacy data merged' });
    }

    // STEP 3: SCAN (Tasks, Items, Sales, Finances)
    if (step === 'scan') {
      const entitiesToScan = [EntityType.TASK, EntityType.ITEM, EntityType.SALE, EntityType.FINANCIAL];
      let totalUpdated = 0;

      for (const type of entitiesToScan) {
        const ids = await kvSMembers(buildIndexKey(type));
        const keys = ids.map(id => buildDataKey(type, id));
        const chunks = chunkArray(keys, 100);

        for (const chunk of chunks) {
          const entities = await kvMGet<any>(chunk);
          const updates: Record<string, any> = {};
          for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            if (!e) continue;
            let changed = false;
            // High-precision replacement
            if (e.accountId === oldId) { e.accountId = nAccId; changed = true; }
            if (e.playerId === oldId) { e.playerId = nPlyId; changed = true; }
            if (e.characterId === oldId) { e.characterId = nCharId; changed = true; }
            if (e.ownerId === oldId) { e.ownerId = nCharId; changed = true; }
            if (e.ownerCharacterId === oldId) { e.ownerCharacterId = nCharId; changed = true; }
            if (e.customerId === oldId) { e.customerId = nCharId; changed = true; }
            if (e.playerCharacterId === oldId) { e.playerCharacterId = nCharId; changed = true; }
            
            if (changed) { updates[chunk[i]] = e; totalUpdated++; }
          }
          if (Object.keys(updates).length > 0) await kvMSet(updates);
        }
      }
      return NextResponse.json({ success: true, message: `Scanned and updated ${totalUpdated} entities` });
    }

    // STEP 4: LINKS
    if (step === 'links') {
      const linkIds = await kvSMembers(buildIndexKey(EntityType.LINK));
      let linksUpdated = 0;
      for (const lid of linkIds) {
        const lkey = buildLegacyLinkKey(lid);
        const l = await kvGet<any>(lkey);
        if (!l) continue;
        let changed = false;
        if (l.source?.id === oldId) {
          if (l.source.type === EntityType.ACCOUNT) l.source.id = nAccId;
          else if (l.source.type === EntityType.PLAYER) l.source.id = nPlyId;
          else if (l.source.type === EntityType.CHARACTER) l.source.id = nCharId;
          changed = true;
        }
        if (l.target?.id === oldId) {
          if (l.target.type === EntityType.ACCOUNT) l.target.id = nAccId;
          else if (l.target.type === EntityType.PLAYER) l.target.id = nPlyId;
          else if (l.target.type === EntityType.CHARACTER) l.target.id = nCharId;
          changed = true;
        }
        if (changed) { await kvSet(lkey, l); linksUpdated++; }
      }
      return NextResponse.json({ success: true, message: `Updated ${linksUpdated} links` });
    }

    // STEP 5: CLEANUP
    if (step === 'cleanup') {
      await kvSRem(buildIndexKey(EntityType.ACCOUNT), oldId);
      await kvSRem(buildIndexKey(EntityType.PLAYER), oldId);
      await kvSRem(buildIndexKey(EntityType.CHARACTER), oldId);
      await kvDelMany([buildDataKey(EntityType.ACCOUNT, oldId), buildDataKey(EntityType.PLAYER, oldId), buildDataKey(EntityType.CHARACTER, oldId)]);
      return NextResponse.json({ success: true, message: 'Cleanup complete' });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error: any) {
    console.error('[MIGRATE] Critical Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}
