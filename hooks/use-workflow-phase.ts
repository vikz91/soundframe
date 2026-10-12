'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { WorkflowStep } from '@/components/audioframe/workflow-stepper'
import {
  readWorkflowSearch,
  resolveWorkflowPhase,
  subscribeWorkflowPhase,
  writeWorkflowPhase,
  type WorkflowAvailability
} from '@/lib/editor/workflow-navigation'

export function useWorkflowPhase(state: WorkflowAvailability) {
  const search = useSyncExternalStore(subscribeWorkflowPhase, readWorkflowSearch, () => '')
  const phase = resolveWorkflowPhase(new URLSearchParams(search).get('phase'), state)
  useEffect(() => {
    // Missing, invalid, or unavailable phases replace the current entry instead of adding a Back loop.
    if (window.location.search === search) writeWorkflowPhase(phase, true)
  }, [phase, search])

  function navigate(next: WorkflowStep) {
    if (!state.busy && resolveWorkflowPhase(next, state) === next) writeWorkflowPhase(next)
  }

  return { phase, navigate, reset: () => writeWorkflowPhase('files', true) }
}
