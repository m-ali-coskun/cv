import { useMemo } from 'react'
import { motion } from 'motion/react'
import { Eye, Heart, Sparkles, Users } from 'lucide-react'
import { item, stagger } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import type { Designer } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Sparkline } from '@/components/charts'
import { MediaView } from '@/components/art/MediaView'
import { designerStrength, viewSeries } from '../shared/data'
import { scrollToSection } from '../shared/saveState'

const DOT = ['#ff6b3d', '#f5a524', 'var(--accent)']

/** Black "AI" card: profile views trend, likes, matches and next-best actions. */
export function InsightsCard({ d, className }: { d: Designer; className?: string }) {
  const t = useT()
  const matches = useApp((s) => s.matches)
  const matchCount = useMemo(() => matches.filter((m) => m.designerId === d.id).length, [matches, d.id])
  const likes = d.portfolio.reduce((n, p) => n + p.likes, 0)
  const views = d.portfolio.reduce((n, p) => n + p.views, 0)
  const series = useMemo(() => viewSeries(d.id, Math.max(views, 400)), [d.id, views])
  const last14 = series.reduce((a, b) => a + b, 0)
  const top = useMemo(() => [...d.portfolio].sort((a, b) => b.likes - a.likes)[0], [d.portfolio])
  const missing = useMemo(() => designerStrength(d).items.filter((i) => !i.ok).sort((a, b) => b.weight - a.weight).slice(0, 3), [d])
  const days = useMemo(
    () =>
      series.map((_, i) => {
        const dt = new Date(Date.now() - (series.length - 1 - i) * 864e5)
        return `${dt.getDate()}.${dt.getMonth() + 1}.`
      }),
    [series],
  )

  return (
    <Glass variant="night" className={className}>
      <motion.div variants={stagger(0.06, 0.05)} initial="hidden" animate="show" className="relative z-[1] p-4 sm:p-5">
        <motion.div variants={item} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] font-medium">{t('profile.insights.title')}</span>
          </span>
          <span className="font-mono text-[11px] text-white/45">{t('profile.insights.window')}</span>
        </motion.div>

        <motion.div variants={item} className="mt-4">
          <div className="text-[12.5px] text-white/55">{t('profile.insights.views')}</div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="text-[38px] font-medium leading-none tracking-[-0.04em]">
              <AnimatedCounter value={last14} />
            </span>
            <span className="mb-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">+{Math.round(((series[series.length - 1] || 1) / Math.max(1, series[0])) * 100 - 100)}%</span>
          </div>
          <Sparkline data={series} height={56} className="mt-3" interactive labels={days} ariaLabel={t('profile.insights.views')} />
        </motion.div>

        <motion.div variants={item} className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: <Heart className="size-3.5" />, label: t('profile.insights.likes'), v: likes },
            { icon: <Eye className="size-3.5" />, label: t('profile.insights.allViews'), v: views },
            { icon: <Users className="size-3.5" />, label: t('profile.insights.matches'), v: matchCount },
          ].map((s) => (
            <div key={s.label} className="min-w-0 rounded-2xl bg-white/[.07] p-2.5">
              <div className="flex items-center gap-1 truncate text-[11px] text-white/55">
                {s.icon}
                {s.label}
              </div>
              <div className="mt-1 text-[19px] font-medium tracking-[-0.02em]">
                <AnimatedCounter value={s.v} compact={s.v >= 10000} />
              </div>
            </div>
          ))}
        </motion.div>

        {top && (
          <motion.div variants={item} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[.07] p-2">
            <span className="relative h-11 w-14 shrink-0 overflow-hidden rounded-xl">
              <MediaView media={top.cover} playBadge={false} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-white/55">{t('profile.insights.top')}</span>
              <span className="block truncate text-[13px] font-medium">{top.title}</span>
            </span>
            <span className="mr-1 inline-flex items-center gap-1 font-mono text-[12px] text-accent">
              <Heart className="size-3 fill-current" />
              {top.likes}
            </span>
          </motion.div>
        )}

        {missing.length > 0 && (
          <motion.div variants={item} className="mt-4">
            <div className="text-[14px] font-medium">{t('profile.insights.next', { count: missing.length })}</div>
            <ul className="mt-2 space-y-1.5">
              {missing.map((m, i) => (
                <li key={m.id}>
                  <button type="button" onClick={() => scrollToSection(m.section)} className="flex w-full items-center gap-2.5 text-left text-[13px] text-white/80 hover:text-white">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: DOT[i % DOT.length] }} />
                    <span className="min-w-0 flex-1 truncate">{t(`profile.tips.${m.id}`)}</span>
                    <span className="font-mono text-[11px] text-white/40">+{m.weight}%</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="accent" size="sm" className="mt-4" onClick={() => scrollToSection(missing[0].section)}>
              {t('profile.insights.fix')}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </Glass>
  )
}
