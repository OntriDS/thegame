// lib/api-auth.ts
// API Authentication Utility for protecting API routes
// Ensures only authenticated admin users can access API endpoints

import { NextRequest } from 'next/server';
import { verifyJwt } from './auth';

/**
 * Require admin authentication for API routes
 * Returns true if user is authenticated, false otherwise
 */
export async function requireAdminAuth(req: NextRequest): Promise<boolean> {
  try {
    // Get the admin session token from cookies
    const token = req.cookies.get('admin_session')?.value;
    
    // Get the JWT secret from environment variables
    const secret = process.env.ADMIN_SESSION_SECRET || '';
    
    // If no token or secret, user is not authenticated
    if (!token || !secret) {
      console.log('[API Auth] No token or secret found');
      return false;
    }
    
    // Verify the JWT token
    const verified = await verifyJwt(token, secret);
    
    if (verified.valid) {
      // console.log('[API Auth] User authenticated successfully'); // Disabled to reduce log spam
      return true;
    } else {
      console.log('[API Auth] Invalid token:', verified.reason);
      return false;
    }
  } catch (error) {
    console.error('[API Auth] Error verifying authentication:', error);
    return false;
  }
}


