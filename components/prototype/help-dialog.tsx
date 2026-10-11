'use client'

import { useRef, type RefObject } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const helpSections = [
  {
    key: 'files',
    title: 'Choose audio and artwork',
    text: 'In this prototype, choose the ready-made samples. The intended product accepts MP3, M4A, WAV, or MP4 audio up to seven minutes, plus JPG or PNG artwork. MP4 contributes its audio track only.'
  },
  {
    key: 'create',
    title: 'Make your composition',
    text: 'Try Cover, Spectrum, or Lighting, adjust colours, and add song details. Plain lyrics display as text. The supplied LRC sample follows three predefined cues; edited text is shown statically in this prototype.'
  },
  {
    key: 'export',
    title: 'Explore export and download',
    text: 'Exports are simulated and finish in about eight seconds. MP4 and WebM represent the planned output formats at 568 × 320 and 30 fps. Download and settings actions do not save any files.'
  },
  {
    key: 'retention',
    title: 'Keep the workspace open',
    text: 'The sample result is available for one hour after completion, until you clear the project or leave this page. A reload resets the session. The intended browser encoder needs the app to stay open in the foreground while processing.'
  }
]
export function HelpDialog({
  open,
  onOpenChange,
  topic,
  returnFocus
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic?: string
  returnFocus?: RefObject<HTMLElement | null>
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const sections = topic
    ? [...helpSections.filter((item) => item.key === topic), ...helpSections.filter((item) => item.key !== topic)]
    : helpSections
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={titleRef}
        finalFocus={returnFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader className="pr-8">
          <DialogTitle ref={titleRef} tabIndex={-1}>
            A little guidance
          </DialogTitle>
          <DialogDescription>
            Sample media and simulated processing. The real media pipeline is separate implementation work.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="font-heading font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.text}</p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
