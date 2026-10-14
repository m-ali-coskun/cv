import type { AppData } from '../index'
import { buildChat } from './chat'
import { resetClock } from './factories'
import { buildJobs } from './jobs'
import { buildDecisions, buildEvents, buildInvoices, buildMatches, buildNotifications } from './misc'
import { buildClients, buildDesigners } from './people'

export type SeedData = Omit<AppData, 'settings' | 'superLikesLeft' | 'seededAt'>

/**
 * Fresh demo dataset. Every call rebuilds it relative to the current time, so
 * "Reset demo" always yields due dates, chats and calendar events that make
 * sense today.
 */
export function createSeed(): SeedData {
  resetClock()
  const designers = buildDesigners()
  const clients = buildClients()
  const jobs = buildJobs()
  const { conversations, messages } = buildChat(jobs)
  return {
    designers,
    clients,
    decisions: buildDecisions(),
    matches: buildMatches(),
    jobs,
    conversations,
    messages,
    notifications: buildNotifications(),
    invoices: buildInvoices(),
    events: buildEvents(),
  }
}
