import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownUp,
  CalendarClock,
  Check,
  Hourglass,
  Inbox,
  Info,
  MailOpen,
  Plus,
  Send,
  Sparkles,
  Timer,
  Wallet,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyJobs, useRole } from '@/store/selectors'
import type { Job } from '@/store/types'
import { toast } from '@/store/toasts'
import { EASE_OUT, item, spring, stagger } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { EmptyState } from '@/components/ui/EmptyState'
import { Gauge } from '@/components/ui/Gauge'
import { Tooltip } from '@/components/ui/Tooltip'
import { JobFlowsProvider } from './shared/flows'
import { RequestCard, RequestHistoryRow, type RequestOutcome } from './shared/RequestCard'
import { AwaitingBriefCard, CounterReviewCard, DeclinedBriefRow } from './shared/ClientRequestCards'
import { Popover, PopMenu } from './shared/Popover'
import { declineReason, respondedAt } from './shared/model'

/** /requests — designer: incoming briefs inbox · client: briefs awaiting a designer's answer. */
export default function RequestsPage() {
  const role = useRole()
  return <JobFlowsProvider>{role === 'designer' ? <DesignerInbox /> : <ClientOutbox />}</JobFlowsProvider>
}

// ─────────────────────────── designer ───────────────────────────

type Tab = 'pending' | 'counter' | 'declined'
type Sort = 'newest' | 'deadline' | 'budget'

const exitVariants = {
  accepted: { opacity: 0, x: 120, rotate: 3, scale: 0.92, filter: 'blur(10px)', transition: { duration: 0.45, ease: EASE_OUT } },
  declined: { opacity: 0, x: -120, rotate: -3, scale: 0.92, filter: 'blur(10px)', transition: { duration: 0.4, ease: EASE_OUT } },
  countered: { opacity: 0, y: -60, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.4, ease: EASE_OUT } },
}

function DesignerInbox() {
  const t = useT()
  const navigate = useNavigate()
  const jobs = useMyJobs({ includeClosed: true })
  const allMine = useMyJobs({ includeClosed: true, ignoreDiscipline: true })
  const discipline = useApp((s) => s.settings.discipline)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const spawn = useApp((s) => s.spawnIncomingRequest)
  const [tab, setTab] = useState<Tab>('pending')
  const [sort, setSort] = useState<Sort>('newest')
  const [fresh, setFresh] = useState<Set<string>>(() => new Set())
  const outcome = useRef<RequestOutcome>('accepted')
  const simBtn = useRef<HTMLButtonElement>(null)
  const listTop = useRef<HTMLDivElement>(null)

  const sortFn = useMemo(() => {
    if (sort === 'deadline') return (a: Job, b: Job) => a.dueAt.localeCompare(b.dueAt)
    if (sort === 'budget') return (a: Job, b: Job) => b.budget - a.budget
    return (a: Job, b: Job) => b.createdAt.localeCompare(a.createdAt)
  }, [sort])

  const pending = useMemo(() => jobs.filter((j) => j.status === 'requested' && j.counterOffer?.status !== 'pending').sort(sortFn), [jobs, sortFn])
  const counters = useMemo(() => jobs.filter((j) => j.status === 'requested' && j.counterOffer?.status === 'pending').sort(sortFn), [jobs, sortFn])
  const resolvedCounters = useMemo(
    () => jobs.filter((j) => j.counterOffer && j.counterOffer.status !== 'pending').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [jobs],
  )
  const declined = useMemo(() => jobs.filter((j) => j.status === 'declined').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [jobs])

  // brand-new requests (simulation or button) get a glow + "New" badge for a few seconds
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = new Set(allMine.filter((j) => j.status === 'requested').map((j) => j.id))
    if (seen.current) {
      const added = [...ids].filter((id) => !seen.current!.has(id))
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]))
        setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !added.includes(x)))), 6000)
      }
    }
    seen.current = ids
  }, [allMine])

  const stats = useMemo(() => {
    const potential = pending.reduce((n, j) => n + j.budget, 0)
    const responded = allMine.filter((j) => j.status !== 'requested' || j.counterOffer)
    const declinedN = allMine.filter((j) => j.status === 'declined').length
    const answered = responded.length
    const rate = answered ? Math.round(((answered - declinedN) / answered) * 100) : 100
    const times = allMine
      .map((j) => {
        const r = respondedAt(j)
        return r ? (new Date(r).getTime() - new Date(j.createdAt).getTime()) / 36e5 : null
      })
      .filter((x): x is number => x !== null && x >= 0)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    return { potential, rate, avg, currency: pending[0]?.currency ?? allMine[0]?.currency ?? 'EUR', answered }
  }, [pending, allMine])

  const simulate = () => {
    const job = spawn()
    if (!job) return
    fireConfetti({ from: simBtn.current, particleCount: 50, spread: 55, startVelocity: 28 })
    setTab('pending')
    setSort('newest')
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const hidden = discipline !== 'all' && discipline !== job.discipline
    toast({
      title: t('jobs.requests.spawned'),
      description: hidden ? t('jobs.requests.spawnedHidden', { title: job.title, discipline: t(`core.discipline.${job.discipline}`) }) : job.title,
      tone: 'info',
      action: hidden ? { label: t('jobs.requests.showAll'), onClick: () => setDiscipline('all') } : undefined,
    })
  }

  const list = tab === 'pending' ? pending : tab === 'counter' ? counters : declined

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* KPIs */}
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="no-scrollbar -mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2.5 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.2fr]">
        <motion.div variants={item} className="glass-night relative flex w-[62vw] max-w-[280px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[28px] p-4 sm:w-auto sm:max-w-none sm:p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-accent opacity-25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <span className="text-[13px] text-white/70">{t('jobs.requests.kpiNew')}</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-accent">
              <Inbox className="size-4" />
            </span>
          </div>
          <div className="relative mt-4">
            <div className="text-[36px] font-medium leading-none tracking-[-0.03em] sm:text-[44px]">
              <AnimatedCounter value={pending.length} />
            </div>
            <p className="mt-2 text-[12.5px] text-white/60">{t('jobs.requests.kpiNewSub', { count: counters.length })}</p>
          </div>
        </motion.div>
        <KpiTile icon={<Wallet />} label={t('jobs.requests.kpiPotential')} value={<AnimatedCounter value={stats.potential} currency={stats.currency} />} sub={t('jobs.requests.kpiPotentialSub')} />
        <KpiTile
          icon={<Timer />}
          label={t('jobs.requests.kpiResponse')}
          value={<AnimatedCounter value={stats.avg} decimals={1} suffix="h" />}
          sub={t('jobs.requests.kpiResponseSub')}
        />
        <motion.div variants={item} className="glass-accent flex w-[78vw] max-w-[340px] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-[28px] px-4 py-3 sm:w-auto sm:max-w-none sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-accent-ink/75">{t('jobs.requests.kpiRate')}</p>
            <p className="mt-1 text-[12px] text-accent-ink/65">{t('jobs.requests.kpiRateSub', { count: stats.answered })}</p>
          </div>
          <Gauge value={stats.rate} size={140} ticks={30} tone="ink" ariaLabel={t('jobs.requests.kpiRate')} />
        </motion.div>
      </motion.div>

      {/* toolbar */}
      <div ref={listTop} className="card relative z-[2] flex scroll-mt-24 flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <div className="no-scrollbar overflow-x-auto">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            layoutId="req-tabs"
            options={[
              { value: 'pending', label: t('jobs.requests.tabPending'), icon: <MailOpen className="size-4" />, count: pending.length },
              { value: 'counter', label: t('jobs.requests.tabCounter'), icon: <CalendarClock className="size-4" />, count: counters.length },
              { value: 'declined', label: t('jobs.requests.tabDeclined'), icon: <XCircle className="size-4" />, count: declined.length },
            ]}
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Popover
            width={220}
            trigger={(p) => (
              <button
                ref={p.ref}
                type="button"
                onClick={p.onClick}
                aria-label={t(`jobs.requests.sort.${sort}`)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink active:scale-95"
              >
                <ArrowDownUp className="size-4" />
                <span className="hidden whitespace-nowrap sm:inline">{t(`jobs.requests.sort.${sort}`)}</span>
              </button>
            )}
          >
            {(close) => (
              <PopMenu
                close={close}
                items={(['newest', 'deadline', 'budget'] as Sort[]).map((s) => ({
                  key: s,
                  label: t(`jobs.requests.sort.${s}`),
                  active: sort === s,
                  icon: sort === s ? <Check /> : <span className="block size-4" />,
                  onSelect: () => setSort(s),
                }))}
              />
            )}
          </Popover>
          <Tooltip content={t('jobs.requests.simulateTip')} side="bottom">
            <Button ref={simBtn} variant="accent" icon={<Sparkles className="size-4" />} onClick={simulate} className="flex-1 sm:flex-none">
              {t('jobs.requests.simulate')}
            </Button>
          </Tooltip>
        </div>
      </div>

      <p className="-mt-1 flex items-center gap-1.5 px-2 text-[12px] text-ink-3">
        <Info className="size-3.5" />
        {t(`jobs.requests.tabHint.${tab}`)}
      </p>

      {/* list */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: -8, filter: 'blur(6px)', transition: { duration: 0.15 } }}
          className="flex flex-col gap-4"
        >
          {tab !== 'declined' && (
            <AnimatePresence initial={false} custom={outcome.current} mode="popLayout">
              {list.map((j, i) => (
                <motion.div
                  key={j.id}
                  layout
                  custom={outcome.current}
                  variants={{ exit: (o: RequestOutcome) => exitVariants[o] }}
                  initial={fresh.has(j.id) ? { opacity: 0, y: -50, scale: 0.86, filter: 'blur(14px)', rotateX: 18 } : { opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotateX: 0,
                    filter: 'blur(0px)',
                    transition: fresh.has(j.id) ? { type: 'spring', stiffness: 220, damping: 18 } : { duration: 0.55, ease: EASE_OUT, delay: Math.min(i, 5) * 0.06 },
                  }}
                  exit="exit"
                  transition={spring.smooth}
                  style={{ transformPerspective: 1200 }}
                >
                  <RequestCard job={j} isNew={fresh.has(j.id)} onOutcome={(o) => (outcome.current = o)} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {tab === 'counter' && resolvedCounters.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="px-2 pt-2 text-[13px] font-medium text-ink-3">{t('jobs.requests.resolved')}</h3>
              {resolvedCounters.map((j) => (
                <RequestHistoryRow key={j.id} job={j} outcome={j.counterOffer!.status === 'accepted' ? 'counterAccepted' : 'counterRejected'} reason={j.counterOffer!.note || undefined} />
              ))}
            </section>
          )}

          {tab === 'declined' &&
            declined.map((j, i) => (
              <motion.div key={j.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}>
                <RequestHistoryRow job={j} outcome="declined" reason={declineReason(j)} />
              </motion.div>
            ))}

          {list.length === 0 && !(tab === 'counter' && resolvedCounters.length) && (
            <div className="card">
              <EmptyState
                icon={tab === 'pending' ? <Inbox /> : tab === 'counter' ? <Hourglass /> : <XCircle />}
                title={t(`jobs.requests.empty.${tab}`)}
                description={t(`jobs.requests.empty.${tab}Body`)}
                action={
                  tab === 'pending' ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button icon={<Sparkles className="size-4" />} onClick={simulate}>
                        {t('jobs.requests.simulate')}
                      </Button>
                      <Button variant="glass" onClick={() => navigate('/jobs')}>
                        {t('jobs.requests.toBoard')}
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function KpiTile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub: string }) {
  return (
    <motion.div variants={item} whileHover={{ y: -3 }} className="card flex min-h-[112px] w-[46vw] max-w-[230px] shrink-0 snap-start flex-col justify-between p-4 sm:w-auto sm:max-w-none sm:min-h-[132px] sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-3">
        <div className="text-[26px] font-medium leading-none tracking-[-0.03em] sm:text-[30px]">{value}</div>
        <p className="mt-1.5 truncate text-[12px] text-ink-3">{sub}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────── client ───────────────────────────

function ClientOutbox() {
  const t = useT()
  const navigate = useNavigate()
  const jobs = useMyJobs({ includeClosed: true })
  const designers = useApp((s) => s.designers)

  const counters = useMemo(() => jobs.filter((j) => j.status === 'requested' && j.counterOffer?.status === 'pending'), [jobs])
  const waiting = useMemo(
    () => jobs.filter((j) => j.status === 'requested' && j.counterOffer?.status !== 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [jobs],
  )
  const declined = useMemo(() => jobs.filter((j) => j.status === 'declined').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [jobs])
  const stats = useMemo(() => {
    const open = [...waiting, ...counters]
    const resp = open.map((j) => designers.find((d) => d.id === j.designerId)?.responseTimeHrs ?? 0).filter(Boolean)
    return {
      budget: open.reduce((n, j) => n + j.budget, 0),
      currency: open[0]?.currency ?? 'EUR',
      avg: resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : 0,
    }
  }, [waiting, counters, designers])

  const empty = !counters.length && !waiting.length && !declined.length

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="no-scrollbar -mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2.5 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item} className="glass-night relative w-[62vw] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-[28px] p-4 sm:w-auto sm:max-w-none sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent opacity-25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <span className="text-[13px] text-white/70">{t('jobs.creq.kpiWaiting')}</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-accent">
              <Send className="size-4" />
            </span>
          </div>
          <div className="relative mt-4 text-[36px] font-medium leading-none tracking-[-0.03em] sm:text-[44px]">
            <AnimatedCounter value={waiting.length} />
          </div>
          <p className="relative mt-2 text-[12.5px] text-white/60">{t('jobs.creq.kpiWaitingSub')}</p>
        </motion.div>
        <KpiTile icon={<CalendarClock />} label={t('jobs.creq.kpiCounters')} value={<AnimatedCounter value={counters.length} />} sub={t('jobs.creq.kpiCountersSub')} />
        <KpiTile icon={<Timer />} label={t('jobs.creq.kpiResponse')} value={<AnimatedCounter value={stats.avg} decimals={1} suffix="h" />} sub={t('jobs.creq.kpiResponseSub')} />
        <motion.div variants={item} className="glass-accent flex w-[62vw] max-w-[280px] shrink-0 snap-start flex-col justify-between rounded-[28px] p-4 sm:w-auto sm:max-w-none sm:p-5">
          <div>
            <p className="text-[13px] text-accent-ink/75">{t('jobs.creq.kpiBudget')}</p>
            <div className="mt-2 text-[30px] font-medium leading-none tracking-[-0.03em]">
              <AnimatedCounter value={stats.budget} currency={stats.currency} />
            </div>
          </div>
          <Button size="sm" className="mt-3 self-start" icon={<Plus className="size-4" />} onClick={() => navigate('/brief/new')}>
            {t('jobs.newBrief')}
          </Button>
        </motion.div>
      </motion.div>

      {empty && (
        <div className="card">
          <EmptyState
            icon={<Send />}
            title={t('jobs.creq.emptyTitle')}
            description={t('jobs.creq.emptyBody')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon={<Plus className="size-4" />} onClick={() => navigate('/brief/new')}>
                  {t('jobs.newBrief')}
                </Button>
                <Button variant="glass" onClick={() => navigate('/discover')}>
                  {t('jobs.empty.findDesigners')}
                </Button>
              </div>
            }
          />
        </div>
      )}

      {counters.length > 0 && (
        <Section title={t('jobs.creq.counters')} count={counters.length} hint={t('jobs.creq.countersHint')}>
          <AnimatePresence initial={false} mode="popLayout">
            {counters.map((j) => (
              <motion.div key={j.id} layout initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: 80, filter: 'blur(8px)' }} transition={spring.smooth}>
                <CounterReviewCard job={j} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Section>
      )}

      {waiting.length > 0 && (
        <Section title={t('jobs.creq.awaiting')} count={waiting.length} hint={t('jobs.creq.awaitingHint')}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence initial={false} mode="popLayout">
              {waiting.map((j, i) => (
                <motion.div
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: Math.min(i, 6) * 0.06, duration: 0.55, ease: EASE_OUT } }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)', transition: { duration: 0.25 } }}
                  className="flex"
                >
                  <div className="w-full">
                    <AwaitingBriefCard job={j} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {declined.length > 0 && (
        <Section title={t('jobs.creq.declined')} count={declined.length}>
          {declined.slice(0, 6).map((j) => (
            <DeclinedBriefRow key={j.id} job={j} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2 px-2 pt-1">
        <h2 className="text-[19px] font-medium tracking-[-0.02em]">{title}</h2>
        <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--surface)] px-2 font-mono text-[12px] text-ink-2 shadow-[0_1px_2px_rgba(0,0,0,.06)]')}>
          {count}
        </span>
        {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
