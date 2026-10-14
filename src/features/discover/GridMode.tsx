import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Heart, MessageCircle, RotateCcw, Star, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore } from '@/store/selectors'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { MediaView } from '@/components/art/MediaView'
import { useDiscoverUI, type GridShow } from './discoverStore'
import { useSwipeActions, type usePool } from './hooks'
import { DisciplineRow, HeartButton, LocationLine, MatchRing, PersonAvatar, PersonBadges, PriceLabel, RelationPill, fmtRating } from './ProfileBits'
import { DiscoverEmpty } from './DiscoverEmpty'
import { findMatch, headlineOf, pairForPerson, ratingOf, shotsOf, type Person, type Relation } from './model'

type Pool = ReturnType<typeof usePool>

const SHOWS: GridShow[] = ['all', 'todo', 'liked', 'passed']

function inShow(rel: Relation | undefined, show: GridShow) {
  if (show === 'todo') return rel === 'none'
  if (show === 'liked') return rel === 'liked' || rel === 'super' || rel === 'matched'
  if (show === 'passed') return rel === 'passed'
  return true
}

export function GridMode({ pool }: { pool: Pool }) {
  const t = useT()
  const show = useDiscoverUI((s) => s.gridShow)
  const setShow = useDiscoverUI((s) => s.setGridShow)
  const setPreview = useDiscoverUI((s) => s.setPreview)
  const counts = useMemo(() => {
    const c: Record<GridShow, number> = { all: 0, todo: 0, liked: 0, passed: 0 }
    for (const p of pool.filtered) for (const s of SHOWS) if (inShow(pool.rel.get(p.data.id), s)) c[s]++
    return c
  }, [pool.filtered, pool.rel])
  const list = useMemo(() => pool.filtered.filter((p) => inShow(pool.rel.get(p.data.id), show)), [pool.filtered, pool.rel, show])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">
          <Segmented<GridShow>
            value={show}
            onChange={setShow}
            layoutId="discover-grid-show"
            pill="surface"
            options={SHOWS.map((s) => ({ value: s, label: t(`discover.grid.${s}`), count: counts[s] }))}
          />
        </div>
        <p className="text-[13px] text-ink-3">{t('discover.grid.showing', { count: list.length })}</p>
      </div>

      {list.length === 0 ? (
        show === 'all' || show === 'todo' ? (
          <div className="card">
            <DiscoverEmpty pool={pool} />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={show === 'liked' ? <Heart /> : <X />}
              title={t(`discover.grid.empty.${show}`)}
              description={t(`discover.grid.empty.${show}Hint`)}
              action={
                <Button variant="glass" onClick={() => setShow('todo')}>
                  {t('discover.grid.todo')}
                </Button>
              }
            />
          </div>
        )
      ) : (
        <motion.div
          key={show}
          className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <GridCard key={p.data.id} index={i} p={p} rel={pool.rel.get(p.data.id) ?? 'none'} score={matchScore(p.data, pool.role, pool.discipline)} onOpen={() => setPreview(p.data.id)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

const thumbV = (i: number) => ({
  hidden: { y: 40, opacity: 0 },
  show: { y: 40, opacity: 0, transition: { duration: 0.2 } },
  hover: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 26, delay: i * 0.05 } },
})

const cardV = {
  hidden: { opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' },
  show: (i: number) => ({ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT, delay: Math.min(i, 12) * 0.04 } }),
  hover: { opacity: 1, y: -4, scale: 1, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 400, damping: 26 } },
}

function GridCard({ p, index, rel, score, onOpen }: { p: Person; index: number; rel: Relation; score: number; onOpen: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const { decide, undo } = useSwipeActions()
  const matches = useApp((s) => s.matches)
  const shots = shotsOf(p, 4)
  const cover = shots[0]
  const thumbs = shots.slice(1, 4)
  const liked = rel === 'liked' || rel === 'super' || rel === 'matched'
  const passed = rel === 'passed'
  // stagger only the entrance; hover-out must not wait for the stagger delay
  const [entered, setEntered] = useState(false)

  const message = () => {
    const m = findMatch(matches, p)
    if (!m) return
    const id = useApp.getState().ensureConversation(m.clientId, m.designerId)
    navigate(`/messages/${id}`)
  }

  return (
    <motion.article
      layout
      custom={entered ? 0 : index}
      onAnimationComplete={(def) => def === 'show' && setEntered(true)}
      variants={cardV}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)', transition: { duration: 0.2 } }}
      whileHover="hover"
      onClick={onOpen}
      className="card group/card relative cursor-pointer p-2.5 transition-shadow duration-300 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-night">
        <motion.div className="absolute inset-0" variants={{ hidden: { scale: 1.1 }, show: { scale: 1 }, hover: { scale: 1.07 } }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
          <MediaView media={cover.media} playBadge={false} className={cn('transition-[filter] duration-500', passed && 'grayscale')} />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <PersonBadges person={p} onDark />
            <AnimatePresence>
              {rel !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  <RelationPill relation={rel} className="shadow-[0_4px_14px_-4px_rgba(0,0,0,.4)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <MatchRing score={score} size={42} onDark label={false} />
        </div>
        {/* hover: more shots slide up */}
        {thumbs.length > 0 && (
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 grid grid-cols-3 gap-1.5">
            {thumbs.map((s, i) => (
              <motion.div key={i} variants={thumbV(i)} className="aspect-square overflow-hidden rounded-[12px] border-2 border-white/90 shadow-lg">
                <MediaView media={s.media} playBadge={false} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="relative px-2 pb-1.5">
        <div className="-mt-7 flex items-end justify-between gap-2">
          <PersonAvatar person={p} size={56} className="relative shadow-[0_0_0_4px_var(--surface)]" />
          <div className="flex items-center gap-1.5 pb-0.5" onClick={(e) => e.stopPropagation()}>
            {rel === 'matched' ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={message}
                className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink"
                aria-label={t('core.action.message')}
              >
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">{t('core.action.message')}</span>
              </motion.button>
            ) : (
              <>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => (passed ? undo(p.data.id) : decide(p, 'pass'))}
                  aria-label={passed ? t('discover.cta.reconsider') : t('core.action.pass')}
                  title={passed ? t('discover.cta.reconsider') : t('core.action.pass')}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full transition-colors',
                    passed ? 'bg-ink text-[var(--surface)] dark:bg-[var(--surface-3)] dark:text-ink' : 'glass text-ink-2 hover:text-[#e5484d]',
                  )}
                >
                  {passed ? <RotateCcw className="size-4" /> : <X className="size-[18px]" />}
                </motion.button>
                <HeartButton
                  active={liked}
                  label={liked ? t('core.action.undo') : t('core.action.like')}
                  onClick={(el) => {
                    if (pairForPerson(p).role !== useApp.getState().settings.role) return
                    if (liked) undo(p.data.id)
                    else decide(p, 'like', { from: el })
                  }}
                />
              </>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <h3 className="truncate text-[16.5px] font-medium tracking-[-0.02em]">{p.data.name}</h3>
          {p.data.verified && <BadgeCheck className="size-4 shrink-0 text-info" />}
          {rel === 'super' && <Star className="size-4 shrink-0 fill-[#3e8ef7] text-[#3e8ef7]" />}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-3">{headlineOf(p)}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[12.5px]">
          <PriceLabel person={p} className="font-medium text-ink" compact />
          <span className="inline-flex items-center gap-1 font-mono text-ink-2">
            <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
            {ratingOf(p) !== null ? fmtRating(ratingOf(p)!) : t('discover.card.newShort')}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[12px] text-ink-3">
          <LocationLine person={p} />
          <DisciplineRow person={p} size={20} max={3} />
        </div>
      </div>
    </motion.article>
  )
}
