import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, BellRing, CircleDollarSign, Download, Landmark, Lock, ReceiptText, ShieldCheck, Timer, Unlock, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { fmt, shortDate } from '@/lib/dates'
import { fireEmoji } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Invoice, Milestone } from '@/store/types'
import { DonutChart } from '@/components/charts'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Pill } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useJobCtx } from '../context'
import { useDuration } from '../hooks'
import { downloadBlob, isClosed, moneyWhole, trackedSeconds } from '../model'
import { SectionTitle } from '../ui'

const MS_TONE = { locked: 'neutral', escrow: 'warning', released: 'success' } as const
const INV_TONE = { draft: 'neutral', pending: 'info', escrow: 'warning', paid: 'success', overdue: 'danger' } as const

export function PaymentsTab() {
  const t = useT()
  const lang = useLang()
  const dur = useDuration()
  const { job } = useJobCtx()
  const invoices = useApp((s) => s.invoices)
  const jobInvoices = invoices.filter((i) => i.jobId === job.id)
  const sum = (st: Milestone['status']) => job.milestones.filter((m) => m.status === st).reduce((n, m) => n + m.amount, 0)
  const released = sum('released')
  const escrow = sum('escrow')
  const locked = sum('locked')
  const unplanned = Math.max(0, job.budget - released - escrow - locked)
  const hours = trackedSeconds(job) / 3600
  const rate = hours > 0.25 ? job.budget / hours : 0
  const money = (v: number) => moneyWhole(v, job.currency, lang)

  const data = [
    { id: 'released', label: t('job.pay.released'), value: released, color: 'var(--success)' },
    { id: 'escrow', label: t('job.pay.escrow'), value: escrow, color: 'var(--accent)' },
    { id: 'locked', label: t('job.pay.locked'), value: locked, color: 'var(--ink-4)' },
    ...(unplanned ? [{ id: 'unplanned', label: t('job.pay.unplanned'), value: unplanned, color: 'var(--surface-3)' }] : []),
  ].filter((d) => d.value > 0)

  const tiles = [
    { icon: <CircleDollarSign />, label: t('core.common.budget'), value: job.budget, tone: 'night' },
    { icon: <ShieldCheck />, label: t('job.pay.escrow'), value: escrow, tone: 'accent' },
    { icon: <Landmark />, label: t('job.pay.released'), value: released, tone: 'tile' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="grid gap-4 @min-[700px]:grid-cols-[minmax(0,240px)_minmax(0,1fr)] @min-[700px]:items-center">
        <div className="mx-auto w-full max-w-[260px]">
          {data.length ? (
            <DonutChart data={data} size={220} thickness={24} format={money} centerLabel={t('job.pay.total')} legend="bottom" ariaLabel={t('job.pay.breakdown')} />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-full border-[24px] border-[var(--surface-2)] text-[13px] text-ink-3">{t('job.pay.none')}</div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div className="grid grid-cols-1 gap-2 @min-[520px]:grid-cols-3">
            {tiles.map((x, i) => (
              <motion.div
                key={x.label}
                className={cn('min-w-0 rounded-[20px] p-4', x.tone === 'night' ? 'bg-night text-on-night' : x.tone === 'accent' ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)]')}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.06, ...spring.smooth }}
              >
                <div className={cn('flex items-center gap-1.5 text-[12px] [&_svg]:size-3.5', x.tone === 'tile' ? 'text-ink-3' : 'opacity-70')}>
                  {x.icon}
                  {x.label}
                </div>
                <div className="mt-1.5 text-[24px] font-medium leading-none tracking-[-0.03em]">
                  <AnimatedCounter value={x.value} currency={job.currency} startOnView={false} />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[16px] bg-[var(--surface-2)] px-4 py-3 font-mono text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {t('job.pay.tracked', { time: dur(hours * 60) })}
            </span>
            <span>{rate ? t('job.pay.rate', { rate: money(Math.round(rate)) }) : t('job.pay.noRate')}</span>
            <span>{t('job.pay.paidPct', { pct: job.budget ? Math.round((released / job.budget) * 100) : 0 })}</span>
          </div>
        </div>
      </div>

      <Milestones />
      <Invoices invoices={jobInvoices} />
    </div>
  )
}

function Milestones() {
  const t = useT()
  const lang = useLang()
  const { job, side, canAct } = useJobCtx()
  const release = useApp((s) => s.releaseMilestone)
  const update = useApp((s) => s.updateJob)
  const addComment = useApp((s) => s.addComment)
  const money = (v: number) => moneyWhole(v, job.currency, lang)
  const clientCan = canAct && side === 'client' && !['declined', 'cancelled'].includes(job.status)
  const fund = (m: Milestone) => {
    update(job.id, { milestones: job.milestones.map((x) => (x.id === m.id ? { ...x, status: 'escrow' } : x)) })
    addComment(job.id, `Funded “${m.label}” into escrow (${money(m.amount)})`)
    toast({ title: t('job.pay.funded', { label: m.label }), description: money(m.amount), tone: 'success' })
  }
  const done = job.milestones.filter((m) => m.status === 'released').length

  return (
    <section>
      <SectionTitle icon={<Wallet />} title={t('job.pay.milestones')} sub={t('job.pay.milestonesSub', { done, total: job.milestones.length })} />
      {job.milestones.length === 0 ? (
        <p className="mt-3 rounded-[16px] border border-dashed border-line-2 px-4 py-3 text-[13px] text-ink-3">{t('job.pay.noMilestones')}</p>
      ) : (
        <ol className="relative mt-4 space-y-2">
          {job.milestones.map((m, i) => (
            <motion.li
              key={m.id}
              layout
              className="relative flex flex-wrap items-center gap-3 rounded-[20px] border border-line bg-[var(--surface)]/60 p-3 sm:flex-nowrap"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: EASE_OUT }}
            >
              <motion.span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-4',
                  m.status === 'released' ? 'bg-success text-white' : m.status === 'escrow' ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink-3',
                )}
                key={m.status}
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring.bouncy}
              >
                {m.status === 'released' ? <Unlock /> : m.status === 'escrow' ? <ShieldCheck /> : <Lock />}
              </motion.span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-ink">{m.label}</div>
                <div className="font-mono text-[11.5px] text-ink-3">
                  {t('core.common.due')} {shortDate(m.dueAt, lang)}
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <span className="font-mono text-[15px] font-medium tabular-nums text-ink">{money(m.amount)}</span>
                <Pill tone={MS_TONE[m.status]} size="xs" dot>
                  {t(`job.pay.ms.${m.status}`)}
                </Pill>
                <AnimatePresence mode="popLayout" initial={false}>
                  {clientCan && m.status === 'escrow' && (
                    <motion.span key="rel" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Button
                        size="xs"
                        icon={<Unlock className="size-3" />}
                        onClick={(e) => {
                          release(job.id, m.id)
                          fireEmoji('💸', { from: e.currentTarget })
                          toast({ title: t('job.pay.releasedToast', { label: m.label }), description: money(m.amount), tone: 'success' })
                        }}
                      >
                        {t('job.pay.release')}
                      </Button>
                    </motion.span>
                  )}
                  {clientCan && m.status === 'locked' && (
                    <motion.span key="fund" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Button size="xs" variant="soft" icon={<ShieldCheck className="size-3" />} onClick={() => fund(m)}>
                        {t('job.pay.fund')}
                      </Button>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  )
}

function invoiceHtml(inv: Invoice, title: string, money: (v: number) => string, names: { client: string; designer: string }) {
  const rows = inv.lineItems.map((l) => `<tr><td>${l.label}</td><td style="text-align:right">${money(l.amount)}</td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${inv.id}</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:640px;margin:48px auto;color:#111}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:10px 0;border-bottom:1px solid #eee}.m{font-family:ui-monospace,monospace;color:#666}</style></head><body><p class="m">designTab · ${inv.id}</p><h1>${title}</h1><p>${names.designer} → ${names.client}</p><p class="m">Issued ${inv.issuedAt.slice(0, 10)} · Due ${inv.dueAt.slice(0, 10)} · ${inv.status.toUpperCase()}</p><table>${rows}<tr><td><b>Total</b></td><td style="text-align:right"><b>${money(inv.amount)}</b></td></tr></table></body></html>`
}

function Invoices({ invoices }: { invoices: Invoice[] }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const { job, side, canAct, client, designer } = useJobCtx()
  const pay = useApp((s) => s.payInvoice)
  const remind = useApp((s) => s.sendInvoiceReminder)
  const create = useApp((s) => s.createInvoice)
  const money = (v: number) => moneyWhole(v, job.currency, lang)
  const canCreate = canAct && side === 'designer' && !invoices.length && !['declined', 'cancelled'].includes(job.status)

  return (
    <section>
      <SectionTitle
        icon={<ReceiptText />}
        title={t('job.pay.invoices')}
        right={
          <Button size="xs" variant="ghost" iconRight={<ArrowUpRight className="size-3.5" />} onClick={() => navigate('/payments')}>
            {t('job.pay.allPayments')}
          </Button>
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<ReceiptText />}
          title={t('job.pay.noInvoice')}
          description={t(side === 'designer' ? 'job.pay.noInvoiceDesigner' : 'job.pay.noInvoiceClient')}
          action={
            canCreate && (
              <Button
                icon={<ReceiptText className="size-4" />}
                onClick={() => {
                  const inv = create(job.id)
                  if (inv) toast({ title: t('job.hero.invoiceCreated', { id: inv.id }), description: money(inv.amount), tone: 'success' })
                }}
              >
                {t('job.hero.createInvoice')}
              </Button>
            )
          }
        />
      ) : (
        <ul className="mt-4 grid gap-3 @min-[680px]:grid-cols-2">
          <AnimatePresence initial={false}>
            {invoices.map((inv) => {
              const unpaid = inv.status !== 'paid' && inv.status !== 'draft'
              return (
                <motion.li
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, y: 14, rotateX: -12 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring.smooth}
                  style={{ transformPerspective: 800 }}
                  className="relative overflow-hidden rounded-[22px] border border-line bg-[var(--surface)]/70 p-4"
                >
                  {/* perforated receipt edge */}
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[radial-gradient(circle_at_6px_0,transparent_4px,var(--surface-2)_4.5px)] bg-[length:12px_6px]" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[13px] font-semibold text-ink">{inv.id}</div>
                      <div className="font-mono text-[11px] text-ink-3">
                        {t('job.pay.issued', { date: shortDate(inv.issuedAt, lang) })} · {t('job.pay.dueOn', { date: shortDate(inv.dueAt, lang) })}
                      </div>
                    </div>
                    <Pill tone={INV_TONE[inv.status]} size="xs" dot>
                      {t(`job.pay.inv.${inv.status}`)}
                    </Pill>
                  </div>
                  <ul className="mt-3 space-y-1 border-y border-dashed border-line-2 py-2.5">
                    {inv.lineItems.map((l, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-ink-2">{l.label}</span>
                        <span className="shrink-0 font-mono tabular-nums text-ink">{money(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2.5 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[11.5px] text-ink-3">{t('job.pay.total')}</div>
                      <div className="text-[22px] font-medium leading-tight tracking-[-0.02em]">{money(inv.amount)}</div>
                      {inv.paidAt && <div className="font-mono text-[11px] text-success">{t('job.pay.paidOn', { date: fmt(inv.paidAt, 'd MMM yyyy', lang) })}</div>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={<Download className="size-3" />}
                        onClick={() => {
                          downloadBlob(new Blob([invoiceHtml(inv, job.title, money, { client: client?.name ?? '', designer: designer?.name ?? '' })], { type: 'text/html' }), `${inv.id}.html`)
                          toast({ title: t('job.pay.downloaded', { id: inv.id }), tone: 'success', duration: 2000 })
                        }}
                      >
                        {t('core.action.download')}
                      </Button>
                      {canAct && side === 'client' && unpaid && (
                        <Button
                          size="xs"
                          icon={<Wallet className="size-3" />}
                          onClick={(e) => {
                            pay(inv.id)
                            fireEmoji('💸', { from: e.currentTarget })
                            toast({ title: t('job.pay.paid', { id: inv.id }), description: money(inv.amount), tone: 'success' })
                          }}
                        >
                          {t('job.pay.payNow')}
                        </Button>
                      )}
                      {canAct && side === 'designer' && unpaid && (
                        <Button
                          size="xs"
                          variant="soft"
                          icon={<BellRing className="size-3" />}
                          onClick={() => {
                            remind(inv.id)
                            toast({ title: t('job.pay.reminded', { id: inv.id }), tone: 'success' })
                          }}
                        >
                          {t('job.pay.remind')}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isClosed(job.status) && inv.status === 'draft' && <p className="mt-2 text-[11.5px] text-ink-3">{t('job.pay.voided')}</p>}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
