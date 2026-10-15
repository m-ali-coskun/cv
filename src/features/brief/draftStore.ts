/**
 * Wizard state (local to the brief feature): the draft being written, the
 * current step, navigation direction, touched fields and autosave status.
 * Autosave writes to localStorage under DRAFT_KEY (see useAutosave in Wizard).
 */
import { create } from 'zustand'
import type { StyleGuide } from '@/store/types'
import { emptyDraft, STEP, type BriefDraft } from './model'

export const DRAFT_KEY = 'designtab-brief-draft'

export interface SavedDraft {
  v: 1
  draft: BriefDraft
  step: number
  savedAt: string
}

export function readSavedDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedDraft
    if (!parsed || parsed.v !== 1 || !parsed.draft) return null
    // tolerate older shapes: fill any missing fields from the empty draft
    const base = emptyDraft()
    return { ...parsed, draft: { ...base, ...parsed.draft, style: { ...base.style, ...parsed.draft.style } } }
  } catch {
    return null
  }
}

export function writeSavedDraft(draft: BriefDraft, step: number): string {
  const savedAt = new Date().toISOString()
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, draft, step, savedAt } satisfies SavedDraft))
  } catch {
    /* storage full / private mode — autosave is best-effort */
  }
  return savedAt
}

export function clearSavedDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

interface WizardState {
  draft: BriefDraft
  step: number
  /** +1 forward, -1 back — drives the slide direction. */
  dir: 1 | -1
  /** Highest step the user reached (stepper lets them jump back to it). */
  reached: number
  /** Fields the user has blurred / tried to submit (errors only show then). */
  touched: Record<string, boolean>
  /** Edited since load/restore — autosave only runs when true. */
  dirty: boolean
  savedAt: string | null
  /** A previous draft waiting for "Continue / Discard". */
  pending: SavedDraft | null

  set: (patch: Partial<BriefDraft>, opts?: { silent?: boolean }) => void
  setStyle: (patch: Partial<StyleGuide>) => void
  goTo: (step: number) => void
  touch: (...fields: string[]) => void
  init: (draft: BriefDraft, pending: SavedDraft | null, step?: number) => void
  restore: () => void
  discardPending: () => void
  markSaved: (at: string) => void
}

export const useWizard = create<WizardState>()((set, get) => ({
  draft: emptyDraft(),
  step: STEP.start,
  dir: 1,
  reached: STEP.start,
  touched: {},
  dirty: false,
  savedAt: null,
  pending: null,

  set: (patch, opts) => set((s) => ({ draft: { ...s.draft, ...patch }, dirty: opts?.silent ? s.dirty : true })),
  setStyle: (patch) => set((s) => ({ draft: { ...s.draft, style: { ...s.draft.style, ...patch } }, dirty: true })),
  goTo: (step) => {
    const cur = get().step
    if (step === cur) return
    set((s) => ({ step, dir: step > cur ? 1 : -1, reached: Math.max(s.reached, step), dirty: s.dirty || s.reached < step }))
  },
  touch: (...fields) => set((s) => ({ touched: { ...s.touched, ...Object.fromEntries(fields.map((f) => [f, true])) } })),
  init: (draft, pending, step = STEP.start) =>
    set({ draft, pending, step, dir: 1, reached: step, touched: {}, dirty: false, savedAt: null }),
  restore: () => {
    const p = get().pending
    if (!p) return
    const step = Math.max(0, Math.min(STEP.review, p.step))
    set({ draft: p.draft, step, dir: 1, reached: STEP.review, pending: null, touched: {}, dirty: false, savedAt: p.savedAt })
  },
  discardPending: () => set({ pending: null }),
  markSaved: (at) => set({ savedAt: at }),
}))
