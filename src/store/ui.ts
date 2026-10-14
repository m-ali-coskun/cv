import { create } from 'zustand'
import type { Match } from './types'

/** Ephemeral UI state (never persisted). */
interface UIState {
  paletteOpen: boolean
  notificationsOpen: boolean
  mobileNavOpen: boolean
  welcomeOpen: boolean
  /** Conversation currently on screen — suppresses message toasts for it. */
  activeConversationId: string | null
  /** Conversation ids where the counterpart is "typing". */
  typing: Record<string, boolean>
  /** When set, the full-screen "It's a match!" overlay is shown. */
  celebration: Match | null
  set: (patch: Partial<Omit<UIState, 'set'>>) => void
  setTyping: (conversationId: string, typing: boolean) => void
}

export const useUI = create<UIState>()((set) => ({
  paletteOpen: false,
  notificationsOpen: false,
  mobileNavOpen: false,
  welcomeOpen: false,
  activeConversationId: null,
  typing: {},
  celebration: null,
  set: (patch) => set(patch),
  setTyping: (conversationId, typing) =>
    set((s) => ({ typing: { ...s.typing, [conversationId]: typing } })),
}))
