'use client'

import type { FullCoverPreferences } from '@/lib/editor/types'
import { RangeField } from './style-controls'
import { SelectionCards } from './selection-card'

export function FullCoverControls({
  value,
  onValueChange,
  disabled = false
}: {
  value: FullCoverPreferences
  onValueChange: (value: FullCoverPreferences) => void
  disabled?: boolean
}) {
  const update = (patch: Partial<FullCoverPreferences>) => onValueChange({ ...value, ...patch })
  return (
    <div className="space-y-6">
      <SelectionCards
        label="Full cover visualization"
        value={value.visualization}
        onValueChange={(visualization) => update({ visualization })}
        disabled={disabled}
        className="grid-cols-2 gap-2 [&_label]:p-3"
        options={[
          { value: 'bars', label: 'Bars' },
          { value: 'none', label: 'None' }
        ]}
      />
      {value.visualization === 'bars' ? (
        <>
          <SelectionCards
            label="Bar pattern"
            value={value.pattern}
            onValueChange={(pattern) => update({ pattern })}
            disabled={disabled}
            className="grid-cols-3 gap-2 [&_label]:flex-col [&_label]:p-2 [&_[data-slot=radio-group-item]]:sr-only"
            options={[
              { value: 'thin', label: 'Thin' },
              { value: 'bold', label: 'Bold' },
              { value: 'segmented', label: 'Segmented' }
            ]}
          />
          <SelectionCards
            label="Bar colour"
            value={value.colour}
            onValueChange={(colour) => update({ colour })}
            disabled={disabled}
            className="grid-cols-2 gap-2 [&_label]:p-3"
            options={[
              { value: 'ivory', label: 'Ivory' },
              { value: 'accent', label: 'Accent' }
            ]}
          />
          <RangeField
            label="Bar height"
            value={value.height}
            min={5}
            max={30}
            hint="Maximum height as a percentage of the frame."
            disabled={disabled}
            onValueChange={(height) => update({ height })}
          />
        </>
      ) : null}
      <SelectionCards
        label="Artwork framing"
        value={value.framing}
        onValueChange={(framing) => update({ framing })}
        disabled={disabled}
        className="grid-cols-2 gap-2 [&_label]:flex-col [&_label]:p-3"
        options={[
          { value: 'fit', label: 'Fit artwork', description: 'Keep the whole cover with soft artwork behind it.' },
          { value: 'fill', label: 'Fill frame', description: 'Crop artwork to fill the video.' }
        ]}
      />
      {value.framing === 'fill' ? (
        <>
          <RangeField
            label="Horizontal position"
            value={value.positionX}
            disabled={disabled}
            onValueChange={(positionX) => update({ positionX })}
          />
          <RangeField
            label="Vertical position"
            value={value.positionY}
            disabled={disabled}
            onValueChange={(positionY) => update({ positionY })}
          />
        </>
      ) : null}
      <RangeField
        label="Bottom fade"
        value={value.fade}
        hint="Darkens the bottom to keep bars and lyrics readable."
        disabled={disabled}
        onValueChange={(fade) => update({ fade })}
      />
    </div>
  )
}
