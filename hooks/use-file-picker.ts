'use client'

import { useCallback, useRef, type ChangeEvent } from 'react'

/** Single-file input actions; reset before notifying so the same file can be selected again. */
export function useFilePicker(onFile: (file: File) => void, disabled = false) {
  const inputRef = useRef<HTMLInputElement>(null)
  const reset = useCallback(() => {
    if (inputRef.current) inputRef.current.value = ''
  }, [])
  const open = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (file && !disabled) onFile(file)
    },
    [disabled, onFile]
  )
  return { inputRef, open, reset, onChange }
}
