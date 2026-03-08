export {};

declare global {
  interface Window {
    // Theme state (set by layout script)
    __THEME_STATE__?: {
      mode: string | null;
      color: string | null;
      isDark: boolean;
    };

    // Auth state (for future multi-user auth)
    __AUTH_STATE__?: {
      isAuthenticated: boolean;
      userId: string | null;
      roles: string[];
    };
  }
}
