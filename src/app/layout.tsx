import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { AuthSessionProvider } from '@/components/AuthSessionProvider';
import { SearchProvider } from '@/components/SearchProvider';
import { Topbar } from '@/components/Topbar';
import { ReadingProgress } from '@/components/ReadingProgress';
import { ToastProvider } from '@/components/ToastProvider';
import { Toast } from '@/components/Toast';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-loaded',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-loaded',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif-loaded',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Omni-Verse Blog',
  description:
    'A blog about tech, programming, celestial bodies, family, and whatever else won’t leave my head.',
};

export default function RootLayout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ovb-theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthSessionProvider>
          <SearchProvider>
            <ToastProvider>
              <ReadingProgress />
              <a href="#main" className="skip-link">
                Skip to content
              </a>
              <Topbar />
              <main id="main" className="main-content">
                {children}
              </main>
              {drawer}
              <Toast />
            </ToastProvider>
          </SearchProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
