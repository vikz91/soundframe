'use client'

import type { ReactNode } from 'react'
import { CheckIcon, DownloadSimpleIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { SelectionCards } from './selection-card'
import { videoFormats, videoOutputLabel, type VideoFormat } from '@/lib/audioframe-design'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Notice, RetentionNote } from './status'
import { cn } from '@/lib/utils'

export function ExportFormatPicker({
  value,
  onValueChange,
  disabled = false
}: {
  value: VideoFormat
  onValueChange: (format: VideoFormat) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <SelectionCards
        label="Output format"
        options={videoFormats}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className="sm:grid-cols-2"
      />
      <p className="text-xs text-muted-foreground">{videoOutputLabel} · Includes audio</p>
    </div>
  )
}

export type ExportStage = 'prepare' | 'render' | 'finalise'
const stages: { value: ExportStage; label: string }[] = [
  { value: 'prepare', label: 'Prepare' },
  { value: 'render', label: 'Render' },
  { value: 'finalise', label: 'Finalise' }
]
export function ExportProgress({
  stage,
  progress,
  eta,
  onCancel,
  cancelling = false,
  description = 'Processing on your device.',
  foregroundNotice = 'Keep this tab open and in the foreground.'
}: {
  stage: ExportStage
  progress: number | null
  eta?: string
  onCancel: () => void
  cancelling?: boolean
  description?: string
  foregroundNotice?: string
}) {
  const active = stages.findIndex((item) => item.value === stage)
  const safeProgress = progress !== null && Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : null
  return (
    <Card aria-busy="true">
      <CardHeader>
        <CardTitle>Making your frame</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <span className="font-heading text-4xl font-semibold text-primary tabular-nums">
            {safeProgress === null
              ? { prepare: 'Preparing…', render: 'Rendering…', finalise: 'Finalising…' }[stage]
              : `${Math.round(safeProgress)}%`}
          </span>
          {eta ? <span className="text-xs text-muted-foreground">Estimated: {eta}</span> : null}
        </div>
        <Progress value={safeProgress} aria-label="Video export progress" />
        <ol aria-label="Export stages" className="flex flex-wrap gap-4">
          {stages.map((item, index) => (
            <li
              key={item.value}
              aria-current={index === active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 text-sm',
                index <= active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border',
                  index < active ? 'border-primary bg-primary text-primary-foreground' : 'border-current'
                )}
              >
                {index < active ? <CheckIcon aria-hidden="true" /> : index + 1}
              </span>
              {item.label}
            </li>
          ))}
        </ol>
        <Notice title={foregroundNotice} />
        <Button variant="outline" onClick={onCancel} disabled={cancelling}>
          {cancelling ? 'Cancelling…' : 'Cancel export'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function DownloadCard({
  filename,
  metadata,
  preview,
  onDownload,
  onBack,
  onExportSettings,
  onClear,
  expired = false,
  downloadLabel = 'Download video',
  title,
  description,
  retention,
  onExportAgain
}: {
  filename: string
  metadata: string
  preview?: ReactNode
  onDownload: () => void
  onBack: () => void
  onExportSettings: () => void
  onClear: () => void
  expired?: boolean
  downloadLabel?: string
  title?: string
  description?: string
  retention?: ReactNode
  onExportAgain?: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? (expired ? 'This preview has expired' : 'Your video is ready')}</CardTitle>
        <CardDescription>
          {description ??
            (expired
              ? 'Export again to generate another local file.'
              : 'Preview your video and download it to your device.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {preview}
        <div>
          <p className="truncate font-semibold" title={filename}>
            {filename}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{metadata}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={expired} onClick={onDownload}>
            <DownloadSimpleIcon aria-hidden="true" />
            {downloadLabel}
          </Button>
          {expired && onExportAgain ? <Button onClick={onExportAgain}>Export again</Button> : null}
          <Button variant="outline" onClick={onBack}>
            Back to editor
          </Button>
          <Button variant="outline" onClick={onExportSettings}>
            Export settings
          </Button>
          <Button variant="ghost" onClick={onClear}>
            Clear project
          </Button>
        </div>
        {retention ?? <RetentionNote />}
      </CardContent>
    </Card>
  )
}

export function ExportRecovery({
  cancelled = false,
  message,
  onRetry,
  onBack
}: {
  cancelled?: boolean
  message?: string
  onRetry?: () => void
  onBack: () => void
}) {
  return (
    <Notice
      tone={cancelled ? 'neutral' : 'danger'}
      title={cancelled ? 'Export cancelled' : 'Export could not finish'}
      action={
        <div className="flex flex-wrap gap-2">
          {!cancelled && onRetry ? (
            <Button onClick={onRetry}>
              <ArrowClockwiseIcon aria-hidden="true" />
              Retry export
            </Button>
          ) : null}
          <Button variant="outline" onClick={onBack}>
            Back to editor
          </Button>
        </div>
      }
    >
      {message ?? 'Your project is still here.'}
    </Notice>
  )
}
