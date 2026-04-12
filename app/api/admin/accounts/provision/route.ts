import { NextRequest, NextResponse } from 'next/server';
import {
  provisionCustomerOnRegistration,
  ProvisionError,
} from '@/lib/character-account-linking';
import { requireProvisioningM2MAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireProvisioningM2MAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const phoneCountryCode = typeof body?.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }
    if (!phoneCountryCode) {
      return NextResponse.json({ error: 'Phone country code is required' }, { status: 400 });
    }

    const result = await provisionCustomerOnRegistration({
      name,
      email,
      phone,
      phoneCountryCode,
      password,
    });

    return NextResponse.json({
      character: result.character,
      account: result.account,
      matchType: result.matchType,
    });
  } catch (error) {
    if (error instanceof ProvisionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision customer character' },
      { status: 500 }
    );
  }
}
