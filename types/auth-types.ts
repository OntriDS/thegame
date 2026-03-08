// types/auth-types.ts
// Multi-User Authentication Types
// Professional auth system with role-based access control

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  characterId: string;
  roles: string[];
  isActive: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export interface AuthPermissions {
  can: (resource: string, action: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  user?: AuthUser;
  permissions?: AuthPermissions;
  error?: string;
}

export interface PermissionsResponse {
  can: (resource: string, action: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
