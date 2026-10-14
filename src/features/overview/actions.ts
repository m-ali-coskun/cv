import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { useT, useLang } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { uid } from '@/lib/ids'
import { shortDate } from '@/lib/dates'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Job, type TimelineEvent } from '@/store/types'
import { findFocusSlots, focusJobs, ts } from './data'

const first = (name?: string) => (name ?? '').split(' ')[0] || 'there'
const enDate = (d: string | Date) => format(new Date(d), 'EEE, MMM d')
const nameOf = (id: string) => {
  const s = useApp.getState()
  return s.designers.find((d) => d.id === id)?.name ?? s.clients.find((c) => c.id === id)?.contactName ?? s.clients.find((c) => c.id === id)?.name
}

/**
 * Real one-click fixes used by the risk drawer, the AI cards and the hero.
 * Every action goes through store actions (persisted) and confirms with a toast.
 * Message bodies are user content and therefore always English.
 */
export function useFixes() {
  const t = useT()
  const lang = useLang()
  const role = useRole()
  const navigate = useNavigate()

  const convFor = useCallback((job: Job) => {
    const s = useApp.getState()
    return job.conversationId && s.conversations.some((c) => c.id === job.conversationId)
      ? job.conversationId
      : s.ensureConversation(job.clientId, job.designerId)
  }, [])

  /** Client → designer: friendly check-in in the job's thread. */
  const nudge = useCallback(
    (job: Job, opts?: { silent?: boolean }) => {
      const conv = convFor(job)
      const name = nameOf(job.designerId)
      useApp.getState().sendMessage(conv, {
        jobId: job.id,
        text: `Hi ${first(name)}, quick check-in on ${job.id} “${job.title}” — it's due ${enDate(job.dueAt)}. How is it looking? If anything is blocking you, tell me and I'll help unblock it 🙏`,
      })
      if (!opts?.silent)
        toast({
          title: t('overview.fix.nudged', { name: first(name) }),
          description: job.title,
          tone: 'message',
          link: `/messages/${conv}`,
        })
      return conv
    },
    [convFor, t],
  )

  /** Designer → client: progress update in the job's thread. */
  const sendUpdate = useCallback(
    (job: Job) => {
      const conv = convFor(job)
      useApp.getState().sendMessage(conv, {
        jobId: job.id,
        text: `Quick update on ${job.id}: we're at ${job.progress}% and on track for ${enDate(job.dueAt)}. I'll share the next version as soon as it's ready.`,
      })
      toast({ title: t('overview.fix.updateSent'), description: job.title, tone: 'message', link: `/messages/${conv}` })
    },
    [convFor, t],
  )

  /** Designer → client: ask politely for two more days. */
  const askExtension = useCallback(
    (job: Job) => {
      const conv = convFor(job)
      const target = addDays(new Date(Math.max(ts(job.dueAt), Date.now())), 2)
      useApp.getState().sendMessage(conv, {
        jobId: job.id,
        text: `Hi! Would it be okay to move the deadline for ${job.id} to ${enDate(target)}? I want the final files to be properly polished.`,
      })
      toast({ title: t('overview.fix.askedExtension'), description: shortDate(target, lang), tone: 'message', link: `/messages/${conv}` })
    },
    [convFor, t, lang],
  )

  /** Client: push the deadline by N days (with undo). */
  const extend = useCallback(
    (job: Job, days = 2) => {
      const s = useApp.getState()
      const before = job.dueAt
      const base = new Date(Math.max(ts(job.dueAt), Date.now()))
      const next = addDays(base, days)
      next.setHours(new Date(job.dueAt).getHours(), new Date(job.dueAt).getMinutes(), 0, 0)
      const ev: TimelineEvent = {
        id: uid('ev_'),
        kind: 'deadline',
        at: new Date().toISOString(),
        actorId: role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID,
        text: `Deadline extended to ${enDate(next)}`,
        meta: { from: before, to: next.toISOString() },
      }
      const current = s.jobs.find((j) => j.id === job.id) ?? job
      s.updateJob(job.id, { dueAt: next.toISOString(), updatedAt: new Date().toISOString(), timeline: [ev, ...current.timeline] })
      s.sendMessage(convFor(job), {
        jobId: job.id,
        text: `I've moved the deadline for ${job.id} to ${enDate(next)} — take the time you need to get it right.`,
      })
      toast({
        title: t('overview.fix.extended', { date: shortDate(next, lang) }),
        description: job.title,
        tone: 'success',
        link: `/jobs/${job.id}`,
        action: {
          label: t('core.action.undo'),
          onClick: () => {
            const st = useApp.getState()
            const now = st.jobs.find((j) => j.id === job.id)
            if (!now) return
            st.updateJob(job.id, { dueAt: before, timeline: now.timeline.filter((e) => e.id !== ev.id) })
          },
        },
      })
    },
    [convFor, role, t, lang],
  )

  /** Both: mark the blocker as resolved. */
  const resolveBlocker = useCallback(
    (job: Job) => {
      const s = useApp.getState()
      const blocker = job.blocker
      const current = s.jobs.find((j) => j.id === job.id) ?? job
      const ev: TimelineEvent = {
        id: uid('ev_'),
        kind: 'comment',
        at: new Date().toISOString(),
        actorId: role === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID,
        text: `Blocker resolved: ${blocker ?? ''}`.trim(),
      }
      s.updateJob(job.id, { blocker: undefined, updatedAt: new Date().toISOString(), timeline: [ev, ...current.timeline] })
      toast({
        title: t('overview.fix.unblocked'),
        description: blocker,
        tone: 'success',
        action: {
          label: t('core.action.undo'),
          onClick: () => {
            const st = useApp.getState()
            const now = st.jobs.find((j) => j.id === job.id)
            if (now) st.updateJob(job.id, { blocker, timeline: now.timeline.filter((e) => e.id !== ev.id) })
          },
        },
      })
    },
    [role, t],
  )

  const openChat = useCallback((job: Job) => navigate(`/messages/${convFor(job)}`), [convFor, navigate])
  const openJob = useCallback((job: Job) => navigate(`/jobs/${job.id}`), [navigate])

  /** Designer: put focus blocks for the most important jobs into today's calendar. */
  const planDay = useCallback(
    (jobs: Job[]) => {
      const s = useApp.getState()
      const mine = s.events.filter((e) => e.role === 'designer')
      const todayKey = new Date().toDateString()
      const planned = new Set(mine.filter((e) => e.kind === 'focus' && e.jobId && new Date(e.at).getTime() >= Date.now() - 864e5 * 0.5).map((e) => e.jobId))
      const candidates = focusJobs(jobs, 3)
      if (!candidates.length) {
        toast({ title: t('overview.ai.nothingToPlan'), description: t('overview.ai.nothingToPlanBody'), tone: 'info', link: '/requests' })
        return []
      }
      const targets = candidates.filter((j) => !planned.has(j.id))
      if (!targets.length) {
        toast({ title: t('overview.ai.alreadyPlanned'), description: t('overview.ai.alreadyPlannedBody'), tone: 'info', link: '/calendar' })
        return []
      }
      const slots = findFocusSlots(mine, targets.length)
      const created = targets.map((j, i) =>
        s.addEvent({ role: 'designer', title: `Focus: ${j.title}`, at: slots[i].at.toISOString(), durationMin: slots[i].durationMin, kind: 'focus', jobId: j.id, withId: j.clientId }),
      )
      const fmtTime = (d: string) => format(new Date(d), 'HH:mm')
      const sameDay = created.every((e) => new Date(e.at).toDateString() === todayKey)
      toast({
        title: t('overview.ai.planned', { count: created.length }),
        description: created.map((e) => fmtTime(e.at)).join(' · ') + (sameDay ? '' : ` · ${shortDate(created[created.length - 1].at, lang)}`),
        tone: 'success',
        link: '/calendar',
        duration: 6500,
        action: {
          label: t('core.action.undo'),
          onClick: () => created.forEach((e) => useApp.getState().removeEvent(e.id)),
        },
      })
      return created
    },
    [t, lang],
  )

  return { nudge, sendUpdate, askExtension, extend, resolveBlocker, openChat, openJob, planDay, convFor }
}
