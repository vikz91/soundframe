import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Audioframe home"
      className={cn(
        'inline-flex shrink-0 items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        className
      )}
    >
      <Image src="/audioframe_logo.png" alt="" width={44} height={44} className="rounded-control" />
      <span className="font-heading text-xl font-semibold tracking-tight">Audioframe</span>
    </Link>
  )
}

export function PrivacyNote({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-sm text-muted-foreground', className)}>
      <ShieldCheckIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
      <span>
        {compact ? 'Files stay on your device' : 'Your files stay on your device. Nothing is uploaded to a server.'}
      </span>
    </p>
  )
}
