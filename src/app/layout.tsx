import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Cryptography Application',
  description: 'Step-by-step cryptographic algorithm visualization',
};

/**
 * Applies the stored theme before the first paint.
 *
 * Doing this in an effect instead would show a flash of the light theme every
 * time someone loads a dark-themed page, so it has to run synchronously in the
 * document head.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('kryptolearn-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, jbMono.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans flex min-h-screen flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:border focus:bg-background focus:px-4 focus:py-2 focus:font-medium"
        >
          Skip to main content
        </a>
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-8 lg:overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
