import { useMemo } from 'react'
import { useApp } from '@/store'
import { useConversations, useMyJobs, useRole } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import type { CountKey } from './nav'

export function useNavCounts(): Record<CountKey, number> {
  const role = useRole()
  const jobs = useMyJobs({ ignoreDiscipline: true })
  const convs = useConversations()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const decisions = useApp((s) => s.decisions)
  const matches = useApp((s) => s.matches)
  const invoices = useApp((s) => s.invoices)
  return useMemo(() => {
    const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
    const pool = role === 'client' ? designers.filter((d) => d.id !== ME_DESIGNER_ID) : clients.filter((c) => c.id !== ME_CLIENT_ID)
    return {
      activeJobs: jobs.filter((j) => !['approved', 'declined', 'cancelled', 'requested'].includes(j.status)).length,
      requests: jobs.filter((j) => j.status === 'requested').length,
      unread: convs.reduce((n, c) => n + (c.conversation.muted ? 0 : c.unread), 0),
      newProfiles: pool.filter((p) => p.isNew && !decisions[role][p.id]).length,
      matches: matches.filter((m) => (role === 'client' ? m.clientId === me : m.designerId === me)).length,
      dueInvoices: invoices.filter(
        (i) => (role === 'client' ? i.clientId === me : i.designerId === me) && (i.status === 'pending' || i.status === 'overdue'),
      ).length,
    }
  }, [role, jobs, convs, designers, clients, decisions, matches, invoices])
}
