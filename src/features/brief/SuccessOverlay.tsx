import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, CheckCheck, Clock, MessageCircle, PenLine, Send } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { disciplineTheme } from '@/theme/disciplines'
import type { DisciplineId } from '@/store/types'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useDesigner, useJob } from '@/store/selectors'
import { useUI } from '@/store/ui'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'

export interface SentInfo {
  jobId: string
  conversationId: string
  designerId: string
  title: string
  sentAt: string
}

/**
 * Full-screen "brief sent" moment: the brief sheet slides into an envelope,
 * the flap closes, the envelope folds into a paper plane and flies off;
 * confetti; then a live status card that follows the simulated designer
 * (typing → replied → accepted) in real time.
 */
export function SuccessOverlay({
  sent,
  onAnother,
  themeStyle,
  discipline,
}: {
  sent: SentInfo | null
  onAnother: () => void
  /** The wizard's scoped discipline theme (the overlay is portaled out of it). */
  themeStyle?: CSSProperties
  discipline?: DisciplineId | null
}) {
  return createPortal(
    <AnimatePresence>{sent && <Overlay key={sent.jobId} sent={sent} onAnother={onAnother} themeStyle={themeStyle} discipline={discipline ?? null} />}</AnimatePresence>,
    document.body,
  )
}

function Overlay({ sent, onAnother, themeStyle, discipline }: { sent: SentInfo; onAnother: () => void; themeStyle?: CSSProperties; discipline: DisciplineId | null }) {
  const t = useT()
  const navigate = useNavigate()
  const motionLevel = useApp((s) => s.settings.motion)
  const instant = motionLevel === 'off'
  const [phase, setPhase] = useState(instant ? 3 : 0)
  const designer = useDesigner(sent.designerId)
  const job = useJob(sent.jobId)
  const messages = useApp((s) => s.messages)
  const typing = useUI((s) => !!s.typing[sent.conversationId])
  const first = designer?.name.split(' ')[0] ?? ''

  const replied = useMemo(
    () => messages.some((m) => m.conversationId === sent.conversationId && m.senderId === sent.designerId && m.createdAt > sent.sentAt),
    [messages, sent],
  )
  const accepted = !!job && job.status !== 'requested' && job.status !== 'declined' && job.status !== 'cancelled'
  const countered = job?.counterOffer?.status === 'pending'

  useEffect(() => {
    if (instant) return
    const ids = [
      window.setTimeout(() => setPhase(1), 650), // paper into envelope
      window.setTimeout(() => setPhase(2), 1350), // fly away
      window.setTimeout(() => {
        const th = discipline && themeStyle ? disciplineTheme(discipline) : null
        const colors = th ? [th.accent, th.glow, th.glow2, '#ffffff', th.deep] : undefined
        fireConfetti({ particleCount: 200, origin: { x: 0.5, y: 0.45 }, colors })
        fireConfetti({ particleCount: 90, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors })
        fireConfetti({ particleCount: 90, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors })
      }, 1650),
      window.setTimeout(() => setPhase(3), 1900),
    ]
    return () => ids.forEach(window.clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && navigate(`/jobs/${sent.jobId}`)
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [navigate, sent.jobId])

  const steps = [
    { key: 'sent', done: true, label: t('brief.success.sSent') },
    { key: 'reading', done: replied || accepted, active: typing && !replied, label: typing && !replied ? t('brief.success.sTyping', { name: first }) : t('brief.success.sReplied', { name: first }) },
    { key: 'accepted', done: accepted || countered, label: countered ? t('brief.success.sCounter', { name: first }) : t('brief.success.sAccepted', { name: first }) },
  ]

  return (
    <motion.div style={themeStyle} className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} role="dialog" aria-modal aria-label={t('brief.success.title')}>
      <motion.div className="absolute inset-0 bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] backdrop-blur-[18px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--accent)_55%,transparent),transparent_65%)] blur-2xl"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: phase >= 2 ? 1.3 : 0.8, opacity: phase >= 2 ? 0.9 : 0.5 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
      />

      {/* ── envelope choreography ── */}
      <AnimatePresence>
        {phase < 3 && (
          <motion.div
            key="env"
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-[130px] -mt-[90px] h-[180px] w-[260px] [perspective:900px]"
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={
              phase === 2
                ? { x: '70vw', y: '-70vh', rotate: -28, scale: 0.35, opacity: 0.9, transition: { duration: 0.75, ease: [0.55, 0, 0.75, 0.2] } }
                : { scale: 1, opacity: 1, y: 0, transition: spring.bouncy }
            }
            exit={{ opacity: 0 }}
          >
            {/* trail */}
            {phase === 2 && (
              <motion.svg className="absolute right-full top-full h-[40vh] w-[60vw] overflow-visible" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}>
                <motion.path d="M0,300 C120,260 220,140 400,0" fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="6 10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              </motion.svg>
            )}
            {/* back of envelope */}
            <div className="absolute inset-0 rounded-[18px] bg-[color-mix(in_oklab,var(--accent)_70%,#fff)] shadow-[0_30px_60px_-20px_rgba(0,0,0,.45)]" />
            {/* the brief sheet */}
            <motion.div
              className="absolute inset-x-5 top-4 z-[1] h-[120px] overflow-hidden rounded-xl bg-white p-4 text-[#0b0b0c] shadow-[0_10px_24px_-10px_rgba(0,0,0,.35)]"
              initial={{ y: -90 }}
              animate={{ y: phase >= 1 ? 34 : -90 }}
              transition={{ duration: 0.55, ease: EASE_IOS }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/40">{sent.jobId}</div>
              <div className="mt-1 line-clamp-2 text-[14px] font-semibold leading-tight tracking-[-0.01em]">{sent.title}</div>
              {[80, 64, 72].map((w, i) => (
                <div key={i} className="mt-2 h-1.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />
              ))}
            </motion.div>
            {/* front pocket */}
            <div className="absolute inset-x-0 bottom-0 z-[2] h-[62%] overflow-hidden rounded-b-[18px]">
              <div className="absolute inset-0 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_92%,#fff),var(--accent))]" style={{ clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)' }} />
            </div>
            {/* flap */}
            <motion.div
              className="absolute inset-x-0 top-0 h-[58%] origin-top"
              style={{ zIndex: phase >= 1 ? 3 : 0, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', background: 'linear-gradient(180deg, color-mix(in oklab, var(--accent) 80%, #fff), color-mix(in oklab, var(--accent) 88%, #000))' }}
              initial={{ rotateX: 180 }}
              animate={{ rotateX: phase >= 1 ? 0 : 180 }}
              transition={{ duration: 0.45, delay: phase >= 1 ? 0.35 : 0, ease: EASE_OUT }}
            />
            {/* seal */}
            <motion.span
              className="absolute left-1/2 top-[50%] z-[4] flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-[var(--surface)] shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: phase >= 1 ? 1 : 0 }}
              transition={{ ...spring.bouncy, delay: 0.7 }}
            >
              <Send className="size-4" />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── result card ── */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            key="card"
            className="glass glass-strong relative z-[1] w-full max-w-[460px] rounded-[32px] p-6 text-center sm:p-8"
            initial={{ opacity: 0, y: 40, scale: 0.92, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <motion.div className="relative mx-auto flex size-20 items-center justify-center" initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring.wobbly, delay: 0.1 }}>
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent opacity-50" />
              <span className="relative flex size-20 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_20px_40px_-14px_var(--accent)]">
                <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.35, ease: EASE_OUT }} />
                </svg>
              </span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE_OUT }} className="mt-5 text-[26px] font-medium leading-tight tracking-[-0.03em]">
              {t('brief.success.title')}
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-1.5 text-[14px] text-ink-2">
              {t('brief.success.body', { name: designer?.name ?? '', id: sent.jobId })}
            </motion.p>

            {designer && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-5 flex items-center gap-3 rounded-[20px] bg-[var(--surface-2)] p-3 text-left">
                <div className="relative">
                  <Avatar seed={designer.avatarSeed} media={designer.avatar} size={44} />
                  {typing && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 items-center gap-0.5 rounded-full bg-[var(--surface)] px-1 shadow">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="size-1 rounded-full bg-ink-3" animate={{ y: [0, -2, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                      ))}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{designer.name}</div>
                  <div className="flex items-center gap-1 text-[12.5px] text-ink-3">
                    <Clock className="size-3.5" />
                    {t('brief.success.replies', { name: first, count: designer.responseTimeHrs })}
                  </div>
                </div>
              </motion.div>
            )}

            <ol className="mt-4 flex flex-col gap-2 text-left">
              {steps.map((s, i) => (
                <motion.li key={s.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.1 }} className="flex items-center gap-3">
                  <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-500', s.done ? 'bg-accent text-accent-ink' : 'bg-[var(--surface-3)] text-ink-3')}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {s.done ? (
                        <motion.span key="d" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy}>
                          {i === 2 ? <CheckCheck className="size-4" /> : <Check className="size-4" />}
                        </motion.span>
                      ) : (
                        <motion.span key="w" className="size-2 rounded-full bg-current" animate={s.active ? { scale: [1, 1.6, 1] } : { opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className={cn('text-[13.5px] transition-colors', s.done ? 'font-medium text-ink' : 'text-ink-3')}>{s.label}</span>
                </motion.li>
              ))}
            </ol>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }} className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button size="lg" icon={<ArrowUpRight className="size-4" />} onClick={() => navigate(`/jobs/${sent.jobId}`)}>
                {t('brief.success.openJob')}
              </Button>
              <Button size="lg" variant="glass" icon={<MessageCircle className="size-4" />} onClick={() => navigate(`/messages/${sent.conversationId}`)}>
                {t('brief.success.chat')}
              </Button>
            </motion.div>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} type="button" onClick={onAnother} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink">
              <PenLine className="size-3.5" />
              {t('brief.success.another')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
