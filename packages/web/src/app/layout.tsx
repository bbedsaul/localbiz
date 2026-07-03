import type { Metadata, Viewport } from 'next';
import { Zilla_Slab, Inter, IBM_Plex_Mono } from 'next/font/google';
import '../styles/tokens.css';
import './globals.css';

// Display: painted-sign slab. Body: humanist. Mono: invoice/receipt numerals.
const display = Zilla_Slab({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://localmarketz.com'),
  title: {
    default: 'LocalMarket — We handle the internet. You handle the business.',
    template: '%s · LocalMarket',
  },
  description:
    'LocalMarket quietly runs your local business online — website, monitoring, missed-call recovery, reviews, and social. You fix furnaces and fill cavities; we keep the internet part working.',
  applicationName: 'LocalMarket',
  openGraph: {
    type: 'website',
    siteName: 'LocalMarket',
    title: 'We handle the internet. You handle the business.',
    description:
      'AI-powered services that keep a local business’s website and online presence working — so the owner doesn’t have to.',
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17483B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
