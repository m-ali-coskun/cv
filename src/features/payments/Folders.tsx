import { useMemo } from 'react'
import { Check, Clock, Lock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { CardHeader } from '@/components/ui/Glass'
import { FolderCard } from '@/components/ui/FolderCard'
import type { InvoiceStatus } from '@/store/types'
import type { InvoiceRow } from './model'
import type { InvoiceFilter } from './InvoicesCard'
import { Card } from './ui'

const FOLDERS: { status: Exclude<InvoiceStatus, 'draft'>; color: string; icon: React.ReactNode }[] = [
  { status: 'pending', color: '#f5a524', icon: <Clock className="text-white" /> },
  { status: 'overdue', color: '#e5484d', icon: <TriangleAlert className="text-white" /> },
  { status: 'escrow', color: 'var(--accent)', icon: <Lock className="text-[var(--accent-ink)]" /> },
  { status: 'paid', color: '#2fb36b', icon: <Check className="text-white" /> },
]

/** One sheet of paper peeking out of a folder: a tiny invoice. */
function MiniInvoice({ row, tone }: { row: InvoiceRow; tone: string }) {
  const lang = useLang()
  return (
    <div className="flex size-full flex-col bg-white p-[9%] text-[#0b0b0c] dark:bg-[#f4f4f5]">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[8.5px] font-semibold">{row.inv.id}</span>
        <span className="size-1.5 rounded-full" style={{ background: tone }} />
      </div>
      <div className="mt-[7%] h-[3px] w-[70%] rounded-full bg-black/10" />
      <div className="mt-[5%] h-[3px] w-[48%] rounded-full bg-black/[.07]" />
      <div className="mt-auto flex items-end justify-between gap-1">
        <span className="font-mono text-[7.5px] text-black/45">{shortDate(row.inv.dueAt, lang)}</span>
        <span className="font-mono text-[10.5px] font-semibold tracking-[-0.02em]">{formatMoney(row.inv.amount, row.inv.currency, lang, true)}</span>
      </div>
    </div>
  )
}

/**
 * Invoice "folders" (rareui-style): hovering one tilts its glass flap open and
 * fans the newest invoices out; clicking filters the table below.
 */
export function InvoiceFolders({ rows, active, onPick, className }: { rows: InvoiceRow[]; active: InvoiceFilter; onPick: (f: InvoiceFilter) => void; className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const groups = useMemo(
    () =>
      FOLDERS.map((f) => {
        const list = rows.filter((r) => r.status === f.status)
        return { ...f, list, total: list.reduce((a, r) => a + r.inv.amount, 0) }
      }),
    [rows],
  )
  return (
    <Card className={cn('overflow-visible', className)}>
      <CardHeader title={t('payments.folders.title')} subtitle={t('payments.folders.subtitle')} />
      <div className="relative z-[1] mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-6">
        {groups.map((g) => (
          <div key={g.status} className="flex justify-center">
            <FolderCard
              size="sm"
              color={g.color}
              items={[]}
              icon={g.icon}
              selected={active === g.status}
              papers={g.list.length ? g.list.slice(0, 3).map((r) => <MiniInvoice key={r.inv.id} row={r} tone={g.color} />) : undefined}
              title={t(`payments.status.${g.status}`)}
              subtitle={`${t('payments.folders.count', { count: g.list.length })} · ${formatMoney(g.total, currency, lang, true)}`}
              onClick={() => onPick(active === g.status ? 'all' : g.status)}
              ariaLabel={`${t(`payments.status.${g.status}`)} — ${t('payments.folders.count', { count: g.list.length })}`}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
