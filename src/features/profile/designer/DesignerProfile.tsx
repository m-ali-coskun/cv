import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Eye, FolderOpen, Heart, Link2, MessageSquareQuote, Palette, PencilLine, Plus, Share2, Star, UserRound, UserRoundX, Wallet } from 'lucide-react'
import { EASE_IN_OUT, EASE_OUT, item, stagger } from '@/lib/motion'
import { useLang, useT } from '@/i18n'
import { useDesigner } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_DESIGNER_ID, type Designer } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { EmptyState } from '@/components/ui/EmptyState'
import { DisciplineIcon } from '@/components/ui/Badge'
import { PersonAvatar, fmtMoney0 } from '@/features/discover/ProfileBits'
import { personOf } from '@/features/discover/model'
import { useIsMobile } from '@/features/discover/hooks'
import { designerStrength } from '../shared/data'
import { DiscoverCardPreview } from '../shared/DiscoverPreview'
import { DesignerProfileMock } from '../shared/ProfileMock'
import { StrengthCard } from '../shared/StrengthCard'
import { AvailDot, LastSaved, SectionNav } from '../shared/ui'
import { scrollToSection } from '../shared/saveState'
import { AboutSection, CraftSection, IdentitySection, RatesSection, ReviewsSection, SocialsSection } from './sections'
import { PortfolioSection } from './Portfolio'
import { InsightsCard } from './Insights'

type Mode = 'edit' | 'preview'

const swap = {
  initial: { opacity: 0, y: 18, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)', transition: { duration: 0.18, ease: EASE_IN_OUT } },
}

/** /profile in the designer studio: live editor + "How clients see me". */
export function DesignerProfile() {
  const t = useT()
  const d = useDesigner(ME_DESIGNER_ID)
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('view') === 'preview' ? 'preview' : 'edit'
  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params)
    if (m === 'preview') next.set('view', 'preview')
    else next.delete('view')
    setParams(next, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!d) return <EmptyState icon={<UserRoundX />} title={t('profile.missing')} />

  return (
    <motion.div variants={stagger(0.07, 0.02)} initial="hidden" animate="show" className="space-y-4">
      <Hero d={d} mode={mode} onMode={setMode} />
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'edit' ? (
          <motion.div key="edit" {...swap}>
            <Editor d={d} onPreview={() => setMode('preview')} />
          </motion.div>
        ) : (
          <motion.div key="preview" {...swap}>
            <Preview d={d} onEdit={() => setMode('edit')} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Hero({ d, mode, onMode }: { d: Designer; mode: Mode; onMode: (m: Mode) => void }) {
  const t = useT()
  const lang = useLang()
  const strength = useMemo(() => designerStrength(d), [d])
  const likes = d.portfolio.reduce((n, p) => n + p.likes, 0)
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/network/${d.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: t('profile.hero.linkCopied'), description: url, tone: 'success' })
    } catch {
      toast({ title: url, tone: 'info' })
    }
  }
  return (
    <motion.div variants={item}>
      <Glass spotlight className="overflow-hidden p-4 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-[380px] rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <motion.span className="relative shrink-0" whileHover={{ rotate: -4, scale: 1.04 }}>
              <PersonAvatar person={personOf(d)} size={76} className="shadow-[0_14px_30px_-14px_rgba(0,0,0,.55)]" />
              <span className="absolute bottom-0.5 right-0.5 rounded-full border-[3px] border-[var(--surface)]">
                <AvailDot value={d.availability} size={12} pulse />
              </span>
            </motion.span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">{d.name}</h2>
                {d.verified && <BadgeCheck className="size-5 shrink-0 text-info" />}
                <DisciplineIcon id={d.primary} size={24} className="shrink-0" />
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                <span className="font-mono">{d.handle}</span>
                <LastSaved />
              </div>
              <p className="mt-1.5 line-clamp-2 max-w-2xl text-[14px] text-ink-2">{d.headline}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Mode>
              value={mode}
              onChange={onMode}
              options={[
                { value: 'edit', label: t('profile.hero.edit'), icon: <PencilLine className="size-4" /> },
                { value: 'preview', label: <><span className="sm:hidden">{t('profile.hero.previewShort')}</span><span className="hidden sm:inline">{t('profile.hero.preview')}</span></>, icon: <Eye className="size-4" /> },
              ]}
            />
            <Button variant="glass" size="sm" className="h-9.5" icon={<Share2 className="size-4" />} onClick={share}>
              {t('profile.hero.share')}
            </Button>
          </div>
        </div>
        <div className="relative z-[1] mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile dark label={t('profile.hero.strength')} hint={t(`profile.strength.level.${strength.score >= 100 ? 'allStar' : strength.score >= 80 ? 'strong' : strength.score >= 50 ? 'good' : 'weak'}`)}>
            <AnimatedCounter value={strength.score} suffix="%" />
          </Tile>
          <Tile label={t('profile.hero.works')} hint={t('profile.hero.worksHint', { count: d.portfolio.reduce((n, p) => n + p.media.length, 0) })} onClick={() => scrollToSection('portfolio', false)}>
            <AnimatedCounter value={d.portfolio.length} />
          </Tile>
          <Tile label={t('profile.insights.likes')} hint={t('profile.hero.likesHint')}>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-5 text-[#ff3b6b]" />
              <AnimatedCounter value={likes} />
            </span>
          </Tile>
          <Tile label={t('profile.hero.rate')} hint={t(`core.availability.${d.availability}`)} onClick={() => scrollToSection('rates', false)}>
            <span className="font-mono">{fmtMoney0(d.hourlyRate, d.currency, lang)}</span>
            <span className="text-[14px] text-ink-3">/h</span>
          </Tile>
        </div>
      </Glass>
    </motion.div>
  )
}

function Tile({ label, hint, children, dark, onClick }: { label: string; hint?: string; children: React.ReactNode; dark?: boolean; onClick?: () => void }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={`min-w-0 rounded-[20px] p-3.5 text-left sm:p-4 ${dark ? 'bg-night text-on-night' : 'bg-[var(--surface-2)]'}`}
    >
      <div className={`truncate text-[12.5px] ${dark ? 'text-white/60' : 'text-ink-3'}`}>{label}</div>
      <div className="mt-1.5 truncate text-[28px] font-medium leading-none tracking-[-0.03em] sm:text-[32px]">{children}</div>
      {hint && <div className={`mt-2 truncate text-[12px] ${dark ? 'text-white/50' : 'text-ink-3'}`}>{hint}</div>}
    </Comp>
  )
}

function Editor({ d, onPreview }: { d: Designer; onPreview: () => void }) {
  const t = useT()
  const narrow = useIsMobile('(max-width: 1279px)')
  const strength = useMemo(() => designerStrength(d), [d])
  const sectionDone = (s: string) => strength.items.filter((i) => i.section === s).every((i) => i.ok)
  const nav = useMemo(
    () => [
      { id: 'identity', label: t('profile.identity.title'), icon: <UserRound />, done: sectionDone('identity') },
      { id: 'about', label: t('profile.about.title'), icon: <MessageSquareQuote />, done: sectionDone('about') },
      { id: 'craft', label: t('profile.craft.title'), icon: <Palette />, done: sectionDone('craft') },
      { id: 'rates', label: t('profile.rates.short'), icon: <Wallet />, done: sectionDone('rates') },
      { id: 'portfolio', label: t('profile.portfolio.title'), icon: <FolderOpen />, done: sectionDone('portfolio') },
      { id: 'socials', label: t('profile.socials.title'), icon: <Link2 />, done: sectionDone('socials') },
      { id: 'reviews', label: t('profile.reviews.title'), icon: <Star /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, strength],
  )
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <SectionNav sections={nav} />
        {narrow && (
          <div>
            <StrengthCard score={strength.score} items={strength.items} footerLabel={d.name} />
          </div>
        )}
        <motion.div variants={stagger(0.06, 0.05)} initial="hidden" animate="show" className="space-y-4">
          <IdentitySection d={d} />
          <AboutSection d={d} />
          <CraftSection d={d} />
          <RatesSection d={d} />
          <PortfolioSection d={d} />
          <SocialsSection d={d} />
          <ReviewsSection d={d} />
        </motion.div>
        {narrow && (
          <div>
            <InsightsCard d={d} />
          </div>
        )}
      </div>
      {!narrow && (
      <aside>
        <div className="sticky top-4 space-y-4">
          <StrengthCard score={strength.score} items={strength.items} footerLabel={d.name} />
          <Glass className="p-4 sm:p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-medium tracking-[-0.02em]">{t('profile.preview.cardTitle')}</h3>
              <Button size="xs" variant="soft" icon={<Eye className="size-3.5" />} onClick={onPreview}>
                {t('profile.preview.full')}
              </Button>
            </div>
            <p className="mb-4 text-[12.5px] text-ink-3">{t('profile.preview.cardHint')}</p>
            <DiscoverCardPreview person={personOf(d)} onOpen={onPreview} />
          </Glass>
          <InsightsCard d={d} />
        </div>
      </aside>
      )}
    </div>
  )
}

function Preview({ d, onEdit }: { d: Designer; onEdit: () => void }) {
  const t = useT()
  return (
    <div className="space-y-4">
      <Glass variant="night" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative z-[1] flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Eye className="size-[18px]" />
          </span>
          <div>
            <div className="text-[15px] font-medium">{t('profile.preview.bannerTitle')}</div>
            <div className="text-[12.5px] text-white/60">{t('profile.preview.bannerText')}</div>
          </div>
        </div>
        <div className="relative z-[1] flex flex-wrap gap-2">
          <Button variant="accent" size="sm" icon={<PencilLine className="size-4" />} onClick={onEdit}>
            {t('profile.preview.backToEdit')}
          </Button>
          <Button variant="glass" size="sm" className="!text-white" icon={<Plus className="size-4" />} onClick={() => (onEdit(), window.setTimeout(() => scrollToSection('portfolio', false), 300))}>
            {t('profile.addWork')}
          </Button>
        </div>
      </Glass>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <div className="lg:sticky lg:top-4">
            <Glass className="p-4 sm:p-5">
              <h3 className="text-[17px] font-medium tracking-[-0.02em]">{t('profile.preview.cardTitle')}</h3>
              <p className="mb-4 mt-0.5 text-[12.5px] text-ink-3">{t('profile.preview.cardHint')}</p>
              <DiscoverCardPreview person={personOf(d)} />
            </Glass>
          </div>
        </div>
        <DesignerProfileMock designer={d} />
      </div>
    </div>
  )
}
