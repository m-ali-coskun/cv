import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useDiscipline, useRole } from '@/store/selectors'
import type { Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AreaChart } from '@/components/charts/AreaChart'
import { moneySeries, type MoneyRangeKey } from '../data'
import { usePrefs } from '../prefs'
import { Card } from '../ui'

/**
 * Client "Spend" (released milestones vs. budgets committed) / designer
 * "Earnings" (paid out vs. booked), by week or month. Deterministic history
 * fills the weeks before the workspace's first job.
 */
export function MoneyCard({ jobs, className }: { jobs: Job[]; className?: string }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const discipline = useDiscipline()
  const navigate = useNavigate()
  const currency = useApp((s) => s.settings.currency)
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn)
  const range = usePrefs((s) => s.moneyRange)
  const setPrefs = usePrefs((s) => s.set)
  const m = useMemo(() => moneySeries(jobs, range, `${role}-${discipline}`, weekStartsOn), [jobs, range, role, discipline, weekStartsOn])

  const labels = m.buckets.map((b) => (range === '12w' ? fmt(b.date, lang === 'en' ? 'MMM d' : 'd. MMM', lang) : fmt(b.date, 'MMM', lang)))
  const money = (v: number) => formatMoney(v, currency, lang)
  const compact = (v: number) => formatMoney(v, currency, lang, true)
  const isClient = role === 'client'
  const up = m.delta >= 0

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={isClient ? t('overview.money.spend') : t('overview.money.earnings')}
        subtitle={range === '12w' ? t('overview.money.weekly') : t('overview.money.monthly')}
        className="flex-wrap"
        action={
          <Segmented<MoneyRangeKey>
            size="sm"
            value={range}
            onChange={(v) => setPrefs({ moneyRange: v })}
            layoutId="overview-money-range"
            options={[
              { value: '12w', label: t('overview.money.12w') },
              { value: '6m', label: t('overview.money.6m') },
            ]}
          />
        }
      />
      <div className="relative z-[1] mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-[12.5px] text-ink-3">{isClient ? t('overview.money.paidOut') : t('overview.money.earned')}</p>
          <p className="mt-1 flex items-center gap-2.5">
            <span className="text-[34px] font-medium leading-none tracking-[-0.04em] text-ink">
              <AnimatedCounter value={m.totalPaid} currency={currency} />
            </span>
            <span
              className={cn(
                'inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-[11.5px] font-medium',
                up ? 'bg-accent text-accent-ink' : 'bg-danger-soft text-danger',
              )}
              title={t('overview.money.deltaHint')}
            >
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(m.delta)}%
            </span>
          </p>
        </div>
        <div>
          <p className="text-[12.5px] text-ink-3">{isClient ? t('overview.money.committed') : t('overview.money.booked')}</p>
          <p className="mt-1 text-[22px] font-medium leading-none tracking-[-0.03em] text-ink-2">
            <AnimatedCounter value={m.totalCommitted} currency={currency} />
          </p>
        </div>
      </div>
      <div className="relative z-[1] mt-4 flex-1">
        <AreaChart
          labels={labels}
          height={230}
          markIndex={labels.length - 1}
          format={money}
          formatAxis={compact}
          ariaLabel={isClient ? t('overview.money.spend') : t('overview.money.earnings')}
          onPointClick={() => navigate('/payments')}
          series={[
            { id: 'paid', label: isClient ? t('overview.money.paidOut') : t('overview.money.earned'), data: m.paid, color: 'var(--accent)' },
            { id: 'committed', label: isClient ? t('overview.money.committed') : t('overview.money.booked'), data: m.committed, color: 'var(--ink)', lineOnly: true, dashed: true },
          ]}
        />
      </div>
    </Card>
  )
}
