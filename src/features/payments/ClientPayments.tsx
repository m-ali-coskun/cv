import { useMemo } from 'react'
import { CreditCard, Download } from 'lucide-react'
import { daysUntil } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { DISCIPLINE_IDS } from '@/store/types'
import { AiInsightsCard, type Insight } from '@/features/analytics/AiInsights'
import { BudgetCard, CashflowCard, ClientOverviewCard, DisciplineSpendCard, MonthlyBarsCard } from './ClientWidgets'
import { PaymentMethodsCard } from './Cards'
import { TopCounterpartsCard } from './DesignerWidgets'
import { EscrowCard } from './Escrow'
import { InvoiceFolders } from './Folders'
import { InvoicesCard } from './InvoicesCard'
import { useInvoiceFlows } from './flows'
import { byDiscipline, clientKpis, useMoneyData } from './metrics'
import { downloadText, invoicesCsv, money as fmtMoney, pctDelta, sum } from './model'

/*
 * xl = 12 columns · md = 2 columns · phones = 1 column (dense flow):
 *   overview 8 │ ai 4
 *   folders ··················· 12
 *   invoices 8 (2 rows) │ cards 4
 *                       │ budget 4
 *   escrow 7 (2 rows) │ discipline donut 5
 *                     │ top designers 5
 *   monthly 7 │ cash-flow 5
 */
const S = {
  full: 'md:col-span-2 xl:col-span-12',
  w8: 'md:col-span-2 xl:col-span-8',
  w8tall: 'md:col-span-2 xl:col-span-8 xl:row-span-2',
  w7: 'md:col-span-2 xl:col-span-7',
  w7tall: 'md:col-span-2 xl:col-span-7 xl:row-span-2',
  w5half: 'md:col-span-1 xl:col-span-5',
  w5: 'md:col-span-2 xl:col-span-5',
  s4: 'md:col-span-1 xl:col-span-4',
  s4wide: 'md:col-span-2 xl:col-span-4',
}

export function ClientPayments() {
  const t = useT()
  const lang = useLang()
  const setDiscipline = useApp((s) => s.setDiscipline)
  const { rows, allRows, jobs, records, discipline, currency, role } = useMoneyData()
  const kpis = useMemo(() => clientKpis(rows, jobs, records, discipline), [rows, jobs, records, discipline])
  const flows = useInvoiceFlows(rows, allRows)
  const money = (v: number) => fmtMoney(v, currency, lang, 0)

  const overdueRows = useMemo(() => rows.filter((r) => r.status === 'overdue'), [rows])

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = []
    const od = overdueRows[0]
    if (od)
      out.push({
        id: 'overdue',
        color: 'var(--danger)',
        text: t('payments.ai.c.overdue', { id: od.inv.id, name: od.designer?.name ?? '', count: Math.abs(daysUntil(od.inv.dueAt)) }),
        action: { label: t('payments.action.payNow'), onClick: () => flows.actions.onPay?.(od) },
      })
    const soon = jobs.flatMap((j) => j.milestones.filter((m) => m.status === 'escrow' && daysUntil(m.dueAt) <= 7))
    if (soon.length)
      out.push({
        id: 'escrow',
        color: 'var(--accent)',
        text: t('payments.ai.c.escrow', { count: soon.length, amount: money(sum(soon.map((m) => m.amount))) }),
        action: { label: t('payments.ai.review'), onClick: () => document.getElementById('escrow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      })
    const disc = byDiscipline(allRows, records)
    const total = sum(DISCIPLINE_IDS.map((d) => disc.amount[d])) || 1
    const top = [...DISCIPLINE_IDS].sort((a, b) => disc.amount[b] - disc.amount[a])[0]
    if (disc.amount[top] > 0)
      out.push({
        id: 'disc',
        color: 'var(--info)',
        text: t('payments.ai.c.disc', { disc: t(`core.discipline.${top}`), pct: Math.round((disc.amount[top] / total) * 100) }),
        action: discipline === top ? undefined : { label: t('payments.ai.focus'), onClick: () => setDiscipline(top) },
      })
    const d = pctDelta(kpis.paidMonth, kpis.paidPrevMonth)
    out.push({
      id: 'month',
      color: 'var(--success)',
      text: kpis.paidPrevMonth > 0 ? t('payments.ai.c.month', { amount: money(kpis.paidMonth), pct: Math.abs(d), dir: d >= 0 ? '↑' : '↓' }) : t('payments.ai.c.monthNew', { amount: money(kpis.paidMonth) }),
    })
    return out.slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdueRows, jobs, allRows, records, discipline, kpis, t, lang, currency])

  const exportStatement = () => {
    downloadText(`designtab-statement-${new Date().toISOString().slice(0, 10)}.csv`, invoicesCsv(rows, role))
    toast({ title: t('payments.invoices.exported', { count: rows.length }), tone: 'success' })
  }

  return (
    <>
      <ClientOverviewCard
        kpis={kpis}
        rows={rows}
        filter={flows.filter}
        onFilter={flows.focusInvoices}
        onPayOverdue={() => overdueRows[0] && flows.actions.onPay?.(overdueRows[0])}
        className={S.w8}
      />
      <AiInsightsCard
        name={t('payments.ai.name')}
        headline={kpis.overdueCount ? t('payments.ai.c.headline', { count: kpis.overdueCount + (insights.some((i) => i.id === 'escrow') ? 1 : 0) }) : t('payments.ai.c.calm')}
        insights={insights}
        primary={
          overdueRows[0]
            ? { label: t('payments.overview.payOverdue'), icon: <CreditCard className="size-4" />, onClick: () => flows.actions.onPay?.(overdueRows[0]) }
            : { label: t('payments.ai.statement'), icon: <Download className="size-4" />, onClick: exportStatement }
        }
        className={S.s4wide}
      />
      <InvoiceFolders rows={rows} active={flows.filter} onPick={flows.focusInvoices} className={S.full} />
      <InvoicesCard
        ref={flows.invoicesRef}
        rows={rows}
        filter={flows.filter}
        onFilter={flows.setFilter}
        highlightId={flows.highlight}
        className={S.w8tall}
        {...flows.actions}
        onRemind={undefined}
      />
      <PaymentMethodsCard className={S.s4} />
      <BudgetCard allRows={allRows} rows={rows} className={S.s4} />
      <div id="escrow" className={`scroll-mt-24 ${S.w7tall} grid`}>
        <EscrowCard />
      </div>
      <DisciplineSpendCard rows={allRows} records={records} title={t('payments.disc.titleSpend')} className={S.w5half} />
      <TopCounterpartsCard rows={rows} records={records} discipline={discipline} className={S.w5half} />
      <MonthlyBarsCard
        rows={rows}
        records={records}
        discipline={discipline}
        title={t('payments.bars.titleSpend')}
        paidLabel={t('payments.bars.paid')}
        openLabel={t('payments.bars.committed')}
        className={S.w7}
      />
      <CashflowCard rows={rows} jobs={jobs} onOpenInvoice={flows.actions.onOpen} onPay={(r) => flows.actions.onPay?.(r)} className={S.w5} />
      {flows.modals}
    </>
  )
}
