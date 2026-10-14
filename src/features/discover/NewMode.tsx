import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ArrowUpRight, CalendarDays, FileText, Heart, Languages, MessageCircle, Sparkles, Star, UserPlus, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { matchScore } from '@/store/selectors'
import { AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { useDiscoverUI } from './discoverStore'
import type { usePool } from './hooks'
import { LocationLine, MatchRing, PersonAvatar, PersonBadges, PortfolioFolders, PriceLabel, RelationPill, fmtRating, useMediaViewer } from './ProfileBits'
import { RelationCTA, usePersonActions } from './personActions'
import { disciplinesOf, headlineOf, ratingOf, type Person } from './model'
import { DisciplineBadge } from '@/components/ui/Badge'

type Pool = ReturnType<typeof usePool>

export function NewMode({ pool }: { pool: Pool }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const viewer = useMediaViewer()
  const fresh = pool.fresh
  const designers = pool.kind === 'designer'

  const stats = useMemo(() => {
    const disc = new Set(fresh.flatMap(disciplinesOf))
    const rates = fresh.filter((p) => p.kind === 'designer').map((p) => (p.kind === 'designer' ? p.data.hourlyRate : 0))
    const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0
    const week = fresh.filter((p) => Date.now() - new Date(p.data.joinedAt).getTime() < 7 * 864e5).length
    const undecided = fresh.filter((p) => pool.rel.get(p.data.id) === 'none').length
    return { disc: disc.size, avg, week, undecided }
  }, [fresh, pool.rel])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        {/* hero */}
        <motion.section
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="card relative overflow-hidden p-5 sm:p-7"
        >
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
          <div className="relative z-[1] flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[12px] font-semibold text-accent-ink">
                <Sparkles className="size-3.5" />
                {t('discover.new.kicker', { count: fresh.length })}
              </span>
              <h2 className="mt-3 text-[28px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[34px]">
                {t(designers ? 'discover.new.titleDesigners' : 'discover.new.titleClients')}
              </h2>
              <p className="mt-2 text-[14.5px] text-ink-2">{t(designers ? 'discover.new.textDesigners' : 'discover.new.textClients')}</p>
            </div>
            <div className="flex items-center gap-3">
              <AvatarStack seeds={fresh.map((p) => p.data.avatarSeed)} size={36} max={5} />
            </div>
          </div>
          <div className="relative z-[1] mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: t('discover.new.statJoined'), value: fresh.length },
              { label: t('discover.new.statWeek'), value: stats.week },
              { label: t('discover.new.statUndecided'), value: stats.undecided },
              designers ? { label: t('discover.new.statRate'), value: stats.avg, money: true } : { label: t('discover.new.statDisciplines'), value: stats.disc },
            ].map((s, i) => (
              <div key={i} className={cn('rounded-[18px] p-3.5', i === 0 ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]')}>
                <div className={cn('truncate text-[12px]', i === 0 ? 'text-white/60' : 'text-ink-3')}>{s.label}</div>
                <div className="mt-1.5 text-[26px] font-medium leading-none tracking-[-0.03em]">
                  {'money' in s && s.money ? <AnimatedCounter value={s.value} currency="EUR" /> : <AnimatedCounter value={s.value} />}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {fresh.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Sparkles />}
              title={t('discover.new.emptyTitle')}
              description={t('discover.new.emptyText')}
              action={
                <Button icon={<UserPlus className="size-4" />} onClick={() => navigate('/join')}>
                  {t('discover.joinCta.button')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {fresh.map((p, i) => (
                <FreshCard key={p.data.id} index={i} p={p} score={matchScore(p.data, pool.role, pool.discipline)} lang={lang} openMedia={viewer.open} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <motion.aside variants={stagger(0.08, 0.2)} initial="hidden" animate="show" className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <JoinCta role={pool.role} />
        <HowItWorks />
      </motion.aside>
      {viewer.element}
    </div>
  )
}

function FreshCard({ p, index, score, lang, openMedia }: { p: Person; index: number; score: number; lang: 'en' | 'de' | 'tr'; openMedia: ReturnType<typeof useMediaViewer>['open'] }) {
  const t = useT()
  const a = usePersonActions(p)
  const setPreview = useDiscoverUI((s) => s.setPreview)
  const justNow = p.kind === 'designer' && !!p.data.registeredInApp
  const works = p.kind === 'designer' ? p.data.portfolio.length : p.data.openBriefs.length

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 + Math.min(index, 6) * 0.08 }}
      className="card relative overflow-hidden"
    >
      {justNow && (
        <div className="pointer-events-none absolute -right-11 top-6 z-[2] w-44 rotate-45 bg-accent py-1 text-center text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-ink shadow-[0_6px_16px_-6px_var(--accent)]">
          {t('discover.badge.justNow')}
        </div>
      )}
      <div className="relative z-[1] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <motion.div whileHover={{ rotate: -6, scale: 1.05 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
            <PersonAvatar person={p} size={68} square className="shadow-[0_12px_24px_-12px_rgba(0,0,0,.4)]" />
          </motion.div>
          <div className="min-w-0 flex-1 pr-10 sm:pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[21px] font-medium leading-tight tracking-[-0.025em]">{p.data.name}</h3>
              <RelationPill relation={a.relation} />
            </div>
            <p className="mt-0.5 text-[14px] text-ink-2">{headlineOf(p)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PersonBadges person={p} />
              <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-ink-3">
                <CalendarDays className="size-3.5" />
                {t('discover.new.joined', { ago: timeAgo(p.data.joinedAt, lang) })}
              </span>
            </div>
          </div>
          <MatchRing score={score} size={56} className="absolute right-5 top-5 hidden sm:inline-flex" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
          <LocationLine person={p} />
          <PriceLabel person={p} className="font-medium text-ink" compact />
          <span className="inline-flex items-center gap-1 font-mono">
            <Star className="size-3.5 fill-[#FFB21E] text-[#FFB21E]" />
            {ratingOf(p) !== null ? fmtRating(ratingOf(p)!) : t('discover.card.noReviews')}
          </span>
          {p.kind === 'designer' && (
            <span className="inline-flex items-center gap-1.5">
              <Languages className="size-3.5" />
              {p.data.languages.join(', ')}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('discover.new.bio')}</div>
            <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">{p.data.bio}</p>
          </div>
          <div className="flex flex-wrap content-start gap-1.5">
            {disciplinesOf(p)
              .slice(0, 3)
              .map((d) => (
                <DisciplineBadge key={d} id={d} />
              ))}
            {(p.kind === 'designer' ? p.data.skills : [p.data.industry]).slice(0, 5).map((s) => (
              <span key={s} className="rounded-full border border-line-2 px-2.5 py-1 text-[12px] text-ink-2">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-[1] border-t border-line bg-[color-mix(in_oklab,var(--surface-2)_55%,transparent)] px-5 pb-6 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{t(p.kind === 'designer' ? 'discover.new.pastWork' : 'discover.new.openBriefs')}</div>
          <span className="font-mono text-[11.5px] text-ink-3">{works}</span>
        </div>
        {works ? (
          <PortfolioFolders person={p} onOpen={openMedia} size="sm" max={4} cols="grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4" />
        ) : (
          <p className="mt-3 text-[13px] text-ink-3">{t('discover.drawer.noPortfolio')}</p>
        )}
      </div>

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3.5 sm:px-6">
        <RelationCTA p={p} a={a} size="sm" />
        <Button variant="ghost" size="sm" iconRight={<ArrowUpRight className="size-4" />} onClick={() => setPreview(p.data.id)}>
          {t('discover.card.seeProfile')}
        </Button>
      </div>
      {a.confirmDialog}
    </motion.article>
  )
}

function JoinCta({ role }: { role: 'client' | 'designer' }) {
  const t = useT()
  const navigate = useNavigate()
  const designerRole = role === 'designer'
  return (
    <motion.div variants={item} className="glass-accent relative overflow-hidden p-6">
      <div aria-hidden className="pointer-events-none absolute right-5 top-5 flex gap-2">
        {(['poster', 'blob3d', 'illustration'] as const).map((v, i) => (
          <motion.div
            key={v}
            className="h-[88px] w-[70px] overflow-hidden rounded-[14px] border-2 border-white/80 shadow-xl"
            style={{ rotate: (i - 1) * 12 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >
            <GenerativeArt seed={`join-${v}`} variant={v} className="size-full" playBadge={false} />
          </motion.div>
        ))}
      </div>
      <div className="relative mt-28">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-ink)] text-[var(--accent)]">
          {designerRole ? <Wand2 className="size-5" /> : <UserPlus className="size-5" />}
        </div>
        <h3 className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.03em]">{t(designerRole ? 'discover.joinCta.titleDesigner' : 'discover.joinCta.title')}</h3>
        <p className="mt-1.5 text-[13.5px] opacity-75">{t(designerRole ? 'discover.joinCta.textDesigner' : 'discover.joinCta.text')}</p>
        <Button className="mt-5" iconRight={<ArrowRight className="size-4" />} onClick={() => navigate(designerRole ? '/profile' : '/join')}>
          {t(designerRole ? 'discover.joinCta.buttonDesigner' : 'discover.joinCta.button')}
        </Button>
      </div>
    </motion.div>
  )
}

function HowItWorks() {
  const t = useT()
  const steps = [
    { icon: <Heart className="size-4 fill-current" />, key: 'like' },
    { icon: <Sparkles className="size-4" />, key: 'match' },
    { icon: <MessageCircle className="size-4" />, key: 'chat' },
    { icon: <FileText className="size-4" />, key: 'brief' },
  ]
  return (
    <motion.div variants={item} className="glass-night relative overflow-hidden p-5">
      <h3 className="text-[16px] font-medium tracking-[-0.02em] text-white">{t('discover.how.title')}</h3>
      <ol className="relative mt-4 space-y-3.5">
        <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-white/15" />
        {steps.map((s, i) => (
          <motion.li
            key={s.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="relative flex items-start gap-3"
          >
            <span className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-full', i === 1 ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-white/10 text-white')}>
              {s.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="text-[13.5px] font-medium text-white">{t(`discover.how.${s.key}`)}</div>
              <div className="text-[12px] text-white/55">{t(`discover.how.${s.key}Hint`)}</div>
            </div>
          </motion.li>
        ))}
      </ol>
      <p className="mt-4 rounded-2xl bg-white/5 p-3 text-[12px] text-white/60">{t('discover.how.note')}</p>
    </motion.div>
  )
}
