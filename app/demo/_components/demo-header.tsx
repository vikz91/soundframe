import Image from 'next/image'
import Link from 'next/link'

export function DemoHeader({ label, index = false }: { label: string; index?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <Link
        href="/demo"
        aria-label="Audioframe demos"
        className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        <Image
          src="/audioframe_logo.png"
          alt=""
          width={500}
          height={500}
          className="h-auto w-36 sm:w-40"
          sizes="(min-width: 640px) 160px, 144px"
          priority
        />
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
