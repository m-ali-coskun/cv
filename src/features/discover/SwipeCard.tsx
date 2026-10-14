import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { BadgeCheck, Banknote, Briefcase, ChevronUp, Clock3, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { MediaView } from '@/components/art/MediaView'
import type { SwipeDecision } from '@/store/types'
import { DisciplineRow, LocationLine, MatchRing, PersonAvatar, PersonBadges, PriceLabel, fmtRating } from './ProfileBits'
import { shotsOf, type Person } from './model'

export type ExitVec = { x: number; y: number }

export interface SwipeCardHandle {
  /** Animate toward a decision (shows the stamp), then commit it. */
  fling: (d: SwipeDecision) => void
  nextShot: () => void
}

const SHOT_MS = 4800
const THRESHOLD = 115
const VELOCITY = 650

export const vecFor = (d: SwipeDecision): ExitVec => (d === 'pass' ? { x: -1, y: 0 } : d === 'like' ? { x: 1, y: 0 } : { x: 0, y: -1 })

interface Props {
  person: Person
  score: number
  isTop: boolean
  dragX: MotionValue<number>
  dragY: MotionValue<number>
  onDecide: (d: SwipeDecision, vec: ExitVec) => void
  onInfo: () => void
}

/**
 * The draggable profile card. Owns its own x/y motion values so a card that is
 * flying out never jumps when the next one becomes interactive; the deck gets
 * a mirror of the top card's offset (dragX/dragY) to animate the buttons.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ person, score, isTop, dragX, dragY, onDecide, onInfo }, ref) {
  const t = useT()
  const lang = useLang()
  const motionLevel = useApp((s) => s.settings.motion)
  const shots = shotsOf(person, 6)
  const [shot, setShot] = useState(0)
  const [paused, setPaused] = useState(false)
  const busy = useRef(false)
  const moved = useRef(false)
  const down = useRef<{ x: number; y: number } | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-340, 0, 340], [-17, 0, 17])
  const likeO = useTransform(() => (Math.abs(y.get()) > Math.abs(x.get()) * 1.1 ? 0 : clamp01((x.get() - 24) / 100)))
  const nopeO = useTransform(() => (Math.abs(y.get()) > Math.abs(x.get()) * 1.1 ? 0 : clamp01((-x.get() - 24) / 100)))
  const superO = useTransform(() => (Math.abs(y.get()) > Math.abs(x.get()) * 1.1 ? clamp01((-y.get() - 30) / 100) : 0))
  const likeS = useTransform(likeO, [0, 1], [1.5, 1])
  const nopeS = useTransform(nopeO, [0, 1], [1.5, 1])
  const superS = useTransform(superO, [0, 1], [1.5, 1])
  const likeWash = useTransform(likeO, (v) => v * 0.55)
  const nopeWash = useTransform(nopeO, (v) => v * 0.55)
  const superWash = useTransform(superO, (v) => v * 0.55)

  useMotionValueEvent(x, 'change', (v) => isTop && dragX.set(v))
  useMotionValueEvent(y, 'change', (v) => isTop && dragY.set(v))

  // story-style autoplay through the shots of the top card
  const autoplay = isTop && !paused && motionLevel !== 'off' && shots.length > 1
  useEffect(() => {
    if (!autoplay) return
    const id = window.setTimeout(() => setShot((s) => (s + 1) % shots.length), SHOT_MS)
    return () => window.clearTimeout(id)
  }, [autoplay, shot, shots.length])

  const commit = (d: SwipeDecision) => {
    if (busy.current) return
    busy.current = true
    dragX.set(0)
    dragY.set(0)
    onDecide(d, vecFor(d))
  }

  useImperativeHandle(
    ref,
    () => ({
      fling: (d) => {
        if (busy.current) return
        const v = vecFor(d)
        const opts = { duration: 0.2, ease: EASE_OUT }
        Promise.all([animate(x, v.x * 150, opts), animate(y, v.y * 150, opts)]).then(() => commit(d))
      },
      nextShot: () => setShot((s) => (s + 1) % shots.length),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shots.length],
  )

  const stepShot = (dir: 1 | -1) => setShot((s) => (s + dir + shots.length) % shots.length)
  const current = shots[Math.min(shot, shots.length - 1)]

  return (
    <motion.div
      className={cn('absolute inset-0 touch-none select-none', isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none')}
      style={{ x, y, rotate }}
      drag={isTop}
      dragMomentum={false}
      dragElastic={0.85}
      onPointerDownCapture={(e) => {
        moved.current = false
        down.current = { x: e.clientX, y: e.clientY }
      }}
      onDragStart={() => {
        moved.current = true
        setPaused(true)
      }}
      onDragEnd={(_, info) => {
        setPaused(false)
        const { offset: o, velocity: v } = info
        const vertical = Math.abs(o.y) > Math.abs(o.x) * 1.1
        if (vertical && (o.y < -THRESHOLD || v.y < -VELOCITY)) return commit('super')
        if (!vertical && (o.x > THRESHOLD || v.x > VELOCITY)) return commit('like')
        if (!vertical && (o.x < -THRESHOLD || v.x < -VELOCITY)) return commit('pass')
        const back = { type: 'spring', stiffness: 520, damping: 30 } as const
        animate(x, 0, back)
        animate(y, 0, back)
      }}
      onHoverStart={() => setPaused(true)}
      onHoverEnd={() => setPaused(false)}
    >
      <div className="relative size-full overflow-hidden rounded-[30px] bg-night shadow-[0_40px_80px_-36px_rgba(0,0,0,.65),0_2px_6px_rgba(0,0,0,.12)] ring-1 ring-white/10">
        {/* media */}
        <AnimatePresence initial={false}>
          <motion.div
            key={shot}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.08, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            <MediaView media={current.media} playBadge={false} className="pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* decision colour wash */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,#2fd57a,transparent_65%)]" style={{ opacity: likeWash }} />
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,#ff3b6b,transparent_65%)]" style={{ opacity: nopeWash }} />
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,#3e8ef7,transparent_65%)]" style={{ opacity: superWash }} />

        {/* top scrim, story bars, badges */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 via-black/25 to-transparent" />
        <div className="absolute inset-x-3.5 top-3 z-[2] flex gap-1">
          {shots.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <motion.div
                key={i === shot ? `a${shot}-${autoplay}` : `i${i}`}
                className="h-full origin-left rounded-full bg-white"
                initial={{ scaleX: i < shot ? 1 : 0 }}
                animate={{ scaleX: i <= shot ? 1 : 0 }}
                transition={i === shot && autoplay ? { duration: SHOT_MS / 1000, ease: 'linear' } : { duration: 0.25 }}
              />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-3.5 top-6 z-[2] flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <PersonBadges person={person} onDark />
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 font-mono text-[10.5px] text-white/85 backdrop-blur-md">
              <span className="tabular-nums">
                {String(shot + 1).padStart(2, '0')}/{String(shots.length).padStart(2, '0')}
              </span>
              <span className="truncate opacity-80">· {current.title}</span>
            </div>
          </div>
          <MatchRing score={score} size={54} onDark />
        </div>

        {/* tap zones (left = previous shot, right = next shot) */}
        {shots.length > 1 && (
          <div className="absolute inset-x-0 bottom-[42%] top-16 z-[1] flex">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                type="button"
                tabIndex={-1}
                aria-label={t(dir < 0 ? 'discover.card.prevShot' : 'discover.card.nextShot')}
                className="h-full flex-1 cursor-[inherit] outline-none"
                onClick={(e) => {
                  const d = down.current
                  if (moved.current || (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6)) return
                  stepShot(dir as 1 | -1)
                }}
              />
            ))}
          </div>
        )}

        {/* bottom info */}
        <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-28 text-white sm:px-5 sm:pb-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <PersonAvatar person={person} size={46} className="shadow-[0_0_0_2px_rgba(255,255,255,.85)]" />
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 truncate text-[24px] font-semibold leading-none tracking-[-0.03em] sm:text-[27px]">
                    <span className="truncate">{person.data.name}</span>
                    {person.data.verified && <BadgeCheck className="size-5 shrink-0 text-[#6cb6ff]" />}
                  </h3>
                  <div className="mt-1 truncate font-mono text-[11.5px] text-white/65">
                    {person.kind === 'designer' ? person.data.handle : `${person.data.contactName} · ${person.data.contactRole}`}
                  </div>
                </div>
              </div>
              <p className="mt-2.5 line-clamp-2 text-[14px] leading-snug text-white/90">{person.kind === 'designer' ? person.data.headline : person.data.industry}</p>
            </div>
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onInfo()
              }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t('discover.card.seeProfile')}
              title={t('discover.card.seeProfile')}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-xl"
            >
              <ChevronUp className="size-5" />
            </motion.button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-white/80">
            <LocationLine person={person} className="max-w-[60%]" />
            {person.kind === 'designer' ? (
              <>
                <PriceLabel person={person} className="text-white" />
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
                  {person.data.reviewsCount ? `${fmtRating(person.data.rating)} (${person.data.reviewsCount})` : t('discover.card.noReviews')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', AVAIL_DOT[person.data.availability])} />
                  {t(`core.availability.${person.data.availability}`)}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <Banknote className="size-3.5 opacity-70" />
                  <PriceLabel person={person} className="text-white" compact />
                </span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
                  {fmtRating(person.data.rating)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-3.5 opacity-70" />
                  {t('discover.card.hires', { count: person.data.hiresCount })}
                </span>
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden" style={{ maxHeight: 56 }}>
              {(person.kind === 'designer' ? person.data.skills.slice(0, 4) : person.data.openBriefs.slice(0, 2).map((b) => b.title)).map((s) => (
                <span key={s} className="max-w-full truncate rounded-full border border-white/15 bg-white/12 px-2.5 py-1 text-[11.5px] font-medium backdrop-blur-md">
                  {s}
                </span>
              ))}
              {person.kind === 'client' && person.data.openBriefs.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--accent-ink)]">
                  <Clock3 className="size-3" />
                  {t('discover.card.openBriefs', { count: person.data.openBriefs.length })} · {formatMoney(person.data.openBriefs.reduce((n, b) => n + b.budget, 0), person.data.currency, lang, true)}
                </span>
              )}
            </div>
            <DisciplineRow person={person} size={24} max={3} className="shrink-0" />
          </div>
        </div>

        {/* stamps */}
        <motion.div
          aria-hidden
          style={{ opacity: likeO, scale: likeS }}
          className="pointer-events-none absolute left-5 top-20 z-[3] -rotate-[14deg] rounded-2xl border-[4px] border-[#2fd57a] bg-[#2fd57a]/10 px-3.5 py-1 text-[34px] font-black uppercase leading-none tracking-[0.08em] text-[#2fd57a] shadow-[0_0_30px_-4px_#2fd57a] backdrop-blur-[2px]"
        >
          {t('discover.stamp.like')}
        </motion.div>
        <motion.div
          aria-hidden
          style={{ opacity: nopeO, scale: nopeS }}
          className="pointer-events-none absolute right-5 top-20 z-[3] rotate-[14deg] rounded-2xl border-[4px] border-[#ff3b6b] bg-[#ff3b6b]/10 px-3.5 py-1 text-[34px] font-black uppercase leading-none tracking-[0.08em] text-[#ff3b6b] shadow-[0_0_30px_-4px_#ff3b6b] backdrop-blur-[2px]"
        >
          {t('discover.stamp.nope')}
        </motion.div>
        <motion.div
          aria-hidden
          style={{ opacity: superO, scale: superS }}
          className="pointer-events-none absolute inset-x-0 bottom-[44%] z-[3] mx-auto w-max -rotate-[6deg] rounded-2xl border-[4px] border-[#3e8ef7] bg-[#3e8ef7]/10 px-3.5 py-1 text-center text-[30px] font-black uppercase leading-none tracking-[0.08em] text-[#5aa2ff] shadow-[0_0_30px_-4px_#3e8ef7] backdrop-blur-[2px]"
        >
          {t('discover.stamp.super')}
        </motion.div>
      </div>
    </motion.div>
  )
})

const AVAIL_DOT = { available: 'bg-[#2fd57a] shadow-[0_0_8px_#2fd57a]', limited: 'bg-[#f5a524]', booked: 'bg-[#ff3b6b]' } as const

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
