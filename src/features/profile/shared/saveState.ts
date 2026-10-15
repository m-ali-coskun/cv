import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'

/**
 * Ephemeral autosave + navigation state for the profile editors.
 * Each section shows a tiny "Saving… → Saved" pill; the page header shows
 * when the last change was persisted. `flash` highlights a section after the
 * strength checklist scrolls to it.
 */
type SaveStatus = 'saving' | 'saved'

interface SaveUIState {
  sections: Record<string, { status: SaveStatus; at: number }>
  lastSavedAt: number | null
  flash: { id: string; n: number } | null
  mark: (section: string, status: SaveStatus) => void
  flashSection: (id: string) => void
}

export const useSaveUI = create<SaveUIState>()((set) => ({
  sections: {},
  lastSavedAt: null,
  flash: null,
  mark: (section, status) =>
    set((s) => ({
      sections: { ...s.sections, [section]: { status, at: Date.now() } },
      lastSavedAt: status === 'saved' ? Date.now() : s.lastSavedAt,
    })),
  flashSection: (id) => set((s) => ({ flash: { id, n: (s.flash?.n ?? 0) + 1 } })),
}))

export const markSaving = (section: string) => useSaveUI.getState().mark(section, 'saving')
export const markSaved = (section: string) => useSaveUI.getState().mark(section, 'saved')

/** Smooth-scroll to a section card, flash it and focus its first field. */
export function scrollToSection(id: string, focus = true) {
  const el = document.getElementById(`sec-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  useSaveUI.getState().flashSection(id)
  if (focus) {
    window.setTimeout(() => {
      const field = el.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]), textarea, select')
      field?.focus({ preventScroll: true })
    }, 650)
  }
}

/**
 * Local state for a text-ish field that commits to the store after the user
 * pauses typing (and on blur / unmount). External changes flow back in while
 * nothing is pending.
 */
export function useDebouncedCommit<T>(value: T, commit: (v: T) => void, section: string, delay = 650) {
  const [local, setLocal] = useState<T>(value)
  const pending = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef({ local, commit })
  latest.current = { local, commit }

  useEffect(() => {
    if (!pending.current) setLocal(value)
  }, [value])

  const flush = useCallback(() => {
    if (!pending.current) return
    window.clearTimeout(timer.current)
    pending.current = false
    latest.current.commit(latest.current.local)
    markSaved(section)
  }, [section])

  const update = useCallback(
    (v: T) => {
      setLocal(v)
      latest.current.local = v
      pending.current = true
      markSaving(section)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        pending.current = false
        latest.current.commit(latest.current.local)
        markSaved(section)
      }, delay)
    },
    [delay, section],
  )

  useEffect(
    () => () => {
      if (pending.current) {
        window.clearTimeout(timer.current)
        pending.current = false
        latest.current.commit(latest.current.local)
        markSaved(section)
      }
    },
    [section],
  )

  return [local, update, flush] as const
}
