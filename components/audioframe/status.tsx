import type { ReactNode } from 'react'
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, ClockIcon } from '@phosphor-icons/react/dist/ssr'
import { cva } from 'class-variance-authority'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
const statusVariants = cva('', {
  variants: {
    tone: {
      neutral: 'border-border bg-muted text-muted-foreground',
      info: 'border-info/20 bg-info-muted text-info',
      success: 'border-success/20 bg-success-muted text-success',
      warning: 'border-warning/20 bg-warning-muted text-warning',
      danger: 'border-destructive/20 bg-danger-muted text-destructive'
    }
  },
  defaultVariants: { tone: 'neutral' }
})

export function StatusBadge({
  tone = 'neutral',
  children,
  className
}: {
  tone?: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn('h-auto gap-1.5 px-3 py-1', statusVariants({ tone }), className)}>
      {children}
    </Badge>
  )
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className
}: {
  tone?: StatusTone
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const Icon =
    tone === 'success' ? CheckCircleIcon : tone === 'danger' || tone === 'warning' ? WarningCircleIcon : InfoIcon
  return (
    <Alert role={tone === 'danger' ? 'alert' : 'status'} className={cn(statusVariants({ tone }), className)}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {children || action ? (
        <AlertDescription className="text-current">
          <div>{children}</div>
          {action ? <div className="mt-3">{action}</div> : null}
        </AlertDescription>
      ) : null}
    </Alert>
  )
}

export function RetentionNote() {
  return (
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
      <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
      <span>
        Download again until you clear the project, close this page, or one hour passes. Cleanup is best effort while
        this page stays open.
      </span>
    </p>
  )
}
