# Standardized Loading Pattern Roadmap (UPDATED)
## Multi-User Professional Auth System + Theme Flash Prevention

---

## 🎯 UPDATED OBJECTIVES

**Preserve & Enhance:**
- ✅ **Immediate Theme Loading:** User's theme preferences load instantly (no flash)
- ✅ **Professional Multi-User Auth:** Scalable, secure, DRY authentication system
- ✅ **React Hydration Safety:** Zero hydration errors across all sections
- ✅ **Role-Based Access Control:** Leverage existing CharacterRole enum professionally

---

## 📋 UPDATED ROADMAP STAGES

### **STAGE 1: Foundation Fixes (localStorage + Theme Enhancement)**
**Goal:** Preserve immediate theme loading while fixing hydration issues

#### **Understanding Current System:**
```typescript
// CURRENT: app/layout.tsx (Lines 22-58) - ✅ WORKS FOR PREVENTING FLASH
<script id="prevent-theme-flash">
  (function() {
    try {
      const themeMode = localStorage.getItem('theme-mode');     // Reads user's dark/light
      const themeColor = localStorage.getItem('theme-color');     // Reads user's theme choice
      const isDark = themeMode === 'dark';

      // Applies CSS variables IMMEDIATELY before React starts
      // This prevents the flash you mentioned!
      const htmlElement = document.documentElement;
      if (isDark) htmlElement.classList.add('dark');

      const themes = ${JSON.stringify(THEMES)};
      const theme = themes[themeColor];
      // ... Apply all theme CSS variables
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
  })();
</script>
```

**What's Working:**
- ✅ Theme loads immediately (user sees their preferences instantly)
- ✅ No flash from default theme → user theme
- ✅ Both dark/light mode and theme color are applied instantly

**What's Not Working:**
- ❌ Hydration warnings in console (suppressed but not fixed)
- ❌ Potential race conditions between script and React hook
- ❌ Script runs before React, but React hook also reads localStorage (double initialization)

#### **Stage 1.1: Improve Theme Synchronization (Preserve Flash Prevention)**
**Goal:** Keep immediate theme loading while fixing hydration

**Solution: Use Window Object for State Sharing**

```typescript
// IMPROVED: app/layout.tsx
<script id="prevent-theme-flash">
  (function() {
    try {
      const themeMode = localStorage.getItem('theme-mode');
      const themeColor = localStorage.getItem('theme-color') || 'slate';
      const isDark = themeMode === 'dark';

      // ✅ Store in window object for React to read
      window.__THEME_STATE__ = {
        mode: themeMode,
        color: themeColor,
        isDark: isDark
      };

      // Apply CSS variables immediately (preserves flash prevention)
      const htmlElement = document.documentElement;
      if (isDark) htmlElement.classList.add('dark');
      else if (themeMode === 'light') htmlElement.classList.remove('dark');

      const themes = ${JSON.stringify(THEMES)};
      const theme = themes[themeColor];

      if (theme) {
        const mode = isDark ? 'dark' : 'light';
        const colors = theme[mode];

        for (const [key, value] of Object.entries(colors)) {
          const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
          htmlElement.style.setProperty(cssVar, value);
        }
      }
    } catch (e) {
      window.__THEME_STATE__ = null;  // Signal localStorage unavailable
    }
  })();
</script>
```

```typescript
// IMPROVED: lib/hooks/use-theme.ts
export function useTheme() {
  const { getPreference, setPreference, isLoading: kvLoading } = useUserPreferences();
  const [isMounted, setIsMounted] = useState(false);

  // ✅ Read from window object first (set by layout script)
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined' && (window as any).__THEME_STATE__?.color) {
      return (window as any).__THEME_STATE__.color;
    }
    return DEFAULT_THEME;
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined' && (window as any).__THEME_STATE__?.mode) {
      return (window as any).__THEME_STATE__.mode === 'dark';
    }
    return false;
  });

  // ✅ Load from localStorage (backup if window object not set)
  useEffect(() => {
    setIsMounted(true);

    // Only update if window state wasn't available
    if (!(window as any).__THEME_STATE__) {
      const savedColor = localStorage.getItem('theme-color') as ThemeName;
      const savedMode = localStorage.getItem('theme-mode') === 'dark';

      if (savedColor && THEMES[savedColor]) {
        setCurrentTheme(savedColor);
      }
      setIsDark(savedMode);
    }
  }, []);

  // ✅ Sync with KV preferences (KV takes precedence)
  useEffect(() => {
    if (!isMounted || kvLoading) return;

    const savedColorTheme = getPreference('theme-color') as ThemeName;
    const dbModePrefs = getPreference('theme-mode');
    const savedMode = dbModePrefs === 'dark';

    // KV sync doesn't cause re-renders if already matching
    if (savedColorTheme && THEMES[savedColorTheme] && savedColorTheme !== currentTheme) {
      setCurrentTheme(savedColorTheme);
      // Update localStorage immediately for consistency
      localStorage.setItem('theme-color', savedColorTheme);
    }
    if (dbModePrefs !== undefined && savedMode !== isDark) {
      setIsDark(savedMode);
      localStorage.setItem('theme-mode', savedMode ? 'dark' : 'light');
    }
  }, [isMounted, kvLoading, getPreference]);

  // ✅ Apply theme changes (only when different from initial)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const theme = THEMES[currentTheme];
    const mode = isDark ? 'dark' : 'light';
    const colors = theme[mode];

    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    root.classList.toggle('dark', isDark);

    // Sync to localStorage (maintains consistency)
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    localStorage.setItem('theme-color', currentTheme);
  }, [currentTheme, isDark, isMounted]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
    setPreference('theme-color', theme);
  };

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    setPreference('theme-mode', newMode ? 'dark' : 'light');
  };

  return {
    currentTheme,
    setTheme,
    isDark,
    toggleDarkMode,
    availableThemes: Object.values(THEMES),
    isMounted
  };
}
```

**Impact:**
- ✅ Preserves immediate theme loading (no flash)
- ✅ Eliminates double initialization race condition
- ✅ Proper state synchronization between script and React
- ✅ Removes hydration mismatches

**Duration:** 2-3 hours
**Risk:** Low (preserves working functionality)

#### **Stage 1.2: Add TypeScript Window Extension**
```typescript
// types/global.d.ts (NEW FILE)
export {};

declare global {
  interface Window {
    __THEME_STATE__?: {
      mode: string | null;
      color: string | null;
      isDark: boolean;
    };
    __AUTH_STATE__?: {
      isAuthenticated: boolean;
      userId: string | null;
      roles: string[];
    };
  }
}
```

**Impact:** Type safety for window object extensions
**Duration:** 15 minutes
**Risk:** None

#### **Stage 1.3: Test Theme Loading Scenarios**
```typescript
// TEST SCENARIOS:
1. Fresh load (no localStorage) → Should load DEFAULT_THEME
2. Saved theme (localStorage exists) → Should load user theme instantly
3. KV override → KV should sync without flash
4. Theme switching → Should be instant, no reload
5. Dark/light toggle → Should be instant, no flash
```

**Impact:** Verifies theme system works perfectly
**Duration:** 1 hour
**Risk:** None

---

### **STAGE 2: Professional Multi-User Authentication System**
**Goal:** Design scalable, secure, DRY authentication for multiple users

#### **Understanding Current System:**
```typescript
// CURRENT: Single Admin (Too Simple)
const token = await generateJwt({ sub: 'admin', role: 'admin' }, secret, expiresIn);

// PROBLEM:
- ❌ Only supports single admin user
- ❌ No user management (create, update, delete)
- ❌ No role-based permissions (beyond FOUNDER check)
- ❌ No user-specific data isolation
- ❌ No session management (multiple devices, logout, etc.)
```

```typescript
// CURRENT: CharacterRole System (Already Exists!)
export enum CharacterRole {
  FOUNDER = 'founder',
  PLAYER = 'player',
  APPRENTICE = 'apprentice',
  BOSS = 'boss',
  INVESTOR = 'investor',
  TEAM = 'team',
  FAMILY = 'family',
  ADMIN = 'admin',
  DESIGNER = 'designer',
  PRODUCER = 'producer',
  SELLER = 'seller',
  RESEARCHER = 'researcher',
  DEVELOPER = 'developer',
  AI_AGENT = 'ai-agent',
  ASSOCIATE = 'associate',
  PARTNER = 'partner',
  COLLABORATOR = 'collaborator',
  CUSTOMER = 'customer',
  STUDENT = 'student',
  OTHER = 'other'
}
```

#### **Stage 2.1: Design Professional Auth Architecture**

**Core Principles:**
- **Simple Complex:** Well-architected but easy to understand
- **DRY:** Single source of truth for auth logic
- **Scalable:** Ready for multiple users, roles, permissions
- **Secure:** JWT-based with proper session management

**New Architecture:**
```typescript
// ========================================================================
// AUTH ENTITIES (Simple Complex Design)
// ========================================================================

// 1. User Entity (Authentication Identity)
interface User {
  id: string;                    // uuid
  username: string;               // Unique login username
  email: string;                 // Email for verification
  passwordHash: string;          // Hashed password (bcrypt)
  isActive: boolean;             // Account status
  isVerified: boolean;          // Email verification status
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;   // For security
}

// 2. Session Entity (Login Session)
interface Session {
  id: string;                   // Session ID
  userId: string;               // Link to User
  token: string;                // JWT token
  deviceInfo: {
    userAgent: string;
    ip: string;
    lastUsed: Date;
  };
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;           // For logout
}

// 3. Character Entity (Game Identity - Already Exists!)
interface Character {
  id: string;                   // uuid
  userId: string;               // Link to User
  name: string;
  roles: CharacterRole[];        // ✅ Already have this!
  // ... other character fields
}

// 4. Permission Matrix (Role-Based Access)
interface Permission {
  resource: string;              // e.g., 'tasks', 'finances', 'settings'
  action: string;               // e.g., 'read', 'write', 'delete', 'admin'
  roles: CharacterRole[];        // Which roles can do this
}

// Example Permission Matrix
const PERMISSION_MATRIX: Permission[] = [
  // Tasks
  { resource: 'tasks', action: 'read', roles: [CharacterRole.PLAYER, CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.TEAM, CharacterRole.DEVELOPER] },
  { resource: 'tasks', action: 'write', roles: [CharacterRole.PLAYER, CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.DEVELOPER] },
  { resource: 'tasks', action: 'delete', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },

  // Finances
  { resource: 'finances', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.INVESTOR] },
  { resource: 'finances', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },

  // Settings
  { resource: 'settings', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },
  { resource: 'settings', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },

  // Sales
  { resource: 'sales', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.SELLER, CharacterRole.PLAYER] },
  { resource: 'sales', action: 'write', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN, CharacterRole.SELLER, CharacterRole.PLAYER] },

  // Player Management
  { resource: 'players', action: 'read', roles: [CharacterRole.FOUNDER, CharacterRole.ADMIN] },
  { resource: 'players', action: 'write', roles: [CharacterRole.FOUNDER] },

  // User Management
  { resource: 'users', action: 'read', roles: [CharacterRole.FOUNDER] },
  { resource: 'users', action: 'write', roles: [CharacterRole.FOUNDER] },
];
```

#### **Stage 2.2: Create Auth Infrastructure**

```typescript
// lib/auth-types.ts (NEW)
export interface AuthUser {
  userId: string;
  username: string;
  characterId: string;
  roles: CharacterRole[];
  isActive: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export interface AuthPermissions {
  can: (resource: string, action: string) => boolean;
  hasRole: (role: CharacterRole) => boolean;
  hasAnyRole: (roles: CharacterRole[]) => boolean;
}

// lib/auth-service.ts (NEW)
export class AuthService {
  // ✅ SINGLE SOURCE OF TRUTH for auth logic

  async login(username: string, password: string): Promise<AuthSession> {
    // 1. Find user by username
    // 2. Verify password
    // 3. Get user's character
    // 4. Create session with JWT
    // 5. Update lastLoginAt
  }

  async logout(sessionId: string): Promise<void> {
    // 1. Mark session as revoked
    // 2. Clear cookie
  }

  async verifySession(token: string): Promise<AuthUser | null> {
    // 1. Verify JWT signature
    // 2. Check if session is revoked
    // 3. Check if user is active
    // 4. Return user or null
  }

  getPermissions(user: AuthUser): AuthPermissions {
    // 1. Check user's roles against PERMISSION_MATRIX
    // 2. Return permission checking functions
  }

  async createUser(username: string, email: string, password: string, createdBy: string): Promise<User> {
    // 1. Hash password (bcrypt)
    // 2. Create User entity
    // 3. Create default Character for user
    // 4. Send verification email
  }

  async updateUserRoles(userId: string, roles: CharacterRole[], updatedBy: string): Promise<void> {
    // 1. Verify updater has FOUNDER role
    // 2. Update character's roles
    // 3. Log permission change
  }
}
```

#### **Stage 2.3: Update Auth Endpoints**

```typescript
// app/api/auth/login/route.ts (NEW)
export async function POST(req: Request) {
  const { username, password, rememberMe } = await req.json();

  const session = await AuthService.login(username, password);

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30 days or 7 days
  };

  const response = NextResponse.json({ success: true, user: session.user });
  response.cookies.set('auth_session', session.token, cookieOptions);

  return response;
}

// app/api/auth/logout/route.ts (NEW)
export async function POST(req: Request) {
  const token = req.cookies.get('auth_session')?.value;

  if (token) {
    await AuthService.logout(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_session');

  return response;
}

// app/api/auth/check/route.ts (UPDATED)
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_session')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await AuthService.verifySession(token);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // ✅ Return user info + permissions
  const permissions = AuthService.getPermissions(user);

  return NextResponse.json({
    authenticated: true,
    user,
    permissions: {
      can: permissions.can,
      hasRole: permissions.hasRole,
      hasAnyRole: permissions.hasAnyRole
    }
  });
}

// app/api/auth/permissions/route.ts (NEW)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = AuthService.getPermissions(authResult.user);

  return NextResponse.json(permissions);
}
```

#### **Stage 2.4: Create Client-Side Auth Hook**

```typescript
// lib/hooks/use-auth.ts (NEW)
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<AuthPermissions | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // ✅ INITIAL LOAD FROM WINDOW (if set by layout script)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadAuthState();

    // ✅ Listen for auth changes
    window.addEventListener('auth-changed', loadAuthState);
    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('auth-changed', loadAuthState);
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  async function loadAuthState() {
    try {
      setIsLoading(true);
      setError(null);

      // Check window state first (fast)
      if ((window as any).__AUTH_STATE__) {
        const windowState = (window as any).__AUTH_STATE__;
        if (windowState.isAuthenticated && windowState.userId) {
          setUser(windowState.user);
          setPermissions(windowState.permissions);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to API call
      const response = await fetch('/api/auth/check');
      if (response.ok) {
        const { authenticated, user, permissions } = await response.json();
        setUser(user);
        setPermissions(permissions);
        // Store in window for subsequent loads
        (window as any).__AUTH_STATE__ = { isAuthenticated: authenticated, user, permissions };
      } else {
        setUser(null);
        setPermissions(null);
        (window as any).__AUTH_STATE__ = { isAuthenticated: false };
      }
    } catch (err) {
      setError(err as Error);
      setUser(null);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string, rememberMe: boolean): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    await loadAuthState();
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { action: 'login' }));
  }

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setPermissions(null);
    (window as any).__AUTH_STATE__ = { isAuthenticated: false };
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { action: 'logout' }));
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
    login,
    logout,
    refetch: loadAuthState
  };
}
```

**Impact:**
- ✅ Professional multi-user auth system
- ✅ Role-based permissions (leverages existing CharacterRole enum)
- ✅ Session management and security
- ✅ DRY (single AuthService, single useAuth hook)
- ✅ TypeScript type safety
- ✅ Ready for user management UI

**Duration:** 8-12 hours
**Risk:** Medium (major architectural change)

#### **Stage 2.5: Update Middleware & API Routes**

```typescript
// middleware.ts (UPDATED)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow non-admin paths
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // ✅ Check auth with new system
  const token = request.cookies.get('auth_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const user = await AuthService.verifySession(token);

  if (!user) {
    // Invalid or expired session
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete('auth_session');
    return response;
  }

  // ✅ Check route-specific permissions
  const permissions = AuthService.getPermissions(user);

  if (pathname.startsWith('/admin/settings') && !permissions.can('settings', 'read')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // ✅ Add user info to headers for API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-character-id', user.characterId);
  response.headers.set('x-user-roles', JSON.stringify(user.roles));

  return response;
}
```

**Impact:**
- ✅ Route-level permission checking
- ✅ Automatic auth expiry handling
- ✅ User context available in all API routes
- ✅ Clean separation of concerns

**Duration:** 3-4 hours
**Risk:** Medium (core routing logic)

---

### **STAGE 3: Browser API Safety (Concurrent Rendering)**
**Goal:** Prevent concurrent rendering violations from browser API access

#### **Stage 3.1: Create Browser API Guards**
```typescript
// lib/hooks/use-browser-api.ts (NEW)
export function useBrowserAPI<T>(
  callback: () => T,
  deps: React.DependencyList = []
): T | null {
  const [isMounted, setIsMounted] = useState(false);
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        setResult(callback());
      } catch (error) {
        console.warn('Browser API access failed:', error);
        setResult(null);
      }
    }
  }, [isMounted, ...deps]);

  return result;
}

// lib/utils/browser-utils.ts (NEW)
export function safeLocalStorage(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage access failed:', error);
    return null;
  }
}

export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('localStorage write failed:', error);
    return false;
  }
}
```

**Impact:** Fixes React #418 errors
**Duration:** 2-3 hours
**Risk:** Low

#### **Stage 3.2: Audit & Refactor Components**
- Scan all components for `window`, `document`, `navigator` access
- Replace with safe utilities
- Update inventory-display, modals, and other components

**Impact:** Eliminates concurrent rendering violations
**Duration:** 4-6 hours
**Risk:** Medium

---

### **STAGE 4: State Management Safety (Render Cycle Integrity)**
**Goal:** Prevent state updates during render cycles

#### **Stage 4.1: Create Event Dispatcher Hook**
```typescript
// lib/hooks/use-event-dispatcher.ts (NEW)
export function useEventDispatcher() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const dispatch = useCallback((eventName: string, detail?: any) => {
    if (typeof window !== 'undefined' && isMounted.current) {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }, []);

  return dispatch;
}
```

**Impact:** Fixes React #423 errors
**Duration:** 2-3 hours
**Risk:** Low

#### **Stage 4.2: Refactor Event Dispatching**
- Move all `window.dispatchEvent` calls from render to useEffect
- Update inventory-display, bulk-edit-submodal, partnership-submodal
- Test all event-driven updates

**Impact:** Eliminates state update violations
**Duration:** 3-4 hours
**Risk:** Medium

---

### **STAGE 5: Section Loading Standardization**
**Goal:** Create consistent loading pattern for all admin sections

#### **Stage 5.1: Design Standard Loading Hook**
```typescript
// lib/hooks/use-section-loading.ts (NEW)
interface SectionLoadingOptions<T> {
  sectionKey: string;
  fetchData: () => Promise<T>;
  dependencies?: any[];
  authRequired?: boolean;
}

interface SectionLoadingState<T> {
  // Phase 1: Auth Check
  authStatus: 'checking' | 'authenticated' | 'unauthenticated';
  authError: Error | null;

  // Phase 2: Data Fetching
  dataStatus: 'idle' | 'loading' | 'loaded' | 'error';
  dataError: Error | null;
  data: T | null;

  // Phase 3: Hydration Complete
  isHydrated: boolean;

  // Actions
  refetch: () => Promise<void>;
}

export function useSectionLoading<T>(
  options: SectionLoadingOptions<T>
): SectionLoadingState<T> {
  const { user, isLoading: authLoading, permissions } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [dataStatus, setDataStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [data, setData] = useState<T | null>(null);
  const [dataError, setDataError] = useState<Error | null>(null);
  const dispatch = useEventDispatcher();

  // Check mount state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth status
  const authStatus = authLoading ? 'checking' : (user ? 'authenticated' : 'unauthenticated');
  const authError = !user && !authLoading ? new Error('Not authenticated') : null;

  // Data fetching
  useEffect(() => {
    if (!isMounted) return;

    // Phase 1: Check auth first
    if (options.authRequired && !user) {
      setDataStatus('idle');
      return;
    }

    // Phase 2: Fetch data
    const fetchData = async () => {
      try {
        setDataStatus('loading');
        setDataError(null);

        const result = await options.fetchData();
        setData(result);
        setDataStatus('loaded');
      } catch (error) {
        console.error(`Failed to load ${options.sectionKey}:`, error);
        setDataError(error as Error);
        setDataStatus('error');
      }
    };

    fetchData();
  }, [isMounted, user, options.sectionKey, ...(options.dependencies || [])]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (!isMounted || !user) return;

    try {
      setDataStatus('loading');
      const result = await options.fetchData();
      setData(result);
      setDataStatus('loaded');
    } catch (error) {
      setDataError(error as Error);
      setDataStatus('error');
    }
  }, [isMounted, user, options.fetchData, options.sectionKey]);

  return {
    authStatus,
    authError,
    dataStatus,
    dataError,
    data,
    isHydrated: isMounted,
    refetch
  };
}
```

**Impact:** Reusable, consistent loading pattern
**Duration:** 3-4 hours
**Risk:** Low

#### **Stage 5.2: Update Sales Section (Example)**
```typescript
// app/admin/sales/page.tsx (UPDATED)
export default function SalesPage() {
  const { user, permissions, authStatus } = useAuth();

  const { currentBg } = useThemeColors();

  const [filterState, setFilterState] = useState({
    selectedType: 'all' as SaleType | 'all',
    selectedStatus: 'all' as SaleStatus | 'all',
    selectedSite: 'all' as string | 'all',
    currentYear: new Date().getFullYear(),
    currentMonth: getCurrentMonth(),
    filterByMonth: true,
    showCollected: false
  });

  // ✅ STANDARD LOADING PATTERN
  const {
    dataStatus,
    data: initialData,
    dataError,
    isHydrated,
    refetch
  } = useSectionLoading<{ sales: Sale[], sites: any[], rates: CurrencyExchangeRates }>({
    sectionKey: 'sales',
    authRequired: true,
    fetchData: () => Promise.all([
      ClientAPI.getSales(
        filterState.filterByMonth ? filterState.currentMonth : undefined,
        filterState.filterByMonth ? filterState.currentYear : undefined
      ),
      ClientAPI.getSites(),
      ClientAPI.getFinancialConversionRates()
    ]).then(([salesData, sitesData, ratesData]) => ({
        sales: salesData,
        sites: sitesData,
        rates: ratesData
      })),
    dependencies: [
      filterState.currentYear,
      filterState.currentMonth,
      filterState.filterByMonth
    ]
  });

  const [sales, setSales] = useState<Sale[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRates>(DEFAULT_CURRENCY_EXCHANGE_RATES);

  // Sync data when loaded
  useEffect(() => {
    if (initialData && dataStatus === 'loaded') {
      setSales(initialData.sales);
      setSites(initialData.sites);
      setExchangeRates(initialData.rates);
    }
  }, [initialData, dataStatus]);

  // Listen for entity updates
  useEntityUpdates('sale', refetch);

  // ✅ AUTH CHECK
  if (authStatus === 'checking') {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  if (authStatus === 'unauthenticated') {
    return <div className="flex items-center justify-center min-h-screen">
      <p>Access denied. Please login.</p>
    </div>;
  }

  // ✅ HYDRATION CHECK
  if (!isHydrated) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  // ✅ LOADING STATE
  if (dataStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  // ✅ ERROR STATE
  if (dataStatus === 'error') {
    return <div className="flex items-center justify-center min-h-screen">
      <p>Error loading sales: {dataError?.message}</p>
      <Button onClick={refetch}>Retry</Button>
    </div>;
  }

  // ✅ RENDER CONTENT
  return (
    <div className="space-y-6">
      {/* Existing sales UI */}
    </div>
  );
}
```

**Impact:** Consistent, reliable section loading
**Duration:** 2-3 hours
**Risk:** Medium

#### **Stage 5.3: Update Remaining Sections**
Apply same pattern to:
- `/admin/finances`
- `/admin/inventories`
- `/admin/control-room`
- `/admin/map`
- `/admin/player`
- `/admin/characters`
- `/admin/research`
- `/admin/settings`

**Impact:** All sections use standard pattern
**Duration:** 6-8 hours
**Risk:** Medium

---

### **STAGE 6: Production Optimization**
**Goal:** Optimize for Vercel Edge runtime and production performance

#### **Stage 6.1: Environment-Specific Optimizations**
- Edge runtime auth verification
- KV access pattern optimization
- Caching strategies for frequently accessed data

**Duration:** 2-3 hours
**Risk:** Low

#### **Stage 6.2: Performance Monitoring**
- Add error tracking (Sentry or similar)
- Monitor hydration timing
- Track auth failure rates
- Performance metrics dashboard

**Duration:** 2-3 hours
**Risk:** Low

---

## 📊 UPDATED ESTIMATED TIMELINE

### **Total Estimated Duration: 45-60 hours**

#### **Breakdown by Stage:**
- **Stage 1:** 3-4 hours (Foundation Fixes + Theme Enhancement)
- **Stage 2:** 19-25 hours (Professional Multi-User Auth System)
- **Stage 3:** 6-9 hours (Browser API Safety)
- **Stage 4:** 5-7 hours (State Management Safety)
- **Stage 5:** 11-15 hours (Section Loading Standardization)
- **Stage 6:** 4-6 hours (Production Optimization)

### **Recommended Scheduling:**
- **Week 1:** Stages 1-2 (Foundation + Professional Auth)
- **Week 2:** Stages 3-4 (API Safety + State Safety)
- **Week 3:** Stage 5 (Section Standardization)
- **Week 4:** Stage 6 (Production Optimization + Testing)

---

## 🎯 SUCCESS CRITERIA (UPDATED)

### Technical:
- ✅ **0** React hydration errors in production
- ✅ **< 0.5%** authentication error rate (improved from current)
- ✅ **< 100ms** First Contentful Paint
- ✅ **< 2s** Time to Interactive
- ✅ **0** theme flash (user theme loads instantly)

### User Experience:
- ✅ Theme loads immediately with user preferences (no flash)
- ✅ Multiple users can login with proper role-based access
- ✅ Permissions are enforced consistently across all sections
- ✅ Session management works (multiple devices, logout, expiry)
- ✅ **100%** section load success rate
- ✅ **< 1s** average section load time

### Code Quality:
- ✅ **100%** sections using standard loading pattern
- ✅ **0** direct browser API access without guards
- ✅ **0** event dispatching during render cycles
- ✅ **1** AuthService (single source of truth)
- ✅ **1** useAuth hook (consistent auth state)
- ✅ Professional multi-user architecture

---

## ❓ **READY TO PROCEED?**

Based on your requirements, I've updated the plan to:

✅ **Preserve Immediate Theme Loading:** User's theme loads instantly (no flash) using window object synchronization
✅ **Professional Multi-User Auth:** Scalable system using existing CharacterRole enum, role-based permissions
✅ **DRY & Simple Complex:** Single AuthService, single useAuth hook, permission matrix for clean design
✅ **React Hydration Safety:** All stages address hydration systematically

**Before implementing, should I:**

1. **Start with Stage 1** (Theme synchronization - preserves flash prevention)
2. **Review the multi-user auth architecture** more thoroughly
3. **Check other authentication-related files** before proceeding
4. **Create a detailed implementation plan** for Stage 1 first

What would you prefer?
