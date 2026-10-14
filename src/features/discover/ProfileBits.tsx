import { useCallback, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Crown, Heart, MapPin, Sparkles, Star, X, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { FolderCard } from '@/components/ui/FolderCard'
import { Lightbox } from '@/components/ui/Lightbox'
import { disciplineColor } from '@/theme/disciplines'
import type { MediaRef } from '@/store/types'
import { daysSince, disciplinesOf, isTopRated, type Person, type Relation } from './model'

// ───────────────────────────── avatar ─────────────────────────────

export function PersonAvatar({ person, size = 40, ring, className }: { person: Person; size?: number; ring?: boolean; className?: string }) {
  if (person.kind === 'client') {
    const c = person.data
    return <Avatar kind="brand" name={c.name} color={c.logoColor} seed={c.avatarSeed} size={size} ring={ring} className={className} />
  }
  return <Avatar seed={person.data.avatarSeed} media={person.data.avatar} size={size} ring={ring} className={className} />
}

// ───────────────────────────── badges ─────────────────────────────

export function JustNowRibbon({ className }: { className?: string }) {
  const t = useT()
  return (
    <span
      className={cn(
        'relative inline-flex h-6 items-center gap-1 overflow-hidden rounded-full bg-ink px-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--surface)] dark:bg-accent dark:text-accent-ink',
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-80 dark:bg-accent-ink" />
        <span className="relative inline-flex size-1.5 rounded-full bg-accent dark:bg-accent-ink" />
      </span>
      {t('discover.badge.justNow')}
      <span className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.35)_50%,transparent_70%)] bg-[length:200%_100%]" />
    </span>
  )
}

export function PersonBadges({ person, size = 'xs', className, onDark }: { person: Person; size?: 'xs' | 'sm'; className?: string; onDark?: boolean }) {
  const t = useT()
  const justNow = person.kind === 'designer' && person.data.registeredInApp && daysSince(person.data.joinedAt) < 2
  const dark = onDark ? 'bg-white/15 text-white backdrop-blur-md' : undefined
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)}>
      {justNow ? (
        <JustNowRibbon />
      ) : person.data.isNew || (person.kind === 'designer' && person.data.registeredInApp) ? (
        <Pill tone="accent" size={size} icon={<Sparkles className="size-3" />}>
          {t('core.common.new')}
        </Pill>
      ) : null}
      {person.data.verified && (
        <Pill tone="info" size={size} icon={<BadgeCheck className="size-3" />} className={dark}>
          {t('core.common.verified')}
        </Pill>
      )}
      {isTopRated(person) && (
        <Pill tone="warning" size={size} icon={<Crown className="size-3" />} className={dark}>
          {t('core.common.topRated')}
        </Pill>
      )}
      {person.kind === 'client' && person.data.paymentVerified && (
        <Pill tone="success" size={size} icon={<Zap className="size-3" />} className={dark}>
          {t('discover.badge.paymentVerified')}
        </Pill>
      )}
    </span>
  )
}

export function RelationPill({ relation, className }: { relation: Relation; className?: string }) {
  const t = useT()
  if (relation === 'none') return null
  const map: Record<Exclude<Relation, 'none'>, { tone: 'accent' | 'neutral' | 'night' | 'warning' | 'success'; icon: ReactNode }> = {
    matched: { tone: 'night', icon: <Sparkles className="size-3" /> },
    liked: { tone: 'accent', icon: <Heart className="size-3 fill-current" /> },
    super: { tone: 'warning', icon: <Star className="size-3 fill-current" /> },
    passed: { tone: 'neutral', icon: <X className="size-3" /> },
  }
  const m = map[relation]
  return (
    <Pill tone={m.tone} size="xs" icon={m.icon} className={className}>
      {t(`discover.relation.${relation}`)}
    </Pill>
  )
}

export function DisciplineRow({ person, size = 20, max = 4, className }: { person: Person; size?: number; max?: number; className?: string }) {
  const list = disciplinesOf(person)
  return (
    <span className={cn('flex items-center', className)}>
      {list.slice(0, max).map((d, i) => (
        <motion.span key={d} style={{ marginLeft: i ? -size * 0.22 : 0, zIndex: max - i }} whileHover={{ y: -3, scale: 1.12 }} className="relative">
          <DisciplineIcon id={d} size={size} />
        </motion.span>
      ))}
      {list.length > max && <span className="ml-1 font-mono text-[11px] text-ink-3">+{list.length - max}</span>}
    </span>
  )
}

export function PriceLabel({ person, className, compact }: { person: Person; className?: string; compact?: boolean }) {
  const t = useT()
  const lang = useLang()
  if (person.kind === 'designer') {
    const d = person.data
    return (
      <span className={cn('font-mono tabular-nums', className)}>
        {formatMoney(d.hourlyRate, d.currency, lang)}
        <span className="opacity-60">{t('core.common.perHour')}</span>
      </span>
    )
  }
  const c = person.data
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatMoney(c.budgetRange[0], c.currency, lang, compact)}–{formatMoney(c.budgetRange[1], c.currency, lang, true)}
    </span>
  )
}

export function LocationLine({ person, className }: { person: Person; className?: string }) {
  const tz = person.kind === 'designer' ? person.data.timezone : undefined
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <MapPin className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{person.data.location}</span>
      {tz && <span className="shrink-0 font-mono text-[0.92em] opacity-60">· {tz}</span>}
    </span>
  )
}

// ───────────────────────────── match ring ─────────────────────────────

export function MatchRing({
  score,
  size = 52,
  stroke = 5,
  onDark,
  label = true,
  className,
}: {
  score: number
  size?: number
  stroke?: number
  onDark?: boolean
  label?: boolean
  className?: string
}) {
  const t = useT()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', onDark && 'bg-black/30 backdrop-blur-md', className)}
      style={{ width: size, height: size }}
      title={t('core.common.matchScore', { score })}
      aria-label={t('core.common.matchScore', { score })}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={onDark ? 'rgba(255,255,255,.18)' : 'var(--surface-3)'} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.3, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
          style={{ filter: 'drop-shadow(0 0 6px color-mix(in oklab, var(--accent) 70%, transparent))' }}
        />
      </svg>
      <span className={cn('absolute inset-0 flex flex-col items-center justify-center leading-none', onDark ? 'text-white' : 'text-ink')}>
        <span className="font-mono font-semibold tabular-nums" style={{ fontSize: size * 0.27 }}>
          {score}
        </span>
        {label && size >= 48 && (
          <span className="mt-0.5 font-medium uppercase tracking-[0.08em] opacity-70" style={{ fontSize: Math.max(7.5, size * 0.14) }}>
            {t('discover.match')}
          </span>
        )}
      </span>
    </div>
  )
}

// ───────────────────────────── like button with burst ─────────────────────────────

const BURST = Array.from({ length: 10 }, (_, i) => i)

/** Heart toggle with a particle burst (grid cards, folders). */
export function HeartButton({
  active,
  onClick,
  label,
  size = 40,
  className,
  disabled,
}: {
  active: boolean
  onClick: (el: HTMLButtonElement) => void
  label: string
  size?: number
  className?: string
  disabled?: boolean
}) {
  const [burst, setBurst] = useState(0)
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!active) setBurst((b) => b + 1)
        onClick(e.currentTarget)
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 520, damping: 20 }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-50',
        active ? 'bg-[#ff3b6b] text-white shadow-[0_8px_20px_-6px_#ff3b6b]' : 'glass text-ink hover:text-[#ff3b6b]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <motion.span key={burst} initial={burst ? { scale: 0.3, rotate: -20 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }} className="relative z-[1]">
        <Heart className={cn(active && 'fill-current')} style={{ width: size * 0.45, height: size * 0.45 }} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.8, delay: 0.35 }}>
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#ff3b6b]"
              initial={{ scale: 0.6, opacity: 1 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            />
            {BURST.map((i) => {
              const a = (i / BURST.length) * Math.PI * 2
              const dist = size * (0.85 + (i % 3) * 0.18)
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] size-1.5 rounded-full"
                  style={{ background: i % 2 ? '#ff3b6b' : 'var(--accent)' }}
                  initial={{ x: 0, y: 0, scale: 1.4 }}
                  animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist, scale: 0 }}
                  transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                />
              )
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ───────────────────────────── portfolio viewer ─────────────────────────────

interface ViewerState {
  items: MediaRef[]
  index: number
  title: string
  captions?: string[]
  origin?: Element | null
}

/** Lightbox state + element. `open(items, index, title, originEl)` */
export function useMediaViewer() {
  const [v, setV] = useState<ViewerState | null>(null)
  const openRef = useRef(false)
  openRef.current = !!v
  const open = useCallback((items: MediaRef[], index = 0, title = '', origin?: Element | null, captions?: string[]) => {
    if (!items.length) return
    setV({ items, index, title, origin, captions })
  }, [])
  const element = (
    <Lightbox
      items={v?.items ?? []}
      index={v ? v.index : null}
      title={v?.title}
      captions={v?.captions}
      onClose={() => setV(null)}
      originFor={(i) => (i === (v?.index ?? 0) ? v?.origin : null)}
    />
  )
  return { open, element, isOpen: !!v, openRef }
}

/** Grid of portfolio folders (designers) — click opens the lightbox. */
export function PortfolioFolders({
  person,
  onOpen,
  size = 'sm',
  max,
  className,
  cols = 'grid-cols-2 sm:grid-cols-3',
}: {
  person: Person
  onOpen: (items: MediaRef[], index: number, title: string, origin: Element | null, captions?: string[]) => void
  size?: 'sm' | 'md' | 'lg'
  max?: number
  className?: string
  cols?: string
}) {
  const t = useT()
  const lang = useLang()
  if (person.kind === 'client') {
    const c = person.data
    const briefs = max ? c.openBriefs.slice(0, max) : c.openBriefs
    return (
      <div className={cn('grid items-start justify-items-center gap-x-4 gap-y-7 pt-6', cols, className)}>
        {briefs.map((b, i) => (
          <div key={b.title} className="flex w-full justify-center" data-folder-id={`${c.id}-b${i}`}>
            <FolderCard
              size={size}
              title={b.title}
              subtitle={`${t(`core.discipline.${b.discipline}`)} · ${formatMoney(b.budget, c.currency, lang)}`}
              color={disciplineColor(b.discipline)}
              icon={<DisciplineIcon id={b.discipline} size={18} />}
              items={[]}
              papers={[<BriefPaper key="p" title={b.title} budget={formatMoney(b.budget, c.currency, lang)} discipline={b.discipline} />]}
              onClick={() => {
                const el = document.querySelector(`[data-folder-id="${c.id}-b${i}"] [aria-expanded]`)
                onOpen([{ kind: 'art', seed: `${c.id}-brief-${i}`, variant: 'poster', discipline: b.discipline }], 0, b.title, el)
              }}
            />
          </div>
        ))}
      </div>
    )
  }
  const items = max ? person.data.portfolio.slice(0, max) : person.data.portfolio
  return (
    <div className={cn('grid items-start justify-items-center gap-x-4 gap-y-7 pt-6', cols, className)}>
      {items.map((it) => (
        <div key={it.id} className="flex w-full justify-center" data-folder-id={it.id}>
          <FolderCard
            size={size}
            title={it.title}
            subtitle={[it.client, it.year].filter(Boolean).join(' · ')}
            items={it.media.length ? it.media : [it.cover]}
            color={disciplineColor(it.discipline)}
            icon={<DisciplineIcon id={it.discipline} size={size === 'sm' ? 18 : 22} />}
            onClick={() => {
              const el = document.querySelector(`[data-folder-id="${it.id}"] [aria-expanded]`)
              const media = it.media.length ? it.media : [it.cover]
              onOpen(media, 0, it.title, el, media.map((_, k) => `${it.title} — ${k + 1}/${media.length}${it.description ? ` · ${it.description}` : ''}`))
            }}
          />
        </div>
      ))}
    </div>
  )
}

function BriefPaper({ title, budget, discipline }: { title: string; budget: string; discipline: Parameters<typeof DisciplineIcon>[0]['id'] }) {
  return (
    <div className="flex size-full flex-col justify-between bg-white p-[9%] text-[#0b0b0c] dark:bg-[var(--surface-3)] dark:text-ink">
      <div className="flex items-center justify-between">
        <DisciplineIcon id={discipline} size={16} />
        <span className="font-mono text-[9px] opacity-60">BRIEF</span>
      </div>
      <div>
        <div className="line-clamp-2 text-[10.5px] font-semibold leading-tight">{title}</div>
        <div className="mt-1 font-mono text-[9.5px] opacity-70">{budget}</div>
      </div>
    </div>
  )
}

// ───────────────────────────── small stat tile ─────────────────────────────

export function StatTile({ label, children, hint, dark, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-[18px] p-3.5', dark ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]', className)}>
      <div className={cn('truncate text-[12px]', dark ? 'text-white/60' : 'text-ink-3')}>{label}</div>
      <div className="mt-1.5 truncate text-[22px] font-medium leading-none tracking-[-0.02em]">{children}</div>
      {hint && <div className={cn('mt-1.5 truncate text-[11.5px]', dark ? 'text-white/50' : 'text-ink-3')}>{hint}</div>}
    </div>
  )
}

/** Stars + numeric rating, compact. */
export function RatingInline({ value, count, className, onDark }: { value: number; count?: number; className?: string; onDark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono tabular-nums', className)}>
      <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
      <span className={onDark ? 'text-white' : 'text-ink'}>{fmtRating(value)}</span>
      {count !== undefined && <span className="opacity-60">({count})</span>}
    </span>
  )
}

export const fmtRating = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(Math.round(v * 100) / 100))
