import type { Metadata } from 'next'
import { HomePrototype } from '@/components/prototype/home'

export const metadata: Metadata = {
  title: 'Audioframe — turn your sound into a story',
  description: 'Explore the Audioframe prototype: audio, artwork, lyrics, and a simulated video creation workflow.'
}

export default function Home() {
  return <HomePrototype />
}
