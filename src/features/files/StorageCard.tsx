import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FolderInput, HardDrive, PackageCheck, Sparkles, TrendingUp, UploadCloud } from 'lucide-react'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Asset, AssetKind } from '@/store/types'
import { useLang, useT } from '@/i18n'
import { timeAgo } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { uid } from '@/lib/ids'
import { formatBytes } from '@/lib/format'
import { EASE_OUT, spring } from '@/lib/motion'
import { fireConfetti } from '@/lib/confetti'
import { Glass } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { DonutChart } from '@/components/charts/DonutChart'
import { KIND_COLOR, KIND_ORDER, planFor, type FileItem, type KindFilter } from './model'
import { FileThumb, useFilesCtx } from './ui'

export function StorageCard({ files, onUpload, onKind }: { files: FileItem[]; onUpload: () => void; onKind: (k: KindFilter) => void }) {
  const t = useT()
  const { actions } = useFilesCtx()
  const [hover, setHover] = useState<AssetKind | null>(null)
  const used = useMemo(() => files.reduce((n, f) => n + f.size, 0), [files])
  const byKind = useMemo(() => {
    const m = new Map<AssetKind, { size: number; count: number }>()
    for (const f of files) {
      const cur = m.get(f.kind) ?? { size: 0, count: 0 }
      cur.size += f.size
      cur.count++
      m.set(f.kind, cur)
    }
    return KIND_ORDER.filter((k) => m.has(k)).map((k) => ({ kind: k, ...m.get(k)! }))
  }, [files])
  const largest = useMemo(() => [...files].sort((a, b) => b.size - a.size).slice(0, 3), [files])
  const weekAgo = Date.now() - 7 * 864e5
  const thisWeek = files.filter((f) => new Date(f.addedAt).getTime() > weekAgo)
  const weekBytes = thisWeek.reduce((n, f) => n + f.size, 0)
  const plan = planFor(used)
  const PLAN_BYTES = plan.bytes
  const pct = (used / PLAN_BYTES) * 100
  const gb = used / 1024 ** 3

  return (
    <Glass className="p-5 sm:p-6" spotlight>
      <div className="relative z-[1] grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                <HardDrive className="size-4" />
                {t('files.storage.title')}
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">{t(`files.plan.${plan.id}`)}</span>
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <AnimatedCounter value={Math.round(gb * 100) / 100} decimals={2} className="text-[44px] font-medium leading-none tracking-[-0.045em]" />
                <span className="text-[16px] font-medium text-ink-2">GB</span>
                <span className="text-[14px] text-ink-3">{t('files.storage.of', { total: plan.label })}</span>
              </div>
            </div>
            <Button icon={<UploadCloud className="size-4" />} onClick={onUpload}>
              {t('files.upload')}
            </Button>
          </div>

          {/* stacked meter */}
          <div className="mt-5">
            <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-[var(--surface-3)]" onPointerLeave={() => setHover(null)}>
              {byKind.map((k, i) => (
                <motion.button
                  type="button"
                  key={k.kind}
                  aria-label={`${t(`files.kind.${k.kind}`)} · ${formatBytes(k.size)}`}
                  title={`${t(`files.kind.${k.kind}`)} · ${formatBytes(k.size)}`}
                  onPointerEnter={() => setHover(k.kind)}
                  onClick={() => onKind(k.kind)}
                  className="relative h-full border-r-2 border-[var(--surface)] last:border-r-0"
                  style={{ background: KIND_COLOR[k.kind], minWidth: 6 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0.8, (k.size / PLAN_BYTES) * 100)}%`, opacity: hover && hover !== k.kind ? 0.4 : 1 }}
                  transition={{ width: { duration: 1.1, ease: EASE_OUT, delay: 0.15 + i * 0.08 }, opacity: { duration: 0.2 } }}
                />
              ))}
              <span className="pointer-events-none absolute inset-0 animate-[shimmer_2.8s_linear_infinite] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.35)_50%,transparent_70%)] bg-[length:200%_100%]" />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11.5px] text-ink-3">
              <span>{t('files.storage.used', { pct: pct < 1 ? pct.toFixed(1) : Math.round(pct) })}</span>
              <span>{t('files.storage.free', { size: formatBytes(PLAN_BYTES - used) })}</span>
            </div>
          </div>

          {/* legend */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {byKind.map((k) => (
              <motion.button
                key={k.kind}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onPointerEnter={() => setHover(k.kind)}
                onPointerLeave={() => setHover(null)}
                onClick={() => onKind(k.kind)}
                className={cn('inline-flex h-8 items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] transition-opacity', hover && hover !== k.kind && 'opacity-50')}
              >
                <span className="size-2.5 rounded-full" style={{ background: KIND_COLOR[k.kind] }} />
                <span className="font-medium">{t(`files.kind.${k.kind}`)}</span>
                <span className="font-mono text-[11px] text-ink-3">{formatBytes(k.size)}</span>
              </motion.button>
            ))}
          </div>

          {/* mini stats */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MiniStat label={t('files.stats.files')} value={<AnimatedCounter value={files.length} />} />
            <MiniStat
              label={t('files.stats.thisWeek')}
              value={
                <span className="inline-flex items-center gap-1.5">
                  <AnimatedCounter value={thisWeek.length} />
                  <span className="text-[12px] font-normal text-ink-3">+{formatBytes(weekBytes)}</span>
                </span>
              }
              icon={<TrendingUp className="size-3.5 text-success" />}
            />
            <div className="col-span-2 rounded-2xl bg-[var(--surface-2)] p-3 sm:col-span-1">
              <p className="text-[11.5px] text-ink-3">{t('files.stats.largest')}</p>
              <ul className="mt-1.5 space-y-1">
                {largest.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => actions.preview(f)} className="flex w-full items-center gap-2 rounded-lg text-left hover:opacity-80">
                      <FileThumb file={f} iconSize="sm" className="size-6 shrink-0 rounded-[7px] [&_span]:size-6 [&_span]:rounded-[7px]" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{f.name}</span>
                      <span className="shrink-0 font-mono text-[10.5px] text-ink-3">{formatBytes(f.size)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center border-line max-lg:border-t max-lg:pt-5 lg:border-l lg:pl-6">
          {byKind.length > 0 ? (
            <DonutChart
              data={byKind.map((k) => ({ id: k.kind, label: t(`files.kind.${k.kind}`), value: k.size, color: KIND_COLOR[k.kind] }))}
              size={190}
              thickness={20}
              format={formatBytes}
              centerLabel={t('files.storage.inLibrary')}
              legend={false}
              activeId={hover}
              onSegmentClick={(id) => onKind(id as AssetKind)}
              ariaLabel={t('files.storage.breakdown')}
            />
          ) : (
            <p className="text-[13px] text-ink-3">{t('files.storage.empty')}</p>
          )}
        </div>
      </div>
    </Glass>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] p-3">
      <p className="flex items-center gap-1 text-[11.5px] text-ink-3">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[22px] font-medium leading-none tracking-[-0.03em]">{value}</p>
    </div>
  )
}

/** Black "AI" card with actionable library insights. */
export function InsightsCard({ files, onKind, onSource }: { files: FileItem[]; onKind: (k: KindFilter) => void; onSource: (s: 'chat') => void }) {
  const t = useT()
  const lang = useLang()
  const { meId, actions } = useFilesCtx()
  const recent = useMemo(() => [...files].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 4), [files])
  const addAssets = useApp((s) => s.addAssets)
  const jobs = useApp((s) => s.jobs)
  const aiOn = useApp((s) => s.settings.aiAssistant)
  const unfiled = useMemo(() => files.filter((f) => f.source === 'chat' && f.jobId), [files])
  const weekAgo = Date.now() - 7 * 864e5
  const newDeliveries = files.filter((f) => f.source === 'delivery' && new Date(f.addedAt).getTime() > weekAgo)
  const pending = files.filter((f) => f.source === 'delivery' && f.versionStatus === 'pending')
  const fileThem = (el: HTMLElement) => {
    const groups = new Map<string, Asset[]>()
    for (const f of unfiled) {
      const job = jobs.find((j) => j.id === f.jobId)
      if (!job) continue
      const arr = groups.get(job.id) ?? []
      arr.push({ id: uid('a_'), name: f.name, kind: f.kind, size: f.size, media: f.media, addedBy: f.addedBy || meId, addedAt: f.addedAt, note: f.note })
      groups.set(job.id, arr)
    }
    let n = 0
    groups.forEach((assets, jobId) => {
      addAssets(jobId, assets)
      n += assets.length
    })
    fireConfetti({ from: el, particleCount: 80 })
    toast({ title: t('files.insights.filed', { count: n, jobs: groups.size }), tone: 'success' })
  }

  const rows = [
    unfiled.length > 0 && {
      key: 'unfiled',
      icon: <FolderInput className="size-3.5" />,
      text: t('files.insights.unfiled', { count: unfiled.length }),
      cta: t('files.insights.fileThem'),
      onClick: (el: HTMLElement) => fileThem(el),
      secondary: () => onSource('chat'),
    },
    pending.length > 0 && {
      key: 'pending',
      icon: <PackageCheck className="size-3.5" />,
      text: t('files.insights.pending', { count: pending.length }),
      cta: t('files.insights.show'),
      onClick: () => onKind('delivery'),
    },
    newDeliveries.length > 0 && {
      key: 'new',
      icon: <Sparkles className="size-3.5" />,
      text: t('files.insights.newDeliveries', { count: newDeliveries.length }),
      cta: t('files.insights.show'),
      onClick: () => onKind('delivery'),
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; text: string; cta: string; onClick: (el: HTMLElement) => void; secondary?: () => void }[]

  return (
    <Glass variant="night" className="flex h-full flex-col overflow-hidden p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
      <div className="relative z-[1] flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-white/80">
          <motion.span
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.5 }}
            className="flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]"
          >
            <Sparkles className="size-3.5" />
          </motion.span>
          {t('files.insights.title')}
        </span>
        {!aiOn && <span className="font-mono text-[11px] text-white/40">{t('files.insights.off')}</span>}
      </div>
      <h3 className="relative z-[1] mt-4 text-[21px] font-medium leading-snug tracking-[-0.02em] text-white">
        {rows.length ? t('files.insights.headline', { count: rows.length }) : t('files.insights.tidy')}
      </h3>
      <ul className="relative z-[1] mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.li
              key={r.key}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { ...spring.smooth, delay: 0.2 + i * 0.08 } }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2.5 rounded-2xl bg-white/[.06] p-2.5 pl-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">{r.icon}</span>
              <button type="button" onClick={r.secondary} className={cn('min-w-0 flex-1 text-left text-[12.5px] leading-snug text-white/80', r.secondary && 'hover:text-white')}>
                {r.text}
              </button>
              <Button size="xs" variant="accent" onClick={(e) => r.onClick(e.currentTarget)}>
                {r.cta}
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {recent.length > 0 && (
        <div className="relative z-[1] mt-auto pt-4">
          <p className="border-t border-white/10 pt-3 text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">{t('files.recent')}</p>
          <ul className="mt-2 space-y-0.5">
            {recent.map((f, i) => (
              <motion.li key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.35 + i * 0.06 } }}>
                <button type="button" onClick={() => actions.preview(f)} className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/5">
                  <FileThumb file={f} iconSize="sm" className="size-7 shrink-0 overflow-hidden rounded-[8px] [&_span]:size-7 [&_span]:rounded-[8px]" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">{f.name}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-white/40">{timeAgo(f.addedAt, lang)}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </Glass>
  )
}
