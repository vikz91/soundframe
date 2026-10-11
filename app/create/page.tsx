import type { Metadata } from 'next'
import { PrototypeWorkspace } from '@/components/prototype/workspace'

export const metadata: Metadata = {
  title: 'Create — visual prototype',
  description:
    'Explore Audioframe with sample media, customisable visuals, and simulated export. No real media is processed.'
}

export default function CreatePage() {
  return <PrototypeWorkspace />
}
