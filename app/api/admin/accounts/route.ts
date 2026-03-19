import { NextResponse, NextRequest } from 'next/server';
import { iamService } from '@/lib/iam-service';
import { requireAdminAuth } from '@/lib/api-auth';
import { kvSMembers, kvSRem } from '@/data-store/kv';
import { kvSet } from '@/data-store/kv';
import { buildAccountKey, IAM_ACCOUNTS_INDEX } from '@/lib/keys';
import { Account, CharacterRole } from '@/lib/iam-service';

/**
 * Accounts Management API (Admin Only)
 * Create and list accounts using IAM Service
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all accounts from IAM service
    const accountIds = await kvSMembers(IAM_ACCOUNTS_INDEX);
    const accounts = await Promise.all(
      accountIds.map(async (id) => {
        const account = await iamService.getAccountById(id);
        if (!account) return null;
        
        // Fetch character data to get roles
        const character = await iamService.getCharacterByAccountId(id);
        return {
          ...account,
          character
        };
      })
    );

    // Get all M2M apps
    const m2mApps = await iamService.listM2MApps();
    
    // Convert M2M apps to account-like format for UI display
    const m2mAccounts = m2mApps.map(app => ({
      id: app.appId,
      name: app.appId,
      email: `${app.appId}@m2m.system`,
      isActive: true,
      createdAt: app.createdAt,
      updatedAt: app.createdAt,
      type: 'm2m', // Extra field for UI
      character: {
        roles: [CharacterRole.AI_AGENT] // Default system roles
      }
    }));

    return NextResponse.json({
      accounts: [...accounts.filter(Boolean), ...m2mAccounts]
    });
  } catch (error: any) {
    console.error('[Accounts API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, isActive, isVerified } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Get existing account
    const existingAccount = await iamService.getAccountById(params.id);
    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Update account fields
    const updatedAccount: Account = {
      ...existingAccount,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      isActive: isActive ?? existingAccount.isActive,
      isVerified: isVerified ?? existingAccount.isVerified,
      updatedAt: new Date().toISOString()
    };

    // Save updated account
    await kvSet(buildAccountKey(params.id), updatedAccount);

    return NextResponse.json({ success: true, account: updatedAccount });
  } catch (error: any) {
    console.error('[Accounts API] Error updating account:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, phone, characterId } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Create account using IAM service
    const account = await iamService.createAccount({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      password: password.trim()
    });

    // If characterId provided, create character and link it
    if (characterId) {
      // Create character linked to this account using iamService.createCharacter
      const character = await iamService.createCharacter(account.id, {
        name: 'Team Member',
        roles: [CharacterRole.TEAM],
        profile: { createdBy: 'Accounts' }
      });

      // Return character with accountId set
      return NextResponse.json({
        success: true,
        account: {
          ...account,
          characterId: character.id
        },
        character
      });
    }

    return NextResponse.json({
      success: true,
      account
    });
  } catch (error: any) {
    console.error('[Accounts API] Error creating account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete account entity
    await kvSet(buildAccountKey(params.id), null);

    // Remove account from index
    await kvSRem(IAM_ACCOUNTS_INDEX, params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Accounts API] Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}