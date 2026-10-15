import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, ChevronDown, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { useT } from '@/i18n'
import { toast } from '@/store/toasts'
import { Glass, CardHeader } from '@/components/ui/Glass'
import { IconButton } from '@/components/ui/Button'
import { Gauge } from '@/components/ui/Gauge'
import type { StrengthItem } from './data'
import { scrollToSection } from './saveState'
import { CheckRow } from './ui'

/** Lime "tick gauge" panel (reference: "Package compliance") + actionable checklist. */
export function StrengthCard({ score, items, footerLabel, className, extra }: { score: number; items: StrengthItem[]; footerLabel: ReactNode; className?: string; extra?: ReactNode }) {
  const t = useT()
  const [showDone, setShowDone] = useState(false)
  const done = items.filter((i) => i.ok)
  const missing = items.filter((i) => !i.ok).sort((a, b) => b.weight - a.weight)
  const panel = useRef<HTMLDivElement>(null)
  const prev = useRef(score)
  useEffect(() => {
    if (prev.current < 100 && score >= 100) {
      fireConfetti({ from: panel.current, particleCount: 160 })
      toast({ title: t('profile.strength.allStar'), description: t('profile.strength.allStarHint'), tone: 'success' })
    }
    prev.current = score
  }, [score, t])
  const level = score >= 100 ? 'allStar' : score >= 80 ? 'strong' : score >= 50 ? 'good' : 'weak'
  const onAccent = {
    '--ink': 'var(--accent-ink)',
    '--ink-2': 'color-mix(in oklab, var(--accent-ink) 72%, transparent)',
    '--ink-3': 'color-mix(in oklab, var(--accent-ink) 55%, transparent)',
  } as CSSProperties

  return (
    <Glass className={cn('p-4 sm:p-5', className)}>
      <CardHeader
        title={t('profile.strength.title')}
        subtitle={t(`profile.strength.level.${level}`)}
        action={
          missing.length ? (
            <IconButton label={t('profile.strength.fixNext')} onClick={() => scrollToSection(missing[0].section)}>
              <ArrowUpRight className="size-[18px]" />
            </IconButton>
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Trophy className="size-[18px]" />
            </span>
          )
        }
      />
      <div ref={panel} className="relative mt-4 overflow-hidden rounded-[22px] bg-accent px-4 pb-4 pt-6 text-accent-ink" style={onAccent}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/30 blur-2xl" />
        <Gauge
          value={score}
          tone="ink"
          color="var(--accent-ink)"
          label={t('profile.strength.label')}
          size={250}
          footer={
            <div className="flex items-center justify-between gap-3 rounded-full bg-white/90 px-4 py-2.5 text-[13px] text-[#0b0b0c] shadow-[inset_0_1px_0_#fff]">
              <span className="truncate font-medium">{footerLabel}</span>
              <span className="shrink-0 font-mono text-[12px] opacity-70">
                {done.length} / {items.length} {t('profile.strength.done')}
              </span>
            </div>
          }
        />
      </div>
      {extra}
      <div className="mt-4">
        <AnimatePresence initial={false}>
          {missing.map((i) => (
            <motion.div key={i.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0, x: 30, transition: { duration: 0.3, ease: EASE_OUT } }}>
              <CheckRow ok={false} onClick={() => scrollToSection(i.section)} hint={`+${i.weight}%`}>
                {t(`profile.strength.item.${i.id}`)}
              </CheckRow>
            </motion.div>
          ))}
        </AnimatePresence>
        {missing.length === 0 && <p className="px-2 py-1.5 text-[13px] text-ink-2">{t('profile.strength.allStarHint')}</p>}
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone((v) => !v)} className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-[12.5px] text-ink-3 hover:bg-[var(--surface-2)] hover:text-ink">
            <span>{t('profile.strength.completed', { count: done.length })}</span>
            <motion.span animate={{ rotate: showDone ? 180 : 0 }}>
              <ChevronDown className="size-4" />
            </motion.span>
          </button>
        )}
        <AnimatePresence initial={false}>
          {showDone && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {done.map((i) => (
                <CheckRow key={i.id} ok onClick={() => scrollToSection(i.section)}>
                  {t(`profile.strength.item.${i.id}`)}
                </CheckRow>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Glass>
  )
}
