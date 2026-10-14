import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Compass, FilterX, Heart, RotateCcw, Sparkles, UserPlus, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { Button } from '@/components/ui/Button'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { useDiscoverUI } from './discoverStore'
import { useSwipeActions, type usePool } from './hooks'
import { activeFilterCount } from './model'

type Pool = ReturnType<typeof usePool>

/** Fanned stack of blank cards with floating hearts — the "deck is empty" illustration. */
export function DeckIllustration({ className }: { className?: string }) {
  const cards = [
    { r: -14, x: -46, seed: 'empty-a', v: 'mesh' as const },
    { r: 10, x: 46, seed: 'empty-b', v: 'poster' as const },
    { r: -2, x: 0, seed: 'empty-c', v: 'blob3d' as const },
  ]
  return (
    <div className={cn('relative h-44 w-56', className)} aria-hidden>
      {cards.map((c, i) => (
        <motion.div
          key={c.seed}
          className="absolute left-1/2 top-1/2 h-36 w-28 overflow-hidden rounded-[18px] border-[3px] border-white bg-[var(--surface-2)] shadow-[0_18px_40px_-18px_rgba(0,0,0,.45)] dark:border-[var(--surface-3)]"
          style={{ marginLeft: -56, marginTop: -72 }}
          initial={{ opacity: 0, y: 30, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: [0, -6, 0], rotate: c.r, x: c.x }}
          transition={{
            opacity: { delay: i * 0.08 },
            rotate: { type: 'spring', stiffness: 200, damping: 14, delay: i * 0.08 },
            x: { type: 'spring', stiffness: 200, damping: 16, delay: i * 0.08 },
            y: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <GenerativeArt seed={c.seed} variant={c.v} className="size-full opacity-70 grayscale-[.4]" playBadge={false} />
        </motion.div>
      ))}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute text-[#ff3b6b]"
          style={{ left: `${22 + i * 28}%`, top: '70%' }}
          animate={{ y: [-10, -90], opacity: [0, 1, 0], scale: [0.6, 1, 0.8] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
        >
          <Heart className="size-4 fill-current" />
        </motion.span>
      ))}
    </div>
  )
}

/** Empty pool: nothing left to swipe, or the filters are too strict. */
export function DiscoverEmpty({ pool, className, compact }: { pool: Pool; className?: string; compact?: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const { reviewPassed } = useSwipeActions()
  const resetFilters = useDiscoverUI((s) => s.resetFilters)
  const setQuery = useDiscoverUI((s) => s.setQuery)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const filtersOn = activeFilterCount(pool.filters, pool.kind) > 0 || pool.query.trim().length > 0
  const tabOn = pool.discipline !== 'all'
  const who = t(pool.kind === 'designer' ? 'discover.who.designers' : 'discover.who.clients')

  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <DeckIllustration />
      <motion.h3
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-[22px] font-medium tracking-[-0.02em]"
      >
        {filtersOn ? t('discover.empty.filteredTitle') : t('discover.empty.title', { who })}
      </motion.h3>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-2 max-w-md text-[14px] text-ink-3">
        {filtersOn
          ? t('discover.empty.filteredText')
          : pool.passedCount > 0
            ? t('discover.empty.passedText', { count: pool.passedCount })
            : t('discover.empty.text')}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className={cn('mt-6 flex flex-wrap items-center justify-center gap-2', compact && 'mt-4')}
      >
        {filtersOn && (
          <Button
            icon={<FilterX className="size-4" />}
            onClick={() => {
              resetFilters(pool.role)
              setQuery('')
            }}
          >
            {t('discover.filters.reset')}
          </Button>
        )}
        {!filtersOn && pool.passedCount > 0 && (
          <Button icon={<RotateCcw className="size-4" />} onClick={() => reviewPassed()}>
            {t('discover.empty.reviewPassed')}
          </Button>
        )}
        {tabOn && (
          <Button variant="glass" icon={<Compass className="size-4" />} onClick={() => setDiscipline('all')}>
            {t('discover.empty.allDisciplines')}
          </Button>
        )}
        {pool.role === 'client' ? (
          <Button variant="glass" icon={<UserPlus className="size-4" />} onClick={() => navigate('/join')}>
            {t('discover.empty.invite')}
          </Button>
        ) : (
          <Button variant="glass" icon={<Sparkles className="size-4" />} onClick={() => navigate('/profile')}>
            {t('discover.empty.polish')}
          </Button>
        )}
        <Button variant="ghost" icon={<Users className="size-4" />} onClick={() => navigate('/network')}>
          {t(pool.role === 'client' ? 'discover.empty.myDesigners' : 'discover.empty.myClients')}
        </Button>
      </motion.div>
    </div>
  )
}
