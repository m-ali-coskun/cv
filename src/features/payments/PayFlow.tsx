import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CreditCard, FileText, Landmark, Lock, Plus, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { dueLabel } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { fireConfetti, fireEmoji } from '@/lib/confetti'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { BrandMark, FINISHES } from './CardVisual'
import { AddCardModal } from './Cards'
import { useCards } from './local'
import type { InvoiceRow } from './model'
import { InvoiceStatusPill, MonoId, PersonAvatar } from './ui'
import { FILTER_TWEEN } from '@/lib/motion'

type Step = 'review' | 'processing' | 'done'

/** Big animated success check: ring draws, tick draws, ripples burst. */
export function SuccessCheck({ size = 112 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-[var(--success)]"
          initial={{ scale: 0.8, opacity: 0.7 }}
          animate={{ scale: 1.9 + i * 0.25, opacity: 0 }}
          transition={{ duration: 1.3, delay: 0.35 + i * 0.16, ease: [0.23, 1, 0.32, 1] }}
        />
      ))}
      <motion.div
        className="absolute inset-0 rounded-full bg-[var(--success)] shadow-[0_18px_40px_-14px_var(--success)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.05 }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,255,255,.55)"
          strokeWidth="3"
          initial={{ pathLength: 0, rotate: -90 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
          style={{ originX: '50%', originY: '50%' }}
        />
        <motion.path
          d="M30 52 L44 66 L71 36"
          fill="none"
          stroke="#fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.38 }}
        />
      </svg>
    </div>
  )
}

const PROCESS_STEPS = ['payments.pay.step1', 'payments.pay.step2', 'payments.pay.step3']

export function PayModal({ row, open, onClose, onViewInvoice }: { row: InvoiceRow | null; open: boolean; onClose: () => void; onViewInvoice?: (row: InvoiceRow) => void }) {
  const t = useT()
  const lang = useLang()
  const payInvoice = useApp((s) => s.payInvoice)
  const cards = useCards((s) => s.cards)
  const [step, setStep] = useState<Step>('review')
  const [method, setMethod] = useState<string>('bank')
  const [phase, setPhase] = useState(0)
  const [adding, setAdding] = useState(false)
  const [snapshot, setSnapshot] = useState<InvoiceRow | null>(null)
  const checkRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  // freeze the invoice while the sheet is open (status flips to paid mid-flow)
  useEffect(() => {
    if (open && row) {
      setSnapshot(row)
      setStep('review')
      setPhase(0)
      setMethod(cards.find((c) => c.isDefault)?.id ?? cards[0]?.id ?? 'bank')
    }
    if (!open) timers.current.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.inv.id])

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  const r = snapshot
  const money = (v: number) => formatMoney(v, r?.inv.currency ?? 'EUR', lang)
  const chosen = cards.find((c) => c.id === method)

  const pay = () => {
    if (!r) return
    setStep('processing')
    setPhase(0)
    timers.current = [
      window.setTimeout(() => setPhase(1), 650),
      window.setTimeout(() => setPhase(2), 1300),
      window.setTimeout(() => {
        payInvoice(r.inv.id)
        setStep('done')
        window.setTimeout(() => {
          fireConfetti({ from: checkRef.current, particleCount: 200 })
          fireEmoji('💸', { from: checkRef.current, particleCount: 14 })
        }, 260)
        toast({
          title: t('payments.pay.toast', { id: r.inv.id }),
          description: `${money(r.inv.amount)} · ${r.designer?.name ?? ''}`,
          tone: 'success',
          avatarSeed: r.designer?.avatarSeed,
        })
      }, 2000),
    ]
  }

  const close = () => {
    if (step === 'processing') return
    onClose()
  }

  return (
    <>
      <Modal open={open && !!r} onClose={close} size="sm" bare dismissable={step !== 'processing'}>
        {r && (
          <div className="relative z-[1] overflow-hidden px-5 pb-5 pt-6 sm:px-6">
            <AnimatePresence mode="wait" initial={false}>
              {step === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="flex items-center gap-3">
                    <PersonAvatar person={r.designer} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{t('payments.pay.payTo', { name: r.designer?.name ?? '' })}</p>
                      <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
                        <MonoId>{r.inv.id}</MonoId>
                        <span>·</span>
                        <span className={cn(r.status === 'overdue' && 'text-danger')}>{dueLabel(r.inv.dueAt, lang)}</span>
                      </p>
                    </div>
                    <InvoiceStatusPill status={r.status} size="xs" />
                  </div>
                  <div className="mt-5 rounded-[22px] bg-[var(--surface-2)] p-4 text-center">
                    <p className="text-[12.5px] text-ink-3">{t('payments.pay.amount')}</p>
                    <p className="mt-1 text-[40px] font-medium leading-none tracking-[-0.04em]">
                      <AnimatedCounter value={r.inv.amount} currency={r.inv.currency} startOnView={false} />
                    </p>
                    <p className="mt-2 truncate text-[12.5px] text-ink-3">{r.job?.title}</p>
                  </div>

                  <p className="mb-2 mt-5 text-[12.5px] font-medium text-ink-2">{t('payments.pay.method')}</p>
                  <div className="space-y-1.5" role="radiogroup" aria-label={t('payments.pay.method')}>
                    {cards.map((c) => (
                      <MethodRow key={c.id} active={method === c.id} onClick={() => setMethod(c.id)}>
                        <span className="flex h-7 w-11 items-center justify-center rounded-md text-[9px]" style={{ background: FINISHES[c.finish].bg }}>
                          <BrandMark brand={c.brand} ink={FINISHES[c.finish].ink} className="text-[9px]" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">•••• {c.last4}</span>
                        {c.isDefault && <span className="text-[11.5px] text-ink-3">{t('payments.cards.default')}</span>}
                      </MethodRow>
                    ))}
                    <MethodRow active={method === 'bank'} onClick={() => setMethod('bank')}>
                      <span className="flex h-7 w-11 items-center justify-center rounded-md bg-[var(--surface-3)]">
                        <Landmark className="size-4 text-ink-2" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px]">{t('payments.pay.bank')}</span>
                      <span className="text-[11.5px] text-ink-3">SEPA</span>
                    </MethodRow>
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-line-2 px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-[var(--ink-4)] hover:text-ink"
                    >
                      <Plus className="size-4" />
                      {t('payments.cards.add')}
                    </button>
                  </div>
                  <Button block size="lg" className="mt-5" icon={<Lock className="size-4" />} onClick={pay}>
                    {t('payments.pay.cta', { amount: money(r.inv.amount) })}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-3">
                    <ShieldCheck className="size-3.5 text-success" />
                    {t('payments.pay.protected')}
                  </p>
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-col items-center py-8 text-center"
                >
                  <div className="relative size-24">
                    <motion.span
                      className="absolute inset-0 rounded-full border-[5px] border-[var(--surface-3)] border-t-[var(--accent)]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
                    />
                    <span className="absolute inset-[18px] flex items-center justify-center rounded-full bg-[var(--surface-2)]">
                      {chosen ? <CreditCard className="size-7 text-ink-2" /> : <Landmark className="size-7 text-ink-2" />}
                    </span>
                  </div>
                  <div className="mt-6 h-6 overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      <motion.p
                        key={phase}
                        initial={{ y: 18, opacity: 0, filter: 'blur(4px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ y: -18, opacity: 0, filter: 'blur(4px)' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 30, filter: FILTER_TWEEN }}
                        className="text-[15px] font-medium"
                      >
                        {t(PROCESS_STEPS[phase])}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    {PROCESS_STEPS.map((_, i) => (
                      <motion.span key={i} className="h-1.5 rounded-full bg-[var(--surface-3)]" animate={{ width: i === phase ? 28 : 8, background: i <= phase ? 'var(--accent)' : 'var(--surface-3)' }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                  className="flex flex-col items-center pt-4 text-center"
                >
                  <div ref={checkRef}>
                    <SuccessCheck />
                  </div>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-6 text-[22px] font-medium tracking-[-0.02em]">
                    {t('payments.pay.done')}
                  </motion.p>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-1.5 text-[13.5px] text-ink-3">
                    {t('payments.pay.doneBody', { amount: money(r.inv.amount), name: r.designer?.name ?? '' })}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mt-5 w-full rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-left text-[12.5px]"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-3">{t('payments.pay.receipt')}</span>
                      <MonoId>RC-{r.inv.id.replace(/\D/g, '')}-{new Date().getDate().toString().padStart(2, '0')}</MonoId>
                    </div>
                    <div className="mt-1 flex justify-between gap-3">
                      <span className="text-ink-3">{t('payments.pay.method')}</span>
                      <span className="font-mono">{chosen ? `•••• ${chosen.last4}` : 'SEPA'}</span>
                    </div>
                  </motion.div>
                  <div className="mt-5 flex w-full flex-col-reverse gap-2 sm:flex-row">
                    {onViewInvoice && (
                      <Button variant="outline" block icon={<FileText className="size-4" />} onClick={() => onViewInvoice(r)}>
                        {t('payments.pay.viewInvoice')}
                      </Button>
                    )}
                    <Button block icon={<Check className="size-4" />} onClick={onClose}>
                      {t('core.action.done')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Modal>
      <AddCardModal open={adding} onClose={() => setAdding(false)} onAdded={(c) => setMethod(c.id)} />
    </>
  )
}

function MethodRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
        active ? 'bg-[var(--surface)] shadow-[0_0_0_1.5px_var(--ink),0_8px_20px_-12px_rgba(0,0,0,.3)]' : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]',
      )}
    >
      {children}
      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', active ? 'border-ink bg-ink' : 'border-[var(--ink-4)]')}>
        <AnimatePresence>
          {active && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
              <Check className="size-3 text-[var(--surface)]" strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  )
}
