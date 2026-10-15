import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, SearchX } from 'lucide-react'
import { stagger } from '@/lib/motion'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useJob, useRole } from '@/store/selectors'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Job, type Role } from '@/store/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Glass } from '@/components/ui/Glass'
import { ActionBar } from './detail/ActionBar'
import { JobCtx, TABS, type JobDetailCtx, type ModalKind, type TabId } from './detail/context'
import { Hero, NotMineBanner } from './detail/Hero'
import { usePeopleIndex, useTabParam } from './detail/hooks'
import { Journey } from './detail/Journey'
import { JobModals } from './detail/Modals'
import { Rail } from './detail/Rail'
import { TabsCard } from './detail/TabsCard'

/**
 * /jobs/:id — the job cockpit. Works for both workspaces: the side Ali is on
 * (client who hired / designer who was hired) decides which actions exist.
 */
export default function JobDetailPage() {
  const { id } = useParams()
  const job = useJob(id)
  if (!job) return <NotFound id={id} />
  // keyed so every piece of local UI state resets when hopping between jobs
  return <JobDetail key={job.id} job={job} />
}

function NotFound({ id }: { id?: string }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <Glass className="p-4 sm:p-6" initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}>
      <EmptyState
        icon={<SearchX />}
        title={t('job.notFound.title')}
        description={t('job.notFound.body', { id: id ?? '—' })}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/jobs')}>
              {t('job.notFound.back')}
            </Button>
            <Button variant="glass" onClick={() => navigate('/requests')}>
              {t('core.nav.requests')}
            </Button>
          </div>
        }
        className="py-16"
      />
    </Glass>
  )
}

function JobDetail({ job }: { job: Job }) {
  const role = useRole()
  const people = usePeopleIndex()
  const markRead = useApp((s) => s.markConversationRead)
  const [tab, setTabParam] = useTabParam()
  const [modal, setModal] = useState<ModalKind | null>(null)
  const [styleEdit, setStyleEdit] = useState(false)
  const [versionId, setVersionId] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  // Which side of this job is Ali on? Prefer the active workspace when he is on both.
  const side: Role =
    job.clientId === ME_CLIENT_ID && (role === 'client' || job.designerId !== ME_DESIGNER_ID)
      ? 'client'
      : job.designerId === ME_DESIGNER_ID
        ? 'designer'
        : role
  const mine = side === 'client' ? job.clientId === ME_CLIENT_ID : job.designerId === ME_DESIGNER_ID
  const canAct = mine && side === role
  const meId = side === 'client' ? ME_CLIENT_ID : ME_DESIGNER_ID

  const scrollToTabs = useCallback(() => {
    window.requestAnimationFrame(() => {
      const el = tabsRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      if (top < 0 || top > window.innerHeight * 0.55) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const setTab = useCallback(
    (t: TabId) => {
      setTabParam(t)
      scrollToTabs()
    },
    [setTabParam, scrollToTabs],
  )

  const ctx = useMemo<JobDetailCtx>(() => {
    const client = people.get(job.clientId)
    const designer = people.get(job.designerId)
    return {
      job,
      role,
      side,
      canAct,
      meId,
      client,
      designer,
      counterpart: side === 'client' ? designer : client,
      person: (pid: string) => people.get(pid),
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
      tab,
      setTab,
      styleEdit,
      setStyleEdit,
      versionId,
      setVersionId,
      showVersion: (vid?: string) => {
        setVersionId(vid ?? null)
        setTab('deliveries')
      },
    }
  }, [job, role, side, canAct, meId, people, modal, tab, setTab, styleEdit, versionId])

  // Drop edit mode when Ali loses the right to edit (role switch, job closed…)
  useEffect(() => {
    if (!canAct && styleEdit) setStyleEdit(false)
  }, [canAct, styleEdit])

  // The discussion rail shows the thread, so count it as read.
  const convId = job.conversationId
  const lastMsgAt = useApp((s) => (convId ? s.messages.reduce((m, x) => (x.conversationId === convId && x.createdAt > m ? x.createdAt : m), '') : ''))
  useEffect(() => {
    if (convId && canAct && lastMsgAt) markRead(convId)
  }, [convId, canAct, lastMsgAt, markRead])

  // Keyboard: 1–7 jump between tabs (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || modal) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      const n = Number(e.key)
      if (n >= 1 && n <= TABS.length) setTabParam(TABS[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, setTabParam])

  return (
    <JobCtx.Provider value={ctx}>
      <motion.div variants={stagger(0.07, 0.02)} initial="hidden" animate="show" className="flex min-w-0 flex-col gap-3 sm:gap-4">
        {!canAct && <NotMineBanner />}
        <Hero />
        <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
            <Journey />
            <ActionBar />
            <TabsCard ref={tabsRef} />
          </div>
          <Rail />
        </div>
      </motion.div>
      <JobModals />
    </JobCtx.Provider>
  )
}
