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
    // Get the admin session token from cookies or Authorization header
    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = bearerToken || req.cookies.get('auth_session')?.value || req.cookies.get('admin_session')?.value;

    if (!token) {
      return false;
    }

    // Verify the JWT token using centralized IAM service
    const user = await iamService.verifyJWT(token);

    if (user && user.isActive) {
      // console.log('[API Auth] User authenticated successfully');
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return false;
  }
}


