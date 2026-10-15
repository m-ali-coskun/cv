import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue } from 'motion/react'
import { Heart, Star, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { matchScore } from '@/store/selectors'
import type { SwipeDecision } from '@/store/types'
import { SwipeCard, type ExitVec, type SwipeCardHandle } from '@/features/discover/SwipeCard'
import type { Person } from '@/features/discover/model'

/**
 * The real Discover swipe card, rendered with your own data. It is fully
 * interactive: drag it (or use the buttons) and it flies out like it would
 * for a client, then springs back so you can try again.
 */
export function DiscoverCardPreview({
  person,
  onOpen,
  className,
  controls = true,
  live = true,
}: {
  person: Person
  onOpen?: () => void
  className?: string
  controls?: boolean
  live?: boolean
}) {
  const t = useT()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const card = useRef<SwipeCardHandle>(null)
  const [k, setK] = useState(0)
  const [vec, setVec] = useState<ExitVec>({ x: 1, y: 0 })
  const [last, setLast] = useState<SwipeDecision | null>(null)
  const score = matchScore(person.data, person.kind === 'designer' ? 'client' : 'designer', 'all')

  useEffect(() => {
    if (!last) return
    const id = window.setTimeout(() => setLast(null), 2600)
    return () => window.clearTimeout(id)
  }, [last, k])

  const decide = (d: SwipeDecision, v: ExitVec) => {
    setVec(v)
    setLast(d)
    setK((n) => n + 1)
  }

  return (
    <div className={cn('relative mx-auto w-full max-w-[380px]', className)}>
      {live && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-night px-3 py-1.5 text-[12px] font-medium text-on-night">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            {t('profile.preview.live')}
          </span>
          <span className="truncate font-mono text-[11px] text-ink-3">{t('profile.preview.tryDrag')}</span>
        </div>
      )}
      <div className="relative aspect-[3/4.2] w-full">
        {/* depth cards */}
        <div aria-hidden className="absolute inset-x-5 -bottom-2.5 top-4 rounded-[30px] bg-[color-mix(in_oklab,var(--night)_55%,transparent)] opacity-60" />
        <div aria-hidden className="absolute inset-x-9 -bottom-5 top-8 rounded-[30px] bg-[color-mix(in_oklab,var(--night)_35%,transparent)] opacity-50" />
        <AnimatePresence custom={vec} initial={false}>
          <motion.div
            key={k}
            className="absolute inset-0"
            custom={vec}
            variants={{
              enter: { opacity: 0, scale: 0.9, y: 24, filter: 'blur(8px)' },
              center: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: { ...spring.bouncy, delay: 0.12 } },
              exit: (v: ExitVec) => ({
                x: v.x * 560,
                y: v.y * 620,
                rotate: v.x * 22,
                opacity: 0,
                transition: { duration: 0.5, ease: EASE_OUT },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <SwipeCard ref={card} person={person} score={score} isTop dragX={dragX} dragY={dragY} onDecide={decide} onInfo={() => onOpen?.()} />
          </motion.div>
        </AnimatePresence>

        {/* swipe feedback */}
        <AnimatePresence>
          {last && (
            <motion.div
              key={`${last}-${k}`}
              initial={{ opacity: 0, y: 14, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, scale: 0.95, filter: 'blur(4px)' }}
              transition={spring.bouncy}
              className="pointer-events-none absolute inset-x-4 bottom-4 z-[5] rounded-2xl bg-white/90 px-3.5 py-2.5 text-center text-[12.5px] font-medium text-[#0b0b0c] shadow-xl backdrop-blur-xl dark:bg-black/75 dark:text-white"
            >
              {t(`profile.preview.feedback.${last}`)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {controls && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <RoundBtn label={t('core.action.pass')} onClick={() => card.current?.fling('pass')} className="text-[#ff3b6b]" size={52}>
            <X className="size-6" strokeWidth={2.6} />
          </RoundBtn>
          <RoundBtn label={t('profile.preview.super')} onClick={() => card.current?.fling('super')} className="text-[#3e8ef7]" size={44}>
            <Star className="size-5 fill-current" />
          </RoundBtn>
          <RoundBtn label={t('core.action.like')} onClick={() => card.current?.fling('like')} className="text-[#2fb36b]" size={52}>
            <Heart className="size-6 fill-current" />
          </RoundBtn>
        </div>
      )}
    </div>
  )
}

function RoundBtn({ label, onClick, children, className, size }: { label: string; onClick: () => void; children: React.ReactNode; className?: string; size: number }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.86 }}
      transition={spring.snappy}
      className={cn('glass flex items-center justify-center rounded-full', className)}
      style={{ width: size, height: size }}
    >
      {children}
    </motion.button>
  )
}

