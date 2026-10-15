import { type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { CreditCard, Nfc } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useApp } from '@/store'
import { useT } from '@/i18n'
import type { CardBrand } from './model'
import type { CardFinish } from './local'

export const FINISHES: Record<CardFinish, { bg: string; ink: string; label: string }> = {
  aurora: {
    bg: 'radial-gradient(120% 90% at 0% 0%, #6d5dfc 0%, transparent 55%), radial-gradient(90% 90% at 100% 100%, #ff7a90 0%, transparent 55%), radial-gradient(80% 70% at 85% 10%, #ffd38a 0%, transparent 50%), linear-gradient(135deg, #1d1446, #3b1d5e 50%, #6b2149)',
    ink: '#fff',
    label: 'Aurora',
  },
  graphite: {
    bg: 'radial-gradient(100% 80% at 10% 0%, rgba(255,255,255,.16), transparent 50%), repeating-linear-gradient(115deg, rgba(255,255,255,.025) 0 2px, transparent 2px 6px), linear-gradient(140deg, #2d2d33, #0c0c0f 70%)',
    ink: '#f2f2f4',
    label: 'Graphite',
  },
  ocean: {
    bg: 'radial-gradient(110% 80% at 100% 0%, #6ee7f9 0%, transparent 50%), radial-gradient(90% 90% at 0% 100%, #2563eb 0%, transparent 60%), linear-gradient(135deg, #0b3a5b, #0e6b8a 55%, #0a2540)',
    ink: '#fff',
    label: 'Ocean',
  },
  sunset: {
    bg: 'radial-gradient(100% 90% at 0% 0%, #ffe29a 0%, transparent 50%), radial-gradient(90% 90% at 100% 100%, #e1306c 0%, transparent 60%), linear-gradient(135deg, #ff8a3d, #f5487f 60%, #8f2bd6)',
    ink: '#fff',
    label: 'Sunset',
  },
  theme: {
    bg: 'radial-gradient(110% 80% at 0% 0%, color-mix(in oklab, var(--accent) 60%, #fff) 0%, transparent 55%), radial-gradient(90% 90% at 100% 100%, var(--accent-deep) 0%, transparent 70%), linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 45%, var(--accent-deep)))',
    ink: 'var(--accent-ink)',
    label: 'Studio',
  },
}

export function BrandMark({ brand, className, ink = '#fff' }: { brand: CardBrand; className?: string; ink?: string }) {
  if (brand === 'visa')
    return (
      <span className={cn('select-none text-[1.45em] font-black italic leading-none tracking-[-0.04em]', className)} style={{ color: ink }}>
        VISA
      </span>
    )
  if (brand === 'mastercard')
    return (
      <span className={cn('relative inline-flex h-[1.6em] w-[2.5em] items-center', className)} aria-label="Mastercard">
        <span className="absolute left-0 size-[1.6em] rounded-full bg-[#eb001b]" />
        <span className="absolute right-0 size-[1.6em] rounded-full bg-[#f79e1b] mix-blend-screen" />
        <span className="absolute left-[0.9em] size-[1.6em] rounded-full bg-[#ff5f00]/70 [clip-path:circle(50%_at_10%_50%)]" />
      </span>
    )
  if (brand === 'amex')
    return (
      <span className={cn('rounded-[4px] border border-white/70 bg-[#2e77bc] px-1.5 py-0.5 text-[0.85em] font-extrabold leading-none tracking-[0.04em] text-white', className)}>
        AMEX
      </span>
    )
  if (brand === 'discover')
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-[0.9em] font-bold leading-none tracking-[0.02em]', className)} style={{ color: ink }}>
        DISC<span className="inline-block size-[0.75em] rounded-full bg-[#ff6000]" />VER
      </span>
    )
  return <CreditCard className={cn('size-[1.6em]', className)} style={{ color: ink }} />
}

function Chip() {
  return (
    <svg viewBox="0 0 40 30" className="h-[1.9em] w-auto drop-shadow-[0_1px_1px_rgba(0,0,0,.25)]" aria-hidden>
      <defs>
        <linearGradient id="chip-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fbe7a1" />
          <stop offset=".5" stopColor="#d8b55b" />
          <stop offset="1" stopColor="#f6dd8c" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill="url(#chip-g)" stroke="rgba(0,0,0,.18)" />
      <path d="M0 10h12M0 20h12M28 10h12M28 20h12M12 0v30M28 0v30M12 15h16" stroke="rgba(90,60,10,.45)" strokeWidth="1" fill="none" />
    </svg>
  )
}

export interface CardVisualProps {
  brand: CardBrand
  /** Full or partial number as typed — masked except the last 4 when `masked`. */
  number?: string
  last4?: string
  name: string
  exp: string
  finish: CardFinish
  flipped?: boolean
  cvc?: string
  badge?: ReactNode
  /** Enable pointer tilt + specular shine. */
  interactive?: boolean
  className?: string
  /** Bigger type for the hero / modal preview. */
  size?: 'sm' | 'md'
  placeholderName?: string
}

/**
 * Glossy liquid-glass payment card. Leans toward the cursor in 3D while a
 * specular band slides across the surface; can flip to its back (CVC).
 */
export function CardVisual({ brand, number, last4, name, exp, finish, flipped, cvc, badge, interactive = true, className, size = 'md', placeholderName = 'CARDHOLDER' }: CardVisualProps) {
  const t = useT()
  const expressive = useApp((s) => s.settings.motion) === 'expressive'
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rx = useSpring(useTransform(py, [0, 1], [9, -9]), { stiffness: 220, damping: 20 })
  const ry = useSpring(useTransform(px, [0, 1], [-13, 13]), { stiffness: 220, damping: 20 })
  const shineX = useSpring(useTransform(px, [0, 1], [-30, 130]), { stiffness: 160, damping: 22 })
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 26 })
  const shine = useMotionTemplate`linear-gradient(105deg, transparent calc(${shineX}% - 28%), rgba(255,255,255,.08) calc(${shineX}% - 12%), rgba(255,255,255,.42) ${shineX}%, rgba(255,255,255,.08) calc(${shineX}% + 12%), transparent calc(${shineX}% + 28%))`
  const spot = useMotionTemplate`radial-gradient(60% 80% at ${useTransform(px, (v) => v * 100)}% ${useTransform(py, (v) => v * 100)}%, rgba(255,255,255,.28), transparent 60%)`
  const f = FINISHES[finish]
  const tilt = interactive && expressive

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
    glareOpacity.set(1)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
    glareOpacity.set(0)
  }

  const digits = (number ?? '').replace(/\D/g, '')
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4]
  let cursor = 0
  const shown = number !== undefined
    ? groups.map((g) => {
        const part = digits.slice(cursor, cursor + g)
        cursor += g
        return part.padEnd(g, '•')
      })
    : groups.map((g, i) => (i === groups.length - 1 ? (last4 ?? '').padStart(g, '•') : '•'.repeat(g)))

  const fs = size === 'sm' ? 'text-[11px]' : 'text-[13px]'

  return (
    <div className={cn('relative w-full [perspective:1200px]', className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div className="relative w-full [transform-style:preserve-3d]" style={{ aspectRatio: '1.586', rotateX: tilt ? rx : 0, rotateY: tilt ? ry : 0 }}>
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      >
        {/* front */}
        <div
          className={cn('absolute inset-0 overflow-hidden rounded-[18px] [backface-visibility:hidden] sm:rounded-[20px]', fs)}
          style={{
            background: f.bg,
            color: f.ink,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,.45), inset 0 0 0 1px rgba(255,255,255,.14), inset 0 -18px 40px -24px rgba(0,0,0,.5), 0 22px 40px -22px rgba(0,0,0,.55), 0 4px 10px -4px rgba(0,0,0,.25)',
          }}
        >
          {/* glass refraction blobs */}
          <div aria-hidden className="absolute -left-[12%] -top-[50%] h-[110%] w-[70%] rounded-full bg-white/18 blur-2xl" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.22),transparent_38%)]" />
          {/* idle sweep */}
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[dt-card-sweep_6s_var(--ease-out)_infinite] bg-[linear-gradient(100deg,transparent,rgba(255,255,255,.22),transparent)]" />
          </div>
          {/* pointer shine */}
          <motion.div aria-hidden className="absolute inset-0 mix-blend-overlay" style={{ background: shine, opacity: glareOpacity }} />
          <motion.div aria-hidden className="absolute inset-0" style={{ background: spot, opacity: glareOpacity }} />

          <div className="relative flex h-full flex-col justify-between p-[6.5%]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[1.05em] font-semibold tracking-[-0.02em] opacity-95">
                design<span className="opacity-60">Tab</span> <span className="font-normal opacity-60">Pay</span>
              </span>
              {badge}
            </div>
            <div className="flex items-center gap-[0.8em]">
              <Chip />
              <Nfc className="size-[1.5em] opacity-75" />
            </div>
            <div>
              <p className="flex gap-[0.7em] font-mono text-[1.32em] tabular-nums tracking-[0.06em] [text-shadow:0_1px_1px_rgba(0,0,0,.25)]">
                {shown.map((g, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {g}
                  </span>
                ))}
              </p>
              <div className="mt-[0.7em] flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.66em] uppercase tracking-[0.14em] opacity-60">{t('payments.card.holder')}</p>
                  <p className="truncate text-[0.98em] font-medium uppercase tracking-[0.06em]">{name || placeholderName}</p>
                </div>
                <div className="shrink-0">
                  <p className="text-[0.66em] uppercase tracking-[0.14em] opacity-60">{t('payments.card.expires')}</p>
                  <p className="font-mono text-[0.98em] tabular-nums">{exp || 'MM/YY'}</p>
                </div>
                <BrandMark brand={brand} className="shrink-0 text-[1.05em]" ink={f.ink} />
              </div>
            </div>
          </div>
        </div>

        {/* back */}
        <div
          className={cn('absolute inset-0 overflow-hidden rounded-[18px] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:rounded-[20px]', fs)}
          style={{ background: f.bg, color: f.ink, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), 0 22px 40px -22px rgba(0,0,0,.55)' }}
        >
          <div className="absolute inset-x-0 top-[14%] h-[19%] bg-[#0b0b0c]/85" />
          <div className="absolute inset-x-[7%] top-[44%] flex h-[17%] items-center justify-end rounded-[6px] bg-[repeating-linear-gradient(-45deg,#f4f4f5_0_6px,#e4e4e7_6px_12px)] pr-[4%]">
            <span className="rounded bg-white px-2 py-0.5 font-mono text-[1.1em] font-semibold italic tracking-[0.12em] text-[#0b0b0c]">{(cvc ?? '').padEnd(brand === 'amex' ? 4 : 3, '•')}</span>
          </div>
          <p className="absolute bottom-[10%] left-[7%] max-w-[60%] text-[0.7em] leading-snug opacity-60">{t('payments.card.cvcNote')}</p>
          <BrandMark brand={brand} className="absolute bottom-[9%] right-[7%] text-[1em]" ink={f.ink} />
        </div>
      </motion.div>
      </motion.div>
      <style>{`@keyframes dt-card-sweep{0%{transform:translateX(0) skewX(-12deg);opacity:0}12%{opacity:1}40%{transform:translateX(420%) skewX(-12deg);opacity:0}100%{transform:translateX(420%) skewX(-12deg);opacity:0}}`}</style>
    </div>
  )
}
