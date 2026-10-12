'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EditorHeader, EditorShell } from '@/components/audioframe/editor-shell'
import { WorkflowStepper, type WorkflowStep } from '@/components/audioframe/workflow-stepper'
import { MediaFileCard } from '@/components/audioframe/media-file-card'
import { PlaybackControls, formatPlaybackTime } from '@/components/audioframe/playback-controls'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { ColourPicker, ModePicker, RangeField, TypefaceSelect } from '@/components/audioframe/style-controls'
import { LyricsControls, SongDetailsFields } from '@/components/audioframe/text-controls'
import {
  ExportFormatPicker,
  ExportResolutionPicker,
  ExportProgress,
  ExportRecovery,
  DownloadCard
} from '@/components/audioframe/export-controls'
import { PresetActions } from '@/components/audioframe/preset-actions'
import { ConfirmDialog } from '@/components/audioframe/confirm-dialog'
import { Notice, StatusBadge } from '@/components/audioframe/status'
import { ThemeToggle } from '@/components/prototype/theme-toggle'
import { accentColours, backgroundColours } from '@/lib/audioframe-design'
import { readArtworkFile, releaseArtworkFile } from '@/lib/local-media'
import { checkMediaCapabilities } from '@/lib/media-capabilities'
import { useAudioPlayback } from '@/hooks/use-audio-playback'
import { useLocalFile } from '@/hooks/use-local-file'
import { useDownload } from '@/hooks/use-download'
import { LocalAudioAnalyser } from '@/app/demo/viz/audio-analysis'
import { defaultEditorPreferences, type EditorPreferences } from '@/lib/editor/types'
import { readSettingsFile, readLyricsFile } from '@/lib/editor/files'
import { serializeSettings } from '@/lib/editor/settings'
import { parseLrc } from '@/lib/editor/lyrics'
import { createVideoExportController } from '@/lib/editor/export-controller'
import { videoSizeLabel } from '@/lib/editor/resolution'
import { CanvasPreview } from './canvas-preview'

export function MediaWorkspace() {
  const [video] = useState(() => createVideoExportController())
  const output = useSyncExternalStore(video.subscribe, video.getSnapshot, video.getServerSnapshot)
  const busy = output.status === 'running'
  const [view, setView] = useState<WorkflowStep>('files')
  const [preferences, setPreferences] = useState(defaultEditorPreferences)
  const [capabilities, setCapabilities] = useState<{ supported: boolean; issues: string[] } | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)
  const returnFocus = useRef<HTMLElement>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const analysis = useRef<LocalAudioAnalyser | null>(null)
  const bindAudio = useCallback((element: HTMLAudioElement | null) => {
    analysis.current?.dispose()
    analysis.current = element ? new LocalAudioAnalyser(element) : null
    audioElement.current = element
  }, [])
  const audio = useAudioPlayback({ onAudioElement: bindAudio })
  const artwork = useLocalFile(readArtworkFile, releaseArtworkFile)
  const settingsFile = useLocalFile(readSettingsFile)
  const lyricsFile = useLocalFile(readLyricsFile)
  const { download, clear: clearDownload } = useDownload()
  const effectivePreferences = useMemo(
    () =>
      lyricsFile.value
        ? { ...preferences, lyricsMode: 'lrc' as const, lyricsText: lyricsFile.value.text }
        : preferences,
    [preferences, lyricsFile.value]
  )
  const parsedLyrics = useMemo(
    () => (effectivePreferences.lyricsMode === 'lrc' ? parseLrc(effectivePreferences.lyricsText) : null),
    [effectivePreferences.lyricsMode, effectivePreferences.lyricsText]
  )
  const lyricsError = parsedLyrics?.errors[0]
  const available = Boolean(
    audio.track && artwork.value && capabilities?.supported && !audio.reading && !artwork.reading
  )
  const unavailable = !capabilities?.supported || busy
  const canExport = available && !lyricsError && !lyricsFile.reading && !settingsFile.reading && !settingsFile.value
  const getTime = useCallback(() => audioElement.current?.currentTime ?? 0, [])
  const readAnalysis = useCallback(() => analysis.current?.read() ?? null, [])
  useEffect(() => {
    const abort = new AbortController()
    void checkMediaCapabilities(abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setCapabilities(result)
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setCapabilities({
            supported: false,
            issues: [reason instanceof Error ? reason.message : 'Browser checks failed.']
          })
      })
    return () => abort.abort()
  }, [])
  useEffect(
    () => () => {
      analysis.current?.dispose()
      analysis.current = null
    },
    []
  )

  useEffect(() => {
    const refresh = () => video.refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('pageshow', refresh)
      video.dispose()
    }
  }, [video])
  useEffect(() => {
    if (!output.result?.blob) clearDownload()
  }, [output.result?.blob, clearDownload])

  function startExport() {
    if (!audio.track || !artwork.value || !canExport || busy) return
    audio.pause()
    clearDownload()
    void video.start({
      preferences: effectivePreferences,
      artwork: artwork.value.image,
      audioURL: audio.track.url,
      duration: audio.track.duration
    })
  }
  function downloadVideo() {
    video.refresh()
    const result = video.getSnapshot().result
    try {
      if (result?.blob) download(result.blob, result.filename)
      setDownloadError(null)
    } catch {
      setDownloadError('The download could not start. Try Download video again.')
    }
  }

  function updatePreferences(patch: Partial<EditorPreferences>) {
    if ('lyricsText' in patch || 'lyricsMode' in patch) lyricsFile.clear()
    setPreferences({ ...effectivePreferences, ...patch })
  }
  function selectAudio(file: File) {
    setPlaybackError(null)
    setCurrentTime(0)
    audio.selectTrack(file)
  }
  function removeAudio() {
    audio.clearTrack()
    setCurrentTime(0)
    setPlaybackError(null)
  }
  function togglePlayback() {
    if (audio.playing) {
      audio.pause()
      return
    }
    const current = analysis.current
    const element = audioElement.current
    // Resume the audio graph within the same user gesture as native playback.
    const started = current?.start() ?? Promise.resolve(false)
    void Promise.all([audio.play(), started])
      .then(() => {
        if (audioElement.current === element) setPlaybackError(null)
      })
      .catch(() => {
        if (audioElement.current === element) {
          audio.pause()
          setPlaybackError('Playback could not start. Press Play again, or try an MP3 or WAV file.')
        }
      })
  }
  function exportSettings() {
    try {
      const json = serializeSettings(effectivePreferences)
      download(new Blob([json], { type: 'application/json' }), 'audioframe-settings.json')
      settingsFile.setError(null)
    } catch (reason) {
      settingsFile.setError(reason instanceof Error ? reason.message : 'Settings could not be saved.')
    }
  }
  function clearProject() {
    video.clear()
    clearDownload()
    setDownloadError(null)
    removeAudio()
    audio.setVolume(1)
    artwork.clear()
    settingsFile.clear()
    lyricsFile.clear()
    setPreferences(defaultEditorPreferences())
    setView('files')
  }

  const header = (
    <EditorHeader
      project={
        <div>
          <p className="font-medium">{preferences.details.title || 'Untitled track'}</p>
          <p className="text-xs text-muted-foreground">Local project · Session only</p>
        </div>
      }
      steps={
        <WorkflowStepper
          current={available || output.result ? view : 'files'}
          onStepChange={(next) => {
            if (!busy && (next === 'files' || available || (next === 'export' && output.result))) setView(next)
          }}
          disabled={busy}
          disabledSteps={available ? [] : output.result ? ['create'] : ['create', 'export']}
        />
      }
      actions={
        <Button
          variant="ghost"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
            setClearOpen(true)
          }}
        >
          Clear project
        </Button>
      }
    />
  )

  const inspector = (
    <div className="rounded-panel border bg-card p-4 shadow-panel sm:p-5">
      <h2 className="mb-4 font-heading text-lg font-semibold">Make it yours</h2>
      <Tabs defaultValue="style">
        <TabsList className="w-full" aria-label="Composition settings">
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
        </TabsList>
        <TabsContent value="style" className="space-y-6 pt-5">
          <ModePicker value={preferences.mode} onValueChange={(mode) => updatePreferences({ mode })} />
          <ColourPicker
            label="Accent colour"
            options={accentColours}
            value={preferences.accent}
            onValueChange={(accent) => {
              const value = accentColours.find((option) => option.value === accent)?.value
              if (value) updatePreferences({ accent: value })
            }}
          />
          <ColourPicker
            label="Background"
            options={backgroundColours}
            value={preferences.background}
            onValueChange={(background) => {
              const value = backgroundColours.find((option) => option.value === background)?.value
              if (value) updatePreferences({ background: value })
            }}
          />
          <RangeField
            label="Sensitivity"
            value={preferences.sensitivity}
            onValueChange={(sensitivity) => updatePreferences({ sensitivity })}
            hint="Adjusts the response to your audio."
          />
          <TypefaceSelect
            value={preferences.typography}
            onValueChange={(typography) => updatePreferences({ typography })}
          />
        </TabsContent>
        <TabsContent value="text" className="pt-5">
          <SongDetailsFields value={preferences.details} onValueChange={(details) => updatePreferences({ details })} />
        </TabsContent>
        <TabsContent value="lyrics" className="space-y-4 pt-5">
          <LyricsControls
            mode={effectivePreferences.lyricsMode}
            onModeChange={(lyricsMode) => updatePreferences({ lyricsMode })}
            text={effectivePreferences.lyricsText}
            onTextChange={(lyricsText) => updatePreferences({ lyricsText })}
            onFileChange={(file) => {
              // Keep the last accepted text if replacement fails or is cancelled.
              setPreferences(effectivePreferences)
              void lyricsFile.select(file)
            }}
            filename={lyricsFile.value?.name}
            error={lyricsFile.error ?? (lyricsError ? `Line ${lyricsError.line}: ${lyricsError.message}` : undefined)}
          />
          {lyricsFile.reading ? (
            <Button variant="outline" onClick={lyricsFile.clear}>
              Cancel lyrics loading
            </Button>
          ) : null}
          <p className="text-xs leading-5 text-muted-foreground">
            LRC uses minutes:seconds with up to three fractional digits, multiple timestamps, and a millisecond offset.
            Plain lyrics remain static. Enhanced word timing is unsupported.
          </p>
        </TabsContent>
      </Tabs>
      <div className="mt-6 space-y-3 border-t pt-5">
        <PresetActions
          onImport={(file) => {
            void settingsFile.select(file)
          }}
          onExport={exportSettings}
          disabled={settingsFile.reading}
        />
        {settingsFile.reading ? (
          <Button variant="outline" onClick={settingsFile.clear}>
            Cancel settings loading
          </Button>
        ) : null}
        {settingsFile.error ? <Notice tone="danger" title={settingsFile.error} /> : null}
      </div>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-editor flex-1 px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info">Local media editor · Browser video export</StatusBadge>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/prototype" className="text-sm text-primary underline underline-offset-4">
            Try the sample prototype
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <h1 className="font-heading text-page-title font-semibold tracking-tight">Bring your sound.</h1>
      <p className="mt-3 mb-7 text-sm leading-6 text-muted-foreground">
        Choose your files, customise your frame, and preview with real audio. Your media stays in this browser.
      </p>
      {!capabilities ? <Notice title="Checking browser capabilities…" /> : null}
      {capabilities && !capabilities.supported ? (
        <Notice tone="danger" title="This browser cannot run the local editor">
          {capabilities.issues.join(' ')}
        </Notice>
      ) : null}
      {audio.track ? (
        <audio
          key={audio.track.url}
          {...audio.audioProps}
          src={audio.track.url}
          preload="auto"
          aria-label="Local preview audio"
          onTimeUpdate={(event) => {
            const duration = audio.track?.duration ?? 0
            const position = event.currentTarget.currentTime
            if (duration && position >= duration) {
              audio.pause()
              audio.seek(duration)
            }
            setCurrentTime(Math.min(position, duration))
          }}
          className="hidden"
        />
      ) : null}
      {(!available && !(view === 'export' && output.result) ? 'files' : view) === 'files' ? (
        <div className="space-y-6">
          {header}
          <div className="grid gap-5 md:grid-cols-2">
            <MediaFileCard
              kind="audio"
              selected={
                audio.track
                  ? {
                      name: audio.track.name,
                      detail: `${formatPlaybackTime(audio.track.duration)} · ${(audio.track.size / 1048576).toFixed(1)} MiB`
                    }
                  : undefined
              }
              onFileChange={selectAudio}
              onRemove={removeAudio}
              checking={audio.reading}
              disabled={unavailable}
              error={audio.error ?? undefined}
            >
              {audio.reading ? (
                <Button variant="outline" onClick={removeAudio}>
                  Cancel audio loading
                </Button>
              ) : null}
            </MediaFileCard>
            <MediaFileCard
              kind="artwork"
              selected={
                artwork.value
                  ? {
                      name: artwork.value.name,
                      detail: `${artwork.value.image.naturalWidth} × ${artwork.value.image.naturalHeight}`
                    }
                  : undefined
              }
              onFileChange={(file) => {
                void artwork.select(file)
              }}
              onRemove={artwork.clear}
              checking={artwork.reading}
              disabled={unavailable}
              error={artwork.error ?? undefined}
            >
              {artwork.reading ? (
                <Button variant="outline" onClick={artwork.clear}>
                  Cancel artwork loading
                </Button>
              ) : null}
            </MediaFileCard>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Current safeguards: audio up to 64 MiB and 7 minutes; artwork up to 12 MiB, 16 million pixels, and 8192
            pixels per side. These limits are provisional; mobile device testing is pending.
          </p>
          <Button disabled={!available} onClick={() => setView('create')}>
            Create your frame
          </Button>
        </div>
      ) : view === 'create' ? (
        <EditorShell
          header={header}
          inspector={inspector}
          footer={
            <>
              <span className="text-xs text-muted-foreground">
                Local preview · {videoSizeLabel(preferences.resolution)}
              </span>
              <Button onClick={() => setView('export')}>Output preferences</Button>
            </>
          }
        >
          <div className="space-y-5">
            <PreviewFrame
              outputLabel={videoSizeLabel(preferences.resolution)}
              controls={
                <PlaybackControls
                  playing={audio.playing}
                  currentTime={currentTime}
                  duration={audio.track?.duration ?? 0}
                  volume={audio.volume}
                  onPlayPause={togglePlayback}
                  onSeek={(seconds) => {
                    audio.seek(seconds)
                    setCurrentTime(seconds)
                  }}
                  onVolumeChange={audio.setVolume}
                  disabled={!available}
                />
              }
            >
              <CanvasPreview
                artwork={artwork.value?.image ?? null}
                preferences={effectivePreferences}
                getTime={getTime}
                readAnalysis={readAnalysis}
                playing={audio.playing}
              />
            </PreviewFrame>
            {playbackError ? <Notice tone="danger" title={playbackError} /> : null}
            <p className="text-xs leading-5 text-muted-foreground">
              Spectrum and Lighting follow your audio. Seeking uses the audio timeline. Reduced motion keeps reactive
              effects still.
            </p>
          </div>
        </EditorShell>
      ) : (
        <div className="space-y-6">
          {header}
          <ExportResolutionPicker
            value={preferences.resolution}
            onValueChange={(resolution) => updatePreferences({ resolution })}
            disabled={busy}
          />
          <ExportFormatPicker
            value={preferences.format}
            onValueChange={(format) => updatePreferences({ format })}
            disabled={busy}
            outputLabel={videoSizeLabel(preferences.resolution)}
          />
          {busy ? (
            <ExportProgress
              stage={output.work.stage}
              progress={output.work.progress}
              eta={
                output.work.etaSeconds !== undefined && output.work.stage === 'render'
                  ? `about ${Math.max(1, Math.ceil(output.work.etaSeconds))} seconds plus finalisation`
                  : undefined
              }
              onCancel={video.cancel}
            />
          ) : null}
          {output.status === 'failed' || output.status === 'cancelled' ? (
            <ExportRecovery
              cancelled={output.status === 'cancelled'}
              message={output.error ?? 'Your inputs, settings, and previous video are still here.'}
              onRetry={startExport}
              onBack={() => setView('create')}
            />
          ) : null}
          {!busy && output.result ? (
            <DownloadCard
              filename={output.result.filename}
              metadata={`${output.result.format.toUpperCase()} · ${videoSizeLabel(output.result.resolution)} · ${formatPlaybackTime(output.result.duration)}${output.result.blob ? ` · ${(output.result.blob.size / 1048576).toFixed(2)} MiB` : ''}`}
              preview={
                output.result.url ? (
                  <video
                    key={output.result.url}
                    src={output.result.url}
                    controls
                    preload="metadata"
                    aria-label="Generated video"
                    className="w-full rounded-panel"
                  />
                ) : undefined
              }
              expired={!output.result.blob}
              onDownload={downloadVideo}
              onBack={() => setView('create')}
              onExportSettings={exportSettings}
              onClear={() => setClearOpen(true)}
              onExportAgain={startExport}
              retention={
                <p className="text-xs text-muted-foreground">
                  {output.result.blob
                    ? `Available for about ${Math.max(1, Math.ceil((output.result.expiresAt - output.now) / 60000))} more minutes, until Clear project or this page closes. Downloads do not extend retention.`
                    : 'The local video has expired. Your project is still available to export again.'}
                </p>
              }
            />
          ) : null}
          {!busy ? (
            <div className="flex flex-wrap gap-3">
              <Button disabled={!canExport} onClick={startExport}>
                {output.result ? 'Export another video' : 'Export video'}
              </Button>
              <Button variant="outline" onClick={exportSettings}>
                Export settings
              </Button>
              <Button variant="outline" onClick={() => setView('create')}>
                Back to editing
              </Button>
            </div>
          ) : null}
          {lyricsError ? <Notice tone="danger" title={`Line ${lyricsError.line}: ${lyricsError.message}`} /> : null}
          {downloadError ? <Notice tone="danger" title={downloadError} /> : null}
          {settingsFile.error ? <Notice tone="danger" title={settingsFile.error} /> : null}
        </div>
      )}
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        returnFocus={returnFocus}
        title="Clear this local project?"
        description="Cancel processing, release selected media and generated video, and reset playback, lyrics, and settings. Downloaded files stay on your device."
        confirmLabel="Clear project"
        onConfirm={clearProject}
      />
      <ConfirmDialog
        open={Boolean(settingsFile.value)}
        onOpenChange={(open) => {
          if (!open) settingsFile.clear()
        }}
        title="Replace current settings?"
        description="Apply appearance, song details, lyrics, and output preferences. Your selected audio and artwork stay in place."
        cancelLabel="Keep current settings"
        confirmLabel="Apply settings"
        confirmVariant="default"
        onConfirm={() => {
          if (settingsFile.value) {
            setPreferences(settingsFile.value)
            lyricsFile.clear()
          }
          settingsFile.clear()
        }}
      />
    </main>
  )
}
