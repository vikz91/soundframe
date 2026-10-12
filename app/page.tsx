import type { Metadata } from 'next'
import { MediaWorkspace } from '@/components/editor/workspace'

export const metadata: Metadata = {
  title: 'Create — local media editor',
  description: 'Turn local audio and artwork into MP4 or WebM videos with customisable visuals and lyrics.'
}

export default function Home() {
  return <MediaWorkspace />
}
