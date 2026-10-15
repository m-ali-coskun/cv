import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  List,
  MessageCircle,
  Search,
  SearchX,
  Send,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react'
import { useApp } from '@/store'
import { counterpartId, useMeId, useMyJobs, useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { useLang, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { formatBytes } from '@/lib/format'
import { fileToAsset } from '@/lib/files'
import { item as itemV, spring, stagger } from '@/lib/motion'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Lightbox } from '@/components/ui/Lightbox'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { DisciplineIcon, StatusBadge } from '@/components/ui/Badge'
import { MediaView } from '@/components/art/MediaView'
import { usePersonLookup, PersonAvatar } from '@/features/calendar/ui'
import {
  KIND_COLOR,
  KIND_ORDER,
  downloadFile,
  isVisual,
  loadPrefs,
  matchesKind,
  matchesSource,
  savePrefs,
  sortFiles,
  useLibrary,
  type FileItem,
  type FilesPrefs,
  type KindFilter,
  type SortKey,
  type SourceFilter,
} from './model'
import { FilesCtx, type FileActions, type FilesCtxValue } from './ui'
import { FileCard, FileRow, ListHeader } from './FileViews'
import { InsightsCard, StorageCard } from './StorageCard'
import { FoldersRow } from './FoldersRow'
import { UploadModal } from './UploadModal'
import { BulkBar, DetailsModal, RenameModal } from './Overlays'

const PAGE = 24

/** /files — the library of every asset, delivery, chat attachment (and portfolio piece). */
export default function FilesPage() {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const meId = useMeId()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const library = useLibrary()
  const jobs = useMyJobs()
  const updateJob = useApp((s) => s.updateJob)
  const removeAsset = useApp((s) => s.removeAsset)
  const addAssets = useApp((s) => s.addAssets)
  const sendMessage = useApp((s) => s.sendMessage)
  const ensureConversation = useApp((s) => s.ensureConversation)
  const person = usePersonLookup()
  const [confirm, confirmDialog] = useConfirm()

  const folder = params.get('job')
  const folderJob = folder ? jobs.find((j) => j.id === folder) : undefined
  const [prefs, setPrefsState] = useState<FilesPrefs>(loadPrefs)
  const setPrefs = (patch: Partial<FilesPrefs>) =>
    setPrefsState((p) => {
      const next = { ...p, ...patch }
      savePrefs(next)
      return next
    })
  const [kind, setKind] = useState<KindFilter>('all')
  const [source, setSource] = useState<SourceFilter>('all')
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const anchor = useRef<string | null>(null)
  const [lightbox, setLightbox] = useState<{ items: FileItem[]; index: number } | null>(null)
  const [details, setDetails] = useState<FileItem | null>(null)
  const [renaming, setRenaming] = useState<FileItem | null>(null)
  const [upload, setUpload] = useState<{ job?: string | null; files?: File[] } | null>(null)
  const [dragging, setDragging] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const listTop = useRef<HTMLDivElement>(null)

  const setFolder = useCallback(
    (jobId: string | null) => {
      const p = new URLSearchParams(params)
      if (jobId) p.set('job', jobId)
      else p.delete('job')
      setParams(p, { replace: false })
      setSelected(new Set())
    },
    [params, setParams],
  )

  // ── filtering
  const scoped = useMemo(() => (folder ? library.filter((f) => f.jobId === folder) : library), [library, folder])
  const preKind = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scoped.filter((f) => {
      if (!matchesSource(f, source)) return false
      if (mineOnly && f.addedBy !== meId) return false
      if (!q) return true
      const who = person(f.addedBy)?.name ?? ''
      return [f.name, f.note ?? '', f.jobId ?? '', f.job?.title ?? '', who].some((s) => s.toLowerCase().includes(q))
    })
  }, [scoped, source, mineOnly, meId, query, person])
  const visible = useMemo(() => sortFiles(preKind.filter((f) => matchesKind(f, kind)), prefs.sort, prefs.dir), [preKind, kind, prefs.sort, prefs.dir])
  const kindCounts = useMemo(() => {
    const m = new Map<KindFilter, number>([['all', preKind.length]])
    for (const f of preKind) {
      m.set(f.kind, (m.get(f.kind) ?? 0) + 1)
      if (f.source === 'delivery') m.set('delivery', (m.get('delivery') ?? 0) + 1)
    }
    return m
  }, [preKind])
  const [limit, setLimit] = useState(PAGE)
  const filterKey = `${folder}|${kind}|${source}|${mineOnly}|${query}|${prefs.sort}|${prefs.dir}|${prefs.view}`
  useEffect(() => setLimit(PAGE), [filterKey])
  const shown = visible.slice(0, limit)
  const filtersActive = kind !== 'all' || source !== 'all' || mineOnly || query.trim() !== ''
  const clearFilters = () => {
    setKind('all')
    setSource('all')
    setMineOnly(false)
    setQuery('')
  }

  // prune selection when files disappear
  useEffect(() => {
    setSelected((s) => {
      const ids = new Set(library.map((f) => f.id))
      const next = new Set([...s].filter((id) => ids.has(id)))
      return next.size === s.size ? s : next
    })
  }, [library])

  const selectedFiles = useMemo(() => library.filter((f) => selected.has(f.id)), [library, selected])

  const toggle = useCallback(
    (id: string, shift?: boolean) => {
      setSelected((s) => {
        const next = new Set(s)
        if (shift && anchor.current) {
          const a = visible.findIndex((f) => f.id === anchor.current)
          const b = visible.findIndex((f) => f.id === id)
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a]
            for (let i = lo; i <= hi; i++) next.add(visible[i].id)
            return next
          }
        }
        if (next.has(id)) next.delete(id)
        else next.add(id)
        anchor.current = id
        return next
      })
    },
    [visible],
  )
  const allChecked = visible.length > 0 && visible.every((f) => selected.has(f.id))
  const someChecked = !allChecked && visible.some((f) => selected.has(f.id))
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(visible.map((f) => f.id)))

  // ── actions
  const actions: FileActions = useMemo(
    () => ({
      preview: (f) => {
        if (isVisual(f)) {
          const vis = visible.filter(isVisual)
          const idx = vis.findIndex((x) => x.id === f.id)
          setLightbox(idx >= 0 ? { items: vis, index: idx } : { items: [f], index: 0 })
        } else setDetails(f)
      },
      download: async (files) => {
        let placeholders = 0
        let saved = 0
        for (const f of files) {
          const r = await downloadFile(f)
          if (r === 'placeholder') placeholders++
          if (r === 'saved' || r === 'opened') saved++
          if (files.length > 1) await new Promise((res) => setTimeout(res, 220))
        }
        if (files.length === 1) {
          toast({
            title: placeholders ? t('files.toast.placeholder') : files[0].media.kind === 'url' ? t('files.toast.opened') : t('files.toast.downloading', { name: files[0].name }),
            tone: placeholders ? 'info' : 'success',
          })
        } else toast({ title: t('files.toast.downloadingMany', { count: saved + placeholders }), tone: 'success' })
      },
      remove: async (files) => {
        const list = files.filter((f) => f.removable && f.jobId && f.assetId)
        if (!list.length) return
        const ok = await confirm({
          title: list.length === 1 ? t('files.confirm.removeOne', { name: list[0].name }) : t('files.confirm.removeMany', { count: list.length }),
          description: t('files.confirm.body'),
          confirmLabel: t('files.action.remove'),
          cancelLabel: t('files.cancel'),
          tone: 'danger',
          icon: <Trash2 className="size-5" />,
        })
        if (!ok) return
        const state = useApp.getState()
        const before = new Map<string, NonNullable<ReturnType<typeof state.jobs.find>>['assets']>()
        for (const f of list) {
          const job = state.jobs.find((j) => j.id === f.jobId)
          if (job && !before.has(job.id)) before.set(job.id, job.assets)
          removeAsset(f.jobId!, f.assetId!)
        }
        setSelected((s) => {
          const next = new Set(s)
          list.forEach((f) => next.delete(f.id))
          return next
        })
        setDetails((d) => (d && list.some((f) => f.id === d.id) ? null : d))
        setLightbox(null)
        toast({
          title: t('files.toast.removed', { count: list.length }),
          tone: 'default',
          action: { label: t('files.undo'), onClick: () => before.forEach((assets, jobId) => updateJob(jobId, { assets })) },
        })
      },
      rename: (f) => {
        setDetails(null)
        setRenaming(f)
      },
      share: (f) => {
        const job = useApp.getState().jobs.find((j) => j.id === f.jobId)
        if (!job) return
        const conv = job.conversationId ?? ensureConversation(job.clientId, job.designerId)
        sendMessage(conv, { kind: 'attachment', text: f.name, attachments: [f.media], jobId: job.id })
        const who = person(counterpartId(job, role))
        toast({
          title: t('files.toast.shared', { name: who?.name ?? job.id }),
          description: f.name,
          tone: 'success',
          action: { label: t('files.action.openChat'), onClick: () => navigate(`/messages/${conv}`) },
        })
      },
      copyLink: async (f) => {
        if (f.media.kind !== 'url') return
        try {
          await navigator.clipboard.writeText(f.media.url)
          toast({ title: t('files.toast.copied'), tone: 'success' })
        } catch {
          toast({ title: f.media.url, tone: 'info' })
        }
      },
      openSource: (f) => {
        setDetails(null)
        setLightbox(null)
        if (f.source === 'chat' && f.conversationId) navigate(`/messages/${f.conversationId}`)
        else if (f.source === 'portfolio') navigate('/profile')
        else if (f.jobId) navigate(`/jobs/${f.jobId}`)
      },
    }),
    [visible, confirm, removeAsset, updateJob, ensureConversation, sendMessage, navigate, person, role, t],
  )

  const ctx: FilesCtxValue = useMemo(
    () => ({
      actions,
      selected,
      toggle,
      selecting: selected.size > 0,
      personName: (id: string) => person(id)?.name ?? '',
      personOf: person,
      meId,
    }),
    [actions, selected, toggle, person, meId],
  )

  const saveRename = (f: FileItem, name: string) => {
    const job = useApp.getState().jobs.find((j) => j.id === f.jobId)
    if (!job || !f.assetId) return
    const prev = job.assets
    updateJob(job.id, { assets: job.assets.map((a) => (a.id === f.assetId ? { ...a, name } : a)) })
    setRenaming(null)
    toast({ title: t('files.toast.renamed'), description: name, tone: 'success', action: { label: t('files.undo'), onClick: () => updateJob(job.id, { assets: prev }) } })
  }

  const dropToJob = async (jobId: string, files: File[]) => {
    const job = useApp.getState().jobs.find((j) => j.id === jobId)
    if (!job || job.status === 'declined' || job.status === 'cancelled') {
      toast({ title: t('files.toast.closedJob'), tone: 'error' })
      return
    }
    const ok = files.filter((f) => f.size <= 50 * 1024 * 1024)
    if (ok.length < files.length) toast({ title: t('files.upload.tooBig', { count: files.length - ok.length }), tone: 'error' })
    if (!ok.length) return
    const assets = await Promise.all(ok.map((f) => fileToAsset(f, meId)))
    addAssets(jobId, assets)
    toast({ title: t('files.upload.done', { count: assets.length }), description: jobId, tone: 'success', action: { label: t('files.open'), onClick: () => setFolder(jobId) } })
  }

  // ── page-level drag & drop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      setDragging(true)
      clearTimeout(timer)
      timer = setTimeout(() => setDragging(false), 180)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      const handled = e.defaultPrevented
      e.preventDefault()
      setDragging(false)
      if (handled) return // a folder took it
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) setUpload({ job: folder, files })
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [folder])

  // ── keyboard: "/" focuses search, Esc clears selection, ⌘A selects all visible
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape' && selected.size) setSelected(new Set())
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && visible.length) {
        e.preventDefault()
        setSelected(new Set(visible.map((f) => f.id)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected.size, visible])

  const pickKind = (k: KindFilter) => {
    setKind(k)
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const folderFiles = folder ? scoped : []
  const folderSize = folderFiles.reduce((n, f) => n + f.size, 0)
  const counterpart = folderJob ? person(counterpartId(folderJob, role)) : undefined
  const SORTS: SortKey[] = ['recent', 'name', 'size']
  const kindChips: KindFilter[] = ['all', ...(['delivery', ...KIND_ORDER] as KindFilter[]).filter((k) => kindCounts.get(k) || kind === k)]

  return (
    <FilesCtx.Provider value={ctx}>
      <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="flex flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <motion.div variants={itemV} className="min-w-0">
            <StorageCard files={library} onUpload={() => setUpload({ job: folder })} onKind={pickKind} />
          </motion.div>
          <motion.div variants={itemV} className="min-w-0">
            <InsightsCard
              files={library}
              onKind={pickKind}
              onSource={(s) => {
                setFolder(null)
                setSource(s)
              }}
            />
          </motion.div>
        </div>

        <motion.div variants={itemV}>
          <Glass className="px-4 pt-5 sm:px-6">
            <div className="relative z-[1]">
              <FoldersRow
                files={library}
                jobs={jobs}
                activeJob={folder}
                source={source}
                onOpenJob={(id) => {
                  setFolder(folder === id ? null : id)
                  setTimeout(() => listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                }}
                onOpenSource={(s) => {
                  setFolder(null)
                  setSource(source === s ? 'all' : s)
                  setTimeout(() => listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                }}
                onDropFiles={dropToJob}
              />
            </div>
          </Glass>
        </motion.div>

        <motion.div variants={itemV} ref={listTop} className="scroll-mt-4">
          <Glass className="p-3 sm:p-5">
            <div className="relative z-[1]">
              {/* breadcrumb + view controls */}
              <div className="flex flex-wrap items-center gap-2 px-1">
                <nav aria-label={t('files.breadcrumb')} className="flex min-w-0 flex-1 items-center gap-1.5 text-[19px] font-medium tracking-[-0.02em]">
                  {folder && (
                    <button
                      type="button"
                      aria-label={t('files.allFiles')}
                      onClick={() => setFolder(null)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink sm:hidden"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => setFolder(null)} className={cn('shrink-0 transition-colors', folder ? 'text-ink-3 hover:text-ink max-sm:hidden' : 'text-ink')}>
                    {t('files.allFiles')}
                  </button>
                  <AnimatePresence mode="popLayout">
                    {folder && (
                      <motion.span
                        key={folder}
                        className="flex min-w-0 items-center gap-1.5"
                        initial={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                        transition={spring.smooth}
                      >
                        <ChevronRight className="size-4 shrink-0 text-ink-3 max-sm:hidden" />
                        <span className="shrink-0 font-mono text-[16px]">{folder}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <motion.span key={visible.length} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="ml-1 shrink-0 font-mono text-[13px] font-normal text-ink-3">
                    {visible.length}
                  </motion.span>
                </nav>
                <div className="flex items-center gap-2">
                  <Menu
                    width={200}
                    items={SORTS.map((k) => ({
                      label: t(`files.sort.${k}`),
                      active: prefs.sort === k,
                      icon: prefs.sort === k ? <Check /> : <span className="inline-block size-4" />,
                      onClick: () => setPrefs({ sort: k, dir: prefs.sort === k ? (prefs.dir === 'asc' ? 'desc' : 'asc') : k === 'name' ? 'asc' : 'desc' }),
                    }))}
                    trigger={({ onClick }) => (
                      <Button size="sm" variant="soft" icon={<ArrowDownUp className={cn('size-3.5 transition-transform', prefs.dir === 'asc' && 'rotate-180')} />} onClick={onClick}>
                        <span className="max-sm:hidden">{t(`files.sort.${prefs.sort}`)}</span>
                      </Button>
                    )}
                  />
                  <Segmented
                    size="sm"
                    value={prefs.view}
                    onChange={(v) => setPrefs({ view: v })}
                    layoutId="files-view"
                    options={[
                      { value: 'grid', label: <span className="sr-only">{t('files.view.grid')}</span>, icon: <LayoutGrid className="size-3.5" /> },
                      { value: 'list', label: <span className="sr-only">{t('files.view.list')}</span>, icon: <List className="size-3.5" /> },
                    ]}
                  />
                  <Button size="sm" icon={<UploadCloud className="size-4" />} onClick={() => setUpload({ job: folder })}>
                    <span className="max-sm:hidden">{folder ? t('files.uploadHere') : t('files.upload')}</span>
                  </Button>
                </div>
              </div>

              {/* folder header */}
              <AnimatePresence initial={false}>
                {folderJob && (
                  <motion.div
                    key={folderJob.id}
                    initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                    exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                    transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-[var(--surface-2)] p-3 sm:gap-4">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
                        <MediaView media={folderJob.cover} playBadge={false} />
                      </div>
                      <div className="min-w-[170px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <DisciplineIcon id={folderJob.discipline} size={20} />
                          <span className="font-mono text-[12px] text-ink-3">{folderJob.id}</span>
                          <StatusBadge status={folderJob.status} size="xs" />
                        </div>
                        <p className="mt-0.5 truncate text-[15px] font-medium">{folderJob.title}</p>
                        <p className="font-mono text-[11.5px] text-ink-3">
                          {t('files.count', { count: folderFiles.length })} · {formatBytes(folderSize)} · {t('files.updated', { when: timeAgo(folderJob.updatedAt, lang) })}
                        </p>
                      </div>
                      {counterpart && (
                        <span className="hidden items-center gap-2 md:flex">
                          <PersonAvatar person={counterpart} size={28} />
                          <span className="max-w-[140px] truncate text-[12.5px] text-ink-2">{counterpart.name}</span>
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 max-sm:w-full max-sm:justify-end">
                        <Button
                          size="sm"
                          variant="glass"
                          icon={<MessageCircle className="size-3.5" />}
                          onClick={() => navigate(`/messages/${folderJob.conversationId ?? ensureConversation(folderJob.clientId, folderJob.designerId)}`)}
                        >
                          <span className="max-sm:hidden">{t('files.action.openChat')}</span>
                        </Button>
                        <Button size="sm" variant="glass" iconRight={<ArrowUpRight className="size-3.5" />} onClick={() => navigate(`/jobs/${folderJob.id}`)}>
                          {t('files.action.openJob')}
                        </Button>
                        <button type="button" aria-label={t('files.closeFolder')} onClick={() => setFolder(null)} className="flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-3)] hover:text-ink">
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* search + source + mine */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-60 sm:flex-none lg:w-72">
                  <Input
                    ref={searchRef}
                    icon={<Search />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('files.searchPlaceholder')}
                    className="h-10"
                    right={
                      query ? (
                        <button type="button" aria-label={t('files.clearSearch')} onClick={() => setQuery('')} className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--surface-2)]">
                          <X className="size-3.5" />
                        </button>
                      ) : (
                        <kbd className="mr-1 rounded-md bg-[var(--surface-2)] px-1.5 font-mono text-[11px] text-ink-3">/</kbd>
                      )
                    }
                  />
                </div>
                <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
                  <Segmented
                    size="sm"
                    value={source}
                    onChange={setSource}
                    layoutId="files-source"
                    options={[
                      { value: 'all', label: t('files.source.all') },
                      { value: 'jobs', label: t('files.source.jobs') },
                      { value: 'chat', label: t('files.source.chat') },
                      ...(role === 'designer' ? [{ value: 'portfolio' as const, label: t('files.source.portfolio') }] : []),
                    ]}
                  />
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-pressed={mineOnly}
                  onClick={() => setMineOnly((v) => !v)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
                    mineOnly ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink',
                  )}
                >
                  <UserRound className="size-3.5" />
                  {t('files.mine')}
                </motion.button>
                <AnimatePresence>
                  {filtersActive && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={clearFilters}
                      className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink-3 hover:text-ink"
                    >
                      <X className="size-3.5" />
                      {t('files.clearFilters')}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* kind chips */}
              <LayoutGroup id="files-kinds">
                <div className="-mx-1 mt-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                  {kindChips.map((k) => {
                    const active = kind === k
                    const color = k === 'all' ? 'var(--ink)' : k === 'delivery' ? 'var(--accent)' : KIND_COLOR[k]
                    const count = kindCounts.get(k) ?? 0
                    return (
                      <motion.button
                        key={k}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setKind(k)}
                        className={cn('relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors', active ? 'text-[var(--surface)] dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:text-ink')}
                      >
                        {active && <motion.span layoutId="kind-active" className="absolute inset-0 rounded-full bg-ink dark:bg-accent" transition={spring.pill} />}
                        <span className="relative z-[1] inline-flex items-center gap-1.5">
                          {k !== 'all' && <span className="size-2 rounded-full" style={{ background: color, boxShadow: active ? '0 0 0 2px rgba(255,255,255,.35)' : undefined }} />}
                          {k === 'all' ? t('files.kind.all') : k === 'delivery' ? t('files.kind.deliveries') : t(`files.kind.${k}`)}
                          <span className={cn('font-mono text-[10.5px]', active ? 'opacity-70' : 'text-ink-3')}>{count}</span>
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </LayoutGroup>

              {/* select-all strip */}
              <AnimatePresence initial={false}>
                {selected.size > 0 && prefs.view === 'grid' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2 flex items-center gap-2 px-1 text-[12.5px] text-ink-2">
                      <button type="button" onClick={toggleAll} className="font-medium text-accent-text hover:underline">
                        {allChecked ? t('files.deselectAll') : t('files.selectAllN', { count: visible.length })}
                      </button>
                      <span className="text-ink-3">· {t('files.shiftHint')}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* files */}
              <div className="mt-4">
                {library.length === 0 ? (
                  <EmptyState
                    icon={<FolderOpen />}
                    title={t('files.empty.title')}
                    description={t('files.empty.body')}
                    action={
                      <Button icon={<UploadCloud className="size-4" />} onClick={() => setUpload({ job: folder })}>
                        {t('files.upload')}
                      </Button>
                    }
                  />
                ) : visible.length === 0 ? (
                  <EmptyState
                    icon={folder && !scoped.length ? <FolderOpen /> : <SearchX />}
                    title={folder && !scoped.length ? t('files.emptyFolderTitle') : t('files.noMatch.title')}
                    description={folder && !scoped.length ? t('files.emptyFolderBody') : t('files.noMatch.body')}
                    action={
                      folder && !scoped.length ? (
                        <Button icon={<UploadCloud className="size-4" />} onClick={() => setUpload({ job: folder })}>
                          {t('files.uploadHere')}
                        </Button>
                      ) : (
                        <Button variant="soft" icon={<X className="size-4" />} onClick={clearFilters}>
                          {t('files.clearFilters')}
                        </Button>
                      )
                    }
                  />
                ) : prefs.view === 'grid' ? (
                  <motion.div layout className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 2xl:grid-cols-5">
                    <AnimatePresence mode="popLayout">
                      {shown.map((f, i) => (
                        <FileCard key={f.id} file={f} index={i % PAGE} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <div>
                    <ListHeader
                      sort={prefs.sort}
                      dir={prefs.dir}
                      onSort={(k) => setPrefs({ sort: k, dir: prefs.sort === k ? (prefs.dir === 'asc' ? 'desc' : 'asc') : k === 'name' ? 'asc' : 'desc' })}
                      allChecked={allChecked}
                      someChecked={someChecked}
                      onToggleAll={toggleAll}
                    />
                    <div className="mt-1 flex flex-col gap-0.5">
                      <AnimatePresence mode="popLayout">
                        {shown.map((f, i) => (
                          <FileRow key={f.id} file={f} index={i % PAGE} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                {visible.length > limit && <LoadMore shown={limit} total={visible.length} onMore={() => setLimit((l) => l + PAGE)} />}
              </div>
            </div>
          </Glass>
        </motion.div>
      </motion.div>

      <BulkBar files={selectedFiles} onClear={() => setSelected(new Set())} />

      <Lightbox
        items={lightbox?.items.map((f) => f.media) ?? []}
        index={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        onIndexChange={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        title={lightbox ? lightbox.items[lightbox.index]?.name : undefined}
        captions={lightbox?.items.map((f) => <LightboxCaption key={f.id} file={f} />)}
        originFor={(i) => {
          const id = lightbox?.items[i]?.id
          return id ? document.querySelector(`[data-file-id="${CSS.escape(id)}"] [data-thumb]`) : null
        }}
        actions={(i) => {
          const f = lightbox?.items[i]
          if (!f) return null
          return (
            <>
              <LbBtn label={f.source === 'chat' ? t('files.action.openChat') : f.source === 'portfolio' ? t('files.action.openPortfolio') : t('files.action.openJob')} onClick={() => actions.openSource(f)}>
                <ArrowUpRight className="size-4" />
              </LbBtn>
              {f.jobId && (
                <LbBtn label={t('files.action.share')} onClick={() => actions.share(f)}>
                  <Send className="size-4" />
                </LbBtn>
              )}
              {f.removable && (
                <LbBtn label={t('files.action.remove')} onClick={() => actions.remove([f])}>
                  <Trash2 className="size-4" />
                </LbBtn>
              )}
            </>
          )
        }}
      />
      <DetailsModal file={details} onClose={() => setDetails(null)} />
      <RenameModal file={renaming} onClose={() => setRenaming(null)} onSave={saveRename} />
      <UploadModal open={!!upload} onClose={() => setUpload(null)} initialJob={upload?.job} initialFiles={upload?.files} onUploaded={(id) => setFolder(id)} />
      {confirmDialog}

      {createPortal(
        <AnimatePresence>
          {dragging && (
            <motion.div
              className="pointer-events-none fixed inset-2 z-[70] flex items-end justify-center rounded-[32px] border-2 border-dashed border-[var(--accent)] bg-accent-softer p-8 backdrop-blur-[2px]"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div initial={{ y: 30 }} animate={{ y: 0 }} transition={spring.bouncy} className="glass-night flex items-center gap-3 rounded-full px-5 py-3 text-white">
                <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <UploadCloud className="size-4" />
                </motion.span>
                <span className="text-[14px] font-medium">{folder ? t('files.dropInto', { folder }) : t('files.dropAnywhere')}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </FilesCtx.Provider>
  )
}

function LightboxCaption({ file }: { file: FileItem }) {
  const t = useT()
  const lang = useLang()
  const by = usePersonLookup()(file.addedBy)
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <span className="font-medium">{file.name}</span>
      <span className="font-mono text-white/60">{formatBytes(file.size)}</span>
      <span className="text-white/40">·</span>
      <span className="font-mono text-white/60">
        {file.source === 'delivery' ? `${file.jobId} · v${file.version}` : file.source === 'chat' ? t('files.source.chat') : file.source === 'portfolio' ? t('files.source.portfolio') : file.jobId}
      </span>
      {by && (
        <>
          <span className="text-white/40">·</span>
          <span className="text-white/60">{by.name}</span>
        </>
      )}
      <span className="text-white/40">·</span>
      <span className="text-white/60">{timeAgo(file.addedAt, lang)}</span>
    </span>
  )
}

function LbBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
      className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl transition-colors hover:bg-white/20"
    >
      {children}
    </motion.button>
  )
}

/** "Show more" button that also auto-loads when scrolled near. */
function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onMore(), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [onMore, shown])
  return (
    <div ref={ref} className="mt-5 flex flex-col items-center gap-2">
      <Button variant="soft" size="sm" onClick={onMore}>
        {t('files.showMore', { count: Math.min(PAGE, total - shown) })}
      </Button>
      <span className="font-mono text-[11px] text-ink-3">{t('files.showing', { shown, total })}</span>
    </div>
  )
}
