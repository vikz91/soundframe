import type { ReactNode } from 'react'
import type { PrototypeController, PrototypeState } from '@/lib/prototype/controller'
export type PrototypeViewProps = { state: PrototypeState; actions: PrototypeController }
export type CompositionProps = {
  preferences: PrototypeState['preferences']
  currentTime?: number
  playing?: boolean
  className?: string
}
export type EditorViewProps = PrototypeViewProps & { header: ReactNode; footer: ReactNode }
