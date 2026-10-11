'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowRightIcon, MusicNotesIcon, PaintBrushIcon, VideoCameraIcon } from '@phosphor-icons/react'
import { Brand } from '@/components/audioframe/brand'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { StatusBadge } from '@/components/audioframe/status'
import { Button } from '@/components/ui/button'
import { defaultPreferences, prototypeLabel } from '@/lib/prototype/fixtures'
import { SampleComposition } from './sample-composition'
import { HelpDialog } from './help-dialog'
import { ThemeToggle } from './theme-toggle'

const steps = [
  { title: 'Bring your sound', text: 'Choose a track and cover artwork.', icon: MusicNotesIcon },
  { title: 'Make it yours', text: 'Shape the colours, title, and lyrics.', icon: PaintBrushIcon },
  { title: 'Share the frame', text: 'Explore the video export experience.', icon: VideoCameraIcon }
]

export function HomePrototype() {
  const [helpOpen, setHelpOpen] = useState(false)
  const helpTrigger = useRef<HTMLButtonElement>(null)
  return (
    <main className="mx-auto w-full max-w-editor flex-1 px-5 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand />
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button ref={helpTrigger} variant="ghost" onClick={() => setHelpOpen(true)}>
            Help
          </Button>
          <Button nativeButton={false} role="link" variant="outline" render={<Link href="/create" />}>
            Try the prototype <ArrowRightIcon aria-hidden="true" />
          </Button>
        </nav>
      </header>
      <div className="mt-6">
        <StatusBadge tone="info" className="max-w-full whitespace-normal">
          {prototypeLabel}
        </StatusBadge>
      </div>
      <section
        aria-labelledby="home-title"
        className="grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20"
      >
        <div>
          <p className="text-sm font-medium text-primary">Your sound. Your artwork. Your story.</p>
          <h1
            id="home-title"
            className="mt-4 font-heading text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"
          >
            Give your sound
            <br />
            <span className="text-primary">a frame.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Turn music, artwork, and lyrics into a visual story. Explore the creation journey with a few ready-made
            samples.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button nativeButton={false} role="link" size="lg" render={<Link href="/create" />}>
              Try the prototype <ArrowRightIcon aria-hidden="true" />
            </Button>
            <Button nativeButton={false} role="link" size="lg" variant="outline" render={<Link href="/demo" />}>
              Explore existing demos
            </Button>
          </div>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
            The intended product processes your files locally in your browser. This prototype uses sample media and
            simulated processing; it creates no video files.
          </p>
        </div>
        <div className="min-w-0 rounded-panel border border-border bg-card p-4 shadow-panel sm:p-6">
          <PreviewFrame label="A sample of what you can create">
            <SampleComposition preferences={defaultPreferences()} />
          </PreviewFrame>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Spectrum · Sample composition</span>
            <span>No audio is playing</span>
          </div>
        </div>
      </section>
      <section aria-labelledby="workflow-title" className="border-t border-border py-8">
        <h2 id="workflow-title" className="font-heading text-2xl font-semibold">
          A simple creative workflow
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map(({ title, text, icon: Icon }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-control shrink-0 items-center justify-center rounded-control bg-selected text-primary">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <div>
                <p className="text-xs font-medium text-primary">0{index + 1}</p>
                <h3 className="mt-1 font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="formats-title" className="rounded-panel border border-border bg-muted/40 p-5 sm:p-6">
        <h2 id="formats-title" className="font-heading text-base font-semibold">
          Planned file support
        </h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-3">
          <p>
            <span className="block font-medium text-foreground">Audio</span>MP3, M4A, WAV, MP4 audio · up to 7 minutes
          </p>
          <p>
            <span className="block font-medium text-foreground">Artwork and lyrics</span>JPG or PNG · plain text or
            timed LRC
          </p>
          <p>
            <span className="block font-medium text-foreground">Video output</span>MP4 or WebM · 568 × 320 at 30 fps
          </p>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 py-8 text-xs text-muted-foreground">
        <p>Audioframe · Built for music, made to stay on your device.</p>
        <Link
          href="/demo/design-system"
          className="inline-flex min-h-control items-center rounded-control text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Component playground
        </Link>
      </footer>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} returnFocus={helpTrigger} />
    </main>
  )
}
