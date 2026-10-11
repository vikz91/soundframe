'use client'

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, SunIcon, MoonIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Brand, PrivacyNote } from '@/components/audioframe/brand'
import { StatusBadge, Notice } from '@/components/audioframe/status'
import { WorkflowStepper, type WorkflowStep } from '@/components/audioframe/workflow-stepper'
import { TextField, TextareaField } from '@/components/audioframe/field'
import { ModePicker, ColourPicker, RangeField, TypefaceSelect } from '@/components/audioframe/style-controls'
import { MediaFileCard } from '@/components/audioframe/media-file-card'
import { PlaybackControls } from '@/components/audioframe/playback-controls'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { EditorShell, EditorHeader } from '@/components/audioframe/editor-shell'
import { SongDetailsFields, LyricsControls, type LyricsMode } from '@/components/audioframe/text-controls'
import {
  ExportFormatPicker,
  ExportProgress,
  DownloadCard,
  ExportRecovery,
  type ExportStage
} from '@/components/audioframe/export-controls'
import { ConfirmDialog } from '@/components/audioframe/confirm-dialog'
import { PresetActions } from '@/components/audioframe/preset-actions'
import { ToastExamples } from '@/components/audioframe/toast-examples'
import {
  accentColours,
  backgroundColours,
  typographyClasses,
  videoOutputLabel,
  type VisualMode,
  type VideoFormat,
  type Typography
} from '@/lib/audioframe-design'
import { cn } from '@/lib/utils'

const tokenSamples = [
  ['Primary', '--primary'],
  ['Background', '--background'],
  ['Card', '--card'],
  ['Muted', '--muted'],
  ['Selected', '--selected'],
  ['Success', '--success'],
  ['Warning', '--warning'],
  ['Danger', '--destructive'],
  ['Media', '--media'],
  ['Media accent', '--media-accent']
] as const
const bars = [
  24, 44, 67, 35, 58, 88, 46, 72, 38, 55, 78, 50, 30, 66, 94, 53, 39, 71, 46, 31, 60, 82, 43, 25, 51, 65, 36, 20
]
type ExportState = 'settings' | 'running' | 'ready' | 'error' | 'cancelled'
function Section({
  id,
  title,
  description,
  children
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-6">
      <div>
        <h2 id={`${id}-title`} className="font-heading text-section-title font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Artwork({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Abstract teal demonstration artwork"
      className={cn(
        'relative aspect-square overflow-hidden bg-linear-to-br from-media-accent via-media-glow to-media',
        className
      )}
    >
      <div className="absolute -top-1/4 left-1/4 size-full rotate-45 rounded-full border-8 border-media-accent/30" />
      <div className="absolute top-1/3 -left-1/3 size-full rounded-full border-8 border-media-foreground/10" />
    </div>
  )
}

function SampleComposition({
  mode,
  accent,
  background,
  typeface,
  sensitivity,
  title,
  artist
}: {
  mode: VisualMode
  accent: string
  background: string
  typeface: Typography
  sensitivity: number
  title: string
  artist: string
}) {
  const accentToken = accentColours.find((item) => item.value === accent)?.token ?? '--primary'
  const backgroundToken = backgroundColours.find((item) => item.value === background)?.token ?? '--media'
  const style = {
    backgroundColor: `var(${backgroundToken})`,
    '--composition-accent': `var(${accentToken})`
  } as CSSProperties
  return (
    <div style={style} className={cn('flex h-full flex-col justify-between p-5 sm:p-8', typographyClasses[typeface])}>
      <div className="relative z-10 flex items-center gap-4">
        <Artwork className={mode === 'cover' ? 'w-1/3 max-w-48 rounded-preview' : 'w-16 rounded-control sm:w-20'} />
        <div className="min-w-0">
          <p className="text-base font-semibold sm:text-2xl">{title || 'Your song title'}</p>
          <p className="mt-1 text-xs text-media-muted sm:text-sm">{artist || 'Your artist'}</p>
          <p className="mt-2 text-xs text-media-muted">Illustrative composition</p>
        </div>
      </div>
      {mode === 'spectrum' ? (
        <div aria-hidden="true" className="flex h-1/3 items-end justify-between gap-1">
          {bars.map((height, index) => (
            <span
              key={index}
              className="min-w-0 flex-1 rounded-t-sm bg-(--composition-accent)"
              style={{ height: `${height * (0.4 + sensitivity / 160)}%` }}
            />
          ))}
        </div>
      ) : mode === 'lighting' ? (
        <div aria-hidden="true" className="mx-auto h-1/3 w-2/3 rounded-full bg-(--composition-accent)/30 blur-2xl" />
      ) : (
        <p className="text-sm text-media-muted">Night Studies</p>
      )}
    </div>
  )
}

export function DesignSystemShowcase() {
  const [dark, setDark] = useState(false)
  const [step, setStep] = useState<WorkflowStep>('create')
  const [mode, setMode] = useState<VisualMode>('spectrum')
  const [accent, setAccent] = useState('teal')
  const [background, setBackground] = useState('midnight')
  const [typeface, setTypeface] = useState<Typography>('sans')
  const [sensitivity, setSensitivity] = useState(60)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(84)
  const [volume, setVolume] = useState(0.7)
  const [details, setDetails] = useState({
    title: 'A moment in colour',
    artist: 'Your Artist',
    album: 'Night Studies',
    website: ''
  })
  const [lyricsMode, setLyricsMode] = useState<LyricsMode>('lrc')
  const [lyrics, setLyrics] = useState('[00:12.00] Let the colour carry you\n[00:18.50] Through the quiet of the night')
  const [lyricFilename, setLyricFilename] = useState<string>()
  const [audio, setAudio] = useState<{ name: string; detail: string }>()
  const [artwork, setArtwork] = useState<{ name: string; detail: string }>()
  const [format, setFormat] = useState<VideoFormat>('mp4')
  const [exportState, setExportState] = useState<ExportState>('settings')
  const [exportStage, setExportStage] = useState<ExportStage>('render')
  const [message, setMessage] = useState('')

  // Theme the document so portalled shadcn controls inherit the same tokens.
  // Restore the previous class when leaving this isolated playground.
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains('dark')
    return () => {
      document.documentElement.classList.toggle('dark', wasDark)
    }
  }, [])
  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }
  const preview = (
    <SampleComposition
      mode={mode}
      accent={accent}
      background={background}
      typeface={typeface}
      sensitivity={sensitivity}
      title={details.title}
      artist={details.artist}
    />
  )
  const playback = (
    <PlaybackControls
      playing={playing}
      currentTime={currentTime}
      duration={222}
      volume={volume}
      onPlayPause={() => setPlaying((value) => !value)}
      onSeek={setCurrentTime}
      onVolumeChange={setVolume}
    />
  )
  function showExport() {
    setExportState('running')
    setStep('export')
    setMessage('Illustrative export state. This playground does not encode media.')
  }

  return (
    <TooltipProvider>
      <div className="space-y-12">
        <header className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Brand />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={toggleTheme} aria-pressed={dark}>
                {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
                {dark ? 'Light theme' : 'Dark theme'}
              </Button>
              <Link
                href="/demo"
                className="inline-flex min-h-control items-center rounded-control px-3 text-sm text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                Back to demos
              </Link>
            </div>
          </div>
          <div>
            <Badge variant="secondary">COMPONENT PLAYGROUND</Badge>
            <h1 className="mt-4 font-heading text-page-title font-semibold tracking-tight">
              A shared language for every frame.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Tokens, shadcn atoms, and reusable Audioframe controls for the five screen concepts. Inputs and actions
              are interactive UI examples; they do not validate, play, or export media.
            </p>
          </div>
          <nav aria-label="Component sections" className="flex flex-wrap gap-2">
            {['tokens', 'atoms', 'files', 'editor', 'export'].map((section) => (
              <a
                key={section}
                href={`#${section}`}
                className="inline-flex min-h-control items-center rounded-full border px-4 text-sm capitalize hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                {section}
              </a>
            ))}
          </nav>
        </header>
        <Section
          id="tokens"
          title="01 / Design tokens"
          description="Semantic colours with light and dark values. Radius, sizing, layout, type, shadows, and motion are shared by the primitives and composed components."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tokenSamples.map(([label, token]) => (
              <div key={token} className="overflow-hidden rounded-control border bg-card">
                <div className="h-16 border-b" style={{ backgroundColor: `var(${token})` }} />
                <div className="p-3">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{token}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Shape & sizing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Controls: 44 px · large: 48 px</p>
                <p>Control, panel, and preview radii</p>
                <p>Tailwind spacing scale: 4 px base</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Typography & layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="font-heading">Space Grotesk headings</p>
                <p>IBM Plex Sans body · Geist Mono values</p>
                <p>Responsive 1280 px editor · 320 px inspector</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Motion & elevation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Subtle panel and control shadows</p>
                <p>Shared 160 ms transition duration</p>
                <p>Respects reduced motion</p>
              </CardContent>
            </Card>
          </div>
        </Section>
        <Separator />
        <Section
          id="atoms"
          title="02 / Atoms & feedback"
          description="Button variants, icon actions, accessible form fields, badges, notices, loading, and confirmation."
        >
          <Card>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setMessage('Primary action invoked.')}>
                  Continue <ArrowRightIcon aria-hidden="true" />
                </Button>
                <Button variant="outline" onClick={() => setMessage('Secondary action invoked.')}>
                  Replace artwork
                </Button>
                <Button variant="secondary" onClick={() => setMessage('Secondary variant invoked.')}>
                  Import settings
                </Button>
                <Button variant="ghost" onClick={() => setMessage('Ghost action invoked.')}>
                  Back to editor
                </Button>
                <Button variant="destructive" onClick={() => setMessage('Destructive action example invoked.')}>
                  Remove file
                </Button>
                <Button disabled>Checking file…</Button>
                <Button variant="link" onClick={() => setMessage('Link variant invoked.')}>
                  Learn more
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['neutral', 'info', 'success', 'warning', 'danger'] as const).map((tone) => (
                  <StatusBadge key={tone} tone={tone}>
                    {tone}
                  </StatusBadge>
                ))}
              </div>
              <PrivacyNote />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Song title"
                  defaultValue="A moment in colour"
                  hint="Optional text shown in your video."
                />
                <TextField label="Invalid field" defaultValue="Example value" error="Example validation message." />
                <TextField label="Disabled field" value="Disabled example" disabled />
                <TextareaField
                  label="Plain text"
                  defaultValue="Let the colour carry you"
                  hint="A reusable textarea with associated help text."
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <ConfirmDialog
                  trigger="Clear example project"
                  title="Clear this project?"
                  description="Remove this example’s selected files. Files already downloaded remain on your device."
                  confirmLabel="Clear project"
                  onConfirm={() => {
                    setAudio(undefined)
                    setArtwork(undefined)
                    setMessage('Example project cleared.')
                  }}
                />
                <Skeleton className="h-control w-40" />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Notice title="Local processing">Media stays on your device.</Notice>
            <Notice tone="success" title="Ready for preview">
              Your selected media passed validation.
            </Notice>
            <Notice tone="warning" title="Keep the tab open">
              Export runs while this page stays in the foreground.
            </Notice>
            <Notice tone="danger" title="Track is too long">
              Choose a track that is 7 minutes or shorter.
            </Notice>
          </div>
          {message ? <Notice title="Playground action">{message}</Notice> : null}
          <Card>
            <CardHeader>
              <CardTitle>Toast notifications</CardTitle>
              <CardDescription>Brief feedback with shared colours, typography, icons, and actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ToastExamples />
            </CardContent>
          </Card>
        </Section>
        <Separator />
        <Section
          id="files"
          title="03 / File selection"
          description="Local pickers with empty, selected, checking, error, and disabled states. The parent owns validation and file resource lifecycles."
        >
          <PresetActions
            onImport={(file) => setMessage(`Selected ${file.name}. Preset validation remains editor work.`)}
            onExport={() => setMessage('Export settings callback invoked. No media is included in presets.')}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <MediaFileCard
              kind="audio"
              selected={audio}
              onFileChange={(file) => {
                setAudio({
                  name: file.name,
                  detail: `${(file.size / 1024 / 1024).toFixed(2)} MB · Not validated in playground`
                })
                setMessage('Selected a local audio file. No processing performed.')
              }}
              onRemove={() => setAudio(undefined)}
            />
            <MediaFileCard
              kind="artwork"
              selected={artwork ? { ...artwork, thumbnail: <Artwork className="w-full" /> } : undefined}
              onFileChange={(file) => setArtwork({ name: file.name, detail: 'Selected locally · Placeholder preview' })}
              onRemove={() => setArtwork(undefined)}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <MediaFileCard
              kind="audio"
              checking
              selected={{ name: 'example.mp3', detail: 'Checking local media…' }}
              onFileChange={() => {}}
            />
            <MediaFileCard
              kind="audio"
              selected={{ name: 'long-track.mp3', detail: '8:12 · Example rejected input' }}
              error="Choose audio up to 7:00."
              onFileChange={() => setMessage('Error-state replacement action invoked.')}
            />
            <MediaFileCard kind="artwork" disabled onFileChange={() => {}} />
          </div>
        </Section>
        <Separator />
        <Section
          id="editor"
          title="04 / Composition controls"
          description="Responsive editor shell, steps, mode selection, colour swatches, sliders, text, lyrics, preview, and playback UI."
        >
          <EditorShell
            header={
              <EditorHeader
                project={
                  <>
                    <p className="font-semibold">{details.title || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">{details.artist}</p>
                  </>
                }
                steps={<WorkflowStepper current={step} onStepChange={setStep} />}
                actions={
                  <Button onClick={showExport}>
                    Export video <ArrowRightIcon aria-hidden="true" />
                  </Button>
                }
              />
            }
            inspector={
              <Card>
                <CardContent>
                  <Tabs defaultValue="style">
                    <TabsList variant="line" className="w-full">
                      <TabsTrigger value="style">Style</TabsTrigger>
                      <TabsTrigger value="text">Text</TabsTrigger>
                      <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="style" className="space-y-6 pt-6">
                      <ModePicker value={mode} onValueChange={setMode} />
                      <ColourPicker
                        label="Accent colour"
                        options={accentColours}
                        value={accent}
                        onValueChange={setAccent}
                      />
                      <ColourPicker
                        label="Background"
                        options={backgroundColours}
                        value={background}
                        onValueChange={setBackground}
                      />
                      <RangeField
                        label="Sensitivity"
                        value={sensitivity}
                        onValueChange={setSensitivity}
                        hint="Adjust how strongly visuals respond to the track."
                      />
                      <TypefaceSelect value={typeface} onValueChange={setTypeface} />
                    </TabsContent>
                    <TabsContent value="text" className="pt-6">
                      <SongDetailsFields value={details} onValueChange={setDetails} />
                    </TabsContent>
                    <TabsContent value="lyrics" className="pt-6">
                      <LyricsControls
                        mode={lyricsMode}
                        onModeChange={(next) => {
                          setLyricsMode(next)
                          setLyrics('')
                          setLyricFilename(undefined)
                        }}
                        text={lyrics}
                        onTextChange={(text) => {
                          setLyrics(text)
                          if (!text) setLyricFilename(undefined)
                        }}
                        onFileChange={(file) => {
                          setLyricFilename(file.name)
                          setMessage('Selected an LRC file. Parsing and timing remain the editor’s responsibility.')
                        }}
                        filename={lyricFilename}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            }
            footer={
              <>
                <PrivacyNote compact />
                <Button onClick={showExport}>Export video</Button>
              </>
            }
          >
            <PreviewFrame controls={playback}>{preview}</PreviewFrame>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Static illustrative composition. Play toggles the control state; scrub and volume change values without
              playing audio.
            </p>
          </EditorShell>
        </Section>
        <Separator />
        <Section
          id="export"
          title="05 / Export states"
          description="Format selection, measured or indeterminate progress, approximate ETA, cancellation, download, expiry, failure, and recovery."
        >
          <Tabs
            value={exportState}
            onValueChange={(value: unknown) => {
              if (
                value === 'settings' ||
                value === 'running' ||
                value === 'ready' ||
                value === 'error' ||
                value === 'cancelled'
              )
                setExportState(value)
            }}
          >
            <TabsList className="flex h-auto! w-full flex-wrap justify-start">
              <TabsTrigger className="min-h-control" value="settings">
                Settings
              </TabsTrigger>
              <TabsTrigger className="min-h-control" value="running">
                Progress
              </TabsTrigger>
              <TabsTrigger className="min-h-control" value="ready">
                Ready
              </TabsTrigger>
              <TabsTrigger className="min-h-control" value="error">
                Failed
              </TabsTrigger>
              <TabsTrigger className="min-h-control" value="cancelled">
                Cancelled
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Export your video</CardTitle>
                  <CardDescription>Choose a format for your local video.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ExportFormatPicker value={format} onValueChange={setFormat} />
                  <Button onClick={showExport}>Show export preview</Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="running" className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-2">
                {(['prepare', 'render', 'finalise'] as const).map((stage) => (
                  <Button
                    key={stage}
                    variant={exportStage === stage ? 'secondary' : 'outline'}
                    onClick={() => setExportStage(stage)}
                  >
                    {stage}
                  </Button>
                ))}
              </div>
              <ExportProgress
                stage={exportStage}
                progress={exportStage === 'prepare' ? null : exportStage === 'render' ? 62 : 97}
                eta={exportStage === 'prepare' ? undefined : 'about 2 min remaining'}
                onCancel={() => setExportState('cancelled')}
              />
            </TabsContent>
            <TabsContent value="ready" className="pt-4">
              <DownloadCard
                filename={`a-moment-in-colour.${format}`}
                metadata={`3:42 · ${videoOutputLabel} · Illustrative output`}
                preview={<PreviewFrame label="Output preview">{preview}</PreviewFrame>}
                onDownload={() =>
                  setMessage('Download callback invoked. No video file is generated in this playground.')
                }
                onBack={() => {
                  setStep('create')
                  setExportState('settings')
                }}
                onExportSettings={() =>
                  setMessage('Export settings callback invoked. Preset serialization remains editor work.')
                }
                onClear={() => {
                  setExportState('settings')
                  setAudio(undefined)
                  setArtwork(undefined)
                  setMessage('Example output cleared.')
                }}
              />
            </TabsContent>
            <TabsContent value="error" className="pt-4">
              <ExportRecovery onRetry={() => setExportState('running')} onBack={() => setExportState('settings')} />
            </TabsContent>
            <TabsContent value="cancelled" className="pt-4">
              <ExportRecovery cancelled onBack={() => setExportState('settings')} />
            </TabsContent>
          </Tabs>
          <DownloadCard
            expired
            filename={`a-moment-in-colour.${format}`}
            metadata={videoOutputLabel}
            onDownload={() => {}}
            onBack={() => setExportState('settings')}
            onExportSettings={() => setMessage('Export settings callback invoked.')}
            onClear={() => setMessage('Expired example cleared.')}
          />
          <Notice title="UI samples only">
            Progress percentages and ETA are examples. Full conversion, synchronized lyrics, downloads, and mobile
            performance still require the media pipeline.
          </Notice>
        </Section>
        <footer className="border-t pt-6 text-xs text-muted-foreground">
          Audioframe · Shared components for private, local creation.
        </footer>
      </div>
    </TooltipProvider>
  )
}
