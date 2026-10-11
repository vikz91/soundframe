'use client'

import { useRef, type RefObject } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/audioframe/status'
import { sampleOptions, type SampleKind } from '@/lib/prototype/fixtures'
import type { PrototypeViewProps } from './types'

const titles: Record<SampleKind, string> = {
  audio: 'Choose sample audio',
  artwork: 'Choose sample artwork',
  preset: 'Choose sample settings',
  lyrics: 'Choose sample lyrics'
}
export function SampleChooser({
  state,
  actions,
  returnFocus
}: PrototypeViewProps & { returnFocus?: RefObject<HTMLElement | null> }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const kind =
    state.dialog === 'audio' || state.dialog === 'artwork' || state.dialog === 'preset' || state.dialog === 'lyrics'
      ? state.dialog
      : null
  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open) actions.setDialog(null)
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        initialFocus={titleRef}
        finalFocus={() => {
          // A settings sample may open confirmation immediately. Let that dialog own focus.
          if (actions.getSnapshot().dialog) return false
          return returnFocus?.current ?? true
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle ref={titleRef} tabIndex={-1}>
            {kind ? titles[kind] : 'Choose a sample'}
          </DialogTitle>
          <DialogDescription>Prototype examples only. No file picker opens and no files are loaded.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {kind
            ? sampleOptions[kind].map((sample) => (
                <div key={sample.id} className="rounded-control border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold">{sample.label}</h3>
                    {sample.error ? (
                      <StatusBadge tone="warning">Invalid example</StatusBadge>
                    ) : sample.failsExport ? (
                      <StatusBadge tone="warning">Fails once</StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{sample.description}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{sample.detail}</p>
                  <Button
                    variant="outline"
                    className="mt-3 w-full justify-between"
                    onClick={() => actions.selectSample(kind, sample.id)}
                  >
                    Use {sample.label} <ArrowRightIcon aria-hidden="true" />
                  </Button>
                </div>
              ))
            : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
