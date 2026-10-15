import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NotifGroup } from './notifMeta'

/**
 * Local, per-browser preferences that are not part of the shared app model
 * (they are not exported with the demo data and survive "Reset demo").
 */
export type Digest = 'instant' | 'daily' | 'weekly'

interface PrefsState {
  /** Categories whose notifications land silently (no toast, no sound). */
  muted: Partial<Record<NotifGroup, boolean>>
  /** Do not disturb: silences every toast & sound. */
  dnd: boolean
  digest: Digest
  /** Command palette recents (item keys, newest first). */
  recents: string[]
  setMuted: (group: NotifGroup, muted: boolean) => void
  setPrefs: (patch: Partial<Pick<PrefsState, 'dnd' | 'digest' | 'muted'>>) => void
  pushRecent: (key: string) => void
  clearRecents: () => void
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      muted: {},
      dnd: false,
      digest: 'daily',
      recents: [],
      setMuted: (group, muted) => set((s) => ({ muted: { ...s.muted, [group]: muted } })),
      setPrefs: (patch) => set(patch),
      pushRecent: (key) => set((s) => ({ recents: [key, ...s.recents.filter((k) => k !== key)].slice(0, 8) })),
      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'designtab-prefs',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ muted: s.muted, dnd: s.dnd, digest: s.digest, recents: s.recents }) as PrefsState,
    },
  ),
)
