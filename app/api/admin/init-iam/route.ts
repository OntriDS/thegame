import { NextResponse } from 'next/server';
import { iamService, CharacterRole } from '@/lib/iam-service';

/**
 * TEMPORARY API Route for IAM System Genesis
 * Creates the Founder account, character, and player.
 * 
 * SECURITY: Requires ADMIN_ACCESS_KEY in the request body.
 * DELETE THIS FILE AFTER USE.
 */
export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>IAM Genesis</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 0.5rem; border: 1px solid #334155; width: 100%; max-width: 400px; }
          h1 { margin-top: 0; font-size: 1.5rem; }
          input { width: 100%; padding: 0.75rem; margin: 1rem 0; background: #0f172a; border: 1px solid #334155; border-radius: 0.25rem; color: white; box-sizing: border-box; }
          button { width: 100%; padding: 0.75rem; background: #3b82f6; border: none; border-radius: 0.25rem; color: white; font-weight: bold; cursor: pointer; }
          button:hover { background: #2563eb; }
          #result { margin-top: 1rem; padding: 1rem; border-radius: 0.25rem; display: none; }
          .success { background: #064e3b; color: #6ee7b7; border: 1px solid #065f46; }
          .error { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>IAM Genesis Sequence</h1>
          <p>Enter your ADMIN_ACCESS_KEY to initialize the system.</p>
          <input type="password" id="passphrase" placeholder="Passphrase" />
          <button onclick="runGenesis()">Execute Genesis</button>
          <div id="result"></div>
        </div>
        <script>
          async function runGenesis() {
            const passphrase = document.getElementById('passphrase').value;
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';
            
            try {
              const res = await fetch('/api/admin/init-iam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passphrase })
              });
              const data = await res.json();
              resultDiv.textContent = data.success ? 'Success: ' + data.message : 'Error: ' + data.error;
              resultDiv.className = data.success ? 'success' : 'error';
              resultDiv.style.display = 'block';
            } catch (err) {
              resultDiv.textContent = 'Network Error';
              resultDiv.className = 'error';
              resultDiv.style.display = 'block';
            }
          }
        </script>
      </body>
    </html>
  `;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function POST(req: Request) {
  try {
    const { passphrase } = await req.json();

    if (!passphrase || passphrase !== process.env.ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized genesis' }, { status: 401 });
    }

    console.log('[IAM Gen] Starting genesis sequence...');

    // 1. Create Founder Account
    const founderAccount = await iamService.createAccount({
      name: 'Akiles',
      email: process.env.FOUNDER_EMAIL || 'akiles@digital-universe.com',
      passphraseFlag: true, // Founder uses passphrase
    });
    console.log('[IAM Gen] ✅ Account created:', founderAccount.id);

    // 2. Create Founder Character
    const founderCharacter = await iamService.createCharacter(founderAccount.id, {
      name: 'Akiles Founder',
      roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.TEAM, CharacterRole.PLAYER],
      profile: {
        bio: 'Creator of Digital Universe',
      }
    });
    console.log('[IAM Gen] ✅ Character created:', founderCharacter.id);

    // 3. Create Player Entity
    const founderPlayer = await iamService.createPlayer(founderCharacter.id);
    console.log('[IAM Gen] ✅ Player created:', founderPlayer.id);

    return NextResponse.json({
      success: true,
      message: 'IAM Genesis complete!',
      data: {
        accountId: founderAccount.id,
        characterId: founderCharacter.id,
        playerId: founderPlayer.id
      }
    });

  } catch (error: any) {
    console.error('[IAM Gen] Error during genesis:', error);
    return NextResponse.json({ 
      error: 'Genesis failed', 
      details: error.message 
    }, { status: 500 });
  }
}
