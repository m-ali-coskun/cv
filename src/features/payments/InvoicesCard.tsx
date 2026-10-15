import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpDown, BellRing, ChevronDown, CreditCard, Download, FileText, Loader2, LockOpen, Receipt, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { dueLabel, shortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { CardHeader } from '@/components/ui/Glass'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePayPrefs } from './local'
import { downloadText, invoicesCsv, sortRows, ts, type InvoiceRow } from './model'
import { Card, DisciplineDot, InvoiceStatusPill, MonoId, PersonAvatar } from './ui'
import type { InvoiceStatus } from '@/store/types'

export type InvoiceFilter = 'all' | InvoiceStatus
type SortKey = 'smart' | 'due' | 'amount' | 'issued'

export interface InvoiceActions {
  onOpen: (row: InvoiceRow) => void
  onPay?: (row: InvoiceRow) => void
  onRelease?: (row: InvoiceRow) => void
  onRemind?: (row: InvoiceRow) => void
}

const PAGE = 10

export const InvoicesCard = forwardRef<
  HTMLDivElement,
  InvoiceActions & {
    rows: InvoiceRow[]
    filter: InvoiceFilter
    onFilter: (f: InvoiceFilter) => void
    highlightId?: string | null
    className?: string
  }
>(function InvoicesCard({ rows, filter, onFilter, highlightId, className, ...actions }, ref) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const currency = useApp((s) => s.settings.currency)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('smart')
  const [showAll, setShowAll] = useState(false)

  const counts = useMemo(() => {
    const c: Record<InvoiceFilter, number> = { all: rows.length, pending: 0, overdue: 0, escrow: 0, paid: 0, draft: 0 }
    for (const r of rows) c[r.status]++
    return c
  }, [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows.filter((r) => filter === 'all' || r.status === filter)
    if (q)
      list = list.filter((r) =>
        [r.inv.id, r.inv.jobId, r.job?.title, r.counterpart?.name, ...r.inv.lineItems.map((l) => l.label)].some((s) => s?.toLowerCase().includes(q)),
      )
    if (sort === 'smart') return sortRows(list)
    return [...list].sort((a, b) =>
      sort === 'amount' ? b.inv.amount - a.inv.amount : sort === 'due' ? ts(a.inv.dueAt) - ts(b.inv.dueAt) : ts(b.inv.issuedAt) - ts(a.inv.issuedAt),
    )
  }, [rows, filter, query, sort])

  const open = rows.filter((r) => r.status === 'pending' || r.status === 'overdue').reduce((a, r) => a + r.inv.amount, 0)
  const shown = showAll ? visible : visible.slice(0, PAGE)
  const filters: InvoiceFilter[] = ['all', 'pending', 'overdue', 'escrow', 'paid', 'draft']

  const exportCsv = () => {
    downloadText(`designtab-invoices-${new Date().toISOString().slice(0, 10)}.csv`, invoicesCsv(visible, role))
    toast({ title: t('payments.invoices.exported', { count: visible.length }), tone: 'success' })
  }

  return (
    <Card ref={ref} className={cn('flex scroll-mt-24 flex-col', className)} id="invoices">
      <CardHeader
        title={t('payments.invoices.title')}
        subtitle={t('payments.invoices.subtitle', { count: rows.length, amount: formatMoney(open, currency, lang) })}
        action={
          <>
            <Menu
              width={200}
              trigger={({ onClick }) => (
                <IconButton label={t('payments.invoices.sort')} variant="soft" size="sm" onClick={onClick}>
                  <ArrowUpDown className="size-4" />
                </IconButton>
              )}
              items={(['smart', 'due', 'amount', 'issued'] as SortKey[]).map((k) => ({
                label: t(`payments.sort.${k}`),
                active: sort === k,
                onClick: () => setSort(k),
              }))}
            />
            <IconButton label={t('payments.invoices.export')} variant="soft" size="sm" onClick={exportCsv}>
              <Download className="size-4" />
            </IconButton>
          </>
        }
      />
      <div className="relative z-[1] mt-4 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="no-scrollbar -mx-1 min-w-0 overflow-x-auto px-1 lg:flex-1">
          <Segmented<InvoiceFilter>
            size="sm"
            value={filter}
            onChange={(f) => {
              onFilter(f)
              setShowAll(false)
            }}
            layoutId={`inv-filter-${role}`}
            options={filters.map((f) => ({ value: f, label: f === 'all' ? t('payments.filter.all') : t(`payments.status.${f}`), count: counts[f] }))}
          />
        </div>
        <label className="relative flex h-9 w-full items-center gap-2 rounded-full bg-[var(--surface-2)] px-3.5 text-[13px] lg:w-56">
          <Search className="size-4 shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('payments.invoices.search')}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
            aria-label={t('payments.invoices.search')}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setQuery('')}
                className="rounded-full p-0.5 text-ink-3 hover:text-ink"
                aria-label={t('core.action.reset')}
              >
                <X className="size-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </label>
      </div>

      {/* table head (desktop) */}
      <div className="relative z-[1] mt-4 hidden grid-cols-[76px_minmax(0,1fr)_92px_104px_80px_132px] items-center gap-3 rounded-2xl bg-[var(--surface-2)] px-3 py-2.5 text-[12px] font-medium text-ink-3 lg:grid">
        <span>{t('payments.col.id')}</span>
        <span>
          {t('payments.col.job')} · {role === 'client' ? t('core.common.designer') : t('core.common.client')}
        </span>
        <span className="text-right">{t('payments.col.amount')}</span>
        <span>{t('core.common.status')}</span>
        <span>{t('payments.col.due')}</span>
        <span className="sr-only">{t('payments.col.actions')}</span>
      </div>

      <div className="relative z-[1] mt-1 flex-1">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title={query ? t('payments.invoices.noMatch') : t('payments.invoices.emptyTitle')}
            description={query ? t('payments.invoices.noMatchHint') : t('payments.invoices.emptyBody')}
            action={
              (query || filter !== 'all') && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    onFilter('all')
                  }}
                >
                  {t('payments.invoices.clear')}
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((r, i) => (
                <InvoiceListRow key={r.inv.id} row={r} index={i} highlight={highlightId === r.inv.id} {...actions} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      {visible.length > PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="relative z-[1] mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
        >
          {showAll ? t('payments.invoices.showLess') : t('payments.invoices.showAll', { count: visible.length })}
          <ChevronDown className={cn('size-3.5 transition-transform duration-300', showAll && 'rotate-180')} />
        </button>
      )}
    </Card>
  )
})

const InvoiceListRow = forwardRef<HTMLLIElement, InvoiceActions & { row: InvoiceRow; index: number; highlight?: boolean }>(function InvoiceListRow(
  { row, index, highlight, onOpen, onPay, onRelease, onRemind },
  ref,
) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const reminded = usePayPrefs((s) => s.reminded[row.inv.id])
  const liRef = useRef<HTMLDivElement>(null)
  const prev = useRef(row.status)
  const [flash, setFlash] = useState(false)
  const { inv, status } = row
  const waiting = role === 'designer' && !!reminded && Date.now() - reminded < 60_000 && (status === 'pending' || status === 'overdue')

  // celebrate a status flip to "paid" (e.g. the client paid after a reminder)
  useEffect(() => {
    if (prev.current !== status && status === 'paid') {
      setFlash(true)
      fireConfetti({ from: liRef.current, particleCount: 110, spread: 70 })
      const id = window.setTimeout(() => setFlash(false), 1600)
      prev.current = status
      return () => window.clearTimeout(id)
    }
    prev.current = status
  }, [status])

  const money = formatMoney(inv.amount, inv.currency, lang)
  const due = status === 'paid' && inv.paidAt ? shortDate(inv.paidAt, lang) : shortDate(inv.dueAt, lang)
  const dueHint =
    status === 'pending' || status === 'overdue' || status === 'escrow'
      ? dueLabel(inv.dueAt, lang)
      : status === 'paid' && inv.paidAt
        ? t('payments.invoices.paidIn', { count: Math.max(0, Math.round((new Date(inv.paidAt).getTime() - new Date(inv.issuedAt).getTime()) / 864e5)) })
        : null

  const primary = (() => {
    if (role === 'client') {
      if ((status === 'pending' || status === 'overdue') && onPay)
        return (
          <Button size="xs" icon={<CreditCard className="size-3.5" />} onClick={() => onPay(row)}>
            {t('payments.action.payNow')}
          </Button>
        )
      if (status === 'escrow' && onRelease)
        return (
          <Button size="xs" variant="soft" icon={<LockOpen className="size-3.5" />} onClick={() => onRelease(row)}>
            {t('payments.action.release')}
          </Button>
        )
      return (
        <Button size="xs" variant="ghost" icon={status === 'paid' ? <Receipt className="size-3.5" /> : <FileText className="size-3.5" />} onClick={() => onOpen(row)}>
          {status === 'paid' ? t('payments.action.receipt') : t('core.action.view')}
        </Button>
      )
    }
    if ((status === 'pending' || status === 'overdue') && onRemind)
      return waiting ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-2.5 text-[11.5px] font-medium text-ink-2">
          <Loader2 className="size-3.5 animate-spin" />
          {t('payments.action.waiting')}
        </span>
      ) : (
        <Button size="xs" variant={status === 'overdue' ? 'primary' : 'soft'} icon={<BellRing className="size-3.5" />} onClick={() => onRemind(row)}>
          {t('payments.action.remind')}
        </Button>
      )
    return (
      <Button size="xs" variant="ghost" icon={<FileText className="size-3.5" />} onClick={() => onOpen(row)}>
        {t('core.action.view')}
      </Button>
    )
  })()

  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: Math.min(index, 8) * 0.035, duration: 0.45, ease: [0.23, 1, 0.32, 1] } }}
      exit={{ opacity: 0, x: 20, filter: 'blur(4px)', transition: { duration: 0.18 } }}
      className="relative"
    >
      <div
        ref={liRef}
        className={cn(
          'group relative -mx-1 rounded-2xl px-1 transition-colors duration-500',
          flash || highlight ? 'bg-accent-soft' : 'hover:bg-[var(--surface-2)]/70',
          status === 'draft' && 'opacity-60',
        )}
      >
        {/* desktop row */}
        <div className="hidden grid-cols-[76px_minmax(0,1fr)_92px_104px_80px_132px] items-center gap-3 px-2 py-3 lg:grid">
          <button type="button" onClick={() => onOpen(row)} className="text-left">
            <MonoId className="text-ink underline-offset-4 group-hover:underline">{inv.id}</MonoId>
          </button>
          <button type="button" onClick={() => onOpen(row)} className="flex min-w-0 items-center gap-2.5 text-left">
            <PersonAvatar person={row.counterpart} size={30} />
            <span className="min-w-0">
              <span className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">{row.job?.title ?? inv.lineItems[0]?.label}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <DisciplineDot id={row.discipline} className="size-1.5" />
                <span className="truncate">{row.counterpart?.name}</span>
                <span>·</span>
                <MonoId className="shrink-0 text-[11.5px]">{inv.jobId}</MonoId>
              </span>
            </span>
          </button>
          <span className="text-right font-mono text-[13.5px] font-medium tabular-nums">{money}</span>
          <InvoiceStatusPill status={status} />
          <span className="min-w-0">
            <span className="block font-mono text-[12.5px] text-ink-2">{due}</span>
            {dueHint && <span className={cn('block truncate text-[11px]', status === 'overdue' ? 'text-danger' : 'text-ink-3')}>{dueHint}</span>}
          </span>
          <span className="flex items-center justify-end gap-1">
            {primary}
          </span>
        </div>

        {/* mobile card */}
        <div className="flex flex-col gap-3 px-2 py-3.5 lg:hidden">
          <button type="button" onClick={() => onOpen(row)} className="flex items-start gap-3 text-left">
            <PersonAvatar person={row.counterpart} size={36} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <MonoId className="text-ink">{inv.id}</MonoId>
                <DisciplineDot id={row.discipline} className="size-1.5" />
              </span>
              <span className="mt-0.5 block truncate text-[13.5px] font-medium text-ink">{row.job?.title ?? inv.lineItems[0]?.label}</span>
              <span className="block truncate text-[12px] text-ink-3">{row.counterpart?.name}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-[14px] font-medium tabular-nums">{money}</span>
              <span className={cn('mt-0.5 block font-mono text-[11.5px]', status === 'overdue' ? 'text-danger' : 'text-ink-3')}>{dueHint ?? due}</span>
            </span>
          </button>
          <div className="flex items-center justify-between gap-2">
            <InvoiceStatusPill status={status} size="xs" />
            <span className="flex items-center gap-1">{primary}</span>
          </div>
        </div>
      </div>
    </motion.li>
  )
})
