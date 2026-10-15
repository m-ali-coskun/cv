import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type InboxFilter = 'all' | 'unread' | 'pinned' | 'archived'

interface MessagesPrefs {
  filter: InboxFilter
  /** Info panel open on wide screens. */
  infoOpen: boolean
  /** Bookmarked message ids ("Saved"). */
  saved: string[]
  /** Most recently used emojis (picker + reactions). */
  recentEmoji: string[]
  setFilter: (f: InboxFilter) => void
  setInfoOpen: (open: boolean) => void
  toggleSaved: (id: string) => void
  pushEmoji: (emoji: string) => void
}

/** Per-viewer inbox preferences (persisted separately from the app store). */
export const useMessagesPrefs = create<MessagesPrefs>()(
  persist(
    (set) => ({
      filter: 'all',
      infoOpen: true,
      saved: [],
      recentEmoji: ['👍', '🔥', '🙌', '❤️', '😂', '🎉', '✨', '🙏'],
      setFilter: (filter) => set({ filter }),
      setInfoOpen: (infoOpen) => set({ infoOpen }),
      toggleSaved: (id) => set((s) => ({ saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [id, ...s.saved].slice(0, 200) })),
      pushEmoji: (emoji) => set((s) => ({ recentEmoji: [emoji, ...s.recentEmoji.filter((e) => e !== emoji)].slice(0, 16) })),
    }),
    { name: 'designtab-messages', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)

interface PendingDeletes {
  /** Messages hidden while their "Undo" toast is visible. */
  hidden: Record<string, true>
  hide: (id: string) => void
  restore: (id: string) => void
}

export const usePendingDeletes = create<PendingDeletes>()((set) => ({
  hidden: {},
  hide: (id) => set((s) => ({ hidden: { ...s.hidden, [id]: true } })),
  restore: (id) =>
    set((s) => {
      const next = { ...s.hidden }
      delete next[id]
      return { hidden: next }
    }),
}))
