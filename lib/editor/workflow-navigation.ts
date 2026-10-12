import type { WorkflowStep } from '@/components/audioframe/workflow-stepper'

export type WorkflowAvailability = { available: boolean; hasResult: boolean; busy: boolean }
const phaseChangeEvent = 'audioframe:phasechange'

export function resolveWorkflowPhase(requested: string | null, state: WorkflowAvailability): WorkflowStep {
  if (state.busy) return 'export'
  if (requested === 'create' && state.available) return 'create'
  if (requested === 'export' && (state.available || state.hasResult)) return 'export'
  return 'files'
}

export function readWorkflowSearch() {
  return window.location.search
}

export function subscribeWorkflowPhase(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener(phaseChangeEvent, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(phaseChangeEvent, listener)
  }
}

/** Change only the phase, keeping the mounted workspace and local media alive. */
export function writeWorkflowPhase(phase: WorkflowStep, replace = false) {
  const url = new URL(window.location.href)
  url.searchParams.set('phase', phase)
  if (url.href === window.location.href) return
  if (replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
  // History writes don't emit popstate; notify our subscribers after Next.js handles the write.
  window.dispatchEvent(new Event(phaseChangeEvent))
}
