import type { JobStatus, Priority } from '@/store/types'
import { PRIORITY_RANK, STATUS_RANK, type JobRow } from '../shared/model'
import type { SortDir, SortKey } from './prefs'

export interface JobFilters {
  statuses: JobStatus[]
  priorities: Priority[]
  counterparts: string[]
  starred: boolean
  overdue: boolean
  atRisk: boolean
  query: string
}

export const EMPTY_FILTERS: JobFilters = { statuses: [], priorities: [], counterparts: [], starred: false, overdue: false, atRisk: false, query: '' }

export function activeFilterCount(f: JobFilters) {
  return f.statuses.length + f.priorities.length + f.counterparts.length + Number(f.starred) + Number(f.overdue) + Number(f.atRisk)
}

export function matchesQuery(row: JobRow, q: string) {
  if (!q.trim()) return true
  const hay = `${row.job.id} ${row.job.title} ${row.name} ${row.job.tags.join(' ')} ${row.job.summary}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

/** Everything except the status filter (the board shows statuses as columns). */
export function applyFilters(rows: JobRow[], f: JobFilters, opts?: { ignoreStatus?: boolean }) {
  return rows.filter(
    (r) =>
      (opts?.ignoreStatus || !f.statuses.length || f.statuses.includes(r.job.status)) &&
      (!f.priorities.length || f.priorities.includes(r.job.priority)) &&
      (!f.counterparts.length || f.counterparts.includes(r.counterpartId)) &&
      (!f.starred || r.job.starred) &&
      (!f.overdue || r.urgency === 'overdue') &&
      (!f.atRisk || r.risk.level !== 'low') &&
      matchesQuery(r, f.query),
  )
}

const cmp = (a: number | string, b: number | string) => (a < b ? -1 : a > b ? 1 : 0)

export function sortRows(rows: JobRow[], key: SortKey, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  const val = (r: JobRow): number | string => {
    switch (key) {
      case 'due':
        return r.job.dueAt
      case 'priority':
        return PRIORITY_RANK[r.job.priority]
      case 'updated':
        return r.job.updatedAt
      case 'created':
        return r.job.createdAt
      case 'progress':
        return r.job.progress
      case 'budget':
        return r.job.budget
      case 'id':
        return Number(r.job.id.replace(/\D/g, ''))
      case 'title':
        return r.job.title.toLowerCase()
      case 'counterpart':
        return r.name.toLowerCase()
      case 'status':
        return STATUS_RANK[r.job.status]
    }
  }
  // starred float to the top inside the same value only as a tie-breaker
  return [...rows].sort((a, b) => cmp(val(a), val(b)) * m || Number(b.job.starred) - Number(a.job.starred) || cmp(a.job.id, b.job.id))
}

/** Natural direction when a sort key is first picked. */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
  due: 'asc',
  priority: 'desc',
  updated: 'desc',
  created: 'desc',
  progress: 'desc',
  budget: 'desc',
  id: 'desc',
  title: 'asc',
  counterpart: 'asc',
  status: 'asc',
}
