'use client'

import { ArrowRightIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { MediaFileCard } from '@/components/audioframe/media-file-card'
import { PresetActions } from '@/components/audioframe/preset-actions'
import { Notice } from '@/components/audioframe/status'
import { Button } from '@/components/ui/button'
import { canCreate } from '@/lib/prototype/controller'
import type { PrototypeViewProps } from './types'
import { SampleArtwork } from './sample-composition'

export function FilesView({ state, actions }: PrototypeViewProps) {
  const ready = canCreate(state)
  return (
    <section aria-labelledby="files-title" className="mx-auto w-full max-w-4xl space-y-7 py-6 sm:py-10">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-primary">Step 1 · Files</p>
        <h2 id="files-title" className="mt-2 font-heading text-section-title font-semibold tracking-tight">
          Start with your sound
        </h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Choose sample audio and artwork to explore the editor. No files are read from your device.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {(['audio', 'artwork'] as const).map((kind) => (
          <MediaFileCard
            key={kind}
            kind={kind}
            selected={
              state[kind].sample
                ? {
                    name: state[kind].sample.filename,
                    detail: state[kind].sample.detail,
                    thumbnail: kind === 'artwork' ? <SampleArtwork /> : undefined
                  }
                : undefined
            }
            checking={state[kind].checking}
            error={state[kind].error}
            onFileChange={() => {}}
            onChooseRequest={() => actions.setDialog(kind)}
            onRemove={() => actions.removeSample(kind)}
          />
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-control bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>The intended product keeps your files on your device. Here, all media choices are illustrative samples.</p>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h2 className="font-heading text-base font-semibold">Have a look in mind?</h2>
        <PresetActions
          onImport={() => {}}
          onImportRequest={() => actions.setDialog('preset')}
          onExport={actions.simulateSettingsExport}
        />
        {state.settingsError ? <Notice tone="danger" title={state.settingsError} /> : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {ready
            ? 'Both samples are ready. Make the composition yours.'
            : 'Choose valid audio and artwork to continue.'}
        </p>
        <Button disabled={!ready} onClick={() => actions.navigate('create')}>
          Continue to create <ArrowRightIcon aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}
