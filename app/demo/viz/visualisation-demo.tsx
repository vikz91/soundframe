'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/hooks/use-animation-frame'
import { Button } from '@/components/ui/button'
import { DemoHeader } from '../_components/demo-header'
import { LocalAudioPlayer } from '../_components/local-audio-player'
import { drawVisualisation, type Visualisation } from './draw-visualisation'
import { LocalAudioAnalyser } from './audio-analysis'

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

export function VisualisationDemo() {
  const [speed, setSpeed] = useState(1)
  const [randomness, setRandomness] = useState(35)
  const [seed, setSeed] = useState(1)
  const [running, setRunning] = useState(true)
  const [reactive, setReactive] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const canvases = useRef<(HTMLCanvasElement | null)[]>([])
  const phase = useRef(0)
  const analysis = useRef<LocalAudioAnalyser | null>(null)

  const bindAudio = useCallback((element: HTMLAudioElement | null) => {
    analysis.current?.dispose()
    analysis.current = element ? new LocalAudioAnalyser(element) : null
    setReactive(false)
    setAnalysisError(null)
  }, [])
  const startAudio = useCallback(() => {
    const current = analysis.current
    if (!current) return
    void current
      .start()
      .then((started) => {
        if (analysis.current === current) {
          setReactive(started)
          setAnalysisError(null)
        }
      })
      .catch(() => {
        if (analysis.current === current) {
          setReactive(false)
          setAnalysisError('Audio analysis could not start. Try playing the track again.')
        }
      })
  }, [])
  const pauseAudio = useCallback(() => setReactive(false), [])
  useEffect(
    () => () => {
      analysis.current?.dispose()
      analysis.current = null
    },
    []
  )

  useAnimationFrame((deltaSeconds) => {
    phase.current += deltaSeconds * speed
    const audio = analysis.current?.read() ?? null
    canvases.current.forEach((canvas, index) => {
      const context = canvas?.getContext('2d')
      if (context)
        drawVisualisation(context, samples[index].style, {
          time: phase.current,
          randomness: randomness / 100,
          seed,
          audio
        })
    })
  }, running)

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
            Explore three animated canvases. Play a track to make them respond to your audio, or try the idle preview
            without a file.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-3 py-1.5">No uploads to a server</span>
            <span className="rounded-full border px-3 py-1.5">Up to 7 minutes</span>
          </div>
        </div>

        <div>
          <LocalAudioPlayer
            readyMessage={
              reactive
                ? running
                  ? 'Playing locally. Visuals react to your track.'
                  : 'Audio keeps playing while visuals are paused.'
                : 'Press play to make the canvases react to your track.'
            }
            onAudioElement={bindAudio}
            onAudioPlay={startAudio}
            onAudioPause={pauseAudio}
          />
          {analysisError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {analysisError}
            </p>
          ) : null}
        </div>
      </section>

      <section className="pb-10" aria-labelledby="visualisations-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="visualisations-title" className="font-heading text-xl font-semibold tracking-tight">
              Three ways to make it yours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Speed and randomness apply to all three canvases.</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            {!running ? 'Visuals paused' : reactive ? 'Reacting to your audio' : 'Animated idle preview'}
          </span>
        </div>
        <section className="mb-6 rounded-3xl border bg-card p-5 sm:p-6" aria-label="Animation controls">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex items-center justify-between text-sm">
                <label htmlFor="viz-speed" className="font-medium">
                  Speed
                </label>
                <output htmlFor="viz-speed" className="font-mono text-primary">
                  {speed.toFixed(2)}×
                </output>
              </div>
              <input
                id="viz-speed"
                type="range"
                min={0.25}
                max={3}
                step={0.25}
                value={speed}
                className="block w-full accent-primary"
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Slow drift to quick motion. Audio speed stays the same.
              </p>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between text-sm">
                <label htmlFor="viz-randomness" className="font-medium">
                  Randomness
                </label>
                <output htmlFor="viz-randomness" className="font-mono text-primary">
                  {randomness}%
                </output>
              </div>
              <input
                id="viz-randomness"
                type="range"
                min={0}
                max={100}
                step={1}
                value={randomness}
                className="block w-full accent-primary"
                onChange={(event) => setRandomness(Number(event.target.value))}
              />
              <p className="mt-2 text-xs text-muted-foreground">Smooth patterns to unpredictable variation.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
              <Button variant="outline" aria-pressed={!running} onClick={() => setRunning((current) => !current)}>
                {running ? 'Pause visuals' : 'Resume visuals'}
              </Button>
              <Button variant="outline" disabled={randomness === 0} onClick={() => setSeed((current) => current + 1)}>
                Shuffle pattern
              </Button>
            </div>
          </div>
        </section>
        <div className="grid gap-5 md:grid-cols-3">
          {samples.map((sample, index) => (
            <article key={sample.style} className="rounded-3xl border bg-card p-3">
              <canvas
                ref={(element) => {
                  canvases.current[index] = element
                }}
                width={568}
                height={320}
                role="img"
                aria-label={`${sample.title}: animated visualisation`}
                className="aspect-[568/320] w-full rounded-2xl bg-[#071b24]"
              />
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
        <p>Canvas animation and audio analysis stay on your device.</p>
        <p>Video export coming later.</p>
      </footer>
    </main>
  )
}
