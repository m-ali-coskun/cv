import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarClock, Send } from 'lucide-react'
import { addDays, differenceInCalendarDays, format, setHours, setMinutes, startOfDay } from 'date-fns'
import { cn } from '@/lib/cn'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { useClient } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { shortDate } from '@/lib/dates'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { MonthCalendar } from '@/components/ui/DatePicker'

const PRESETS = [2, 3, 5, 7, 14]

/** Accept a request but propose another deadline → acceptJob({ counterDueAt, note }). */
export function CounterOfferModal({ job, open, onClose, onDone }: { job: Job | undefined; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useT()
  const lang = useLang()
  const acceptJob = useApp((s) => s.acceptJob)
  const client = useClient(job?.clientId)
  const original = useMemo(() => (job ? new Date(job.dueAt) : new Date()), [job])
  const [date, setDate] = useState<Date>(() => addDays(original, 3))
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setDate(addDays(new Date(job?.dueAt ?? Date.now()), 3))
      setNote('')
    }
  }, [open, job?.id, job?.dueAt])

  if (!job) return null
  const diff = differenceInCalendarDays(date, original)
  const markers = { [format(original, 'yyyy-MM-dd')]: 'var(--danger)' }

  const submit = () => {
    const due = setMinutes(setHours(date, 17), 0)
    acceptJob(job.id, { counterDueAt: due.toISOString(), note: note.trim() })
    toast({
      title: t('jobs.counter.toast'),
      description: t('jobs.counter.toastBody', { name: client?.name ?? '', date: shortDate(due, lang) }),
      tone: 'info',
    })
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('jobs.counter.title')}
      description={t('jobs.counter.desc', { name: client?.name ?? '' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button icon={<Send className="size-4" />} onClick={submit} disabled={diff === 0}>
            {t('jobs.counter.cta')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* original → proposed */}
        <div className="tile flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{t('jobs.counter.original')}</p>
            <p className="font-mono text-[15px] text-ink-2 line-through decoration-danger/60">{shortDate(original, lang)}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-ink-3" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{t('jobs.counter.proposed')}</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={date.toDateString()}
                initial={{ y: 12, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: -12, opacity: 0, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="font-mono text-[15px] font-medium"
              >
                {shortDate(date, lang)}
              </motion.p>
            </AnimatePresence>
          </div>
          <span
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 font-mono text-[12px] font-medium tabular-nums',
              diff > 0 ? 'bg-warning-soft' : diff < 0 ? 'bg-success-soft' : 'bg-[var(--surface-3)]',
            )}
          >
            {diff > 0 ? '+' : ''}
            {t('core.common.daysShort', { count: diff })}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((d) => {
            const target = addDays(startOfDay(original), d)
            const on = differenceInCalendarDays(date, target) === 0
            return (
              <motion.button
                key={d}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setDate(target)}
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                  on ? 'border-transparent bg-ink text-[var(--surface)]' : 'border-line-2 text-ink-2 hover:text-ink',
                )}
              >
                <CalendarClock className="size-3.5" />
                {t('jobs.counter.plus', { count: d })}
              </motion.button>
            )
          })}
        </div>

        <div className="tile p-2">
          <MonthCalendar value={date} onSelect={setDate} min={addDays(new Date(), 1)} markers={markers} initialMonth={date} />
        </div>
        <p className="-mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <span className="size-1.5 rounded-full bg-danger" /> {t('jobs.counter.legend')}
        </p>

        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('jobs.counter.notePh')} className="min-h-[80px]" />
      </div>
    </Modal>
  )
}
