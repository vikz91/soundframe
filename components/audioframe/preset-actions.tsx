'use client'

import { UploadSimpleIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { useFilePicker } from '@/hooks/use-file-picker'
import { Button } from '@/components/ui/button'

/** Intent controls only; the caller validates/version-checks and serializes JSON. */
export function PresetActions({
  onImport,
  onImportRequest,
  onExport,
  disabled = false
}: {
  onImport: (file: File) => void
  onImportRequest?: () => void
  onExport: () => void
  disabled?: boolean
}) {
  const { inputRef, open, onChange } = useFilePicker(onImport, disabled)
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Project settings" className="flex flex-wrap gap-2">
        {!onImportRequest ? (
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Import JSON settings file"
            disabled={disabled}
            className="sr-only"
            tabIndex={-1}
            onChange={onChange}
          />
        ) : null}
        <Button variant="outline" disabled={disabled} onClick={onImportRequest ?? open}>
          <UploadSimpleIcon aria-hidden="true" />
          Import settings
        </Button>
        <Button variant="outline" disabled={disabled} onClick={onExport}>
          <DownloadSimpleIcon aria-hidden="true" />
          Export settings
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {onImportRequest
          ? 'Sample settings only. No settings file is read or saved.'
          : 'JSON settings only. Choose audio and artwork separately.'}
      </p>
    </div>
  )
}
