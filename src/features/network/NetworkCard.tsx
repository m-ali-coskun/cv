import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Briefcase, Eye, FileText, HeartCrack, MessageCircle, MoreHorizontal, Star, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { chatTime, timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { Avatar } from '@/components/ui/Avatar'
import { Menu } from '@/components/ui/Menu'
import { MediaView } from '@/components/art/MediaView'
import { useDiscoverUI } from '@/features/discover/discoverStore'
import { PersonAvatar, PriceLabel, fmtRating } from '@/features/discover/ProfileBits'
import { usePersonActions } from '@/features/discover/personActions'
import { headlineOf, ratingOf, shotsOf } from '@/features/discover/model'
import { NoteEditor } from './NoteEditor'
import type { NetworkEntry } from './model'

const BURST = Array.from({ length: 8 }, (_, i) => i)

/** Favourite toggle: a star that spins and bursts when switched on. */
export function FavoriteStar({ active, onToggle, label, size = 36 }: { active: boolean; onToggle: () => void; label: string; size?: number }) {
  const [burst, setBurst] = useState(0)
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        if (!active) setBurst((b) => b + 1)
        onToggle()
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full transition-colors duration-200',
        active ? 'bg-[#FFB21E]/18 text-[#FFB21E]' : 'bg-[var(--surface-2)] text-ink-3 hover:text-[#FFB21E]',
      )}
      style={{ width: size, height: size }}
    >
      <motion.span key={burst} initial={burst ? { rotate: -144, scale: 0.4 } : false} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 12 }}>
        <Star className={cn('size-[18px]', active && 'fill-current')} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
            {BURST.map((i) => {
              const a = (i / BURST.length) * Math.PI * 2
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 -ml-[2.5px] -mt-[2.5px] size-[5px] rounded-full bg-[#FFB21E]"
                  initial={{ x: 0, y: 0, scale: 1.3 }}
                  animate={{ x: Math.cos(a) * size * 0.8, y: Math.sin(a) * size * 0.8, scale: 0 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                />
              )
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function NetworkCard({ entry, index }: { entry: NetworkEntry; index: number }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const { match, person: p, conv, activeJobs, jobs } = entry
  const a = usePersonActions(p)
  const setPreview = useDiscoverUI((s) => s.setPreview)
  const shots = shotsOf(p, 3)
  const iFirst = match.initiatedBy === role
  const last = conv?.last
  const meId = role === 'client' ? match.clientId : match.designerId
  const designers = useApp((s) => s.designers)
  const meDesigner = designers.find((d) => d.id === match.designerId)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.92, filter: 'blur(6px)', transition: { duration: 0.22 } }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 10) * 0.04 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 26 } }}
      className="card group/nc relative flex flex-col gap-4 p-4 has-[[role=menu]]:z-30 sm:p-5"
    >
      {/* header */}
      <div className="relative z-[1] flex items-start gap-3">
        <button type="button" onClick={() => navigate(`/network/${p.data.id}`)} className="relative shrink-0" aria-label={p.data.name}>
          <PersonAvatar person={p} size={54} />
          {match.superLike && (
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[#3e8ef7] text-white" title={t('network.card.superMatch')}>
              <Star className="size-3 fill-current" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/network/${p.data.id}`)} className="flex max-w-full items-center gap-1.5 text-left">
            <h3 className="truncate text-[16.5px] font-medium tracking-[-0.02em] hover:underline">{p.data.name}</h3>
            {p.data.verified && <BadgeCheck className="size-4 shrink-0 text-info" />}
          </button>
          <p className="truncate text-[13px] text-ink-3">{headlineOf(p)}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-ink-3">
            {t('network.card.matched', { ago: timeAgo(match.createdAt, lang) })} · {t(iFirst ? 'network.card.youFirst' : 'network.card.theyFirst')}
          </p>
        </div>
        <FavoriteStar active={match.favorite} onToggle={a.toggleFavorite} label={t(match.favorite ? 'network.card.unfavorite' : 'network.card.favorite')} />
      </div>

      {/* work strip */}
      <div className="relative z-[1] grid grid-cols-3 gap-1.5">
        {shots.map((s, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => setPreview(p.data.id)}
            whileHover={{ y: -3, rotate: i === 0 ? -2 : i === 2 ? 2 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[var(--surface-2)]"
            aria-label={s.title}
            title={s.title}
          >
            <MediaView media={s.media} playBadge={false} />
          </motion.button>
        ))}
      </div>

      {/* facts */}
      <div className="relative z-[1] flex flex-wrap items-center gap-1.5 text-[12px]">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium',
            activeJobs ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-2)] text-ink-3',
          )}
        >
          <Briefcase className="size-3.5" />
          {activeJobs ? t('network.card.activeJobs', { count: activeJobs }) : jobs.length ? t('network.card.pastJobs', { count: jobs.length }) : t('network.card.noJobs')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1">
          <PriceLabel person={p} compact />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 font-mono">
          <Star className="size-3 fill-[#FFB21E] text-[#FFB21E]" />
          {ratingOf(p) !== null ? fmtRating(ratingOf(p)!) : '—'}
        </span>
      </div>

      {/* last message */}
      <button
        type="button"
        onClick={a.message}
        className="relative z-[1] flex items-center gap-2.5 rounded-[18px] bg-[var(--surface-2)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-3)]"
      >
        {last ? (
          <>
            {last.senderId === meId ? (
              meDesigner && role === 'designer' ? (
                <Avatar seed={meDesigner.avatarSeed} media={meDesigner.avatar} size={26} />
              ) : (
                <Avatar seed="ali" size={26} />
              )
            ) : (
              <PersonAvatar person={p} size={26} />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] text-ink-2">
                {last.senderId === meId && <span className="text-ink-3">{t('core.common.you')}: </span>}
                {last.text || t('network.card.attachment')}
              </span>
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-ink-3">{chatTime(last.createdAt, lang)}</span>
            {conv && conv.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10.5px] font-bold text-accent-ink">{conv.unread}</span>
            )}
          </>
        ) : (
          <>
            <MessageCircle className="size-4 text-ink-3" />
            <span className="text-[12.5px] text-ink-3">{t('network.card.sayHi', { name: p.data.name.split(' ')[0] })}</span>
          </>
        )}
      </button>

      <NoteEditor match={match} compact className="relative z-[1]" />

      {/* actions */}
      <div className="relative z-[1] mt-auto flex items-center gap-1.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={a.message}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-medium text-[var(--surface)] dark:bg-accent dark:text-accent-ink"
        >
          <MessageCircle className="size-4" />
          {t('core.action.message')}
        </motion.button>
        {a.canBrief && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={a.brief}
            className="glass-accent inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium"
          >
            <FileText className="size-4" />
            <span className="truncate">{t('discover.cta.sendBrief')}</span>
          </motion.button>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(`/network/${p.data.id}`)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)] hover:text-ink"
          aria-label={t('network.card.profile')}
          title={t('network.card.profile')}
        >
          <UserRound className="size-4" />
        </motion.button>
        <Menu
          width={210}
          className="bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]"
          trigger={({ onClick }) => (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onClick}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)] hover:text-ink"
              aria-label={t('core.action.more')}
            >
              <MoreHorizontal className="size-4" />
            </motion.button>
          )}
          items={[
            { label: t('network.card.quickLook'), icon: <Eye />, onClick: () => setPreview(p.data.id) },
            { label: t('network.card.profile'), icon: <UserRound />, onClick: () => navigate(`/network/${p.data.id}`) },
            { label: t(match.favorite ? 'network.card.unfavorite' : 'network.card.favorite'), icon: <Star />, onClick: a.toggleFavorite },
            { divider: true, label: '' },
            { label: t('discover.unmatch.confirm'), icon: <HeartCrack />, danger: true, onClick: () => void a.unmatch() },
          ]}
        />
      </div>
      {a.confirmDialog}
    </motion.article>
  )
}
