'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { FOUNDER_ROLE } from '@/integrity/iam/permissions';

interface FounderOnlyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function FounderOnlyWrapper({ children, fallback = null }: FounderOnlyWrapperProps) {
  const { permissions, isLoading } = useAuth();
  const hasFounderPermissions = !!permissions?.hasRole(FOUNDER_ROLE);

  if (isLoading) {
    return fallback;
  }

  if (!hasFounderPermissions) {
    return fallback;
  }

  return <>{children}</>;
}

