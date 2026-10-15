import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LockOpen } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { fireConfetti, fireEmoji } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { InvoiceViewer } from './InvoiceViewer'
import { PayModal } from './PayFlow'
import { usePayPrefs } from './local'
import type { InvoiceRow } from './model'
import type { InvoiceActions, InvoiceFilter } from './InvoicesCard'

/**
 * Shared invoice interactions for both roles: viewer, pay sheet, release
 * (with confirm), reminders, filter + scroll-to-table and row highlighting.
 */
export function useInvoiceFlows(rows: InvoiceRow[], allRows: InvoiceRow[]) {
  const t = useT()
  const lang = useLang()
  const payInvoice = useApp((s) => s.payInvoice)
  const releaseMilestone = useApp((s) => s.releaseMilestone)
  const sendInvoiceReminder = useApp((s) => s.sendInvoiceReminder)
  const markReminded = usePayPrefs((s) => s.markReminded)
  const [confirm, confirmDialog] = useConfirm()
  const [filter, setFilter] = useState<InvoiceFilter>('all')
  const [viewId, setViewId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const invoicesRef = useRef<HTMLDivElement>(null)

  const find = useCallback((id: string | null) => (id ? (rows.find((r) => r.inv.id === id) ?? allRows.find((r) => r.inv.id === id) ?? null) : null), [rows, allRows])
  const viewRow = useMemo(() => find(viewId), [find, viewId])
  const payRow = useMemo(() => find(payId), [find, payId])

  useEffect(() => {
    if (!highlight) return
    const id = window.setTimeout(() => setHighlight(null), 2600)
    return () => window.clearTimeout(id)
  }, [highlight])

  const scrollToInvoices = () => window.setTimeout(() => invoicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)

  const focusInvoices = (f: InvoiceFilter) => {
    setFilter(f)
    scrollToInvoices()
  }

  const highlightInvoice = (id: string) => {
    setFilter('all')
    setHighlight(id)
    scrollToInvoices()
  }

  const onOpen = (row: InvoiceRow) => setViewId(row.inv.id)

  const onPay = (row: InvoiceRow) => {
    setViewId(null)
    setPayId(row.inv.id)
  }

  const onRelease = async (row: InvoiceRow) => {
    const job = row.job
    const held = job?.milestones.filter((m) => m.status === 'escrow') ?? []
    const amount = held.length ? held.reduce((a, m) => a + m.amount, 0) : row.inv.amount
    const name = row.designer?.name ?? ''
    const ok = await confirm({
      title: t('payments.release.title', { amount: formatMoney(amount, row.inv.currency, lang), name }),
      description: t('payments.release.body', { id: row.inv.id }),
      confirmLabel: t('payments.release.cta'),
      icon: <LockOpen />,
    })
    if (!ok) return
    if (job) for (const m of held) releaseMilestone(job.id, m.id)
    payInvoice(row.inv.id)
    setViewId(null)
    fireEmoji('💸', { particleCount: 18, origin: { x: 0.5, y: 0.5 } })
    fireConfetti({ particleCount: 120, origin: { x: 0.5, y: 0.55 } })
    toast({ title: t('payments.release.done', { amount: formatMoney(amount, row.inv.currency, lang) }), description: `${row.inv.id} · ${name}`, tone: 'success', avatarSeed: row.designer?.avatarSeed })
  }

  const onRemind = (row: InvoiceRow) => {
    sendInvoiceReminder(row.inv.id)
    markReminded(row.inv.id)
    toast({
      title: t('payments.remind.sent', { name: row.client?.name ?? '' }),
      description: t('payments.remind.body', { id: row.inv.id }),
      tone: 'info',
      avatarSeed: row.client?.avatarSeed,
    })
  }

  const actions: InvoiceActions = { onOpen, onPay, onRelease, onRemind }

  const modals = (
    <>
      <InvoiceViewer row={viewRow} open={!!viewRow} onClose={() => setViewId(null)} onPay={onPay} onRelease={onRelease} onRemind={onRemind} />
      <PayModal row={payRow} open={!!payId} onClose={() => setPayId(null)} onViewInvoice={(r) => { setPayId(null); setViewId(r.inv.id) }} />
      {confirmDialog}
    </>
  )

  return { filter, setFilter, focusInvoices, highlightInvoice, highlight, actions, modals, invoicesRef }
}
