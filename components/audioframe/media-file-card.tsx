'use client'

import { useId, useState, type ReactNode } from 'react'
import { MusicNoteIcon, ImageIcon, ArrowClockwiseIcon, UploadSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useFilePicker } from '@/hooks/use-file-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { mediaInputAccept } from '@/lib/audioframe-design'
import { IconButton } from './icon-button'
import { StatusBadge, Notice } from './status'
import { cn } from '@/lib/utils'

type SelectedMedia = { name: string; detail?: string; thumbnail?: ReactNode }
/** File picker only. The caller validates/decodes media and owns any object URLs. */
export function MediaFileCard({
  kind,
  selected,
  onFileChange,
  onChooseRequest,
  onRemove,
  checking = false,
  disabled = false,
  error,
  children
}: {
  kind: 'audio' | 'artwork'
  selected?: SelectedMedia
  onFileChange: (file: File) => void
  /** An intent override bypasses native input and ignores real dropped files. */
  onChooseRequest?: () => void
  onRemove?: () => void
  checking?: boolean
  disabled?: boolean
  error?: string
  children?: ReactNode
}) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  const title = kind === 'audio' ? 'Audio' : 'Artwork'
  const Icon = kind === 'audio' ? MusicNoteIcon : ImageIcon
  const hint = kind === 'audio' ? 'MP3, M4A, WAV, MP4 · Up to 7 minutes' : 'JPG or PNG'
  const busy = disabled || checking
  function choose(file: File | undefined) {
    setDragging(false)
    if (file && !busy && !onChooseRequest) onFileChange(file)
  }
  const { inputRef, open, onChange } = useFilePicker(choose, busy)
  return (
    <Card className={cn('min-w-0', dragging && 'border-primary bg-selected')}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <StatusBadge tone={checking ? 'info' : selected && !error ? 'success' : 'neutral'}>
            {checking
              ? 'Checking'
              : selected && !error
                ? 'Selected'
                : onChooseRequest
                  ? 'Choose sample'
                  : 'Choose file'}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!onChooseRequest ? (
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={mediaInputAccept[kind]}
            aria-label={`Choose ${kind} file`}
            aria-describedby={`${id}-hint`}
            className="sr-only"
            tabIndex={-1}
            disabled={busy}
            onChange={onChange}
          />
        ) : null}
        <div
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy && !onChooseRequest) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            if (!onChooseRequest) choose(event.dataTransfer.files[0])
          }}
          className={cn(
            'rounded-control border border-dashed p-4',
            selected ? 'border-border' : 'bg-muted/40',
            dragging && 'border-primary'
          )}
        >
          {selected ? (
            <div className="flex items-start gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-muted text-primary">
                {selected.thumbnail ?? <Icon aria-hidden="true" className="size-7" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={selected.name}>
                  {selected.name}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.detail}</p>
              </div>
              {onRemove ? (
                <IconButton label={`Remove ${title.toLowerCase()}`} variant="ghost" onClick={onRemove} disabled={busy}>
                  <TrashIcon aria-hidden="true" />
                </IconButton>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <UploadSimpleIcon aria-hidden="true" className="size-8 text-primary" />
              <p className="font-medium">Choose your {kind === 'audio' ? 'track' : 'cover artwork'}</p>
              <p className="text-xs text-muted-foreground">
                {onChooseRequest
                  ? 'Choose a built-in sample. No files are read.'
                  : 'Choose a local file or drop it here.'}
              </p>
            </div>
          )}
          {checking ? (
            <div role="status" className="mt-4 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <span className="text-xs text-muted-foreground">
                {onChooseRequest ? 'Simulating sample checks…' : 'Checking on your device…'}
              </span>
            </div>
          ) : null}
        </div>
        <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">
          {hint}
          {kind === 'audio' ? <span className="block">MP4 contributes its audio track only.</span> : null}
        </p>
        {error ? <Notice tone="danger" title={error} /> : null}
        {children}
        <Button
          variant={selected ? 'outline' : 'default'}
          className="w-full"
          disabled={busy}
          onClick={onChooseRequest ?? open}
        >
          {selected ? <ArrowClockwiseIcon aria-hidden="true" /> : <UploadSimpleIcon aria-hidden="true" />}
          {checking
            ? 'Checking file…'
            : selected
              ? `Replace ${title.toLowerCase()}`
              : onChooseRequest
                ? `Choose ${kind} sample`
                : `Choose ${kind === 'audio' ? 'audio file' : 'artwork'}`}
        </Button>
      </CardContent>
    </Card>
  )
}
