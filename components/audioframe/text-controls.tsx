'use client'

import { useId } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useFilePicker } from '@/hooks/use-file-picker'
import { Button } from '@/components/ui/button'
import { TextField, TextareaField } from './field'
import { Notice } from './status'
import type { SongDetails } from '@/lib/audioframe-design'

export function SongDetailsFields({
  value,
  onValueChange,
  disabled = false
}: {
  value: SongDetails
  onValueChange: (value: SongDetails) => void
  disabled?: boolean
}) {
  const fields: { key: keyof SongDetails; label: string; placeholder: string }[] = [
    { key: 'title', label: 'Song title', placeholder: 'A moment in colour' },
    { key: 'artist', label: 'Artist', placeholder: 'Your artist name' },
    { key: 'album', label: 'Album', placeholder: 'Your album name' },
    { key: 'website', label: 'Website', placeholder: 'yourwebsite.com' }
  ]
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="mb-4 text-sm font-semibold">
        Song details <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      {fields.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          placeholder={field.placeholder}
          maxLength={200}
          value={value[field.key]}
          onChange={(event) => onValueChange({ ...value, [field.key]: event.target.value })}
          disabled={disabled}
        />
      ))}
    </fieldset>
  )
}

export type LyricsMode = 'lrc' | 'plain'
/** The caller parses LRC and handles file reads; this panel only emits intent. */
export function LyricsControls({
  mode,
  onModeChange,
  text,
  onTextChange,
  onFileChange,
  onChooseRequest,
  filename,
  error,
  disabled = false
}: {
  mode: LyricsMode
  onModeChange: (mode: LyricsMode) => void
  text: string
  onTextChange: (text: string) => void
  onFileChange: (file: File) => void
  onChooseRequest?: () => void
  filename?: string
  error?: string
  disabled?: boolean
}) {
  const id = useId()
  const { inputRef, open, onChange } = useFilePicker(onFileChange, disabled)
  return (
    <div className="space-y-4">
      <Tabs
        value={mode}
        onValueChange={(value: unknown) => {
          if (value === 'lrc' || value === 'plain') onModeChange(value)
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="lrc" disabled={disabled}>
            Timed LRC
          </TabsTrigger>
          <TabsTrigger value="plain" disabled={disabled}>
            Plain text
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lrc" className="space-y-4 pt-4">
          {!onChooseRequest ? (
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept=".lrc,text/plain"
              aria-label="Choose timed LRC file"
              disabled={disabled}
              className="sr-only"
              tabIndex={-1}
              onChange={onChange}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={disabled} onClick={onChooseRequest ?? open}>
              {onChooseRequest ? 'Choose LRC sample' : 'Choose LRC file'}
            </Button>
            <Button variant="ghost" disabled={disabled || !text} onClick={() => onTextChange('')}>
              Remove lyrics
            </Button>
          </div>
          {filename ? (
            <p className="truncate text-xs text-muted-foreground" title={filename}>
              {filename}
            </p>
          ) : null}
          <TextareaField
            label="Timed lyrics"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="[00:12.00] Let the colour carry you"
            hint="Uses timestamps already present in your LRC file."
            disabled={disabled}
            className="min-h-40 font-mono"
          />
        </TabsContent>
        <TabsContent value="plain" className="pt-4">
          <TextareaField
            label="Plain lyrics"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            hint="Plain lyrics appear as static text."
            placeholder="Paste your lyrics here…"
            disabled={disabled}
            className="min-h-40"
          />
        </TabsContent>
      </Tabs>
      {error ? <Notice tone="danger" title={error} /> : null}
    </div>
  )
}
