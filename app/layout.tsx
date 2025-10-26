import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
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
        <Script
          id="prevent-theme-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themeMode = localStorage.getItem('theme-mode');
                  const htmlElement = document.documentElement;
                  
                  if (themeMode === 'dark') {
                    htmlElement.classList.add('dark');
                  } else if (themeMode === 'light') {
                    htmlElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Silently fail if localStorage is unavailable
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
