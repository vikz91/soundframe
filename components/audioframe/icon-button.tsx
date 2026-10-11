'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function IconButton({
  label,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'aria-label' | 'size'> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} size="icon" aria-label={label} />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
