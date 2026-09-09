import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = {
  title: 'Orbit Roll · Mission control',
  description:
    'Administration for Orbit Roll players, verified runs, and media.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
