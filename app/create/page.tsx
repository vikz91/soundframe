import type { Metadata } from 'next'
import { MediaWorkspace } from '@/components/editor/workspace'

export const metadata: Metadata = {
  title: 'Create — local media editor',
  description:
    'Preview your local audio and artwork with customisable visuals and lyrics. Video export is in development.'
}

export default function CreatePage() {
  return <MediaWorkspace />
}
