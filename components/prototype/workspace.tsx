'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { QuestionIcon, TrashIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { usePrototype } from '@/hooks/use-prototype'
import { canCreate, type PrototypeDialog } from '@/lib/prototype/controller'
import { prototypeLabel } from '@/lib/prototype/fixtures'
import { EditorHeader } from '@/components/audioframe/editor-shell'
import { WorkflowStepper } from '@/components/audioframe/workflow-stepper'
import { ConfirmDialog } from '@/components/audioframe/confirm-dialog'
import { StatusBadge } from '@/components/audioframe/status'
import { Button } from '@/components/ui/button'
import { FilesView } from './files-view'
import { EditorView } from './editor-view'
import { ExportView } from './export-view'
import { SampleChooser } from './sample-chooser'
import { HelpDialog } from './help-dialog'
import { PreviewDialog } from './preview-dialog'
import { ThemeToggle } from './theme-toggle'

const titles = {
  files: 'Bring your sound.',
  create: 'Make it yours.',
  export: 'Finish your frame.',
  download: 'Your sample result.'
}

export function PrototypeWorkspace() {
  const { state, controller } = usePrototype()
  const returnFocus = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const busy = state.export.status === 'running'
  const available = canCreate(state)
  function setDialog(dialog: PrototypeDialog) {
    if (dialog && !state.dialog && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement
    controller.setDialog(dialog)
  }
  const actions = {
    ...controller,
    setDialog,
    selectSample: (kind: Parameters<typeof controller.selectSample>[0], id: string) => {
      // The picker trigger is temporarily disabled while the sample is checked.
      if (kind === 'audio' || kind === 'artwork') returnFocus.current = heading.current
      controller.selectSample(kind, id)
    }
  }
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    heading.current?.closest('main')?.scrollIntoView({ block: 'start' })
  }, [state.view])
  const header = (
    <EditorHeader
      project={
        <div>
          <p className="font-medium">{state.preferences.details.title || 'Untitled sample'}</p>
          <p className="text-xs text-muted-foreground">Sample project · Session only</p>
        </div>
      }
      steps={
        <WorkflowStepper
          current={state.view === 'download' ? 'export' : state.view}
          onStepChange={actions.navigate}
          disabled={busy}
          disabledSteps={available ? [] : ['create', 'export']}
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog('help')}>
            <QuestionIcon aria-hidden="true" />
            Help
          </Button>
          <Button variant="ghost" onClick={() => setDialog('clear')}>
            <TrashIcon aria-hidden="true" />
            Clear project
          </Button>
        </div>
      }
    />
  )
  const footer = (
    <>
      <span className="text-xs text-muted-foreground">Sample visuals only · No audio is played</span>
      <div className="flex flex-wrap gap-2">
        {state.output ? (
          <Button variant="outline" onClick={() => actions.navigate('download')}>
            View last result
          </Button>
        ) : null}
        <Button onClick={() => actions.navigate('export')} disabled={!available}>
          Export sample
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </div>
    </>
  )
  return (
    <main className="mx-auto w-full max-w-editor flex-1 px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info" className="max-w-full whitespace-normal">
          {prototypeLabel}
        </StatusBadge>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/demo" className="text-sm text-primary underline underline-offset-4">
            Existing demos
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <div className="mb-7 space-y-2">
        <h1
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-6 font-heading text-page-title font-semibold tracking-tight outline-none"
        >
          {titles[state.view]}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Try the complete journey with built-in samples. No files are selected, processed, or saved.
        </p>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="mb-5 min-h-5 text-sm text-primary">
        {state.announcement}
      </div>
      {state.view === 'create' ? (
        <EditorView state={state} actions={actions} header={header} footer={footer} />
      ) : (
        <div className="space-y-7">
          {header}
          {state.view === 'files' ? (
            <FilesView state={state} actions={actions} />
          ) : (
            <ExportView state={state} actions={actions} now={state.now} />
          )}
        </div>
      )}
      <SampleChooser state={state} actions={actions} returnFocus={returnFocus} />
      <HelpDialog
        open={state.dialog === 'help'}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        topic={state.view === 'download' ? 'export' : state.view}
        returnFocus={returnFocus}
      />
      <PreviewDialog state={state} actions={actions} returnFocus={returnFocus} />
      <ConfirmDialog
        open={state.dialog === 'clear'}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        returnFocus={returnFocus}
        title="Clear this sample project?"
        description="Remove selected samples, settings, playback, and the in-app sample result. Files already downloaded outside this prototype are unaffected."
        confirmLabel="Clear project"
        onConfirm={() => {
          returnFocus.current = heading.current
          actions.clear()
        }}
      />
      <ConfirmDialog
        open={state.dialog === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        returnFocus={returnFocus}
        title="Cancel this simulated export?"
        description="Stop the simulation and keep your editable sample project."
        cancelLabel="Continue exporting"
        confirmLabel="Cancel export"
        onConfirm={() => {
          returnFocus.current = heading.current
          actions.cancelExport()
        }}
      />
      <ConfirmDialog
        open={state.dialog === 'replace'}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        returnFocus={returnFocus}
        title="Replace current settings?"
        description="Apply the Small hours sample’s appearance, song details, lyrics, and output format. Selected audio and artwork samples stay in place."
        cancelLabel="Keep current settings"
        confirmLabel="Apply preset"
        confirmVariant="default"
        onConfirm={actions.applyPreset}
      />
    </main>
  )
}
