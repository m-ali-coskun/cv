import { useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Images, MessageCircle } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { spring } from '@/lib/motion'
import { disciplineColor } from '@/theme/disciplines'
import type { Job } from '@/store/types'
import { FolderCard } from '@/components/ui/FolderCard'
import { DisciplineIcon, Pill } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/Button'
import { isVisual, type FileItem, type SourceFilter } from './model'
import { FileThumb } from './ui'

interface Folder {
  key: string
  job?: Job
  files: FileItem[]
  size: number
  latest: string
}

export function FoldersRow({
  files,
  jobs,
  activeJob,
  source,
  onOpenJob,
  onOpenSource,
  onDropFiles,
}: {
  files: FileItem[]
  jobs: Job[]
  activeJob: string | null
  source: SourceFilter
  onOpenJob: (jobId: string) => void
  onOpenSource: (s: 'chat' | 'portfolio') => void
  onDropFiles: (jobId: string, files: File[]) => void
}) {
  const t = useT()
  const scroller = useRef<HTMLDivElement>(null)
  const folders = useMemo(() => {
    const byJob = new Map<string, FileItem[]>()
    for (const f of files) {
      if (!f.jobId) continue
      const arr = byJob.get(f.jobId) ?? []
      arr.push(f)
      byJob.set(f.jobId, arr)
    }
    const list: Folder[] = jobs
      .filter((j) => (j.status !== 'declined' && j.status !== 'cancelled') || byJob.has(j.id))
      .map((job) => {
        const fs = byJob.get(job.id) ?? []
        return {
          key: job.id,
          job,
          files: fs,
          size: fs.reduce((n, f) => n + f.size, 0),
          latest: fs.reduce((m, f) => (f.addedAt > m ? f.addedAt : m), job.updatedAt),
        }
      })
    return list.sort((a, b) => b.latest.localeCompare(a.latest))
  }, [files, jobs])
  const chat = useMemo(() => files.filter((f) => f.source === 'chat'), [files])
  const portfolio = useMemo(() => files.filter((f) => f.source === 'portfolio'), [files])

  const papersOf = (fs: FileItem[]) => {
    const visual = fs.filter(isVisual)
    const pick = [...visual, ...fs.filter((f) => !isVisual(f))].slice(0, 3)
    return pick.map((f) => <FileThumb key={f.id} file={f} className="size-full" iconSize="md" />)
  }

  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * 460, behavior: 'smooth' })

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-[19px] font-medium tracking-[-0.02em]">
          {t('files.folders')} <span className="font-mono text-[13px] font-normal text-ink-3">{folders.length + (chat.length ? 1 : 0) + (portfolio.length ? 1 : 0)}</span>
        </h3>
        <div className="flex items-center gap-1.5 max-sm:hidden">
          <IconButton label={t('files.scrollLeft')} variant="soft" size="sm" onClick={() => scroll(-1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label={t('files.scrollRight')} variant="soft" size="sm" onClick={() => scroll(1)}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>
      <div ref={scroller} className="-mx-2 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 pt-14 no-scrollbar sm:gap-7 [mask-image:linear-gradient(90deg,transparent,#000_8px,#000_calc(100%-28px),transparent)]">
        {chat.length > 0 && (
          <FolderItem index={0}>
            <FolderCard
              size="sm"
              items={[]}
              papers={papersOf(chat)}
              color="var(--info)"
              title={t('files.chatFolder')}
              subtitle={<span className="font-mono">{t('files.count', { count: chat.length })}</span>}
              icon={<MessageCircle className="text-white" />}
              selected={source === 'chat' && !activeJob}
              onClick={() => onOpenSource('chat')}
            />
          </FolderItem>
        )}
        {portfolio.length > 0 && (
          <FolderItem index={1}>
            <FolderCard
              size="sm"
              items={[]}
              papers={papersOf(portfolio)}
              color="var(--accent)"
              title={t('files.portfolioFolder')}
              subtitle={<span className="font-mono">{t('files.count', { count: portfolio.length })}</span>}
              icon={<Images className="text-[var(--accent-ink)]" />}
              selected={source === 'portfolio' && !activeJob}
              onClick={() => onOpenSource('portfolio')}
            />
          </FolderItem>
        )}
        {folders.map((f, i) => (
          <FolderItem key={f.key} index={i + 2}>
            <FolderCard
              size="sm"
              items={[]}
              papers={f.files.length ? papersOf(f.files) : undefined}
              color={disciplineColor(f.job!.discipline)}
              title={f.job!.title}
              subtitle={
                <span className="font-mono">
                  {f.job!.id} · {f.files.length ? `${t('files.count', { count: f.files.length })} · ${formatBytes(f.size)}` : t('files.emptyFolder')}
                </span>
              }
              icon={<DisciplineIcon id={f.job!.discipline} size={20} />}
              badge={activeJob === f.key ? <Pill size="xs" tone="night">{t('files.open')}</Pill> : undefined}
              selected={activeJob === f.key}
              onClick={() => onOpenJob(f.key)}
              onFilesDrop={(dropped) => onDropFiles(f.key, dropped)}
              ariaLabel={`${f.job!.id} ${f.job!.title}`}
            />
          </FolderItem>
        ))}
      </div>
    </div>
  )
}

function FolderItem({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={cn('w-[150px] shrink-0 snap-start sm:w-[184px]')}
      initial={{ opacity: 0, y: 30, rotate: -3, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
      transition={{ ...spring.bouncy, delay: 0.1 + Math.min(index, 10) * 0.05 }}
    >
      {children}
    </motion.div>
  )
}
