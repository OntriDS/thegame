'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, AuthPermissions } from '@/types/auth-types';

// Helper function to read cookies client-side
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<AuthPermissions | null>(null);

  // Legacy passphrase detection removed with unified cookie migration.
  const isPassphraseUser = false;

  // ✅ LOAD AUTH STATE BASED ON SYSTEM
  useEffect(() => {
    loadAuthState();
  }, []);

  async function loadAuthState() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/check');
      if (!response.ok) {
        throw new Error('Authentication check failed');
      }

      const data = await response.json();

      if (!data.authenticated || !data.user) {
        setUser(null);
        setPermissions(null);

        // Store in window for subsequent loads
        if (typeof window !== 'undefined') {
          (window as any).__AUTH_STATE__ = {
            isAuthenticated: false,
            user: null,
            permissions: null
          };
        }

        throw new Error('Not authenticated');
      }

      setUser(data.user);
      setPermissions(data.permissions);

      // Store in window for subsequent loads
      if (typeof window !== 'undefined') {
        (window as any).__AUTH_STATE__ = {
          isAuthenticated: true,
          user: data.user,
          permissions: data.permissions
        };
      }

      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('[useAuth] Error loading auth state:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
      setIsLoading(false);
    }
  }

  async function login(username: string | null, password: string | null, rememberMe: boolean): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      // For passphrase login, we use the passphrase-login endpoint directly
      // This is called from the login page after the passphrase is submitted
      if (username === null && password === null) {
        console.log('[useAuth] Skipping login - called after passphrase login');
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setPermissions(data.permissions);
            router.push('/admin');
          }
        }
        setIsLoading(false);
        return;
      }

      // Username/password login for regular users
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setPermissions(data.permissions);

        // Store in window for subsequent loads
        if (typeof window !== 'undefined') {
          (window as any).__AUTH_STATE__ = {
            isAuthenticated: true,
            user: data.user,
            permissions: data.permissions
          };
        }

        setIsLoading(false);
        router.push('/admin');
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      console.error('[useAuth] Login error:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      await fetch('/api/auth/logout', {
        method: 'POST'
      });

      setUser(null);
      setPermissions(null);

      // Clear window state
      if (typeof window !== 'undefined') {
        (window as any).__AUTH_STATE__ = {
          isAuthenticated: false,
          user: null,
          permissions: null
        };
      }

      router.push('/admin/login');
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
      setIsLoading(false);
    }
  }

  return {
    user,
    isLoading,
    error,
    permissions,
    isAuthenticated: !!user,
    isPassphraseUser,
    login,
    logout,
    refetch: loadAuthState
  };
}
