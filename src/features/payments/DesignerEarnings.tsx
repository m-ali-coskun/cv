import { useMemo, useState } from 'react'
import { ArrowDownToLine, BellRing, FilePlus2 } from 'lucide-react'
import { daysUntil, fmt } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import type { Invoice } from '@/store/types'
import { AiInsightsCard, type Insight } from '@/features/analytics/AiInsights'
import { DisciplineSpendCard, MonthlyBarsCard } from './ClientWidgets'
import { BalanceHero, EarningsChartCard, GoalCard, PayoutHistoryCard, TaxCard, TopCounterpartsCard } from './DesignerWidgets'
import { InvoiceBuilderModal, ReadyToInvoiceCard } from './CreateInvoice'
import { InvoiceFolders } from './Folders'
import { InvoicesCard } from './InvoicesCard'
import { PayoutModal } from './Payout'
import { useInvoiceFlows } from './flows'
import { usePayPrefs } from './local'
import { designerMoney, topCounterparts, uninvoicedJobs, useMoneyData, usePayouts } from './metrics'
import { money as fmtMoney, ts } from './model'

/*
 * xl = 12 columns:
 *   balance hero 5 │ earnings chart 7
 *   folders ························ 12
 *   invoices 8 (2 rows) │ ai 4
 *                       │ goal 4
 *   ready to invoice 7 │ tax 5
 *   top clients 5 │ payout history 7
 *   discipline donut 5 │ monthly bars 7
 */
const S = {
  full: 'md:col-span-2 xl:col-span-12',
  w8tall: 'md:col-span-2 xl:col-span-8 xl:row-span-2',
  w7: 'md:col-span-2 xl:col-span-7',
  w5: 'md:col-span-2 xl:col-span-5',
  w5half: 'md:col-span-1 xl:col-span-5',
  s4: 'md:col-span-1 xl:col-span-4',
}

export function DesignerEarnings() {
  const t = useT()
  const lang = useLang()
  const { rows, allRows, jobs, records, discipline, currency } = useMoneyData()
  const payouts = usePayouts()
  const goal = usePayPrefs((s) => s.goal)
  const reminded = usePayPrefs((s) => s.reminded)
  const money = useMemo(() => designerMoney(allRows, rows, jobs, records, payouts, discipline), [allRows, rows, jobs, records, payouts, discipline])
  const flows = useInvoiceFlows(rows, allRows)
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [builder, setBuilder] = useState<{ open: boolean; jobId?: string }>({ open: false })
  const fmtM = (v: number) => formatMoney(v, currency, lang)

  const uninvoiced = useMemo(() => uninvoicedJobs(jobs, allRows), [jobs, allRows])

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = []
    const od = rows.find((r) => r.status === 'overdue' && !(reminded[r.inv.id] && Date.now() - reminded[r.inv.id] < 60_000))
    if (od)
      out.push({
        id: 'overdue',
        color: 'var(--danger)',
        text: t('payments.ai.d.overdue', { id: od.inv.id, name: od.client?.name ?? '', count: Math.abs(daysUntil(od.inv.dueAt)) }),
        action: { label: t('payments.action.remind'), onClick: () => flows.actions.onRemind?.(od) },
      })
    if (uninvoiced.length)
      out.push({
        id: 'uninvoiced',
        color: 'var(--accent)',
        text: t('payments.ai.d.uninvoiced', { count: uninvoiced.length, amount: fmtM(uninvoiced.reduce((a, j) => a + j.budget, 0)) }),
        action: { label: t('payments.ready.new'), onClick: () => setBuilder({ open: true, jobId: uninvoiced[0].id }) },
      })
    const pct = Math.round((money.invoicedMonth / (goal || 1)) * 100)
    out.push({
      id: 'goal',
      color: 'var(--success)',
      text:
        pct >= 100
          ? t('payments.ai.d.goalDone', { month: fmt(new Date(), 'MMMM', lang) })
          : t('payments.ai.d.goal', { pct, amount: fmtMoney(Math.max(0, goal - money.invoicedMonth), currency, lang, 0), month: fmt(new Date(), 'MMMM', lang) }),
    })
    // fastest payer from real paid invoices
    const speed = new Map<string, { days: number; n: number }>()
    for (const r of allRows)
      if (r.status === 'paid' && r.inv.paidAt) {
        const cur = speed.get(r.counterpartId) ?? { days: 0, n: 0 }
        cur.days += (ts(r.inv.paidAt) - ts(r.inv.issuedAt)) / 864e5
        cur.n++
        speed.set(r.counterpartId, cur)
      }
    const fastest = [...speed.entries()].map(([id, v]) => ({ id, avg: v.days / v.n })).sort((a, b) => a.avg - b.avg)[0]
    const tops = topCounterparts(rows, records, discipline)
    if (tops[0] && tops[0].share > 35) {
      const c = allRows.find((r) => r.counterpartId === tops[0].id)?.client
      out.push({ id: 'concentration', color: 'var(--warning)', text: t('payments.ai.d.concentration', { name: c?.name ?? tops[0].id, pct: Math.round(tops[0].share) }) })
    } else if (fastest) {
      const c = allRows.find((r) => r.counterpartId === fastest.id)?.client
      out.push({ id: 'fastest', color: 'var(--info)', text: t('payments.ai.d.fastest', { name: c?.name ?? fastest.id, count: Math.max(1, Math.round(fastest.avg)) }) })
    }
    return out.slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, allRows, uninvoiced, money, goal, reminded, records, discipline, t, lang, currency])

  const overdueCount = rows.filter((r) => r.status === 'overdue').length
  const scrollToPayouts = () => document.getElementById('payouts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      <BalanceHero money={money} onPayout={() => setPayoutOpen(true)} onHistory={scrollToPayouts} className={S.w5} />
      <EarningsChartCard rows={rows} records={records} discipline={discipline} className={S.w7} />
      <InvoiceFolders rows={rows} active={flows.filter} onPick={flows.focusInvoices} className={S.full} />
      <InvoicesCard
        ref={flows.invoicesRef}
        rows={rows}
        filter={flows.filter}
        onFilter={flows.setFilter}
        highlightId={flows.highlight}
        className={S.w8tall}
        {...flows.actions}
        onPay={undefined}
        onRelease={undefined}
      />
      <AiInsightsCard
        name={t('payments.ai.nameDesigner')}
        headline={overdueCount ? t('payments.ai.d.headline', { count: overdueCount }) : t('payments.ai.d.calm')}
        insights={insights}
        primary={
          uninvoiced.length
            ? { label: t('payments.ready.new'), icon: <FilePlus2 className="size-4" />, onClick: () => setBuilder({ open: true, jobId: uninvoiced[0].id }) }
            : overdueCount
              ? {
                  label: t('payments.ai.chaseAll'),
                  icon: <BellRing className="size-4" />,
                  onClick: () => rows.filter((r) => r.status === 'overdue').forEach((r) => flows.actions.onRemind?.(r)),
                }
              : { label: t('payments.hero.payout'), icon: <ArrowDownToLine className="size-4" />, onClick: () => setPayoutOpen(true) }
        }
        className={S.s4}
      />
      <GoalCard money={money} className={S.s4} />
      <ReadyToInvoiceCard jobs={jobs} rows={allRows} onCreate={(jobId) => setBuilder({ open: true, jobId })} className={S.w7} />
      <TaxCard money={money} className={S.w5} />
      <TopCounterpartsCard rows={rows} records={records} discipline={discipline} className={S.w5half} />
      <PayoutHistoryCard id="payouts" payouts={payouts} records={records} onPayout={() => setPayoutOpen(true)} className={S.w7} />
      <DisciplineSpendCard rows={allRows} records={records} title={t('payments.disc.titleEarn')} className={S.w5} />
      <MonthlyBarsCard
        rows={rows}
        records={records}
        discipline={discipline}
        title={t('payments.bars.titleEarn')}
        paidLabel={t('payments.bars.received')}
        openLabel={t('payments.bars.outstanding')}
        className={S.w7}
      />
      <PayoutModal open={payoutOpen} onClose={() => setPayoutOpen(false)} balance={money.balance} />
      <InvoiceBuilderModal
        open={builder.open}
        jobId={builder.jobId}
        onClose={() => setBuilder({ open: false })}
        onCreated={(inv: Invoice) => flows.highlightInvoice(inv.id)}
      />
      {flows.modals}
    </>
  )
}
