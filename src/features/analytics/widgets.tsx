import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock,
  Flame,
  Gauge as GaugeIcon,
  Medal,
  MessageSquareReply,
  PieChart,
  Repeat2,
  Star,
  Timer,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { fmt } from '@/lib/dates'
import { formatMoney, formatNumber } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { DISCIPLINE_IDS, type Client, type Designer, type DisciplineId, type Role } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { CardHeader } from '@/components/ui/Glass'
import { Segmented } from '@/components/ui/Segmented'
import { Gauge } from '@/components/ui/Gauge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { DisciplineIcon, STATUS_COLOR } from '@/components/ui/Badge'
import { AreaChart, BarChart, DonutChart, Heatmap, Sparkline } from '@/components/charts'
import { item } from '@/lib/motion'
import { Card, DeltaPill, PersonAvatar, ShareBar } from '@/features/payments/ui'
import type { WorkRecord } from './history'
import {
  activityMap,
  byDiscipline,
  byStatus,
  heatStats,
  leaderboard,
  revisionHistogram,
  seriesFor,
  STATUS_ORDER,
  type Bucket,
  type Kpis,
  type RangeId,
  type Report,
} from './metrics'
import type { Job } from '@/store/types'

export const bucketLabel = (b: Bucket, range: RangeId, lang: 'en' | 'de' | 'tr') => fmt(b.date, range === '12m' ? 'MMM' : lang === 'en' ? 'MMM d' : 'd. MMM', lang)

// ───────────────────────── KPI tiles ─────────────────────────

export interface KpiDef {
  id: string
  label: string
  icon: ReactNode
  value: number
  decimals?: number
  suffix?: string
  currency?: 'EUR' | 'USD'
  delta: number | null
  deltaSuffix?: string
  invert?: boolean
  sub: string
  spark: number[]
  sparkFormat: (v: number) => string
  tone?: 'night' | 'tile'
}

export function KpiTile({ k, index }: { k: KpiDef; index: number }) {
  const t = useT()
  const night = k.tone === 'night'
  const empty = !Number.isFinite(k.value)
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 420, damping: 24 } }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-[20px] p-3.5 sm:p-4',
        night ? 'bg-night text-on-night shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_30px_-16px_rgba(0,0,0,.6)]' : 'bg-[var(--surface-2)]',
      )}
    >
      <span className={cn('flex items-center justify-between gap-2 text-[12.5px] font-medium', night ? 'text-white/70' : 'text-ink-2')}>
        <span className="truncate">{k.label}</span>
        <motion.span
          className="shrink-0 opacity-70 [&_svg]:size-4"
          initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 0.7 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.2 + index * 0.06 }}
        >
          {k.icon}
        </motion.span>
      </span>
      <span className="mt-2.5 text-[clamp(22px,2.4vw,30px)] font-medium leading-none tracking-[-0.04em]">
        {empty ? '—' : <AnimatedCounter value={k.value} decimals={k.decimals} suffix={k.suffix} currency={k.currency} />}
      </span>
      <span className={cn('mt-2 flex min-w-0 items-center gap-1.5 text-[12px]', night ? 'text-white/55' : 'text-ink-3')}>
        {k.delta !== null && Number.isFinite(k.delta) && !empty && <DeltaPill value={k.delta} invert={k.invert} suffix={k.deltaSuffix} />}
        <span className="truncate">{empty ? t('analytics.kpi.noData') : k.sub}</span>
      </span>
      {k.spark.length > 1 && (
        <div className="-mx-1 mt-auto pt-2 opacity-80 transition-opacity group-hover:opacity-100">
          <Sparkline data={k.spark} height={32} color={night ? 'var(--accent)' : 'var(--ink-3)'} format={k.sparkFormat} interactive />
        </div>
      )}
    </motion.div>
  )
}

// ───────────────────────── jobs by status ─────────────────────────

export function StatusCard({ records, className }: { records: WorkRecord[]; className?: string }) {
  const t = useT()
  const counts = useMemo(() => byStatus(records), [records])
  const active = STATUS_ORDER.filter((s) => s !== 'approved').reduce((a, s) => a + counts[s], 0)
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('analytics.status.title')}
        subtitle={t('analytics.status.subtitle', { active, done: counts.approved })}
        icon={<BarChart3 className="size-5 text-ink-3" />}
      />
      <div className="relative z-[1] mt-4 sm:hidden">
        <StatusList counts={counts} />
      </div>
      <div className="relative z-[1] mt-4 hidden flex-1 sm:block">
        <BarChart
          labels={STATUS_ORDER.map((s) => t(`core.status.${s}`))}
          series={[{ id: 'jobs', label: t('analytics.jobs'), data: STATUS_ORDER.map((s) => counts[s]) }]}
          barColors={STATUS_ORDER.map((s) => STATUS_COLOR[s])}
          showValues
          height={250}
          maxBarWidth={34}
          format={(v) => t('analytics.jobsCount', { count: v })}
          formatAxis={(v) => String(Math.round(v))}
          ariaLabel={t('analytics.status.title')}
        />
      </div>
    </Card>
  )
}

// ───────────────────────── jobs by discipline ─────────────────────────

export function DisciplineCard({ records, className }: { records: WorkRecord[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const discipline = useApp((s) => s.settings.discipline)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const data = useMemo(() => byDiscipline(records), [records])
  const list = DISCIPLINE_IDS.map((d) => ({ id: d, ...data[d] }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
  const total = list.reduce((a, d) => a + d.count, 0)
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={t('analytics.disc.title')} subtitle={t('analytics.disc.subtitle')} icon={<PieChart className="size-5 text-ink-3" />} />
      {list.length === 0 ? (
        <EmptyState icon={<PieChart />} title={t('analytics.empty')} className="py-8" />
      ) : (
        <div className="relative z-[1] mt-4 grid flex-1 items-center gap-4 sm:grid-cols-[minmax(0,180px)_1fr]">
          <DonutChart
            size={180}
            thickness={22}
            data={list.map((d) => ({ id: d.id, label: t(`core.discipline.${d.id}`), value: d.count, color: disciplineTheme(d.id).accent }))}
            format={(v) => t('analytics.jobsCount', { count: v })}
            center={<span className="text-[26px] font-medium tracking-[-0.04em]">{total}</span>}
            centerLabel={t('analytics.jobs')}
            legend={false}
            activeId={discipline === 'all' ? null : discipline}
            onSegmentClick={(id) => setDiscipline(discipline === id ? 'all' : (id as DisciplineId))}
            ariaLabel={t('analytics.disc.title')}
            className="mx-auto"
          />
          <ul className="min-w-0 space-y-0.5">
            {list.map((d, i) => {
              const ta = d.turnaround.length ? d.turnaround.reduce((a, b) => a + b, 0) / d.turnaround.length : NaN
              const active = discipline === d.id
              return (
                <motion.li key={d.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: EASE_OUT }}>
                  <button
                    type="button"
                    onClick={() => setDiscipline(active ? 'all' : d.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors',
                      active ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]/70',
                      discipline !== 'all' && !active && 'opacity-55',
                    )}
                  >
                    <DisciplineIcon id={d.id} size={22} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t(`core.discipline.${d.id}`)}</span>
                    <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">{Number.isFinite(ta) ? t('analytics.daysAvg', { n: formatNumber(ta, lang, { maximumFractionDigits: 1 }) }) : ''}</span>
                    <span className="w-8 text-right font-mono text-[12.5px] font-medium tabular-nums">{d.count}</span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

// ───────────────────────── turnaround trend ─────────────────────────

export function TurnaroundCard({ report, records, range, showPrevious = true, className }: { report: Report; records: WorkRecord[]; range: RangeId; showPrevious?: boolean; className?: string }) {
  const t = useT()
  const lang = useLang()
  const prevSeries = useMemo(() => {
    const prevBuckets = report.buckets.map((b) => {
      const span = report.buckets[report.buckets.length - 1].end - report.buckets[0].start
      return { start: b.start - span, end: b.end - span, date: b.date }
    })
    return seriesFor(records, prevBuckets).turnaround
  }, [report.buckets, records])
  const fmtD = (v: number) => t('analytics.daysShort', { n: formatNumber(v, lang, { maximumFractionDigits: 1 }) })
  const cur = report.cur.turnaround
  const best = Math.min(...report.series.turnaround)
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('analytics.turn.title')}
        subtitle={t('analytics.turn.subtitle')}
        icon={<Timer className="size-5 text-ink-3" />}
        action={
          <span className="hidden items-center gap-2 sm:flex">
            <span className="tile px-3 py-1.5 text-right">
              <span className="block text-[10.5px] text-ink-3">{t('analytics.turn.avg')}</span>
              <span className="block font-mono text-[13px] font-medium">{Number.isFinite(cur) ? fmtD(cur) : '—'}</span>
            </span>
            <span className="tile px-3 py-1.5 text-right">
              <span className="block text-[10.5px] text-ink-3">{t('analytics.turn.best')}</span>
              <span className="block font-mono text-[13px] font-medium">{Number.isFinite(best) ? fmtD(best) : '—'}</span>
            </span>
          </span>
        }
      />
      <div className="relative z-[1] mt-4 flex-1">
        {report.cur.done === 0 && report.series.turnaround.every((v) => !v) ? (
          <EmptyState icon={<Timer />} title={t('analytics.turn.empty')} description={t('analytics.turn.emptyBody')} className="py-10" />
        ) : (
        <AreaChart
          labels={report.buckets.map((b) => bucketLabel(b, range, lang))}
          series={[
            { id: 'cur', label: t('analytics.turn.current'), data: report.series.turnaround, color: 'var(--accent)' },
            ...(showPrevious ? [{ id: 'prev', label: t('analytics.turn.previous'), data: prevSeries, color: 'var(--ink-3)', lineOnly: true, dashed: true }] : []),
          ]}
          height={250}
          format={fmtD}
          formatAxis={(v) => `${formatNumber(v, lang, { maximumFractionDigits: 0 })}${t('analytics.unit.day')}`}
          markIndex={report.buckets.length - 1}
          ariaLabel={t('analytics.turn.title')}
        />
        )}
      </div>
    </Card>
  )
}

// ───────────────────────── delivery gauge ─────────────────────────

export function ScoreCard({ score, kpis, className }: { score: number | null; kpis: Kpis; className?: string }) {
  const t = useT()
  const lang = useLang()
  const grade = score === null ? null : score >= 90 ? 'excellent' : score >= 75 ? 'great' : score >= 60 ? 'good' : 'needsWork'
  return (
    <Card variant="accent" className={cn('flex flex-col', className)}>
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[19px] font-medium tracking-[-0.02em]">
            <GaugeIcon className="size-5 opacity-70" />
            {t('analytics.score.title')}
          </h3>
          <p className="mt-0.5 truncate text-[13px] opacity-70">{t('analytics.score.subtitle')}</p>
        </div>
        {grade && <span className="shrink-0 rounded-full bg-[var(--accent-ink)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--accent)]">{t(`analytics.score.${grade}`)}</span>}
      </div>
      <div className="relative z-[1] mt-2 flex flex-1 items-center justify-center">
        <Gauge value={score ?? 0} size={250} tone="ink" suffix="" label={score === null ? t('analytics.score.noData') : t('analytics.score.outOf')} ariaLabel={t('analytics.score.title')} />
      </div>
      <div className="relative z-[1] mt-1 grid grid-cols-3 gap-1.5 rounded-[18px] bg-[var(--surface)] p-1.5 text-ink">
        {[
          { label: t('analytics.kpi.onTime'), v: Number.isFinite(kpis.onTime) ? `${Math.round(kpis.onTime * 100)}%` : '—' },
          { label: t('analytics.kpi.rating'), v: Number.isFinite(kpis.rating) ? `★ ${formatNumber(kpis.rating, lang, { maximumFractionDigits: 1 })}` : '—' },
          { label: t('analytics.kpi.revisions'), v: Number.isFinite(kpis.revisions) ? formatNumber(kpis.revisions, lang, { maximumFractionDigits: 1 }) : '—' },
        ].map((x) => (
          <div key={x.label} className="min-w-0 rounded-[13px] px-2 py-1.5 text-center">
            <p className="truncate text-[10.5px] text-ink-3">{x.label}</p>
            <p className="font-mono text-[13px] font-semibold">{x.v}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ───────────────────────── revisions histogram ─────────────────────────

export function RevisionsCard({ records, className }: { records: WorkRecord[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const hist = useMemo(() => revisionHistogram(records), [records])
  const done = hist.reduce((a, b) => a + b, 0)
  const firstPass = done ? Math.round((hist[0] / done) * 100) : 0
  const avg = done ? (hist[1] + hist[2] * 2 + hist[3] * 3) / done : 0
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={t('analytics.rev.title')} subtitle={t('analytics.rev.subtitle', { n: formatNumber(avg, lang, { maximumFractionDigits: 1 }) })} icon={<Repeat2 className="size-5 text-ink-3" />} />
      <div className="relative z-[1] mt-3 flex items-baseline gap-2">
        <span className="text-[30px] font-medium leading-none tracking-[-0.04em]">
          <AnimatedCounter value={firstPass} suffix="%" />
        </span>
        <span className="text-[12px] text-ink-3">{t('analytics.rev.firstPass')}</span>
      </div>
      <div className="relative z-[1] mt-3 flex-1">
        {done === 0 ? (
          <EmptyState icon={<Repeat2 />} title={t('analytics.empty')} className="py-6" />
        ) : (
          <BarChart
            labels={[t('analytics.rev.none'), '1', '2', '3+']}
            series={[{ id: 'jobs', label: t('analytics.jobs'), data: hist }]}
            barColors={['var(--accent)', 'color-mix(in oklab, var(--accent) 55%, var(--ink))', 'var(--ink-3)', 'var(--ink)']}
            showValues
            showYAxis={false}
            height={170}
            maxBarWidth={40}
            format={(v) => t('analytics.jobsCount', { count: v })}
            ariaLabel={t('analytics.rev.title')}
          />
        )}
      </div>
    </Card>
  )
}

// ───────────────────────── response time ─────────────────────────

export function ResponseCard({ report, range, role, className }: { report: Report; range: RangeId; role: Role; className?: string }) {
  const t = useT()
  const lang = useLang()
  const fmtH = (v: number) => t('analytics.hoursShort', { n: formatNumber(v, lang, { maximumFractionDigits: 1 }) })
  const cur = report.cur.response
  const prev = report.prev.response
  const delta = report.prevCoverage >= 0.6 && Number.isFinite(cur) && Number.isFinite(prev) ? Math.round((cur - prev) * 10) / 10 : null
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('analytics.resp.title')}
        subtitle={role === 'client' ? t('analytics.resp.subtitleClient') : t('analytics.resp.subtitleDesigner')}
        icon={<MessageSquareReply className="size-5 text-ink-3" />}
      />
      <div className="relative z-[1] mt-3 flex items-baseline gap-2">
        <span className="text-[30px] font-medium leading-none tracking-[-0.04em]">{Number.isFinite(cur) ? <AnimatedCounter value={cur} decimals={1} suffix={t('analytics.unit.hour')} /> : '—'}</span>
        {delta !== null && <DeltaPill value={delta} invert suffix={t('analytics.unit.hour')} />}
      </div>
      <div className="relative z-[1] mt-3 flex-1">
        <AreaChart
          labels={report.buckets.map((b) => bucketLabel(b, range, lang))}
          series={[{ id: 'resp', label: t('analytics.resp.title'), data: report.series.response, color: 'var(--ink)' }]}
          height={170}
          showYAxis={false}
          format={fmtH}
          ariaLabel={t('analytics.resp.title')}
        />
      </div>
    </Card>
  )
}

// ───────────────────────── leaderboard ─────────────────────────

type ClientSort = 'jobs' | 'rating' | 'onTime'
type DesignerSort = 'revenue' | 'jobs' | 'rating'

export function LeaderboardCard({ records, role, className }: { records: WorkRecord[]; role: Role; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const currency = useApp((s) => s.settings.currency)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const [cSort, setCSort] = useState<ClientSort>('jobs')
  const [dSort, setDSort] = useState<DesignerSort>('revenue')
  const rows = useMemo(() => {
    const list = leaderboard(records)
    const key = role === 'client' ? cSort : dSort
    const val = (r: (typeof list)[number]) =>
      key === 'jobs' ? r.jobs : key === 'rating' ? (Number.isFinite(r.rating) ? r.rating : 0) : key === 'onTime' ? (Number.isFinite(r.onTime) ? r.onTime : 0) : r.amount
    return list.sort((a, b) => val(b) - val(a) || b.jobs - a.jobs).slice(0, 6)
  }, [records, role, cSort, dSort])
  const person = (id: string): Designer | Client | undefined => designers.find((d) => d.id === id) ?? clients.find((c) => c.id === id)
  const medal = ['#f5c542', '#c0c4cc', '#d08a4f']

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={role === 'client' ? t('analytics.lead.titleClient') : t('analytics.lead.titleDesigner')}
        subtitle={t('analytics.lead.subtitle', { count: leaderboard(records).length })}
        icon={<Trophy className="size-5 text-ink-3" />}
      />
      <div className="no-scrollbar relative z-[1] -mx-1 mt-3 overflow-x-auto px-1">
        {role === 'client' ? (
          <Segmented<ClientSort>
            size="sm"
            value={cSort}
            onChange={setCSort}
            options={[
              { value: 'jobs', label: t('analytics.lead.byJobs') },
              { value: 'rating', label: t('analytics.lead.byRating') },
              { value: 'onTime', label: t('analytics.lead.byOnTime') },
            ]}
          />
        ) : (
          <Segmented<DesignerSort>
            size="sm"
            value={dSort}
            onChange={setDSort}
            options={[
              { value: 'revenue', label: t('analytics.lead.byRevenue') },
              { value: 'jobs', label: t('analytics.lead.byJobs') },
              { value: 'rating', label: t('analytics.lead.byRating') },
            ]}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Medal />} title={t('analytics.empty')} className="py-8" />
      ) : (
        <motion.ul layout className="relative z-[1] mt-3 space-y-1">
          {rows.map((r, i) => {
            const p = person(r.id)
            const sub = p ? ('primary' in p ? t(`core.discipline.${p.primary}`) : p.industry) : ''
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ layout: { type: 'spring', stiffness: 380, damping: 32 }, delay: i * 0.04, duration: 0.4, ease: EASE_OUT }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/network/${r.id}`)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span
                    className={cn('flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold', i > 2 && 'bg-[var(--surface-2)] text-ink-3')}
                    style={i <= 2 ? { background: medal[i], color: '#0b0b0c', boxShadow: `0 6px 14px -6px ${medal[i]}` } : undefined}
                  >
                    {i + 1}
                  </span>
                  <PersonAvatar person={p} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{p?.name ?? r.id}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {sub} · {t('analytics.jobsCount', { count: r.jobs })}
                    </span>
                    {role === 'designer' && <ShareBar value={r.share} color={i === 0 ? 'var(--accent)' : 'var(--ink)'} delay={0.15 + i * 0.05} className="mt-1.5 h-1.5" />}
                  </span>
                  <span className="hidden w-14 shrink-0 text-right sm:block">
                    <span className="flex items-center justify-end gap-0.5 font-mono text-[12.5px] font-medium">
                      <Star className="size-3 fill-[#f5b301] text-[#f5b301]" />
                      {Number.isFinite(r.rating) ? formatNumber(r.rating, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                    </span>
                    <span className="block text-[10.5px] text-ink-3">{t('analytics.kpi.rating')}</span>
                  </span>
                  {role === 'client' ? (
                    <span className="w-14 shrink-0 text-right">
                      <span className="block font-mono text-[12.5px] font-medium">{Number.isFinite(r.onTime) ? `${Math.round(r.onTime * 100)}%` : '—'}</span>
                      <span className="block text-[10.5px] text-ink-3">{t('analytics.kpi.onTime')}</span>
                    </span>
                  ) : null}
                  <span className="w-[72px] shrink-0 text-right">
                    <span className="block font-mono text-[12.5px] font-medium">{formatMoney(r.amount, currency, lang, true)}</span>
                    <span className="block text-[10.5px] text-ink-3">{role === 'client' ? t('analytics.lead.spent') : `${Math.round(r.share)}%`}</span>
                  </span>
                  <ArrowUpRight className="hidden size-4 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                </button>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </Card>
  )
}

// ───────────────────────── activity heatmap ─────────────────────────

export function ActivityCard({ jobs, records, className }: { jobs: Job[]; records: WorkRecord[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const values = useMemo(() => activityMap(jobs, records, 16), [jobs, records])
  const stats = useMemo(() => heatStats(values, 16), [values])
  const [picked, setPicked] = useState<{ day: string; v: number } | null>(null)
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={t('analytics.heat.title')} subtitle={t('analytics.heat.subtitle')} icon={<Activity className="size-5 text-ink-3" />} />
      <div className="relative z-[1] mt-4">
        <Heatmap
          values={values}
          weeks={16}
          maxCell={22}
          valueLabel={(v) => t('analytics.heat.events', { count: v })}
          onCellClick={(day, v) => setPicked({ day, v })}
          summary={
            <span className="font-mono text-[11.5px] text-ink-3">
              {picked ? `${fmt(new Date(picked.day), lang === 'en' ? 'MMM d' : 'd. MMM', lang)} · ${t('analytics.heat.events', { count: picked.v })}` : t('analytics.heat.events', { count: stats.total })}
            </span>
          }
          ariaLabel={t('analytics.heat.title')}
        />
      </div>
      <WeekdayBars days={stats.weekdays} />
      <div className="relative z-[1] mt-auto grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
        {[
          { id: 'active', icon: <Clock className="size-3.5" />, label: t('analytics.heat.activeDays'), v: String(stats.activeDays) },
          { id: 'streak', icon: <Flame className="size-3.5" />, label: t('analytics.heat.streak'), v: t('analytics.daysShort', { n: stats.streak }) },
          { id: 'best', icon: <Medal className="size-3.5" />, label: t('analytics.heat.best'), v: t('analytics.daysShort', { n: stats.best }) },
          { id: 'busy', icon: <BarChart3 className="size-3.5" />, label: t('analytics.heat.busiest'), v: fmt(stats.busiestDate, 'EEEE', lang) },
        ].map((x, i) => (
          <motion.div
            key={x.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.45, ease: EASE_OUT }}
            className="tile min-w-0 px-3 py-2"
          >
            <p className="flex items-center gap-1.5 truncate text-[11px] text-ink-3">
              {x.icon}
              {x.label}
            </p>
            <p className="mt-0.5 truncate font-mono text-[14px] font-medium">{x.v}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

/** Mon–Sun distribution of events — tallest day in accent. */
function WeekdayBars({ days }: { days: { v: number; date: Date }[] }) {
  const t = useT()
  const lang = useLang()
  const max = Math.max(1, ...days.map((d) => d.v))
  const top = days.findIndex((d) => d.v === max)
  return (
    <div className="relative z-[1] mt-4">
      <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('analytics.heat.weekdays')}</p>
      <div className="flex items-end gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="font-mono text-[10px] text-ink-3">{d.v}</span>
            <span className="flex h-14 w-full items-end justify-center">
              <motion.span
                className="block w-full max-w-[34px] origin-bottom rounded-t-[7px] rounded-b-[3px]"
                style={{ height: `${Math.max(8, (d.v / max) * 100)}%`, background: i === top ? 'var(--accent)' : 'var(--surface-3)' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.2 + i * 0.05 }}
              />
            </span>
            <span className="text-[10.5px] text-ink-3">{fmt(d.date, 'EEEEEE', lang)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Phone-friendly horizontal variant of the status chart. */
function StatusList({ counts }: { counts: Record<string, number> }) {
  const t = useT()
  const max = Math.max(1, ...STATUS_ORDER.map((s) => counts[s] ?? 0))
  return (
    <ul className="space-y-2">
      {STATUS_ORDER.map((s, i) => (
        <li key={s} className="grid grid-cols-[96px_1fr_28px] items-center gap-2.5 text-[12.5px]">
          <span className="truncate text-ink-2">{t(`core.status.${s}`)}</span>
          <span className="relative h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <motion.span
              className="absolute inset-y-0 left-0 origin-left rounded-full"
              style={{ width: `${Math.max(3, ((counts[s] ?? 0) / max) * 100)}%`, background: STATUS_COLOR[s] }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 + i * 0.05 }}
            />
          </span>
          <span className="text-right font-mono font-medium tabular-nums">{counts[s] ?? 0}</span>
        </li>
      ))}
    </ul>
  )
}
