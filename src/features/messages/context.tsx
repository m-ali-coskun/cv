import { createContext, useContext } from 'react'
import type { Job, MediaRef, Message, Role } from '@/store/types'
import type { Person } from './model'

export interface ThreadCtxValue {
  convId: string
  meId: string
  role: Role
  counterpart?: Person
  counterpartId: string
  jobById: Map<string, Job>
  messagesById: Map<string, Message>
  /** Counterpart's last read timestamp (read receipts). */
  readAt: string
  /** Id of the newest own message (gets the "Read / Delivered" label). */
  lastOwnId?: string
  query: string
  currentHitId?: string
  flashId?: string
  saved: Set<string>
  coarse: boolean
  reply: (m: Message) => void
  edit: (m: Message) => void
  remove: (m: Message) => void
  react: (m: Message, emoji: string) => void
  toggleSave: (m: Message) => void
  copy: (m: Message) => void
  openMedia: (items: MediaRef[], index: number, origin?: (i: number) => Element | null | undefined) => void
  jumpTo: (id: string) => void
  openSheet: (m: Message) => void
  openJob: (id: string, tab?: string) => void
}

export const ThreadCtx = createContext<ThreadCtxValue | null>(null)

export function useThreadCtx() {
  const v = useContext(ThreadCtx)
  if (!v) throw new Error('ThreadCtx missing')
  return v
}
