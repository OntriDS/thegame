// lib/api-auth.ts
// API Authentication Utility for protecting API routes
// Ensures only authenticated admin users can access API endpoints

import { NextRequest } from 'next/server';
import { verifyJwt } from './auth';
import { AuthService } from './auth-service';

/**
 * Require admin authentication for API routes
 * Returns true if user is authenticated, false otherwise
 */
export async function requireAdminAuth(req: NextRequest): Promise<boolean> {
  try {
    // Get the admin session token from cookies (check both systems)
    const token = req.cookies.get('auth_session')?.value || req.cookies.get('admin_session')?.value;

    // Get the JWT secret from environment variables
    const secret = process.env.ADMIN_SESSION_SECRET || '';

    // If no token or secret, user is not authenticated
    if (!token || !secret) {
      console.log('[API Auth] No token or secret found');
      return false;
    }

    // Verify the JWT token using AuthService for robust check (recognizes legacy admin tokens)
    const user = await AuthService.verifySession(token);

    if (user) {
      // console.log('[API Auth] User authenticated successfully'); // Disabled to reduce log spam
      return true;
    } else {
      console.log('[API Auth] Invalid session or user not found');
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return false;
  }
}


