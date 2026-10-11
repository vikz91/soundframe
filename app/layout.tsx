import { cn } from '@/lib/utils'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import './toasts.css'

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

const socialPreview = {
  url: '/audioframe-social-preview.png',
  width: 1200,
  height: 630,
  alt: 'Audioframe — Turn audio into video. Concept preview with album artwork and a colorful audio spectrum.'
}

export const metadata: Metadata = {
  metadataBase: new URL(deploymentHost ? `https://${deploymentHost}` : 'http://localhost:3000'),
  title: {
    default: 'Audioframe - Turn Audio into Video',
    template: '%s | Audioframe'
  },
  description:
    'Meet Audioframe: turn music, cover art, and lyrics into videos with audio-reactive visuals. Private browser processing and MP4/WebM exports. In development.',
  applicationName: 'Audioframe',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/audioframe-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/audioframe-icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
  },
  openGraph: {
    title: 'Audioframe - Turn Audio into Video',
    description: 'Your sound. Your artwork. Your story. A browser-based audio-to-video creator, in development.',
    siteName: 'Audioframe',
    type: 'website',
    locale: 'en_US',
    images: [socialPreview]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audioframe - Turn Audio into Video',
    description: 'Your sound. Your artwork. Your story. A browser-based audio-to-video creator, in development.',
    images: [socialPreview]
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
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
