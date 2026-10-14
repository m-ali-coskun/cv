import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { stagger } from '@/lib/motion'
import { formatMoney, formatNumber } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { BOARD_STATUSES, type Designer, type Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Segmented } from '@/components/ui/Segmented'
import { PipelineBar } from '@/components/charts/PipelineBar'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { CLOSED, avgTurnaround, clientPulse, designerPulse, type PulseRange } from '../data'
import { usePrefs } from '../prefs'
import { Card, KpiTile, LinkButton } from '../ui'

function RangeSwitch() {
  const t = useT()
  const range = usePrefs((s) => s.range)
  const set = usePrefs((s) => s.set)
  return (
    <Segmented<PulseRange>
      size="sm"
      value={range}
      onChange={(v) => set({ range: v })}
      layoutId="overview-range"
      options={[
        { value: 'today', label: t('overview.range.today') },
        { value: '7d', label: t('overview.range.7d') },
        { value: '30d', label: t('overview.range.30d') },
      ]}
    />
  )
}

/** "Project pipeline" row: job counts per stage, each segment filters /jobs. */
function JobPipeline({ jobs }: { jobs: Job[] }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const segments = useMemo(
    () => BOARD_STATUSES.map((s) => ({ id: s, label: t(`core.status.${s}`), count: jobs.filter((j) => j.status === s).length })),
    [jobs, t],
  )
  const turnaround = useMemo(() => avgTurnaround(jobs), [jobs])
  return (
    <div className="tile relative z-[1] mt-3 overflow-x-auto p-3.5 [scrollbar-width:none] sm:p-4 [&::-webkit-scrollbar]:hidden">
      <PipelineBar
        className="min-w-[460px]"
        segments={segments}
        highlightId="in_progress"
        onSegmentClick={(id) => navigate(`/jobs?status=${id}`)}
        title={t('overview.pulse.pipeline')}
        ariaLabel={t('overview.pulse.pipeline')}
        meta={
          <span className="hidden sm:inline">
            {t('overview.pulse.turnaround', { n: formatNumber(turnaround || 0, lang, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) })}
          </span>
        }
        action={<LinkButton onClick={() => navigate('/jobs')}>{t('core.action.open')}</LinkButton>}
        height={28}
      />
    </div>
  )
}

const rangeKey = (r: PulseRange) => `overview.range.in.${r}`

export function ClientPulseCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const range = usePrefs((s) => s.range)
  const p = useMemo(() => clientPulse(jobs, range), [jobs, range])
  const currency = useApp((s) => s.settings.currency)
  const money = useMemo(() => pulseMoney(jobs), [jobs])
  const scrollToAttention = () => document.getElementById('attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.pulse.title')}
        subtitle={t('overview.pulse.clientSub', { n: p.active, d: p.designers })}
        action={<RangeSwitch />}
        className="flex-wrap"
      />
      <motion.div variants={stagger(0.06, 0.12)} initial="hidden" animate="show" className="relative z-[1] mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiTile
          tone="night"
          label={t('overview.kpi.active')}
          value={p.active}
          sub={p.newIn ? t('overview.kpi.newIn', { n: p.newIn, range: t(rangeKey(range)) }) : t('overview.kpi.designers', { n: p.designers })}
          trend={p.newIn ? 'up' : undefined}
          spark={p.spark.active}
          onClick={() => navigate('/jobs')}
        />
        <KpiTile
          label={t('overview.kpi.review')}
          value={p.review}
          sub={
            p.awaiting
              ? t('overview.kpi.queueDays', { n: formatNumber(p.queueDays, lang, { maximumFractionDigits: 1 }) })
              : t('overview.kpi.nothingWaiting')
          }
          spark={p.spark.review}
          onClick={() => navigate('/jobs?status=in_review')}
        />
        <KpiTile
          label={t('overview.kpi.progress')}
          value={p.progress}
          sub={t('overview.kpi.avgDone', { n: p.avgProgress })}
          trend="up"
          spark={p.spark.progress}
          onClick={() => navigate('/jobs?status=in_progress')}
        />
        <KpiTile
          label={t('overview.kpi.risk')}
          value={p.atRisk}
          sub={p.high ? t('overview.kpi.highToday', { n: p.high }) : t('overview.kpi.calm')}
          spark={p.spark.risk}
          onClick={scrollToAttention}
          className={p.high ? 'ring-1 ring-[color-mix(in_oklab,var(--danger)_35%,transparent)]' : undefined}
        />
      </motion.div>
      <JobPipeline jobs={jobs.filter((j) => j.status !== 'declined' && j.status !== 'cancelled')} />
      <PulseFooter
        items={[
          { label: t('overview.pulse.inFlight'), value: <AnimatedCounter value={money.inFlight} currency={currency} /> },
          { label: t('overview.pulse.escrow'), value: <AnimatedCounter value={money.escrow} currency={currency} /> },
          { label: t('overview.pulse.deliverables'), value: <><AnimatedCounter value={money.done} /><span className="text-ink-3">/{money.total}</span></> },
        ]}
      />
    </Card>
  )
}

export function DesignerPulseCard({ jobs, me, className }: { jobs: Job[]; me?: Designer; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const currency = useApp((s) => s.settings.currency)
  const range = usePrefs((s) => s.range)
  const p = useMemo(() => designerPulse(jobs, range), [jobs, range])
  const clients = useMemo(() => new Set(jobs.filter((j) => !['approved', 'declined', 'cancelled'].includes(j.status)).map((j) => j.clientId)).size, [jobs])
  const money = useMemo(() => pulseMoney(jobs), [jobs])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.pulse.studio')}
        subtitle={t('overview.pulse.designerSub', { n: p.active, c: clients })}
        action={<RangeSwitch />}
        className="flex-wrap"
      />
      <motion.div variants={stagger(0.06, 0.12)} initial="hidden" animate="show" className="relative z-[1] mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiTile
          tone="night"
          label={t('overview.kpi.earnedMonth')}
          value={p.earnedMonth}
          currency={currency}
          sub={
            p.earnedRange
              ? t('overview.kpi.earnedRange', { v: formatMoney(p.earnedRange, currency, lang), range: t(rangeKey(range)) })
              : t('overview.kpi.inEscrow', { v: formatMoney(p.escrow, currency, lang, true) })
          }
          trend={p.earnedRange ? 'up' : undefined}
          spark={p.spark.earn}
          onClick={() => navigate('/payments')}
        />
        <KpiTile
          label={t('overview.kpi.activeJobs')}
          value={p.active}
          sub={t('overview.kpi.dueIn', { n: p.dueSoon, range: t(rangeKey(range)) })}
          spark={p.spark.active}
          onClick={() => navigate('/jobs')}
        />
        <KpiTile
          label={t('overview.kpi.requests')}
          value={p.requests}
          sub={p.newRequests ? t('overview.kpi.newIn', { n: p.newRequests, range: t(rangeKey(range)) }) : t('overview.kpi.noNew')}
          trend={p.newRequests ? 'up' : undefined}
          spark={p.spark.requests}
          onClick={() => navigate('/requests')}
          className={p.requests ? 'ring-1 ring-[var(--accent-line)]' : undefined}
        />
        <KpiTile
          label={t('overview.kpi.rating')}
          value={me?.rating ?? 0}
          decimals={1}
          icon={<Star className="size-3.5 shrink-0 fill-[var(--warning)] text-[var(--warning)]" />}
          sub={t('overview.kpi.fromReviews', { n: me?.reviewsCount ?? 0 })}
          onClick={() => navigate('/profile')}
        />
      </motion.div>
      <JobPipeline jobs={jobs.filter((j) => j.status !== 'declined' && j.status !== 'cancelled')} />
      <PulseFooter
        items={[
          { label: t('overview.pulse.booked'), value: <AnimatedCounter value={money.inFlight} currency={currency} /> },
          { label: t('overview.pulse.escrow'), value: <AnimatedCounter value={money.escrow} currency={currency} /> },
          { label: t('overview.pulse.tracked'), value: <AnimatedCounter value={money.hours} suffix="h" /> },
        ]}
      />
    </Card>
  )
}

/** Money/progress currently in the pipeline (live, non-requested jobs). */
function pulseMoney(jobs: Job[]) {
  const live = jobs.filter((j) => !CLOSED.includes(j.status) && j.status !== 'requested')
  return {
    inFlight: live.reduce((a, j) => a + j.budget, 0),
    escrow: jobs.reduce((a, j) => a + j.milestones.filter((m) => m.status === 'escrow').reduce((b, m) => b + m.amount, 0), 0),
    done: live.reduce((a, j) => a + j.deliverables.filter((d) => d.done).length, 0),
    total: live.reduce((a, j) => a + j.deliverables.length, 0),
    hours: Math.round(live.reduce((a, j) => a + j.timeTrackedMin, 0) / 60),
  }
}

function PulseFooter({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="relative z-[1] mt-auto grid grid-cols-3 gap-2 pt-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 rounded-[14px] border border-[var(--line)] px-3 py-2.5">
          <p className="truncate text-[11.5px] text-ink-3">{it.label}</p>
          <p className="mt-0.5 truncate text-[16px] font-medium tracking-[-0.02em] text-ink sm:text-[18px]">{it.value}</p>
        </div>
      ))}
    </div>
  )
}
