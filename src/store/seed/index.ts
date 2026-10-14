import type { AppData } from '../index'
import { conversations, messages } from './chat'
import { jobs } from './jobs'
import { decisions, events, invoices, matches, notifications } from './misc'
import { clients, designers } from './people'

export type SeedData = Omit<AppData, 'settings' | 'superLikesLeft' | 'seededAt'>

/** Fresh, deep-copied demo dataset (dates are relative to "now"). */
export function createSeed(): SeedData {
  return structuredClone({
    designers,
    clients,
    decisions,
    matches,
    jobs,
    conversations,
    messages,
    notifications,
    invoices,
    events,
  })
}
