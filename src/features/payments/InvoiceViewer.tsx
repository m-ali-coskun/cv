import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BellRing, Copy, CreditCard, ExternalLink, LockOpen, Printer } from 'lucide-react'
import { fmt } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { prng } from '@/lib/random'
import { useLang, useT } from '@/i18n'
import { useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { disciplineTheme } from '@/theme/disciplines'
import { paymentReference, type InvoiceRow } from './model'
import { InvoiceStatusPill } from './ui'

export const VAT_RATE = 0.19

/** Deterministic QR-looking matrix (finder squares + seeded modules). */
function QrBlock({ seed, size = 108 }: { seed: string; size?: number }) {
  const cells = useMemo(() => {
    const n = 25
    const r = prng(`qr-${seed}`)
    const out: [number, number][] = []
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && r.bool(0.48)) out.push([x, y])
    return out
  }, [seed])
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={1.4} fill="#0b0b0c" />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={1} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.6} fill="#0b0b0c" />
    </g>
  )
  return (
    <svg viewBox="-1 -1 27 27" width={size} height={size} role="img" aria-label="QR code" className="shrink-0">
      <rect x={-1} y={-1} width={27} height={27} rx={2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.22} fill="#0b0b0c" />
      ))}
      {finder(0, 0)}
      {finder(18, 0)}
      {finder(0, 18)}
    </svg>
  )
}

const PRINT_CSS = `
@media screen { #dt-print-root { display: none !important; } }
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body > *:not(#dt-print-root) { display: none !important; }
  #dt-print-root { display: block !important; }
  #dt-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #dt-print-root .dt-invoice-sheet { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; max-width: none !important; }
}`

/** Print only the invoice sheet: clone it into a print root and hide everything else. */
export function printInvoice(sheet: HTMLElement | null) {
  if (!sheet) return
  if (!document.getElementById('dt-print-style')) {
    const style = document.createElement('style')
    style.id = 'dt-print-style'
    style.textContent = PRINT_CSS
    document.head.appendChild(style)
  }
  document.getElementById('dt-print-root')?.remove()
  const root = document.createElement('div')
  root.id = 'dt-print-root'
  root.appendChild(sheet.cloneNode(true))
  document.body.appendChild(root)
  const cleanup = () => {
    root.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 1500)
}

/** The paper itself — light "real" invoice, also used for printing. */
export function InvoiceSheet({ row }: { row: InvoiceRow }) {
  const t = useT()
  const lang = useLang()
  const { inv, designer, client, job } = row
  const money = (v: number) => formatMoney(v, inv.currency, lang)
  const net = inv.amount / (1 + VAT_RATE)
  const vat = inv.amount - net
  const date = (d?: string) => (d ? fmt(d, lang === 'en' ? 'MMM d, yyyy' : 'd. MMM yyyy', lang) : '—')
  const stamp =
    row.status === 'paid'
      ? { text: t('payments.viewer.stampPaid'), color: '#1f9d55' }
      : row.status === 'overdue'
        ? { text: t('payments.viewer.stampOverdue'), color: '#e5484d' }
        : row.status === 'escrow'
          ? { text: t('payments.viewer.stampEscrow'), color: '#3e6ef7' }
          : row.status === 'draft'
            ? { text: t('payments.viewer.stampVoid'), color: '#8b8b93' }
            : null
  const accent = job ? disciplineTheme(job.discipline).accent : '#C9F158'
  const L = 'text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8b8b93]'

  return (
    <div className="dt-invoice-sheet relative mx-auto w-full max-w-[760px] overflow-hidden rounded-[18px] bg-white p-5 text-[#0b0b0c] shadow-[0_1px_0_rgba(0,0,0,.04),0_30px_60px_-30px_rgba(0,0,0,.45)] ring-1 ring-black/5 sm:p-9">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 40%, #0b0b0c))` }} />
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-[#0b0b0c] text-[15px] font-semibold tracking-[-0.04em]" style={{ color: accent }}>
            dT
          </span>
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.02em]">designTab</p>
            <p className="text-[11.5px] text-[#8b8b93]">{t('payments.viewer.platform')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[26px] font-medium leading-none tracking-[-0.03em] sm:text-[32px]">{t('payments.viewer.invoice')}</p>
          <p className="mt-1.5 font-mono text-[13px] text-[#4b4b52]">{inv.id}</p>
        </div>
      </div>

      {stamp && (
        <motion.div
          initial={{ opacity: 0, scale: 2.2, rotate: -24 }}
          animate={{ opacity: 0.9, scale: 1, rotate: -12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.35 }}
          className="pointer-events-none absolute right-[8%] top-[118px] rounded-[10px] border-[3px] px-3 py-1 font-mono text-[18px] font-bold tracking-[0.18em] sm:right-[30%] sm:top-[44px] sm:text-[22px]"
          style={{ color: stamp.color, borderColor: stamp.color, mixBlendMode: 'multiply' }}
          aria-hidden
        >
          {stamp.text}
        </motion.div>
      )}

      {/* parties + meta */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <p className={L}>{t('payments.viewer.from')}</p>
          <p className="mt-2 text-[14px] font-semibold">{designer?.name ?? inv.designerId}</p>
          {designer && (
            <>
              <p className="text-[12.5px] text-[#4b4b52]">{designer.handle}</p>
              <p className="text-[12.5px] text-[#4b4b52]">{designer.location}</p>
            </>
          )}
        </div>
        <div>
          <p className={L}>{t('payments.viewer.billTo')}</p>
          <p className="mt-2 text-[14px] font-semibold">{client?.name ?? inv.clientId}</p>
          {client && (
            <>
              <p className="text-[12.5px] text-[#4b4b52]">
                {client.contactName} · {client.contactRole}
              </p>
              <p className="text-[12.5px] text-[#4b4b52]">{client.location}</p>
              <p className="truncate text-[12.5px] text-[#4b4b52]">{client.website.replace(/^https?:\/\//, '')}</p>
            </>
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px] sm:justify-self-end">
          <dt className="text-[#8b8b93]">{t('payments.viewer.issued')}</dt>
          <dd className="text-right font-mono">{date(inv.issuedAt)}</dd>
          <dt className="text-[#8b8b93]">{t('payments.viewer.due')}</dt>
          <dd className="text-right font-mono">{date(inv.dueAt)}</dd>
          {inv.paidAt && (
            <>
              <dt className="text-[#8b8b93]">{t('payments.viewer.paidOn')}</dt>
              <dd className="text-right font-mono">{date(inv.paidAt)}</dd>
            </>
          )}
          <dt className="text-[#8b8b93]">{t('payments.viewer.job')}</dt>
          <dd className="text-right font-mono">{inv.jobId}</dd>
          <dt className="text-[#8b8b93]">{t('payments.viewer.terms')}</dt>
          <dd className="text-right font-mono">{t('payments.viewer.net14')}</dd>
        </dl>
      </div>

      {job && (
        <p className="mt-6 rounded-xl bg-[#f3f3f5] px-4 py-2.5 text-[12.5px] text-[#4b4b52]">
          <span className="font-medium text-[#0b0b0c]">{t('payments.viewer.project')}:</span> {job.title}
        </p>
      )}

      {/* line items */}
      <table className="mt-6 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className={`${L} w-8 pb-2 font-semibold`}>#</th>
            <th className={`${L} pb-2 font-semibold`}>{t('payments.viewer.description')}</th>
            <th className={`${L} hidden pb-2 text-right font-semibold sm:table-cell`}>{t('payments.viewer.qty')}</th>
            <th className={`${L} pb-2 text-right font-semibold`}>{t('payments.viewer.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {inv.lineItems.map((li, i) => (
            <motion.tr
              key={i}
              className="border-b border-black/[.06]"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <td className="py-3 font-mono text-[12px] text-[#8b8b93]">{String(i + 1).padStart(2, '0')}</td>
              <td className="py-3 pr-3">{li.label}</td>
              <td className="hidden py-3 text-right font-mono sm:table-cell">1</td>
              <td className="py-3 text-right font-mono tabular-nums">{money(li.amount)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      {/* totals */}
      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-[300px] space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[#4b4b52]">{t('payments.viewer.net')}</dt>
            <dd className="font-mono tabular-nums">{money(net)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#4b4b52]">{t('payments.viewer.vat', { rate: Math.round(VAT_RATE * 100) })}</dt>
            <dd className="font-mono tabular-nums">{money(vat)}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-[#0b0b0c] pt-2.5">
            <dt className="font-semibold">{row.status === 'paid' ? t('payments.viewer.totalPaid') : t('payments.viewer.totalDue')}</dt>
            <dd className="font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">{money(inv.amount)}</dd>
          </div>
        </dl>
      </div>

      {/* payment info */}
      <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-black/[.07] p-4 sm:flex-row sm:items-center">
        <QrBlock seed={inv.id} />
        <div className="min-w-0 flex-1 text-[12.5px]">
          <p className={L}>{t('payments.viewer.howToPay')}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-[#8b8b93]">{t('payments.viewer.beneficiary')}</dt>
            <dd className="truncate">designTab Escrow · {designer?.name ?? ''}</dd>
            <dt className="text-[#8b8b93]">IBAN</dt>
            <dd className="font-mono">DE00 0000 0000 0000 0000 00</dd>
            <dt className="text-[#8b8b93]">{t('payments.viewer.reference')}</dt>
            <dd className="font-mono">{paymentReference(inv.id)}</dd>
          </dl>
          <p className="mt-2 text-[11.5px] text-[#8b8b93]">{t('payments.viewer.scan')}</p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-3 border-t border-black/[.07] pt-4 text-[11.5px] text-[#8b8b93]">
        <p>{t('payments.viewer.thanks')}</p>
        <p className="font-mono">designtab.app · {inv.id}</p>
      </div>
    </div>
  )
}

export function InvoiceViewer({
  row,
  open,
  onClose,
  onPay,
  onRelease,
  onRemind,
}: {
  row: InvoiceRow | null
  open: boolean
  onClose: () => void
  onPay?: (row: InvoiceRow) => void
  onRelease?: (row: InvoiceRow) => void
  onRemind?: (row: InvoiceRow) => void
}) {
  const t = useT()
  const role = useRole()
  const navigate = useNavigate()
  const sheetRef = useRef<HTMLDivElement>(null)
  const payable = row && (row.status === 'pending' || row.status === 'overdue')

  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      size="lg"
      title={
        row ? (
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{row.inv.id}</span>
            <InvoiceStatusPill status={row.status} />
          </span>
        ) : null
      }
      description={row?.job?.title}
      footer={
        row ? (
          <>
            <div className="mr-auto flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy className="size-4" />}
                onClick={() => {
                  navigator.clipboard?.writeText(row.inv.id).catch(() => undefined)
                  toast({ title: t('payments.viewer.copied', { id: row.inv.id }), tone: 'success' })
                }}
              >
                {t('core.action.copy')}
              </Button>
              {row.job && (
                <Button variant="ghost" size="sm" icon={<ExternalLink className="size-4" />} onClick={() => navigate(`/jobs/${row.inv.jobId}`)}>
                  {t('payments.viewer.openJob')}
                </Button>
              )}
            </div>
            <Button variant="outline" icon={<Printer className="size-4" />} onClick={() => printInvoice(sheetRef.current?.firstElementChild as HTMLElement | null)}>
              {t('payments.viewer.print')}
            </Button>
            {role === 'client' && payable && onPay && (
              <Button icon={<CreditCard className="size-4" />} onClick={() => onPay(row)}>
                {t('payments.action.payNow')}
              </Button>
            )}
            {role === 'client' && row.status === 'escrow' && onRelease && (
              <Button variant="accent" icon={<LockOpen className="size-4" />} onClick={() => onRelease(row)}>
                {t('payments.action.release')}
              </Button>
            )}
            {role === 'designer' && payable && onRemind && (
              <Button icon={<BellRing className="size-4" />} onClick={() => onRemind(row)}>
                {t('payments.action.remind')}
              </Button>
            )}
          </>
        ) : null
      }
    >
      {row && (
        <div ref={sheetRef} className="-mx-2 rounded-[22px] bg-[var(--surface-2)] p-2 sm:mx-0 sm:p-4">
          <InvoiceSheet row={row} />
        </div>
      )}
    </Modal>
  )
}
