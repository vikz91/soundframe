import type { Metadata } from 'next'
import { VisualisationDemo } from './visualisation-demo'

export const metadata: Metadata = {
  title: 'Visualisation playground',
  description:
    'Try local audio playback alongside three animated, audio-reactive canvases with speed and randomness controls.'
}

export default function DemoPage() {
  return <VisualisationDemo />
}
