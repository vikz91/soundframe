'use client'

import { useId, type ReactNode } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type SelectionOption<T extends string> = { value: T; label: string; description?: string; visual?: ReactNode }
export function SelectionCards<T extends string>({
  label,
  options,
  value,
  onValueChange,
  disabled = false,
  className
}: {
  label: string
  options: readonly SelectionOption<T>[]
  value: T
  onValueChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next)
        if (option) onValueChange(option.value)
      }}
      disabled={disabled}
      className={cn('grid gap-3', className)}
    >
      {options.map((option) => (
        <Label
          key={option.value}
          htmlFor={`${id}-${option.value}`}
          className={cn(
            'flex min-h-control cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/30',
            value === option.value
              ? 'border-primary bg-selected text-selected-foreground'
              : 'border-border bg-card text-card-foreground',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <RadioGroupItem
            id={`${id}-${option.value}`}
            value={option.value}
            aria-labelledby={`${id}-${option.value}-label`}
            className="mt-0.5"
          />
          <span className="min-w-0 flex-1 space-y-2">
            {option.visual ? <span className="block">{option.visual}</span> : null}
            <span id={`${id}-${option.value}-label`} className="block text-sm font-semibold">
              {option.label}
            </span>
            {option.description ? (
              <span className="block text-xs leading-5 font-normal text-muted-foreground">{option.description}</span>
            ) : null}
          </span>
        </Label>
      ))}
    </RadioGroup>
  )
}
