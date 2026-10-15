import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Building2, Eye, FilePlus2, Palette, PencilLine, Share2, ShieldCheck, Sparkles, Target, UserRoundX, Users, Zap } from 'lucide-react'
import { EASE_IN_OUT, EASE_OUT, item, stagger } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useClient } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, type Client } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { EmptyState } from '@/components/ui/EmptyState'
import { PersonAvatar, fmtMoney0 } from '@/features/discover/ProfileBits'
import { personOf } from '@/features/discover/model'
import { useIsMobile } from '@/features/discover/hooks'
import { clientStrength } from '../shared/data'
import { DiscoverCardPreview } from '../shared/DiscoverPreview'
import { ClientProfileMock } from '../shared/ProfileMock'
import { StrengthCard } from '../shared/StrengthCard'
import { LastSaved, SectionNav } from '../shared/ui'
import { scrollToSection } from '../shared/saveState'
import { BrandSection, BriefsSection, CompanySection, HiringSection, TrustSection } from './sections'

type Mode = 'edit' | 'preview'

const swap = {
  initial: { opacity: 0, y: 18, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, y: -10, filter: 'blur(6px)', transition: { duration: 0.18, ease: EASE_IN_OUT } },
}

/** /profile in the client workspace: the company profile designers see. */
export function ClientProfile() {
  const t = useT()
  const c = useClient(ME_CLIENT_ID)
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('view') === 'preview' ? 'preview' : 'edit'
  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params)
    if (m === 'preview') next.set('view', 'preview')
    else next.delete('view')
    setParams(next, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  if (!c) return <EmptyState icon={<UserRoundX />} title={t('profile.missing')} />
  return (
    <motion.div variants={stagger(0.07, 0.02)} initial="hidden" animate="show" className="space-y-4">
      <Hero c={c} mode={mode} onMode={setMode} />
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'edit' ? (
          <motion.div key="edit" {...swap}>
            <Editor c={c} onPreview={() => setMode('preview')} />
          </motion.div>
        ) : (
          <motion.div key="preview" {...swap}>
            <Preview c={c} onEdit={() => setMode('edit')} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Hero({ c, mode, onMode }: { c: Client; mode: Mode; onMode: (m: Mode) => void }) {
  const t = useT()
  const strength = useMemo(() => clientStrength(c), [c])
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/network/${c.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: t('profile.hero.linkCopied'), description: url, tone: 'success' })
    } catch {
      toast({ title: url, tone: 'info' })
    }
  }
  const level = strength.score >= 100 ? 'allStar' : strength.score >= 80 ? 'strong' : strength.score >= 50 ? 'good' : 'weak'
  return (
    <motion.div variants={item}>
      <Glass spotlight className="overflow-hidden p-4 sm:p-6">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-[380px] rounded-full blur-3xl"
          animate={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${c.logoColor} 45%, transparent), transparent)` }}
          transition={{ duration: 0.8 }}
        />
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <motion.span key={c.logoColor} className="shrink-0" initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }}>
              <PersonAvatar person={personOf(c)} size={76} className="shadow-[0_14px_30px_-14px_rgba(0,0,0,.55)]" />
            </motion.span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[28px]">{c.name}</h2>
                {c.verified && <BadgeCheck className="size-5 shrink-0 text-info" />}
                {c.paymentVerified && <Zap className="size-4 shrink-0 text-success" />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                <span>
                  {c.contactName} · {c.contactRole}
                </span>
                <LastSaved />
              </div>
              <p className="mt-1.5 line-clamp-2 max-w-2xl text-[14px] text-ink-2">{c.industry} · {c.location}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Mode>
              value={mode}
              onChange={onMode}
              options={[
                { value: 'edit', label: t('profile.hero.edit'), icon: <PencilLine className="size-4" /> },
                { value: 'preview', label: <><span className="sm:hidden">{t('profile.hero.previewShort')}</span><span className="hidden sm:inline">{t('profile.hero.previewClient')}</span></>, icon: <Eye className="size-4" /> },
              ]}
            />
            <Button variant="glass" size="sm" className="h-9.5" icon={<Share2 className="size-4" />} onClick={share}>
              {t('profile.hero.share')}
            </Button>
          </div>
        </div>
        <div className="relative z-[1] mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile dark label={t('profile.hero.strength')} hint={t(`profile.strength.level.${level}`)}>
            <AnimatedCounter value={strength.score} suffix="%" />
          </Tile>
          <Tile label={t('profile.client.openBriefsShort')} hint={t('profile.hero.briefsHint')} onClick={() => scrollToSection('briefs', false)}>
            <AnimatedCounter value={c.openBriefs.length} />
          </Tile>
          <Tile label={t('profile.client.hires')} hint={t('profile.hero.hiresHint')}>
            <AnimatedCounter value={c.hiresCount} />
          </Tile>
          <Tile label={t('profile.client.budget')} hint={t('profile.hero.budgetHint')} onClick={() => scrollToSection('hiring', false)}>
            <span className="font-mono text-[17px] sm:text-[26px]">
              {fmtMoney0(c.budgetRange[0], c.currency, 'en', true)}–{fmtMoney0(c.budgetRange[1], c.currency, 'en', true)}
            </span>
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

function TipsCard({ c }: { c: Client }) {
  const t = useT()
  const matches = useApp((s) => s.matches)
  const designers = useApp((s) => s.designers)
  const matchCount = useMemo(() => matches.filter((m) => m.clientId === c.id).length, [matches, c.id])
  const fresh = useMemo(() => designers.filter((d) => d.isNew || d.registeredInApp).length, [designers])
  const missing = useMemo(() => clientStrength(c).items.filter((i) => !i.ok).sort((a, b) => b.weight - a.weight).slice(0, 3), [c])
  const DOT = ['#ff6b3d', '#f5a524', 'var(--accent)']
  return (
    <Glass variant="night">
      <div className="relative z-[1] p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Sparkles className="size-4" />
          </span>
          <span className="text-[15px] font-medium">{t('profile.clientTips.title')}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[.07] p-3">
            <div className="flex items-center gap-1 text-[11.5px] text-white/55">
              <Users className="size-3.5" />
              {t('profile.insights.matches')}
            </div>
            <div className="mt-1 text-[22px] font-medium">
              <AnimatedCounter value={matchCount} />
            </div>
          </div>
          <div className="rounded-2xl bg-white/[.07] p-3">
            <div className="flex items-center gap-1 text-[11.5px] text-white/55">
              <Sparkles className="size-3.5" />
              {t('profile.clientTips.fresh')}
            </div>
            <div className="mt-1 text-[22px] font-medium">
              <AnimatedCounter value={fresh} />
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {(missing.length ? missing.map((m) => ({ id: m.id, text: t(`profile.tips.${m.id}`), section: m.section, w: m.weight })) : [{ id: 'ok', text: t('profile.clientTips.allGood'), section: '', w: 0 }]).map((m, i) => (
            <li key={m.id}>
              <button type="button" disabled={!m.section} onClick={() => m.section && scrollToSection(m.section)} className="flex w-full items-center gap-2.5 text-left text-[13px] text-white/80 hover:text-white">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: DOT[i % DOT.length] }} />
                <span className="min-w-0 flex-1">{m.text}</span>
                {m.w > 0 && <span className="font-mono text-[11px] text-white/40">+{m.w}%</span>}
              </button>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <Button variant="accent" size="sm" className="mt-4" onClick={() => scrollToSection(missing[0].section)}>
            {t('profile.insights.fix')}
          </Button>
        )}
      </div>
    </Glass>
  )
}

function Editor({ c, onPreview }: { c: Client; onPreview: () => void }) {
  const t = useT()
  const narrow = useIsMobile('(max-width: 1279px)')
  const strength = useMemo(() => clientStrength(c), [c])
  const done = (s: string) => strength.items.filter((i) => i.section === s).every((i) => i.ok)
  const nav = useMemo(
    () => [
      { id: 'brand', label: t('profile.brand.title'), icon: <Palette /> },
      { id: 'company', label: t('profile.company.title'), icon: <Building2 />, done: done('company') },
      { id: 'hiring', label: t('profile.hiring.short'), icon: <Target />, done: done('hiring') },
      { id: 'briefs', label: t('profile.briefs.short'), icon: <FilePlus2 />, done: done('briefs') },
      { id: 'trust', label: t('profile.trust.short'), icon: <ShieldCheck />, done: done('trust') },
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
            <StrengthCard score={strength.score} items={strength.items} footerLabel={c.name} />
          </div>
        )}
        <motion.div variants={stagger(0.06, 0.05)} initial="hidden" animate="show" className="space-y-4">
          <BrandSection c={c} />
          <CompanySection c={c} />
          <HiringSection c={c} />
          <BriefsSection c={c} />
          <TrustSection c={c} />
        </motion.div>
        {narrow && (
          <div>
            <TipsCard c={c} />
          </div>
        )}
      </div>
      {!narrow && (
      <aside>
        <div className="sticky top-4 space-y-4">
          <StrengthCard score={strength.score} items={strength.items} footerLabel={c.name} />
          <Glass className="p-4 sm:p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-[17px] font-medium tracking-[-0.02em]">{t('profile.preview.cardTitle')}</h3>
              <Button size="xs" variant="soft" icon={<Eye className="size-3.5" />} onClick={onPreview}>
                {t('profile.preview.full')}
              </Button>
            </div>
            <p className="mb-4 text-[12.5px] text-ink-3">{t('profile.preview.cardHintClient')}</p>
            <DiscoverCardPreview person={personOf(c)} onOpen={onPreview} />
          </Glass>
          <TipsCard c={c} />
        </div>
      </aside>
      )}
    </div>
  )
}

function Preview({ c, onEdit }: { c: Client; onEdit: () => void }) {
  const t = useT()
  return (
    <div className="space-y-4">
      <Glass variant="night" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative z-[1] flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Eye className="size-[18px]" />
          </span>
          <div>
            <div className="text-[15px] font-medium">{t('profile.preview.bannerTitleClient')}</div>
            <div className="text-[12.5px] text-white/60">{t('profile.preview.bannerTextClient')}</div>
          </div>
        </div>
        <Button variant="accent" size="sm" className="relative z-[1] self-start sm:self-auto" icon={<PencilLine className="size-4" />} onClick={onEdit}>
          {t('profile.preview.backToEdit')}
        </Button>
      </Glass>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <div className="lg:sticky lg:top-4">
            <Glass className="p-4 sm:p-5">
              <h3 className="text-[17px] font-medium tracking-[-0.02em]">{t('profile.preview.cardTitle')}</h3>
              <p className="mb-4 mt-0.5 text-[12.5px] text-ink-3">{t('profile.preview.cardHintClient')}</p>
              <DiscoverCardPreview person={personOf(c)} />
            </Glass>
          </div>
        </div>
        <ClientProfileMock client={c} />
      </div>
    </div>
  )
}
