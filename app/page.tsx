import Image from 'next/image'
import Link from 'next/link'

const steps = [
  { title: 'Bring your sound', description: 'Start with an audio track and your cover art.' },
  { title: 'Make it yours', description: 'Add a title, lyrics, and visuals that move with your music.' },
  { title: 'Share the frame', description: 'Export a video with your audio in MP4 or WebM.' }
]

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 sm:px-10 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Audioframe home"
          className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image src="/audioframe-logo.svg" alt="" width={44} height={44} priority />
          <span className="font-heading text-2xl font-semibold tracking-tight">Audioframe</span>
        </Link>
        <span className="whitespace-nowrap rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          In development
        </span>
      </header>

      <section className="flex flex-1 flex-col items-start justify-center py-20 sm:py-28" aria-labelledby="intro-title">
        <p className="mb-5 text-sm font-medium tracking-wide text-primary">Your sound. Your artwork. Your story.</p>
        <h1
          id="intro-title"
          className="max-w-3xl font-heading text-5xl font-semibold leading-tight tracking-tight sm:text-7xl"
        >
          Turn audio into video with <span className="text-primary">Audioframe.</span>
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
          We’re building a simple way to turn music, cover art, and lyrics into videos with audio-reactive visuals,
          right in your browser.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Designed for private, local processing, free MP4 and WebM exports, and capable desktop and mobile browsers.
          The editor and export experience are coming next.
        </p>
        <a
          href="https://github.com/vikz91/soundframe"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Follow the project on GitHub{' '}
          <span aria-hidden="true" className="ml-2">
            ↗
          </span>
        </a>
      </section>

      <section aria-labelledby="workflow-title" className="border-t border-border pt-8">
        <h2 id="workflow-title" className="mb-6 font-heading text-lg font-semibold">
          A simple creative workflow
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium text-primary"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <footer className="mt-10 text-xs leading-5 text-muted-foreground">
        Audioframe · Built for music, made to stay on your device.
      </footer>
    </main>
  )
}
