'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

function subscribeTheme(listener: () => void) {
  const observer = new MutationObserver(listener)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
function readTheme() {
  return document.documentElement.classList.contains('dark')
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false)
  useEffect(() => {
    const original = document.documentElement.classList.contains('dark')
    return () => {
      document.documentElement.classList.toggle('dark', original)
    }
  }, [])
  return (
    <Button
      variant="outline"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      onClick={() => {
        document.documentElement.classList.toggle('dark', !dark)
      }}
    >
      {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      {dark ? 'Light theme' : 'Dark theme'}
    </Button>
  )
}
