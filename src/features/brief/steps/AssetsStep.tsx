import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, Check, FileText, Film, FolderOpen, Image as ImageIcon, Link2, Music, Paperclip, Plus, StickyNote, Type, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { deleteFile, fileToAsset, kindFromMime, linkAsset, mediaIsImage, mediaIsVideo } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { uid } from '@/lib/ids'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, type Asset, type AssetKind } from '@/store/types'
import { Dropzone } from '@/components/ui/Dropzone'
import { FolderCard } from '@/components/ui/FolderCard'
import { Lightbox } from '@/components/ui/Lightbox'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Pill } from '@/components/ui/Badge'
import { MediaView } from '@/components/art/MediaView'
import { useWizard } from '../draftStore'
import { ASSET_ACCEPT, isUrl, normalizeUrl, STEP } from '../model'
import { FieldError, Section, StepHeader, stepStagger } from '../ui'

const MAX_FILE = 250 * 1024 * 1024
const SOFT_TOTAL = 500 * 1024 * 1024

export const KIND_ICON: Record<AssetKind, typeof ImageIcon> = { image: ImageIcon, video: Film, audio: Music, doc: FileText, font: Type, link: Link2, archive: Archive }

interface Upload {
  id: string
  name: string
  size: number
  kind: AssetKind
  preview?: string
}

interface UploadMeta {
  saved?: Asset
  anim?: boolean
  done?: boolean
  preview?: string
}

/** Known link providers (labels are brand names, not translated). */
export function linkProvider(url: string): { name: string; color: string } {
  const u = url.toLowerCase()
  if (u.includes('figma.com')) return { name: 'Figma', color: '#A259FF' }
  if (u.includes('drive.google') || u.includes('docs.google')) return { name: 'Google Drive', color: '#1FA463' }
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { name: 'YouTube', color: '#FF0033' }
  if (u.includes('vimeo.com')) return { name: 'Vimeo', color: '#1AB7EA' }
  if (u.includes('dropbox.com')) return { name: 'Dropbox', color: '#0061FF' }
  if (u.includes('notion.')) return { name: 'Notion', color: '#111111' }
  if (u.includes('miro.com')) return { name: 'Miro', color: '#FFD02F' }
  if (u.includes('wetransfer')) return { name: 'WeTransfer', color: '#409FFF' }
  return { name: 'Link', color: 'var(--ink-3)' }
}

export function AssetsStep() {
  const t = useT()
  const assets = useWizard((s) => s.draft.assets)
  const set = useWizard((s) => s.set)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [viewer, setViewer] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [urlErr, setUrlErr] = useState<string | null>(null)
  const thumbs = useRef<Record<string, HTMLElement | null>>({})

  const files = assets.filter((a) => a.kind !== 'link')
  const links = assets.filter((a) => a.kind === 'link')
  const visual = files.filter((a) => mediaIsImage(a.media) || mediaIsVideo(a.media))
  const total = files.reduce((n, a) => n + a.size, 0)

  // Upload bookkeeping lives in a ref so completing an upload is a single,
  // side-effect-safe step (state updaters may run twice in StrictMode).
  const meta = useRef<Record<string, UploadMeta>>({})
  const mounted = useRef(true)
  const commit = (id: string) => {
    const m = meta.current[id]
    if (!m || m.done || !m.saved) return
    m.done = true
    const cur = useWizard.getState().draft.assets
    useWizard.getState().set({ assets: [...cur, m.saved] })
    if (mounted.current) setUploads((list) => list.filter((x) => x.id !== id))
    if (m.preview) window.setTimeout(() => URL.revokeObjectURL(m.preview!), 2000)
  }
  const tryFinish = (id: string) => {
    const m = meta.current[id]
    // after leaving the step the progress animation can't finish — commit right away
    if (m && (m.anim || !mounted.current)) commit(id)
  }
  useEffect(() => {
    mounted.current = true
    const ref = meta.current
    return () => {
      mounted.current = false
      Object.keys(ref).forEach((id) => ref[id].saved && commit(id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFiles = (list: File[]) => {
    const ok = list.filter((f) => f.size <= MAX_FILE)
    if (ok.length < list.length) toast({ title: t('brief.assets.tooBig', { count: list.length - ok.length }), description: t('brief.assets.tooBigBody'), tone: 'error' })
    if (!ok.length) return
    const items: Upload[] = ok.map((f) => {
      const kind = kindFromMime(f.type, f.name)
      return { id: uid('up_'), name: f.name, size: f.size, kind, preview: kind === 'image' ? URL.createObjectURL(f) : undefined }
    })
    items.forEach((it) => (meta.current[it.id] = { preview: it.preview }))
    setUploads((u) => [...u, ...items])
    items.forEach((it, i) => {
      fileToAsset(ok[i], ME_CLIENT_ID)
        .then((asset) => {
          meta.current[it.id].saved = asset
          tryFinish(it.id)
        })
        .catch(() => {
          meta.current[it.id].done = true
          if (mounted.current) setUploads((list) => list.filter((x) => x.id !== it.id))
          toast({ title: t('brief.assets.failed'), description: it.name, tone: 'error' })
        })
    })
    toast({ title: t('brief.assets.uploading', { count: ok.length }), tone: 'info', duration: 1600 })
  }

  const remove = (a: Asset) => {
    set({ assets: assets.filter((x) => x.id !== a.id) })
    if (a.media.kind === 'file') void deleteFile(a.media.fileId)
  }

  const addLink = () => {
    const u = normalizeUrl(url)
    if (!isUrl(u)) {
      setUrlErr(t('brief.err.url'))
      return
    }
    if (links.some((l) => l.media.kind === 'url' && l.media.url === u)) {
      setUrlErr(t('brief.assets.linkDup'))
      return
    }
    const prov = linkProvider(u)
    const a = linkAsset(u, ME_CLIENT_ID, label.trim() || (prov.name !== 'Link' ? `${prov.name} — ${new URL(u).hostname.replace(/^www\./, '')}` : undefined))
    set({ assets: [...assets, a] })
    setUrl('')
    setLabel('')
    setUrlErr(null)
  }

  const setNote = (id: string, note: string) => set({ assets: assets.map((a) => (a.id === id ? { ...a, note: note || undefined } : a)) })

  const byKind = useMemo(() => {
    const m = new Map<AssetKind, number>()
    for (const a of assets) m.set(a.kind, (m.get(a.kind) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [assets])

  const live = url.trim() ? linkProvider(url) : null
  const liveValid = url.trim() ? isUrl(normalizeUrl(url)) : null

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
        <StepHeader index={STEP.assets} icon={<Paperclip />} title={t('brief.assets.title')} subtitle={t('brief.assets.subtitle')} />
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title={t('brief.assets.files')} hint={t('brief.assets.filesHint')} icon={<UploadCloud />}>
            <Dropzone onFiles={onFiles} accept={ASSET_ACCEPT}>
              <motion.span className="flex size-14 items-center justify-center rounded-[20px] bg-accent text-accent-ink shadow-[0_14px_30px_-14px_var(--accent)]" animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <UploadCloud className="size-6" />
              </motion.span>
              <p className="text-[15px] font-medium">{t('brief.assets.drop')}</p>
              <p className="text-[12.5px] text-ink-3">{t('brief.assets.dropHint')}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {(['image', 'video', 'doc', 'font', 'archive'] as AssetKind[]).map((k) => {
                  const Icon = KIND_ICON[k]
                  return (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-ink-3">
                      <Icon className="size-3" /> {t(`brief.assets.kind.${k}`)}
                    </span>
                  )
                })}
              </div>
            </Dropzone>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence initial={false}>
                {uploads.map((u) => (
                  <UploadTile
                    key={u.id}
                    u={u}
                    onAnimDone={() => {
                      const m = meta.current[u.id]
                      if (m) m.anim = true
                      tryFinish(u.id)
                    }}
                  />
                ))}
                {files.map((a) => {
                  const vi = visual.findIndex((v) => v.id === a.id)
                  return (
                    <AssetTile
                      key={a.id}
                      asset={a}
                      refFn={(el) => (thumbs.current[a.id] = el)}
                      onOpen={vi >= 0 ? () => setViewer(vi) : undefined}
                      onRemove={() => remove(a)}
                      onNote={(n) => setNote(a.id, n)}
                    />
                  )
                })}
              </AnimatePresence>
            </div>
            {files.length === 0 && uploads.length === 0 && <p className="mt-1 text-center text-[12.5px] text-ink-3">{t('brief.assets.none')}</p>}
          </Section>

          <Section title={t('brief.assets.links')} hint={t('brief.assets.linksHint')} icon={<Link2 />}>
            <div data-no-enter className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto]">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setUrlErr(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLink()
                  }
                }}
                placeholder="https://www.figma.com/file/…"
                aria-label={t('brief.assets.urlPh')}
                aria-invalid={!!urlErr}
                icon={<Link2 />}
                className={cn(urlErr && 'border-danger')}
                right={
                  live && (
                    <motion.span key={live.name} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy} className="mr-1 inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-white" style={{ background: liveValid ? live.color : 'var(--danger)' }}>
                      {liveValid ? live.name : <X className="size-3" />}
                    </motion.span>
                  )
                }
              />
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLink()
                  }
                }}
                placeholder={t('brief.assets.labelPh')}
                aria-label={t('brief.assets.labelPh')}
              />
              <Button icon={<Plus className="size-4" />} onClick={addLink} disabled={!url.trim()}>
                {t('brief.common.add')}
              </Button>
            </div>
            <FieldError show={!!urlErr}>{urlErr}</FieldError>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] text-ink-3">
              {['Figma', 'Google Drive', 'YouTube', 'Dropbox', 'Notion', 'Miro'].map((p) => (
                <span key={p} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5">
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {links.map((a) => {
                  const href = a.media.kind === 'url' ? a.media.url : ''
                  const prov = linkProvider(href)
                  return (
                    <motion.div
                      key={a.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={spring.smooth}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-[var(--surface)] p-2.5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: prov.color }}>
                        <Link2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <a href={href} target="_blank" rel="noopener noreferrer" className="block truncate text-[13.5px] font-medium hover:underline">
                          {a.name}
                        </a>
                        <div className="truncate font-mono text-[11.5px] text-ink-3">{href}</div>
                      </div>
                      <Pill size="xs">{prov.name}</Pill>
                      <button type="button" onClick={() => remove(a)} className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label={t('brief.common.remove')}>
                        <X className="size-4" />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </Section>
        </div>

        {/* folder + stats */}
        <motion.aside variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="card flex flex-col items-center gap-4 self-start p-5 xl:sticky xl:top-4">
          <FolderCard
            title={t('brief.assets.folder')}
            subtitle={t('brief.assets.folderSub', { count: assets.length, size: formatBytes(total) })}
            items={visual.map((a) => a.media)}
            icon={<FolderOpen className="text-white" />}
            onFilesDrop={onFiles}
            onClick={visual.length ? () => setViewer(0) : undefined}
            size="md"
          />
          <p className="text-center text-[12px] text-ink-3">{t('brief.assets.folderHint')}</p>
          <div className="w-full">
            <div className="mb-1.5 flex justify-between text-[12px]">
              <span className="text-ink-3">{t('brief.assets.storage')}</span>
              <span className="font-mono text-ink-2">
                {formatBytes(total)} / {formatBytes(SOFT_TOTAL)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.min(100, (total / SOFT_TOTAL) * 100)}%` }} transition={spring.smooth} />
            </div>
          </div>
          {byKind.length > 0 && (
            <div className="flex w-full flex-wrap gap-1.5">
              {byKind.map(([k, n]) => {
                const Icon = KIND_ICON[k]
                return (
                  <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[12px] font-medium text-ink-2">
                    <Icon className="size-3.5" />
                    {t(`brief.assets.kind.${k}`)} <span className="font-mono text-ink-3">{n}</span>
                  </span>
                )
              })}
            </div>
          )}
          <p className="w-full rounded-2xl bg-[var(--surface-2)] p-3 text-[12px] leading-relaxed text-ink-2">{t('brief.assets.privacy')}</p>
        </motion.aside>
      </div>

      <Lightbox
        items={visual.map((a) => a.media)}
        index={viewer}
        onClose={() => setViewer(null)}
        onIndexChange={setViewer}
        captions={visual.map((a) => a.note ?? a.name)}
        title={t('brief.assets.folder')}
        originFor={(i) => thumbs.current[visual[i]?.id ?? ''] ?? null}
      />
    </motion.div>
  )
}

function UploadTile({ u, onAnimDone }: { u: Upload; onAnimDone: () => void }) {
  const t = useT()
  const [pct, setPct] = useState(0)
  const Icon = KIND_ICON[u.kind]
  // bigger files "upload" a little longer; IndexedDB writes are near-instant
  const duration = Math.min(2.2, 0.7 + u.size / (25 * 1024 * 1024))
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)', transition: { duration: 0.18 } }}
      transition={spring.smooth}
      className="relative overflow-hidden rounded-[18px] border border-line bg-[var(--surface)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
        {u.preview ? <img src={u.preview} alt="" className="size-full scale-105 object-cover opacity-70 blur-[2px]" /> : <Icon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-ink-4" />}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-[12px] font-medium text-white backdrop-blur">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="p-2.5">
        <div className="truncate text-[12.5px] font-medium">{u.name}</div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <motion.div
            className="h-full origin-left rounded-full bg-accent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration, ease: [0.32, 0.72, 0, 1] }}
            onUpdate={(l) => typeof l.scaleX === 'number' && setPct(l.scaleX * 100)}
            onAnimationComplete={() => {
              setPct(100)
              onAnimDone()
            }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-ink-3">
          <span>{t('brief.assets.uploadingOne')}</span>
          <span>{formatBytes(u.size)}</span>
        </div>
      </div>
    </motion.div>
  )
}

function AssetTile({ asset, refFn, onOpen, onRemove, onNote }: { asset: Asset; refFn: (el: HTMLElement | null) => void; onOpen?: () => void; onRemove: () => void; onNote: (n: string) => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(asset.note ?? '')
  const Icon = KIND_ICON[asset.kind]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.85, filter: 'blur(6px)', transition: { duration: 0.2 } }}
      transition={spring.smooth}
      className="group relative overflow-hidden rounded-[18px] border border-line bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,.04)]"
    >
      <button type="button" ref={refFn} onClick={onOpen} disabled={!onOpen} className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--surface-2)] disabled:cursor-default">
        <MediaView media={asset.media} className="transition-transform duration-500 group-hover:scale-[1.04]" playBadge={false} />
        <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} transition={{ duration: 0.5, delay: 0.1 }} className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-[var(--success)] text-white shadow">
          <Check className="size-3.5" strokeWidth={3} />
        </motion.span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-100 backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        aria-label={t('brief.common.remove')}
      >
        <X className="size-4" />
      </button>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 shrink-0 text-ink-3" />
          <span className="truncate text-[12.5px] font-medium">{asset.name}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10.5px] text-ink-3">{formatBytes(asset.size)}</span>
          <button type="button" onClick={() => setEditing((v) => !v)} className={cn('flex items-center gap-1 text-[11px] font-medium transition-colors', asset.note ? 'text-[var(--accent-text)]' : 'text-ink-3 hover:text-ink')}>
            <StickyNote className="size-3" />
            {asset.note ? t('brief.assets.noteEdit') : t('brief.assets.noteAdd')}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {editing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" data-no-enter>
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => {
                  onNote(note.trim())
                  setEditing(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                placeholder={t('brief.assets.notePh')}
                className="mt-1.5 h-8 w-full rounded-xl border border-line bg-[var(--surface-2)] px-2.5 text-[12px] outline-none focus:border-[var(--accent-line)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        {asset.note && !editing && <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-2">{asset.note}</p>}
      </div>
    </motion.div>
  )
}
