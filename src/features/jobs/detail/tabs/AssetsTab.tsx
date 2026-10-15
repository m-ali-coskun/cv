import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Download, FolderOpen, LayoutGrid, Link2, List, Maximize2, Plus, Search, Trash2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { formatBytes } from '@/lib/format'
import { fileToAsset, linkAsset, mediaIsImage, mediaIsVideo } from '@/lib/files'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Asset, AssetKind } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Button, IconButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dropzone } from '@/components/ui/Dropzone'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { FolderCard } from '@/components/ui/FolderCard'
import { Lightbox } from '@/components/ui/Lightbox'
import { Segmented } from '@/components/ui/Segmented'
import { useJobCtx } from '../context'
import { ASSET_COLOR, ASSET_ICON, downloadMedia } from '../model'
import { PersonAvatar } from '../ui'

type KindFilter = AssetKind | 'all'
type Who = 'all' | 'client' | 'designer'
type Sort = 'new' | 'old' | 'name' | 'size'
const KIND_ORDER: AssetKind[] = ['image', 'video', 'doc', 'font', 'archive', 'audio', 'link']

/** Only images/videos get a real preview — a .zip with a poster thumbnail would be misleading. */
const isVisual = (a: Asset) => (a.kind === 'image' || a.kind === 'video') && (mediaIsImage(a.media) || mediaIsVideo(a.media))
const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.slice(0, 5).toUpperCase() : '')

export function AssetsTab() {
  const t = useT()
  const lang = useLang()
  const { job, canAct, meId, person } = useJobCtx()
  const addAssets = useApp((s) => s.addAssets)
  const removeAsset = useApp((s) => s.removeAsset)
  const updateJob = useApp((s) => s.updateJob)
  const [confirm, confirmDialog] = useConfirm()
  const [kind, setKind] = useState<KindFilter>('all')
  const [who, setWho] = useState<Who>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [busy, setBusy] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const thumbs = useRef(new Map<string, HTMLElement>())
  const editable = canAct && job.status !== 'declined' && job.status !== 'cancelled'

  const byKind = useMemo(() => {
    const m = new Map<AssetKind, Asset[]>()
    for (const a of job.assets) m.set(a.kind, [...(m.get(a.kind) ?? []), a])
    return m
  }, [job.assets])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = job.assets.filter(
      (a) =>
        (kind === 'all' || a.kind === kind) &&
        (who === 'all' || (who === 'client' ? a.addedBy === job.clientId : a.addedBy === job.designerId)) &&
        (!q || a.name.toLowerCase().includes(q) || a.note?.toLowerCase().includes(q)),
    )
    const cmp: Record<Sort, (a: Asset, b: Asset) => number> = {
      new: (a, b) => b.addedAt.localeCompare(a.addedAt),
      old: (a, b) => a.addedAt.localeCompare(b.addedAt),
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.size - a.size,
    }
    return out.sort(cmp[sort])
  }, [job.assets, job.clientId, job.designerId, kind, who, query, sort])

  const visual = list.filter(isVisual)
  const totalSize = job.assets.reduce((n, a) => n + a.size, 0)
  const latest = job.assets.reduce<string>((m, a) => (a.addedAt > m ? a.addedAt : m), '')

  const upload = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    try {
      const assets = await Promise.all(files.map((f) => fileToAsset(f, meId)))
      addAssets(job.id, assets)
      toast({ title: t('job.assets.uploaded', { count: assets.length }), description: job.title, tone: 'success' })
    } catch {
      toast({ title: t('job.assets.failed'), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const open = (a: Asset) => {
    if (isVisual(a)) {
      const i = visual.findIndex((x) => x.id === a.id)
      if (i >= 0) setLightbox(i)
    } else if (a.media.kind === 'url') window.open(a.media.url, '_blank', 'noopener')
    else download(a)
  }
  const download = async (a: Asset) => {
    const ok = await downloadMedia(a.media, a.name)
    toast(ok ? { title: t('job.assets.downloading'), description: a.name, tone: 'success', duration: 2000 } : { title: t('job.assets.missing'), description: a.name, tone: 'error' })
  }
  const remove = async (a: Asset) => {
    const ok = await confirm({ title: t('job.assets.removeTitle'), description: t('job.assets.removeBody', { name: a.name }), tone: 'danger', confirmLabel: t('core.action.remove') })
    if (!ok) return
    removeAsset(job.id, a.id)
    const restore = () => {
      const cur = useApp.getState().jobs.find((j) => j.id === job.id)
      if (cur && !cur.assets.some((x) => x.id === a.id)) updateJob(job.id, { assets: [a, ...cur.assets] })
    }
    toast({ title: t('job.assets.removed'), description: a.name, tone: 'info', action: { label: t('core.action.undo'), onClick: restore } })
  }

  const kinds = KIND_ORDER.filter((k) => byKind.has(k))

  return (
    <div className="space-y-5">
      {/* summary + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] text-ink-3">
          {t('job.assets.summary', { count: job.assets.length, size: formatBytes(totalSize) })}
          {latest && ` · ${t('job.assets.lastAdded', { time: timeAgo(latest, lang) })}`}
        </p>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={linkOpen ? 'primary' : 'glass'} icon={<Link2 className="size-3.5" />} onClick={() => setLinkOpen((v) => !v)}>
              {t('job.assets.addLink')}
            </Button>
          </div>
        )}
      </div>

      {/* folders */}
      {job.assets.length > 0 && (
        <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 pt-6 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:overflow-visible">
          <FolderItem
            title={t('job.assets.all')}
            count={job.assets.length}
            color="var(--accent)"
            items={job.assets.filter(isVisual).map((a) => a.media)}
            selected={kind === 'all'}
            onClick={() => setKind('all')}
            onDrop={editable ? upload : undefined}
          />
          {kinds.map((k) => {
            const arr = byKind.get(k)!
            const Icon = ASSET_ICON[k]
            const vis = arr.filter(isVisual)
            return (
              <FolderItem
                key={k}
                title={t(`core.asset.${k}`)}
                count={arr.length}
                color={ASSET_COLOR[k]}
                icon={<Icon className="size-4" />}
                items={vis.map((a) => a.media)}
                papers={vis.length ? undefined : arr.slice(0, 3).map((a) => <Paper key={a.id} asset={a} />)}
                selected={kind === k}
                onClick={() => setKind(kind === k ? 'all' : k)}
                onDrop={editable ? upload : undefined}
              />
            )
          })}
        </div>
      )}

      {/* link form */}
      <AnimatePresence initial={false}>
        {linkOpen && editable && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="overflow-hidden">
            <LinkForm
              onAdd={(url, label) => {
                addAssets(job.id, [linkAsset(url, meId, label || undefined)])
                toast({ title: t('job.assets.linkAdded'), description: url, tone: 'success' })
                setLinkOpen(false)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* toolbar */}
      {job.assets.length > 0 && (
        <div className="flex flex-col gap-2 @min-[760px]:flex-row @min-[760px]:items-center">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('job.assets.search')} icon={<Search />} className="h-10" />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Who>
              value={who}
              onChange={setWho}
              size="sm"
              pill="surface"
              layoutId="assets-who"
              options={[
                { value: 'all', label: t('core.common.all') },
                { value: 'client', label: t('core.common.client') },
                { value: 'designer', label: t('core.common.designer') },
              ]}
            />
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-auto min-w-0 text-[13px]" aria-label={t('core.action.sort')}>
              <option value="new">{t('job.assets.sort.new')}</option>
              <option value="old">{t('job.assets.sort.old')}</option>
              <option value="name">{t('job.assets.sort.name')}</option>
              <option value="size">{t('job.assets.sort.size')}</option>
            </Select>
            <Segmented<'grid' | 'list'>
              value={view}
              onChange={setView}
              size="sm"
              pill="surface"
              layoutId="assets-view"
              options={[
                { value: 'grid', label: <LayoutGrid className="size-4" aria-label={t('job.assets.grid')} /> },
                { value: 'list', label: <List className="size-4" aria-label={t('job.assets.list')} /> },
              ]}
            />
          </div>
        </div>
      )}

      {/* items */}
      {job.assets.length === 0 ? (
        <EmptyState
          icon={<FolderOpen />}
          title={t('job.assets.emptyTitle')}
          description={t(editable ? 'job.assets.emptyBody' : 'job.assets.emptyReadOnly')}
          action={
            editable && (
              <Dropzone onFiles={upload} compact className="min-w-[260px]">
                <UploadCloud className="size-5 text-ink-2" />
                <span className="text-[13.5px] font-medium">{busy ? t('job.assets.uploading') : t('core.common.dropFiles')}</span>
              </Dropzone>
            )
          }
        />
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-line-2 py-10 text-center">
          <p className="text-[13.5px] text-ink-3">{t('job.assets.noMatch')}</p>
          <Button
            size="sm"
            variant="glass"
            icon={<X className="size-3.5" />}
            onClick={() => {
              setQuery('')
              setKind('all')
              setWho('all')
            }}
          >
            {t('job.assets.clearFilters')}
          </Button>
        </div>
      ) : view === 'grid' ? (
        <motion.ul layout className="grid grid-cols-2 gap-2.5 @min-[560px]:grid-cols-3 @min-[880px]:grid-cols-4">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((a, i) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { delay: Math.min(i, 10) * 0.035, ...spring.smooth } }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)', transition: { duration: 0.18 } }}
                className="min-w-0"
              >
                <AssetCard
                  asset={a}
                  uploader={person(a.addedBy)}
                  removable={editable && (a.addedBy === meId || job.clientId === meId)}
                  thumbRef={(el) => (el ? thumbs.current.set(a.id, el) : thumbs.current.delete(a.id))}
                  onOpen={() => open(a)}
                  onDownload={() => download(a)}
                  onRemove={() => remove(a)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[20px] border border-line">
          <AnimatePresence initial={false}>
            {list.map((a) => (
              <motion.li key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={spring.smooth}>
                <AssetRow asset={a} uploader={person(a.addedBy)} removable={editable && (a.addedBy === meId || job.clientId === meId)} onOpen={() => open(a)} onDownload={() => download(a)} onRemove={() => remove(a)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* upload */}
      {editable && job.assets.length > 0 && (
        <div className="relative">
          <Dropzone onFiles={upload} compact />
          <AnimatePresence>
            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center gap-2 rounded-[22px] bg-[var(--surface)]/85 text-[13.5px] font-medium backdrop-blur">
                <motion.span className="size-4 rounded-full border-2 border-[var(--accent)] border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                {t('job.assets.uploading')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Lightbox
        items={visual.map((a) => a.media)}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        captions={visual.map((a) => (
          <span key={a.id}>
            {a.name}
            {a.note ? <span className="opacity-60"> — {a.note}</span> : null}
          </span>
        ))}
        title={job.title}
        originFor={(i) => (visual[i] ? thumbs.current.get(visual[i].id) : undefined)}
      />
      {confirmDialog}
    </div>
  )
}

// ─────────────── pieces ───────────────

function FolderItem({
  title,
  count,
  color,
  icon,
  items,
  papers,
  selected,
  onClick,
  onDrop,
}: {
  title: string
  count: number
  color: string
  icon?: React.ReactNode
  items: Asset['media'][]
  papers?: React.ReactNode[]
  selected: boolean
  onClick: () => void
  onDrop?: (files: File[]) => void
}) {
  const t = useT()
  return (
    <div className="w-[150px] shrink-0 snap-start sm:w-auto">
      <FolderCard size="sm" title={title} subtitle={t('job.assets.files', { count })} color={color} icon={icon} items={items} papers={papers} selected={selected} onClick={onClick} onFilesDrop={onDrop} />
    </div>
  )
}

/** Paper for non-visual files: icon + filename "printout". */
function Paper({ asset }: { asset: Asset }) {
  const Icon = ASSET_ICON[asset.kind]
  return (
    <div className="flex size-full flex-col gap-1.5 bg-white p-2 text-[#0b0b0c]">
      <span className="flex size-5 items-center justify-center rounded-md text-white" style={{ background: ASSET_COLOR[asset.kind] }}>
        <Icon className="size-3" />
      </span>
      <span className="line-clamp-2 break-all text-[8px] font-medium leading-tight">{asset.name}</span>
      <span className="h-1 w-4/5 rounded-full bg-black/10" />
      <span className="h-1 w-3/5 rounded-full bg-black/10" />
    </div>
  )
}

function KindTile({ asset, big }: { asset: Asset; big?: boolean }) {
  const Icon = ASSET_ICON[asset.kind]
  const c = ASSET_COLOR[asset.kind]
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-2 overflow-hidden" style={{ background: `color-mix(in oklab, ${c} 14%, var(--surface-2))` }}>
      {asset.media.kind === 'art' && (
        <div aria-hidden className="absolute inset-0 scale-110 opacity-25 blur-xl saturate-150">
          <MediaView media={asset.media} playBadge={false} />
        </div>
      )}
      <motion.span
        className={cn('relative flex items-center justify-center rounded-[14px] text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,.5)]', big ? 'size-12' : 'size-9')}
        style={{ background: c }}
        whileHover={{ rotate: -8, scale: 1.08 }}
        transition={spring.bouncy}
      >
        <Icon className={big ? 'size-5' : 'size-4'} />
      </motion.span>
      {ext(asset.name) && asset.kind !== 'link' && <span className="relative font-mono text-[10.5px] font-semibold tracking-wider text-ink-2">.{ext(asset.name)}</span>}
      {asset.media.kind === 'url' && <span className="relative max-w-[85%] truncate font-mono text-[10.5px] text-ink-3">{asset.media.url.replace(/^https?:\/\/(www\.)?/, '')}</span>}
    </div>
  )
}

interface ItemProps {
  asset: Asset
  uploader?: ReturnType<ReturnType<typeof useJobCtx>['person']>
  removable: boolean
  onOpen: () => void
  onDownload: () => void
  onRemove: () => void
}

function AssetCard({ asset, uploader, removable, onOpen, onDownload, onRemove, thumbRef }: ItemProps & { thumbRef: (el: HTMLElement | null) => void }) {
  const t = useT()
  const lang = useLang()
  const Icon = ASSET_ICON[asset.kind]
  const visual = isVisual(asset)
  return (
    <motion.div whileHover={{ y: -4 }} transition={spring.snappy} className="group/asset relative overflow-hidden rounded-[20px] border border-line bg-[var(--surface)]/70">
      <button ref={thumbRef as React.Ref<HTMLButtonElement>} type="button" onClick={onOpen} className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--surface-2)]" aria-label={asset.name}>
        <div className="size-full transition-transform duration-700 ease-[var(--ease-out)] group-hover/asset:scale-[1.06]">
          {visual ? <MediaView media={asset.media} /> : <KindTile asset={asset} big />}
        </div>
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
          <Icon className="size-3" />
          {t(`core.asset.${asset.kind}`)}
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover/asset:bg-black/20 group-hover/asset:opacity-100">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-[#0b0b0c] shadow-lg backdrop-blur">
            {asset.kind === 'link' ? <ArrowUpRight className="size-4" /> : visual ? <Maximize2 className="size-4" /> : <Download className="size-4" />}
          </span>
        </span>
      </button>
      <div className="flex items-start gap-2 p-2.5">
        <PersonAvatar person={uploader} size={24} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink" title={asset.name}>
            {asset.name}
          </div>
          <div className="truncate font-mono text-[10.5px] text-ink-3">
            {asset.kind === 'link' ? t('core.asset.link') : formatBytes(asset.size)} · {timeAgo(asset.addedAt, lang)}
          </div>
          {asset.note && <div className="mt-1 line-clamp-2 text-[11.5px] italic leading-snug text-ink-3">{asset.note}</div>}
        </div>
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/asset:opacity-100">
        {asset.kind !== 'link' && (
          <IconButton label={t('core.action.download')} size="sm" variant="glass" onClick={onDownload}>
            <Download className="size-3.5" />
          </IconButton>
        )}
        {removable && (
          <IconButton label={t('core.action.remove')} size="sm" variant="glass" onClick={onRemove} className="hover:text-danger">
            <Trash2 className="size-3.5" />
          </IconButton>
        )}
      </div>
    </motion.div>
  )
}

function AssetRow({ asset, uploader, removable, onOpen, onDownload, onRemove }: ItemProps) {
  const t = useT()
  const lang = useLang()
  const visual = isVisual(asset)
  return (
    <div className="group/row flex items-center gap-3 bg-[var(--surface)]/50 px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]">
      <button type="button" onClick={onOpen} className="size-12 shrink-0 overflow-hidden rounded-[12px]" aria-label={asset.name}>
        {visual ? <MediaView media={asset.media} /> : <KindTile asset={asset} />}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13.5px] font-medium text-ink">{asset.name}</div>
        <div className="truncate text-[12px] text-ink-3">{asset.note ?? t(`core.asset.${asset.kind}`)}</div>
      </button>
      <div className="hidden w-20 text-right font-mono text-[11.5px] text-ink-3 sm:block">{asset.kind === 'link' ? '—' : formatBytes(asset.size)}</div>
      <div className="hidden items-center gap-1.5 md:flex md:w-40">
        <PersonAvatar person={uploader} size={20} />
        <span className="truncate text-[12px] text-ink-2">{uploader?.name}</span>
      </div>
      <div className="hidden w-24 text-right font-mono text-[11px] text-ink-3 lg:block">{timeAgo(asset.addedAt, lang)}</div>
      <div className="flex shrink-0 gap-1">
        {asset.kind !== 'link' ? (
          <IconButton label={t('core.action.download')} size="sm" variant="ghost" onClick={onDownload}>
            <Download className="size-3.5" />
          </IconButton>
        ) : (
          <IconButton label={t('core.action.open')} size="sm" variant="ghost" onClick={onOpen}>
            <ArrowUpRight className="size-3.5" />
          </IconButton>
        )}
        {removable && (
          <IconButton label={t('core.action.remove')} size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </IconButton>
        )}
      </div>
    </div>
  )
}

function LinkForm({ onAdd }: { onAdd: (url: string, label: string) => void }) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const valid = /^https?:\/\/\S+\.\S+/.test(url.trim())
  return (
    <form
      className="grid gap-2 rounded-[20px] bg-[var(--surface-2)] p-3 @min-[600px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onAdd(url.trim(), label.trim())
      }}
    >
      <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" icon={<Link2 />} />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('job.assets.linkLabel')} />
      <Button type="submit" disabled={!valid} icon={<Plus className="size-4" />}>
        {t('core.action.add')}
      </Button>
    </form>
  )
}
