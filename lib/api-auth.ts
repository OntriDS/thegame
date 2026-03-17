// lib/api-auth.ts
// API Authentication Utility for protecting API routes
// Ensures only authenticated admin users can access API endpoints

import { NextRequest } from 'next/server';
import { iamService } from './iam-service';

/**
 * Require admin authentication for API routes
 * Returns true if user is authenticated, false otherwise
 */
export async function requireAdminAuth(req: NextRequest): Promise<boolean> {
  try {
    // Get the admin session token from cookies (check both systems)
    const token = req.cookies.get('auth_session')?.value || req.cookies.get('admin_session')?.value;

    if (!token) {
      console.log('[API Auth] No token found in cookies');
      return false;
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (user && user.isActive) {
      // console.log('[API Auth] User authenticated successfully');
      return true;
    } else {
      console.log('[API Auth] Invalid session or inactive user');
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return false;
  }
}


