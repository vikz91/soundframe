'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type FieldProps = { label: string; hint?: ReactNode; error?: string }
export function TextField({ label, hint, error, id, ...props }: ComponentProps<typeof Input> & FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = hint || error ? `${fieldId}-description` : undefined
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        {...props}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={[props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined}
      />
      {descriptionId ? (
        <p
          id={descriptionId}
          role={error ? 'alert' : undefined}
          className={error ? 'text-xs text-destructive' : 'text-xs leading-5 text-muted-foreground'}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextareaField({ label, hint, error, id, ...props }: ComponentProps<typeof Textarea> & FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = hint || error ? `${fieldId}-description` : undefined
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        {...props}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={[props['aria-describedby'], descriptionId].filter(Boolean).join(' ') || undefined}
      />
      {descriptionId ? (
        <p
          id={descriptionId}
          role={error ? 'alert' : undefined}
          className={error ? 'text-xs text-destructive' : 'text-xs leading-5 text-muted-foreground'}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
