import { createContext, useContext } from 'react'
import type { Job, MediaRef, Role } from '@/store/types'

export type ModalKind = 'decline' | 'counter' | 'deliver' | 'approve' | 'revision' | 'assets' | 'schedule' | 'cancel'
export const TABS = ['overview', 'design', 'assets', 'deliveries', 'revisions', 'timeline', 'payments'] as const
export type TabId = (typeof TABS)[number]

/** Minimal person view used everywhere on the page (designer or client). */
export interface PersonLite {
  id: string
  kind: 'client' | 'designer'
  name: string
  sub: string
  avatarSeed: string
  media?: MediaRef
  color?: string
}

export interface JobDetailCtx {
  job: Job
  /** Active workspace role. */
  role: Role
  /** The side of this job Ali is on (client when he hired, designer when he was hired). */
  side: Role
  /** Ali can act (the job belongs to the active workspace). */
  canAct: boolean
  /** Ali's id on this job's side. */
  meId: string
  client?: PersonLite
  designer?: PersonLite
  counterpart?: PersonLite
  person: (id: string) => PersonLite | undefined
  modal: ModalKind | null
  openModal: (m: ModalKind) => void
  closeModal: () => void
  tab: TabId
  setTab: (t: TabId) => void
  styleEdit: boolean
  setStyleEdit: (v: boolean) => void
  /** Version focused in the Deliveries tab (null = latest). */
  versionId: string | null
  setVersionId: (id: string | null) => void
  /** Jump to the Deliveries tab with a version selected. */
  showVersion: (id?: string) => void
}

export const JobCtx = createContext<JobDetailCtx | null>(null)

export function useJobCtx(): JobDetailCtx {
  const ctx = useContext(JobCtx)
  if (!ctx) throw new Error('useJobCtx outside JobDetailPage')
  return ctx
}
