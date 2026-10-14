import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarX2, Check, Coins, HelpCircle, Hourglass, Palette, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useClient } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job } from '@/store/types'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'

/** Reason chips. The English text is what the client receives (chat content stays English). */
export const DECLINE_REASONS = [
  { key: 'busy', icon: Hourglass, en: 'my calendar is fully booked right now' },
  { key: 'timeline', icon: CalendarX2, en: 'the timeline is too tight for the quality you deserve' },
  { key: 'budget', icon: Coins, en: 'the budget does not fit the scope' },
  { key: 'fit', icon: Palette, en: 'it is outside my specialty' },
  { key: 'unclear', icon: HelpCircle, en: 'the brief needs more detail first' },
] as const

/** Decline a request with reason chips + free text → declineJob. */
export function DeclineModal({ job, open, onClose, onDone }: { job: Job | undefined; open: boolean; onClose: () => void; onDone?: () => void }) {
  const t = useT()
  const declineJob = useApp((s) => s.declineJob)
  const client = useClient(job?.clientId)
  const [picked, setPicked] = useState<string[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) {
      setPicked([])
      setText('')
    }
  }, [open, job?.id])

  if (!job) return null

  const submit = () => {
    const parts: string[] = DECLINE_REASONS.filter((r) => picked.includes(r.key)).map((r) => r.en)
    if (text.trim()) parts.push(text.trim())
    const reason = parts.join('; ')
    declineJob(job.id, reason || undefined)
    toast({ title: t('jobs.decline.toast', { id: job.id }), description: t('jobs.decline.toastBody', { name: client?.name ?? '' }), tone: 'default' })
    onDone?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('jobs.decline.title')}
      description={t('jobs.decline.desc', { name: client?.name ?? '' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button variant="danger" icon={<X className="size-4" />} onClick={submit}>
            {t('jobs.decline.cta')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="tile flex items-center gap-3 p-3">
          {client && <Avatar kind="brand" name={client.name} color={client.logoColor} seed={client.avatarSeed} size={36} />}
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{job.title}</p>
            <p className="font-mono text-[11.5px] text-ink-3">{job.id}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-2">{t('jobs.decline.why')}</p>
          <div className="flex flex-col gap-1.5">
            {DECLINE_REASONS.map((r, i) => {
              const on = picked.includes(r.key)
              const Icon = r.icon
              return (
                <motion.button
                  key={r.key}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.05 + i * 0.04 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== r.key) : [...p, r.key]))}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-[13.5px] transition-colors',
                    on ? 'border-transparent bg-ink text-[var(--surface)]' : 'border-line-2 hover:bg-[var(--surface-2)]',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', on ? 'text-accent' : 'text-ink-3')} />
                  <span className="flex-1">{t(`jobs.decline.reason.${r.key}`)}</span>
                  <motion.span initial={false} animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 24 }}>
                    <Check className="size-4 text-accent" />
                  </motion.span>
                </motion.button>
              )
            })}
          </div>
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('jobs.decline.notePh')} className="min-h-[80px]" />
        <p className="text-[12px] text-ink-3">{t('jobs.decline.hint')}</p>
      </div>
    </Modal>
  )
}
