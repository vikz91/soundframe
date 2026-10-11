'use client'

import { useId } from 'react'
import { ImageIcon, WaveformIcon, SunIcon } from '@phosphor-icons/react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SelectionCards } from './selection-card'
import { visualModes, type VisualMode, type ColourOption, type Typography } from '@/lib/audioframe-design'
import { cn } from '@/lib/utils'

export function ModePicker({
  value,
  onValueChange,
  disabled
}: {
  value: VisualMode
  onValueChange: (value: VisualMode) => void
  disabled?: boolean
}) {
  const icons = { cover: ImageIcon, spectrum: WaveformIcon, lighting: SunIcon }
  return (
    <SelectionCards
      label="Visual mode"
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className="grid-cols-3 gap-2 [&_label]:flex-col [&_label]:gap-2 [&_label]:px-2 [&_label]:py-3 [&_[data-slot=radio-group-item]]:sr-only"
      options={visualModes.map((mode) => {
        const Icon = icons[mode.value]
        return { ...mode, description: undefined, visual: <Icon aria-hidden="true" className="size-7 text-primary" /> }
      })}
    />
  )
}

export function ColourPicker({
  label,
  options,
  value,
  onValueChange,
  disabled = false
}: {
  label: string
  options: readonly ColourOption[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      <RadioGroup
        aria-label={label}
        value={value}
        onValueChange={(next) => {
          if (typeof next === 'string' && options.some((option) => option.value === next)) onValueChange(next)
        }}
        disabled={disabled}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <RadioGroupItem
            key={option.value}
            value={option.value}
            id={`${id}-${option.value}`}
            aria-label={option.label}
            title={option.label}
            style={{ backgroundColor: `var(${option.token})` }}
            className={cn(
              'size-control border border-border shadow-control after:inset-0 [&_[data-slot=radio-group-indicator]]:hidden',
              value === option.value && 'outline-2 outline-offset-2 outline-primary'
            )}
          />
        ))}
      </RadioGroup>
    </fieldset>
  )
}

export function RangeField({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  hint,
  disabled = false
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label id={`${id}-label`} htmlFor={id}>
          {label}
        </Label>
        <output className="text-sm text-primary tabular-nums">
          {value}
          {unit}
        </output>
      </div>
      <Slider
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        value={[value]}
        onValueChange={(next) => onValueChange(typeof next === 'number' ? next : next[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TypefaceSelect({
  value,
  onValueChange,
  disabled = false
}: {
  value: Typography
  onValueChange: (value: Typography) => void
  disabled?: boolean
}) {
  const id = useId()
  const items = [
    { value: 'sans', label: 'Clean sans' },
    { value: 'heading', label: 'Space Grotesk' },
    { value: 'mono', label: 'Monospace' }
  ]
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Typeface</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next === 'sans' || next === 'heading' || next === 'mono') onValueChange(next)
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
