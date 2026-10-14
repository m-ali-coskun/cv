import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownUp, Briefcase, Check, Clock3, Compass, Heart, Search, Sparkles, Star, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, item, stagger } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { Segmented } from '@/components/ui/Segmented'
import { Menu } from '@/components/ui/Menu'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ProfileDrawer } from '@/features/discover/ProfileDrawer'
import { useDiscoverUI } from '@/features/discover/discoverStore'
import { PersonAvatar } from '@/features/discover/ProfileBits'
import { useSwipeActions } from '@/features/discover/hooks'
import { headlineOf, matchesQuery, type Person } from '@/features/discover/model'
import { NetworkCard } from './NetworkCard'
import { avgReplyHours, fmtHours, useLikesYou, useNetworkEntries, usePendingLikes, type NetworkEntry } from './model'

type Tab = 'all' | 'favorites' | 'super' | 'active'
type Sort = 'recent' | 'name' | 'rating'

const inTab = (e: NetworkEntry, tab: Tab) =>
  tab === 'favorites' ? e.match.favorite : tab === 'super' ? e.match.superLike : tab === 'active' ? e.activeJobs > 0 : true

/** /network — "My designers" (client) or "My clients" (designer). */
export default function NetworkPage() {
  const t = useT()
  const role = useRole()
  const navigate = useNavigate()
  const entries = useNetworkEntries()
  const messages = useApp((s) => s.messages)
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [query, setQuery] = useState('')

  useEffect(() => () => useDiscoverUI.getState().setPreview(null), [])

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: 0, favorites: 0, super: 0, active: 0 }
    for (const e of entries) for (const k of Object.keys(c) as Tab[]) if (inTab(e, k)) c[k]++
    return c
  }, [entries])

  const list = useMemo(() => {
    const l = entries.filter((e) => inTab(e, tab) && matchesQuery(e.person, query))
    if (sort === 'name') return l.sort((a, b) => a.person.data.name.localeCompare(b.person.data.name))
    if (sort === 'rating') return l.sort((a, b) => b.person.data.rating - a.person.data.rating)
    return l.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  }, [entries, tab, query, sort])

  const stats = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
    const reply = fmtHours(avgReplyHours(entries, messages, role))
    return {
      matches: entries.length,
      newThisWeek: entries.filter((e) => e.match.createdAt > weekAgo).length,
      favorites: counts.favorites,
      active: counts.active,
      jobsInFlight: entries.reduce((n, e) => n + e.activeJobs, 0),
      reply,
      unread: entries.reduce((n, e) => n + (e.conv?.unread ?? 0), 0),
    }
  }, [entries, counts, messages, role])

  const designers = role === 'client'

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* stats */}
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          dark
          icon={<Users />}
          label={t(designers ? 'network.stats.designers' : 'network.stats.clients')}
          value={stats.matches}
          hint={t('network.stats.newThisWeek', { count: stats.newThisWeek })}
        />
        <StatCard icon={<Star />} label={t('network.stats.favorites')} value={stats.favorites} hint={t('network.stats.favoritesHint')} />
        <StatCard icon={<Briefcase />} label={t('network.stats.active')} value={stats.active} hint={t('network.stats.jobsInFlight', { count: stats.jobsInFlight })} accent />
        <StatCard
          icon={<Clock3 />}
          label={t('network.stats.reply')}
          value={stats.reply.value}
          decimals={stats.reply.unit === 'h' && stats.reply.value % 1 ? 1 : 0}
          suffix={stats.reply.unit === 'h' ? t('network.stats.h') : t('network.stats.m')}
          hint={stats.unread ? t('network.stats.unread', { count: stats.unread }) : t('network.stats.replyHint')}
        />
      </motion.div>

      <LikesYou />

      {/* toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card relative z-20 flex flex-wrap items-center gap-2 p-2 sm:p-2.5"
      >
        <div className="no-scrollbar relative z-[1] -mx-0.5 max-w-full overflow-x-auto px-0.5">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            layoutId="network-tab"
            options={[
              { value: 'all', label: t('network.tab.all'), count: counts.all },
              { value: 'favorites', label: t('network.tab.favorites'), icon: <Star className="size-3.5" />, count: counts.favorites },
              { value: 'super', label: t('network.tab.super'), icon: <Sparkles className="size-3.5" />, count: counts.super },
              { value: 'active', label: t('network.tab.active'), icon: <Briefcase className="size-3.5" />, count: counts.active },
            ]}
          />
        </div>
        <label className="relative z-[1] flex h-10 min-w-0 flex-1 basis-[200px] items-center gap-2 rounded-full bg-[var(--surface-2)] pl-3.5 pr-1.5 focus-within:shadow-[0_0_0_4px_var(--accent-softer)]">
          <Search className="size-4 shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder={t(designers ? 'network.search.designers' : 'network.search.clients')}
            aria-label={t('core.action.search')}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-3)] text-ink-2" aria-label={t('core.action.reset')}>
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <div className="relative z-[1]">
          <Menu
            width={200}
            className="bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]"
            trigger={({ onClick, open }) => (
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                aria-expanded={open}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
                  open ? 'bg-ink text-[var(--surface)] dark:bg-[var(--surface-3)] dark:text-ink' : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)]',
                )}
              >
                <ArrowDownUp className="size-4" />
                <span className="hidden sm:inline">{t(`network.sort.${sort}`)}</span>
              </motion.button>
            )}
            items={(['recent', 'name', 'rating'] as Sort[]).map((s) => ({
              label: t(`network.sort.${s}`),
              active: s === sort,
              icon: s === sort ? <Check /> : <span className="block size-4" />,
              onClick: () => setSort(s),
            }))}
          />
        </div>
        <Button size="sm" variant="accent" className="relative z-[1] h-10" icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
          <span className="hidden sm:inline">{t(designers ? 'network.findDesigners' : 'network.findClients')}</span>
        </Button>
      </motion.div>

      {/* list */}
      {entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Heart />}
            title={t(designers ? 'network.empty.titleDesigners' : 'network.empty.titleClients')}
            description={t('network.empty.text')}
            action={
              <Button icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
                {t('network.empty.cta')}
              </Button>
            }
          />
        </div>
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={tab === 'favorites' ? <Star /> : tab === 'super' ? <Sparkles /> : tab === 'active' ? <Briefcase /> : <Search />}
            title={query ? t('network.empty.search', { query }) : t(`network.empty.${tab}`)}
            description={t(query ? 'network.empty.searchHint' : `network.empty.${tab}Hint`)}
            action={
              <Button
                variant="glass"
                onClick={() => {
                  setTab('all')
                  setQuery('')
                }}
              >
                {t('network.empty.showAll')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((e, i) => (
              <NetworkCard key={e.match.id} entry={e} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <PendingLikes />
      <ProfileDrawer />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  dark,
  accent,
  suffix,
  decimals,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
  dark?: boolean
  accent?: boolean
  suffix?: string
  decimals?: number
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      className={cn('relative overflow-hidden p-4 sm:p-5', dark ? 'glass-night' : accent ? 'glass-accent' : 'card')}
    >
      <div className="relative z-[1] flex items-center justify-between gap-2">
        <span className={cn('line-clamp-2 text-[12.5px] leading-tight', dark ? 'text-white/60' : accent ? 'opacity-70' : 'text-ink-3')}>{label}</span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4', dark ? 'bg-white/10 text-[var(--accent)]' : accent ? 'bg-[var(--accent-ink)]/10' : 'bg-[var(--surface-2)] text-ink-2')}>
          {icon}
        </span>
      </div>
      <div className="relative z-[1] mt-2 text-[34px] font-medium leading-none tracking-[-0.035em] sm:text-[40px]">
        <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className={cn('relative z-[1] mt-2 truncate text-[12px]', dark ? 'text-white/50' : accent ? 'opacity-70' : 'text-ink-3')}>{hint}</div>
    </motion.div>
  )
}

/** People who already like Ali — like back for an instant match. */
function LikesYou() {
  const t = useT()
  const role = useRole()
  const people = useLikesYou()
  const { decide } = useSwipeActions()
  const setPreview = useDiscoverUI((s) => s.setPreview)
  if (!people.length) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, delay: 0.05, ease: EASE_OUT }}
      className="card relative overflow-hidden p-4 sm:p-5"
    >
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,59,107,.18),transparent)]" />
      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[17px] font-medium tracking-[-0.02em]">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-[#ff3b6b]">
              <Heart className="size-4 fill-current" />
            </motion.span>
            {t('network.likesYou.title', { count: people.length })}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-3">{t(role === 'client' ? 'network.likesYou.textDesigners' : 'network.likesYou.textClients')}</p>
        </div>
      </div>
      <div className="no-scrollbar relative z-[1] -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
        <AnimatePresence initial={false} mode="popLayout">
          {people.map((p, i) => (
            <LikeChip key={p.data.id} p={p} index={i} onOpen={() => setPreview(p.data.id)} onLike={(el) => decide(p, 'like', { from: el })} />
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

function LikeChip({ p, index, onOpen, onLike }: { p: Person; index: number; onOpen: () => void; onLike: (el: Element) => void }) {
  const t = useT()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 24, delay: index * 0.04 }}
      className="flex w-[168px] shrink-0 flex-col items-center rounded-[22px] bg-[var(--surface-2)] p-3 text-center"
    >
      <button type="button" onClick={onOpen} className="relative">
        <PersonAvatar person={p} size={56} />
        <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-[var(--surface-2)] bg-[#ff3b6b] text-white">
          <Heart className="size-3 fill-current" />
        </span>
      </button>
      <button type="button" onClick={onOpen} className="mt-2 w-full truncate text-[13.5px] font-medium hover:underline">
        {p.data.name}
      </button>
      <span className="w-full truncate text-[11.5px] text-ink-3">{headlineOf(p)}</span>
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        onClick={(e) => onLike(e.currentTarget)}
        className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[#ff3b6b] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_-8px_#ff3b6b]"
      >
        <Heart className="size-3.5 fill-current" />
        {t('network.likesYou.likeBack')}
      </motion.button>
    </motion.div>
  )
}

/** Likes sent that are still waiting for an answer. */
function PendingLikes() {
  const t = useT()
  const pending = usePendingLikes()
  const { undo } = useSwipeActions()
  const setPreview = useDiscoverUI((s) => s.setPreview)
  if (!pending.length) return null
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 sm:p-5">
      <div className="relative z-[1] flex items-center justify-between gap-2">
        <h3 className="text-[16px] font-medium tracking-[-0.02em]">{t('network.pending.title', { count: pending.length })}</h3>
        <span className="text-[12.5px] text-ink-3">{t('network.pending.hint')}</span>
      </div>
      <ul className="relative z-[1] mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {pending.map(({ person: p, decision }) => (
            <motion.li
              key={p.data.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3 rounded-[18px] bg-[var(--surface-2)] p-2.5"
            >
              <button type="button" onClick={() => setPreview(p.data.id)} className="shrink-0">
                <PersonAvatar person={p} size={38} />
              </button>
              <button type="button" onClick={() => setPreview(p.data.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13.5px] font-medium">{p.data.name}</span>
                <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                  {decision === 'super' ? <Star className="size-3 fill-[#3e8ef7] text-[#3e8ef7]" /> : <Heart className="size-3 fill-[#ff3b6b] text-[#ff3b6b]" />}
                  {t(decision === 'super' ? 'network.pending.super' : 'network.pending.liked')}
                </span>
              </button>
              <Button variant="ghost" size="xs" onClick={() => undo(p.data.id)}>
                {t('core.action.undo')}
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  )
}
