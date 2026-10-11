import type { Metadata } from 'next'
import Link from 'next/link'
import { DemoHeader } from './_components/demo-header'

export const metadata: Metadata = {
  title: 'Demo playground',
  description: 'Explore local audio visualisations and create cover artwork with optional text.'
}

export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-7 sm:px-8 sm:py-10">
      <DemoHeader label="Demo playground" index />
      <section className="py-12 sm:py-16" aria-labelledby="demo-title">
        <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          A little room to experiment
        </p>
        <h1 id="demo-title" className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Find your frame.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          Try a visual direction for your next track. Everything happens in your browser, using files from your device.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            href="/demo/viz"
            className="group rounded-3xl border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <div
              className="flex aspect-[4/3] items-end justify-center gap-2 overflow-hidden rounded-2xl bg-[#071b24] px-8 pb-12"
              aria-hidden="true"
            >
              {[32, 48, 70, 54, 85, 65, 95, 76, 52, 68, 43, 27].map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height}%` }}
                  className="w-4 rounded-t-lg bg-linear-to-t from-teal-700 to-teal-300 shadow-[0_0_18px_#5eead430]"
                />
              ))}
            </div>
            <div className="px-2 py-5">
              <p className="text-xs font-medium text-primary">01 / STATIC CANVAS SAMPLES</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">
                Visualisations <span className="inline-block transition-transform group-hover:translate-x-1">↗</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Spectrum, Orbit, and Electric. Bring a track for local playback.
              </p>
            </div>
          </Link>
          <Link
            href="/demo/cover"
            className="group rounded-3xl border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <div
              className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-linear-to-br from-[#204954] via-[#15323c] to-[#071b24] p-8 text-white"
              aria-hidden="true"
            >
              <div className="absolute -top-10 right-2 size-64 rounded-full border border-teal-200/20 bg-teal-300/10" />
              <p className="relative text-xs tracking-[0.2em] text-teal-200">YOUR ARTIST</p>
              <p className="relative mt-2 font-heading text-3xl font-semibold sm:text-4xl">
                A moment
                <br />
                in colour.
              </p>
              <p className="relative mt-3 text-xs text-white/60">Your album · Your story</p>
            </div>
            <div className="px-2 py-5">
              <p className="text-xs font-medium text-primary">02 / 4:3 COVER COMPOSER</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">
                Cover artwork <span className="inline-block transition-transform group-hover:translate-x-1">↗</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add artwork and optional text, then listen below your finished cover.
              </p>
            </div>
          </Link>
        </div>
      </section>
      <footer className="mt-auto border-t pt-5 text-xs text-muted-foreground">
        Local files. Early ideas. No video export in these demos yet.
      </footer>
    </main>
  )
}
