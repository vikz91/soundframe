'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DemoHeader } from '../_components/demo-header'
import { LocalAudioPlayer } from '../_components/local-audio-player'
import { drawCover, type CoverDetails } from './draw-cover'

const fields: { key: keyof CoverDetails; label: string; placeholder: string }[] = [
  { key: 'title', label: 'Song title', placeholder: 'A moment in colour' },
  { key: 'artist', label: 'Artist', placeholder: 'Your artist name' },
  { key: 'album', label: 'Album', placeholder: 'Your album name' },
  { key: 'website', label: 'Website or extra text', placeholder: 'yourwebsite.com' }
]
const emptyDetails: CoverDetails = { title: '', artist: '', album: '', website: '' }

export function CoverDemo() {
  const [details, setDetails] = useState(emptyDetails)
  const [artwork, setArtwork] = useState<{ image: HTMLImageElement; name: string } | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reader = useRef<FileReader | null>(null)
  const pendingImage = useRef<HTMLImageElement | null>(null)
  const downloadURL = useRef<string | null>(null)

  const release = useCallback(() => {
    if (reader.current) {
      reader.current.onload = null
      reader.current.onerror = null
      reader.current.abort()
      reader.current = null
    }
    if (pendingImage.current) {
      pendingImage.current.onload = null
      pendingImage.current.onerror = null
      pendingImage.current.src = ''
      pendingImage.current = null
    }
  }, [])
  useEffect(
    () => () => {
      release()
      setReading(false)
    },
    [release]
  )
  useEffect(
    () => () => {
      if (downloadURL.current) URL.revokeObjectURL(downloadURL.current)
    },
    []
  )

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    let active = true
    const paint = () => {
      if (active) drawCover(context, artwork?.image ?? null, details, getComputedStyle(element).fontFamily)
    }
    paint()
    void document.fonts.ready.then(paint)
    return () => {
      active = false
    }
  }, [artwork, details])

  function clearArtwork(clearInput = true) {
    release()
    setArtwork(null)
    setReading(false)
    setError(null)
    if (clearInput && input.current) input.current.value = ''
  }

  function readArtwork(file: File) {
    clearArtwork(false)
    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      setError('Choose a JPG or PNG image.')
      return
    }
    if (!file.size) {
      setError('This image is empty. Choose another file.')
      return
    }
    const current = new FileReader()
    reader.current = current
    setReading(true)
    current.onerror = () => {
      if (reader.current !== current) return
      reader.current = null
      setReading(false)
      setError('We could not read this image. Please try another file.')
    }
    current.onload = () => {
      if (reader.current !== current) return
      reader.current = null
      if (typeof current.result !== 'string') {
        setReading(false)
        setError('We could not read this image.')
        return
      }
      const image = new Image()
      pendingImage.current = image
      image.onload = () => {
        if (pendingImage.current !== image) return
        pendingImage.current = null
        image.onload = null
        image.onerror = null
        setArtwork({ image, name: file.name })
        setReading(false)
      }
      image.onerror = () => {
        if (pendingImage.current !== image) return
        release()
        setReading(false)
        setError('This image cannot be opened. Try another JPG or PNG.')
      }
      image.src = current.result
    }
    current.readAsDataURL(file)
  }

  function downloadCover() {
    if (!canvas.current) return
    canvas.current.toBlob((blob) => {
      if (!blob || !canvas.current) return
      if (downloadURL.current) URL.revokeObjectURL(downloadURL.current)
      downloadURL.current = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'audioframe-cover.png'
      link.href = downloadURL.current
      document.body.append(link)
      link.click()
      link.remove()
    }, 'image/png')
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-7 sm:px-8 sm:py-10">
      <DemoHeader label="Cover art playground" />
      <section className="pt-10 pb-8 sm:pt-12" aria-labelledby="cover-demo-title">
        <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">Make room for your artwork</p>
        <h1 id="cover-demo-title" className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Give your track a cover.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Add an image, a few words, or just a track. Every field is optional. Your 4:3 cover updates as you go.
        </p>
      </section>

      <div className="grid items-start gap-7 pb-10 lg:grid-cols-[0.85fr_1.3fr]">
        <form
          className="rounded-3xl border bg-card p-6 sm:p-7"
          aria-label="Optional cover details"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-semibold">The details</h2>
            <span className="text-xs text-muted-foreground">All optional</span>
          </div>
          <label htmlFor="cover-art" className="mb-2 block text-sm font-medium">
            Cover artwork
          </label>
          <input
            ref={input}
            id="cover-art"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="block w-full min-w-0 rounded-xl border bg-background p-3 text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-medium file:text-secondary-foreground"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) readArtwork(file)
            }}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            JPG or PNG. Images are cropped from the centre to fit 4:3.
          </p>
          <div role="status" aria-live="polite" className="mt-3 text-xs text-muted-foreground">
            {reading
              ? 'Reading your image locally…'
              : artwork
                ? `${artwork.name} is ready.`
                : 'Using the default background.'}
          </div>
          {artwork || reading ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => clearArtwork()}>
              {reading ? 'Cancel image' : 'Remove artwork'}
            </Button>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-6 space-y-5">
            {fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={`cover-${field.key}`} className="mb-2 block text-sm font-medium">
                  {field.label}
                </label>
                <input
                  id={`cover-${field.key}`}
                  type="text"
                  value={details[field.key]}
                  maxLength={200}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => {
              clearArtwork()
              setDetails(emptyDetails)
            }}
          >
            Reset cover
          </Button>
        </form>

        <section className="min-w-0 space-y-5" aria-label="Cover output and audio playback">
          <div className="rounded-3xl border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>YOUR COVER</span>
              <span>4:3 · 1200 × 900</span>
            </div>
            <canvas
              ref={canvas}
              width={1200}
              height={900}
              role="img"
              aria-label={`Cover artwork${details.title ? ` for ${details.title}` : ''}${details.artist ? ` by ${details.artist}` : ''}`}
              className="aspect-[4/3] w-full rounded-2xl bg-[#15323c] font-heading"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 pb-1">
              <p className="text-xs text-muted-foreground">A still cover, made on your device.</p>
              <Button variant="outline" size="sm" onClick={downloadCover} disabled={reading}>
                Download PNG
              </Button>
            </div>
          </div>
          <LocalAudioPlayer />
          <p className="text-center text-xs text-muted-foreground">
            Audio is optional too. Choose a track up to 7 minutes.
          </p>
        </section>
      </div>
      <footer className="mt-auto border-t pt-5 text-xs text-muted-foreground">
        Your images and audio stay in this browser. No video export in this demo yet.
      </footer>
    </main>
  )
}
