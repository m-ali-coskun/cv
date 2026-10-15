import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Check, Compass, Copy, Heart, MessageCircle, Sparkles, UserPlus, Inbox } from 'lucide-react'
import { EASE_OUT, item, spring, stagger, FILTER_TWEEN } from '@/lib/motion'
import { fireConfetti, fireSideCannons } from '@/lib/confetti'
import { formatMoney } from '@/lib/format'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, type Designer } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { personOf } from '@/features/discover/model'
import { DiscoverCardPreview } from '../shared/DiscoverPreview'

/** "Your profile is live" — confetti, the real Discover card and where to go next. */
export function Success({ designer: d, onAnother }: { designer: Designer; onAnother: () => void }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const setRole = useApp((s) => s.setRole)
  const setDiscipline = useApp((s) => s.setDiscipline)
  const clients = useApp((s) => s.clients)
  const live = useApp((s) => s.designers.find((x) => x.id === d.id)) ?? d
  const head = useRef<HTMLHeadingElement>(null)

  const fit = useMemo(() => {
    const others = clients.filter((c) => c.id !== ME_CLIENT_ID)
    const hiring = others.filter((c) => c.disciplinesNeeded.some((x) => d.disciplines.includes(x)))
    const briefs = others.flatMap((c) => c.openBriefs).filter((b) => d.disciplines.includes(b.discipline))
    return { hiring: hiring.length, briefs: briefs.length, budget: briefs.reduce((n, b) => n + b.budget, 0) }
  }, [clients, d.disciplines])

  useEffect(() => {
    const a = window.setTimeout(() => fireConfetti({ from: head.current, particleCount: 220 }), 250)
    const b = window.setTimeout(() => fireSideCannons(1300), 650)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])

  const seeDiscover = () => {
    setRole('client')
    setDiscipline('all')
    navigate('/discover?tab=new')
  }
  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(live.handle)
      toast({ title: t('core.action.copied'), description: live.handle, tone: 'success' })
    } catch {
      /* ignore */
    }
  }

  const title = t('profile.join.success.title')
  return (
    <Glass className="relative overflow-hidden p-0">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-[520px] rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
      <div className="relative z-[1] grid gap-10 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <motion.div variants={stagger(0.07, 0.15)} initial="hidden" animate="show" className="min-w-0">
          <motion.span variants={item} className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-[12.5px] font-semibold text-success">
            <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring.bouncy, delay: 0.3 }} className="flex size-4 items-center justify-center rounded-full bg-success text-white">
              <Check className="size-3" strokeWidth={3.5} />
            </motion.span>
            {t('profile.join.success.badge')}
          </motion.span>
          <h2 ref={head} className="mt-4 text-[40px] font-medium leading-[1] tracking-[-0.05em] sm:text-[60px]" aria-label={title}>
            {title.split('').map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="inline-block whitespace-pre"
                initial={{ opacity: 0, y: 40, rotate: 8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.2 + i * 0.03, type: 'spring', stiffness: 380, damping: 20, filter: FILTER_TWEEN }}
              >
                {ch}
              </motion.span>
            ))}
          </h2>
          <motion.p variants={item} className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
            {t('profile.join.success.text', { name: live.name.split(' ')[0] })}
          </motion.p>

          <motion.div variants={item} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-[20px] bg-night p-4 text-on-night">
              <div className="text-[12px] text-white/60">{t('profile.join.success.hiring')}</div>
              <div className="mt-1.5 text-[30px] font-medium leading-none tracking-[-0.03em]">
                <AnimatedCounter value={fit.hiring} />
              </div>
            </div>
            <div className="tile p-4">
              <div className="text-[12px] text-ink-3">{t('profile.join.success.briefs')}</div>
              <div className="mt-1.5 text-[30px] font-medium leading-none tracking-[-0.03em]">
                <AnimatedCounter value={fit.briefs} />
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-ink-3">{formatMoney(fit.budget, 'EUR', lang, true)}</div>
            </div>
            <button type="button" onClick={copyHandle} className="tile col-span-2 p-4 text-left transition-colors hover:bg-[var(--surface-3)] sm:col-span-1">
              <div className="flex items-center justify-between text-[12px] text-ink-3">
                {t('profile.join.success.handle')}
                <Copy className="size-3.5" />
              </div>
              <div className="mt-1.5 truncate font-mono text-[17px] font-medium">{live.handle}</div>
            </button>
          </motion.div>

          <motion.ol variants={stagger(0.08, 0.5)} className="mt-7 space-y-2.5">
            {[
              { icon: <Sparkles className="size-4" />, k: 'one' },
              { icon: <Heart className="size-4" />, k: 'two' },
              { icon: <MessageCircle className="size-4" />, k: 'three' },
            ].map((s, i) => (
              <motion.li key={s.k} variants={item} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">{s.icon}</span>
                <span className="min-w-0 text-[13.5px] text-ink-2">
                  <span className="mr-1.5 font-mono text-[11.5px] text-ink-3">0{i + 1}</span>
                  {t(`profile.join.success.next.${s.k}`)}
                </span>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-2.5">
            <Button size="lg" className="h-13" icon={<Compass className="size-4" />} iconRight={<ArrowRight className="size-4" />} onClick={seeDiscover}>
              {t('profile.join.success.discover')}
            </Button>
            <Button size="lg" variant="glass" className="h-13" icon={<UserPlus className="size-4" />} onClick={onAnother}>
              {t('profile.join.success.another')}
            </Button>
            <Button size="lg" variant="ghost" className="h-13" icon={<Inbox className="size-4" />} onClick={() => navigate(`/network/${live.id}`)}>
              {t('profile.join.success.profile')}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40, rotate: 4, scale: 0.9, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.35 }}>
          <DiscoverCardPreview person={personOf(live)} />
        </motion.div>
      </div>
    </Glass>
  )
}
