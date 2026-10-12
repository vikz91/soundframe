import type { Metadata } from 'next'
import { AudioframeHome } from '@/components/prototype/home'

export const metadata: Metadata = {
  title: 'Audioframe — turn your sound into a story',
  description:
    'Create MP4 or WebM videos from your audio, artwork, and lyrics. Process files locally in your browser and download them to your device.'
}

export default function Home() {
  return <AudioframeHome />
}
