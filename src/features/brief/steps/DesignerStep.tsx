import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Check, Clock, Compass, Heart, Quote, Search, Star, UserRound, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore, useMyMatches } from '@/store/selectors'
import type { Designer, Match } from '@/store/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { MediaView } from '@/components/art/MediaView'
import { useWizard } from '../draftStore'
import { STEP } from '../model'
import { FieldError, Section, StepHeader, stepStagger } from '../ui'

type Filter = 'all' | 'available' | 'favorites' | 'fit'

export const AVAILABILITY_COLOR = { available: 'var(--success)', limited: 'var(--warning)', booked: 'var(--danger)' } as const

interface Row {
  designer: Designer
  match?: Match
  score: number
  fits: boolean
}

export function DesignerStep({ showErrors, onNext }: { showErrors: boolean; onNext: () => void }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const matches = useMyMatches()
  const designers = useApp((s) => s.designers)
  const draft = useWizard((s) => s.draft)
  const set = useWizard((s) => s.set)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo<Row[]>(() => {
    const disc = draft.discipline
    const list: Row[] = matches
      .filter((m) => m.designer)
      .map((m) => ({
        designer: m.designer!,
        match: m.match,
        score: matchScore(m.designer!, 'client', disc ?? 'all'),
        fits: !disc || m.designer!.disciplines.includes(disc),
      }))
    // a designer passed via ?designer= that isn't a match yet still shows up
    if (draft.designerId && !list.some((r) => r.designer.id === draft.designerId)) {
      const d = designers.find((x) => x.id === draft.designerId)
      if (d) list.unshift({ designer: d, score: matchScore(d, 'client', disc ?? 'all'), fits: !disc || d.disciplines.includes(disc) })
    }
    return list.sort((a, b) => Number(b.fits) - Number(a.fits) || b.score - a.score)
  }, [matches, designers, draft.designerId, draft.discipline])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'available' && r.designer.availability !== 'available') return false
      if (filter === 'favorites' && !r.match?.favorite) return false
      if (filter === 'fit' && !r.fits) return false
      if (!needle) return true
      const d = r.designer
      return [d.name, d.handle, d.headline, d.location, ...d.skills, ...d.tools].some((x) => x.toLowerCase().includes(needle))
    })
  }, [rows, q, filter])

  const choose = (d: Designer) => {
    set({ designerId: d.id, discipline: draft.discipline ?? d.primary })
  }

  const header = (
    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
      <StepHeader index={STEP.designer} icon={<UserRound />} title={t('brief.designer.title')} subtitle={t('brief.designer.subtitle')} />
    </motion.div>
  )

  if (!rows.length) {
    return (
      <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
        {header}
        <Section>
          <EmptyState
            icon={<Users />}
            title={t('brief.designer.emptyTitle')}
            description={t('brief.designer.emptyBody')}
            action={
              <Button icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
                {t('brief.designer.discover')}
              </Button>
            }
          />
        </Section>
      </motion.div>
    )
  }

  return (
    <motion.div variants={stepStagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      {header}
      <Section
        title={t('brief.designer.matched', { count: rows.length })}
        hint={draft.discipline ? t('brief.designer.sortedHint') : t('brief.designer.pickHint')}
        icon={<Heart />}
        action={
          <Button size="sm" variant="ghost" icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
            {t('brief.designer.findMore')}
          </Button>
        }
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <Input
              icon={<Search />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('brief.designer.search')}
              aria-label={t('brief.designer.search')}
              className="h-10"
            />
          </div>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('brief.designer.f.all'), count: rows.length },
                { value: 'available', label: t('brief.designer.f.available') },
                { value: 'favorites', label: t('brief.designer.f.favorites') },
                ...(draft.discipline ? [{ value: 'fit' as const, label: t('brief.designer.f.fit') }] : []),
              ]}
            />
          </div>
        </div>

        <LayoutGroup>
          <motion.div layout role="radiogroup" aria-label={t('brief.designer.title')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((r, i) => (
                <DesignerCard
                  key={r.designer.id}
                  row={r}
                  index={i}
                  selected={draft.designerId === r.designer.id}
                  lang={lang}
                  onSelect={() => choose(r.designer)}
                  onConfirm={() => {
                    choose(r.designer)
                    window.setTimeout(onNext, 120)
                  }}
                  onProfile={() => navigate(`/network/${r.designer.id}`)}
                />
              ))}
            </AnimatePresence>
            {visible.length === 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-8 text-center text-[13.5px] text-ink-3">
                {t('brief.designer.noResults')}
              </motion.p>
            )}
          </motion.div>
        </LayoutGroup>
        <FieldError show={showErrors && !draft.designerId}>{t('brief.err.designer')}</FieldError>
      </Section>
    </motion.div>
  )
}

function DesignerCard({
  row,
  index,
  selected,
  lang,
  onSelect,
  onConfirm,
  onProfile,
}: {
  row: Row
  index: number
  selected: boolean
  lang: 'en' | 'de' | 'tr'
  onSelect: () => void
  onConfirm: () => void
  onProfile: () => void
}) {
  const t = useT()
  const { designer: d, match, score, fits } = row
  const cover = d.portfolio[0]?.cover
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.94, filter: 'blur(6px)', transition: { duration: 0.18 } }}
      transition={{ ...spring.smooth, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onConfirm}
      onKeyDown={(e) => {
        if (e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          onConfirm()
        }
      }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[22px] border bg-[var(--surface)] text-left outline-none transition-[border-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        selected
          ? 'border-transparent shadow-[0_0_0_2px_var(--accent),0_18px_40px_-18px_color-mix(in_oklab,var(--accent)_70%,transparent)]'
          : 'border-line shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:border-line-2 hover:shadow-[0_14px_34px_-18px_rgba(0,0,0,.3)]',
      )}
    >
      {/* cover strip */}
      <div className="relative h-[74px] overflow-hidden">
        {cover ? <MediaView media={cover} className="transition-transform duration-700 ease-out group-hover:scale-[1.06]" playBadge={false} /> : <div className="size-full bg-accent-soft" />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,color-mix(in_oklab,var(--surface)_92%,transparent))]" />
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {match?.superLike && (
            <Pill size="xs" tone="night" icon={<Zap className="size-3" />}>
              {t('brief.designer.super')}
            </Pill>
          )}
          {match?.favorite && (
            <span className="flex size-6 items-center justify-center rounded-full bg-white/85 text-[#ff3b6b] backdrop-blur" title={t('brief.designer.f.favorites')}>
              <Heart className="size-3.5 fill-current" />
            </span>
          )}
          {!match && <Pill size="xs" tone="warning">{t('brief.designer.notMatched')}</Pill>}
        </div>
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={spring.bouncy}
              className="absolute left-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_6px_16px_-6px_var(--accent)]"
            >
              <Check className="size-4" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative -mt-7 px-4 pb-4">
        <div className="flex items-end justify-between gap-2">
          <Avatar seed={d.avatarSeed} media={d.avatar} size={54} className="rounded-full ring-[3px] ring-[var(--surface)]" status={d.availability === 'available' ? 'online' : d.availability === 'limited' ? 'away' : 'offline'} />
          <div className="flex flex-col items-end">
            <span className="font-mono text-[18px] font-medium tabular-nums tracking-[-0.02em]">{score}%</span>
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-ink-3">{t('brief.designer.match')}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="truncate text-[15.5px] font-medium tracking-[-0.015em]">{d.name}</span>
          {d.verified && <BadgeCheck className="size-4 shrink-0 text-[var(--info)]" />}
          {d.topRated && <Pill size="xs" tone="accent">{t('brief.designer.top')}</Pill>}
        </div>
        <p className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[12.5px] leading-snug text-ink-3">{d.headline}</p>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="tile px-2 py-1.5">
            <div className="font-mono text-[13px] font-medium tabular-nums">{formatMoney(d.hourlyRate, d.currency, lang)}</div>
            <div className="text-[10.5px] text-ink-3">{t('brief.designer.perHour')}</div>
          </div>
          <div className="tile px-2 py-1.5">
            <div className="flex items-center gap-1 font-mono text-[13px] font-medium tabular-nums">
              <Star className="size-3 fill-[#ffb800] text-[#ffb800]" />
              {d.rating.toFixed(1)}
            </div>
            <div className="truncate text-[10.5px] text-ink-3">{t('brief.designer.reviews', { count: d.reviewsCount })}</div>
          </div>
          <div className="tile px-2 py-1.5">
            <div className="flex items-center gap-1 font-mono text-[13px] font-medium tabular-nums">
              <Clock className="size-3 text-ink-3" />~{d.responseTimeHrs}h
            </div>
            <div className="truncate text-[10.5px] text-ink-3">{t('brief.designer.replies')}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {[d.primary, ...d.disciplines.filter((x) => x !== d.primary)].slice(0, 4).map((x) => (
              <DisciplineIcon key={x} id={x} size={22} />
            ))}
          </div>
          <Pill size="xs" dot={AVAILABILITY_COLOR[d.availability]} tone="neutral">
            {t(`core.availability.${d.availability}`)}
          </Pill>
        </div>

        {!fits && (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[color-mix(in_oklab,var(--warning)_65%,var(--ink))]" title={t('brief.designer.notCore')}>
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
            <span className="truncate">{t('brief.designer.notCoreShort')}</span>
          </p>
        )}
        {match?.note && (
          <p className="mt-2 flex gap-1.5 text-[12px] italic text-ink-2">
            <Quote className="mt-0.5 size-3 shrink-0 text-ink-4" />
            <span className="line-clamp-2">{match.note}</span>
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onProfile()
            }}
            className="text-[12.5px] font-medium text-ink-3 underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {t('brief.designer.profile')}
          </button>
          <span className={cn('text-[12px] font-medium transition-colors', selected ? 'text-[var(--accent-text)]' : 'text-ink-4')}>
            {selected ? t('brief.designer.selected') : t('brief.designer.select')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
