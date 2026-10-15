import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarPlus,
  Check,
  Clock,
  Crown,
  History,
  Landmark,
  Lock,
  PencilLine,
  Percent,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { fmt, shortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { DisciplineFilter } from '@/store/types'
import { CardHeader, Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Slider } from '@/components/ui/Slider'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AreaChart } from '@/components/charts'
import { item } from '@/lib/motion'
import type { WorkRecord } from '@/features/analytics/history'
import { usePayPrefs, type Payout } from './local'
import { historyPayouts, topCounterparts, type DesignerMoney } from './metrics'
import { money as fmtMoney, monthBuckets, moneySeries, pctDelta, sum, type InvoiceRow } from './model'
import { Card, DeltaPill, LiveDot, PersonAvatar, ShareBar } from './ui'
import { earliestActivity } from './ClientWidgets'

export const BANK_LABEL = 'Sparkasse •••• 4821'

// ───────────────────────── balance hero ─────────────────────────

export function BalanceHero({ money, onPayout, onHistory, className }: { money: DesignerMoney; onPayout: () => void; onHistory: () => void; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const now = new Date()
  const nextAuto = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const tiles = [
    { id: 'pending', label: t('payments.hero.pending'), value: money.pending, sub: t('payments.hero.pendingSub', { count: money.pendingCount }), icon: <Clock className="size-3.5" /> },
    { id: 'escrow', label: t('payments.hero.escrow'), value: money.escrow, sub: t('payments.hero.escrowSub', { count: money.escrowJobs }), icon: <Lock className="size-3.5" /> },
    { id: 'lifetime', label: t('payments.hero.lifetime'), value: money.lifetime, sub: t('payments.hero.lifetimeSub'), icon: <TrendingUp className="size-3.5" /> },
  ]
  return (
    <Glass variant="night" variants={item} spotlight tilt={3} className={cn('relative flex min-w-0 flex-col overflow-hidden p-5 text-on-night sm:p-6', className)}>
      {/* aurora */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 62%)' }}
        animate={{ x: [0, -40, 10, 0], y: [0, 30, -10, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-10 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--glow-2), transparent 65%)' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 10, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-[1] flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-white/70">
          <Wallet className="size-4" />
          {t('payments.hero.available')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-medium text-white/80">
          <LiveDot color="var(--accent)" />
          {t('payments.hero.live')}
        </span>
      </div>
      <div className="relative z-[1] mt-4 text-[clamp(42px,5.4vw,64px)] font-medium leading-none tracking-[-0.05em]">
        <AnimatedCounter value={money.balance} currency={currency} decimals={0} />
      </div>
      <p className="relative z-[1] mt-2.5 text-[12.5px] text-white/55">
        {t('payments.hero.to', { bank: BANK_LABEL })} · {t('payments.hero.nextAuto', { date: shortDate(nextAuto, lang) })}
      </p>
      <div className="relative z-[1] mt-5 flex flex-wrap gap-2">
        <Button variant="accent" icon={<ArrowDownToLine className="size-4" />} onClick={onPayout} disabled={money.balance <= 0}>
          {t('payments.hero.payout')}
        </Button>
        <Button variant="ghost" className="text-white/75 hover:bg-white/10 hover:text-white" icon={<History className="size-4" />} onClick={onHistory}>
          {t('payments.hero.history')}
        </Button>
      </div>
      <div className="relative z-[1] mt-auto grid grid-cols-3 gap-2 pt-6">
        {tiles.map((x, i) => (
          <motion.div
            key={x.id}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.35 + i * 0.08, duration: 0.55, ease: EASE_OUT }}
            whileHover={{ y: -3 }}
            className="min-w-0 rounded-[18px] bg-white/[.07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md"
          >
            <p className="flex items-center gap-1.5 truncate text-[11.5px] text-white/60">
              {x.icon}
              {x.label}
            </p>
            <p className="mt-1.5 truncate text-[clamp(16px,1.7vw,21px)] font-medium tracking-[-0.03em]">
              <AnimatedCounter value={x.value} currency={currency} compact={x.value >= 100000} />
            </p>
            <p className="mt-0.5 truncate text-[11px] text-white/45">{x.sub}</p>
          </motion.div>
        ))}
      </div>
    </Glass>
  )
}

// ───────────────────────── earnings chart ─────────────────────────

type Range = '3' | '6' | '12'

export function EarningsChartCard({ rows, records, discipline, className }: { rows: InvoiceRow[]; records: WorkRecord[]; discipline: DisciplineFilter; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const [range, setRange] = useState<Range>('6')
  const n = Number(range)
  const series = useMemo(() => moneySeries(rows, records, monthBuckets(n * 2), discipline), [rows, records, n, discipline])
  const paid = series.paid.slice(n)
  const booked = series.booked.slice(n)
  const buckets = series.buckets.slice(n)
  const total = sum(paid)
  const prev = sum(series.paid.slice(0, n))
  const hasPrev = useMemo(() => earliestActivity(rows, records) <= series.buckets[0].start + 20 * 864e5, [rows, records, series])
  const best = paid.reduce((b, v, i) => (v > paid[b] ? i : b), 0)
  const money = (v: number) => formatMoney(v, currency, lang)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('payments.earn.title')}
        subtitle={t('payments.earn.subtitle')}
        action={
          <Segmented<Range>
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '3', label: t('payments.range.3m') },
              { value: '6', label: t('payments.range.6m') },
              { value: '12', label: t('payments.range.12m') },
            ]}
          />
        }
      />
      <div className="relative z-[1] mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="text-[12px] text-ink-3">{t('payments.earn.earned')}</p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="text-[32px] font-medium leading-none tracking-[-0.04em]">
              <AnimatedCounter value={total} currency={currency} />
            </span>
            {hasPrev && (total > 0 || prev > 0) && <DeltaPill value={pctDelta(total, prev)} />}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="tile px-3 py-2">
            <p className="text-[11px] text-ink-3">{t('payments.earn.avg')}</p>
            <p className="font-mono text-[13px] font-medium tabular-nums">{money(Math.round(total / n))}</p>
          </div>
          <div className="tile px-3 py-2">
            <p className="text-[11px] text-ink-3">{t('payments.earn.best')}</p>
            <p className="font-mono text-[13px] font-medium tabular-nums">
              {fmt(buckets[best].date, 'MMM', lang)} · {formatMoney(paid[best], currency, lang, true)}
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-[1] mt-4 flex-1">
        {total === 0 && sum(booked) === 0 ? (
          <EmptyState icon={<TrendingUp />} title={t('payments.earn.empty')} description={t('payments.earn.emptyBody')} className="py-10" />
        ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={range}
            initial={{ opacity: 0, filter: 'blur(6px)', y: 6 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <AreaChart
              labels={buckets.map((b) => fmt(b.date, 'MMM', lang))}
              series={[
                { id: 'paid', label: t('payments.earn.earned'), data: paid, color: 'var(--accent)' },
                { id: 'booked', label: t('payments.earn.invoiced'), data: booked, color: 'var(--ink-3)', lineOnly: true, dashed: true },
              ]}
              height={240}
              format={money}
              formatAxis={(v) => formatMoney(v, currency, lang, true)}
              markIndex={buckets.length - 1}
              ariaLabel={t('payments.earn.title')}
            />
          </motion.div>
        </AnimatePresence>
        )}
      </div>
    </Card>
  )
}

// ───────────────────────── monthly goal ─────────────────────────

export function GoalCard({ money, className }: { money: DesignerMoney; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const goal = usePayPrefs((s) => s.goal)
  const setGoal = usePayPrefs((s) => s.setGoal)
  const celebrated = usePayPrefs((s) => s.celebrated)
  const setCelebrated = usePayPrefs((s) => s.setCelebrated)
  const [editing, setEditing] = useState(false)
  const now = new Date()
  const key = `${now.getFullYear()}-${now.getMonth() + 1}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1)
  const invPct = Math.round((money.invoicedMonth / (goal || 1)) * 100)
  const colPct = Math.round((money.collectedMonth / (goal || 1)) * 100)
  const missing = Math.max(0, goal - money.invoicedMonth)
  const reached = money.invoicedMonth >= goal
  const fmtM = (v: number) => formatMoney(v, currency, lang)
  const money0 = (v: number) => fmtMoney(v, currency, lang, 0)

  useEffect(() => {
    if (!reached || celebrated === key) return
    const id = window.setTimeout(() => {
      fireConfetti({ particleCount: 160, origin: { x: 0.5, y: 0.45 } })
      toast({ title: t('payments.goal.reachedToast'), description: fmtM(money.invoicedMonth), tone: 'success' })
      setCelebrated(key)
    }, 900)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, celebrated, key])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('payments.goal.title')}
        subtitle={t('payments.goal.subtitle', { month: fmt(now, 'MMMM', lang) })}
        icon={<Target className="size-5 text-ink-3" />}
        action={
          <motion.button
            type="button"
            onClick={() => setEditing((e) => !e)}
            whileTap={{ scale: 0.9 }}
            aria-expanded={editing}
            aria-label={t('payments.goal.edit')}
            title={t('payments.goal.edit')}
            className={cn('flex size-8 items-center justify-center rounded-full transition-colors', editing ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface-2)] text-ink hover:bg-[var(--surface-3)]')}
          >
            {editing ? <Check className="size-4" /> : <PencilLine className="size-4" />}
          </motion.button>
        }
      />
      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="relative z-[1] overflow-hidden"
          >
            <div className="pt-4">
              <Slider
                label={t('payments.goal.target')}
                value={goal}
                onChange={setGoal}
                min={1000}
                max={30000}
                step={250}
                format={fmtM}
                marks={[
                  { value: 1000, label: formatMoney(1000, currency, lang, true) },
                  { value: 15000, label: formatMoney(15000, currency, lang, true) },
                  { value: 30000, label: formatMoney(30000, currency, lang, true) },
                ]}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-[1] mt-4 flex flex-1 flex-col items-center gap-5 sm:flex-row">
        <motion.div className="relative shrink-0" animate={reached ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.8, repeat: reached ? Infinity : 0, repeatDelay: 2.4 }}>
          <ProgressRing value={Math.min(100, invPct)} size={150} stroke={13} color="var(--accent)">
            <ProgressRing value={Math.min(100, colPct)} size={108} stroke={10} color="var(--ink)">
              <span className="flex flex-col items-center leading-none">
                <span className="text-[26px] font-medium tracking-[-0.04em]">
                  <AnimatedCounter value={invPct} suffix="%" />
                </span>
                <span className="mt-1 text-[10.5px] text-ink-3">{t('payments.goal.ofGoal')}</span>
              </span>
            </ProgressRing>
          </ProgressRing>
          {reached && (
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
              className="absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full bg-ink text-accent shadow-lg"
            >
              <Crown className="size-4.5" />
            </motion.span>
          )}
        </motion.div>
        <div className="w-full min-w-0 space-y-2.5">
          <GoalRow color="var(--accent)" label={t('payments.goal.invoiced')} value={money0(money.invoicedMonth)} />
          <GoalRow color="var(--ink)" label={t('payments.goal.collected')} value={money0(money.collectedMonth)} />
          <GoalRow color="var(--surface-3)" label={t('payments.goal.target')} value={money0(goal)} />
          <p className={cn('rounded-xl px-3 py-2 text-[12px]', reached ? 'bg-accent-soft text-accent-text' : 'bg-[var(--surface-2)] text-ink-2')}>
            {reached ? t('payments.goal.reached') : t('payments.goal.perDay', { amount: money0(Math.ceil(missing / daysLeft)), count: daysLeft })}
          </p>
        </div>
      </div>
    </Card>
  )
}

function GoalRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 truncate text-ink-2">{label}</span>
      <span className="font-mono font-medium tabular-nums">{value}</span>
    </div>
  )
}

// ───────────────────────── tax estimate ─────────────────────────

const TAX_DUE: [number, number][] = [
  [2, 10],
  [5, 10],
  [8, 10],
  [11, 10],
]

function nextTaxDue(now = new Date()) {
  for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++)
    for (const [m, d] of TAX_DUE) {
      const date = new Date(y, m, d, 12)
      if (date.getTime() > now.getTime()) return date
    }
  return new Date(now.getFullYear() + 1, 2, 10)
}

export function TaxCard({ money, className }: { money: DesignerMoney; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const addEvent = useApp((s) => s.addEvent)
  const events = useApp((s) => s.events)
  const rate = usePayPrefs((s) => s.taxRate)
  const setRate = usePayPrefs((s) => s.setTaxRate)
  const base = money.collectedYear
  const tax = Math.round(base * rate)
  const net = base - tax
  const due = nextTaxDue()
  const quartersElapsed = Math.floor(new Date().getMonth() / 3) + 1
  const quarterly = Math.round(tax / quartersElapsed)
  const remindTitle = 'Estimated tax payment'
  const already = events.some((e) => e.title === remindTitle && Math.abs(new Date(e.at).getTime() - due.getTime()) < 864e5)
  const fmtM = (v: number) => formatMoney(v, currency, lang)

  const remind = () => {
    if (already) return
    addEvent({ role: 'designer', title: remindTitle, at: due.toISOString(), durationMin: 30, kind: 'deadline' })
    toast({ title: t('payments.tax.added'), description: shortDate(due, lang), tone: 'success', link: '/calendar' })
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={t('payments.tax.title')} subtitle={t('payments.tax.subtitle', { year: new Date().getFullYear() })} icon={<PiggyBank className="size-5 text-ink-3" />} />
      <div className="relative z-[1] mt-4">
        <Slider
          label={
            <span className="inline-flex items-center gap-1.5">
              <Percent className="size-3.5" />
              {t('payments.tax.rate')}
            </span>
          }
          value={Math.round(rate * 100)}
          onChange={(v: number) => setRate(v / 100)}
          min={0}
          max={50}
          step={1}
          format={(v) => `${v}%`}
          marks={[0, 10, 20, 30, 40, 50]}
        />
      </div>
      <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2">
        <div className="tile min-w-0 p-3">
          <p className="truncate text-[11.5px] text-ink-3">{t('payments.tax.setAside')}</p>
          <p className="mt-1 truncate text-[22px] font-medium tracking-[-0.03em]">
            <AnimatedCounter value={tax} currency={currency} />
          </p>
        </div>
        <div className="tile min-w-0 p-3">
          <p className="truncate text-[11.5px] text-ink-3">{t('payments.tax.net')}</p>
          <p className="mt-1 truncate text-[22px] font-medium tracking-[-0.03em]">
            <AnimatedCounter value={net} currency={currency} />
          </p>
        </div>
      </div>
      <div className="relative z-[1] mt-3 h-2.5 overflow-hidden rounded-full bg-ink" aria-hidden>
        <motion.span
          className="stripes absolute inset-y-0 right-0 w-full origin-right bg-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: rate }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
        />
      </div>
      <p className="relative z-[1] mt-2 text-[11.5px] text-ink-3">{t('payments.tax.base', { amount: fmtM(base) })}</p>
      <div className="relative z-[1] mt-auto flex items-center gap-3 pt-4">
        <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-ink py-1.5 font-mono leading-none text-[var(--surface)]">
          <span className="text-[9.5px] uppercase opacity-70">{fmt(due, 'MMM', lang)}</span>
          <span className="mt-0.5 text-[16px] font-semibold">{fmt(due, 'd', lang)}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{t('payments.tax.next')}</p>
          <p className="truncate font-mono text-[12px] text-ink-3">≈ {fmtM(quarterly)}</p>
        </div>
        <Button size="xs" variant={already ? 'ghost' : 'soft'} icon={already ? <Check className="size-3.5" /> : <CalendarPlus className="size-3.5" />} onClick={remind} disabled={already}>
          {already ? t('payments.tax.inCalendar') : t('payments.tax.remind')}
        </Button>
      </div>
    </Card>
  )
}

// ───────────────────────── top clients ─────────────────────────

export function TopCounterpartsCard({ rows, records, discipline, className }: { rows: InvoiceRow[]; records: WorkRecord[]; discipline: DisciplineFilter; className?: string }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const currency = useApp((s) => s.settings.currency)
  const clients = useApp((s) => s.clients)
  const designers = useApp((s) => s.designers)
  const role = useApp((s) => s.settings.role)
  const list = useMemo(() => topCounterparts(rows, records, discipline), [rows, records, discipline])
  const top = list.slice(0, 5)
  const lead = list[0]

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={role === 'designer' ? t('payments.top.titleClients') : t('payments.top.titleDesigners')}
        subtitle={t('payments.top.subtitle', { count: list.length })}
        icon={<Users className="size-5 text-ink-3" />}
      />
      {top.length === 0 ? (
        <EmptyState icon={<Users />} title={t('payments.top.empty')} />
      ) : (
        <ul className="relative z-[1] mt-3 space-y-1">
          {top.map((c, i) => {
            const person = clients.find((x) => x.id === c.id) ?? designers.find((x) => x.id === c.id)
            return (
              <motion.li key={c.id} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.1 + i * 0.06, duration: 0.45, ease: EASE_OUT }}>
                <button
                  type="button"
                  onClick={() => navigate(`/network/${c.id}`)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="relative">
                    <PersonAvatar person={person} size={36} />
                    {i === 0 && (
                      <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-accent text-accent-ink shadow">
                        <Crown className="size-2.5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium">{person?.name ?? c.id}</span>
                      <span className="shrink-0 font-mono text-[12.5px] font-medium tabular-nums">{formatMoney(c.amount, currency, lang, true)}</span>
                    </span>
                    <ShareBar value={c.share} color={i === 0 ? 'var(--accent)' : 'var(--ink)'} delay={0.2 + i * 0.07} className="mt-1.5 h-1.5" />
                    <span className="mt-1 flex justify-between text-[11px] text-ink-3">
                      <span>{t('payments.top.jobs', { count: c.jobs })}</span>
                      <span className="font-mono">{Math.round(c.share)}%</span>
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </motion.li>
            )
          })}
        </ul>
      )}
      {lead && lead.share > 35 && role === 'designer' && (
        <p className="relative z-[1] mt-2 rounded-xl bg-warning-soft px-3 py-2 text-[12px] text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]">
          {t('payments.top.concentration', { pct: Math.round(lead.share) })}
        </p>
      )}
    </Card>
  )
}

// ───────────────────────── payout history ─────────────────────────

const ARRIVAL_MS = { instant: 30 * 60 * 1000, standard: 2 * 864e5 }

export function PayoutHistoryCard({ payouts, records, onPayout, className, id }: { payouts: Payout[]; records: WorkRecord[]; onPayout: () => void; className?: string; id?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const history = useMemo(() => historyPayouts(records, 5), [records])
  const now = Date.now()
  const items = [
    ...payouts.map((p) => {
      const arrival = new Date(p.at).getTime() + (p.instant ? ARRIVAL_MS.instant : ARRIVAL_MS.standard)
      return { id: p.id, at: new Date(p.at).getTime(), amount: p.amount - p.fee, fee: p.fee, kind: p.instant ? ('instant' as const) : ('standard' as const), arrived: arrival <= now, arrival }
    }),
    ...history.map((h) => ({ id: `auto-${h.at}`, at: h.at, amount: h.amount, fee: 0, kind: 'auto' as const, arrived: true, arrival: h.at + 864e5 })),
  ]
  const total = sum(items.map((i) => i.amount))

  return (
    <Card id={id} className={cn('flex scroll-mt-24 flex-col', className)}>
      <CardHeader
        title={t('payments.payouts.title')}
        subtitle={t('payments.payouts.subtitle', { amount: formatMoney(total, currency, lang), bank: BANK_LABEL })}
        icon={<Landmark className="size-5 text-ink-3" />}
        action={
          <Button size="sm" variant="soft" icon={<ArrowDownToLine className="size-4" />} onClick={onPayout}>
            <span className="hidden sm:inline">{t('payments.hero.payout')}</span>
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<Landmark />} title={t('payments.payouts.empty')} description={t('payments.payouts.emptyBody')} />
      ) : (
        <ul className="relative z-[1] mt-3 divide-y divide-[var(--line)]">
          <AnimatePresence initial={false}>
            {items.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: Math.min(i, 6) * 0.04, duration: 0.45, ease: EASE_OUT } }}
                className="flex items-center gap-3 py-2.5"
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                    p.kind === 'instant' ? 'bg-accent text-accent-ink' : p.kind === 'standard' ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface-2)] text-ink-2',
                  )}
                >
                  {p.kind === 'instant' ? <Zap className="size-4" /> : p.kind === 'standard' ? <ArrowDownToLine className="size-4" /> : <Landmark className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{t(`payments.payouts.kind.${p.kind}`)}</span>
                  <span className="block truncate font-mono text-[11.5px] text-ink-3">
                    {shortDate(new Date(p.at), lang)} · {fmt(new Date(p.at), 'HH:mm', lang)}
                    {p.fee > 0 && ` · ${t('payments.payouts.fee', { amount: formatMoney(p.fee, currency, lang) })}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[13.5px] font-medium tabular-nums">{formatMoney(p.amount, currency, lang)}</span>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 text-[10.5px] font-medium',
                      p.arrived ? 'bg-success-soft text-[color-mix(in_oklab,var(--success)_72%,var(--ink))]' : 'bg-warning-soft text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]',
                    )}
                  >
                    {p.arrived ? <Check className="size-2.5" strokeWidth={3} /> : <LiveDot color="var(--warning)" className="size-1.5" />}
                    {p.arrived ? t('payments.payouts.arrived') : t('payments.payouts.transit', { date: shortDate(new Date(p.arrival), lang) })}
                  </span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}
