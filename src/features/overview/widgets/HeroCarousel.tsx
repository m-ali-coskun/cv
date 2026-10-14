import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { Briefcase, PenLine, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { shortDate, dueLabel, daysUntil } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import type { Job } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { STATUS_COLOR } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { usePrefs } from '../prefs'
import { usePeople, type PersonLite } from '../hooks'
import { ArrowButton, Card, MonoId } from '../ui'

const AUTOPLAY_MS = 6500

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0, scale: 0.96, filter: 'blur(10px)' }),
  center: { x: '0%', opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE_OUT } },
  exit: (dir: number) => ({ x: dir > 0 ? '-35%' : '35%', opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.45, ease: EASE_OUT } }),
}

/** White-glass status capsule that stays readable on any cover. */
export function CoverStatus({ status, label }: { status: Job['status']; label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white/85 px-3 text-[12.5px] font-medium text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,0_8px_20px_-10px_rgba(0,0,0,.45)] backdrop-blur-md">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: STATUS_COLOR[status] }} />
        <span className="relative inline-flex size-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      </span>
      {label}
    </span>
  )
}

export function CoverChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/85 px-3 text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,0_8px_20px_-10px_rgba(0,0,0,.45)] backdrop-blur-md">
      {children}
    </span>
  )
}

export function coverOf(job: Job) {
  const v = job.versions[job.versions.length - 1]
  return v?.media[0] ?? job.cover
}

/**
 * Featured job hero (reference: the "1254 Oak Street" card) — an
 * auto-advancing, swipeable carousel over the most active jobs.
 */
export function HeroCarousel({ jobs, index, onIndex, className }: { jobs: Job[]; index: number; onIndex: (i: number) => void; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const people = usePeople()
  const autoplay = usePrefs((s) => s.autoplay)
  const toggleStar = useApp((s) => s.toggleStar)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const dragged = useRef(false)
  const n = jobs.length
  const i = n ? ((index % n) + n) % n : 0
  const job = jobs[i]

  const go = (to: number) => {
    if (!n) return
    setDir(to > i || (i === n - 1 && to === 0) ? 1 : -1)
    onIndex(((to % n) + n) % n)
  }

  useEffect(() => {
    if (!autoplay || paused || n < 2) return
    const id = window.setTimeout(() => {
      setDir(1)
      onIndex((i + 1) % n)
    }, AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [autoplay, paused, n, i, onIndex])

  if (!job) {
    return (
      <Card pad={false} className={cn('flex h-full min-h-[380px] flex-col overflow-hidden p-2.5', className)}>
        <div className="relative h-40 overflow-hidden rounded-[22px]">
          <GenerativeArt seed="empty-hero" variant="mesh" className="size-full" playBadge={false} />
        </div>
        <EmptyState
          className="flex-1 py-8"
          icon={<Briefcase />}
          title={t('overview.hero.emptyTitle')}
          description={t('overview.hero.emptyBody')}
          action={
            <Button size="sm" icon={<PenLine className="size-4" />} onClick={() => navigate('/brief/new')}>
              {t('overview.hero.writeBrief')}
            </Button>
          }
        />
      </Card>
    )
  }

  const designer = people.get(job.designerId)

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 8) dragged.current = true
    if (info.offset.x < -60 || info.velocity.x < -400) go(i + 1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(i - 1)
    window.setTimeout(() => (dragged.current = false), 50)
  }

  return (
    <Card
      pad={false}
      spotlight
      tilt={3}
      className={cn('group/hero flex h-full min-h-[440px] flex-col overflow-hidden p-2.5', className)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t('overview.hero.label')}
    >
      <div className="relative z-[1] min-h-[400px] flex-1 overflow-hidden rounded-[22px] bg-night">
        {/* slides */}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={job.id}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
            drag={n > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.14 }}
              animate={{ scale: 1.02 }}
              transition={{ duration: 7, ease: EASE_OUT }}
            >
              <MediaView media={coverOf(job)} playBadge={false} className="pointer-events-none" />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.28)_0%,transparent_30%,transparent_55%,rgba(0,0,0,.35)_100%)]" />
          </motion.div>
        </AnimatePresence>

        {/* top chips */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[2] flex items-start justify-between gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={job.id + 'id'}
              initial={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="pointer-events-auto"
            >
              <CoverChip>
                <Briefcase className="size-3.5" />
                <MonoId>{job.id}</MonoId>
              </CoverChip>
            </motion.span>
            <motion.span
              key={job.id + 'st'}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 18, delay: 0.15 } }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CoverStatus status={job.status} label={t(`core.status.${job.status}`)} />
            </motion.span>
          </AnimatePresence>
        </div>

        {/* dots with autoplay progress */}
        {n > 1 && (
          <div className="absolute left-1/2 top-[58px] z-[2] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-md">
            {jobs.map((j, k) => (
              <button
                key={j.id}
                type="button"
                aria-label={t('overview.hero.goTo', { n: k + 1 })}
                aria-current={k === i}
                onClick={() => go(k)}
                className="relative h-1.5 overflow-hidden rounded-full bg-white/40 transition-[width] duration-300 ease-[var(--ease-out)]"
                style={{ width: k === i ? 26 : 6 }}
              >
                {k === i && (
                  <motion.span
                    key={`${j.id}-${paused}-${autoplay}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    initial={{ width: autoplay && !paused ? '0%' : '100%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: autoplay && !paused ? AUTOPLAY_MS / 1000 : 0, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* inner glass card */}
        <div className="absolute inset-x-2.5 bottom-2.5 z-[2]">
          <motion.div
            layout
            className="glass glass-strong cursor-pointer rounded-[20px] p-3.5 sm:p-4"
            onClick={() => !dragged.current && navigate(`/jobs/${job.id}`)}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={job.id}
                className="relative z-[1]"
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
              >
                <HeroBody job={job} designer={designer} lang={lang} t={t} onStar={() => toggleStar(job.id)} onOpen={() => navigate(`/jobs/${job.id}`)} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Card>
  )
}

function HeroBody({
  job,
  designer,
  lang,
  t,
  onStar,
  onOpen,
}: {
  job: Job
  designer?: PersonLite
  lang: ReturnType<typeof useLang>
  t: ReturnType<typeof useT>
  onStar: () => void
  onOpen: () => void
}) {
  const overdue = daysUntil(job.dueAt) < 0
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[17px] font-medium leading-snug tracking-[-0.02em] text-ink sm:text-[19px]">{job.title}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
            {designer?.name ?? '—'}
            {designer?.location ? ` · ${designer.location}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <motion.button
            type="button"
            aria-label={t('overview.hero.star')}
            aria-pressed={job.starred}
            title={t('overview.hero.star')}
            onClick={(e) => {
              e.stopPropagation()
              onStar()
            }}
            whileTap={{ scale: 0.8, rotate: -20 }}
            whileHover={{ scale: 1.1 }}
            className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:text-ink"
          >
            <motion.span key={String(job.starred)} initial={{ scale: 0.4, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
              <Star className={cn('size-4', job.starred && 'fill-[var(--warning)] text-[var(--warning)]')} />
            </motion.span>
          </motion.button>
          <ArrowButton label={t('overview.hero.open')} onClick={onOpen} size={36} />
        </div>
      </div>
      <ProgressBar value={job.progress} showLabel className="mt-3" height={7} />
      <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--line)] rounded-[14px] border border-[var(--line-2)]">
        <HeroTile label={t('core.common.designer')} value={designer?.name.split(' ')[0] ?? '—'} />
        <HeroTile label={t('core.common.stage')} value={t(`core.status.${job.status}`)} />
        <HeroTile
          label={t('core.common.due')}
          value={<span className={cn('font-mono', overdue && 'text-danger')}>{shortDate(job.dueAt, lang)}</span>}
          title={dueLabel(job.dueAt, lang)}
        />
      </div>
    </>
  )
}

function HeroTile({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2 sm:px-3" title={title}>
      <span className="block truncate text-[11.5px] text-ink-3">{label}</span>
      <span className="block truncate text-[13.5px] font-medium text-ink">{value}</span>
    </div>
  )
}
