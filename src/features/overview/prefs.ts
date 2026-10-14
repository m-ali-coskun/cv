import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PulseRange } from './data'

/**
 * Per-viewer dashboard preferences (range, filters, hidden widgets).
 * These are conveniences, not app data, so they live in their own small
 * persisted store instead of the main `useApp` state.
 */
export type RiskFilter = 'all' | 'high' | 'medium' | 'low'
export type AttentionSort = 'risk' | 'due'
export type MoneyRange = '12w' | '6m'

export const WIDGETS = ['strip', 'hero', 'pulse', 'attention', 'ai', 'gauge', 'requests', 'messages', 'upcoming', 'quick', 'money', 'activity', 'people', 'folders', 'marquee'] as const
export type WidgetId = (typeof WIDGETS)[number]

interface PrefsData {
  range: PulseRange
  riskFilter: RiskFilter
  sort: AttentionSort
  moneyRange: MoneyRange
  autoplay: boolean
  hidden: WidgetId[]
}

interface Prefs extends PrefsData {
  set: (patch: Partial<PrefsData>) => void
  toggle: (id: WidgetId) => void
  reset: () => void
}

const DEFAULTS: PrefsData = {
  range: '7d',
  riskFilter: 'all',
  sort: 'risk',
  moneyRange: '12w',
  autoplay: true,
  hidden: [],
}

const safeStorage = createJSONStorage(() => {
  try {
    const ls = window.localStorage
    ls.getItem('__probe')
    return ls
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      toggle: (id) => set((s) => ({ hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] })),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'designtab-overview',
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ range: s.range, riskFilter: s.riskFilter, sort: s.sort, moneyRange: s.moneyRange, autoplay: s.autoplay, hidden: s.hidden }),
    },
  ),
)

/** true when the widget should render. */
export function useWidget(id: WidgetId) {
  return usePrefs((s) => !s.hidden.includes(id))
}
