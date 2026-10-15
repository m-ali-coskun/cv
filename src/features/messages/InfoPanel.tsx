import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BadgeCheck, Bookmark, Briefcase, CalendarPlus, Clock, FileText, FolderOpen, MapPin, Moon, Phone, StickyNote, Sun, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { dueLabel, shortDate } from '@/lib/dates'
import { mediaIsImage, mediaIsVideo } from '@/lib/files'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useMyMatches, type ConversationView } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job, MediaRef, Message } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Button, IconButton } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/Progress'
import { StatusBadge } from '@/components/ui/Badge'
import { Toggle } from '@/components/ui/Toggle'
import { RatingStars } from '@/components/ui/RatingStars'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { FolderCard } from '@/components/ui/FolderCard'
import { clock, isDesignerP, localClock, personLine, previewOf, tzOf, type Presence } from './model'
import { useNow } from './hooks'
import { useMessagesPrefs } from './store'
import { Eyebrow, JobChip, PersonAvatar } from './ui'

export function InfoPanel({
  view,
  jobs,
  presence,
  onClose,
  onOpenMedia,
  onJumpTo,
  onCall,
  className,
}: {
  view: ConversationView
  jobs: Job[]
  presence: Presence
  onClose?: () => void
  onOpenMedia: (items: MediaRef[], index: number, origin?: (i: number) => Element | null | undefined) => void
  onJumpTo: (id: string) => void
  onCall: () => void
  className?: string
}) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const role = useApp((s) => s.settings.role)
  const togglePin = useApp((s) => s.togglePinConversation)
  const toggleMute = useApp((s) => s.toggleMuteConversation)
  const toggleArchive = useApp((s) => s.toggleArchiveConversation)
  const addEvent = useApp((s) => s.addEvent)
  const setMatchNote = useApp((s) => s.setMatchNote)
  const saved = useMessagesPrefs((s) => s.saved)
  const matches = useMyMatches()
  const now = useNow(30_000)
  const p = view.counterpart
  const c = view.conversation
  const designer = isDesignerP(p) ? p : undefined
  const tz = designer ? (tzOf(designer.location) ?? undefined) : tzOf(p?.location)
  const clockInfo = tz ? localClock(tz, lang, new Date(now)) : undefined
  const match = matches.find((m) => m.match.clientId === c.clientId && m.match.designerId === c.designerId)?.match

  const files = useMemo(() => {
    const out: { media: MediaRef; msg: Message }[] = []
    for (const m of view.messages) {
      if (m.kind === 'voice') continue
      for (const a of m.attachments ?? []) out.push({ media: a, msg: m })
    }
    return out.reverse()
  }, [view.messages])
  const visual = files.filter((f) => mediaIsImage(f.media) || mediaIsVideo(f.media))
  const savedHere = useMemo(() => {
    const set = new Set(saved)
    return view.messages.filter((m) => set.has(m.id)).reverse()
  }, [saved, view.messages])
  const voiceCount = view.messages.filter((m) => m.kind === 'voice').length
  const thumbRefs = useRef<(HTMLElement | null)[]>([])

  const allMedia = files.map((f) => f.media)

  const scheduleCall = () => {
    const at = new Date()
    at.setDate(at.getDate() + 1)
    at.setHours(10, 0, 0, 0)
    addEvent({ title: `Call with ${p?.name ?? 'counterpart'}`, at: at.toISOString(), durationMin: 30, kind: 'call', jobId: jobs[0]?.id, withId: view.counterpartId })
    toast({ title: t('messages.toast.callScheduled'), description: t('messages.toast.callScheduledBody', { name: p?.name ?? '' }), tone: 'success', link: '/calendar' })
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <motion.div variants={stagger(0.06, 0.05)} initial="hidden" animate="show" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {/* profile */}
        <motion.section variants={item} className="relative overflow-hidden rounded-[24px] bg-[var(--surface-2)] p-4 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent)]" />
          {onClose && (
            <IconButton label={t('messages.action.close')} variant="ghost" size="sm" onClick={onClose} className="absolute right-2 top-2">
              <X className="size-4" />
            </IconButton>
          )}
          <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }} className="relative mx-auto w-fit">
            {presence === 'online' && <span className="msg-anim absolute inset-0 rounded-full bg-success/40 [animation:msg-ring_2.4s_var(--ease-out)_infinite]" />}
            <PersonAvatar person={p} size={76} status={presence} />
          </motion.div>
          <h3 className="relative mt-3 flex items-center justify-center gap-1.5 text-[17px] font-medium tracking-[-0.02em]">
            <span className="truncate">{p?.name}</span>
            {(designer?.verified || (!designer && p && 'verified' in p && p.verified)) && <BadgeCheck className="size-4.5 shrink-0 fill-accent text-accent-ink" />}
          </h3>
          <p className="relative mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{personLine(p)}</p>
          {p && (
            <div className="relative mt-2 flex items-center justify-center">
              <RatingStars value={p.rating} size={14} showValue count={designer?.reviewsCount} />
            </div>
          )}
          <div className="relative mt-3 grid grid-cols-1 gap-1.5 text-left text-[12px]">
            {p?.location && (
              <span className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-2.5 py-1.5 text-ink-2">
                <MapPin className="size-3.5 text-ink-3" />
                <span className="truncate">{p.location}</span>
              </span>
            )}
            {clockInfo && (
              <span className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-2.5 py-1.5 text-ink-2">
                {clockInfo.night ? <Moon className="size-3.5 text-info" /> : <Sun className="size-3.5 text-warning" />}
                <span className="font-mono font-medium text-ink">{clockInfo.time}</span>
                <span className="truncate text-ink-3">
                  {clockInfo.diffH === 0
                    ? t('messages.info.sameTime')
                    : t(clockInfo.diffH > 0 ? 'messages.info.ahead' : 'messages.info.behind', { h: Math.abs(clockInfo.diffH) })}
                </span>
              </span>
            )}
            {designer && (
              <span className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-2.5 py-1.5 text-ink-2">
                <Clock className="size-3.5 text-ink-3" />
                <span className="truncate">{t('messages.info.replies', { h: designer.responseTimeHrs })}</span>
              </span>
            )}
          </div>
          <div className="relative mt-3 grid grid-cols-3 gap-1.5">
            <PanelAction icon={<UserRound />} label={t('messages.info.profile')} onClick={() => navigate(`/network/${view.counterpartId}`)} />
            <PanelAction icon={<Phone />} label={t('messages.info.call')} onClick={onCall} />
            {role === 'client' ? (
              <PanelAction icon={<FileText />} label={t('messages.info.brief')} onClick={() => navigate(`/brief/new?designer=${view.counterpartId}`)} />
            ) : (
              <PanelAction icon={<CalendarPlus />} label={t('messages.info.schedule')} onClick={scheduleCall} />
            )}
          </div>
        </motion.section>

        {/* stats */}
        <motion.section variants={item} className="grid grid-cols-3 gap-1.5">
          <Stat label={t('messages.info.messages')} value={view.messages.length} />
          <Stat label={t('messages.info.files')} value={files.length} />
          <Stat label={t('messages.info.voice')} value={voiceCount} />
        </motion.section>

        {/* jobs */}
        <motion.section variants={item}>
          <PanelTitle icon={<Briefcase />} count={jobs.length}>
            {t('messages.info.jobs')}
          </PanelTitle>
          {jobs.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-line-2 p-4 text-center">
              <p className="text-[12.5px] text-ink-3">{t('messages.info.noJobs')}</p>
              {role === 'client' && (
                <Button size="xs" className="mt-2" onClick={() => navigate(`/brief/new?designer=${view.counterpartId}`)}>
                  {t('messages.info.sendBrief')}
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {jobs.map((j) => (
                <li key={j.id}>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/jobs/${j.id}`)}
                    className="w-full rounded-[18px] bg-[var(--surface-2)] p-3 text-left transition-colors hover:bg-[var(--surface-3)]"
                  >
                    <div className="flex items-center gap-2">
                      <JobChip job={j} className="bg-[var(--surface)]" />
                      <StatusBadge status={j.status} size="xs" className="ml-auto" />
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[13px] font-medium">{j.title}</p>
                    <ProgressBar value={j.progress} height={5} tone={j.status === 'approved' ? 'success' : 'ink'} className="mt-2" />
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10.5px] text-ink-3">
                      <span>{j.progress}%</span>
                      <span>
                        {shortDate(j.dueAt, lang)} · {dueLabel(j.dueAt, lang)}
                      </span>
                    </div>
                  </motion.button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* files */}
        <motion.section variants={item}>
          <PanelTitle icon={<FolderOpen />} count={files.length}>
            {t('messages.info.sharedFiles')}
          </PanelTitle>
          {files.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-line-2 p-4 text-center text-[12.5px] text-ink-3">{t('messages.info.noFiles')}</p>
          ) : (
            <>
              {visual.length > 0 && (
                <div className="flex justify-center pb-2 pt-6">
                  <FolderCard
                    size="sm"
                    items={visual.slice(0, 3).map((v) => v.media)}
                    title={t('messages.info.folder', { name: p?.name.split(' ')[0] ?? '' })}
                    subtitle={t('messages.info.folderCount', { count: files.length })}
                    onClick={() => onOpenMedia(allMedia, 0, (k) => thumbRefs.current[k])}
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {files.slice(0, 9).map((f, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    ref={(el) => {
                      thumbRefs.current[i] = el
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenMedia(allMedia, i, (k) => thumbRefs.current[k])}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-2)]"
                    title={f.media.kind === 'file' ? f.media.name : ''}
                  >
                    <MediaView media={f.media} playBadge />
                    {i === 8 && files.length > 9 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[15px] font-medium text-white">+{files.length - 9}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </motion.section>

        {/* saved */}
        <motion.section variants={item}>
          <PanelTitle icon={<Bookmark />} count={savedHere.length}>
            {t('messages.info.saved')}
          </PanelTitle>
          {savedHere.length === 0 ? (
            <p className="rounded-[20px] border border-dashed border-line-2 p-3.5 text-center text-[12px] text-ink-3">{t('messages.info.noSaved')}</p>
          ) : (
            <ul className="space-y-1">
              {savedHere.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => onJumpTo(m.id)} className="flex w-full items-start gap-2 rounded-2xl px-2.5 py-2 text-left hover:bg-[var(--surface-2)]">
                    <Bookmark className="mt-0.5 size-3.5 shrink-0 fill-accent text-accent-text" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[12.5px] text-ink-2">{previewOf(m, t)}</span>
                      <span className="font-mono text-[10.5px] text-ink-3">
                        {shortDate(m.createdAt, lang)} · {clock(m.createdAt, lang)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        {/* private note */}
        {match && <NoteBox key={match.id} initial={match.note ?? ''} onSave={(n) => setMatchNote(match.id, n)} />}

        {/* toggles */}
        <motion.section variants={item} className="divide-y divide-[var(--line)] rounded-[20px] bg-[var(--surface-2)] px-3.5">
          <ToggleRow label={t('messages.action.pin')} hint={t('messages.info.pinHint')} checked={c.pinned} onChange={() => togglePin(c.id)} />
          <ToggleRow label={t('messages.action.mute')} hint={t('messages.info.muteHint')} checked={c.muted} onChange={() => toggleMute(c.id)} />
          <ToggleRow label={t('messages.action.archive')} hint={t('messages.info.archiveHint')} checked={c.archived} onChange={() => toggleArchive(c.id)} />
        </motion.section>
        {view.messages[0] && (
          <motion.p variants={item} className="pb-2 text-center font-mono text-[10.5px] text-ink-3">
            {t('messages.info.since', { date: shortDate(view.messages[0].createdAt, lang) })}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}

function PanelAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      className="flex flex-col items-center gap-1 rounded-2xl bg-[var(--surface)] px-1 py-2 text-[11px] font-medium text-ink-2 shadow-[0_1px_2px_rgba(0,0,0,.05)] transition-colors hover:text-ink [&_svg]:size-4"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink">{icon}</span>
      <span className="max-w-full truncate">{label}</span>
    </motion.button>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[22px] font-medium leading-none tracking-[-0.03em]">
        <AnimatedCounter value={value} />
      </p>
      <p className="mt-1 truncate text-[11px] text-ink-3">{label}</p>
    </div>
  )
}

function PanelTitle({ icon, count, children }: { icon: ReactNode; count?: number; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 px-1 [&_svg]:size-3.5 [&_svg]:text-ink-3">
      {icon}
      <Eyebrow>{children}</Eyebrow>
      {count !== undefined && <span className="ml-auto font-mono text-[10.5px] text-ink-3">{count}</span>}
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="truncate text-[11.5px] text-ink-3">{hint}</p>
      </div>
      <Toggle size="sm" checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function NoteBox({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const t = useT()
  const [value, setValue] = useState(initial)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  useEffect(() => setValue(initial), [initial])
  const commit = () => {
    if (value.trim() === initial.trim()) return
    onSave(value.trim())
    setSavedAt(Date.now())
  }
  return (
    <motion.section variants={item}>
      <PanelTitle icon={<StickyNote />}>{t('messages.info.note')}</PanelTitle>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          rows={3}
          placeholder={t('messages.info.notePlaceholder')}
          className="w-full resize-none rounded-[18px] border border-transparent bg-[color-mix(in_oklab,#FFB21E_14%,var(--surface))] px-3 py-2.5 text-[16px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-[color-mix(in_oklab,#FFB21E_50%,transparent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,#FFB21E_18%,transparent)] sm:text-[12.5px]"
        />
        {savedAt && (
          <motion.span key={savedAt} initial={{ opacity: 0, y: 4 }} animate={{ opacity: [0, 1, 1, 0], y: 0 }} transition={{ duration: 2 }} className="absolute bottom-2 right-3 font-mono text-[10px] text-ink-3">
            {t('messages.info.noteSaved')}
          </motion.span>
        )}
      </div>
      <p className="mt-1 px-1 text-[11px] text-ink-3">{t('messages.info.noteHint')}</p>
    </motion.section>
  )
}
