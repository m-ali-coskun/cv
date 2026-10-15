import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarClock, CircleDollarSign, CreditCard, Gauge as GaugeIcon, Lock, LockOpen, PencilLine, PieChart, Receipt, ShieldCheck, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { fmt } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { DISCIPLINE_IDS, type DisciplineFilter, type DisciplineId, type InvoiceStatus } from '@/store/types'
import { disciplineTheme } from '@/theme/disciplines'
import { CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { Slider } from '@/components/ui/Slider'
import { Gauge } from '@/components/ui/Gauge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { DisciplineIcon } from '@/components/ui/Badge'
import { BarChart, DonutChart } from '@/components/charts'
import type { WorkRecord } from '@/features/analytics/history'
import { usePayPrefs } from './local'
import { byDiscipline, cashflowWeeks, monthlyFlow, statusTotals, upcomingPayments, type ClientKpis, type UpcomingItem } from './metrics'
import { money as fmtMoney, pctDelta, sum, ts, type InvoiceRow } from './model'
import type { InvoiceFilter } from './InvoicesCard'
import { Card, DeltaPill, MonoId, StatTile } from './ui'
import type { Job } from '@/store/types'

// ───────────────────────── money flow bar ─────────────────────────

export interface FlowSegment {
  id: InvoiceStatus
  label: string
  amount: number
  count: number
  color: string
}

/** Reference-style pipeline, but in money: one rounded segment per invoice status. */
export function MoneyFlowBar({ segments, active, onPick, currency }: { segments: FlowSegment[]; active?: InvoiceFilter; onPick?: (id: InvoiceStatus) => void; currency: 'EUR' | 'USD' }) {
  const lang = useLang()
  const total = sum(segments.map((s) => s.amount)) || 1
  const [hover, setHover] = useState<string | null>(null)
  return (
    <div role="list" className="flex w-full items-start gap-1.5">
      {segments.map((s, i) => {
        const share = s.amount / total
        const dim = (hover && hover !== s.id) || (active && active !== 'all' && active !== s.id && !hover)
        return (
          <div role="listitem" key={s.id} className="min-w-[54px] transition-[flex-grow] duration-700 ease-[var(--ease-out)]" style={{ flexGrow: Math.max(share * 100, 3), flexBasis: 0 }}>
            <motion.button
              type="button"
              onClick={() => onPick?.(s.id)}
              onPointerEnter={() => setHover(s.id)}
              onPointerLeave={() => setHover(null)}
              whileTap={{ scale: 0.97 }}
              className="group block w-full text-left outline-none"
              aria-label={`${s.label}: ${formatMoney(s.amount, currency, lang)}`}
              aria-pressed={active === s.id}
            >
              <motion.span
                className={cn(
                  'relative block h-[30px] origin-left overflow-hidden rounded-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,.35)]',
                  active === s.id && 'ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--surface)]',
                  s.id === 'draft' && 'stripes',
                )}
                style={{ background: s.color }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: dim ? 0.5 : 1, y: hover === s.id ? -3 : 0 }}
                transition={{ scaleX: { type: 'spring', stiffness: 140, damping: 18, delay: 0.1 + i * 0.08 }, opacity: { duration: 0.2 }, y: { type: 'spring', stiffness: 500, damping: 26 } }}
              >
                <span
                  className={cn(
                    'pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)] opacity-0 transition-[transform,opacity] duration-700',
                    hover === s.id && 'translate-x-[300%] opacity-100',
                  )}
                />
              </motion.span>
              <motion.span
                className="mt-2 block min-w-0"
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: dim ? 0.5 : 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: EASE_OUT }}
              >
                <span className="block truncate font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.02em] text-ink sm:text-[15px]">
                  {formatMoney(s.amount, currency, lang, true)}
                </span>
                <span className="block truncate text-[12px] text-ink-3">
                  {s.label} <span className="font-mono text-ink-4">· {s.count}</span>
                </span>
              </motion.span>
            </motion.button>
          </div>
        )
      })}
    </div>
  )
}

export const STATUS_COLOR: Record<InvoiceStatus, string> = {
  pending: 'color-mix(in oklab, var(--warning) 70%, var(--surface))',
  overdue: 'var(--danger)',
  escrow: 'var(--accent)',
  paid: 'var(--ink)',
  draft: 'var(--surface-3)',
}

// ───────────────────────── overview (KPI) ─────────────────────────

export function ClientOverviewCard({
  kpis,
  rows,
  filter,
  onFilter,
  onPayOverdue,
  className,
}: {
  kpis: ClientKpis
  rows: InvoiceRow[]
  filter: InvoiceFilter
  onFilter: (f: InvoiceFilter) => void
  onPayOverdue: () => void
  className?: string
}) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const totals = useMemo(() => statusTotals(rows), [rows])
  const delta = pctDelta(kpis.paidMonth, kpis.paidPrevMonth)
  const order: InvoiceStatus[] = ['pending', 'overdue', 'escrow', 'paid', 'draft']
  const segments: FlowSegment[] = order
    .filter((s) => totals.count[s] > 0)
    .map((s) => ({ id: s, label: t(`payments.status.${s}`), amount: totals.amount[s], count: totals.count[s], color: STATUS_COLOR[s] }))
  const money = (v: number) => fmtMoney(v, currency, lang, 0)

  return (
    <Card className={cn('flex flex-col', className)} spotlight>
      <CardHeader
        title={t('payments.overview.title')}
        subtitle={t('payments.overview.subtitle', { count: rows.length, amount: money(sum(segments.map((s) => s.amount))) })}
        action={
          kpis.overdueCount > 0 ? (
            <Button size="sm" variant="danger" icon={<CreditCard className="size-4" />} onClick={onPayOverdue}>
              <span className="hidden sm:inline">{t('payments.overview.payOverdue')}</span>
              <span className="sm:hidden">{t('payments.action.payNow')}</span>
            </Button>
          ) : (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-[12.5px] font-medium text-accent-text">
              <ShieldCheck className="size-4" />
              {t('payments.overview.allClear')}
            </span>
          )
        }
      />
      <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
        <StatTile
          tone="night"
          label={t('payments.kpi.escrow')}
          icon={<Lock />}
          value={kpis.escrow}
          currency={currency}
          sub={t('payments.kpi.escrowSub', { count: kpis.escrowJobs })}
          spark={kpis.sparkCommitted}
          sparkFormat={money}
          onClick={() => onFilter('escrow')}
          active={filter === 'escrow'}
        />
        <StatTile
          label={t('payments.kpi.paidMonth')}
          icon={<CircleDollarSign />}
          value={kpis.paidMonth}
          currency={currency}
          sub={
            kpis.paidPrevMonth > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <DeltaPill value={delta} invert />
                {t('payments.kpi.vsLast')}
              </span>
            ) : (
              t('payments.kpi.paidCount', { count: kpis.paidMonthCount })
            )
          }
          spark={kpis.sparkPaid}
          sparkFormat={money}
          onClick={() => onFilter('paid')}
          active={filter === 'paid'}
        />
        <StatTile
          label={t('payments.kpi.upcoming')}
          icon={<CalendarClock />}
          value={kpis.upcoming}
          currency={currency}
          sub={t('payments.kpi.upcomingSub', { count: kpis.upcomingCount })}
          spark={kpis.sparkUpcoming}
          sparkFormat={money}
          onClick={() => onFilter('pending')}
          active={filter === 'pending'}
        />
        <StatTile
          label={t('payments.kpi.overdue')}
          icon={<TriangleAlert />}
          value={kpis.overdue}
          currency={currency}
          sub={kpis.overdueCount ? t('payments.kpi.overdueSub', { count: kpis.overdueCount, days: kpis.oldestOverdueDays }) : t('payments.kpi.overdueNone')}
          onClick={() => onFilter('overdue')}
          active={filter === 'overdue'}
          className={cn(kpis.overdue > 0 && 'bg-danger-soft [&>span:first-child]:text-danger')}
        />
      </div>
      {segments.length > 0 && (
        <div className="tile relative z-[1] mt-2.5 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14.5px] font-medium tracking-[-0.01em]">{t('payments.flow.title')}</p>
            <p className="text-[12px] text-ink-3">{t('payments.flow.hint')}</p>
          </div>
          <MoneyFlowBar segments={segments} active={filter} onPick={(s) => onFilter(filter === s ? 'all' : s)} currency={currency} />
        </div>
      )}
    </Card>
  )
}

// ───────────────────────── spend by discipline ─────────────────────────

export function DisciplineSpendCard({ rows, records, title, className }: { rows: InvoiceRow[]; records: WorkRecord[]; title: string; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const discipline = useApp((s) => s.settings.discipline)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const data = useMemo(() => byDiscipline(rows, records), [rows, records])
  const total = sum(DISCIPLINE_IDS.map((d) => data.amount[d]))
  const list = DISCIPLINE_IDS.map((d) => ({ id: d, amount: data.amount[d], jobs: data.jobs[d] }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
  const top = list[0]

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        subtitle={t('payments.disc.subtitle', { amount: fmtMoney(total, currency, lang, 0) })}
        icon={<PieChart className="size-5 text-ink-3" />}
      />
      {list.length === 0 ? (
        <EmptyState icon={<PieChart />} title={t('payments.disc.empty')} />
      ) : (
        <div className="relative z-[1] mt-4 grid items-center gap-5 sm:grid-cols-[minmax(0,200px)_1fr]">
          <DonutChart
            size={200}
            thickness={24}
            data={list.map((d) => ({ id: d.id, label: t(`core.discipline.${d.id}`), value: d.amount, color: disciplineTheme(d.id).accent }))}
            format={(v) => formatMoney(v, currency, lang, true)}
            centerLabel={t('payments.disc.total')}
            center={<span className="text-[20px] font-medium tracking-[-0.03em]">{formatMoney(total, currency, lang, true)}</span>}
            legend={false}
            activeId={discipline === 'all' ? null : discipline}
            onSegmentClick={(id) => setDiscipline(discipline === id ? 'all' : (id as DisciplineId))}
            ariaLabel={title}
            className="mx-auto"
          />
          <ul className="min-w-0 space-y-1">
            {list.map((d, i) => {
              const th = disciplineTheme(d.id)
              const active = discipline === d.id
              return (
                <motion.li key={d.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: EASE_OUT }}>
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{t(th.labelKey)}</span>
                      <span className="relative mt-1 block h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                        <motion.span
                          className="absolute inset-y-0 left-0 origin-left rounded-full"
                          style={{ background: th.accent, width: `${(d.amount / (top?.amount || 1)) * 100}%` }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.3 + i * 0.06, duration: 0.9, ease: EASE_OUT }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[12.5px] font-medium tabular-nums">{formatMoney(d.amount, currency, lang, true)}</span>
                      <span className="block font-mono text-[10.5px] text-ink-3">{Math.round((d.amount / (total || 1)) * 100)}%</span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        </div>
      )}
      <p className="relative z-[1] mt-3 text-[11.5px] text-ink-3">{t('payments.disc.hint')}</p>
    </Card>
  )
}

// ───────────────────────── monthly spend / earnings bars ─────────────────────────

/** First moment the workspace has any money data (real or imported). */
export function earliestActivity(rows: InvoiceRow[], records: WorkRecord[]) {
  let min = Date.now()
  for (const r of rows) min = Math.min(min, ts(r.inv.issuedAt))
  for (const h of records) min = Math.min(min, h.createdAt)
  return min
}

export function MonthlyBarsCard({
  rows,
  records,
  discipline,
  title,
  paidLabel,
  openLabel,
  className,
}: {
  rows: InvoiceRow[]
  records: WorkRecord[]
  discipline: DisciplineFilter
  title: string
  paidLabel: string
  openLabel: string
  className?: string
}) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const [range, setRange] = useState<'6' | '12'>('12')
  const n = Number(range)
  const flow = useMemo(() => monthlyFlow(rows, records, discipline, n * 2), [rows, records, discipline, n])
  const cur = { paid: flow.paid.slice(n), open: flow.open.slice(n), buckets: flow.buckets.slice(n) }
  const prevTotal = sum(flow.paid.slice(0, n)) + sum(flow.open.slice(0, n))
  const hasPrev = useMemo(() => earliestActivity(rows, records) <= flow.buckets[0].start + 20 * 864e5, [rows, records, flow])
  const total = sum(cur.paid) + sum(cur.open)
  const avg = total / n
  const peak = cur.buckets.reduce((best, _b, i) => (cur.paid[i] + cur.open[i] > cur.paid[best] + cur.open[best] ? i : best), 0)
  const money = (v: number) => fmtMoney(v, currency, lang, 0)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        subtitle={t('payments.bars.subtitle', { avg: money(Math.round(avg)), month: fmt(cur.buckets[peak].date, 'MMMM', lang) })}
        icon={<TrendingUp className="size-5 text-ink-3" />}
        action={
          <Segmented<'6' | '12'>
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: t('payments.range.6m') },
              { value: '12', label: t('payments.range.12m') },
            ]}
          />
        }
      />
      <div className="relative z-[1] mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[30px] font-medium leading-none tracking-[-0.04em]">
          <AnimatedCounter value={total} currency={currency} />
        </span>
        {hasPrev && total + prevTotal > 0 && (
          <>
            <DeltaPill value={pctDelta(total, prevTotal)} />
            <span className="text-[12px] text-ink-3">{t('payments.bars.vsPrev', { count: n })}</span>
          </>
        )}
      </div>
      <div className="relative z-[1] mt-4 flex-1">
        {total === 0 ? (
          <EmptyState icon={<TrendingUp />} title={t('payments.bars.empty')} description={t('payments.earn.emptyBody')} className="py-10" />
        ) : (
        <BarChart
          labels={cur.buckets.map((b) => fmt(b.date, 'MMM', lang))}
          series={[
            { id: 'paid', label: paidLabel, data: cur.paid, color: 'var(--accent)' },
            { id: 'open', label: openLabel, data: cur.open, color: 'var(--ink)' },
          ]}
          mode="stacked"
          height={290}
          format={money}
          formatAxis={(v) => formatMoney(v, currency, lang, true)}
          ariaLabel={title}
        />
        )}
      </div>
    </Card>
  )
}

// ───────────────────────── cash-flow forecast ─────────────────────────

export function CashflowCard({
  rows,
  jobs,
  onOpenInvoice,
  onPay,
  className,
}: {
  rows: InvoiceRow[]
  jobs: Job[]
  onOpenInvoice: (row: InvoiceRow) => void
  onPay: (row: InvoiceRow) => void
  className?: string
}) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const currency = useApp((s) => s.settings.currency)
  const items = useMemo(() => upcomingPayments(rows, jobs, 30), [rows, jobs])
  const weeks = useMemo(() => cashflowWeeks(items, 5), [items])
  const total = sum(items.map((i) => i.amount))
  const money = (v: number) => fmtMoney(v, currency, lang, 0)
  const labels = [0, 1, 2, 3, 4].map((w) => (w === 0 ? t('payments.cash.thisWeek') : t('payments.cash.week', { n: w + 1 })))

  const open = (it: UpcomingItem) => {
    if (it.row) onOpenInvoice(it.row)
    else navigate(`/jobs/${it.jobId}`)
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('payments.cash.title')}
        subtitle={t('payments.cash.subtitle', { amount: money(total), count: items.length })}
        icon={<Wallet className="size-5 text-ink-3" />}
      />
      {items.length === 0 ? (
        <EmptyState icon={<CalendarClock />} title={t('payments.cash.empty')} description={t('payments.cash.emptyBody')} />
      ) : (
        <>
          <div className="relative z-[1] mt-3">
            <BarChart
              labels={labels}
              series={[
                { id: 'inv', label: t('payments.cash.invoices'), data: weeks.invoices, color: 'var(--ink)' },
                { id: 'ms', label: t('payments.cash.milestones'), data: weeks.milestones, color: 'var(--accent)' },
              ]}
              mode="stacked"
              height={150}
              showYAxis={false}
              format={money}
              ariaLabel={t('payments.cash.title')}
            />
          </div>
          <ul className="relative z-[1] mt-3 divide-y divide-[var(--line)]">
            {items.slice(0, 5).map((it, i) => {
              const d = new Date(it.at)
              return (
                <motion.li
                  key={it.id}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.45, ease: EASE_OUT }}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className={cn(
                      'flex w-11 shrink-0 flex-col items-center rounded-xl py-1 font-mono leading-none',
                      it.overdue ? 'bg-danger text-white' : 'bg-[var(--surface-2)] text-ink',
                    )}
                  >
                    <span className="text-[9.5px] uppercase opacity-70">{fmt(d, 'MMM', lang)}</span>
                    <span className="mt-0.5 text-[15px] font-semibold">{fmt(d, 'd', lang)}</span>
                  </span>
                  <button type="button" onClick={() => open(it)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-medium">{it.label}</span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      {it.kind === 'invoice' ? <Receipt className="size-3" /> : it.milestone?.status === 'escrow' ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                      <MonoId className="text-[11.5px]">{it.kind === 'invoice' ? it.id : it.jobId}</MonoId>
                      <span className="truncate">· {it.kind === 'invoice' ? t('payments.cash.invoice') : t(`payments.cash.ms.${it.milestone?.status ?? 'locked'}`)}</span>
                    </span>
                  </button>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[13px] font-medium tabular-nums">{money(it.amount)}</span>
                    {it.row && (
                      <button type="button" onClick={() => onPay(it.row!)} className="text-[11.5px] font-medium text-accent-text underline-offset-4 hover:underline">
                        {t('payments.action.payNow')}
                      </button>
                    )}
                  </span>
                </motion.li>
              )
            })}
          </ul>
          {items.length > 5 && <p className="relative z-[1] mt-1 text-center text-[12px] text-ink-3">{t('payments.cash.more', { count: items.length - 5 })}</p>}
        </>
      )}
    </Card>
  )
}

// ───────────────────────── monthly budget gauge ─────────────────────────

export function BudgetCard({ allRows, rows, className }: { allRows: InvoiceRow[]; rows: InvoiceRow[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const discipline = useApp((s) => s.settings.discipline)
  const budget = usePayPrefs((s) => s.budget)
  const setBudget = usePayPrefs((s) => s.setBudget)
  const now = new Date()
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  const spentOf = (list: InvoiceRow[]) => list.filter((r) => r.status !== 'draft' && ts(r.inv.issuedAt) >= m0).reduce((a, r) => a + r.inv.amount, 0)
  const spent = spentOf(allRows)
  const discSpent = discipline === 'all' ? null : spentOf(rows)
  const pct = Math.round((spent / (budget || 1)) * 100)
  const left = budget - spent
  const money = (v: number) => fmtMoney(v, currency, lang, 0)

  return (
    <Card variant="accent" className={cn('flex flex-col', className)}>
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[19px] font-medium tracking-[-0.02em]">
            <GaugeIcon className="size-5 opacity-70" />
            {t('payments.budget.title')}
          </h3>
          <p className="mt-0.5 truncate text-[13px] opacity-70">{t('payments.budget.subtitle', { month: fmt(now, 'MMMM', lang) })}</p>
        </div>
        <Menu
          width={280}
          trigger={({ onClick }) => (
            <motion.button
              type="button"
              onClick={onClick}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.06 }}
              aria-label={t('payments.budget.edit')}
              title={t('payments.budget.edit')}
              className="flex size-9 items-center justify-center rounded-full bg-[var(--accent-ink)]/10 transition-colors hover:bg-[var(--accent-ink)]/18"
            >
              <PencilLine className="size-4" />
            </motion.button>
          )}
        >
          {() => (
            <div className="p-3">
              <Slider
                label={t('payments.budget.edit')}
                value={budget}
                onChange={setBudget}
                min={2000}
                max={40000}
                step={500}
                format={(v) => fmtMoney(v, currency, lang, 0)}
                marks={[
                  { value: 2000, label: formatMoney(2000, currency, lang, true) },
                  { value: 20000, label: formatMoney(20000, currency, lang, true) },
                  { value: 40000, label: formatMoney(40000, currency, lang, true) },
                ]}
              />
            </div>
          )}
        </Menu>
      </div>
      <div className="relative z-[1] mt-2 flex flex-1 items-center justify-center">
        <Gauge
          value={Math.min(100, pct)}
          size={250}
          tone="ink"
          label={pct > 100 ? t('payments.budget.over', { pct: pct - 100 }) : t('payments.budget.used')}
          ariaLabel={t('payments.budget.title')}
        />
      </div>
      <div className="relative z-[1] mt-1 flex items-center justify-between gap-2 rounded-full bg-[var(--surface)] px-4 py-2 text-[12.5px] text-ink">
        <span className="truncate font-medium">{left >= 0 ? t('payments.budget.left', { amount: money(left) }) : t('payments.budget.overBy', { amount: money(-left) })}</span>
        <span className="shrink-0 font-mono text-ink-3">
          {money(spent)} / {formatMoney(budget, currency, lang, true)}
        </span>
      </div>
      <p className="relative z-[1] mt-2 text-center text-[11.5px] opacity-70">
        {discSpent !== null ? t('payments.budget.disc', { amount: money(discSpent), disc: t(`core.discipline.${discipline}`) }) : t('payments.budget.resets', { count: daysLeft })}
      </p>
    </Card>
  )
}

// ───────────────────────── small bits ─────────────────────────

export function SecurityStrip({ className }: { className?: string }) {
  const t = useT()
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-3', className)}>
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-success" />
        {t('payments.secure.escrow')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Lock className="size-3.5" />
        {t('payments.secure.pci')}
      </span>
    </div>
  )
}

