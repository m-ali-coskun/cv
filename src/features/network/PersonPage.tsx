import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronRight, Eye, HeartCrack, Link2, MoreHorizontal, Star, UserRoundX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, stagger } from '@/lib/motion'
import { shortDate } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { usePerson } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu } from '@/components/ui/Menu'
import { Segmented } from '@/components/ui/Segmented'
import { DisciplineBadge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/ui/RatingStars'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GenerativeArt } from '@/components/art/GenerativeArt'
import { ProfileDrawer } from '@/features/discover/ProfileDrawer'
import { useDiscoverUI } from '@/features/discover/discoverStore'
import { LocationLine, PersonAvatar, PersonBadges, PriceLabel, RelationPill, fmtRating, useMediaViewer } from '@/features/discover/ProfileBits'
import { RelationCTA, usePersonActions } from '@/features/discover/personActions'
import { headlineOf, primaryOf, ratingOf, type Person } from '@/features/discover/model'
import { FavoriteStar } from './NetworkCard'
import { filesOf, isActiveJob, jobsWith } from './model'
import { AboutTab, BriefsTab, FactsSideCard, FilesTab, MatchSideCard, NoteSideCard, PortfolioTab, ReviewsTab, SimilarSideCard, WorkTab } from './PersonSections'

type TabId = 'portfolio' | 'briefs' | 'about' | 'reviews' | 'work' | 'files'

/** /network/:id — full profile of a designer or a client. */
export default function PersonPage() {
  const { id } = useParams()
  const person = usePerson(id)
  const t = useT()
  const navigate = useNavigate()

  if (!person)
    return (
      <div className="card">
        <EmptyState
          icon={<UserRoundX />}
          title={t('network.person.notFound')}
          description={t('network.person.notFoundHint')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/network')}>
                {t('network.person.back')}
              </Button>
              <Button variant="glass" onClick={() => navigate('/discover')}>
                {t('core.nav.discover')}
              </Button>
            </div>
          }
        />
      </div>
    )
  return <PersonView key={person.data.id} p={person} />
}

function PersonView({ p }: { p: Person }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const a = usePersonActions(p)
  const viewer = useMediaViewer()
  const allJobs = useApp((s) => s.jobs)
  const jobs = useMemo(() => jobsWith(allJobs, p), [allJobs, p])
  const files = useMemo(() => filesOf(jobs), [jobs])
  const isMe = p.data.id === ME_DESIGNER_ID || p.data.id === ME_CLIENT_ID
  const setPreview = useDiscoverUI((s) => s.setPreview)

  const tabs: { value: TabId; label: string; count?: number }[] =
    p.kind === 'designer'
      ? [
          { value: 'portfolio', label: t('discover.drawer.portfolio'), count: p.data.portfolio.length },
          { value: 'about', label: t('discover.drawer.about') },
          { value: 'reviews', label: t('discover.drawer.reviews'), count: p.data.reviews.length },
          { value: 'work', label: t('network.person.tabWork'), count: jobs.length },
          { value: 'files', label: t('core.nav.files'), count: files.length },
        ]
      : [
          { value: 'briefs', label: t('discover.drawer.briefs'), count: p.data.openBriefs.length },
          { value: 'about', label: t('discover.drawer.about') },
          { value: 'work', label: t('network.person.tabWork'), count: jobs.length },
          { value: 'files', label: t('core.nav.files'), count: files.length },
        ]
  const requested = params.get('tab') as TabId | null
  const tab: TabId = tabs.some((x) => x.value === requested) ? requested! : tabs[0].value
  const setTab = (v: TabId) => {
    const next = new URLSearchParams(params)
    if (v === tabs[0].value) next.delete('tab')
    else next.set('tab', v)
    setParams(next, { replace: true })
  }

  // parallax cover
  const { scrollY } = useScroll()
  const coverY = useTransform(scrollY, [0, 400], [0, 90])
  const coverScale = useTransform(scrollY, [0, 400], [1.05, 1.18])

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/network')
  }
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: t('network.person.linkCopied'), tone: 'success', duration: 2200 })
    } catch {
      toast({ title: t('network.person.linkFailed'), tone: 'error' })
    }
  }
  const sectionLabel = t(p.kind === 'designer' ? 'core.nav.designers' : 'core.nav.clients')
  const stats =
    p.kind === 'designer'
      ? [
          { label: t('core.common.completedJobs'), node: <AnimatedCounter value={p.data.completedJobs} /> },
          { label: t('core.common.rating'), node: ratingOf(p) !== null ? <AnimatedCounter value={ratingOf(p)!} decimals={2} /> : <span>—</span> },
          { label: t('network.person.reviews'), node: <AnimatedCounter value={p.data.reviewsCount} /> },
          { label: t('core.common.onTime'), node: <AnimatedCounter value={Math.round(p.data.onTimeRate * 100)} suffix="%" /> },
          { label: t('discover.drawer.repeat'), node: <AnimatedCounter value={Math.round(p.data.repeatClientRate * 100)} suffix="%" /> },
          { label: t('network.person.withYou'), node: <AnimatedCounter value={jobs.length} /> },
        ]
      : [
          { label: t('discover.drawer.hires'), node: <AnimatedCounter value={p.data.hiresCount} /> },
          { label: t('core.common.rating'), node: <AnimatedCounter value={p.data.rating} decimals={1} /> },
          { label: t('discover.drawer.openBriefs'), node: <AnimatedCounter value={p.data.openBriefs.length} /> },
          { label: t('network.person.budgetUpTo'), node: <AnimatedCounter value={p.data.budgetRange[1]} currency={p.data.currency} compact /> },
          { label: t('network.person.activeWithYou'), node: <AnimatedCounter value={jobs.filter(isActiveJob).length} /> },
          { label: t('network.person.withYou'), node: <AnimatedCounter value={jobs.length} /> },
        ]

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* breadcrumb */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2 text-[13px]">
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={back}
          className="glass inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 font-medium"
        >
          <ArrowLeft className="size-4" />
          {t('core.action.back')}
        </motion.button>
        <Link to="/network" className="hidden text-ink-3 hover:text-ink sm:inline">
          {sectionLabel}
        </Link>
        <ChevronRight className="hidden size-3.5 text-ink-4 sm:inline" />
        <span className="hidden truncate font-medium sm:inline">{p.data.name}</span>
      </motion.div>

      {/* hero */}
      <motion.section
        initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="card relative has-[[role=menu]]:z-30"
      >
        <div className="relative h-40 overflow-hidden rounded-t-[27px] sm:h-60">
          <motion.div className="absolute inset-0" style={{ y: coverY, scale: coverScale }}>
            <GenerativeArt seed={`${p.data.id}-cover`} variant="mesh" discipline={primaryOf(p)} className="size-full" playBadge={false} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-white/80 p-0.5 backdrop-blur-xl dark:bg-black/40">
              <DisciplineBadge id={primaryOf(p)} />
            </span>
          </div>
        </div>

        <div className="relative z-[1] px-5 pb-5 sm:px-7 sm:pb-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
            <motion.div initial={{ scale: 0.5, rotate: -10, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}>
              <PersonAvatar person={p} size={120} square className="shadow-[0_0_0_5px_var(--surface),0_24px_40px_-18px_rgba(0,0,0,.5)] max-sm:hidden" />
              <PersonAvatar person={p} size={92} square className="shadow-[0_0_0_4px_var(--surface),0_20px_30px_-16px_rgba(0,0,0,.5)] sm:hidden" />
            </motion.div>
            {!isMe && (
              <div className="flex flex-wrap items-center gap-2">
                <RelationCTA p={p} a={a} className="max-lg:hidden" />
                {a.match && (
                  <FavoriteStar active={a.match.favorite} onToggle={a.toggleFavorite} label={t(a.match.favorite ? 'network.card.unfavorite' : 'network.card.favorite')} size={44} />
                )}
                <Menu
                  width={220}
                  className="bg-[color-mix(in_oklab,var(--surface)_95%,transparent)]"
                  trigger={({ onClick }) => (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={onClick}
                      className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)] hover:text-ink"
                      aria-label={t('core.action.more')}
                    >
                      <MoreHorizontal className="size-5" />
                    </motion.button>
                  )}
                  items={[
                    { label: t('network.person.copyLink'), icon: <Link2 />, onClick: () => void share() },
                    { label: t('network.card.quickLook'), icon: <Eye />, onClick: () => setPreview(p.data.id) },
                    ...(a.match
                      ? [
                          { label: t(a.match.favorite ? 'network.card.unfavorite' : 'network.card.favorite'), icon: <Star />, onClick: a.toggleFavorite },
                          { divider: true, label: '' },
                          { label: t('discover.unmatch.confirm'), icon: <HeartCrack />, danger: true, onClick: () => void a.unmatch().then((ok) => ok && navigate('/network')) },
                        ]
                      : []),
                  ]}
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[28px] font-medium leading-tight tracking-[-0.035em] sm:text-[34px]">{p.data.name}</h2>
              {p.data.verified && <BadgeCheck className="size-6 text-info" />}
              <RelationPill relation={a.relation} />
            </div>
            <p className="mt-1 text-[15px] text-ink-2">{headlineOf(p)}</p>
            <PersonBadges person={p} className="mt-3" size="sm" />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-3">
              <LocationLine person={p} />
              <PriceLabel person={p} className="font-medium text-ink" />
              {ratingOf(p) !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <RatingStars value={ratingOf(p)!} size={14} />
                  <span className="font-mono text-ink">{fmtRating(ratingOf(p)!)}</span>
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
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {t('core.common.joined', { date: `${shortDate(p.data.joinedAt, lang)} ${new Date(p.data.joinedAt).getFullYear()}` })}
              </span>
            </div>
            {!isMe && <RelationCTA p={p} a={a} block className="mt-5 lg:hidden" />}
          </div>

          <motion.div variants={stagger(0.05, 0.25)} initial="hidden" animate="show" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 10, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 26 } } }}
                className={cn('rounded-[18px] p-3.5', i === 0 ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]')}
              >
                <div className={cn('truncate text-[12px]', i === 0 ? 'text-white/60' : 'text-ink-3')}>{s.label}</div>
                <div className="mt-1.5 text-[24px] font-medium leading-none tracking-[-0.03em]">{s.node}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* tabs */}
      <div className="sticky top-2 z-20 lg:top-3">
        <div className="card no-scrollbar overflow-x-auto p-1.5">
          <Segmented<TabId>
            value={tab}
            onChange={setTab}
            layoutId={`person-tab-${p.data.id}`}
            className="relative z-[1] min-w-max bg-transparent"
            options={tabs.map((x) => ({ value: x.value, label: x.label, count: x.count }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -6, filter: 'blur(6px)', transition: { duration: 0.15 } }}
            >
              {tab === 'portfolio' && <PortfolioTab p={p} openMedia={viewer.open} />}
              {tab === 'briefs' && <BriefsTab p={p} a={a} openMedia={viewer.open} />}
              {tab === 'about' && <AboutTab p={p} />}
              {tab === 'reviews' && <ReviewsTab p={p} />}
              {tab === 'work' && <WorkTab p={p} a={a} jobs={jobs} />}
              {tab === 'files' && <FilesTab files={files} openMedia={viewer.open} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.aside variants={stagger(0.08, 0.3)} initial="hidden" animate="show" className="space-y-4">
          {!isMe && <MatchSideCard p={p} a={a} />}
          <NoteSideCard a={a} />
          <FactsSideCard p={p} />
          <SimilarSideCard p={p} />
        </motion.aside>
      </div>

      {viewer.element}
      {a.confirmDialog}
      <ProfileDrawer />
    </div>
  )
}
