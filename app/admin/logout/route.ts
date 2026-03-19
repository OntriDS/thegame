// app/admin/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Support both auth systems:
  // - email/password login uses `auth_session`
  // - passphrase login uses `admin_session`
  response.cookies.delete('auth_session');
  response.cookies.delete('admin_session');
  return response;
}