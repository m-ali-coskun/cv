import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useJob } from '@/store/selectors'
import { toast } from '@/store/toasts'
import type { Job, JobStatus } from '@/store/types'
import { fireConfetti } from '@/lib/confetti'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ApproveModal } from './ApproveModal'
import { RevisionModal } from './RevisionModal'
import { DeliverModal } from './DeliverModal'
import { DeclineModal } from './DeclineModal'
import { CounterOfferModal } from './CounterOfferModal'
import { jobUrl } from './model'

export type FlowKind = 'approve' | 'revision' | 'deliver' | 'decline' | 'counter' | 'cancel'
type StartFlow = (kind: FlowKind, job: Job | string, onDone?: () => void) => void

const FlowCtx = createContext<StartFlow | null>(null)

/**
 * Hosts every job dialog once per page. Anything below can open one with
 * `useStartFlow()('approve', job)` — board drops, card menus, list rows…
 */
export function JobFlowsProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const [state, setState] = useState<{ kind: FlowKind; jobId: string; open: boolean; onDone?: () => void } | null>(null)
  const job = useJob(state?.jobId)
  const start = useCallback<StartFlow>((kind, j, onDone) => setState({ kind, jobId: typeof j === 'string' ? j : j.id, open: true, onDone }), [])
  const close = useCallback(() => setState((s) => (s ? { ...s, open: false } : s)), [])
  const is = (k: FlowKind) => !!state?.open && state.kind === k
  const done = state?.onDone

  return (
    <FlowCtx.Provider value={start}>
      {children}
      <ApproveModal job={job} open={is('approve')} onClose={close} onDone={done} />
      <RevisionModal job={job} open={is('revision')} onClose={close} onDone={done} />
      <DeliverModal job={job} open={is('deliver')} onClose={close} onDone={done} />
      <DeclineModal job={job} open={is('decline')} onClose={close} onDone={done} />
      <CounterOfferModal job={job} open={is('counter')} onClose={close} onDone={done} />
      <ConfirmDialog
        open={is('cancel')}
        onClose={close}
        tone="danger"
        icon={<Ban className="size-6" />}
        title={t('jobs.cancel.title', { id: job?.id ?? '' })}
        description={t('jobs.cancel.desc')}
        confirmLabel={t('jobs.cancel.cta')}
        onConfirm={() => {
          if (!job) return
          const prev = job.status
          useApp.getState().cancelJob(job.id)
          toast({
            title: t('jobs.cancel.toast', { id: job.id }),
            tone: 'default',
            action: { label: t('core.toast.undo'), onClick: () => useApp.getState().setJobStatus(job.id, prev, { silent: true }) },
          })
          done?.()
        }}
      />
    </FlowCtx.Provider>
  )
}

export function useStartFlow(): StartFlow {
  const ctx = useContext(FlowCtx)
  const navigate = useNavigate()
  // Outside a provider, fall back to the job page where the same actions live.
  return useMemo(() => ctx ?? ((_k: FlowKind, j: Job | string) => navigate(`/jobs/${typeof j === 'string' ? j : j.id}`)), [ctx, navigate])
}

/** Direct (dialog-free) job commands with feedback toasts. */
export function useJobCommands() {
  const t = useT()
  const navigate = useNavigate()
  return useMemo(
    () => ({
      open: (job: Job) => navigate(`/jobs/${job.id}`),
      message: (job: Job) => {
        const id = job.conversationId ?? useApp.getState().ensureConversation(job.clientId, job.designerId)
        navigate(`/messages/${id}`)
      },
      copyLink: async (job: Job) => {
        const url = jobUrl(job.id)
        try {
          await navigator.clipboard.writeText(url)
          toast({ title: t('jobs.toast.linkCopied'), description: url, tone: 'success', duration: 2600 })
        } catch {
          toast({ title: t('jobs.toast.copyFailed'), description: url, tone: 'error' })
        }
      },
      star: (job: Job) => {
        useApp.getState().toggleStar(job.id)
        toast({ title: t(job.starred ? 'jobs.toast.unstarred' : 'jobs.toast.starred', { id: job.id }), duration: 1800 })
      },
      accept: (job: Job, from?: Element | null) => {
        useApp.getState().acceptJob(job.id)
        fireConfetti({ from, particleCount: 70, spread: 65, startVelocity: 32 })
        toast({
          title: t('jobs.toast.accepted', { id: job.id }),
          description: t('jobs.toast.acceptedBody'),
          tone: 'success',
          action: { label: t('jobs.toast.openBoard'), onClick: () => navigate('/jobs?status=queued') },
        })
      },
      move: (job: Job, to: JobStatus) => {
        const from = job.status
        useApp.getState().setJobStatus(job.id, to)
        toast({
          title: t('jobs.toast.moved', { id: job.id, status: t(`core.status.${to}`) }),
          duration: 3200,
          action: { label: t('core.toast.undo'), onClick: () => useApp.getState().setJobStatus(job.id, from, { silent: true }) },
        })
      },
      answerCounter: (job: Job, accept: boolean) => {
        useApp.getState().respondCounterOffer(job.id, accept)
        toast({ title: t(accept ? 'jobs.toast.counterAccepted' : 'jobs.toast.counterRejected', { id: job.id }), tone: accept ? 'success' : 'default' })
      },
    }),
    [t, navigate],
  )
}
