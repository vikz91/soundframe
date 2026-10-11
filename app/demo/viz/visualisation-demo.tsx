'use client'

import { useEffect, useRef } from 'react'
import { DemoHeader } from '../_components/demo-header'
import { LocalAudioPlayer } from '../_components/local-audio-player'
import { drawVisualisation, type Visualisation } from './draw-visualisation'

const samples: { style: Visualisation; title: string; description: string }[] = [
  {
    style: 'spectrum',
    title: 'Spectrum',
    description: 'A clean skyline of sound bars, with a soft reflection.'
  },
  {
    style: 'orbit',
    title: 'Orbit',
    description: 'A circular spectrum with room for your artwork at the centre.'
  },
  {
    style: 'electric',
    title: 'Electric',
    description: 'A bright, jagged wave against a quiet midnight grid.'
  }
]
function SampleCanvas({ style, title }: { style: Visualisation; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (context) drawVisualisation(context, style)
  }, [style])
  return (
    <canvas
      ref={canvas}
      width={568}
      height={320}
      role="img"
      aria-label={`${title}: static visualisation sample`}
      className="aspect-[568/320] w-full rounded-2xl bg-[#071b24]"
    />
  )
}

export function VisualisationDemo() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-7 sm:px-8 sm:py-10">
      <DemoHeader label="Visualisation playground" />

      <section
        className="grid gap-8 py-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-14"
        aria-labelledby="demo-title"
      >
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Your track. Your browser.
          </p>
          <h1 id="demo-title" className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            See your sound.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Bring a track and explore three visual directions. Audio plays locally; the canvas previews are static
            samples for now.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-3 py-1.5">No uploads to a server</span>
            <span className="rounded-full border px-3 py-1.5">Up to 7 minutes</span>
          </div>
        </div>

        <LocalAudioPlayer readyMessage="Ready for local playback. Visuals remain static." />
      </section>

      <section className="pb-10" aria-labelledby="visualisations-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="visualisations-title" className="font-heading text-xl font-semibold tracking-tight">
              Three ways to make it yours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">A first look at the visual styles.</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Static mock previews
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {samples.map((sample, index) => (
            <article key={sample.style} className="rounded-3xl border bg-card p-3">
              <SampleCanvas style={sample.style} title={sample.title} />
              <div className="px-2 pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-semibold">{sample.title}</h3>
                  <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{sample.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="mt-auto flex flex-wrap justify-between gap-2 border-t pt-5 text-xs text-muted-foreground">
        <p>A small preview of what comes next.</p>
        <p>Audio reactivity and video export coming later.</p>
      </footer>
    </main>
  )
}
