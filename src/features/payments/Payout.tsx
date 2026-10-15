import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownToLine, Check, Clock, Landmark, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { fireConfetti, fireEmoji } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { usePayPrefs } from './local'
import { SuccessCheck } from './PayFlow'
import { BANK_LABEL } from './DesignerWidgets'

const INSTANT_FEE = 0.015
const MIN_FEE = 0.5

export function payoutFee(amount: number, instant: boolean) {
  if (!instant || amount <= 0) return 0
  return Math.round(Math.max(MIN_FEE, amount * INSTANT_FEE) * 100) / 100
}

/** "Request payout": amount slider ≤ balance, speed, live summary → success. */
export function PayoutModal({ open, onClose, balance }: { open: boolean; onClose: () => void; balance: number }) {
  const t = useT()
  const lang = useLang()
  const currency = useApp((s) => s.settings.currency)
  const seededAt = useApp((s) => s.seededAt)
  const requestPayout = useApp((s) => s.requestPayout)
  const addPayout = usePayPrefs((s) => s.addPayout)
  const instantDefault = usePayPrefs((s) => s.instantDefault)
  const setInstantDefault = usePayPrefs((s) => s.setInstantDefault)
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form')
  const [amount, setAmount] = useState(0)
  const [instant, setInstant] = useState(false)
  const [snap, setSnap] = useState({ amount: 0, fee: 0, instant: false })
  const checkRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setStep('form')
    setAmount(Math.floor(balance))
    setInstant(instantDefault)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const max = Math.max(0, Math.floor(balance))
  const min = Math.min(max, 50)
  const fee = payoutFee(amount, instant)
  const receive = Math.max(0, amount - fee)
  const money = (v: number) => formatMoney(v, currency, lang)
  const valid = amount >= min && amount <= max && amount > 0

  const submit = () => {
    if (!valid) return
    const s = { amount, fee, instant }
    setSnap(s)
    setStep('processing')
    setInstantDefault(instant)
    timer.current = window.setTimeout(() => {
      addPayout({ amount: s.amount, fee: s.fee, instant: s.instant, seededAt })
      requestPayout(Math.round((s.amount - s.fee) * 100) / 100)
      setStep('done')
      window.setTimeout(() => {
        fireConfetti({ from: checkRef.current, particleCount: 170 })
        fireEmoji('💸', { from: checkRef.current, particleCount: 12 })
      }, 240)
    }, 1500)
  }

  const quick = [0.25, 0.5, 0.75, 1]

  return (
    <Modal open={open} onClose={() => step !== 'processing' && onClose()} size="sm" bare dismissable={step !== 'processing'}>
      <div className="relative z-[1] overflow-hidden px-5 pb-5 pt-6 sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-accent">
                  <ArrowDownToLine className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[19px] font-medium tracking-[-0.02em]">{t('payments.payout.title')}</h2>
                  <p className="text-[12.5px] text-ink-3">{t('payments.payout.available', { amount: money(balance) })}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] bg-[var(--surface-2)] px-4 pb-3 pt-4 text-center">
                <p className="text-[12px] text-ink-3">{t('payments.payout.amount')}</p>
                <p className="mt-1 text-[40px] font-medium leading-none tracking-[-0.045em]">
                  <AnimatedCounter value={amount} currency={currency} startOnView={false} />
                </p>
                <div className="mt-4 px-1">
                  <Slider
                    value={amount}
                    onChange={setAmount}
                    min={min}
                    max={Math.max(min + 1, max)}
                    step={10}
                    format={money}
                    ariaLabel={t('payments.payout.amount')}
                    disabled={max <= min}
                  />
                </div>
                <div className="mt-2 flex justify-center gap-1.5">
                  {quick.map((q) => {
                    const v = q === 1 ? max : Math.max(min, Math.round((max * q) / 10) * 10)
                    const active = amount === v
                    return (
                      <motion.button
                        key={q}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setAmount(v)}
                        className={cn(
                          'h-7 rounded-full px-3 font-mono text-[11.5px] font-medium transition-colors',
                          active ? 'bg-ink text-[var(--surface)]' : 'bg-[var(--surface)] text-ink-2 hover:text-ink',
                        )}
                      >
                        {q === 1 ? t('payments.payout.max') : `${q * 100}%`}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <p className="mb-2 mt-5 text-[12.5px] font-medium text-ink-2">{t('payments.payout.speed')}</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('payments.payout.speed')}>
                <SpeedOption
                  active={!instant}
                  onClick={() => setInstant(false)}
                  icon={<Clock className="size-4" />}
                  title={t('payments.payout.standard')}
                  sub={t('payments.payout.standardSub')}
                  tag={t('payments.payout.free')}
                />
                <SpeedOption
                  active={instant}
                  onClick={() => setInstant(true)}
                  icon={<Zap className="size-4" />}
                  title={t('payments.payout.instant')}
                  sub={t('payments.payout.instantSub')}
                  tag="1.5%"
                />
              </div>

              <dl className="mt-4 space-y-1.5 rounded-2xl border border-line p-3.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t('payments.payout.to')}</dt>
                  <dd className="flex items-center gap-1.5 truncate font-medium">
                    <Landmark className="size-3.5 text-ink-3" />
                    {BANK_LABEL}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t('payments.payout.fee')}</dt>
                  <dd className="font-mono tabular-nums">{fee ? `−${money(fee)}` : t('payments.payout.free')}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t('payments.payout.arrives')}</dt>
                  <dd className="font-medium">{instant ? t('payments.payout.arrivesInstant') : t('payments.payout.arrivesStandard')}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
                  <dt className="font-medium">{t('payments.payout.receive')}</dt>
                  <dd className="font-mono text-[17px] font-semibold tabular-nums">{money(receive)}</dd>
                </div>
              </dl>

              <Button block size="lg" className="mt-5" icon={<ArrowDownToLine className="size-4" />} onClick={submit} disabled={!valid}>
                {t('payments.payout.cta', { amount: money(receive) })}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-3">
                <ShieldCheck className="size-3.5 text-success" />
                {t('payments.payout.secure')}
              </p>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="flex flex-col items-center py-10 text-center"
            >
              <div className="relative flex h-24 w-56 items-center justify-between">
                <span className="z-[1] flex size-12 items-center justify-center rounded-2xl bg-ink text-accent">
                  <ArrowDownToLine className="size-5" />
                </span>
                <span className="absolute inset-x-12 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <motion.span
                    className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: EASE_OUT }}
                  />
                </span>
                <span className="z-[1] flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-ink-2">
                  <Landmark className="size-5" />
                </span>
              </div>
              <p className="mt-6 text-[15px] font-medium">{t('payments.payout.processing')}</p>
              <p className="mt-1 font-mono text-[12.5px] text-ink-3">{money(snap.amount)}</p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="flex flex-col items-center pt-4 text-center"
            >
              <div ref={checkRef}>
                <SuccessCheck />
              </div>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-6 text-[22px] font-medium tracking-[-0.02em]">
                {t('payments.payout.done')}
              </motion.p>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-1.5 text-[13.5px] text-ink-3">
                {t(snap.instant ? 'payments.payout.doneInstant' : 'payments.payout.doneStandard', { amount: money(snap.amount - snap.fee), bank: BANK_LABEL })}
              </motion.p>
              <Button block className="mt-6" icon={<Check className="size-4" />} onClick={onClose}>
                {t('core.action.done')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

function SpeedOption({ active, onClick, icon, title, sub, tag }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string; tag: string }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex min-w-0 flex-col items-start rounded-2xl p-3 text-left transition-[background-color,box-shadow]',
        active ? 'bg-[var(--surface)] shadow-[0_0_0_1.5px_var(--ink),0_10px_24px_-14px_rgba(0,0,0,.35)]' : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className={cn('flex size-7 items-center justify-center rounded-lg', active ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-3)] text-ink-2')}>{icon}</span>
        <span className="rounded-full bg-[var(--surface-3)] px-1.5 font-mono text-[10.5px] text-ink-2">{tag}</span>
      </span>
      <span className="mt-2 text-[13.5px] font-medium">{title}</span>
      <span className="text-[11.5px] text-ink-3">{sub}</span>
    </motion.button>
  )
}
