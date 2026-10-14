import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Role, SwipeDecision } from '@/store/types'
import { DEFAULT_FILTERS, type DiscoverFilters } from './model'

export type DiscoverMode = 'swipe' | 'grid' | 'new'
export type GridShow = 'all' | 'todo' | 'liked' | 'passed'

export interface SwipeRecord {
  id: string
  decision: SwipeDecision
  matchId?: string
  at: number
  /** Direction the card left the deck (for the undo fly-back). */
  dir: -1 | 1 | 0
}

interface DiscoverUIState {
  filters: Record<Role, DiscoverFilters>
  query: string
  gridShow: GridShow
  /** Swipes made this session (undo stack, newest last). */
  history: Record<Role, SwipeRecord[]>
  /** Profile id shown in the preview drawer. */
  preview: string | null
  /** Profile that was just brought back by Undo (pinned to the top of the deck). */
  returning: { id: string; dir: -1 | 1 | 0 } | null
  setFilters: (role: Role, patch: Partial<DiscoverFilters>) => void
  resetFilters: (role: Role) => void
  setQuery: (q: string) => void
  setGridShow: (s: GridShow) => void
  pushHistory: (role: Role, r: SwipeRecord) => void
  popHistory: (role: Role, id?: string) => SwipeRecord | undefined
  setPreview: (id: string | null) => void
  setReturning: (r: DiscoverUIState['returning']) => void
}

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

/** Ephemeral discover UI state; only the filters are remembered per browser. */
export const useDiscoverUI = create<DiscoverUIState>()(
  persist(
    (set, get) => ({
      filters: { client: { ...DEFAULT_FILTERS }, designer: { ...DEFAULT_FILTERS } },
      query: '',
      gridShow: 'all',
      history: { client: [], designer: [] },
      preview: null,
      returning: null,
      setFilters: (role, patch) => set((s) => ({ filters: { ...s.filters, [role]: { ...s.filters[role], ...patch } } })),
      resetFilters: (role) => set((s) => ({ filters: { ...s.filters, [role]: { ...DEFAULT_FILTERS, sort: s.filters[role].sort } } })),
      setQuery: (query) => set({ query }),
      setGridShow: (gridShow) => set({ gridShow }),
      pushHistory: (role, r) => set((s) => ({ history: { ...s.history, [role]: [...s.history[role].filter((x) => x.id !== r.id), r].slice(-40) } })),
      popHistory: (role, id) => {
        const list = get().history[role]
        const rec = id ? list.find((x) => x.id === id) : list[list.length - 1]
        if (!rec) return undefined
        set((s) => ({ history: { ...s.history, [role]: s.history[role].filter((x) => x !== rec) } }))
        return rec
      },
      setPreview: (preview) => set({ preview }),
      setReturning: (returning) => set({ returning }),
    }),
    {
      name: 'designtab-discover',
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ filters: s.filters, gridShow: s.gridShow }) as unknown as DiscoverUIState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DiscoverUIState>
        return {
          ...current,
          gridShow: p.gridShow ?? current.gridShow,
          filters: {
            client: { ...DEFAULT_FILTERS, ...(p.filters?.client ?? {}) },
            designer: { ...DEFAULT_FILTERS, ...(p.filters?.designer ?? {}) },
          },
        }
      },
    },
  ),
)
