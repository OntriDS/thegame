import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { THEMES, DEFAULT_THEME } from '@/lib/constants/theme-constants'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TheGame Admin',
  description: 'Gamified Admin Web-app - Vercel-only architecture with Rosetta Stone Links System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="prevent-theme-flash"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themeMode = localStorage.getItem('theme-mode');
                  const themeColor = localStorage.getItem('theme-color') || '${DEFAULT_THEME}';
                  const isDark = themeMode === 'dark';

                  // ✅ STORE IN WINDOW OBJECT
                  window.__THEME_STATE__ = {
                    mode: themeMode,
                    color: themeColor,
                    isDark: isDark
                  };
                  
                  const htmlElement = document.documentElement;
                  
                  if (isDark) {
                    htmlElement.classList.add('dark');
                  } else if (themeMode === 'light') {
                    htmlElement.classList.remove('dark');
                  }

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
                  // Signal localStorage unavailable
                  window.__THEME_STATE__ = null;
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
