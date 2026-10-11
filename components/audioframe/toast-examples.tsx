'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

export function ToastExamples() {
  const [loadingId, setLoadingId] = useState<string | number | null>(null)
  const activeLoading = useRef<string | number | null>(null)

  useEffect(() => {
    return () => {
      if (activeLoading.current !== null) toast.dismiss(activeLoading.current)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => toast('Settings updated', { description: 'Example notification.' })}>
          Neutral toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success('Artwork ready', { description: 'Example success notification.' })}
        >
          Success toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.info('Media stays on your device', { description: 'Example information notification.' })}
        >
          Info toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning('Keep this tab open', { description: 'Example warning notification.' })}
        >
          Warning toast
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error('Could not open the file', { description: 'Example error notification.' })}
        >
          Error toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast('Example artwork removed', {
              description: 'Try the action to restore this example.',
              duration: 10000,
              action: {
                label: 'Undo',
                onClick: () => toast.success('Example artwork restored')
              }
            })
          }
        >
          Toast with action
        </Button>
        <Button
          variant="outline"
          disabled={loadingId !== null}
          onClick={() => {
            const id = toast.loading('Preparing preview…', { description: 'Finish or dismiss this example below.' })
            activeLoading.current = id
            setLoadingId(id)
          }}
        >
          Loading toast
        </Button>
        <Button
          disabled={loadingId === null}
          onClick={() => {
            if (loadingId === null) return
            toast.success('Example preview ready', { id: loadingId, description: 'The loading notification updated.' })
            activeLoading.current = null
            setLoadingId(null)
          }}
        >
          Finish loading
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            toast.dismiss()
            activeLoading.current = null
            setLoadingId(null)
          }}
        >
          Dismiss toasts
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Example notifications only. Loading stays visible until finished or dismissed. Focus notifications with Alt + T;
        hovering or focusing pauses dismissal. Colours follow the selected theme, and motion respects your device
        preferences.
      </p>
    </div>
  )
}
