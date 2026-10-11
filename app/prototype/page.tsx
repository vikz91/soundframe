import type { Metadata } from 'next'
import { PrototypeWorkspace } from '@/components/prototype/workspace'

export const metadata: Metadata = {
  title: 'Sample prototype',
  description: 'Explore Audioframe with sample media and simulated export. No real media is processed.'
}

export default function PrototypePage() {
  return <PrototypeWorkspace />
}
