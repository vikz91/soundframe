import type { Metadata } from 'next'
import { CoverDemo } from './cover-demo'

export const metadata: Metadata = {
  title: 'Cover art playground',
  description: 'Compose a 4:3 cover with optional artwork and text, alongside local audio playback.'
}

export default function CoverPage() {
  return <CoverDemo />
}
