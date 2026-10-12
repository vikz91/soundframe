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
const localHelpSections = [
  {
    key: 'files',
    title: 'Choose audio and artwork',
    text: 'Open Create a video and choose MP3, M4A, WAV, or MP4 audio up to seven minutes, plus JPG or PNG artwork. MP4 contributes its audio track only. Your files are processed locally in your browser.'
  },
  {
    key: 'create',
    title: 'Make your composition',
    text: 'Choose Cover, Spectrum, or Lighting, adjust colours, and add song details. Plain lyrics display as static text; timed LRC lyrics follow the audio timeline. Play or seek your track to preview the composition. You can import and export your preferences as a JSON settings file.'
  },
  {
    key: 'export',
    title: 'Export and download',
    text: 'Choose MP4 or WebM and either 320p (568 × 320) or 720p (1280 × 720), both at 30 fps. 720p offers more detail but takes longer to export. Follow progress, cancel if needed, or retry after a failure. Play the generated video and download it to your device. Editing, cancellation, and failure preserve your previous successful video until replacement or expiry.'
  },
  {
    key: 'retention',
    title: 'Keep the workspace open',
    text: 'Keep the editor open and in the foreground during export. Your generated video is available for repeat downloads for one hour after completion, until Clear project or leaving the editor. Downloads do not extend that time or get deleted from your device. Reloading resets the project. Short desktop exports have been tested; seven-minute exports and mobile performance are still being validated.'
  }
]
export function HelpDialog({
  open,
  onOpenChange,
  topic,
  returnFocus,
  mode = 'prototype'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic?: string
  returnFocus?: RefObject<HTMLElement | null>
  mode?: 'prototype' | 'local'
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const guidance = mode === 'local' ? localHelpSections : helpSections
  const sections = topic
    ? [...guidance.filter((item) => item.key === topic), ...guidance.filter((item) => item.key !== topic)]
    : guidance
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
            {mode === 'local'
              ? 'Create and download videos locally with your own audio and artwork.'
              : 'Sample media and simulated processing. Choose Create a video on the homepage to use your own files.'}
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
