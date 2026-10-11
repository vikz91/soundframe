import type { ReactNode } from 'react'
import { Brand, PrivacyNote } from './brand'

export function EditorHeader({
  project,
  steps,
  actions
}: {
  project?: ReactNode
  steps?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
      <div className="flex min-w-0 flex-wrap items-center gap-5">
        <Brand />
        {project ? <div className="min-w-0 border-l pl-5 text-sm">{project}</div> : null}
      </div>
      {steps ? <div className="w-full sm:w-auto">{steps}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : <PrivacyNote compact />}
    </header>
  )
}

export function EditorShell({
  header,
  inspector,
  children,
  footer
}: {
  header: ReactNode
  inspector: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-editor space-y-6">
      {header}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[var(--inspector-width)_minmax(0,1fr)]">
        <aside aria-label="Composition controls" className="order-2 min-w-0 lg:order-1">
          {inspector}
        </aside>
        <div className="order-1 min-w-0 lg:order-2">{children}</div>
      </div>
      {footer ? (
        <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background py-4">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
