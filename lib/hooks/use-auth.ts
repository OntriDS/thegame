// lib/hooks/use-auth.ts
// Hybrid Auth Hook - Detects and Uses Appropriate Auth System
// Supports both Passphrase (your system) and Username (multi-user) login

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, AuthSession, AuthPermissions, LoginRequest } from '@/types/auth-types';
import { CharacterRole } from '@/types/enums';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<AuthPermissions | null>(null);

  // ✅ DETECT WHICH AUTH SYSTEM
  const [isPassphraseUser, setIsPassphraseUser] = useState(() => {
    const passphraseToken = getCookie('admin_session');
    const usernameToken = getCookie('auth_session');

    const isPassphraseSystem = !!passphraseToken && !usernameToken;
    const isUsernameSystem = !!usernameToken;

    console.log('[useAuth] Passphrase system:', isPassphraseSystem);
    console.log('[useAuth] Username system:', isUsernameSystem);

    return isPassphraseSystem; // Default detection
  });

  // ✅ LOAD AUTH STATE BASED ON SYSTEM
  useEffect(() => {
    loadAuthState();
  }, [isPassphraseUser]);

  async function loadAuthState() {
    try {
      setIsLoading(true);
      setError(null);

      if (isPassphraseUser()) {
        // ✅ LOAD PASSPHRASE SYSTEM (Your current system)
        await loadPassphraseAuthState();
      } else {
        // ✅ LOAD USERNAME SYSTEM (New multi-user system)
        await loadUsernameAuthState();
      }
    } catch (err) {
      console.error('[useAuth] Error loading auth state:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }

  // ✅ PASSPHRASE SYSTEM (Minimal Changes)
  async function loadPassphraseAuthState() {
    // Check window state (if set by layout script)
    if (typeof window !== 'undefined' && (window as any).__AUTH_STATE__) {
      const windowState = (window as any).__AUTH_STATE__;

      if (windowState.isAuthenticated && windowState.user) {
        setUser(windowState.user);
        setPermissions(windowState.permissions);
        setIsLoading(false);
        console.log('[useAuth] ✅ Loaded passphrase auth from window state');
        return;
      }
    }

    // Fallback to API check
    const response = await fetch('/api/auth/passphrase-login/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Passphrase auth check failed');
    }

    const { authenticated } = await response.json();

    if (authenticated) {
      setUser({
        userId: 'admin',
        username: 'Akiles',
        email: '',
        roles: [CharacterRole.FOUNDER, CharacterRole.PLAYER],
        isActive: true,
      });
      setPermissions({
        can: () => true, // FOUNDER has full access
        hasRole: (role: string) => [CharacterRole.FOUNDER, CharacterRole.PLAYER].includes(role),
        hasAnyRole: () => true,
      });
    } else {
      setUser(null);
      setPermissions(null);
    }

    setIsLoading(false);
  }

  // ✅ USERNAME SYSTEM (New Multi-User)
  async function loadUsernameAuthState() {
    // Check window state (if set by layout script)
    if (typeof window !== 'undefined' && (window as any).__AUTH_STATE__) {
      const windowState = (window as any).__AUTH_STATE__;

      if (windowState.isAuthenticated && windowState.user) {
        setUser(windowState.user);
        setPermissions(windowState.permissions);
        setIsLoading(false);
        console.log('[useAuth] ✅ Loaded username auth from window state');
        return;
      }
    }

    // Fallback to API check
    const response = await fetch('/api/auth/check');

    if (!response.ok) {
      throw new Error('Username auth check failed');
    }

    const { authenticated, user, permissions } = await response.json();

    if (authenticated && user && permissions) {
      setUser(user);
      setPermissions(permissions);
      setIsLoading(false);
      console.log('[useAuth] ✅ Loaded username auth from API');
    } else {
      setUser(null);
      setPermissions(null);
      setIsLoading(false);
    }
  }

  // ✅ AUTH ACTIONS (Work with both systems)
  async function login(username: string, password: string, rememberMe: boolean): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      if (isPassphraseUser()) {
        // Use passphrase system
        console.log('[useAuth] Using passphrase login for:', username);
        const response = await fetch('/api/auth/passphrase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passphrase, rememberMe })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Login failed');
        }

        const { success, user: dataUser } = await response.json();
        if (success && dataUser) {
          setUser(dataUser);
          setPermissions({
            can: () => true,
            hasRole: (role: string) => [CharacterRole.FOUNDER, CharacterRole.PLAYER].includes(role),
            hasAnyRole: () => true,
          });
          setIsLoading(false);
          router.push('/admin');
        }
      } else {
        await loadUsernameAuthState(); // Reload auth state
        setIsLoading(false);
      }
    } else {
      // Use username system
      console.log('[useAuth] Using username login for:', username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { success, user: dataUser } = await response.json();
      if (success && dataUser) {
        setUser(dataUser);
        const permissions = await fetch('/api/auth/permissions');

        setIsLoading(false);
        router.push('/admin');
      } else {
        await loadUsernameAuthState(); // Reload auth state
        setIsLoading(false);
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

      if (isPassphraseUser()) {
        // Logout from passphrase system
        const response = await fetch('/api/auth/passphrase-login/logout', {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Logout failed');
        }
      } else {
        await loadPassphraseAuthState();
      }
    } else {
      // Logout from username system
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }
      else {
        await loadUsernameAuthState();
      }
    }

    setUser(null);
    setPermissions(null);
    setIsLoading(false);
    router.push('/admin/login');
  } catch (err) {
    console.error('[useAuth] Logout error:', err);
    setError(err as Error);
  } finally {
    setIsLoading(false);
    }
  }

  function handleAuthExpired() {
    setUser(null);
    setPermissions(null);
    setError(new Error('Session expired. Please login again.'));
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

// ✅ COOKIE HELPER
function getCookie(name: string): string | undefined {
  if (typeof window !== 'undefined') {
    return document.cookie
      .split('; ')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${name}=`))
      .split('=')[1];
  }
  return undefined;
}
