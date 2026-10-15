import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Columns2,
  Download,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  MessageSquarePlus,
  MousePointerClick,
  Repeat2,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { fmt, shortDate, timeAgo } from '@/lib/dates'
import { mediaIsImage, mediaIsVideo } from '@/lib/files'
import { useMediaUrl } from '@/lib/useMediaUrl'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Annotation, DeliveryVersion, MediaRef } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Pill } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Lightbox } from '@/components/ui/Lightbox'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { useJobCtx } from '../context'
import { downloadMedia, isActiveWork } from '../model'
import { CheckDot, PersonAvatar, listItem } from '../ui'
import { CompareSlider } from './CompareSlider'

const V_TONE = { pending: 'warning', approved: 'success', changes_requested: 'info' } as const

/** Natural aspect ratio of a media item (art is 4:3), clamped to something layout-friendly. */
function useAspect(media: MediaRef | undefined) {
  const url = useMediaUrl(media)
  const [ratio, setRatio] = useState(4 / 3)
  useEffect(() => {
    setRatio(4 / 3)
    if (!media || media.kind === 'art' || !url) return
    const set = (w: number, h: number) => w && h && setRatio(Math.max(0.56, Math.min(2.2, w / h)))
    if (mediaIsVideo(media)) {
      const v = document.createElement('video')
      v.onloadedmetadata = () => set(v.videoWidth, v.videoHeight)
      v.src = url
    } else if (mediaIsImage(media)) {
      const img = new Image()
      img.onload = () => set(img.naturalWidth, img.naturalHeight)
      img.src = url
    }
  }, [media, url])
  return ratio
}

export function DeliveriesTab() {
  const t = useT()
  const lang = useLang()
  const { job, side, canAct, versionId, setVersionId, openModal, person, designer } = useJobCtx()
  const [mode, setMode] = useState<'annotate' | 'compare'>('annotate')
  const [mediaIndex, setMediaIndex] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const latest = job.versions[job.versions.length - 1]
  const version = job.versions.find((v) => v.id === versionId) ?? latest
  const prev = version ? job.versions[job.versions.findIndex((v) => v.id === version.id) - 1] : undefined
  const [beforeId, setBeforeId] = useState<string | undefined>(undefined)
  const before = job.versions.find((v) => v.id === beforeId && v.id !== version?.id) ?? prev ?? job.versions.find((v) => v.id !== version?.id)

  // keep the media index valid when versions change underneath us
  const count = version?.media.length ?? 0
  useEffect(() => {
    if (mediaIndex >= count) setMediaIndex(0)
  }, [count, mediaIndex])
  useEffect(() => {
    if (job.versions.length < 2 && mode === 'compare') setMode('annotate')
  }, [job.versions.length, mode])

  if (!version) {
    const canDeliver = canAct && side === 'designer' && (isActiveWork(job.status) || job.status === 'revisions')
    return (
      <EmptyState
        icon={<Layers />}
        title={t('job.deliveries.emptyTitle')}
        description={t(side === 'designer' ? 'job.deliveries.emptyDesigner' : 'job.deliveries.emptyClient', { name: designer?.name ?? '' })}
        action={
          canDeliver && (
            <Button icon={<Send className="size-4" />} onClick={() => openModal('deliver')}>
              {t('job.act.d.deliver', { n: 1 })}
            </Button>
          )
        }
      />
    )
  }

  const isLatest = version.id === latest?.id
  const author = person(job.designerId)
  const downloadAll = async () => {
    for (const [i, m] of version.media.entries()) await downloadMedia(m, `${job.id}-v${version.version}-${i + 1}`)
    toast({ title: t('job.act.downloaded', { count: version.media.length }), tone: 'success' })
  }

  return (
    <div className="space-y-4">
      {/* version selector */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[...job.versions].reverse().map((v) => {
          const active = v.id === version.id
          const open = v.annotations.filter((a) => !a.resolved).length
          return (
            <motion.button
              key={v.id}
              layout
              type="button"
              onClick={() => {
                setVersionId(v.id === latest?.id ? null : v.id)
                setMediaIndex(0)
              }}
              initial={{ opacity: 0, x: -16, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              whileTap={{ scale: 0.96 }}
              transition={spring.smooth}
              className={cn(
                'relative flex shrink-0 items-center gap-2.5 rounded-[18px] p-1.5 pr-3.5 text-left transition-colors',
                active ? 'text-[var(--surface)] dark:text-ink' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]',
              )}
            >
              {active && <motion.span layoutId="version-pill" className="absolute inset-0 rounded-[18px] bg-ink dark:bg-[var(--surface-3)]" transition={spring.pill} />}
              <span className="relative size-10 overflow-hidden rounded-[12px] ring-1 ring-black/10">
                <MediaView media={v.media[0]} playBadge={false} />
              </span>
              <span className="relative min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[13px] font-semibold">v{v.version}</span>
                  {v.id === latest?.id && <span className="rounded-full bg-accent px-1.5 text-[9.5px] font-semibold uppercase text-accent-ink">{t('job.deliveries.latest')}</span>}
                </span>
                <span className={cn('block font-mono text-[10.5px]', active ? 'opacity-70' : 'text-ink-3')}>
                  {shortDate(v.submittedAt, lang)} · {t(`job.deliveries.vstatus.${v.status}`)}
                </span>
              </span>
              {open > 0 && (
                <span className="relative ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10.5px] font-semibold text-[#0b0b0c]">{open}</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* version header */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={version.id}
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            <PersonAvatar person={author} size={36} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">{t('core.common.version', { n: version.version })}</span>
                <Pill tone={V_TONE[version.status]} size="xs" dot>
                  {t(`job.deliveries.vstatus.${version.status}`)}
                </Pill>
              </div>
              <p className="mt-0.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">{version.note}</p>
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                {author?.name} · {fmt(version.submittedAt, 'EEE d MMM · HH:mm', lang)} · {t('job.deliveries.files', { count: version.media.length })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<'annotate' | 'compare'>
              value={mode}
              onChange={(m) => (job.versions.length > 1 || m === 'annotate') && setMode(m)}
              size="sm"
              layoutId="deliv-mode"
              options={[
                { value: 'annotate', label: t('job.deliveries.annotate'), icon: <MessageSquarePlus className="size-3.5" /> },
                { value: 'compare', label: t('job.deliveries.compare'), icon: <Columns2 className="size-3.5" /> },
              ]}
              className={cn(job.versions.length < 2 && '[&>button:last-child]:pointer-events-none [&>button:last-child]:opacity-40')}
            />
            <Button size="sm" variant="glass" icon={<Maximize2 className="size-3.5" />} onClick={() => setLightbox(mediaIndex)}>
              <span className="hidden sm:inline">{t('job.deliveries.present')}</span>
            </Button>
            <Button size="sm" variant="glass" icon={<Download className="size-3.5" />} onClick={downloadAll}>
              <span className="hidden sm:inline">{t('job.deliveries.downloadAll')}</span>
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {mode === 'compare' && before ? (
        <CompareView version={version} before={before} mediaIndex={mediaIndex} setMediaIndex={setMediaIndex} setBeforeId={setBeforeId} />
      ) : (
        <AnnotateView key={version.id} version={version} mediaIndex={mediaIndex} setMediaIndex={setMediaIndex} onFullscreen={setLightbox} />
      )}

      {/* role-aware call to action for the version on screen */}
      {canAct && isLatest && side === 'client' && job.status === 'in_review' && (
        <motion.div
          className="glass-accent flex flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
        >
          <div className="relative z-[1] min-w-0">
            <div className="text-[15px] font-medium">{t('job.deliveries.decideTitle', { n: version.version })}</div>
            <div className="text-[12.5px] opacity-75">{t('job.deliveries.decideBody')}</div>
          </div>
          <div className="relative z-[1] flex flex-wrap gap-2">
            <Button icon={<Wallet className="size-4" />} onClick={() => openModal('approve')}>
              {t('job.act.c.approve')}
            </Button>
            <Button variant="glass" icon={<Repeat2 className="size-4" />} disabled={job.revisions.length >= job.revisionLimit} onClick={() => openModal('revision')}>
              {t('job.act.c.requestRevision')}
            </Button>
          </div>
        </motion.div>
      )}
      {canAct && isLatest && side === 'designer' && (job.status === 'revisions' || isActiveWork(job.status)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[var(--surface-2)] p-4">
          <span className="text-[13.5px] text-ink-2">{t('job.deliveries.nextHint', { n: job.versions.length + 1 })}</span>
          <Button icon={<Send className="size-4" />} onClick={() => openModal('deliver')}>
            {t('job.act.d.deliver', { n: job.versions.length + 1 })}
          </Button>
        </div>
      )}

      <Lightbox
        items={version.media}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={(i) => {
          setLightbox(i)
          setMediaIndex(i)
        }}
        title={`${job.title} · v${version.version}`}
        captions={version.media.map((_, i) => t('job.deliveries.pinsOn', { count: version.annotations.filter((a) => a.mediaIndex === i).length }))}
        renderOverlay={(i) => (
          <div className="pointer-events-none absolute inset-0">
            {numbered(version)
              .filter(({ a }) => a.mediaIndex === i)
              .map(({ a, n }) => (
                <span
                  key={a.id}
                  className={cn(
                    'absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-semibold shadow-lg ring-2 ring-white',
                    a.resolved ? 'bg-success text-white' : 'bg-accent text-accent-ink',
                  )}
                  style={{ left: `${a.x}%`, top: `${a.y}%` }}
                >
                  {n}
                </span>
              ))}
          </div>
        )}
      />
    </div>
  )
}

/** Annotations of a version numbered in creation order. */
function numbered(v: DeliveryVersion) {
  return [...v.annotations].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a, i) => ({ a, n: i + 1 }))
}

// ─────────────────────────── annotate ───────────────────────────

function AnnotateView({
  version,
  mediaIndex,
  setMediaIndex,
  onFullscreen,
}: {
  version: DeliveryVersion
  mediaIndex: number
  setMediaIndex: (i: number) => void
  onFullscreen: (i: number) => void
}) {
  const t = useT()
  const lang = useLang()
  const { job, canAct, meId, person } = useJobCtx()
  const add = useApp((s) => s.addAnnotation)
  const toggle = useApp((s) => s.toggleAnnotation)
  const remove = useApp((s) => s.removeAnnotation)
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const [text, setText] = useState('')
  const [hot, setHot] = useState<string | null>(null)
  const [showPins, setShowPins] = useState(true)
  const [showResolved, setShowResolved] = useState(true)
  const [filter, setFilter] = useState<'open' | 'all'>('all')
  const stage = useRef<HTMLDivElement>(null)
  const media = version.media[mediaIndex] ?? version.media[0]
  const aspect = useAspect(media)
  const canPin = canAct && job.status !== 'declined' && job.status !== 'cancelled'

  const all = useMemo(() => numbered(version), [version])
  const onMedia = all.filter(({ a }) => a.mediaIndex === mediaIndex && (showResolved || !a.resolved))
  const listed = all.filter(({ a }) => filter === 'all' || !a.resolved)
  const openCount = all.filter(({ a }) => !a.resolved).length

  useEffect(() => {
    setDraft(null)
    setText('')
  }, [mediaIndex])

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canPin) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10
    setDraft({ x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) })
    setShowPins(true)
  }
  const submit = () => {
    if (!draft || !text.trim()) return
    add(job.id, version.id, { x: draft.x, y: draft.y, mediaIndex, text: text.trim() })
    toast({ title: t('job.pins.added', { n: all.length + 1 }), description: text.trim(), tone: 'success', duration: 2200 })
    setDraft(null)
    setText('')
  }
  const focusPin = (a: Annotation) => {
    if (a.mediaIndex !== mediaIndex) setMediaIndex(a.mediaIndex)
    setHot(a.id)
    window.setTimeout(() => setHot((h) => (h === a.id ? null : h)), 1600)
    stage.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className="grid gap-4 @min-[880px]:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0">
        {/* stage */}
        <div
          ref={stage}
          className={cn(
            'relative mx-auto w-full overflow-hidden rounded-[22px] bg-[var(--surface-2)] shadow-[0_30px_60px_-30px_rgba(0,0,0,.45)] ring-1 ring-black/5',
            canPin && 'cursor-crosshair',
          )}
          style={{ aspectRatio: aspect, maxWidth: `calc(68vh * ${aspect})` }}
          onClick={place}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${version.id}-${mediaIndex}`}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <MediaView media={media} controls={media && mediaIsVideo(media)} playBadge={false} />
            </motion.div>
          </AnimatePresence>

          {/* pins */}
          <AnimatePresence>
            {showPins &&
              onMedia.map(({ a, n }, i) => (
                <Pin
                  key={a.id}
                  annotation={a}
                  n={n}
                  delay={i * 0.05}
                  hot={hot === a.id}
                  onHover={(h) => setHot(h ? a.id : null)}
                  author={person(a.authorId)?.name}
                  when={timeAgo(a.createdAt, lang)}
                />
              ))}
          </AnimatePresence>

          {/* new pin + origin-aware popover */}
          <AnimatePresence>
            {draft && (
              <motion.div
                key="draft"
                className="absolute z-20"
                style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <motion.span
                  className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-[12.5px] font-semibold text-[var(--surface)] shadow-xl ring-[3px] ring-white"
                  initial={{ scale: 0, y: -24 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={spring.bouncy}
                >
                  {all.length + 1}
                  <span className="absolute inset-0 animate-ping rounded-full bg-ink/40" />
                </motion.span>
                <motion.form
                  className={cn(
                    'glass glass-strong absolute w-[min(260px,70vw)] rounded-[18px] p-2.5',
                    draft.x > 58 ? 'right-5' : 'left-5',
                    draft.y > 62 ? 'bottom-3' : 'top-3',
                  )}
                  style={{ transformOrigin: `${draft.x > 58 ? 'right' : 'left'} ${draft.y > 62 ? 'bottom' : 'top'}` }}
                  initial={{ opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring.snappy}
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit()
                  }}
                >
                  <div className="relative z-[1]">
                    <textarea
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          submit()
                        } else if (e.key === 'Escape') {
                          e.stopPropagation()
                          setDraft(null)
                        }
                      }}
                      rows={2}
                      placeholder={t('job.pins.ph')}
                      className="w-full resize-none rounded-[12px] border border-line bg-[var(--surface)] px-2.5 py-2 text-[13px] text-ink outline-none focus:border-[var(--accent-line)]"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-ink-3">
                        {draft.x.toFixed(0)}% · {draft.y.toFixed(0)}%
                      </span>
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => setDraft(null)}>
                          {t('core.action.cancel')}
                        </Button>
                        <Button size="xs" type="submit" disabled={!text.trim()}>
                          {t('job.pins.post')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* hint */}
          {canPin && !draft && (
            <motion.span
              className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] font-medium text-white backdrop-blur"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: EASE_OUT }}
            >
              <MousePointerClick className="size-3.5" />
              {t('job.pins.hint')}
            </motion.span>
          )}
        </div>

        {/* thumbnails + toggles */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto p-0.5">
            {version.media.map((m, i) => {
              const pins = version.annotations.filter((a) => a.mediaIndex === i && !a.resolved).length
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setMediaIndex(i)}
                  onDoubleClick={() => onFullscreen(i)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  className={cn('relative size-16 shrink-0 overflow-hidden rounded-[14px] ring-2 transition-[box-shadow] sm:size-[72px]', i === mediaIndex ? 'ring-[var(--accent)]' : 'ring-transparent opacity-70 hover:opacity-100')}
                  aria-label={t('job.deliveries.image', { n: i + 1 })}
                >
                  <MediaView media={m} playBadge={false} />
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1 font-mono text-[9.5px] text-white">{i + 1}</span>
                  {pins > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9.5px] font-bold text-accent-ink">{pins}</span>}
                </motion.button>
              )
            })}
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-ink-2">
              <Toggle checked={showPins} onChange={setShowPins} label={t('job.pins.show')} size="sm" />
              <span onClick={() => setShowPins(!showPins)}>{t('job.pins.show')}</span>
            </div>
            <div className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-ink-2">
              <Toggle checked={showResolved} onChange={setShowResolved} label={t('job.pins.showResolved')} size="sm" />
              <span onClick={() => setShowResolved(!showResolved)}>{t('job.pins.showResolved')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* comments */}
      <aside className="min-w-0 rounded-[22px] bg-[var(--surface-2)] p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-[14px] font-medium text-ink">
            {t('job.pins.title')} <span className="font-mono text-[12px] text-ink-3">{openCount}/{all.length}</span>
          </div>
          <Segmented<'open' | 'all'>
            value={filter}
            onChange={setFilter}
            size="sm"
            pill="surface"
            layoutId="pins-filter"
            options={[
              { value: 'all', label: t('core.common.all') },
              { value: 'open', label: t('job.pins.open') },
            ]}
          />
        </div>
        <ul className="mt-2 max-h-[460px] space-y-1.5 overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {listed.map(({ a, n }) => {
              const author = person(a.authorId)
              return (
                <motion.li
                  key={a.id}
                  layout
                  {...listItem}
                  onPointerEnter={() => setHot(a.id)}
                  onPointerLeave={() => setHot((h) => (h === a.id ? null : h))}
                  className={cn(
                    'group/pin relative cursor-pointer rounded-[16px] border bg-[var(--surface)] p-2.5 transition-[border-color,box-shadow] duration-200',
                    hot === a.id ? 'border-[var(--accent-line)] shadow-[0_0_0_3px_var(--accent-softer)]' : 'border-transparent',
                  )}
                  onClick={() => focusPin(a)}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', a.resolved ? 'bg-success text-white' : 'bg-accent text-accent-ink')}>
                      {a.resolved ? <Check className="size-3.5" strokeWidth={3} /> : n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[13px] leading-snug', a.resolved ? 'text-ink-3 line-through decoration-[var(--ink-4)]' : 'text-ink')}>{a.text}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                        <PersonAvatar person={author} size={14} />
                        <span className="truncate">{author?.name}</span>
                        <span>·</span>
                        <span className="font-mono">{timeAgo(a.createdAt, lang)}</span>
                        {version.media.length > 1 && <span className="ml-auto shrink-0 rounded bg-[var(--surface-2)] px-1 font-mono">#{a.mediaIndex + 1}</span>}
                      </div>
                    </div>
                  </div>
                  {canAct && (
                    <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <CheckDot checked={a.resolved} size={18} tone="success" label={t(a.resolved ? 'job.pins.reopen' : 'job.pins.resolve')} onClick={() => toggle(job.id, version.id, a.id)} />
                      <button type="button" onClick={() => toggle(job.id, version.id, a.id)} className="text-[11.5px] font-medium text-ink-2 hover:text-ink">
                        {t(a.resolved ? 'job.pins.reopen' : 'job.pins.resolve')}
                      </button>
                      {a.authorId === meId && (
                        <button
                          type="button"
                          aria-label={t('core.action.delete')}
                          onClick={() => remove(job.id, version.id, a.id)}
                          className="ml-auto flex size-6 items-center justify-center rounded-full text-ink-3 opacity-100 transition-all hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover/pin:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
          {!listed.length && (
            <li className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--surface)] text-ink-3">
                {filter === 'open' && all.length ? <CheckCheck className="size-5" /> : <MessageSquarePlus className="size-5" />}
              </span>
              <span className="text-[12.5px] text-ink-3">{filter === 'open' && all.length ? t('job.pins.allResolved') : t(canPin ? 'job.pins.empty' : 'job.pins.emptyRo')}</span>
            </li>
          )}
        </ul>
      </aside>
    </div>
  )
}

function Pin({ annotation: a, n, delay, hot, onHover, author, when }: { annotation: Annotation; n: number; delay: number; hot: boolean; onHover: (h: boolean) => void; author?: string; when: string }) {
  const tipLeft = a.x > 60
  const tipUp = a.y > 70
  return (
    <motion.div className="absolute z-10" style={{ left: `${a.x}%`, top: `${a.y}%` }} onClick={(e) => e.stopPropagation()}>
      <motion.button
        type="button"
        className={cn(
          'absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-semibold shadow-[0_8px_18px_-6px_rgba(0,0,0,.55)] ring-[2.5px] ring-white',
          a.resolved ? 'bg-success text-white' : 'bg-accent text-accent-ink',
        )}
        initial={{ scale: 0, y: -28, opacity: 0 }}
        animate={{ scale: hot ? 1.3 : a.resolved ? 0.85 : 1, y: 0, opacity: a.resolved ? 0.75 : 1 }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
        transition={{ ...spring.bouncy, delay }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
        aria-label={`${n}: ${a.text}`}
      >
        {a.resolved ? <Check className="size-3.5" strokeWidth={3} /> : n}
        {hot && <span className="absolute -inset-1.5 animate-ping rounded-full bg-[var(--accent)] opacity-40" />}
      </motion.button>
      <AnimatePresence>
        {hot && (
          <motion.div
            className={cn('pointer-events-none absolute w-max max-w-[220px] rounded-[14px] bg-ink px-3 py-2 text-[12px] leading-snug text-[var(--surface)] shadow-xl', tipLeft ? 'right-5' : 'left-5', tipUp ? 'bottom-3' : 'top-3')}
            style={{ transformOrigin: `${tipLeft ? 'right' : 'left'} ${tipUp ? 'bottom' : 'top'}` }}
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
            transition={spring.snappy}
          >
            <span className="line-clamp-3">{a.text}</span>
            <span className="mt-1 block font-mono text-[10px] opacity-60">
              {author} · {when}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────── compare ───────────────────────────

function CompareView({
  version,
  before,
  mediaIndex,
  setMediaIndex,
  setBeforeId,
}: {
  version: DeliveryVersion
  before: DeliveryVersion
  mediaIndex: number
  setMediaIndex: (i: number) => void
  setBeforeId: (id: string) => void
}) {
  const t = useT()
  const { job } = useJobCtx()
  const after = version.media[mediaIndex] ?? version.media[0]
  const prev = before.media[Math.min(mediaIndex, before.media.length - 1)]
  const aspect = useAspect(after)
  const others = job.versions.filter((v) => v.id !== version.id)
  const maxMedia = Math.max(version.media.length, 1)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-3.5" />
          {t('job.compare.before')}
        </span>
        <Segmented
          value={before.id}
          onChange={setBeforeId}
          size="sm"
          pill="surface"
          layoutId="compare-before"
          options={others.map((v) => ({ value: v.id, label: `v${v.version}` }))}
        />
        <ArrowRight className="size-4 text-ink-3" />
        <span className="inline-flex h-8 items-center rounded-full bg-ink px-3 font-mono text-[12.5px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink">v{version.version}</span>
        {maxMedia > 1 && (
          <div className="ml-auto flex items-center gap-1">
            {version.media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMediaIndex(i)}
                className={cn('h-8 min-w-8 rounded-full px-2 font-mono text-[12px] transition-colors', i === mediaIndex ? 'bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)]')}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      {prev && after ? (
        <CompareSlider
          key={`${before.id}-${version.id}-${mediaIndex}`}
          before={prev}
          after={after}
          aspect={aspect}
          labelBefore={`v${before.version} · ${t('job.compare.before')}`}
          labelAfter={`v${version.version} · ${t('job.compare.after')}`}
          ariaLabel={t('job.compare.aria')}
        />
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-[22px] bg-[var(--surface-2)] py-16 text-[13px] text-ink-3">
          <EyeOff className="size-4" />
          {t('job.compare.nothing')}
        </div>
      )}
      <p className="text-center font-mono text-[11px] text-ink-3">{t('job.compare.hint')}</p>
    </div>
  )
}
