'use client'

import { useRef, type ReactNode, type RefObject } from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep project',
  confirmVariant = 'destructive',
  returnFocus,
  onConfirm,
  open,
  onOpenChange
}: {
  trigger?: ReactNode
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  returnFocus?: RefObject<HTMLElement | null>
  onConfirm: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const safeAction = useRef<HTMLButtonElement>(null)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={<Button variant="outline" />}>{trigger}</DialogTrigger> : null}
      <DialogContent
        initialFocus={safeAction}
        finalFocus={returnFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button ref={safeAction} variant="outline" />}>{cancelLabel}</DialogClose>
          <DialogClose render={<Button variant={confirmVariant} onClick={onConfirm} />}>{confirmLabel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
