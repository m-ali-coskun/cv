import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { JobStatus } from '@/store/types'

export type JobsView = 'board' | 'list' | 'timeline'
export type SortKey = 'due' | 'priority' | 'updated' | 'progress' | 'budget' | 'id' | 'title' | 'counterpart' | 'status' | 'created'
export type SortDir = 'asc' | 'desc'
export type TimelineZoom = 'day' | 'week'

/** Per-viewer conveniences for the jobs page (remembered view, sort, collapsed columns…). */
interface JobsPrefs {
  view: JobsView
  sort: SortKey
  dir: SortDir
  collapsed: JobStatus[]
  covers: boolean
  showClosed: boolean
  zoom: TimelineZoom
  set: (patch: Partial<Omit<JobsPrefs, 'set' | 'toggleCollapsed'>>) => void
  toggleCollapsed: (s: JobStatus) => void
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__dt_probe'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (n: string) => mem.get(n) ?? null,
      setItem: (n: string, v: string) => void mem.set(n, v),
      removeItem: (n: string) => void mem.delete(n),
    }
  }
})

export const useJobsPrefs = create<JobsPrefs>()(
  persist(
    (set) => ({
      view: 'board',
      sort: 'due',
      dir: 'asc',
      collapsed: [],
      covers: true,
      showClosed: false,
      zoom: 'day',
      set: (patch) => set(patch),
      toggleCollapsed: (s) => set((p) => ({ collapsed: p.collapsed.includes(s) ? p.collapsed.filter((x) => x !== s) : [...p.collapsed, s] })),
    }),
    { name: 'designtab-jobs-prefs', storage: safeStorage, version: 1 },
  ),
)
