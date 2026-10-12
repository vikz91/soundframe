'use client'

import { useEffect } from 'react'

export function AppVersion({ version }: { version: string }) {
  useEffect(() => {
    console.info(`[Audioframe] v${version}`)
  }, [version])

  return null
}
