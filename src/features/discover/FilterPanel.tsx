import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Globe2, RotateCcw, ShieldCheck, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'
import { Segmented } from '@/components/ui/Segmented'
import { Button } from '@/components/ui/Button'
import type { Availability } from '@/store/types'
import { useDiscoverUI } from './discoverStore'
import type { usePool } from './hooks'
import { BUDGET_MAX, RATE_MAX, REGIONS, activeFilterCount, topTags } from './model'
import { fmtMoney0 } from './ProfileBits'

type Pool = ReturnType<typeof usePool>

const AVAIL: { id: Availability; dot: string }[] = [
  { id: 'available', dot: '#2fb36b' },
  { id: 'limited', dot: '#f5a524' },
  { id: 'booked', dot: '#e5484d' },
]
const RATINGS = ['0', '4', '4.5', '4.8'] as const

function Section({ title, hint, children, delay = 0 }: { title: ReactNode; hint?: ReactNode; children: ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-medium text-ink-2">{title}</h4>
        {hint && <span className="font-mono text-[11.5px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </motion.section>
  )
}

function ToggleChip({ active, onClick, children, dot }: { active: boolean; onClick: () => void; children: ReactNode; dot?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-200',
        active ? 'border-transparent bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink' : 'border-line-2 text-ink-2 hover:border-[var(--ink-4)] hover:text-ink',
      )}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {children}
    </motion.button>
  )
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export function FilterPanel({ pool, onDone, showTitle = true }: { pool: Pool; onDone: () => void; showTitle?: boolean }) {
  const t = useT()
  const lang = useLang()
  const f = pool.filters
  const setFilters = useDiscoverUI((s) => s.setFilters)
  const resetFilters = useDiscoverUI((s) => s.resetFilters)
  const set = (patch: Partial<typeof f>) => setFilters(pool.role, patch)
  const tags = topTags(pool.inTab, 14)
  const count = activeFilterCount(f, pool.kind)
  const designers = pool.kind === 'designer'
  const currency = 'EUR'

  return (
    <div className="flex flex-col">
      <div className="space-y-5 px-5 pb-4 pt-5">
        <div className={cn('flex items-center justify-between', !showTitle && !count && 'hidden')}>
          <h3 className={cn('text-[17px] font-medium tracking-[-0.02em]', !showTitle && 'invisible')}>{t('discover.filters.title')}</h3>
          {count > 0 && (
            <button type="button" onClick={() => resetFilters(pool.role)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3 hover:text-ink">
              <RotateCcw className="size-3.5" />
              {t('discover.filters.reset')}
            </button>
          )}
        </div>

        {designers ? (
          <>
            <Section title={t('discover.filters.availability')} delay={0.02}>
              <div className="flex flex-wrap gap-1.5">
                {AVAIL.map((a) => (
                  <ToggleChip key={a.id} dot={a.dot} active={f.availability.includes(a.id)} onClick={() => set({ availability: toggle(f.availability, a.id) })}>
                    {t(`core.availability.${a.id}`)}
                  </ToggleChip>
                ))}
              </div>
            </Section>
            <Section
              title={t('discover.filters.rate')}
              hint={`${fmtMoney0(f.rate[0], currency, lang)} – ${f.rate[1] >= RATE_MAX ? `${fmtMoney0(RATE_MAX, currency, lang)}+` : fmtMoney0(f.rate[1], currency, lang)}`}
              delay={0.05}
            >
              <div className="px-1.5 pt-1">
                <Slider
                  value={f.rate}
                  onChange={(v: [number, number]) => set({ rate: v })}
                  min={0}
                  max={RATE_MAX}
                  step={5}
                  minGap={10}
                  format={(v) => (v >= RATE_MAX ? `${v}+` : String(v))}
                  ariaLabel={t('discover.filters.rate')}
                />
              </div>
            </Section>
          </>
        ) : (
          <>
            <Section
              title={t('discover.filters.budget')}
              hint={`${formatMoney(f.budget[0], currency, lang, true)} – ${f.budget[1] >= BUDGET_MAX ? `${formatMoney(BUDGET_MAX, currency, lang, true)}+` : formatMoney(f.budget[1], currency, lang, true)}`}
              delay={0.02}
            >
              <div className="px-1.5 pt-1">
                <Slider
                  value={f.budget}
                  onChange={(v: [number, number]) => set({ budget: v })}
                  min={0}
                  max={BUDGET_MAX}
                  step={250}
                  minGap={500}
                  format={(v) => formatMoney(v, currency, lang, true)}
                  ariaLabel={t('discover.filters.budget')}
                />
              </div>
            </Section>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13.5px]">
                <ShieldCheck className="size-4 text-success" />
                {t('discover.filters.paymentVerified')}
              </span>
              <Toggle size="sm" checked={f.paymentVerified} onChange={(v) => set({ paymentVerified: v })} label={t('discover.filters.paymentVerified')} />
            </div>
          </>
        )}

        <Section title={t('discover.filters.minRating')} delay={0.08}>
          <Segmented
            value={String(f.minRating) as (typeof RATINGS)[number]}
            onChange={(v) => set({ minRating: Number(v) })}
            size="sm"
            layoutId={`rating-${pool.role}`}
            className="w-full [&>button]:flex-1"
            options={RATINGS.map((r) => ({
              value: r,
              label: r === '0' ? t('discover.filters.any') : `${Number(r).toFixed(1)}+`,
              icon: r === '0' ? undefined : <Star className="size-3 fill-[#FFB21E] text-[#FFB21E]" />,
            }))}
          />
        </Section>

        {tags.length > 0 && (
          <Section title={t(designers ? 'discover.filters.tools' : 'discover.filters.industries')} hint={f.tags.length ? String(f.tags.length) : undefined} delay={0.11}>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <ToggleChip key={tag} active={f.tags.includes(tag)} onClick={() => set({ tags: toggle(f.tags, tag) })}>
                  {tag}
                </ToggleChip>
              ))}
            </div>
          </Section>
        )}

        <Section title={t('discover.filters.region')} delay={0.14}>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <ToggleChip key={r} active={f.regions.includes(r)} onClick={() => set({ regions: toggle(f.regions, r) })}>
                <Globe2 className="size-3.5 opacity-70" />
                {t(`discover.region.${r}`)}
              </ToggleChip>
            ))}
          </div>
        </Section>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-3.5 py-3">
          <span className="flex items-center gap-2 text-[13.5px]">
            <BadgeCheck className="size-4 text-info" />
            {t('discover.filters.verifiedOnly')}
          </span>
          <Toggle size="sm" checked={f.verifiedOnly} onChange={(v) => set({ verifiedOnly: v })} label={t('discover.filters.verifiedOnly')} />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-[color-mix(in_oklab,var(--surface)_85%,transparent)] px-5 py-3.5 backdrop-blur-xl">
        <Button variant="ghost" size="sm" onClick={() => resetFilters(pool.role)} disabled={!count}>
          {t('discover.filters.reset')}
        </Button>
        <Button size="sm" className="ml-auto" onClick={onDone}>
          {t('discover.filters.show', { count: pool.filtered.length })}
        </Button>
      </div>
    </div>
  )
}
