import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react'
import { Heart, Info, RotateCcw, Star, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useUI } from '@/store/ui'
import { matchScore } from '@/store/selectors'
import type { SwipeDecision } from '@/store/types'
import { useDiscoverUI } from './discoverStore'
import { useLastSwipe, useSwipeActions, usePool } from './hooks'
import { SwipeCard, vecFor, type ExitVec, type SwipeCardHandle } from './SwipeCard'
import { SessionCard, ShortcutsCard, UpNextCard, WhyCard } from './SwipePanels'
import { DiscoverEmpty } from './DiscoverEmpty'
import type { Person } from './model'

type Pool = ReturnType<typeof usePool>
type Burst = { kind: SwipeDecision; key: number; name: string }

const VISIBLE = 3

export function SwipeMode({ pool }: { pool: Pool }) {
  const t = useT()
  const { decide, undo } = useSwipeActions()
  const last = useLastSwipe()
  const superLeft = useApp((s) => s.superLikesLeft)
  const returning = useDiscoverUI((s) => s.returning)
  const setPreview = useDiscoverUI((s) => s.setPreview)
  const deck = pool.deck
  const top = deck[0]
  const visible = deck.slice(0, VISIBLE + 1)

  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const topRef = useRef<SwipeCardHandle>(null)
  const [exits, setExits] = useState<Record<string, ExitVec>>({})
  const [burst, setBurst] = useState<Burst | null>(null)
  const [firstMount, setFirstMount] = useState(true)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const id = window.setTimeout(() => setFirstMount(false), 900)
    return () => window.clearTimeout(id)
  }, [])

  const commit = (p: Person, d: SwipeDecision, vec: ExitVec) => {
    setExits((m) => ({ ...m, [p.data.id]: vec }))
    dragX.set(0)
    dragY.set(0)
    // a tiny haptic tick on phones (ignored where unsupported)
    if (useApp.getState().settings.motion !== 'off') navigator.vibrate?.(d === 'pass' ? 8 : 16)
    const res = decide(p, d, { from: buttons.current[d] ?? undefined, dir: vec.x as -1 | 0 | 1, quiet: true })
    if (!res.matched) setBurst({ kind: d === 'super' && useApp.getState().decisions[pool.role][p.data.id] === 'like' ? 'like' : d, key: Date.now(), name: p.data.name.split(' ')[0] })
  }

  const act = (d: SwipeDecision) => {
    if (!top) return
    if (topRef.current) topRef.current.fling(d)
    else commit(top, d, vecFor(d))
  }

  const doUndo = () => {
    if (!last) return
    setBurst(null)
    setExits((m) => {
      const n = { ...m }
      delete n[last.id]
      return n
    })
    undo()
  }

  // keyboard: ← pass · → like · ↑ super · space next shot · ↵/↓ info · ⌫ undo
  const actRef = useRef({ act, doUndo, top })
  actRef.current = { act, doUndo, top }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return
      if (useDiscoverUI.getState().preview || useUI.getState().celebration || useUI.getState().paletteOpen) return
      if (document.querySelector('[role="dialog"]:not([inert])')) return
      const { act: a, doUndo: u, top: tp } = actRef.current
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          a('pass')
          break
        case 'ArrowRight':
          e.preventDefault()
          a('like')
          break
        case 'ArrowUp':
          e.preventDefault()
          a('super')
          break
        case ' ':
          e.preventDefault()
          topRef.current?.nextShot()
          break
        case 'Enter':
        case 'ArrowDown':
          if (tp) {
            e.preventDefault()
            useDiscoverUI.getState().setPreview(tp.data.id)
          }
          break
        case 'Backspace':
        case 'z':
          e.preventDefault()
          u()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scores = useMemo(() => new Map(deck.slice(0, 8).map((p) => [p.data.id, matchScore(p.data, pool.role, pool.discipline)])), [deck, pool.role, pool.discipline])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <motion.section
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="card relative overflow-hidden px-3 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-6"
      >
        {/* stage décor */}
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_45%,#000,transparent)]" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {deck.length === 0 ? (
          <DiscoverEmpty pool={pool} className="relative min-h-[520px]" />
        ) : (
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="relative h-[min(60dvh,520px)] min-h-[400px] sm:h-[min(66dvh,610px)] sm:min-h-[480px]">
              <div className="absolute inset-x-0 bottom-12 top-0">
                <AnimatePresence custom={exits}>
                  {visible
                    .map((p, i) => {
                      const isReturning = returning?.id === p.data.id
                      return (
                        <StackSlot
                          key={p.data.id}
                          id={p.data.id}
                          index={i}
                          firstMount={firstMount}
                          enterFrom={isReturning ? returning!.dir : null}
                          dragX={dragX}
                          dragY={dragY}
                        >
                          <SwipeCard
                            ref={i === 0 ? topRef : undefined}
                            person={p}
                            score={scores.get(p.data.id) ?? matchScore(p.data, pool.role, pool.discipline)}
                            isTop={i === 0}
                            dragX={dragX}
                            dragY={dragY}
                            onDecide={(d, vec) => commit(p, d, vec)}
                            onInfo={() => setPreview(p.data.id)}
                          />
                        </StackSlot>
                      )
                    })
                    .reverse()}
                </AnimatePresence>
                <DeckBurst burst={burst} />
              </div>
            </div>

            <DeckButtons
              dragX={dragX}
              dragY={dragY}
              superLeft={superLeft}
              canUndo={!!last}
              onUndo={doUndo}
              onAct={act}
              onInfo={() => top && setPreview(top.data.id)}
              registerButton={(k, el) => (buttons.current[k] = el)}
            />

            <div className="mt-3 h-5 text-center text-[12.5px] text-ink-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={burst?.key ?? 'hint'}
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25 }}
                  className="truncate"
                >
                  {burst && burst.kind !== 'pass'
                    ? t(burst.kind === 'super' ? 'discover.deck.superSent' : 'discover.deck.likeSent', { name: burst.name })
                    : burst
                      ? t('discover.deck.passed', { name: burst.name })
                      : t('discover.deck.hint')}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.section>

      <motion.aside
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
        className="grid min-w-0 grid-cols-1 content-start gap-4 md:grid-cols-2 xl:grid-cols-1"
      >
        {top && <WhyCard person={top} score={scores.get(top.data.id) ?? 0} onOpen={() => setPreview(top.data.id)} />}
        {deck.length > 1 && <UpNextCard people={deck.slice(1, 6)} total={deck.length - 1} role={pool.role} discipline={pool.discipline} />}
        <SessionCard />
        <ShortcutsCard className="hidden md:block" />
      </motion.aside>
    </div>
  )
}

/** Positions a card in the stack and handles enter/exit choreography. */
function StackSlot({
  id,
  index,
  firstMount,
  enterFrom,
  dragX,
  dragY,
  children,
}: {
  id: string
  index: number
  firstMount: boolean
  enterFrom: -1 | 0 | 1 | null
  dragX: MotionValue<number>
  dragY: MotionValue<number>
  children: ReactNode
}) {
  // the card right behind the top one grows as the top card is dragged away
  const progress = useTransform(() => Math.min(1, Math.hypot(dragX.get(), dragY.get()) / 160))
  const grow = useTransform(progress, [0, 1], [1, index === 1 ? 1.055 : index === 2 ? 1.03 : 1])
  const lift = useTransform(progress, [0, 1], [0, index === 1 ? -14 : index === 2 ? -8 : 0])

  const initial =
    enterFrom !== null
      ? { x: enterFrom * 560, y: enterFrom === 0 ? -420 : 40, rotate: enterFrom * 22, opacity: 0, scale: 0.96 }
      : firstMount
        ? { x: 0, y: 140 + index * 30, rotate: (index - 1) * 5, opacity: 0, scale: 0.84 }
        : { x: 0, y: 70, rotate: 0, opacity: 0, scale: 0.8 }

  return (
    <motion.div
      className="absolute inset-0"
      style={{ zIndex: 20 - index, transformOrigin: '50% 100%' }}
      initial={initial}
      animate={{
        x: 0,
        rotate: 0,
        y: index * 15,
        scale: 1 - index * 0.06,
        opacity: index >= VISIBLE ? 0 : 1,
        transition: { type: 'spring', stiffness: 280, damping: 26, mass: 0.9, delay: firstMount ? (VISIBLE - index) * 0.09 : 0 },
      }}
      variants={{
        exit: (m: Record<string, ExitVec> | undefined) => {
          const v = m?.[id]
          if (!v) return { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
          return {
            x: v.x * 760,
            y: v.y * 900 + (v.x ? 80 : 0),
            rotate: v.x * 28,
            opacity: 0,
            transition: { duration: 0.55, ease: EASE_OUT },
          }
        },
      }}
      exit="exit"
    >
      <motion.div className="absolute inset-0" style={index > 0 ? { scale: grow, y: lift, transformOrigin: '50% 100%' } : undefined}>
        {children}
        {/* depth: cards further back are dimmed (opaque, so nothing ghosts through) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[30px] bg-black"
          initial={false}
          animate={{ opacity: Math.min(index, 3) * 0.18 }}
          transition={{ duration: 0.35 }}
        />
      </motion.div>
    </motion.div>
  )
}

const BURST_ICON: Record<SwipeDecision, { icon: ReactNode; color: string }> = {
  like: { icon: <Heart className="size-full fill-current" />, color: '#ff3b6b' },
  super: { icon: <Star className="size-full fill-current" />, color: '#3e8ef7' },
  pass: { icon: <X className="size-full" strokeWidth={3} />, color: 'var(--ink-3)' },
}

/** Big icon that pops over the deck after a decision. */
function DeckBurst({ burst }: { burst: Burst | null }) {
  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.key}
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
        >
          <motion.span
            className="absolute size-40 rounded-full border-[3px]"
            style={{ borderColor: BURST_ICON[burst.kind].color }}
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          />
          <motion.span
            className="relative size-24 drop-shadow-[0_10px_30px_rgba(0,0,0,.35)]"
            style={{ color: BURST_ICON[burst.kind].color }}
            initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
            animate={{ scale: [0.2, 1.25, 1], rotate: [-25, 8, 0], opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            {BURST_ICON[burst.kind].icon}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DeckButtons({
  dragX,
  dragY,
  superLeft,
  canUndo,
  onUndo,
  onAct,
  onInfo,
  registerButton,
}: {
  dragX: MotionValue<number>
  dragY: MotionValue<number>
  superLeft: number
  canUndo: boolean
  onUndo: () => void
  onAct: (d: SwipeDecision) => void
  onInfo: () => void
  registerButton: (k: string, el: HTMLButtonElement | null) => void
}) {
  const t = useT()
  const likeS = useTransform(dragX, [0, 140], [1, 1.22], { clamp: true })
  const passS = useTransform(dragX, [-140, 0], [1.22, 1], { clamp: true })
  const superS = useTransform(dragY, [-140, 0], [1.22, 1], { clamp: true })
  return (
    <div className="relative z-40 -mt-2 flex items-center justify-center gap-2.5 sm:gap-4">
      <RoundAction label={`${t('core.action.undo')} (⌫)`} size={46} color="#f5a524" onClick={onUndo} disabled={!canUndo} register={(el) => registerButton('undo', el)}>
        <RotateCcw className="size-5" />
      </RoundAction>
      <RoundAction label={`${t('core.action.pass')} (←)`} size={64} color="#ff3b6b" scale={passS} onClick={() => onAct('pass')} register={(el) => registerButton('pass', el)}>
        <X className="size-7" strokeWidth={2.75} />
      </RoundAction>
      <RoundAction
        label={`${t('discover.action.super')} (↑) · ${t('discover.superLeft', { count: superLeft })}`}
        size={52}
        color="#3e8ef7"
        scale={superS}
        onClick={() => onAct('super')}
        register={(el) => registerButton('super', el)}
        badge={superLeft}
      >
        <Star className="size-[22px] fill-current" />
      </RoundAction>
      <RoundAction label={`${t('core.action.like')} (→)`} size={64} color="#2fb36b" scale={likeS} onClick={() => onAct('like')} register={(el) => registerButton('like', el)}>
        <Heart className="size-7 fill-current" />
      </RoundAction>
      <RoundAction label={`${t('discover.action.info')} (↵)`} size={46} color="var(--ink-2)" onClick={onInfo} register={(el) => registerButton('info', el)}>
        <Info className="size-5" />
      </RoundAction>
    </div>
  )
}

function RoundAction({
  label,
  size,
  color,
  scale,
  onClick,
  disabled,
  badge,
  register,
  children,
}: {
  label: string
  size: number
  color: string
  scale?: MotionValue<number>
  onClick: () => void
  disabled?: boolean
  badge?: number
  register?: (el: HTMLButtonElement | null) => void
  children: ReactNode
}) {
  return (
    <motion.span style={scale ? { scale } : undefined} className="relative inline-flex">
      <motion.button
        ref={register}
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.1, y: -3 }}
        whileTap={disabled ? undefined : { scale: 0.86 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
        className="group/ra glass relative flex items-center justify-center rounded-full transition-[opacity,box-shadow] duration-200 disabled:opacity-35"
        style={{ width: size, height: size, color, boxShadow: `0 14px 30px -14px ${color}, inset 0 1px 0 var(--glass-edge)` }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover/ra:opacity-100 group-disabled/ra:opacity-0"
          style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}
        />
        <span className="relative">{children}</span>
      </motion.button>
      {badge !== undefined && (
        <motion.span
          key={badge}
          initial={{ scale: 1.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className={cn(
            'pointer-events-none absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-[var(--surface)] font-mono text-[10px] font-bold text-white',
            badge > 0 ? 'bg-[#3e8ef7]' : 'bg-ink-4',
          )}
        >
          {badge}
        </motion.span>
      )}
    </motion.span>
  )
}
