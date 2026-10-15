import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellRing, Inbox, Mail, MoonStar, Play, Send, Volume2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyNotifications } from '@/store/selectors'
import { useUI } from '@/store/ui'
import { Segmented } from '@/components/ui/Segmented'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Badge'
import { KIND_GROUP, NOTIF_GROUPS, GROUP_META, type NotifGroup } from '../lib/notifMeta'
import { usePrefs, type Digest } from '../lib/prefs'
import { playChime } from '../lib/sound'
import { sendTestNotification } from '../lib/demo'
import { Divider, GroupLabel, SectionHeader, SettingRow, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

export function NotificationsSection() {
  const t = useT()
  const push = useApp((s) => s.settings.notificationsPush)
  const email = useApp((s) => s.settings.notificationsEmail)
  const sound = useApp((s) => s.settings.sound)
  const setSettings = useApp((s) => s.setSettings)
  const muted = usePrefs((s) => s.muted)
  const dnd = usePrefs((s) => s.dnd)
  const digest = usePrefs((s) => s.digest)
  const setPrefs = usePrefs((s) => s.setPrefs)
  const setMuted = usePrefs((s) => s.setMuted)
  const notifications = useMyNotifications()
  const meta = SECTIONS.find((s) => s.id === 'notifications')!
  const kindsFlash = useFlash('kinds')

  const counts = useMemo(() => {
    const c = Object.fromEntries(NOTIF_GROUPS.map((g) => [g, 0])) as Record<NotifGroup, number>
    for (const n of notifications) c[KIND_GROUP[n.kind]]++
    return c
  }, [notifications])
  const unread = notifications.filter((n) => !n.read).length
  const activeGroups = NOTIF_GROUPS.filter((g) => !muted[g]).length

  return (
    <>
      <SectionHeader
        icon={meta.icon}
        color={meta.color}
        title={t('settings.nav.notifications')}
        description={t('settings.notifications.desc')}
        right={
          <Button size="sm" variant="glass" icon={<Inbox className="size-4" />} onClick={() => useUI.getState().set({ notificationsOpen: true })}>
            {t('settings.notifications.openInbox')}
            {unread > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-accent-ink">{unread}</span>}
          </Button>
        }
      />

      <SettingsCard>
        <GroupLabel>{t('settings.notifications.channels')}</GroupLabel>
        <SettingRow
          id="push"
          icon={BellRing}
          color="#FF9A00"
          title={t('settings.notifications.push')}
          description={t('settings.notifications.pushDesc')}
          control={<Toggle checked={push} onChange={(v) => setSettings({ notificationsPush: v })} label={t('settings.notifications.push')} />}
        />
        <Divider />
        <SettingRow
          id="email"
          icon={Mail}
          color="#3E8EF7"
          title={t('settings.notifications.email')}
          description={t('settings.notifications.emailDesc')}
          control={<Toggle checked={email} onChange={(v) => setSettings({ notificationsEmail: v })} label={t('settings.notifications.email')} />}
        >
          <AnimatePresence initial={false}>
            {email && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-wrap items-center gap-3 pl-0 sm:pl-[54px]">
                  <span className="text-[12.5px] text-ink-3">{t('settings.notifications.digest')}</span>
                  <Segmented<Digest>
                    size="sm"
                    value={digest}
                    onChange={(v) => setPrefs({ digest: v })}
                    options={(['instant', 'daily', 'weekly'] as const).map((v) => ({ value: v, label: t(`settings.notifications.digest.${v}`) }))}
                  />
                  <span className="font-mono text-[11.5px] text-ink-3">ali@designtab.app</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SettingRow>
        <Divider />
        <SettingRow
          id="sound"
          icon={Volume2}
          color="#2EE6C5"
          title={t('settings.notifications.sound')}
          description={t('settings.notifications.soundDesc')}
          control={
            <>
              <Button size="xs" variant="ghost" icon={<Play className="size-3" />} onClick={() => playChime('notify', 0.18)}>
                {t('settings.notifications.preview')}
              </Button>
              <Toggle
                checked={sound}
                onChange={(v) => {
                  setSettings({ sound: v })
                  if (v) playChime('success')
                }}
                label={t('settings.notifications.sound')}
              />
            </>
          }
        />
        <Divider />
        <SettingRow
          id="dnd"
          icon={MoonStar}
          color="#9B6BFF"
          title={t('settings.notifications.dnd')}
          description={t('settings.notifications.dndDesc')}
          control={
            <>
              <AnimatePresence>
                {dnd && (
                  <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                    <Pill tone="night" size="xs">
                      {t('settings.notifications.dndOn')}
                    </Pill>
                  </motion.span>
                )}
              </AnimatePresence>
              <Toggle checked={dnd} onChange={(v) => setPrefs({ dnd: v })} label={t('settings.notifications.dnd')} />
            </>
          }
        />
      </SettingsCard>

      <SettingsCard>
        <motion.div ref={kindsFlash.ref} animate={kindsFlash.controls} id="set-kinds" className="relative z-[1] -m-2 rounded-[22px] p-2">
          <GroupLabel right={<span className="font-mono text-[11.5px] text-ink-3">{activeGroups}/{NOTIF_GROUPS.length}</span>}>{t('settings.notifications.kinds')}</GroupLabel>
          <p className="-mt-1 mb-3 text-[12.5px] text-ink-3">{t('settings.notifications.kindsDesc')}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {NOTIF_GROUPS.map((g, i) => {
              const m = GROUP_META[g]
              const on = !muted[g]
              return (
                <motion.div
                  key={g}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.45, ease: EASE_OUT }}
                  className={cn('flex items-center gap-3 rounded-[18px] border p-3 transition-colors', on ? 'border-line bg-[var(--surface)]/60' : 'border-dashed border-line-2 bg-transparent')}
                >
                  <motion.span
                    animate={{ scale: on ? 1 : 0.9, opacity: on ? 1 : 0.5, rotate: on ? 0 : -8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex size-10 shrink-0 items-center justify-center rounded-[13px] text-white"
                    style={{ background: `linear-gradient(150deg, ${m.color}, color-mix(in oklab, ${m.color} 70%, #000))` }}
                  >
                    <m.icon className="size-[18px]" />
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[14px] font-medium', on ? 'text-ink' : 'text-ink-3')}>{t(`settings.notif.group.${g}`)}</p>
                    <p className="truncate text-[12px] text-ink-3">
                      {t(`settings.notifications.kind.${g}`)} · <span className="font-mono">{counts[g]}</span>
                    </p>
                  </div>
                  <Toggle size="sm" checked={on} onChange={(v) => setMuted(g, !v)} label={t(`settings.notif.group.${g}`)} />
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </SettingsCard>

      <SettingsCard variant="night" className="overflow-hidden">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-accent opacity-30 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center">
          <motion.span
            className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-accent text-accent-ink"
            animate={{ rotate: [0, -14, 12, -6, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2.5 }}
          >
            <BellRing className="size-5" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-medium">{t('settings.notifications.testTitle')}</p>
            <p className="mt-0.5 text-[12.5px] text-on-night/65">{t('settings.notifications.testDesc')}</p>
          </div>
          <Button variant="accent" icon={<Send className="size-4" />} onClick={sendTestNotification}>
            {t('settings.notifications.sendTest')}
          </Button>
        </div>
      </SettingsCard>
    </>
  )
}
