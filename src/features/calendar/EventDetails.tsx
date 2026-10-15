import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { addDays, addMinutes, isSameDay, subDays } from 'date-fns'
import { ArrowUpRight, CalendarClock, Clock, Copy, MessageCircle, Pencil, Target, Trash2 } from 'lucide-react'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID } from '@/store/types'
import { toast } from '@/store/toasts'
import { useLang, useT } from '@/i18n'
import { fmt } from '@/lib/dates'
import { formatDuration, formatMoney } from '@/lib/format'
import { item as itemV, spring, stagger } from '@/lib/motion'
import { Button, IconButton } from '@/components/ui/Button'
import { DisciplineIcon, Pill, StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/Progress'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { KIND_COLOR, findFreeSlot, isAuto, type CalItem } from './model'
import { KindIcon, PersonAvatar, countdown, timeRange, useNow, usePersonLookup } from './ui'

/** Details card shown in the anchored popover / bottom sheet. */
export function EventDetails({ item, items, onEdit, onClose }: { item: CalItem; items: CalItem[]; onEdit: (it: CalItem) => void; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()
  const now = useNow(30_000)
  const person = usePersonLookup()(item.withId)
  const addEvent = useApp((s) => s.addEvent)
  const updateEvent = useApp((s) => s.updateEvent)
  const removeEvent = useApp((s) => s.removeEvent)
  const ensureConversation = useApp((s) => s.ensureConversation)
  const [confirm, confirmDialog] = useConfirm()
  const color = KIND_COLOR[item.kind]
  const cd = countdown(item.start, now)
  const soon = !cd.past && cd.d === 0
  const auto = isAuto(item)

  const nudge = (min: number) => {
    if (!item.event) return
    const before = item.event.at
    const next = addMinutes(item.start, min)
    updateEvent(item.event.id, { at: next.toISOString() })
    toast({
      title: t('calendar.toast.moved', { when: fmt(next, 'EEE d MMM, HH:mm', lang) }),
      tone: 'success',
      action: { label: t('calendar.undo'), onClick: () => updateEvent(item.event!.id, { at: before }) },
    })
    onClose()
  }

  const duplicate = () => {
    if (!item.event) return
    const e = item.event
    const next = addDays(item.start, 7)
    const ev = addEvent({ title: e.title, kind: e.kind, at: next.toISOString(), durationMin: e.durationMin, jobId: e.jobId, withId: e.withId })
    toast({ title: t('calendar.toast.duplicated'), description: fmt(next, 'EEE d MMM, HH:mm', lang), tone: 'success', action: { label: t('calendar.undo'), onClick: () => removeEvent(ev.id) } })
    onClose()
  }

  const remove = async () => {
    if (!item.event) return
    const ok = await confirm({
      title: t('calendar.confirmDelete.title'),
      description: t('calendar.confirmDelete.body', { title: item.title }),
      confirmLabel: t('calendar.delete'),
      cancelLabel: t('calendar.cancel'),
      tone: 'danger',
      icon: <Trash2 className="size-5" />,
    })
    if (!ok) return
    const { id, ...snapshot } = item.event
    removeEvent(id)
    toast({ title: t('calendar.toast.deleted'), description: snapshot.title, action: { label: t('calendar.undo'), onClick: () => addEvent(snapshot) } })
    onClose()
  }

  /** Book a 2h focus block on the latest free weekday slot before the deadline. */
  const blockFocus = () => {
    let slot: Date | null = null
    for (let back = 0; back < 7 && !slot; back++) {
      const day = subDays(item.start, back)
      if (day.getTime() < now.getTime() - 864e5) break
      const dow = day.getDay()
      if (dow === 0 || dow === 6) continue
      const s = findFreeSlot(items, day, 120, 9, 18)
      if (s && s.getTime() + 120 * 60_000 <= item.start.getTime()) slot = s
    }
    if (!slot) {
      toast({ title: t('calendar.toast.noSlot'), tone: 'error' })
      return
    }
    const ev = addEvent({ title: `Focus — ${item.job?.title ?? item.title}`, kind: 'focus', at: slot.toISOString(), durationMin: 120, jobId: item.jobId })
    toast({
      title: t('calendar.toast.focusBooked'),
      description: fmt(slot, 'EEE d MMM, HH:mm', lang),
      tone: 'success',
      action: { label: t('calendar.undo'), onClick: () => removeEvent(ev.id) },
    })
    onClose()
  }

  const message = () => {
    if (!item.withId) return
    const conv = role === 'client' ? ensureConversation(ME_CLIENT_ID, item.withId) : ensureConversation(item.withId, ME_DESIGNER_ID)
    navigate(`/messages/${conv}`)
    onClose()
  }

  return (
    <motion.div variants={stagger(0.04, 0.02)} initial="hidden" animate="show" className="p-4">
      <motion.div variants={itemV} className="flex items-start gap-3">
        <motion.span
          initial={{ scale: 0.4, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring.bouncy}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-[#0b0b0c] shadow-[inset_0_1px_0_rgba(255,255,255,.55)]"
          style={{ background: color }}
        >
          <KindIcon kind={item.kind} className="size-[18px]" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill size="xs" dot={color}>
              {t(`calendar.kind.${item.kind}`)}
            </Pill>
            {auto && (
              <Pill size="xs" tone="outline" icon={<CalendarClock className="size-3" />}>
                {t(item.source === 'due' ? 'calendar.auto.due' : 'calendar.auto.milestone')}
              </Pill>
            )}
          </div>
          <h3 className="mt-1.5 text-[17px] font-medium leading-snug tracking-[-0.015em]">{item.title}</h3>
        </div>
        {item.editable && (
          <IconButton label={t('calendar.edit')} variant="soft" size="sm" onClick={() => onEdit(item)}>
            <Pencil className="size-3.5" />
          </IconButton>
        )}
      </motion.div>

      <motion.div variants={itemV} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12.5px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 text-ink-3" />
          {fmt(item.start, 'EEE d MMM', lang)} · {timeRange(item, lang)}
        </span>
        {item.kind !== 'deadline' && item.kind !== 'milestone' && <span className="text-ink-3">{formatDuration(item.durationMin)}</span>}
      </motion.div>

      {!cd.past && (
        <motion.div variants={itemV} className="mt-2.5">
          <span
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-mono text-[12px] font-medium"
            style={{ background: soon ? color : 'var(--surface-2)', color: soon ? '#0b0b0c' : 'var(--ink-2)' }}
          >
            {soon && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
            {cd.d > 0
              ? t('calendar.inDays', { count: cd.d })
              : cd.h > 0
                ? t('calendar.inHoursMinutes', { h: cd.h, m: cd.m })
                : t('calendar.inMinutes', { count: cd.m })}
          </span>
        </motion.div>
      )}
      {cd.past && !isSameDay(item.start, now) && (
        <motion.p variants={itemV} className="mt-2 text-[12px] text-ink-3">
          {t('calendar.past')}
        </motion.p>
      )}

      {item.milestone && (
        <motion.div variants={itemV} className="mt-3 flex items-center justify-between rounded-2xl bg-success-soft px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink-2">{t(`calendar.milestone.${item.milestone.status}`)}</span>
          <span className="font-mono text-[14px] font-semibold">{formatMoney(item.milestone.amount, item.job?.currency ?? 'EUR', lang)}</span>
        </motion.div>
      )}

      {item.job && (
        <motion.button
          variants={itemV}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            navigate(`/jobs/${item.job!.id}`)
            onClose()
          }}
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-3 text-left transition-colors hover:bg-[var(--surface-3)]"
        >
          <DisciplineIcon id={item.job.discipline} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11.5px] text-ink-3">{item.job.id}</span>
              <StatusBadge status={item.job.status} size="xs" />
            </div>
            <p className="mt-0.5 truncate text-[13.5px] font-medium">{item.job.title}</p>
            <ProgressBar value={item.job.progress} height={4} className="mt-1.5" tone="accent" />
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </motion.button>
      )}

      {person && (
        <motion.div variants={itemV} className="mt-3 flex items-center gap-3">
          <PersonAvatar person={person} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">{person.name}</p>
            <p className="truncate text-[12px] text-ink-3">{person.sub}</p>
          </div>
          <Button size="xs" variant="soft" icon={<MessageCircle className="size-3.5" />} onClick={message}>
            {t('calendar.message')}
          </Button>
        </motion.div>
      )}

      <motion.div variants={itemV} className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {item.editable ? (
          <>
            <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => onEdit(item)}>
              {t('calendar.edit')}
            </Button>
            <Button size="sm" variant="glass" onClick={() => nudge(60)} className="font-mono">
              +1h
            </Button>
            <Button size="sm" variant="glass" onClick={() => nudge(24 * 60)} className="font-mono">
              +1d
            </Button>
            <IconButton label={t('calendar.duplicateNextWeek')} variant="soft" size="md" onClick={duplicate}>
              <Copy className="size-4" />
            </IconButton>
            <IconButton label={t('calendar.delete')} variant="soft" size="md" onClick={remove} className="text-danger">
              <Trash2 className="size-4" />
            </IconButton>
          </>
        ) : (
          <>
            {item.kind === 'deadline' && (
              <Button size="sm" icon={<Target className="size-3.5" />} onClick={blockFocus}>
                {t('calendar.blockFocus')}
              </Button>
            )}
            {item.job && (
              <Button
                size="sm"
                variant="glass"
                iconRight={<ArrowUpRight className="size-3.5" />}
                onClick={() => {
                  navigate(`/jobs/${item.job!.id}`)
                  onClose()
                }}
              >
                {t('calendar.openJob')}
              </Button>
            )}
          </>
        )}
      </motion.div>
      {confirmDialog}
    </motion.div>
  )
}
