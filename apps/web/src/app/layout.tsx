import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
