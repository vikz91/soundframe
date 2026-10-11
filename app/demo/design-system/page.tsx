import type { Metadata } from 'next'
import { DesignSystemShowcase } from './showcase'

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Audioframe component playground: shared tokens, atoms, and composition controls.'
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-editor px-5 py-8 sm:px-8">
      <DesignSystemShowcase />
    </main>
  )
}
