import type { Metadata } from 'next'
import { VisualisationDemo } from './visualisation-demo'

export const metadata: Metadata = {
  title: 'Visualisation playground',
  description: 'Try local audio playback alongside three static canvas visualisation samples.'
}

export default function DemoPage() {
  return <VisualisationDemo />
}
