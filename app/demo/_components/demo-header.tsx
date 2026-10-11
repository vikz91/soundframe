import Link from 'next/link'

export function DemoHeader({ label, index = false }: { label: string; index?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <Link href="/demo" className="font-heading text-xl font-semibold tracking-tight">
        <span className="mr-2 text-primary">◉</span> Audioframe
      </Link>
      <div className="flex items-center gap-4">
        {!index ? (
          <Link href="/demo" className="text-sm text-muted-foreground transition-colors hover:text-primary">
            ← All demos
          </Link>
        ) : null}
        <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
    </header>
  )
}
