'use client'

import { ArrowLeftIcon, ArrowRightIcon, ClockIcon } from '@phosphor-icons/react'
import {
  DownloadCard,
  ExportFormatPicker,
  ExportProgress,
  ExportRecovery
} from '@/components/audioframe/export-controls'
import { formatPlaybackTime } from '@/components/audioframe/playback-controls'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { Notice, StatusBadge } from '@/components/audioframe/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canCreate } from '@/lib/prototype/controller'
import { SampleComposition } from './sample-composition'
import type { PrototypeViewProps } from './types'

export type ExportViewProps = PrototypeViewProps & { now: number }

export function ExportView({ state, actions, now }: ExportViewProps) {
  const ready = canCreate(state)
  const output = state.output
  const running = state.export.status === 'running'
  const back = () => actions.navigate(ready ? 'create' : 'files')
  if (state.view === 'download' && output) {
    const expired = output.expired || now >= output.expiresAt
    const minutes = Math.max(1, Math.ceil((output.expiresAt - now) / 60000))
    return (
      <section aria-labelledby="download-title" className="mx-auto w-full max-w-4xl space-y-6 py-6 sm:py-10">
        <div>
          <p className="text-sm font-medium text-primary">Step 3 · Export complete</p>
          <h2 id="download-title" className="mt-2 font-heading text-section-title font-semibold tracking-tight">
            {expired ? 'Make another frame' : 'Your sample frame is ready'}
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            This is a demonstration of the result screen. No video was generated.
          </p>
        </div>
        <DownloadCard
          filename={output.filename}
          metadata={`${formatPlaybackTime(output.duration)} · 568 × 320 · 30 fps · ${output.preferences.format.toUpperCase()} · Illustrative size: 12.4 MB (no file)`}
          preview={
            <PreviewFrame label="Sample result">
              <SampleComposition preferences={output.preferences} />
            </PreviewFrame>
          }
          title={expired ? 'The sample result has expired' : 'Sample result is ready'}
          description={
            expired
              ? 'Repeat the simulated export to make another sample result available.'
              : 'Explore the download actions below. They do not save a video or settings file.'
          }
          downloadLabel="Download sample (simulated)"
          expired={expired}
          onDownload={actions.simulateDownload}
          onBack={back}
          onExportSettings={actions.simulateSettingsExport}
          onClear={() => actions.setDialog('clear')}
          onExportAgain={() => actions.navigate(ready ? 'export' : 'files')}
          retention={
            <div className="space-y-2 text-xs leading-5 text-muted-foreground">
              <p className="flex items-start gap-2">
                <ClockIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {expired
                    ? 'The one-hour sample availability period has ended.'
                    : `Sample available for about ${minutes} more ${minutes === 1 ? 'minute' : 'minutes'}.`}{' '}
                  Availability starts when the simulated export completes; clicking Download does not extend it.
                </span>
              </p>
              <p>
                Clearing the project or leaving this page removes the session. No files are saved by this prototype.
              </p>
            </div>
          }
        />
      </section>
    )
  }
  return (
    <section aria-labelledby="export-title" className="mx-auto w-full max-w-5xl space-y-6 py-6 sm:py-10">
      <div>
        <p className="text-sm font-medium text-primary">Step 3 · Export</p>
        <h2 id="export-title" className="mt-2 font-heading text-section-title font-semibold tracking-tight">
          {running ? 'Bringing your frame together' : 'Choose your final format'}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          {running
            ? 'Watch the simulated export move from preparation to finalisation. No media is being processed.'
            : 'Explore the planned video output. The prototype simulates processing in approximately eight seconds.'}
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <PreviewFrame label={running ? 'Composition being simulated' : 'Your composition'}>
            <SampleComposition preferences={state.preferences} />
          </PreviewFrame>
          <Card>
            <CardHeader>
              <CardTitle>Frame details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="min-w-0 truncate font-medium">{state.preferences.details.title || 'Untitled'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>{formatPlaybackTime(state.audio.sample?.duration ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Output</dt>
                  <dd>568 × 320 · 30 fps</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Format</dt>
                  <dd>{state.preferences.format.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Style</dt>
                  <dd className="capitalize">{state.preferences.mode}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {output && !running ? (
            <Button variant="outline" onClick={() => actions.navigate('download')}>
              View previous sample result <ArrowRightIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className="min-w-0 space-y-5">
          {running ? (
            <ExportProgress
              stage={state.export.stage}
              progress={state.export.progress}
              eta="about 8 seconds total"
              description="Simulated sample processing. No encoder is running."
              foregroundNotice="Keep this prototype open to see the result. The intended browser export requires the app to stay in the foreground."
              onCancel={() => actions.setDialog('cancel')}
            />
          ) : (
            <>
              {state.export.status === 'failed' ? (
                <ExportRecovery
                  message="This sample intentionally failed once. Your project and any previous result are still here. Retry will complete successfully."
                  onRetry={actions.startExport}
                  onBack={back}
                />
              ) : null}
              {state.export.status === 'cancelled' ? (
                <ExportRecovery
                  cancelled
                  message="The simulated export was cancelled. Your selected samples, settings, and any previous result are still here."
                  onBack={back}
                />
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>Video format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ExportFormatPicker
                    value={state.preferences.format}
                    onValueChange={(format) => actions.updatePreferences({ format })}
                  />
                  <Notice title="Sample export only">
                    Format details illustrate the intended product. No video is encoded and no file is created.
                  </Notice>
                  {state.audio.sample?.failsExport && state.export.status !== 'failed' ? (
                    <StatusBadge tone="warning" className="whitespace-normal">
                      Export failure example · First attempt fails, Retry succeeds
                    </StatusBadge>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!ready} onClick={actions.startExport}>
                      Start simulated export <ArrowRightIcon aria-hidden="true" />
                    </Button>
                    <Button variant="outline" onClick={back}>
                      <ArrowLeftIcon aria-hidden="true" />
                      Back to editing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
