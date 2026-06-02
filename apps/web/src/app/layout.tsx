import type { Metadata } from 'next'
import { Inter, Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
  weight: ['400', '500', '700'],
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://immotest.fr'),
  title: {
    default: 'ImmoTest — Analysez votre achat immobilier en 10 secondes',
    template: '%s | ImmoTest',
  },
  description:
    "Analysez n'importe quelle annonce immobilière avec les données officielles " +
    'DVF, ADEME et INSEE. Score de pertinence, prix du marché, négociation. ' +
    'Pour les primo-accédants français.',
  keywords: [
    'analyse immobilière', 'prix immobilier', 'DVF', 'achat appartement',
    'premier achat immobilier', 'score immobilier', 'négociation immobilier',
    'prix m2 Paris', 'immotest', 'immosafe',
  ],
  authors: [{ name: 'ImmoTest', url: 'https://immotest.fr' }],
  creator: 'ImmoTest',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://immotest.fr',
    siteName: 'ImmoTest',
    title: 'ImmoTest — Analysez votre achat immobilier en 10 secondes',
    description:
      'Score de pertinence, prix du marché réel (DVF), marge de négociation. La première analyse est gratuite.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ImmoTest — Analyse immobilière' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ImmoTest — Analysez votre achat immobilier',
    description: 'Score, prix du marché, négociation. Données DVF officielles.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://immotest.fr' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme')
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${playfair.variable} ${dmSans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
