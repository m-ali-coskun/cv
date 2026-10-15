import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, Plus, Timer } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { useJobCtx } from './context'
import { useDuration, useNow } from './hooks'
import { hms, moneyWhole, trackedSeconds } from './model'
import { LiveDot, RollingText } from './ui'

/**
 * Night-card time tracker: live hh:mm:ss, start/stop (one timer app-wide),
 * quick manual logs and the effective hourly rate.
 */
export function TimeTracker({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT()
  const lang = useLang()
  const dur = useDuration()
  const { job, canAct, side } = useJobCtx()
  const startTimer = useApp((s) => s.startTimer)
  const stopTimer = useApp((s) => s.stopTimer)
  const logTime = useApp((s) => s.logTime)
  const running = !!job.timerStartedAt
  const now = useNow(1000, running)
  const secs = trackedSeconds(job, now)
  const session = running ? (now - new Date(job.timerStartedAt!).getTime()) / 1000 : 0
  const hours = secs / 3600
  const rate = hours > 0.25 ? job.budget / hours : 0
  const editable = canAct && side === 'designer' && job.status !== 'declined' && job.status !== 'cancelled'

  const toggle = () => {
    if (running) {
      stopTimer(job.id)
      toast({ title: t('job.timer.stopped'), description: t('job.timer.session', { time: dur(session / 60) }), tone: 'info' })
    } else {
      startTimer(job.id)
      toast({ title: t('job.timer.started'), description: job.title, tone: 'success' })
    }
  }
  const log = (m: number) => {
    logTime(job.id, m)
    toast({ title: t('job.timer.logged', { time: dur(m) }), description: job.title, tone: 'success', duration: 2200 })
  }

  return (
    <div className={cn('glass-night relative overflow-hidden rounded-[22px] p-4', className)}>
      {/* soft accent glow while running */}
      <AnimatePresence>
        {running && (
          <motion.div
            aria-hidden
            className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--accent)] blur-3xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.25, 0.4, 0.25], scale: [1, 1.15, 1] }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
      <div className="relative z-[1]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-on-night/75">
            <Timer className="size-3.5" />
            {t('job.timer.title')}
          </span>
          {running ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-on-night">
              <LiveDot color="var(--accent)" />
              {t('job.timer.running')}
            </span>
          ) : (
            <span className="text-[11px] text-on-night/50">{t('job.timer.paused')}</span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <RollingText value={hms(secs)} className={cn('font-medium leading-none tracking-[-0.02em] text-on-night', compact ? 'text-[28px]' : 'text-[34px]')} />
            <div className="mt-1.5 font-mono text-[11.5px] text-on-night/60">
              {t('job.timer.total', { time: dur(secs / 60) })}
              {rate > 0 && <> · {t('job.timer.rate', { rate: moneyWhole(rate, job.currency, lang) })}</>}
            </div>
          </div>
          {editable && (
            <motion.button
              type="button"
              onClick={toggle}
              aria-label={running ? t('job.timer.stop') : t('job.timer.start')}
              className={cn(
                'relative flex size-14 shrink-0 items-center justify-center rounded-full shadow-[0_12px_30px_-10px_var(--accent)]',
                running ? 'bg-white text-[#0b0b0c]' : 'bg-accent text-accent-ink',
              )}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              transition={spring.bouncy}
            >
              {running && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-white/60" />}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={running ? 'p' : 's'} initial={{ scale: 0.3, rotate: -90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, rotate: 90, opacity: 0 }} transition={spring.bouncy}>
                  {running ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          )}
        </div>
        {editable && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[15, 30, 60].map((m) => (
              <motion.button
                key={m}
                type="button"
                onClick={() => log(m)}
                whileTap={{ scale: 0.92 }}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 font-mono text-[11.5px] text-on-night transition-colors hover:bg-white/20"
              >
                <Plus className="size-3" />
                {dur(m)}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
