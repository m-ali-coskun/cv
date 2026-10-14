import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Heart, Keyboard, Sparkles, Star, X, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore } from '@/store/selectors'
import type { DisciplineFilter, Role } from '@/store/types'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Badge'
import { useDiscoverUI } from './discoverStore'
import { PersonAvatar } from './ProfileBits'
import { headlineOf, reasonsFor, type Person } from './model'
import { useRole } from '@/store/selectors'

const TONE_DOT = { good: 'bg-[var(--accent)]', info: 'bg-[#7cc8ff]', warn: 'bg-[#f5a524]' } as const

/** Black "AI" card explaining the match score of the card on top. */
export function WhyCard({ person, score, onOpen, className }: { person: Person; score: number; onOpen: () => void; className?: string }) {
  const t = useT()
  const discipline = useApp((s) => s.settings.discipline)
  const reasons = useMemo(() => reasonsFor(person, discipline), [person, discipline])
  const first = person.data.name.split(' ')[0]
  return (
    <motion.div variants={item} className={cn('glass-night relative overflow-hidden p-5', className)}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_45%,transparent),transparent)] blur-xl" />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13.5px] font-medium">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
            <Sparkles className="size-3.5" />
          </span>
          {t('discover.why.title')}
        </div>
        <span className="font-mono text-[11px] text-white/50">{t('discover.why.live')}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={person.data.id}
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
          transition={{ duration: 0.35 }}
          className="relative"
        >
          <div className="mt-4 flex items-end justify-between gap-3">
            <h3 className="text-[19px] font-medium leading-tight tracking-[-0.02em] text-white">{t('discover.why.heading', { name: first })}</h3>
            <div className="text-right">
              <div className="text-[34px] font-medium leading-none tracking-[-0.03em] text-[var(--accent)]">
                <AnimatedCounter value={score} suffix="%" startOnView={false} />
              </div>
              <div className="mt-1 text-[11px] text-white/50">{t('discover.matchScore')}</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {reasons.map((r, i) => (
              <motion.li
                key={r.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i + 0.1, ...spring.snappy }}
                className="flex items-center gap-2.5 text-[13px] text-white/80"
              >
                <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT[r.tone])} />
                {t(`discover.${r.key}`, r.vars)}
              </motion.li>
            ))}
          </ul>
          <Button variant="accent" size="sm" className="mt-5" iconRight={<ArrowUpRight className="size-4" />} onClick={onOpen}>
            {t('discover.card.seeProfile')}
          </Button>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/** Queue preview — click a person to bring them to the top of the deck. */
export function UpNextCard({ people, total, role, discipline }: { people: Person[]; total: number; role: Role; discipline: DisciplineFilter }) {
  const t = useT()
  const setReturning = useDiscoverUI((s) => s.setReturning)
  return (
    <motion.div variants={item} className="card p-5">
      <div className="relative z-[1] flex items-center justify-between">
        <h3 className="text-[16px] font-medium tracking-[-0.02em]">{t('discover.upNext.title')}</h3>
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px] text-ink-2">{total}</span>
      </div>
      <ul className="relative z-[1] mt-3 space-y-1">
        <AnimatePresence initial={false}>
          {people.map((p) => (
            <motion.li key={p.data.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={spring.snappy}>
              <button
                type="button"
                onClick={() => setReturning({ id: p.data.id, dir: 0 })}
                className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                title={t('discover.upNext.jump')}
              >
                <PersonAvatar person={p} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{p.data.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{headlineOf(p)}</span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink-2 group-hover:hidden">{matchScore(p.data, role, discipline)}%</span>
                <ArrowUpRight className="hidden size-4 text-ink-2 group-hover:block" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  )
}

/** Counts of this session's decisions (undo stack of the active role). */
export function SessionCard() {
  const t = useT()
  const role = useRole()
  const history = useDiscoverUI((s) => s.history[role])
  const superLeft = useApp((s) => s.superLikesLeft)
  const c = useMemo(() => {
    const out = { like: 0, super: 0, pass: 0, match: 0 }
    for (const h of history) {
      out[h.decision]++
      if (h.matchId) out.match++
    }
    return out
  }, [history])
  const total = c.like + c.super + c.pass
  const rows = [
    { key: 'like', icon: <Heart className="size-3.5 fill-current" />, color: '#ff3b6b', n: c.like },
    { key: 'super', icon: <Star className="size-3.5 fill-current" />, color: '#3e8ef7', n: c.super },
    { key: 'pass', icon: <X className="size-3.5" />, color: 'var(--ink-3)', n: c.pass },
  ] as const
  return (
    <motion.div variants={item} className="card p-5">
      <div className="relative z-[1] flex items-center justify-between">
        <h3 className="text-[16px] font-medium tracking-[-0.02em]">{t('discover.session.title')}</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink">
          <Zap className="size-3" />
          {t('discover.session.matches', { count: c.match })}
        </span>
      </div>
      <div className="relative z-[1] mt-4 flex h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {rows.map((r) => (
          <motion.span key={r.key} className="h-full" style={{ background: r.color }} initial={{ width: 0 }} animate={{ width: total ? `${(r.n / total) * 100}%` : '0%' }} transition={spring.smooth} />
        ))}
      </div>
      <div className="relative z-[1] mt-4 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.key} className="tile px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
              <span style={{ color: r.color }}>{r.icon}</span>
              {t(`discover.session.${r.key}`)}
            </div>
            <div className="mt-1 text-[22px] font-medium leading-none tracking-[-0.02em]">
              <AnimatedCounter value={r.n} startOnView={false} />
            </div>
          </div>
        ))}
      </div>
      <p className="relative z-[1] mt-3 text-[12px] text-ink-3">{t('discover.session.superLeft', { count: superLeft })}</p>
    </motion.div>
  )
}

export function ShortcutsCard({ className }: { className?: string }) {
  const t = useT()
  const keys: [string, string][] = [
    ['←', 'core.action.pass'],
    ['→', 'core.action.like'],
    ['↑', 'discover.action.super'],
    ['␣', 'discover.shortcut.nextShot'],
    ['↵', 'discover.action.info'],
    ['⌫', 'core.action.undo'],
  ]
  return (
    <motion.div variants={item} className={cn('card p-5', className)}>
      <h3 className="relative z-[1] flex items-center gap-2 text-[16px] font-medium tracking-[-0.02em]">
        <Keyboard className="size-4 text-ink-3" />
        {t('discover.shortcut.title')}
      </h3>
      <div className="relative z-[1] mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {keys.map(([k, label]) => (
          <div key={k} className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <Kbd className="min-w-7">{k}</Kbd>
            <span className="truncate">{t(label)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
