import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Bell, Briefcase, Compass, Heart, Inbox, MessagesSquare, PanelLeftClose, PlayCircle, Send, ShieldAlert, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { spring } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_CLIENT_ID, ME_DESIGNER_ID, ME_NAME, type Role } from '@/store/types'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { LogoMark } from '@/components/layout/Logo'
import { openWelcomeTour } from '@/components/onboarding/openWelcome'
import { replayMatch, sendTestNotification, simulateIncomingRequest } from '../lib/demo'
import { Divider, GroupLabel, OptionCard, SectionHeader, SettingRow, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

function useRoleStats() {
  const jobs = useApp((s) => s.jobs)
  const notifications = useApp((s) => s.notifications)
  const conversations = useApp((s) => s.conversations)
  return useMemo(() => {
    const stat = (role: Role) => {
      const me = role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID
      const mine = jobs.filter((j) => (role === 'client' ? j.clientId === me : j.designerId === me))
      return {
        active: mine.filter((j) => !['approved', 'declined', 'cancelled'].includes(j.status)).length,
        requests: mine.filter((j) => j.status === 'requested').length,
        unread: notifications.filter((n) => n.role === role && !n.read).length,
        chats: conversations.filter((c) => (role === 'client' ? c.clientId === me : c.designerId === me) && !c.archived).length,
      }
    }
    return { client: stat('client'), designer: stat('designer') }
  }, [jobs, notifications, conversations])
}

export function WorkspaceSection() {
  const t = useT()
  const navigate = useNavigate()
  const role = useApp((s) => s.settings.role)
  const setRole = useApp((s) => s.setRole)
  const ai = useApp((s) => s.settings.aiAssistant)
  const collapsed = useApp((s) => s.settings.sidebarCollapsed)
  const setSettings = useApp((s) => s.setSettings)
  const client = useApp((s) => s.clients.find((c) => c.id === ME_CLIENT_ID))
  const designers = useApp((s) => s.designers)
  const me = designers.find((d) => d.id === ME_DESIGNER_ID)
  const stats = useRoleStats()
  const meta = SECTIONS.find((s) => s.id === 'workspace')!
  const roleFlash = useFlash('role')
  const demoFlash = useFlash('demo')
  const designerSeeds = useMemo(() => designers.filter((d) => d.id !== ME_DESIGNER_ID).slice(0, 4).map((d) => d.avatarSeed), [designers])

  const switchTo = (r: Role) => {
    if (r !== role) {
      setRole(r)
      toast({ title: t('core.role.switchedTo', { role: t(`core.role.${r}`) }), tone: 'success' })
    }
    navigate('/overview')
  }

  const roles: { id: Role; title: string; name: string; perks: string[]; stat: (typeof stats)['client'] }[] = [
    {
      id: 'client',
      title: t('core.role.clientWorkspace'),
      name: client?.name ?? 'Northlight Studio',
      perks: [t('settings.workspace.client.p1'), t('settings.workspace.client.p2'), t('settings.workspace.client.p3')],
      stat: stats.client,
    },
    {
      id: 'designer',
      title: t('core.role.designerStudio'),
      name: me?.name ?? ME_NAME,
      perks: [t('settings.workspace.designer.p1'), t('settings.workspace.designer.p2'), t('settings.workspace.designer.p3')],
      stat: stats.designer,
    },
  ]

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.workspace')} description={t('settings.workspace.desc')} />

      <SettingsCard>
        <motion.div ref={roleFlash.ref} animate={roleFlash.controls} id="set-role" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel>{t('settings.workspace.role')}</GroupLabel>
          <div className="grid gap-3 md:grid-cols-2" role="radiogroup">
            {roles.map((r) => {
              const selected = r.id === role
              return (
                <OptionCard key={r.id} selected={selected} onClick={() => switchTo(r.id)}>
                  <div className="flex flex-col gap-4 p-4 sm:p-5">
                    <div className="flex items-center gap-3 pr-10">
                      {r.id === 'client' ? (
                        <Avatar kind="brand" name={r.name} color={client?.logoColor} seed={client?.avatarSeed ?? 'northlight'} size={48} />
                      ) : (
                        <Avatar seed="ali" media={me?.avatar} size={48} status="online" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[16px] font-medium tracking-[-0.02em] text-ink">{r.title}</p>
                        <p className="truncate text-[12.5px] text-ink-3">{r.name}</p>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {r.perks.map((p, i) => (
                        <motion.li
                          key={p}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i + 0.1 }}
                          className="flex items-center gap-2 text-[13px] text-ink-2"
                        >
                          <span className={cn('size-1.5 shrink-0 rounded-full', selected ? 'bg-accent' : 'bg-ink-4')} />
                          {p}
                        </motion.li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Briefcase, label: t('settings.workspace.stat.active'), value: r.stat.active },
                        { icon: r.id === 'client' ? MessagesSquare : Inbox, label: r.id === 'client' ? t('settings.workspace.stat.chats') : t('settings.workspace.stat.requests'), value: r.id === 'client' ? r.stat.chats : r.stat.requests },
                        { icon: Bell, label: t('settings.workspace.stat.unread'), value: r.stat.unread },
                      ].map((s) => (
                        <div key={s.label} className="rounded-[14px] bg-[var(--surface-2)] px-3 py-2">
                          <s.icon className="size-3.5 text-ink-3" />
                          <p className="mt-1 font-mono text-[17px] font-medium leading-none text-ink">{s.value}</p>
                          <p className="mt-0.5 truncate text-[11px] text-ink-3">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      {r.id === 'client' ? <AvatarStack seeds={designerSeeds} size={24} /> : <span className="text-[12px] text-ink-3">@ali.studio</span>}
                      <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium', selected ? 'text-accent-text' : 'text-ink-2')}>
                        {selected ? t('settings.workspace.current') : t('settings.workspace.switch')}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </OptionCard>
              )
            })}
          </div>
        </motion.div>
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <SettingsCard spotlight className="overflow-hidden">
          <div className="relative z-[1] flex h-full flex-col gap-4">
            <div className="flex items-center gap-4">
              <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <LogoMark size={56} />
              </motion.span>
              <div className="min-w-0">
                <p id="set-tour" className="text-[16px] font-medium tracking-[-0.02em] text-ink">
                  {t('settings.workspace.tour')}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{t('settings.workspace.tourDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['hero', 'how', 'disc', 'role'] as const).map((k, i) => (
                <motion.button
                  key={k}
                  type="button"
                  onClick={openWelcomeTour}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.smooth, delay: 0.05 * i }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 rounded-[14px] bg-[var(--surface-2)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-3)]"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] font-mono text-[10.5px] text-ink-2">{i + 1}</span>
                  <span className="truncate text-[12.5px] font-medium text-ink">{t(`onboarding.step.${k}`)}</span>
                </motion.button>
              ))}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button icon={<PlayCircle className="size-4" />} onClick={openWelcomeTour}>
                {t('settings.workspace.tourCta')}
              </Button>
              <Button variant="ghost" icon={<Compass className="size-4" />} onClick={() => navigate('/discover')}>
                {t('core.nav.discover')}
              </Button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard>
          <SettingRow
            id="ai"
            icon={Sparkles}
            color="#9B6BFF"
            title={t('settings.workspace.ai')}
            description={t('settings.workspace.aiDesc')}
            control={<Toggle checked={ai} onChange={(v) => setSettings({ aiAssistant: v })} label={t('settings.workspace.ai')} />}
          />
          <motion.div
            animate={{ opacity: ai ? 1 : 0.45, filter: ai ? 'grayscale(0)' : 'grayscale(1)' }}
            className="relative z-[1] mt-1 grid gap-2 sm:grid-cols-3"
          >
            {[
              { icon: ShieldAlert, text: t('settings.workspace.ai.p1') },
              { icon: Wand2, text: t('settings.workspace.ai.p2') },
              { icon: Sparkles, text: t('settings.workspace.ai.p3') },
            ].map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.smooth, delay: 0.05 * i }}
                className="glass-night flex items-start gap-2 rounded-[16px] p-3"
              >
                <p.icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span className="text-[12px] leading-snug text-on-night/80">{p.text}</span>
              </motion.div>
            ))}
          </motion.div>
          <Divider className="mt-3" />
          <SettingRow
            id="sidebar"
            icon={PanelLeftClose}
            color="#64748B"
            title={t('settings.workspace.sidebar')}
            description={t('settings.workspace.sidebarDesc')}
            control={<Toggle checked={collapsed} onChange={(v) => setSettings({ sidebarCollapsed: v })} label={t('settings.workspace.sidebar')} />}
          />
        </SettingsCard>
      </div>

      <SettingsCard variant="night" className="overflow-hidden">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-20 size-64 rounded-full bg-accent opacity-25 blur-3xl"
          animate={{ x: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div ref={demoFlash.ref} animate={demoFlash.controls} id="set-demo" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <div className="mb-4 flex items-center gap-2">
            <Wand2 className="size-4 text-accent" />
            <p className="text-[16px] font-medium">{t('settings.workspace.demo')}</p>
          </div>
          <p className="-mt-2 mb-4 max-w-xl text-[12.5px] text-on-night/65">{t('settings.workspace.demoDesc')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { icon: Inbox, label: t('settings.demo.request'), desc: t('settings.demo.requestDesc'), run: () => simulateIncomingRequest(t, navigate) },
              { icon: Send, label: t('settings.notifications.sendTest'), desc: t('settings.demo.notifDesc'), run: sendTestNotification },
              { icon: Heart, label: t('settings.demo.match'), desc: t('settings.demo.matchDesc'), run: () => replayMatch(t) },
            ].map((a) => (
              <motion.button
                key={a.label}
                type="button"
                onClick={a.run}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                className="group flex items-start gap-3 rounded-[18px] bg-white/[0.06] p-3.5 text-left transition-colors hover:bg-white/[0.1]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-accent text-accent-ink transition-transform group-hover:rotate-[-8deg] group-hover:scale-110">
                  <a.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">{a.label}</span>
                  <span className="block text-[11.5px] leading-snug text-on-night/55">{a.desc}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </SettingsCard>
    </>
  )
}
