'use client'

import type { RefObject } from 'react'
import { PlaybackControls } from '@/components/audioframe/playback-controls'
import { PreviewFrame } from '@/components/audioframe/preview-frame'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { canCreate } from '@/lib/prototype/controller'
import { SampleComposition } from './sample-composition'
import type { PrototypeViewProps } from './types'

export function PreviewDialog({
  state,
  actions,
  returnFocus
}: PrototypeViewProps & { returnFocus?: RefObject<HTMLElement | null> }) {
  return (
    <Dialog
      open={state.dialog === 'preview'}
      onOpenChange={(open) => {
        if (!open) actions.setDialog(null)
      }}
    >
      <DialogContent finalFocus={returnFocus} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Expanded sample preview</DialogTitle>
          <DialogDescription>
            The same composition and simulated clock as the editor. No audio or video is played.
          </DialogDescription>
        </DialogHeader>
        <PreviewFrame
          label="Sample preview"
          controls={
            <PlaybackControls
              playing={state.playback.playing}
              currentTime={state.playback.currentTime}
              duration={state.audio.sample?.duration ?? 222}
              volume={state.playback.volume}
              onPlayPause={actions.togglePlayback}
              onSeek={actions.seek}
              onVolumeChange={actions.setVolume}
              disabled={!canCreate(state) || state.export.status === 'running'}
            />
          }
        >
          <SampleComposition
            preferences={state.preferences}
            currentTime={state.playback.currentTime}
            playing={state.playback.playing}
          />
        </PreviewFrame>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Back to editing</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
