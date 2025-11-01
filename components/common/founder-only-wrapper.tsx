'use client';

import { useEffect, useState, ReactNode } from 'react';

interface FounderOnlyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that gates UI visibility based on FOUNDER role
 * Checks /api/auth/check-founder endpoint to verify user has FOUNDER permissions
 */
export function FounderOnlyWrapper({ children, fallback = null }: FounderOnlyWrapperProps) {
  const [hasFounderPermissions, setHasFounderPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFounderPermissions();
  }, []);

  async function checkFounderPermissions() {
    try {
      setIsLoading(true);
      
      // Check admin auth first (middleware protected route)
      const authCheck = await fetch('/api/auth/check');
      if (!authCheck.ok) {
        setHasFounderPermissions(false);
        return;
      }
      
      // Then check founder permissions
      const response = await fetch('/api/auth/check-founder');
      if (response.ok) {
        const { isAuthorized } = await response.json();
        setHasFounderPermissions(isAuthorized);
      } else {
        setHasFounderPermissions(false);
      }
    } catch (error) {
      console.error('[FounderOnlyWrapper] Error checking permissions:', error);
      setHasFounderPermissions(false);
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state or fallback while checking
  if (isLoading) {
    return fallback;
  }

  // Only render children if user has FOUNDER permissions
  if (!hasFounderPermissions) {
    return fallback;
  }

  return <>{children}</>;
}

