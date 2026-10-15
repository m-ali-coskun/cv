import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleDollarSign, Clock, Download, FileSpreadsheet, ListChecks, Repeat2, Sparkles, Star, Timer, Users } from 'lucide-react'
import { stagger } from '@/lib/motion'
import { formatMoney, formatNumber } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useDiscipline, useMyJobs, useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { DISCIPLINE_IDS } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { DisciplineIcon } from '@/components/ui/Badge'
import { Card, LiveDot } from '@/features/payments/ui'
import { downloadText, toCsv, useWorkRecords } from '@/features/payments/model'
import { AiInsightsCard, type Insight } from './AiInsights'
import { buildReport, byDiscipline, deliveryScore, filterDisc, jobsCsv, leaderboard, type Kpis, type RangeId } from './metrics'
import { ActivityCard, DisciplineCard, KpiTile, LeaderboardCard, ResponseCard, RevisionsCard, ScoreCard, StatusCard, TurnaroundCard, type KpiDef } from './widgets'

/*
 * /analytics — "Reports". Role-aware, follows the discipline tab and a
 * 30d / 90d / 12m range. Real jobs drive recent periods; deterministic
 * imported history fills older ones.
 *
 * xl = 12 columns:
 *   toolbar ······························· 12
 *   KPI tiles (6) ························· 12
 *   status 7 │ discipline 5
 *   turnaround 8 │ score 4
 *   revisions 4 │ response 4 │ ai 4
 *   leaderboard 7 │ heatmap 5
 */
const S = {
  full: 'md:col-span-2 xl:col-span-12',
  w8: 'md:col-span-2 xl:col-span-8',
  w7: 'md:col-span-2 xl:col-span-7',
  w5: 'md:col-span-2 xl:col-span-5',
  s4: 'md:col-span-1 xl:col-span-4',
  s4wide: 'md:col-span-2 xl:col-span-4',
}

const pctDeltaOf = (cur: number, prev: number) => (Number.isFinite(cur) && Number.isFinite(prev) && prev ? Math.round(((cur - prev) / prev) * 100) : null)
const absDeltaOf = (cur: number, prev: number, digits = 1) => (Number.isFinite(cur) && Number.isFinite(prev) ? Math.round((cur - prev) * 10 ** digits) / 10 ** digits : null)

export default function AnalyticsPage() {
  const role = useRole()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={role}
        variants={stagger(0.06, 0.04)}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, y: 10, filter: 'blur(8px)', transition: { duration: 0.2 } }}
        className="grid grid-cols-1 gap-3 md:grid-flow-dense md:grid-cols-2 lg:gap-4 xl:grid-cols-12"
      >
        <Reports />
      </motion.div>
    </AnimatePresence>
  )
}

function Reports() {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const discipline = useDiscipline()
  const currency = useApp((s) => s.settings.currency)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const [range, setRange] = useState<RangeId>('90d')
  const { records: all } = useWorkRecords()
  const records = useMemo(() => filterDisc(all, discipline), [all, discipline])
  const report = useMemo(() => buildReport(records, range), [records, range])
  const jobs = useMyJobs({ includeClosed: true })
  /** Discipline mix always shows every discipline in the window, so a slice can switch the tab. */
  const mix = useMemo(() => all.filter((r) => inWindowAll(r, report)), [all, report])
  /** No deliveries in range → no score (instead of a misleading default). */
  const score = report.cur.done > 0 ? deliveryScore(report.cur) : null
  const name = (id: string) => designers.find((d) => d.id === id)?.name ?? clients.find((c) => c.id === id)?.name ?? id
  const money = (v: number) => formatMoney(v, currency, lang)
  const { cur, prev, series } = report
  const n1 = (v: number) => formatNumber(v, lang, { maximumFractionDigits: 1 })
  // Only compare with the previous period when enough history exists for it.
  const comparable = report.prevCoverage >= 0.6
  const pctDelta = (c: number, p: number) => (comparable ? pctDeltaOf(c, p) : null)
  const absDelta = (c: number, p: number, d = 1) => (comparable ? absDeltaOf(c, p, d) : null)

  const kpis: KpiDef[] = [
    {
      id: 'money',
      tone: 'night',
      label: role === 'client' ? t('analytics.kpi.spend') : t('analytics.kpi.billed'),
      icon: <CircleDollarSign />,
      value: cur.money,
      currency,
      delta: pctDelta(cur.money, prev.money),
      deltaSuffix: '%',
      sub: t('analytics.kpi.moneySub', { count: cur.created }),
      spark: series.money,
      sparkFormat: money,
    },
    {
      id: 'turnaround',
      label: t('analytics.kpi.turnaround'),
      icon: <Timer />,
      value: cur.turnaround,
      decimals: 1,
      suffix: t('analytics.unit.day'),
      delta: absDelta(cur.turnaround, prev.turnaround),
      deltaSuffix: t('analytics.unit.day'),
      invert: true,
      sub: t('analytics.kpi.turnaroundSub', { count: cur.done }),
      spark: series.turnaround,
      sparkFormat: (v) => t('analytics.daysShort', { n: n1(v) }),
    },
    {
      id: 'onTime',
      label: t('analytics.kpi.onTime'),
      icon: <Clock />,
      value: cur.onTime * 100,
      suffix: '%',
      delta: absDelta(cur.onTime * 100, prev.onTime * 100, 0),
      deltaSuffix: t('analytics.unit.pt'),
      sub: t('analytics.kpi.onTimeSub'),
      spark: series.onTime,
      sparkFormat: (v) => `${Math.round(v)}%`,
    },
    {
      id: 'revisions',
      label: t('analytics.kpi.revisions'),
      icon: <Repeat2 />,
      value: cur.revisions,
      decimals: 1,
      delta: absDelta(cur.revisions, prev.revisions),
      deltaSuffix: '',
      invert: true,
      sub: t('analytics.kpi.revisionsSub'),
      spark: series.revisions,
      sparkFormat: n1,
    },
    {
      id: 'rating',
      label: t('analytics.kpi.rating'),
      icon: <Star />,
      value: cur.rating,
      decimals: 2,
      delta: absDelta(cur.rating, prev.rating, 2),
      deltaSuffix: '',
      sub: t('analytics.kpi.ratingSub'),
      spark: series.rating,
      sparkFormat: (v) => `★ ${formatNumber(v, lang, { maximumFractionDigits: 2 })}`,
    },
    {
      id: 'collaborators',
      label: role === 'client' ? t('analytics.kpi.designers') : t('analytics.kpi.clients'),
      icon: <Users />,
      value: cur.collaborators,
      delta: absDelta(cur.collaborators, prev.collaborators, 0),
      deltaSuffix: '',
      sub: t('analytics.kpi.collabSub'),
      spark: series.collaborators,
      sparkFormat: (v) => String(Math.round(v)),
    },
  ]

  const insights = useMemo<Insight[]>(() => buildInsights(), [report, records, role, lang, discipline])
  function buildInsights(): Insight[] {
    const out: Insight[] = []
    const inW = report.inWindow
    // 1 · fastest discipline
    const disc = byDiscipline(inW)
    const avgs = DISCIPLINE_IDS.map((d) => ({ d, n: disc[d].turnaround.length, avg: disc[d].turnaround.reduce((a, b) => a + b, 0) / (disc[d].turnaround.length || 1) })).filter((x) => x.n >= 1)
    if (avgs.length >= 2 && Number.isFinite(cur.turnaround)) {
      const fast = avgs.sort((a, b) => a.avg - b.avg)[0]
      const pct = Math.round((1 - fast.avg / cur.turnaround) * 100)
      out.push({
        id: 'fast',
        color: disciplineTheme(fast.d).accent,
        text: t('analytics.ai.fastest', { disc: t(`core.discipline.${fast.d}`), n: n1(fast.avg), pct: Math.max(0, pct) }),
        action: discipline === fast.d ? undefined : { label: t('analytics.ai.focus'), onClick: () => setDiscipline(fast.d) },
      })
    } else if (Number.isFinite(cur.turnaround)) {
      out.push({ id: 'fast', color: 'var(--accent)', text: t('analytics.ai.turnaround', { n: n1(cur.turnaround) }) })
    }
    // 2 · on-time trend
    if (Number.isFinite(cur.onTime)) {
      const d = comparable && Number.isFinite(prev.onTime) ? Math.round((cur.onTime - prev.onTime) * 100) : 0
      out.push({
        id: 'ontime',
        color: d >= 0 ? 'var(--success)' : 'var(--danger)',
        text: d >= 0 ? t('analytics.ai.onTimeUp', { pct: Math.round(cur.onTime * 100), d }) : t('analytics.ai.onTimeDown', { pct: Math.round(cur.onTime * 100), d: -d }),
      })
    }
    // 3 · revisions cost time
    const done = inW.filter((r) => r.doneAt)
    const heavy = done.filter((r) => r.revisions >= 2)
    const light = done.filter((r) => r.revisions < 2)
    const ta = (list: typeof done) => list.reduce((a, r) => a + (r.doneAt! - r.startedAt), 0) / (list.length || 1)
    if (heavy.length && light.length) {
      const pct = Math.round((ta(heavy) / ta(light) - 1) * 100)
      if (pct > 0) out.push({ id: 'rev', color: '#f97316', text: role === 'client' ? t('analytics.ai.revClient', { pct }) : t('analytics.ai.revDesigner', { pct }) })
    }
    // 4 · top collaborator
    const lead = leaderboard(inW).sort((a, b) => (role === 'client' ? b.jobs - a.jobs || b.rating - a.rating : b.amount - a.amount))[0]
    if (lead)
      out.push({
        id: 'lead',
        color: 'var(--info)',
        text:
          role === 'client'
            ? t('analytics.ai.leadClient', { name: name(lead.id), count: lead.jobs, rating: Number.isFinite(lead.rating) ? formatNumber(lead.rating, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—' })
            : t('analytics.ai.leadDesigner', { name: name(lead.id), pct: Math.round(lead.share) }),
      })
    return out.slice(0, 3)
  }

  const exportJobs = () => {
    downloadText(`designtab-jobs-${role}-${new Date().toISOString().slice(0, 10)}.csv`, jobsCsv(jobs, role, name))
    toast({ title: t('analytics.export.jobsDone', { count: jobs.length }), tone: 'success' })
  }
  const exportSummary = () => {
    const rows: (string | number)[][] = [['metric', `current_${range}`, 'previous', 'unit']]
    const add = (k: keyof Kpis, unit: string, mul = 1) =>
      rows.push([k, Number.isFinite(cur[k]) ? Math.round(cur[k] * mul * 100) / 100 : '', Number.isFinite(prev[k]) ? Math.round(prev[k] * mul * 100) / 100 : '', unit])
    add('money', currency)
    add('turnaround', 'days')
    add('onTime', '%', 100)
    add('revisions', 'rounds/job')
    add('rating', 'stars')
    add('collaborators', 'people')
    add('response', 'hours')
    add('done', 'jobs')
    add('created', 'jobs')
    rows.push(['delivery_score', score ?? '', '', '/100'])
    downloadText(`designtab-report-${role}-${range}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
    toast({ title: t('analytics.export.summaryDone'), tone: 'success' })
  }

  const rangeLabel = t(`analytics.range.${range}`)

  return (
    <>
      {/* toolbar */}
      <Card className={`${S.full} flex flex-col gap-3 !py-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="relative z-[1] flex min-w-0 items-center gap-3">
          <DisciplineIcon id={discipline} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium tracking-[-0.01em]">
              {role === 'client' ? t('analytics.toolbar.client') : t('analytics.toolbar.designer')} · {t(`core.discipline.${discipline}`)}
            </p>
            <p className="flex items-center gap-1.5 truncate text-[12px] text-ink-3">
              <LiveDot className="size-1.5" />
              {t('analytics.toolbar.meta', { count: report.inWindow.length, range: rangeLabel })}
            </p>
          </div>
        </div>
        <div className="relative z-[1] flex flex-wrap items-center gap-2">
          <Segmented<RangeId>
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '30d', label: t('analytics.range.30d') },
              { value: '90d', label: t('analytics.range.90d') },
              { value: '12m', label: t('analytics.range.12m') },
            ]}
          />
          <Menu
            width={250}
            trigger={({ onClick }) => (
              <Button size="sm" icon={<Download className="size-4" />} onClick={onClick}>
                {t('analytics.export.cta')}
              </Button>
            )}
            items={[
              { label: t('analytics.export.jobs'), icon: <FileSpreadsheet />, hint: `${jobs.length}`, onClick: exportJobs },
              { label: t('analytics.export.summary'), icon: <ListChecks />, hint: rangeLabel, onClick: exportSummary },
            ]}
          />
        </div>
      </Card>

      {/* KPI tiles */}
      <Card className={S.full}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${range}-${discipline}`}
            variants={stagger(0.05, 0.02)}
            initial="hidden"
            animate="show"
            className="relative z-[1] grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 xl:grid-cols-6"
          >
            {kpis.map((k, i) => (
              <KpiTile key={k.id} k={k} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </Card>

      <StatusCard records={report.inWindow} className={S.w7} />
      <DisciplineCard records={mix} className={S.w5} />
      <TurnaroundCard report={report} records={records} range={range} showPrevious={report.prevCoverage >= 0.6} className={S.w8} />
      <ScoreCard score={score} kpis={cur} className={S.s4wide} />
      <RevisionsCard records={report.inWindow} className={S.s4} />
      <ResponseCard report={report} range={range} role={role} className={S.s4} />
      <AiInsightsCard
        name={t('analytics.ai.name')}
        headline={score === null ? t('analytics.ai.headlineEmpty') : t('analytics.ai.headline', { score })}
        insights={insights}
        primary={{ label: t('analytics.export.summary'), icon: <Sparkles className="size-4" />, onClick: exportSummary }}
        className={S.s4wide}
      />
      <LeaderboardCard records={report.inWindow} role={role} className={S.w7} />
      <ActivityCard jobs={jobs} records={records} className={S.w5} />
    </>
  )
}

/** Is a record (any discipline) inside the report window? Used for the discipline mix. */
function inWindowAll(r: { createdAt: number; doneAt?: number }, report: { buckets: { start: number; end: number }[] }) {
  const start = report.buckets[0].start
  const end = report.buckets[report.buckets.length - 1].end
  return r.createdAt < end && (r.createdAt >= start || (r.doneAt ? r.doneAt >= start : true))
}
