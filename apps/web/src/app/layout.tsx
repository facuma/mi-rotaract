import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Providers } from '@/components/Providers';
import './globals.css';
import { Public_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Mi Rotaract — Reuniones distritales',
  description: 'Digitalización de reuniones distritales',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn('font-sans', publicSans.variable)}>
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
