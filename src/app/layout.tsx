import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Toasts from '@/components/Toasts';

export const metadata: Metadata = {
  title: 'StreamBox — upload, process, stream',
  description: 'Adaptive HLS video sharing platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="ambient" aria-hidden />
        <Navbar />
        <main className="shell">{children}</main>
        <Toasts />
      </body>
    </html>
  );
}
