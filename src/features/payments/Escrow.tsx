import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Lock, LockOpen, ShieldCheck, Vault, Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { dueLabel, shortDate } from '@/lib/dates'
import { uid } from '@/lib/ids'
import { fireEmoji } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyJobs } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { MediaView } from '@/components/art/MediaView'
import type { Job, Milestone } from '@/store/types'
import { Card, MonoId } from './ui'
import { money as fmtMoney } from './model'

const ESCROW_PAGE = 7

const ACTIVE = (j: Job) => !['approved', 'declined', 'cancelled'].includes(j.status) && j.milestones.length > 0

/** Client: funds held per active job, with release / fund actions per milestone. */
export function EscrowCard({ className }: { className?: string }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const jobs = useMyJobs({ includeClosed: false })
  const list = useMemo(
    () =>
      jobs
        .filter(ACTIVE)
        .sort(
          (a, b) =>
            Number(b.milestones.some((m) => m.status === 'escrow')) - Number(a.milestones.some((m) => m.status === 'escrow')) || a.dueAt.localeCompare(b.dueAt),
        ),
    [jobs],
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? list : list.slice(0, ESCROW_PAGE)
  const expanded = openId ?? list[0]?.id ?? null

  const totals = useMemo(() => {
    const t = { escrow: 0, released: 0, locked: 0 }
    for (const j of list) for (const m of j.milestones) t[m.status] += m.amount
    return t
  }, [list])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={t('payments.escrow.title')} subtitle={t('payments.escrow.subtitle', { count: list.length })} icon={<Vault className="size-5 text-ink-3" />} />
      <div className="relative z-[1] mt-4 grid grid-cols-3 gap-2">
        <Total label={t('payments.escrow.held')} value={fmtMoney(totals.escrow, currency, lang, 0)} dot="var(--accent)" />
        <Total label={t('payments.escrow.released')} value={fmtMoney(totals.released, currency, lang, 0)} dot="var(--success)" />
        <Total label={t('payments.escrow.locked')} value={fmtMoney(totals.locked, currency, lang, 0)} dot="var(--ink-4)" />
      </div>
      <div className="relative z-[1] mt-3 flex-1 space-y-2">
        {list.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title={t('payments.escrow.emptyTitle')} description={t('payments.escrow.emptyBody')} />
        ) : (
          shown.map((j) => <EscrowJob key={j.id} job={j} open={expanded === j.id} onToggle={() => setOpenId(expanded === j.id ? '__none' : j.id)} />)
        )}
      </div>
      {list.length > ESCROW_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="relative z-[1] mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-[var(--surface-2)] hover:text-ink"
        >
          {showAll ? t('payments.invoices.showLess') : t('payments.invoices.showAll', { count: list.length })}
          <ChevronDown className={cn('size-3.5 transition-transform duration-300', showAll && 'rotate-180')} />
        </button>
      )}
    </Card>
  )
}

function Total({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="tile min-w-0 px-3 py-2.5">
      <p className="flex items-center gap-1.5 truncate text-[11.5px] text-ink-3">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} />
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-[14px] font-medium tabular-nums sm:text-[15px]">{value}</p>
    </div>
  )
}

function EscrowJob({ job, open, onToggle }: { job: Job; open: boolean; onToggle: () => void }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const designer = useApp((s) => s.designers.find((d) => d.id === job.designerId))
  const invoices = useApp((s) => s.invoices)
  const releaseMilestone = useApp((s) => s.releaseMilestone)
  const updateJob = useApp((s) => s.updateJob)
  const payInvoice = useApp((s) => s.payInvoice)
  const [confirm, dialog] = useConfirm()
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const total = job.milestones.reduce((a, m) => a + m.amount, 0)
  const released = job.milestones.filter((m) => m.status === 'released').reduce((a, m) => a + m.amount, 0)
  const money = (v: number) => fmtMoney(v, job.currency, lang, 0)

  const release = async (m: Milestone) => {
    const ok = await confirm({
      title: t('payments.escrow.releaseTitle', { amount: money(m.amount), name: designer?.name ?? '' }),
      description: t('payments.escrow.releaseBody'),
      confirmLabel: t('payments.escrow.releaseCta'),
      icon: <LockOpen />,
    })
    if (!ok) return
    releaseMilestone(job.id, m.id)
    fireEmoji('💸', { from: btnRefs.current[m.id], particleCount: 16 })
    // releasing the last held milestone settles the escrow invoice of the job
    const fresh = useApp.getState().jobs.find((j) => j.id === job.id)
    const inv = invoices.find((i) => i.jobId === job.id && i.status === 'escrow')
    if (fresh && inv && fresh.milestones.every((x) => x.status === 'released')) payInvoice(inv.id)
    toast({ title: t('payments.escrow.releasedToast', { amount: money(m.amount) }), description: `${m.label} · ${designer?.name ?? ''}`, tone: 'success', avatarSeed: designer?.avatarSeed })
  }

  const fund = async (m: Milestone) => {
    const ok = await confirm({
      title: t('payments.escrow.fundTitle', { amount: money(m.amount) }),
      description: t('payments.escrow.fundBody'),
      confirmLabel: t('payments.escrow.fundCta'),
      icon: <Wallet />,
    })
    if (!ok) return
    updateJob(job.id, {
      milestones: job.milestones.map((x) => (x.id === m.id ? { ...x, status: 'escrow' } : x)),
      timeline: [{ id: uid('ev_'), kind: 'payment', at: new Date().toISOString(), actorId: job.clientId, text: `Milestone funded: ${m.label}` }, ...job.timeline],
    })
    toast({ title: t('payments.escrow.fundedToast', { amount: money(m.amount) }), description: m.label, tone: 'success' })
  }

  return (
    <motion.div layout className={cn('overflow-hidden rounded-[20px] border transition-colors', open ? 'border-line-2 bg-[var(--surface)]' : 'border-transparent bg-[var(--surface-2)]')}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-2.5 text-left" aria-expanded={open}>
        <span className="relative size-11 shrink-0 overflow-hidden rounded-[14px]">
          <MediaView media={job.cover} playBadge={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{job.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <MonoId className="text-[11.5px]">{job.id}</MonoId>
            <span>·</span>
            <span className="truncate">{designer?.name}</span>
          </span>
        </span>
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block font-mono text-[13px] font-medium tabular-nums">
            {money(released)} <span className="text-ink-3">/ {money(total)}</span>
          </span>
          <span className="block text-[11px] text-ink-3">{t('payments.escrow.releasedShort')}</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {/* segmented progress */}
      <div className="flex gap-[3px] px-3 pb-2.5">
        {job.milestones.map((m, i) => (
          <motion.span
            key={m.id}
            className={cn('h-1.5 rounded-full', m.status === 'locked' && 'stripes bg-[var(--surface-3)]')}
            style={{ flexGrow: m.amount, flexBasis: 0, background: m.status === 'released' ? 'var(--success)' : m.status === 'escrow' ? 'var(--accent)' : undefined }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 200, damping: 22 }}
          />
        ))}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="divide-y divide-[var(--line)] px-3"
          >
            {job.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <MilestoneIcon status={m.status} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{m.label}</span>
                  <span className="block font-mono text-[11.5px] text-ink-3">
                    {shortDate(m.dueAt, lang)} · {m.status === 'released' ? t('payments.escrow.statusReleased') : dueLabel(m.dueAt, lang)}
                  </span>
                </span>
                <span className="font-mono text-[13px] font-medium tabular-nums">{money(m.amount)}</span>
                <span className="flex w-full justify-end sm:w-auto">
                  {m.status === 'escrow' && (
                    <Button ref={(el) => void (btnRefs.current[m.id] = el)} size="xs" icon={<LockOpen className="size-3.5" />} onClick={() => release(m)}>
                      {t('payments.escrow.release')}
                    </Button>
                  )}
                  {m.status === 'locked' && (
                    <Button size="xs" variant="soft" icon={<Wallet className="size-3.5" />} onClick={() => fund(m)}>
                      {t('payments.escrow.fund')}
                    </Button>
                  )}
                  {m.status === 'released' && (
                    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-success-soft px-2.5 text-[11.5px] font-medium text-[color-mix(in_oklab,var(--success)_72%,var(--ink))]">
                      <Check className="size-3.5" strokeWidth={3} />
                      {t('payments.escrow.statusReleased')}
                    </span>
                  )}
                </span>
              </li>
            ))}
            <li className="flex justify-end py-2">
              <button type="button" onClick={() => navigate(`/jobs/${job.id}`)} className="text-[12px] font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline">
                {t('payments.viewer.openJob')} →
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
      {dialog}
    </motion.div>
  )
}

function MilestoneIcon({ status }: { status: Milestone['status'] }) {
  const map: Record<Milestone['status'], { cls: string; icon: ReactNode }> = {
    released: { cls: 'bg-success-soft text-success', icon: <Check className="size-4" strokeWidth={3} /> },
    escrow: { cls: 'bg-accent text-accent-ink', icon: <Lock className="size-4" /> },
    locked: { cls: 'bg-[var(--surface-3)] text-ink-3', icon: <Lock className="size-4" /> },
  }
  return <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', map[status].cls)}>{map[status].icon}</span>
}
