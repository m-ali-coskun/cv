import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BellOff, BellRing, Check, CheckCheck, Circle, Filter, MoonStar, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import { differenceInCalendarDays, isToday } from 'date-fns'
import { cn } from '@/lib/cn'
import { EASE_IOS, EASE_OUT, spring } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { fireStars } from '@/lib/confetti'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyNotifications } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import type { AppNotification } from '@/store/types'
import { Drawer } from '../ui/Overlay'
import { Avatar } from '../ui/Avatar'
import { Button, IconButton } from '../ui/Button'
import { Segmented } from '../ui/Segmented'
import { EmptyState } from '../ui/EmptyState'
import { AnimatedCounter } from '../ui/AnimatedCounter'
import { PreferenceEffects } from '@/features/settings/lib/PreferenceEffects'
import { GROUP_META, KIND_COLOR, KIND_GROUP, KIND_ICON, NOTIF_GROUPS, type NotifGroup } from '@/features/settings/lib/notifMeta'
import { usePrefs } from '@/features/settings/lib/prefs'
import { sendTestNotification } from '@/features/settings/lib/demo'

type Bucket = 'today' | 'week' | 'earlier'

const byDateDesc = (a: AppNotification, b: AppNotification) => b.createdAt.localeCompare(a.createdAt)

function bucketOf(iso: string): Bucket {
  const d = new Date(iso)
  if (isToday(d)) return 'today'
  return differenceInCalendarDays(new Date(), d) < 7 ? 'week' : 'earlier'
}

function patchNotifications(fn: (list: AppNotification[]) => AppNotification[]) {
  useApp.setState((s) => ({ notifications: fn(s.notifications) }))
}

/** Avatar for the actor: brand tile for clients, illustrated avatar for people, kind icon otherwise. */
function ActorAvatar({ n }: { n: AppNotification }) {
  const client = useApp((s) => (n.actorAvatarSeed ? s.clients.find((c) => c.avatarSeed === n.actorAvatarSeed) : undefined))
  const designer = useApp((s) => (n.actorAvatarSeed ? s.designers.find((d) => d.avatarSeed === n.actorAvatarSeed) : undefined))
  const Icon = KIND_ICON[n.kind]
  const color = KIND_COLOR[n.kind]
  if (!n.actorAvatarSeed)
    return (
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-[15px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
        style={{ background: `linear-gradient(150deg, ${color}, color-mix(in oklab, ${color} 62%, #000))` }}
      >
        <Icon className="size-5" />
      </span>
    )
  return (
    <span className="relative shrink-0">
      {client ? (
        <Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} size={44} />
      ) : (
        <Avatar seed={n.actorAvatarSeed} media={designer?.avatar} size={44} />
      )}
      <span
        className="absolute -bottom-1 -right-1 flex size-[22px] items-center justify-center rounded-full border-2 border-[var(--surface)] text-white"
        style={{ background: color }}
      >
        <Icon className="size-3" />
      </span>
    </span>
  )
}

function NotificationItem({ n, index, onOpen }: { n: AppNotification; index: number; onOpen: (n: AppNotification) => void }) {
  const t = useT()
  const lang = useLang()
  const dragged = useRef(false)

  const toggleRead = () => patchNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)))
  const dismiss = () => {
    const snapshot = n
    patchNotifications((list) => list.filter((x) => x.id !== n.id))
    toast({
      title: t('settings.notif.dismissed'),
      tone: 'info',
      duration: 3500,
      action: { label: t('core.toast.undo'), onClick: () => patchNotifications((list) => [...list, snapshot].sort(byDateDesc)) },
    })
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE_OUT, delay: Math.min(index, 8) * 0.035 } }}
      exit={{ opacity: 0, x: -120, scale: 0.94, transition: { duration: 0.24, ease: EASE_IOS } }}
      transition={spring.smooth}
      className="group relative"
    >
      {/* swipe reveal */}
      <div className="absolute inset-0 flex items-center justify-end rounded-[22px] bg-danger pr-5 text-white">
        <Trash2 className="size-5" />
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0.05 }}
        dragSnapToOrigin
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -110 || info.velocity.x < -650) dismiss()
          window.setTimeout(() => (dragged.current = false), 0)
        }}
        whileTap={{ scale: 0.985 }}
        onClick={() => !dragged.current && onOpen(n)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(n))}
        className={cn(
          'relative flex cursor-pointer gap-3 rounded-[22px] border p-3 pr-4 outline-none transition-[background-color,border-color,box-shadow] duration-300 focus-visible:ring-4 focus-visible:ring-[var(--accent-softer)]',
          n.read
            ? 'border-line bg-[var(--surface)] hover:shadow-[0_12px_30px_-20px_rgba(0,0,0,.35)]'
            : 'border-[var(--accent-line)] bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))] shadow-[0_10px_30px_-22px_var(--accent)]',
        )}
      >
        <ActorAvatar n={n} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={cn('min-w-0 flex-1 text-[14px] leading-snug tracking-[-0.01em] text-ink', n.read ? 'font-normal' : 'font-medium')}>{n.title}</p>
            <AnimatePresence>
              {!n.read && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy} className="relative mt-1.5 flex size-2.5 shrink-0 group-hover:opacity-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-accent ring-2 ring-[var(--surface)]" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">{n.body}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-3">{timeAgo(n.createdAt, lang)}</span>
            <span className="size-1 rounded-full bg-ink-4" />
            <span className="text-[11px] font-medium" style={{ color: `color-mix(in oklab, ${KIND_COLOR[n.kind]} 75%, var(--ink))` }}>
              {t(`settings.notif.group.${KIND_GROUP[n.kind]}`)}
            </span>
          </div>
        </div>
        {/* hover actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [@media(hover:none)]:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleRead()
            }}
            title={n.read ? t('settings.notif.markUnread') : t('settings.notif.markRead')}
            aria-label={n.read ? t('settings.notif.markUnread') : t('settings.notif.markRead')}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 transition-colors hover:bg-ink hover:text-[var(--surface)]"
          >
            {n.read ? <Circle className="size-3.5" /> : <Check className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              dismiss()
            }}
            title={t('settings.notif.dismiss')}
            aria-label={t('settings.notif.dismiss')}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 transition-colors hover:bg-danger hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.li>
  )
}

/** Right-hand notifications drawer (bell in the top bar). */
export function NotificationsPanel() {
  const t = useT()
  const navigate = useNavigate()
  const open = useUI((s) => s.notificationsOpen)
  const setUI = useUI((s) => s.set)
  const close = useCallback(() => setUI({ notificationsOpen: false }), [setUI])
  const all = useMyNotifications()
  const markRead = useApp((s) => s.markNotificationRead)
  const markAll = useApp((s) => s.markAllNotificationsRead)
  const clearAll = useApp((s) => s.clearNotifications)
  const muted = usePrefs((s) => s.muted)
  const dnd = usePrefs((s) => s.dnd)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [kind, setKind] = useState<NotifGroup | null>(null)
  const markBtn = useRef<HTMLButtonElement>(null)

  const sorted = useMemo(() => [...all].sort(byDateDesc), [all])
  const unread = sorted.filter((n) => !n.read).length
  const counts = useMemo(() => {
    const c = Object.fromEntries(NOTIF_GROUPS.map((g) => [g, 0])) as Record<NotifGroup, number>
    for (const n of sorted) if (filter === 'all' || !n.read) c[KIND_GROUP[n.kind]]++
    return c
  }, [sorted, filter])
  const unreadByGroup = useMemo(() => {
    const c = Object.fromEntries(NOTIF_GROUPS.map((g) => [g, 0])) as Record<NotifGroup, number>
    for (const n of sorted) if (!n.read) c[KIND_GROUP[n.kind]]++
    return c
  }, [sorted])
  const visible = useMemo(() => sorted.filter((n) => (filter === 'all' || !n.read) && (!kind || KIND_GROUP[n.kind] === kind)), [sorted, filter, kind])
  const buckets = useMemo(() => {
    const out: { id: Bucket; items: AppNotification[] }[] = [
      { id: 'today', items: [] },
      { id: 'week', items: [] },
      { id: 'earlier', items: [] },
    ]
    for (const n of visible) out.find((b) => b.id === bucketOf(n.createdAt))!.items.push(n)
    return out.filter((b) => b.items.length)
  }, [visible])
  const mutedCount = NOTIF_GROUPS.filter((g) => muted[g]).length

  const openItem = (n: AppNotification) => {
    markRead(n.id)
    close()
    if (n.link) navigate(n.link)
  }

  const onMarkAll = () => {
    if (!unread) return
    markAll()
    fireStars({ from: markBtn.current })
  }

  const onClearAll = () => {
    const snapshot = all
    if (!snapshot.length) return
    clearAll()
    toast({
      title: t('settings.notif.cleared', { count: snapshot.length }),
      tone: 'info',
      action: { label: t('core.toast.undo'), onClick: () => patchNotifications((list) => [...list, ...snapshot].sort(byDateDesc)) },
    })
  }

  const header = (
    <div className="relative z-[1] border-b border-line px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-center gap-3">
        <motion.span
          className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_10px_24px_-12px_var(--accent)]"
          animate={unread ? { rotate: [0, -16, 14, -8, 4, 0] } : { rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
        >
          {dnd ? <MoonStar className="size-5" /> : <BellRing className="size-5" />}
        </motion.span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-medium leading-tight tracking-[-0.02em] text-ink">{t('core.notifications.title')}</h2>
          <p className="flex items-center gap-1 text-[12.5px] text-ink-3">
            <AnimatedCounter value={unread} startOnView={false} className="font-mono text-ink-2" />
            <span>{t('settings.notif.unreadOf', { total: sorted.length })}</span>
          </p>
        </div>
        <IconButton
          label={t('settings.notif.settings')}
          variant="soft"
          size="sm"
          onClick={() => {
            close()
            navigate('/settings?section=notifications')
          }}
        >
          <Settings2 className="size-4" />
        </IconButton>
        <IconButton label={t('core.action.close')} variant="soft" size="sm" onClick={close}>
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Segmented<'all' | 'unread'>
          size="sm"
          value={filter}
          onChange={setFilter}
          layoutId="notif-filter"
          options={[
            { value: 'all', label: t('core.common.all'), count: sorted.length },
            { value: 'unread', label: t('settings.notif.unread'), count: unread },
          ]}
        />
        <div className="flex items-center gap-1">
          <Button ref={markBtn} size="xs" variant="ghost" disabled={!unread} onClick={onMarkAll} icon={<CheckCheck className="size-3.5" />} title={t('core.action.markAllRead')}>
            <span className="hidden sm:inline">{t('settings.notif.readAll')}</span>
          </Button>
          <Button size="xs" variant="ghost" disabled={!sorted.length} onClick={onClearAll} icon={<Trash2 className="size-3.5" />} title={t('core.action.clearAll')}>
            <span className="hidden sm:inline">{t('core.action.clearAll')}</span>
          </Button>
        </div>
      </div>

      <div className="mask-fade-x -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 no-scrollbar sm:-mx-5 sm:px-5">
        {NOTIF_GROUPS.map((g) => {
          const on = kind === g
          const m = GROUP_META[g]
          return (
            <motion.button
              key={g}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setKind(on ? null : g)}
              className={cn(
                'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                on ? 'border-transparent text-white' : 'border-line-2 text-ink-2 hover:text-ink',
                muted[g] && !on && 'opacity-60',
              )}
            >
              {on && <motion.span layoutId="notif-kind" className="absolute inset-0 rounded-full" style={{ background: m.color }} transition={spring.pill} />}
              <m.icon className="relative size-3.5" style={on ? undefined : { color: m.color }} />
              <span className="relative">{t(`settings.notif.group.${g}`)}</span>
              <span className={cn('relative font-mono text-[10.5px]', on ? 'text-white/80' : 'text-ink-4')}>{counts[g]}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <PreferenceEffects />
      <Drawer open={open} onClose={close} width={460} header={header}>
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-3 sm:px-4">
            {/* AI digest */}
            <AnimatePresence initial={false}>
              {unread > 0 && filter === 'all' && !kind && (
                <motion.div
                  initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                  exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="glass-night relative mb-3 overflow-hidden rounded-[22px] p-4">
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-accent opacity-25 blur-2xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 5, repeat: Infinity }}
                    />
                    <div className="relative flex items-center gap-2">
                      <Sparkles className="size-4 text-accent" />
                      <span className="text-[13px] font-medium">{t('core.ai.name')}</span>
                      <span className="ml-auto font-mono text-[11px] text-on-night/50">{t('settings.notif.digestKicker')}</span>
                    </div>
                    <p className="relative mt-2 text-[15px] font-medium leading-snug tracking-[-0.01em]">{t('settings.notif.digest', { count: unread })}</p>
                    <div className="relative mt-3 flex flex-wrap gap-1.5">
                      {NOTIF_GROUPS.filter((g) => unreadByGroup[g]).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setKind(g)
                            setFilter('unread')
                          }}
                          className="flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[12px] text-on-night/90 transition-colors hover:bg-white/20"
                        >
                          <span className="size-1.5 rounded-full" style={{ background: GROUP_META[g].color }} />
                          {t(`settings.notif.group.${g}`)}
                          <span className="font-mono text-on-night/60">{unreadByGroup[g]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {sorted.length === 0 ? (
              <EmptyState
                icon={<BellOff />}
                title={t('core.notifications.empty')}
                description={t('core.notifications.emptyHint')}
                action={
                  <Button size="sm" variant="glass" icon={<Send className="size-3.5" />} onClick={sendTestNotification}>
                    {t('settings.notifications.sendTest')}
                  </Button>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={filter === 'unread' && !kind ? <CheckCheck /> : <Filter />}
                title={filter === 'unread' && !kind ? t('core.notifications.empty') : t('settings.notif.noneFiltered')}
                description={t('settings.notif.noneFilteredHint')}
                action={
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => {
                      setFilter('all')
                      setKind(null)
                    }}
                  >
                    {t('settings.notif.showAll')}
                  </Button>
                }
              />
            ) : (
              buckets.map((b) => (
                <section key={b.id} className="mb-2">
                  <h3 className="sticky top-0 z-[2] -mx-1 mb-2 flex items-center justify-between rounded-[12px] bg-[color-mix(in_oklab,var(--glass-bg)_80%,transparent)] px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3 backdrop-blur-md">
                    <span>{b.id === 'today' ? t('core.common.today') : t(`settings.notif.${b.id}`)}</span>
                    <span className="font-mono text-[10.5px] font-normal text-ink-4">{b.items.length}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {b.items.map((n, i) => (
                        <NotificationItem key={n.id} n={n} index={i} onOpen={openItem} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="relative z-[1] flex items-center justify-between gap-2 border-t border-line px-4 py-3 safe-bottom">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-ink-3">
              {dnd ? (
                <>
                  <MoonStar className="size-3.5 shrink-0" /> {t('settings.notifications.dndOn')}
                </>
              ) : mutedCount ? (
                <>
                  <BellOff className="size-3.5 shrink-0" /> {t('settings.notif.mutedCount', { count: mutedCount })}
                </>
              ) : (
                <span className="hidden sm:inline">{t('settings.notif.swipeHint')}</span>
              )}
            </span>
            <Button size="xs" variant="soft" icon={<Send className="size-3" />} onClick={sendTestNotification}>
              {t('settings.notif.test')}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
