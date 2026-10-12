import type { ReactNode } from 'react'
import { videoOutputLabel } from '@/lib/audioframe-design'
import { cn } from '@/lib/utils'

/** Composition slot: accepts the editor's Canvas/video without owning its clock. */
export function PreviewFrame({
  children,
  controls,
  label = 'Live preview',
  outputLabel = videoOutputLabel,
  className
}: {
  children: ReactNode
  controls?: ReactNode
  label?: string
  outputLabel?: string
  className?: string
}) {
  return (
    <section aria-label={label} className={cn('min-w-0 space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium tracking-wide uppercase">{label}</span>
        <span>{outputLabel}</span>
      </div>
      <div className="relative aspect-video-frame overflow-hidden rounded-preview bg-media text-media-foreground">
        {children}
      </div>
      {controls}
    </section>
  )
}
