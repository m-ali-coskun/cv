import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { daysUntil, timeAgo } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { jobRisk, useRole } from '@/store/selectors'
import type { Job } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { CLOSED, IN_PROGRESS, ts, DAY } from '../data'
import { useNow } from '../hooks'
import { Card } from '../ui'
import { useFixes } from '../actions'
import { RiskDrawer } from './RiskDrawer'

interface Insight {
  id: string
  color: string
  text: string
  n?: number
}

function useClientInsights(jobs: Job[]) {
  const t = useT()
  return useMemo(() => {
    const live = jobs.filter((j) => !CLOSED.includes(j.status))
    const risky = live.filter((j) => jobRisk(j).level !== 'low')
    const overdue = live.filter((j) => daysUntil(j.dueAt) < 0).length
    const blocked = live.filter((j) => j.blocker).length
    const review = live.filter((j) => j.status === 'in_review').length
    const slipping = live.filter((j) => {
      const d = daysUntil(j.dueAt)
      return d >= 0 && d <= 3 && j.progress < 60 && j.status !== 'requested'
    }).length
    const stale = live.filter((j) => j.status === 'requested' && Date.now() - ts(j.createdAt) > 2 * DAY).length
    const all: Insight[] = [
      { id: 'overdue', color: 'var(--danger)', text: t('overview.ai.c.overdue', { count: overdue }), n: overdue },
      { id: 'blocked', color: '#f97316', text: t('overview.ai.c.blocked', { count: blocked }), n: blocked },
      { id: 'slipping', color: 'var(--warning)', text: t('overview.ai.c.slipping', { count: slipping }), n: slipping },
      { id: 'review', color: 'var(--accent)', text: t('overview.ai.c.review', { count: review }), n: review },
      { id: 'stale', color: 'var(--info)', text: t('overview.ai.c.stale', { count: stale }), n: stale },
    ]
      .filter((x) => (x.n ?? 0) > 0)
      .slice(0, 4)
    const insights: Insight[] = all.length
      ? all
      : [{ id: 'calm', color: 'var(--success)', text: t('overview.ai.c.calm', { count: live.length }) }]
    return { count: risky.length, insights }
  }, [jobs, t])
}

function useDesignerInsights(jobs: Job[]) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  return useMemo(() => {
    const live = jobs.filter((j) => !CLOSED.includes(j.status))
    const working = live.filter((j) => j.status !== 'requested')
    const deadlines = working.filter((j) => {
      const d = daysUntil(j.dueAt)
      return d >= 0 && d <= 7
    }).length
    const requests = live.filter((j) => j.status === 'requested').length
    const revisions = live.filter((j) => j.status === 'revisions').length
    const hours = Math.round(working.filter((j) => IN_PROGRESS.includes(j.status)).reduce((a, j) => a + j.timeTrackedMin, 0) / 60)
    const escrow = jobs.reduce((a, j) => a + j.milestones.filter((m) => m.status === 'escrow').reduce((b, m) => b + m.amount, 0), 0)
    const insights: Insight[] = [
      { id: 'deadlines', color: 'var(--danger)', text: t('overview.ai.d.deadlines', { count: deadlines }), n: deadlines },
      { id: 'requests', color: 'var(--accent)', text: t('overview.ai.d.requests', { count: requests }), n: requests },
      { id: 'revisions', color: '#f97316', text: t('overview.ai.d.revisions', { count: revisions }), n: revisions },
      { id: 'hours', color: 'var(--info)', text: t('overview.ai.d.hours', { n: hours }), n: hours },
      { id: 'escrow', color: 'var(--success)', text: t('overview.ai.d.escrow', { v: formatMoney(escrow, currency, lang, true) }), n: escrow },
    ]
      .filter((x) => (x.n ?? 0) > 0)
      .slice(0, 4)
    return { count: deadlines + requests + revisions, insights }
  }, [jobs, t, lang, currency])
}

/** Word-by-word "focus pull" headline. */
function Headline({ text, k }: { text: string; k: string | number }) {
  return (
    <h3 key={k} className="relative z-[1] mt-3 text-[21px] font-medium leading-tight tracking-[-0.02em] text-on-night sm:text-[23px]" aria-label={text}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={`${k}-${i}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: EASE_OUT }}
        >
          {w}{' '}
        </motion.span>
      ))}
    </h3>
  )
}

/**
 * The reference's black "Permit AI" card — insights are computed from the
 * live jobs, "Review risks" opens a drawer with real one-click fixes.
 * Designers get a "Your week" variant with a "Plan my day" scheduler.
 */
export function AiCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const fixes = useFixes()
  const [analyzedAt, setAnalyzedAt] = useState(() => Date.now())
  const [thinking, setThinking] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [planning, setPlanning] = useState(false)
  useNow(30_000)
  const client = useClientInsights(jobs)
  const designer = useDesignerInsights(jobs)
  const data = role === 'client' ? client : designer

  const reanalyze = () => {
    if (thinking) return
    setThinking(true)
    window.setTimeout(() => {
      setAnalyzedAt(Date.now())
      setThinking(false)
    }, 1100)
  }

  const headline =
    role === 'client'
      ? data.count
        ? t('overview.ai.c.title', { count: data.count })
        : t('overview.ai.c.titleCalm')
      : data.count
        ? t('overview.ai.d.title', { count: data.count })
        : t('overview.ai.d.titleCalm')

  const plan = () => {
    setPlanning(true)
    window.setTimeout(() => {
      fixes.planDay(jobs)
      setPlanning(false)
    }, 650)
  }

  return (
    <>
      <Card variant="night" className={cn('flex flex-col overflow-hidden text-on-night', className)} spotlight>
        {/* drifting aurora */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--accent), transparent 65%)' }}
          animate={{ x: [0, -30, 10, 0], y: [0, 20, -10, 0], scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-[1] flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <motion.span
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-accent"
              animate={thinking ? { rotate: 360 } : { rotate: 0 }}
              transition={thinking ? { duration: 1.1, ease: 'linear', repeat: Infinity } : { duration: 0.3 }}
            >
              <Sparkles className="size-4" />
            </motion.span>
            <span className="text-[15px] font-medium">{role === 'client' ? t('core.ai.name') : t('overview.ai.d.name')}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="font-mono text-[11.5px] text-white/50">{thinking ? t('overview.ai.thinking') : timeAgo(new Date(analyzedAt), lang)}</span>
            <motion.button
              type="button"
              aria-label={t('overview.ai.reanalyze')}
              title={t('overview.ai.reanalyze')}
              onClick={reanalyze}
              whileTap={{ scale: 0.85 }}
              className="flex size-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className={cn('size-3.5', thinking && 'animate-spin')} />
            </motion.button>
          </span>
        </div>

        <AnimatePresence mode="wait">
          {thinking ? (
            <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] mt-4 space-y-2.5" aria-busy>
              {[78, 92, 64, 70].map((w, i) => (
                <div key={i} className="h-3.5 overflow-hidden rounded-full bg-white/10" style={{ width: `${w}%` }}>
                  <div className="h-full w-full animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.25)_50%,transparent_70%)] bg-[length:200%_100%]" />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key={`r-${analyzedAt}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(4px)' }}>
              <Headline text={headline} k={`${analyzedAt}-${headline}`} />
              <ul className="relative z-[1] mt-3 space-y-1.5">
                {data.insights.map((ins, i) => (
                  <motion.li
                    key={ins.id}
                    className="flex items-start gap-2.5 text-[13.5px] text-white/80"
                    initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.35 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
                  >
                    <motion.span
                      className="mt-[7px] size-2 shrink-0 rounded-full"
                      style={{ background: ins.color, boxShadow: `0 0 10px ${ins.color}` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 500, damping: 14 }}
                    />
                    <span>{ins.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-[1] mt-auto flex flex-wrap items-center gap-2 pt-5">
          {role === 'client' ? (
            <Button variant="accent" size="md" icon={<ShieldAlert className="relative z-[1] size-4" />} onClick={() => setDrawer(true)}>
              <span className="relative z-[1]">{t('overview.ai.reviewRisks')}</span>
            </Button>
          ) : (
            <>
              <Button variant="accent" size="md" loading={planning} icon={<CalendarPlus className="relative z-[1] size-4" />} onClick={plan}>
                <span className="relative z-[1]">{t('overview.ai.planDay')}</span>
              </Button>
              <Button size="md" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setDrawer(true)}>
                {t('overview.ai.reviewRisks')}
              </Button>
            </>
          )}
        </div>
      </Card>
      <RiskDrawer open={drawer} onClose={() => setDrawer(false)} jobs={jobs} />
    </>
  )
}
