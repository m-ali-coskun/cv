import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, ArchiveRestore, BadgeCheck, BellOff, ChevronLeft, ChevronRight, MoreHorizontal, PanelRight, Phone, Pin, PinOff, Search, Volume2 } from 'lucide-react'
import { EASE_OUT, spring } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import type { ConversationView } from '@/store/selectors'
import type { Job } from '@/store/types'
import { StatusBadge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { Tooltip } from '@/components/ui/Tooltip'
import { disciplineTheme } from '@/theme/disciplines'
import { isDesignerP, personLine, type Presence } from './model'
import { PersonAvatar, POPOVER_SURFACE, TypingDots } from './ui'

export function ThreadHeader({
  view,
  presence,
  typing,
  lastFromThem,
  jobs,
  onBack,
  searchOpen,
  onSearch,
  onCall,
  infoActive,
  onToggleInfo,
}: {
  view: ConversationView
  presence: Presence
  typing: boolean
  lastFromThem?: string
  jobs: Job[]
  onBack?: () => void
  searchOpen: boolean
  onSearch: () => void
  onCall: () => void
  infoActive: boolean
  onToggleInfo: () => void
}) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const togglePin = useApp((s) => s.togglePinConversation)
  const toggleMute = useApp((s) => s.toggleMuteConversation)
  const toggleArchive = useApp((s) => s.toggleArchiveConversation)
  const c = view.conversation
  const p = view.counterpart
  const verified = !!p && p.verified

  const status = typing ? (
    <span className="flex items-center gap-1.5 font-medium text-accent-text">
      <TypingDots size={4} dot="bg-current" />
      {t('messages.typing')}
    </span>
  ) : presence === 'online' ? (
    <span className="flex items-center gap-1.5 text-success">
      <span className="relative flex size-1.5">
        <span className="msg-anim absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
        <span className="relative size-1.5 rounded-full bg-success" />
      </span>
      {t('messages.status.online')}
    </span>
  ) : presence === 'away' ? (
    <span className="text-warning">{t('messages.status.away')}</span>
  ) : (
    <span>{lastFromThem ? t('messages.status.lastSeen', { when: timeAgo(lastFromThem, lang) }) : t('messages.status.offline')}</span>
  )

  return (
    <div className="relative z-[6] border-b border-[var(--line)]">
      <div className="flex items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        {onBack && (
          <IconButton label={t('messages.action.back')} variant="ghost" onClick={onBack} className="-ml-1 md:hidden">
            <ChevronLeft className="size-5.5" />
          </IconButton>
        )}
        <button type="button" onClick={onToggleInfo} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
          <motion.span className="shrink-0" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
            <PersonAvatar person={p} size={44} status={presence === 'offline' ? undefined : presence} />
          </motion.span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-medium tracking-[-0.02em] group-hover:underline group-hover:decoration-[var(--line-2)] group-hover:underline-offset-4">{p?.name}</span>
              {verified && <BadgeCheck className="size-4 shrink-0 fill-accent text-accent-ink" />}
              {c.muted && <BellOff className="size-3.5 shrink-0 text-ink-3" />}
              {c.pinned && <Pin className="size-3.5 shrink-0 text-ink-3" />}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={typing ? 'typing' : presence}
                  initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="shrink-0"
                >
                  {status}
                </motion.span>
              </AnimatePresence>
              <span className="hidden truncate @xl:inline">· {isDesignerP(p) ? p.headline : personLine(p)}</span>
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden @sm:inline-flex">
            <IconButton label={t('messages.thread.search')} variant={searchOpen ? 'primary' : 'ghost'} size="md" onClick={onSearch} className="max-sm:size-9">
              <Search className="size-[18px]" />
            </IconButton>
          </span>
          <span className="hidden items-center gap-1 @2xl:flex">
            <Tooltip content={c.pinned ? t('messages.action.unpin') : t('messages.action.pin')} side="bottom">
              <IconButton label={c.pinned ? t('messages.action.unpin') : t('messages.action.pin')} variant={c.pinned ? 'soft' : 'ghost'} onClick={() => togglePin(c.id)}>
                <motion.span key={String(c.pinned)} initial={{ rotate: -45, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={spring.bouncy}>
                  {c.pinned ? <PinOff className="size-[18px]" /> : <Pin className="size-[18px]" />}
                </motion.span>
              </IconButton>
            </Tooltip>
            <Tooltip content={c.muted ? t('messages.action.unmute') : t('messages.action.mute')} side="bottom">
              <IconButton label={c.muted ? t('messages.action.unmute') : t('messages.action.mute')} variant={c.muted ? 'soft' : 'ghost'} onClick={() => toggleMute(c.id)}>
                <motion.span key={String(c.muted)} initial={{ y: -6, scale: 0.6 }} animate={{ y: 0, scale: 1 }} transition={spring.bouncy}>
                  {c.muted ? <Volume2 className="size-[18px]" /> : <BellOff className="size-[18px]" />}
                </motion.span>
              </IconButton>
            </Tooltip>
            <Tooltip content={c.archived ? t('messages.action.unarchive') : t('messages.action.archive')} side="bottom">
              <IconButton label={c.archived ? t('messages.action.unarchive') : t('messages.action.archive')} variant="ghost" onClick={() => toggleArchive(c.id)}>
                {c.archived ? <ArchiveRestore className="size-[18px]" /> : <Archive className="size-[18px]" />}
              </IconButton>
            </Tooltip>
          </span>
          <IconButton label={t('messages.thread.call')} variant="soft" onClick={onCall} className="max-sm:size-9">
            <Phone className="size-[18px]" />
          </IconButton>
          <span className="hidden @md:inline-flex">
            <IconButton label={t('messages.thread.info')} variant={infoActive ? 'primary' : 'ghost'} onClick={onToggleInfo}>
              <PanelRight className="size-[18px]" />
            </IconButton>
          </span>
          <span className="@2xl:hidden">
            <Menu
              width={220}
              className={POPOVER_SURFACE}
              trigger={({ onClick }) => (
                <IconButton label={t('messages.list.more')} variant="ghost" onClick={onClick} className="max-sm:size-9">
                  <MoreHorizontal className="size-[18px]" />
                </IconButton>
              )}
              items={[
                { label: t('messages.thread.search'), icon: <Search />, onClick: onSearch, active: searchOpen },
                { label: c.pinned ? t('messages.action.unpin') : t('messages.action.pin'), icon: c.pinned ? <PinOff /> : <Pin />, onClick: () => togglePin(c.id) },
                { label: c.muted ? t('messages.action.unmute') : t('messages.action.mute'), icon: c.muted ? <Volume2 /> : <BellOff />, onClick: () => toggleMute(c.id) },
                { label: c.archived ? t('messages.action.unarchive') : t('messages.action.archive'), icon: c.archived ? <ArchiveRestore /> : <Archive />, onClick: () => toggleArchive(c.id) },
                { divider: true, label: '' },
                { label: t('messages.thread.info'), icon: <PanelRight />, onClick: onToggleInfo },
              ]}
            />
          </span>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="no-scrollbar mask-fade-x flex gap-1.5 overflow-x-auto px-3 pb-2.5 sm:px-4">
          {jobs.map((j, i) => {
            const d = disciplineTheme(j.discipline)
            return (
              <motion.button
                key={j.id}
                type="button"
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.1 + i * 0.05, duration: 0.45, ease: EASE_OUT } }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(`/jobs/${j.id}`)}
                className="group flex h-8 max-w-[300px] shrink-0 items-center gap-2 rounded-full bg-[var(--surface-2)] pl-1 pr-2 text-[12px] transition-colors hover:bg-[var(--surface-3)]"
                title={j.title}
              >
                <span className="flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--surface)] px-2 font-mono text-[10.5px] font-medium">
                  <span className="size-1.5 rounded-full" style={{ background: d.accent }} />
                  {j.id}
                </span>
                <span className="truncate font-medium text-ink-2">{j.title}</span>
                <StatusBadge status={j.status} size="xs" />
                <ChevronRight className="size-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
