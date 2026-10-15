import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowRightLeft, Briefcase, Clock, Inbox, Mail, MessageCircle, Sparkles, Users, Zap } from 'lucide-react'
import { spring, stagger, item } from '@/lib/motion'
import { formatMoney } from '@/lib/format'
import { dueLabel } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useMe, useMyMatches } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { ME_DESIGNER_ID } from '@/store/types'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { FolderCard } from '@/components/ui/FolderCard'
import { Avatar } from '@/components/ui/Avatar'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

/** Designer role: briefs are written by clients — explain, link and offer a role switch. */
export function DesignerPanel() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const setRole = useApp((s) => s.setRole)
  const spawn = useApp((s) => s.spawnIncomingRequest)
  const jobs = useApp((s) => s.jobs)
  const clients = useApp((s) => s.clients)
  const me = useMe()
  const matches = useMyMatches()

  const requests = useMemo(() => jobs.filter((j) => j.designerId === ME_DESIGNER_ID && j.status === 'requested').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [jobs])
  const active = useMemo(() => jobs.filter((j) => j.designerId === ME_DESIGNER_ID && ['queued', 'in_progress', 'final_touches', 'in_review', 'revisions'].includes(j.status)).length, [jobs])
  const covers = requests.slice(0, 3).map((j) => j.cover)

  const simulate = () => {
    const job = spawn()
    if (job) {
      const c = clients.find((x) => x.id === job.clientId)
      toast({ title: t('brief.designerRole.simulated', { name: c?.name ?? '' }), description: job.title, tone: 'success', link: '/requests' })
    }
  }

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="flex flex-col gap-4">
      <Glass variant="card" spotlight className="relative overflow-hidden p-5 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]" />
        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div variants={item}>
            <Pill tone="night" icon={<Sparkles className="size-3.5" />}>
              {t('brief.designerRole.kicker')}
            </Pill>
            <h2 className="mt-4 text-balance text-[30px] font-medium leading-[1.05] tracking-[-0.035em] sm:text-[40px]">{t('brief.designerRole.title')}</h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{t('brief.designerRole.body')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="lg" icon={<Inbox className="size-4" />} onClick={() => navigate('/requests')}>
                {t('brief.designerRole.requests')}
                {requests.length > 0 && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-ink">{requests.length}</span>}
              </Button>
              <Button
                size="lg"
                variant="glass"
                icon={<ArrowRightLeft className="size-4" />}
                onClick={() => {
                  setRole('client')
                  toast({ title: t('brief.designerRole.switched'), description: me.client?.name, tone: 'success', duration: 2200 })
                }}
              >
                {t('brief.designerRole.switch')}
              </Button>
            </div>
            <div className="mt-7 grid max-w-lg grid-cols-3 gap-2">
              {[
                { icon: <Mail className="size-4" />, value: requests.length, label: t('brief.designerRole.open') },
                { icon: <Briefcase className="size-4" />, value: active, label: t('brief.designerRole.active') },
                { icon: <Users className="size-4" />, value: matches.length, label: t('brief.designerRole.clients') },
              ].map((s) => (
                <div key={s.label} className="tile p-3">
                  <div className="flex items-center gap-1.5 text-ink-3">{s.icon}</div>
                  <div className="mt-1 text-[26px] font-medium leading-none tracking-[-0.03em]">
                    <AnimatedCounter value={s.value} />
                  </div>
                  <div className="mt-1 truncate text-[11.5px] text-ink-3">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div variants={item} className="flex justify-center">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="w-full max-w-[290px]">
              <FolderCard
                title={t('brief.designerRole.folder')}
                subtitle={t('brief.designerRole.folderSub', { count: requests.length })}
                items={covers.length ? covers : [{ kind: 'art', seed: 'brief-a', variant: 'poster' }, { kind: 'art', seed: 'brief-b', variant: 'ui' }, { kind: 'art', seed: 'brief-c', variant: 'mesh' }]}
                icon={<Inbox className="text-white" />}
                onClick={() => navigate('/requests')}
              />
            </motion.div>
          </motion.div>
        </div>
      </Glass>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <motion.div variants={item} className="card p-5 sm:p-6">
          <h3 className="text-[18px] font-medium tracking-[-0.02em]">{t('brief.designerRole.howTitle')}</h3>
          <ol className="mt-4 flex flex-col gap-3">
            {[1, 2, 3].map((n, i) => (
              <motion.li key={n} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring.smooth, delay: 0.25 + i * 0.08 }} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[13px] font-semibold text-accent-ink">{n}</span>
                <div>
                  <div className="text-[14.5px] font-medium">{t(`brief.designerRole.how${n}`)}</div>
                  <p className="text-[13px] text-ink-3">{t(`brief.designerRole.how${n}Body`)}</p>
                </div>
              </motion.li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--surface-2)] p-3">
            <Zap className="size-4 text-[var(--accent-text)]" />
            <span className="min-w-0 flex-1 text-[13px] text-ink-2">{t('brief.designerRole.simHint')}</span>
            <Button size="sm" variant="soft" onClick={simulate}>
              {t('brief.designerRole.simulate')}
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-night rounded-[var(--radius-xl)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-medium tracking-[-0.02em]">{t('brief.designerRole.latest')}</h3>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/50">{requests.length}</span>
          </div>
          {requests.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <MessageCircle className="size-7 text-white/40" />
              <p className="text-[13.5px] text-white/70">{t('brief.designerRole.none')}</p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {requests.slice(0, 4).map((j, i) => {
                const c = clients.find((x) => x.id === j.clientId)
                return (
                  <motion.li key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                    <button type="button" onClick={() => navigate(`/jobs/${j.id}`)} className="group flex w-full items-center gap-3 rounded-2xl bg-white/[.06] p-2.5 text-left transition-colors hover:bg-white/[.12]">
                      {c ? <Avatar kind="brand" name={c.name} color={c.logoColor} seed={c.avatarSeed} size={36} /> : <DisciplineIcon id={j.discipline} size={36} />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{j.title}</div>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-white/55">
                          <span className="font-mono">{j.id}</span>·<Clock className="size-3" />
                          {dueLabel(j.dueAt, lang)}
                        </div>
                      </div>
                      <span className="font-mono text-[12.5px] text-accent">{formatMoney(j.budget, j.currency, lang, true)}</span>
                      <ArrowRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
