import { createStore, entries } from 'idb-keyval'
import { DEFAULT_SETTINGS, useApp, type AppData } from '@/store'
import { sim } from '@/store/simulation'
import { JOB_STATUSES } from '@/store/types'
import { usePrefs } from './prefs'

/** Keys that make up the persisted demo world (mirrors the store's partialize). */
export const PERSIST_KEYS = [
  'settings',
  'designers',
  'clients',
  'decisions',
  'matches',
  'superLikesLeft',
  'jobs',
  'conversations',
  'messages',
  'notifications',
  'invoices',
  'events',
  'seededAt',
] as const satisfies readonly (keyof AppData)[]

const ARRAY_KEYS = ['designers', 'clients', 'matches', 'jobs', 'conversations', 'messages', 'notifications', 'invoices', 'events'] as const

export function snapshot(): AppData {
  const s = useApp.getState()
  const out = {} as Record<string, unknown>
  for (const k of PERSIST_KEYS) out[k] = s[k]
  return out as unknown as AppData
}

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Triggers a download of the whole workspace as JSON. Returns the file size in bytes. */
export function exportData(): number {
  const prefs = usePrefs.getState()
  const payload = {
    app: 'designTab',
    format: 1,
    exportedAt: new Date().toISOString(),
    state: snapshot(),
    prefs: { muted: prefs.muted, dnd: prefs.dnd, digest: prefs.digest },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `designtab-backup-${stamp()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return blob.size
}

export type ImportError = 'parse' | 'shape' | 'empty'
export type ImportResult =
  | { ok: true; counts: { jobs: number; messages: number; people: number; notifications: number } }
  | { ok: false; error: ImportError; detail?: string }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Validates a backup (our export format or a raw copy of the persisted store). */
export function validateBackup(raw: unknown): { ok: true; data: AppData; prefs?: Record<string, unknown> } | { ok: false; error: ImportError; detail?: string } {
  if (!isObj(raw)) return { ok: false, error: 'shape' }
  const state = isObj(raw.state) ? raw.state : raw
  for (const k of ARRAY_KEYS) {
    if (!Array.isArray(state[k])) return { ok: false, error: 'shape', detail: k }
  }
  if (!isObj(state.settings)) return { ok: false, error: 'shape', detail: 'settings' }
  if (!isObj(state.decisions) || !isObj(state.decisions.client) || !isObj(state.decisions.designer))
    return { ok: false, error: 'shape', detail: 'decisions' }
  const jobs = state.jobs as unknown[]
  const badJob = jobs.find(
    (j) => !isObj(j) || typeof j.id !== 'string' || typeof j.title !== 'string' || !(JOB_STATUSES as readonly string[]).includes(String(j.status)),
  )
  if (badJob) return { ok: false, error: 'shape', detail: 'jobs' }
  const people = [...(state.designers as unknown[]), ...(state.clients as unknown[])]
  if (people.some((p) => !isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string')) return { ok: false, error: 'shape', detail: 'people' }
  if (!jobs.length && !people.length) return { ok: false, error: 'empty' }
  const data: AppData = {
    settings: { ...DEFAULT_SETTINGS, ...(state.settings as object), onboardingDone: true },
    designers: state.designers as AppData['designers'],
    clients: state.clients as AppData['clients'],
    decisions: state.decisions as AppData['decisions'],
    matches: state.matches as AppData['matches'],
    superLikesLeft: typeof state.superLikesLeft === 'number' ? state.superLikesLeft : 3,
    jobs: state.jobs as AppData['jobs'],
    conversations: state.conversations as AppData['conversations'],
    messages: state.messages as AppData['messages'],
    notifications: state.notifications as AppData['notifications'],
    invoices: state.invoices as AppData['invoices'],
    events: state.events as AppData['events'],
    seededAt: typeof state.seededAt === 'string' ? state.seededAt : new Date().toISOString(),
  }
  return { ok: true, data, prefs: isObj(raw.prefs) ? raw.prefs : undefined }
}

export async function importData(file: File): Promise<ImportResult> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    return { ok: false, error: 'parse' }
  }
  const res = validateBackup(raw)
  if (!res.ok) return res
  sim.cancelAll()
  useApp.setState(res.data)
  if (res.prefs) {
    const p = res.prefs
    usePrefs.getState().setPrefs({
      ...(isObj(p.muted) ? { muted: p.muted as never } : null),
      ...(typeof p.dnd === 'boolean' ? { dnd: p.dnd } : null),
      ...(p.digest === 'instant' || p.digest === 'daily' || p.digest === 'weekly' ? { digest: p.digest } : null),
    })
  }
  return {
    ok: true,
    counts: {
      jobs: res.data.jobs.length,
      messages: res.data.messages.length,
      people: res.data.designers.length + res.data.clients.length,
      notifications: res.data.notifications.length,
    },
  }
}

// ───────────────────────────── storage ─────────────────────────────

export interface StorageReport {
  /** UTF-8 bytes per persisted slice of the app state. */
  slices: { jobs: number; messages: number; people: number; other: number }
  /** Total localStorage used by this origin. */
  localStorage: number
  files: { count: number; bytes: number }
  /** navigator.storage.estimate() — may be unavailable. */
  usage?: number
  quota?: number
}

const bytesOf = (v: unknown) => {
  try {
    return new Blob([typeof v === 'string' ? v : JSON.stringify(v) ?? '']).size
  } catch {
    return 0
  }
}

let fileStore: ReturnType<typeof createStore> | undefined

export async function storageReport(): Promise<StorageReport> {
  const s = useApp.getState()
  const jobs = bytesOf(s.jobs) + bytesOf(s.invoices)
  const messages = bytesOf(s.messages) + bytesOf(s.conversations)
  const people = bytesOf(s.designers) + bytesOf(s.clients)
  let ls = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      ls += bytesOf(k) + bytesOf(localStorage.getItem(k) ?? '')
    }
  } catch {
    /* blocked */
  }
  const other = Math.max(0, ls - jobs - messages - people)

  const files = { count: 0, bytes: 0 }
  try {
    if (typeof indexedDB !== 'undefined') {
      fileStore ??= createStore('designtab-files', 'blobs')
      const all = await entries<string, Blob>(fileStore)
      files.count = all.length
      files.bytes = all.reduce((n, [, b]) => n + (b && typeof b === 'object' && 'size' in b ? b.size : 0), 0)
    }
  } catch {
    /* IndexedDB unavailable */
  }

  let usage: number | undefined
  let quota: number | undefined
  try {
    const est = await navigator.storage?.estimate?.()
    usage = est?.usage
    quota = est?.quota
  } catch {
    /* unsupported */
  }
  return { slices: { jobs, messages, people, other }, localStorage: ls, files, usage, quota }
}
