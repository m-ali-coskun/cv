import { createElement, useMemo } from 'react'
import { Archive, File as FileIcon, FileText, Image as ImageIcon, Link2, Music, PackageCheck, Type, Video, type LucideIcon } from 'lucide-react'
import { meIdFor, useApp } from '@/store'
import { useConversations, useDiscipline, useRole } from '@/store/selectors'
import { ME_DESIGNER_ID, type AssetKind, type DisciplineId, type Job, type MediaRef, type Role } from '@/store/types'
import { hashString } from '@/lib/random'
import { kindFromMime, loadFileUrl, mediaIsImage, mediaIsVideo } from '@/lib/files'

/**
 * The library merges every file the active role can see:
 *   - assets attached to my jobs (removable when I added them)
 *   - media of delivered versions
 *   - attachments in my conversations
 *   - (designer) my portfolio media
 * Items tied to a job follow the discipline tab.
 */

export type FileSource = 'asset' | 'delivery' | 'chat' | 'portfolio'

export interface FileItem {
  id: string
  name: string
  kind: AssetKind
  size: number
  media: MediaRef
  source: FileSource
  jobId?: string
  job?: Job
  conversationId?: string
  messageId?: string
  portfolioId?: string
  version?: number
  versionStatus?: 'pending' | 'approved' | 'changes_requested'
  addedBy: string
  addedAt: string
  discipline?: DisciplineId
  /** Asset I added myself → can be renamed / removed from the job. */
  removable: boolean
  assetId?: string
  note?: string
}

export const KIND_ORDER: AssetKind[] = ['image', 'video', 'doc', 'font', 'archive', 'audio', 'link']

export const KIND_COLOR: Record<AssetKind, string> = {
  image: '#31A8FF',
  video: '#9999FF',
  doc: '#FF9A00',
  font: '#FF61F6',
  archive: '#2EE6C5',
  audio: '#FF3366',
  link: '#8B8B93',
}

export const KIND_ICON: Record<AssetKind | 'delivery' | 'other', LucideIcon> = {
  image: ImageIcon,
  video: Video,
  doc: FileText,
  font: Type,
  archive: Archive,
  audio: Music,
  link: Link2,
  delivery: PackageCheck,
  other: FileIcon,
}

/** Only real images/videos get a preview — a .zip with a poster thumbnail would be misleading. */
export const isVisual = (f: Pick<FileItem, 'kind' | 'media'>) =>
  (f.kind === 'image' || f.kind === 'video') && (mediaIsImage(f.media) || mediaIsVideo(f.media))

export const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.slice(0, 5).toUpperCase() : '')

const kindOfMedia = (m: MediaRef): AssetKind => {
  if (m.kind === 'art') return m.variant === 'video' ? 'video' : 'image'
  if (m.kind === 'file') return kindFromMime(m.mime, m.name)
  if (mediaIsImage(m)) return 'image'
  if (mediaIsVideo(m)) return 'video'
  return 'link'
}

/** Deterministic, plausible size for generated (demo) media. */
const estimateSize = (m: MediaRef, seedExtra = ''): number => {
  if (m.kind === 'file') return m.size
  if (m.kind === 'url') return 0
  const h = hashString(m.seed + seedExtra)
  return m.variant === 'video' ? 24_000_000 + (h % 160_000_000) : 900_000 + (h % 6_200_000)
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)

const mediaName = (m: MediaRef, fallback: string) => {
  if (m.kind === 'file') return m.name
  if (m.kind === 'url') return m.name ?? fallback
  return `${fallback}.${m.variant === 'video' ? 'mp4' : 'png'}`
}

export function buildLibrary(opts: {
  role: Role
  discipline: DisciplineId | 'all'
  jobs: Job[]
  conversations: ReturnType<typeof useConversations>
  portfolio: { id: string; title: string; discipline: DisciplineId; cover: MediaRef; media: MediaRef[] }[]
  joinedAt?: string
}): FileItem[] {
  const { role, discipline, jobs, conversations } = opts
  const me = meIdFor(role)
  const mine = jobs.filter((j) => (role === 'client' ? j.clientId === me : j.designerId === me))
  const inTab = (d?: DisciplineId) => discipline === 'all' || !d || d === discipline
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const out: FileItem[] = []

  for (const job of mine) {
    if (!inTab(job.discipline)) continue
    for (const a of job.assets) {
      out.push({
        id: `asset:${job.id}:${a.id}`,
        name: a.name,
        kind: a.kind,
        size: a.size,
        media: a.media,
        source: 'asset',
        jobId: job.id,
        job,
        addedBy: a.addedBy,
        addedAt: a.addedAt,
        discipline: job.discipline,
        removable: a.addedBy === me,
        assetId: a.id,
        note: a.note,
      })
    }
    for (const v of job.versions) {
      v.media.forEach((m, i) => {
        out.push({
          id: `delivery:${job.id}:${v.id}:${i}`,
          name: mediaName(m, `${job.id.toLowerCase()}_v${v.version}_${String(i + 1).padStart(2, '0')}`),
          kind: kindOfMedia(m),
          size: estimateSize(m, v.id),
          media: m,
          source: 'delivery',
          jobId: job.id,
          job,
          version: v.version,
          versionStatus: v.status,
          addedBy: job.designerId,
          addedAt: v.submittedAt,
          discipline: job.discipline,
          removable: false,
          note: v.note,
        })
      })
    }
  }

  // the same media shared in chat and attached to a job is one file
  const mediaKey = mediaKeyOf
  const known = new Set<string>()
  for (const f of out) known.add(mediaKey(f.media))

  for (const c of conversations) {
    for (const msg of c.messages) {
      if (!msg.attachments?.length) continue
      // deliveries are already listed from the job's versions
      if (msg.kind === 'delivery') continue
      const job = msg.jobId ? byId.get(msg.jobId) : undefined
      if (discipline !== 'all' && (!job || job.discipline !== discipline)) continue
      msg.attachments.forEach((m, i) => {
        if (known.has(mediaKey(m))) return
        known.add(mediaKey(m))
        const base = m.kind === 'art' ? slug(m.seed) : `attachment-${i + 1}`
        out.push({
          id: `chat:${msg.id}:${i}`,
          name: mediaName(m, base),
          kind: kindOfMedia(m),
          size: estimateSize(m, msg.id),
          media: m,
          source: 'chat',
          jobId: job?.id,
          job,
          conversationId: c.conversation.id,
          messageId: msg.id,
          addedBy: msg.senderId,
          addedAt: msg.createdAt,
          discipline: job?.discipline,
          removable: false,
          note: msg.text || undefined,
        })
      })
    }
  }

  if (role === 'designer') {
    for (const p of opts.portfolio) {
      if (!inTab(p.discipline)) continue
      const all = [p.cover, ...p.media.filter((m) => JSON.stringify(m) !== JSON.stringify(p.cover))]
      all.forEach((m, i) => {
        out.push({
          id: `portfolio:${p.id}:${i}`,
          name: mediaName(m, `${slug(p.title)}-${String(i + 1).padStart(2, '0')}`),
          kind: kindOfMedia(m),
          size: estimateSize(m, p.id),
          media: m,
          source: 'portfolio',
          portfolioId: p.id,
          addedBy: ME_DESIGNER_ID,
          addedAt: opts.joinedAt ?? new Date(0).toISOString(),
          discipline: p.discipline,
          removable: false,
          note: p.title,
        })
      })
    }
  }
  return out
}

export function useLibrary(): FileItem[] {
  const role = useRole()
  const discipline = useDiscipline()
  const jobs = useApp((s) => s.jobs)
  const designers = useApp((s) => s.designers)
  const conversations = useConversations({ includeArchived: true })
  return useMemo(() => {
    const me = designers.find((d) => d.id === ME_DESIGNER_ID)
    return buildLibrary({ role, discipline, jobs, conversations, portfolio: me?.portfolio ?? [], joinedAt: me?.joinedAt })
  }, [role, discipline, jobs, designers, conversations])
}

// ─────────────────────────── filters & sorting ───────────────────────────

export type KindFilter = AssetKind | 'delivery' | 'all'
export type SourceFilter = 'all' | 'jobs' | 'chat' | 'portfolio'
export type SortKey = 'recent' | 'name' | 'size'

export function matchesKind(f: FileItem, k: KindFilter) {
  if (k === 'all') return true
  if (k === 'delivery') return f.source === 'delivery'
  return f.kind === k
}

export function matchesSource(f: FileItem, s: SourceFilter) {
  if (s === 'all') return true
  if (s === 'jobs') return f.source === 'asset' || f.source === 'delivery'
  return f.source === s
}

export function sortFiles(list: FileItem[], key: SortKey, dir: 'asc' | 'desc') {
  const m = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (key === 'name') return m * a.name.localeCompare(b.name, undefined, { numeric: true })
    if (key === 'size') return m * (a.size - b.size)
    return m * a.addedAt.localeCompare(b.addedAt)
  })
}

// ─────────────────────────── download ───────────────────────────

function trigger(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Download a library item: uploaded blobs come from IndexedDB, generated art
 * is exported as a crisp SVG, links open in a new tab, and other demo files
 * become a small text placeholder (they have no real bytes).
 */
export async function downloadFile(f: FileItem): Promise<'saved' | 'opened' | 'placeholder' | 'failed'> {
  const m = f.media
  if (m.kind === 'file') {
    const url = await loadFileUrl(m.fileId)
    if (!url) return 'failed'
    trigger(url, f.name)
    return 'saved'
  }
  if (m.kind === 'url') {
    window.open(m.url, '_blank', 'noopener,noreferrer')
    return 'opened'
  }
  const baseName = f.name.replace(/\.[a-z0-9]{1,5}$/i, '')
  if (isVisual(f)) {
    const [{ renderToStaticMarkup }, { GenerativeArt }] = await Promise.all([import('react-dom/server'), import('@/components/art/GenerativeArt')])
    let svg = renderToStaticMarkup(createElement(GenerativeArt, { seed: m.seed, variant: m.variant, discipline: m.discipline, playBadge: false }))
    if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    svg = svg.replace('<svg', '<svg width="1600" height="1200"')
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    trigger(url, `${baseName}.svg`)
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'saved'
  }
  const text = [`designTab demo file`, ``, `Name: ${f.name}`, `Size: ${f.size} bytes`, f.jobId ? `Job: ${f.jobId}` : '', `Added: ${f.addedAt}`, '', 'This file is part of the demo workspace and has no real contents.']
    .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')
    .join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  trigger(url, `${baseName}.txt`)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'placeholder'
}

export const PLAN_BYTES = 10 * 1024 ** 3

/** Storage plans — the smallest plan that comfortably fits the library is shown. */
export const PLANS = [
  { id: 'starter', bytes: 10 * 1024 ** 3, label: '10 GB' },
  { id: 'studio', bytes: 100 * 1024 ** 3, label: '100 GB' },
  { id: 'agency', bytes: 1024 ** 4, label: '1 TB' },
] as const
export function planFor(used: number) {
  return PLANS.find((p) => used <= p.bytes * 0.9) ?? PLANS[PLANS.length - 1]
}

// ─────────────────────────── per-viewer prefs ───────────────────────────

const PREF_KEY = 'designtab-files'
export interface FilesPrefs {
  view: 'grid' | 'list'
  sort: SortKey
  dir: 'asc' | 'desc'
}
export function loadPrefs(): FilesPrefs {
  const def: FilesPrefs = { view: 'grid', sort: 'recent', dir: 'desc' }
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as Partial<FilesPrefs>
    return {
      view: p.view === 'list' ? 'list' : 'grid',
      sort: p.sort === 'name' || p.sort === 'size' ? p.sort : 'recent',
      dir: p.dir === 'asc' ? 'asc' : 'desc',
    }
  } catch {
    return def
  }
}
export function savePrefs(p: FilesPrefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable */
  }
}

export function mediaKeyOf(m: MediaRef) {
  return m.kind === 'file' ? `f:${m.fileId}` : m.kind === 'url' ? `u:${m.url}` : `a:${m.seed}:${m.variant}`
}
