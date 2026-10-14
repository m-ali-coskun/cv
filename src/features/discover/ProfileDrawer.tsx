import { useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, Briefcase, CalendarDays, Clock3, Globe, Languages, MessageSquareQuote, Repeat, Star, Target, Timer, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { shortDate, timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore, usePerson } from '@/store/selectors'
import { Drawer } from '@/components/ui/Overlay'
import { Avatar } from '@/components/ui/Avatar'
import { RatingStars } from '@/components/ui/RatingStars'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { useDiscoverUI } from './discoverStore'
import { LocationLine, MatchRing, PersonAvatar, PersonBadges, PortfolioFolders, PriceLabel, RelationPill, StatTile, fmtMoney0, fmtRating, useMediaViewer } from './ProfileBits'
import { RelationCTA, usePersonActions } from './personActions'
import { daysSince, headlineOf, primaryOf, ratingOf, reasonsFor, type Person } from './model'

/**
 * Profile preview drawer shared by Discover (swipe/grid/new) and Network.
 * Open it with `useDiscoverUI.getState().setPreview(id)`.
 */
export function ProfileDrawer() {
  const id = useDiscoverUI((s) => s.preview)
  const setPreview = useDiscoverUI((s) => s.setPreview)
  const person = usePerson(id ?? undefined)
  const last = useRef<Person | undefined>(undefined)
  if (person) last.current = person
  const p = person ?? last.current
  const viewer = useMediaViewer()

  return (
    <>
      <Drawer
        open={!!id && !!person}
        onClose={() => {
          if (!viewer.openRef.current) setPreview(null)
        }}
        width={620}
        header={<span />}
      >
        {p && <ProfileSheet person={p} onClose={() => setPreview(null)} openMedia={viewer.open} />}
      </Drawer>
      {viewer.element}
    </>
  )
}

function Block({ title, icon, children, action }: { title: ReactNode; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <motion.section variants={item} className="px-5 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.015em]">
          {icon && <span className="text-ink-3 [&_svg]:size-4">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

function ProfileSheet({ person: p, onClose, openMedia }: { person: Person; onClose: () => void; openMedia: ReturnType<typeof useMediaViewer>['open'] }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const role = useApp((s) => s.settings.role)
  const discipline = useApp((s) => s.settings.discipline)
  const a = usePersonActions(p)
  const score = matchScore(p.data, role, discipline)
  const reasons = useMemo(() => reasonsFor(p, discipline), [p, discipline])
  const primary = primaryOf(p)
  const open = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <motion.div key={p.data.id} variants={stagger(0.05, 0.08)} initial="hidden" animate="show" className="flex min-h-full flex-col gap-6">
      {/* cover + identity */}
      <div>
        <div className="relative h-40 overflow-hidden sm:h-48">
          <motion.div initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }} className="absolute inset-0">
            <GenerativeArt seed={`${p.data.id}-cover`} variant="mesh" discipline={primary} className="size-full" playBadge={false} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[var(--surface)]/90" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <MatchRing score={score} size={50} onDark />
            <RelationPill relation={a.relation} />
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label={t('core.action.close')}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-xl"
          >
            <X className="size-4" />
          </motion.button>
        </div>
        <motion.div variants={item} className="-mt-12 px-5 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}>
              <PersonAvatar person={p} size={88} square className="shadow-[0_0_0_4px_var(--surface),0_16px_30px_-12px_rgba(0,0,0,.4)]" />
            </motion.div>
            <button
              type="button"
              onClick={() => open(`/network/${p.data.id}`)}
              className="mb-1 inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-[var(--surface-3)] hover:text-ink"
            >
              {t('discover.drawer.fullProfile')}
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
          <h2 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.03em]">{p.data.name}</h2>
          <p className="mt-1 text-[14.5px] text-ink-2">{headlineOf(p)}</p>
          <PersonBadges person={p} className="mt-3" />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
            <LocationLine person={p} />
            <PriceLabel person={p} className="text-ink" compact />
            {ratingOf(p) !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <RatingStars value={ratingOf(p)!} size={13} />
                <span className="font-mono text-ink">{fmtRating(ratingOf(p)!)}</span>
                {p.kind === 'designer' && <span>({p.data.reviewsCount})</span>}
              </span>
            ) : (
              <span>{t('discover.card.noReviews')}</span>
            )}
            {p.kind === 'designer' && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', p.data.availability === 'available' ? 'bg-success' : p.data.availability === 'limited' ? 'bg-warning' : 'bg-danger')} />
                {t(`core.availability.${p.data.availability}`)}
              </span>
            )}
          </div>
          {a.match && (
            <p className="mt-2 font-mono text-[11.5px] text-ink-3">{t('discover.drawer.matchedAgo', { ago: timeAgo(a.match.createdAt, lang) })}</p>
          )}
        </motion.div>
      </div>

      {/* stats */}
      <motion.div variants={item} className="grid grid-cols-2 gap-2 px-5 sm:grid-cols-4 sm:px-6">
        {p.kind === 'designer' ? (
          <>
            <StatTile label={t('core.common.completedJobs')}>{p.data.completedJobs}</StatTile>
            <StatTile label={t('core.common.onTime')}>{Math.round(p.data.onTimeRate * 100)}%</StatTile>
            <StatTile label={t('core.common.responseTime')}>{t('discover.drawer.hours', { count: p.data.responseTimeHrs })}</StatTile>
            <StatTile label={t('discover.drawer.repeat')}>{Math.round(p.data.repeatClientRate * 100)}%</StatTile>
          </>
        ) : (
          <>
            <StatTile label={t('discover.drawer.hires')}>{p.data.hiresCount}</StatTile>
            <StatTile label={t('core.common.rating')}>{ratingOf(p) !== null ? fmtRating(ratingOf(p)!) : '—'}</StatTile>
            <StatTile label={t('discover.drawer.openBriefs')}>{p.data.openBriefs.length}</StatTile>
            <StatTile label={t('discover.drawer.memberSince')}>{shortDate(p.data.joinedAt, lang)}</StatTile>
          </>
        )}
      </motion.div>

      {/* why */}
      {reasons.length > 0 && (
        <motion.div variants={item} className="mx-5 rounded-[20px] bg-night p-4 text-on-night sm:mx-6">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-white/60">
            <Target className="size-3.5 text-[var(--accent)]" />
            {t('discover.drawer.whyMatch', { score })}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <span key={r.key} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/85">
                {t(`discover.${r.key}`, r.vars)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <Block title={t('discover.drawer.about')}>
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{p.data.bio}</p>
        {p.kind === 'client' && (
          <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5">
              <Users className="size-3.5 text-ink-3" />
              {p.data.contactName} · {p.data.contactRole}
            </span>
            <a href={p.data.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 py-1.5 hover:bg-[var(--surface-3)]">
              <Globe className="size-3.5 text-ink-3" />
              {p.data.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </Block>

      <Block
        title={p.kind === 'designer' ? t('discover.drawer.portfolio') : t('discover.drawer.briefs')}
        icon={<Briefcase />}
        action={<span className="font-mono text-[12px] text-ink-3">{p.kind === 'designer' ? p.data.portfolio.length : p.data.openBriefs.length}</span>}
      >
        {(p.kind === 'designer' ? p.data.portfolio.length : p.data.openBriefs.length) ? (
          <PortfolioFolders person={p} onOpen={openMedia} size="sm" cols="grid-cols-2 sm:grid-cols-3" className="pt-2" />
        ) : (
          <p className="rounded-2xl bg-[var(--surface-2)] p-4 text-[13px] text-ink-3">{t('discover.drawer.noPortfolio')}</p>
        )}
      </Block>

      {p.kind === 'designer' && (
        <Block title={t('discover.drawer.skills')}>
          <div className="flex flex-wrap gap-1.5">
            {p.data.skills.map((s) => (
              <span key={s} className="rounded-full bg-accent-soft px-3 py-1.5 text-[12.5px] font-medium text-accent-text">
                {s}
              </span>
            ))}
            {p.data.tools.map((s) => (
              <span key={s} className="rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] text-ink-2">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Languages className="size-4 text-ink-3" />
              {p.data.languages.join(' · ')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4 text-ink-3" />
              {p.data.timezone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-ink-3" />
              {t('core.common.joined', { date: shortDate(p.data.joinedAt, lang) })}
            </span>
          </div>
        </Block>
      )}

      {p.kind === 'designer' && (
        <Block
          title={t('discover.drawer.reviews')}
          icon={<MessageSquareQuote />}
          action={
            p.data.reviews.length > 2 ? (
              <button type="button" onClick={() => open(`/network/${p.data.id}?tab=reviews`)} className="text-[12.5px] font-medium text-ink-3 hover:text-ink">
                {t('discover.drawer.allReviews', { count: p.data.reviews.length })}
              </button>
            ) : undefined
          }
        >
          {p.data.reviews.length ? (
            <div className="space-y-2.5">
              {p.data.reviews.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-[18px] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={r.authorAvatarSeed} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{r.authorName}</div>
                      <div className="truncate text-[11.5px] text-ink-3">{r.authorCompany}</div>
                    </div>
                    <RatingStars value={r.rating} size={12} />
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">“{r.text}”</p>
                  <div className="mt-2 font-mono text-[10.5px] text-ink-3">{timeAgo(r.createdAt, lang)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[var(--surface-2)] p-4 text-[13px] text-ink-3">
              {t('discover.drawer.noReviews', { days: daysSince(p.data.joinedAt) })}
            </p>
          )}
        </Block>
      )}

      {p.kind === 'designer' && p.data.socials.length > 0 && (
        <Block title={t('discover.drawer.socials')}>
          <div className="flex flex-wrap gap-2">
            {p.data.socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-transparent hover:bg-ink hover:text-[var(--surface)]"
              >
                {s.label}
                <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </Block>
      )}

      {p.kind === 'designer' && (
        <motion.div variants={item} className="grid grid-cols-3 gap-2 px-5 sm:px-6">
          {[
            { icon: <Timer className="size-4" />, label: t('discover.drawer.replies', { count: p.data.responseTimeHrs }) },
            { icon: <Repeat className="size-4" />, label: t('discover.drawer.repeatShort', { pct: Math.round(p.data.repeatClientRate * 100) }) },
            { icon: <Star className="size-4" />, label: t('discover.drawer.fromRate', { rate: fmtMoney0(p.data.hourlyRate * 8, p.data.currency, lang) }) },
          ].map((x, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 rounded-[18px] border border-line p-3 text-center text-[11.5px] text-ink-2">
              <span className="text-accent-text">{x.icon}</span>
              {x.label}
            </div>
          ))}
        </motion.div>
      )}

      {/* sticky CTA */}
      <div className="sticky bottom-0 mt-auto border-t border-line bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] px-5 py-3.5 backdrop-blur-xl sm:px-6">
        <RelationCTA p={p} a={a} block className="w-full" />
      </div>
      {a.confirmDialog}
    </motion.div>
  )
}
