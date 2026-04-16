'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, AuthPermissions, AuthCheckResponse } from '@/types/auth-types';

const authStateSubscribers = new Set<(state: AuthCheckResponse | null) => void>();
let sharedAuthCheck: AuthCheckResponse | null = null;
let sharedAuthFetchPromise: Promise<AuthCheckResponse> | null = null;

function notifyAuthSubscribers(state: AuthCheckResponse | null) {
  authStateSubscribers.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error('[useAuth] Auth listener failed:', error);
    }
  });
}

function updateSharedAuthState(state: AuthCheckResponse | null) {
  sharedAuthCheck = state;
  persistWindowAuthState(state);
  notifyAuthSubscribers(state);
}

function persistWindowAuthState(state: AuthCheckResponse | null) {
  if (typeof window === 'undefined') return;
  (window as any).__AUTH_STATE__ = {
    isAuthenticated: !!(state?.authenticated && state?.user),
    user: state?.user ?? null,
    permissions: state?.permissions ?? null,
  };
}

function subscribeToAuthState(listener: (state: AuthCheckResponse | null) => void) {
  authStateSubscribers.add(listener);
  return () => {
    authStateSubscribers.delete(listener);
  };
}

async function fetchAuthCheckResponse(): Promise<AuthCheckResponse> {
  const response = await fetch('/api/auth/check');
  const base: AuthCheckResponse = {
    authenticated: false,
    user: null,
    permissions: null,
  };

  try {
    const parsed = await response.json();
    if (!response.ok) {
      return {
        ...base,
        error: parsed?.error || `Authentication check failed (${response.status})`,
      };
    }

    return {
      authenticated: !!parsed?.authenticated,
      user: parsed?.user ?? null,
      permissions: parsed?.permissions ?? null,
      error: parsed?.error,
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : 'Failed to parse auth check response',
    };
  }
}

async function ensureAuthCheck(forceRefresh = false): Promise<AuthCheckResponse> {
  if (!forceRefresh && sharedAuthCheck) {
    return sharedAuthCheck;
  }

  if (sharedAuthFetchPromise) {
    return sharedAuthFetchPromise;
  }

  const promise = (async () => {
    try {
      const latest = await fetchAuthCheckResponse();
      updateSharedAuthState(latest);
      return latest;
    } catch (error) {
      console.warn('[useAuth] Failed to refresh auth check:', error);
      const fallback = sharedAuthCheck ?? {
        authenticated: false,
        user: null,
        permissions: null,
        error: 'Authentication check failed',
      };
      updateSharedAuthState({
        ...fallback,
        error: fallback.error ?? (error instanceof Error ? error.message : 'Authentication check failed'),
      });
      return fallback;
    } finally {
      sharedAuthFetchPromise = null;
    }
  })();

  sharedAuthFetchPromise = promise;
  return promise;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(() => sharedAuthCheck?.user ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(() =>
    sharedAuthCheck?.error ? new Error(sharedAuthCheck.error) : null
  );
  const [permissions, setPermissions] = useState<AuthPermissions | null>(() => sharedAuthCheck?.permissions ?? null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!(sharedAuthCheck?.authenticated && sharedAuthCheck?.user));

  const isPassphraseUser = false;

  const loadAuthState = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await ensureAuthCheck(forceRefresh);

      if (!data.authenticated || !data.user) {
        setUser(null);
        setPermissions(null);
        setIsAuthenticated(false);
        setError(new Error(data.error || 'Not authenticated'));
        if (typeof window !== 'undefined') {
          (window as any).__AUTH_STATE__ = {
            isAuthenticated: false,
            user: null,
            permissions: null,
          };
        }
        return;
      }

      setUser(data.user);
      setPermissions(data.permissions ?? null);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error('[useAuth] Error loading auth state:', err);
      setError(err instanceof Error ? err : new Error('Authentication check failed'));
      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuthState();
  }, [loadAuthState]);

  useEffect(() => {
    const handleAuthUpdate = (next: AuthCheckResponse | null) => {
      setUser(next?.user ?? null);
      setPermissions(next?.permissions ?? null);
      setIsAuthenticated(!!(next?.authenticated && next?.user));
      if (next?.error) {
        setError(new Error(next.error));
      } else {
        setError(null);
      }
    };
    const unsubscribe = subscribeToAuthState(handleAuthUpdate);
    return unsubscribe;
  }, []);

  async function login(username: string | null, password: string | null, rememberMe: boolean): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      if (username === null && password === null) {
        await loadAuthState(true);
        if (sharedAuthCheck?.authenticated && sharedAuthCheck.user) {
          router.push('/admin');
        }
        setIsLoading(false);
        return;
      }

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
        await loadAuthState(true);
        router.push('/admin');
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      console.error('[useAuth] Login error:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);
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

      updateSharedAuthState({
        authenticated: false,
        user: null,
        permissions: null,
        error: 'Logged out'
      });

      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);

      if (typeof window !== 'undefined') {
        (window as any).__AUTH_STATE__ = {
          isAuthenticated: false,
          user: null,
          permissions: null,
        };
      }

      setIsLoading(false);
      router.push('/admin/login');
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
      setError(err as Error);
      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }

  return {
    user,
    isLoading,
    error,
    permissions,
    isAuthenticated,
    isPassphraseUser,
    login,
    logout,
    refetch: loadAuthState
  };
}

