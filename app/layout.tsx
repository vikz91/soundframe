import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGroteskHeading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading'
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL

export const metadata: Metadata = {
  metadataBase: new URL(deploymentHost ? `https://${deploymentHost}` : 'http://localhost:3000'),
  title: {
    default: 'Audioframe - Turn Audio into Video',
    template: '%s | Audioframe'
  },
  description:
    'Meet Audioframe: turn music, cover art, and lyrics into videos with audio-reactive visuals. Private browser processing and MP4/WebM exports. In development.',
  applicationName: 'Audioframe',
  openGraph: {
    title: 'Audioframe - Turn Audio into Video',
    description: 'Your sound. Your artwork. Your story. A browser-based audio-to-video creator, in development.',
    siteName: 'Audioframe',
    type: 'website',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audioframe - Turn Audio into Video',
    description: 'Your sound. Your artwork. Your story. A browser-based audio-to-video creator, in development.'
  }
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        ibmPlexSans.variable,
        spaceGroteskHeading.variable
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
