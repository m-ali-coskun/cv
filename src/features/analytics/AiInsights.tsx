import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { item } from '@/lib/motion'

export interface Insight {
  id: string
  /** Bullet colour. */
  color: string
  text: string
  action?: { label: string; onClick: () => void }
}

/** Word-by-word "focus pull" headline. */
function Headline({ text, k }: { text: string; k: string | number }) {
  return (
    <h3 className="relative z-[1] mt-3 text-[20px] font-medium leading-tight tracking-[-0.02em] text-on-night sm:text-[22px]" aria-label={text}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={`${k}-${i}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.12 + i * 0.045, duration: 0.5, ease: EASE_OUT }}
        >
          {w}{' '}
        </motion.span>
      ))}
    </h3>
  )
}

/**
 * The reference's black "AI" card: generated, data-driven insights with a
 * re-analyse shimmer, word-by-word headline and per-insight quick actions.
 */
export function AiInsightsCard({
  name,
  headline,
  insights,
  primary,
  className,
  footer,
}: {
  name: string
  headline: string
  insights: Insight[]
  primary?: { label: string; onClick: () => void; icon?: ReactNode }
  className?: string
  footer?: ReactNode
}) {
  const t = useT()
  const lang = useLang()
  const [analyzedAt, setAnalyzedAt] = useState(() => Date.now())
  const [thinking, setThinking] = useState(false)

  const reanalyze = () => {
    if (thinking) return
    setThinking(true)
    window.setTimeout(() => {
      setAnalyzedAt(Date.now())
      setThinking(false)
    }, 1100)
  }

  return (
    <Glass variant="night" variants={item} spotlight className={cn('relative flex min-w-0 flex-col overflow-hidden p-5 text-on-night', className)}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 65%)' }}
        animate={{ x: [0, -30, 10, 0], y: [0, 20, -10, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-52 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--glow-2), transparent 65%)' }}
        animate={{ x: [0, 24, -8, 0], y: [0, -16, 6, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-[1] flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <motion.span
            className="flex size-8 items-center justify-center rounded-full bg-white/10 text-accent"
            animate={thinking ? { rotate: 360 } : { rotate: 0 }}
            transition={thinking ? { duration: 1.1, ease: 'linear', repeat: Infinity } : { duration: 0.3 }}
          >
            <Sparkles className="size-4" />
          </motion.span>
          <span className="text-[15px] font-medium">{name}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-mono text-[11.5px] text-white/50">{thinking ? t('analytics.ai.thinking') : timeAgo(new Date(analyzedAt), lang)}</span>
          <motion.button
            type="button"
            aria-label={t('analytics.ai.reanalyze')}
            title={t('analytics.ai.reanalyze')}
            onClick={reanalyze}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn('size-3.5', thinking && 'animate-spin')} />
          </motion.button>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {thinking ? (
          <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] mt-4 flex-1 space-y-2.5" aria-busy>
            {[72, 94, 66, 84].map((w, i) => (
              <div key={i} className="h-3.5 overflow-hidden rounded-full bg-white/10" style={{ width: `${w}%` }}>
                <div className="h-full w-full animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.25)_50%,transparent_70%)] bg-[length:200%_100%]" />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key={`r-${analyzedAt}`} className="relative z-[1] flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(4px)' }}>
            <Headline text={headline} k={`${analyzedAt}-${headline}`} />
            <ul className="mt-3 space-y-2">
              {insights.map((ins, i) => (
                <motion.li
                  key={ins.id}
                  className="group flex items-start gap-2.5 text-[13.5px] leading-snug text-white/80"
                  initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
                >
                  <span className="relative mt-[5px] flex size-2 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full opacity-50" style={{ background: ins.color, animationDuration: `${2.2 + i * 0.4}s` }} />
                    <span className="relative size-2 rounded-full" style={{ background: ins.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    {ins.text}
                    {ins.action && (
                      <button
                        type="button"
                        onClick={ins.action.onClick}
                        className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap font-medium text-accent underline-offset-4 hover:underline"
                      >
                        {ins.action.label}
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    )}
                  </span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
              {primary && (
                <Button variant="accent" size="md" icon={primary.icon} onClick={primary.onClick}>
                  {primary.label}
                </Button>
              )}
              {footer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Glass>
  )
}
