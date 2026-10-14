import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import type { Designer, Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Gauge } from '@/components/ui/Gauge'
import { Menu } from '@/components/ui/Menu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { DisciplineIcon } from '@/components/ui/Badge'
import { briefChecks, profileChecks, score, type Check as CheckT } from '../data'
import { ArrowButton, Card, MonoId } from '../ui'

/** Re-point the ink tokens at the accent's ink so ticks & captions stay dark on the lime panel in dark mode too. */
const ON_ACCENT = {
  '--ink': 'var(--accent-ink)',
  '--ink-2': 'color-mix(in oklab, var(--accent-ink) 72%, transparent)',
  '--ink-3': 'color-mix(in oklab, var(--accent-ink) 55%, transparent)',
} as React.CSSProperties

/** White capsule under the gauge: "1254 Oak Street   23 / 23 done". */
function GaugePill({ title, done, total }: { title: string; done: number; total: number }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-white px-4 py-2.5 text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,0_8px_20px_-12px_rgba(0,0,0,.35)]">
      <span className="truncate text-[13.5px] font-medium">{title}</span>
      <MonoId className="shrink-0 text-[12px] text-black/50">{t('overview.gauge.done', { d: done, n: total })}</MonoId>
    </div>
  )
}

function MissingChips<T extends string>({ checks, ns, onFix }: { checks: CheckT<T>[]; ns: string; onFix: (id: T) => void }) {
  const t = useT()
  const missing = checks.filter((c) => !c.ok)
  if (!missing.length)
    return (
      <p className="relative z-[1] mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-[color-mix(in_oklab,var(--success)_75%,var(--ink))]">
        <Check className="size-4" />
        {t(`${ns}.complete`)}
      </p>
    )
  return (
    <div className="relative z-[1] mt-3 flex flex-wrap gap-1.5">
      {missing.map((c, i) => (
        <motion.button
          key={c.id}
          type="button"
          onClick={() => onFix(c.id)}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 420, damping: 22 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-[var(--line-2)] px-2.5 text-[12px] text-ink-2 transition-colors hover:border-[var(--accent-line)] hover:bg-accent-softer hover:text-ink"
        >
          <Plus className="size-3" />
          {t(`${ns}.check.${c.id}`)}
        </motion.button>
      ))}
    </div>
  )
}

/**
 * Client: how complete is the selected job's brief? Follows the hero carousel
 * until the user picks another job from the switcher.
 */
export function BriefGaugeCard({ job, jobs, onPick, className }: { job?: Job; jobs: Job[]; onPick: (id: string) => void; className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const checks = useMemo(() => (job ? briefChecks(job) : []), [job])
  const value = job ? score(checks) : 0
  const done = job?.deliverables.filter((d) => d.done).length ?? 0

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.gauge.briefTitle')}
        className="z-[5]"
        subtitle={job ? <MonoId className="text-ink-3">{job.id}</MonoId> : undefined}
        action={
          <>
            {jobs.length > 1 && (
              <Menu
                width={280}
                trigger={({ onClick, open }) => (
                  <motion.button
                    type="button"
                    aria-label={t('overview.gauge.switch')}
                    title={t('overview.gauge.switch')}
                    aria-expanded={open}
                    onClick={onClick}
                    whileTap={{ scale: 0.9 }}
                    className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink transition-colors hover:bg-[var(--surface-3)]"
                  >
                    <ChevronsUpDown className="size-4" />
                  </motion.button>
                )}
                items={jobs.map((j) => ({
                  label: j.title,
                  icon: <DisciplineIcon id={j.discipline} size={18} />,
                  hint: `${score(briefChecks(j))}%`,
                  active: j.id === job?.id,
                  onClick: () => onPick(j.id),
                }))}
              />
            )}
            {job && <ArrowButton label={t('overview.gauge.openBrief')} onClick={() => navigate(`/jobs/${job.id}`)} size={36} />}
          </>
        }
      />
      {job ? (
        <>
          <div className="glass-accent relative z-[1] mt-4 rounded-[22px] px-4 pb-4 pt-5" style={ON_ACCENT}>
            <Gauge
              key={job.id}
              value={value}
              tone="ink"
              size={250}
              label={t('overview.gauge.briefLabel')}
              sublabel={t('overview.gauge.checks', { d: checks.filter((c) => c.ok).length, n: checks.length })}
              footer={<GaugePill title={job.title} done={done} total={job.deliverables.length} />}
              ariaLabel={t('overview.gauge.briefTitle')}
              className="relative z-[1]"
            />
          </div>
          <MissingChips checks={checks} ns="overview.gauge.brief" onFix={() => navigate(`/jobs/${job.id}`)} />
        </>
      ) : (
        <EmptyState
          className="py-8"
          icon={<Check />}
          title={t('overview.gauge.noBrief')}
          action={
            <Button size="sm" onClick={() => navigate('/brief/new')}>
              {t('overview.hero.writeBrief')}
            </Button>
          }
        />
      )}
    </Card>
  )
}

/** Designer: profile strength (avatar, bio, portfolio, skills, tools, rate, headline). */
export function ProfileGaugeCard({ me, className }: { me?: Designer; className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const checks = useMemo(() => profileChecks(me), [me])
  const value = score(checks)
  const ok = checks.filter((c) => c.ok).length
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('overview.gauge.profileTitle')}
        subtitle={t('overview.gauge.profileSub')}
        action={<ArrowButton label={t('overview.gauge.openProfile')} onClick={() => navigate('/profile')} size={36} />}
      />
      <div className="glass-accent relative z-[1] mt-4 rounded-[22px] px-4 pb-4 pt-5" style={ON_ACCENT}>
        <Gauge
          value={value}
          tone="ink"
          size={250}
          label={value >= 100 ? t('overview.gauge.allStar') : t('overview.gauge.profileLabel')}
          sublabel={t('overview.gauge.checks', { d: ok, n: checks.length })}
          footer={<GaugePill title={me?.name ?? 'Ali'} done={ok} total={checks.length} />}
          ariaLabel={t('overview.gauge.profileTitle')}
          className="relative z-[1]"
        />
      </div>
      <MissingChips checks={checks} ns="overview.gauge.profile" onFix={(id) => navigate(id === 'portfolio' ? '/profile?add=1' : '/profile')} />
    </Card>
  )
}
