import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Briefcase, ChevronDown, Inbox, PackageCheck, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, FILTER_TWEEN } from '@/lib/motion'
import { dueLabel, daysUntil } from '@/lib/dates'
import { formatDuration } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Job, JobStatus } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { STATUS_COLOR } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { Slider } from '@/components/ui/Slider'
import { EmptyState } from '@/components/ui/EmptyState'
import { hms, trackedSeconds } from '../data'
import { useNow, usePeople } from '../hooks'
import { ArrowButton, Card, LiveDot, MonoId } from '../ui'
import { CoverChip, CoverStatus, coverOf } from './HeroCarousel'

/** hh:mm:ss where every digit rolls when it changes. */
function TickClock({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('inline-flex font-mono tabular-nums', className)} aria-label={value} role="timer">
      {value.split('').map((ch, i) =>
        ch === ':' ? (
          <span key={i} aria-hidden className="px-[0.04em] opacity-50">
            :
          </span>
        ) : (
          <span key={i} aria-hidden className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ y: '-70%', opacity: 0, filter: 'blur(3px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '70%', opacity: 0, filter: 'blur(3px)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 30, filter: FILTER_TWEEN }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ),
      )}
    </span>
  )
}

const QUICK_STATUSES: JobStatus[] = ['queued', 'in_progress', 'final_touches']

/**
 * Designer hero: the job to focus on right now — live timer, progress
 * slider, status quick-change and a deliver shortcut.
 */
export function FocusHero({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const people = usePeople()
  const startTimer = useApp((s) => s.startTimer)
  const stopTimer = useApp((s) => s.stopTimer)
  const setJobProgress = useApp((s) => s.setJobProgress)
  const setJobStatus = useApp((s) => s.setJobStatus)
  // select by id: starting a timer re-sorts the queue, the selection must not jump
  const [selId, setSelId] = useState<string | null>(null)
  const n = jobs.length
  const found = jobs.findIndex((j) => j.id === selId)
  const i = found >= 0 ? found : 0
  const job = jobs[i]
  const running = !!job?.timerStartedAt
  const now = useNow(1000, running)

  // local slider value; committed to the store after a short pause
  const [progress, setProgress] = useState(job?.progress ?? 0)
  const commit = useRef<number | undefined>(undefined)
  useEffect(() => setProgress(job?.progress ?? 0), [job?.id, job?.progress])
  useEffect(() => () => window.clearTimeout(commit.current), [])

  if (!job) {
    return (
      <Card pad={false} className={cn('flex h-full min-h-[380px] flex-col overflow-hidden p-2.5', className)}>
        <div className="relative h-40 overflow-hidden rounded-[22px]">
          <GenerativeArt seed="empty-focus" variant="mesh" className="size-full" playBadge={false} />
        </div>
        <EmptyState
          className="flex-1 py-8"
          icon={<Inbox />}
          title={t('overview.focus.emptyTitle')}
          description={t('overview.focus.emptyBody')}
          action={
            <Button size="sm" onClick={() => navigate('/requests')}>
              {t('overview.focus.reviewRequests')}
            </Button>
          }
        />
      </Card>
    )
  }

  const client = people.get(job.clientId)
  const seconds = trackedSeconds(job, now)
  const overdue = daysUntil(job.dueAt) < 0

  const onProgress = (v: number) => {
    setProgress(v)
    window.clearTimeout(commit.current)
    commit.current = window.setTimeout(() => setJobProgress(job.id, v), 280)
  }

  const toggleTimer = () => {
    if (running) {
      stopTimer(job.id)
      toast({ title: t('overview.focus.stopped'), description: `${job.id} · ${formatDuration(seconds / 60)}`, tone: 'info' })
    } else {
      startTimer(job.id)
      toast({ title: t('overview.focus.started'), description: job.title, tone: 'success' })
    }
  }

  const changeStatus = (s: JobStatus) => {
    setJobStatus(job.id, s)
    toast({ title: t('overview.focus.statusChanged', { status: t(`core.status.${s}`) }), description: job.title, tone: 'success' })
  }

  return (
    <Card pad={false} spotlight tilt={2} className={cn('flex h-full min-h-[460px] flex-col overflow-hidden p-2.5', className)}>
      <div className="relative z-[1] min-h-[440px] flex-1 overflow-hidden rounded-[22px] bg-night">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={job.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.12, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1.02, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <MediaView media={coverOf(job)} playBadge={false} className="pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.3)_0%,transparent_30%,transparent_45%,rgba(0,0,0,.4)_100%)]" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-x-3 top-3 z-[2] flex items-start justify-between gap-2">
          <CoverChip>
            <Briefcase className="size-3.5" />
            <MonoId>{job.id}</MonoId>
          </CoverChip>
          <CoverStatus status={job.status} label={t(`core.status.${job.status}`)} />
        </div>

        <div className="absolute inset-x-2.5 bottom-2.5 z-[2]">
          <motion.div layout className="glass glass-strong rounded-[20px] p-3.5 sm:p-4" transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={job.id}
                className="relative z-[1]"
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-accent-text">{t('overview.focus.label')}</p>
                  {n > 1 && (
                    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--surface-2)] p-0.5" role="tablist" aria-label={t('overview.focus.queue')}>
                      {jobs.map((j, k) => (
                        <button
                          key={j.id}
                          type="button"
                          role="tab"
                          aria-selected={k === i}
                          title={`${j.id} · ${j.title}`}
                          onClick={() => setSelId(j.id)}
                          className={cn('relative whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium transition-colors', k === i ? 'text-[var(--surface)]' : 'text-ink-3 hover:text-ink')}
                        >
                          {k === i && <motion.span layoutId="focus-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
                          <span className="relative flex items-center gap-1">
                            {j.timerStartedAt && <span className="size-1.5 rounded-full bg-[var(--success)]" />}
                            {j.id.replace('DT-', '')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[17px] font-medium leading-snug tracking-[-0.02em] text-ink sm:text-[18px]" title={job.title}>
                      {job.title}
                    </h3>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                      {client?.name}
                      {' · '}
                      <span className={cn('font-mono', overdue && 'text-danger')}>{dueLabel(job.dueAt, lang)}</span>
                    </p>
                  </div>
                  <ArrowButton label={t('overview.hero.open')} onClick={() => navigate(`/jobs/${job.id}`)} size={36} />
                </div>

                {/* timer */}
                <div className="mt-2.5 flex items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-2)] p-1.5 pl-3.5">
                  <div className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      {running ? <LiveDot /> : <span className="size-2 rounded-full bg-[var(--ink-4)]" />}
                      {running ? t('overview.focus.tracking') : t('overview.focus.tracked')}
                    </span>
                    <TickClock value={hms(seconds)} className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-ink" />
                  </div>
                  <motion.button
                    type="button"
                    onClick={toggleTimer}
                    aria-label={running ? t('overview.focus.pause') : t('overview.focus.start')}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className={cn(
                      'relative flex size-12 shrink-0 items-center justify-center rounded-full',
                      running ? 'bg-ink text-[var(--surface)]' : 'bg-accent text-accent-ink shadow-[0_10px_24px_-10px_var(--accent)]',
                    )}
                  >
                    {running && <span className="absolute inset-0 animate-[pulse-ring_2s_var(--ease-out)_infinite] rounded-full ring-2 ring-[var(--accent)]" />}
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={String(running)} initial={{ scale: 0.4, rotate: -90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}>
                        {running ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>

                <Slider
                  className="mt-2.5"
                  label={t('core.common.progress')}
                  value={progress}
                  onChange={onProgress}
                  step={5}
                  format={(v) => `${v}%`}
                  ariaLabel={t('core.common.progress')}
                />

                <div className="mt-3 flex items-center gap-2">
                  <Menu
                    align="start"
                    width={210}
                    className="bottom-[calc(100%+8px)] top-auto origin-bottom-left"
                    trigger={({ onClick, open }) => (
                      <Button size="sm" variant="outline" onClick={onClick} aria-expanded={open} className="min-w-0 flex-1 justify-between" iconRight={<ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />}>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[job.status] }} />
                          <span className="truncate">{t(`core.status.${job.status}`)}</span>
                        </span>
                      </Button>
                    )}
                    items={[...new Set<JobStatus>([...QUICK_STATUSES, ...(job.status === 'revisions' ? (['revisions'] as JobStatus[]) : [])])].map((s) => ({
                      label: t(`core.status.${s}`),
                      icon: <span className="block size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />,
                      active: s === job.status,
                      onClick: () => changeStatus(s),
                    }))}
                  />
                  <Button size="sm" icon={<PackageCheck className="size-4" />} onClick={() => navigate(`/jobs/${job.id}`)} className="shrink-0">
                    {t('overview.focus.deliver')}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Card>
  )
}
