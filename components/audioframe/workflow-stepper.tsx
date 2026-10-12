'use client'

import { CheckIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type WorkflowStep = 'files' | 'create' | 'export'
const steps: { value: WorkflowStep; label: string }[] = [
  { value: 'files', label: 'Files' },
  { value: 'create', label: 'Create' },
  { value: 'export', label: 'Export' }
]

/** Omit onStepChange to render a read-only progress indicator. */
export function WorkflowStepper({
  current,
  onStepChange,
  disabled = false,
  disabledSteps = [],
  className
}: {
  current: WorkflowStep
  onStepChange?: (step: WorkflowStep) => void
  disabled?: boolean
  disabledSteps?: readonly WorkflowStep[]
  className?: string
}) {
  const active = steps.findIndex((step) => step.value === current)
  return (
    <nav aria-label="Project steps" className={className}>
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((step, index) => (
          <li
            key={step.value}
            className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4"
            aria-current={current === step.value ? 'step' : undefined}
          >
            {index ? <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-border" /> : null}
            {onStepChange ? (
              <Button
                variant="ghost"
                disabled={disabled || disabledSteps.includes(step.value)}
                onClick={() => onStepChange(step.value)}
                aria-current={current === step.value ? 'step' : undefined}
                className="gap-1 px-1 sm:gap-2 sm:px-2"
              >
                <StepNumber index={index} active={index === active} complete={index < active} />
                <span>{step.label}</span>
              </Button>
            ) : (
              <span className="flex min-h-control items-center gap-2 text-sm">
                <StepNumber index={index} active={index === active} complete={index < active} />
                <span className={cn(index === active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function StepNumber({ index, active, complete }: { index: number; active: boolean; complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold sm:size-8',
        active || complete
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {complete ? <CheckIcon className="size-4" /> : index + 1}
    </span>
  )
}
