import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { BadgeCheck, CreditCard, Plus, ShieldCheck, Star, Trash2, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import { fireConfetti } from '@/lib/confetti'
import { CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Overlay'
import { Field, Input } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardVisual, FINISHES } from './CardVisual'
import { useCards, type CardFinish, type SavedCard } from './local'
import { cardLength, detectBrand, expiryValid, formatCardNumber, formatExpiry, luhn } from './model'
import { Card } from './ui'

const BRAND_LABEL = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', unknown: '' } as const

/**
 * Saved payment methods as an Apple-Wallet-like stack: the selected card is
 * fully revealed, the others tuck under it showing only their top edge.
 */
export function PaymentMethodsCard({ className }: { className?: string }) {
  const t = useT()
  const cards = useCards((s) => s.cards)
  const setDefault = useCards((s) => s.setDefault)
  const removeCard = useCards((s) => s.removeCard)
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirm, confirmDialog] = useConfirm()
  const sel = cards.find((c) => c.id === selected) ?? cards.find((c) => c.isDefault) ?? cards[0]

  const remove = async (c: SavedCard) => {
    const ok = await confirm({
      title: t('payments.cards.removeTitle', { last4: c.last4 }),
      description: t('payments.cards.removeBody'),
      confirmLabel: t('payments.cards.remove'),
      tone: 'danger',
      icon: <Trash2 />,
    })
    if (!ok) return
    removeCard(c.id)
    setSelected(null)
    toast({ title: t('payments.cards.removed', { last4: c.last4 }), tone: 'info' })
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('payments.cards.title')}
        subtitle={t('payments.cards.subtitle', { count: cards.length })}
        action={
          <Button size="sm" variant="soft" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            {t('payments.cards.add')}
          </Button>
        }
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard />}
          title={t('payments.cards.emptyTitle')}
          description={t('payments.cards.emptyBody')}
          action={
            <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              {t('payments.cards.add')}
            </Button>
          }
        />
      ) : (
        <LayoutGroup>
          <div className="relative z-[1] mx-auto mt-4 w-full max-w-[380px]">
            {cards.map((c, i) => {
              const isSel = c.id === sel?.id
              const last = i === cards.length - 1
              return (
                <motion.div
                  key={c.id}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="relative"
                  style={{ zIndex: i + 1, marginBottom: isSel || last ? 12 : 'calc(-63.05% + 46px)' }}
                  initial={{ opacity: 0, y: 30, rotateX: 25 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <button
                    type="button"
                    className="block w-full rounded-[20px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    onClick={() => setSelected(c.id)}
                    aria-pressed={isSel}
                    aria-label={`${BRAND_LABEL[c.brand]} •••• ${c.last4}`}
                  >
                    <motion.div whileHover={!isSel ? { y: -6 } : undefined} transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
                      <CardVisual
                        brand={c.brand}
                        last4={c.last4}
                        name={c.name}
                        exp={c.exp}
                        finish={c.finish}
                        interactive={isSel}
                        size="sm"
                        badge={
                          c.isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10.5px] font-semibold backdrop-blur-md">
                              <BadgeCheck className="size-3" />
                              {t('payments.cards.default')}
                            </span>
                          ) : null
                        }
                      />
                    </motion.div>
                  </button>
                </motion.div>
              )
            })}
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            {sel && (
              <motion.div
                key={sel.id}
                layout
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-[1] mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--surface-2)] p-2 pl-3.5"
              >
                <div className="min-w-0 text-[12.5px]">
                  <p className="truncate font-medium text-ink">
                    {BRAND_LABEL[sel.brand] || t('payments.cards.card')} •••• {sel.last4}
                  </p>
                  <p className="font-mono text-[11.5px] text-ink-3">
                    {t('payments.cards.expires', { exp: sel.exp })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!sel.isDefault && (
                    <Button
                      size="xs"
                      variant="primary"
                      icon={<Star className="size-3.5" />}
                      onClick={() => {
                        setDefault(sel.id)
                        toast({ title: t('payments.cards.defaultSet', { last4: sel.last4 }), tone: 'success' })
                      }}
                    >
                      {t('payments.cards.makeDefault')}
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" className="text-danger hover:text-danger" icon={<Trash2 className="size-3.5" />} onClick={() => remove(sel)}>
                    {t('payments.cards.remove')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      )}
      <p className="relative z-[1] mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <ShieldCheck className="size-3.5 shrink-0 text-success" />
        {t('payments.cards.secure')}
      </p>
      <AddCardModal open={adding} onClose={() => setAdding(false)} onAdded={(c) => setSelected(c.id)} />
      {confirmDialog}
    </Card>
  )
}

const FINISH_ORDER: CardFinish[] = ['aurora', 'graphite', 'ocean', 'sunset', 'theme']

/** Add-card sheet with a live card preview that flips while typing the CVC. */
export function AddCardModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded?: (c: SavedCard) => void }) {
  const t = useT()
  const addCard = useCards((s) => s.addCard)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [finish, setFinish] = useState<CardFinish>('aurora')
  const [makeDefault, setMakeDefault] = useState(false)
  const [cvcFocus, setCvcFocus] = useState(false)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setNumber('')
    setExp('')
    setCvc('')
    setFinish('aurora')
    setMakeDefault(false)
    setTried(false)
    setSaving(false)
  }, [open])

  const brand = detectBrand(number)
  const digits = number.replace(/\D/g, '')
  const errors = useMemo(
    () => ({
      name: name.trim().length < 2 ? t('payments.add.errName') : '',
      number: digits.length !== cardLength(brand) || !luhn(digits) ? t('payments.add.errNumber') : '',
      exp: !expiryValid(exp) ? t('payments.add.errExp') : '',
      cvc: cvc.length < (brand === 'amex' ? 4 : 3) ? t('payments.add.errCvc') : '',
    }),
    [name, digits, brand, exp, cvc, t],
  )
  const valid = !errors.name && !errors.number && !errors.exp && !errors.cvc

  const submit = () => {
    setTried(true)
    if (!valid) return
    setSaving(true)
    window.setTimeout(() => {
      const card = addCard({ brand, last4: digits.slice(-4), name: name.trim(), exp, finish, isDefault: makeDefault })
      fireConfetti({ from: submitRef.current, particleCount: 90 })
      toast({ title: t('payments.add.added'), description: `${BRAND_LABEL[brand] || t('payments.cards.card')} •••• ${card.last4}`, tone: 'success' })
      onAdded?.(card)
      onClose()
    }, 650)
  }

  const fillTest = () => {
    setName('Ali')
    setNumber(formatCardNumber('4242424242424242'))
    setExp(formatExpiry(`12${String((new Date().getFullYear() + 3) % 100).padStart(2, '0')}`))
    setCvc('123')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('payments.add.title')}
      description={t('payments.add.subtitle')}
      footer={
        <>
          <Button variant="ghost" icon={<Wand2 className="size-4" />} onClick={fillTest} className="mr-auto">
            {t('payments.add.test')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button ref={submitRef} onClick={submit} loading={saving} icon={<ShieldCheck className="size-4" />}>
            {t('payments.add.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1fr_1.05fr] md:items-center">
        <div className="mx-auto w-full max-w-[340px] py-2">
          <CardVisual
            brand={brand}
            number={number}
            name={name}
            exp={exp}
            finish={finish}
            flipped={cvcFocus}
            cvc={cvc}
            placeholderName={t('payments.add.namePh').toUpperCase()}
          />
          <div className="mt-5 flex items-center justify-center gap-2" role="radiogroup" aria-label={t('payments.add.finish')}>
            {FINISH_ORDER.map((f) => (
              <motion.button
                key={f}
                type="button"
                role="radio"
                aria-checked={finish === f}
                aria-label={FINISHES[f].label}
                title={FINISHES[f].label}
                onClick={() => setFinish(f)}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.12 }}
                className={cn('size-8 rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-shadow', finish === f ? 'ring-2 ring-ink' : 'ring-1 ring-black/10')}
                style={{ background: FINISHES[f].bg }}
              />
            ))}
          </div>
        </div>
        <form
          className="grid grid-cols-2 gap-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label={t('payments.add.name')} error={tried ? errors.name : undefined} className="col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('payments.add.namePh')} autoComplete="cc-name" />
          </Field>
          <Field label={t('payments.add.number')} error={tried ? errors.number : undefined} className="col-span-2">
            <Input
              value={number}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              className="font-mono tracking-[0.04em]"
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              right={
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={brand}
                    initial={{ opacity: 0, scale: 0.6, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className="mr-1 inline-flex h-7 min-w-11 items-center justify-center rounded-lg bg-[var(--surface-2)] px-1.5 text-[11px] font-semibold text-ink-2"
                  >
                    {brand === 'unknown' ? <CreditCard className="size-4 text-ink-3" /> : BRAND_LABEL[brand].split(' ')[0]}
                  </motion.span>
                </AnimatePresence>
              }
            />
          </Field>
          <Field label={t('payments.add.expiry')} error={tried ? errors.exp : undefined}>
            <Input
              value={exp}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className="font-mono"
              onChange={(e) => setExp(formatExpiry(e.target.value))}
            />
          </Field>
          <Field label="CVC" hint={t('payments.add.cvcHint')} error={tried ? errors.cvc : undefined}>
            <Input
              value={cvc}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={brand === 'amex' ? '1234' : '123'}
              className="font-mono"
              onFocus={() => setCvcFocus(true)}
              onBlur={() => setCvcFocus(false)}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
            />
          </Field>
          <label className="col-span-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-4 py-3">
            <span className="text-[13.5px] font-medium text-ink-2">{t('payments.add.makeDefault')}</span>
            <Toggle checked={makeDefault} onChange={setMakeDefault} label={t('payments.add.makeDefault')} size="sm" />
          </label>
          <p className="col-span-2 flex items-start gap-2 text-[12px] leading-relaxed text-ink-3">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
            {t('payments.add.privacy')}
          </p>
          <button type="submit" className="hidden" />
        </form>
      </div>
    </Modal>
  )
}
