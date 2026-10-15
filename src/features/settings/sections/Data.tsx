import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Database, FileDown, FileJson, HardDrive, Lock, RefreshCw, RotateCcw, ServerOff, ShieldCheck, Upload, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { formatBytes } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Button } from '@/components/ui/Button'
import { Dropzone } from '@/components/ui/Dropzone'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { exportData, importData, storageReport, type ImportResult, type StorageReport } from '../lib/dataIO'
import { usePrefs } from '../lib/prefs'
import { GroupLabel, IconTile, SectionHeader, SettingsCard, useFlash } from '../ui'
import { SECTIONS } from '../sections'

const SLICE_COLORS = { jobs: 'var(--accent)', messages: '#3E8EF7', people: '#FF61F6', other: '#F5A524', files: '#2EE6C5' }

function useStorage() {
  const [report, setReport] = useState<StorageReport | null>(null)
  const [loading, setLoading] = useState(false)
  const jobs = useApp((s) => s.jobs)
  const messages = useApp((s) => s.messages)
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setReport(await storageReport())
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh, jobs, messages])
  return { report, loading, refresh }
}

function StorageCard() {
  const t = useT()
  const { report, loading, refresh } = useStorage()
  const counts = {
    jobs: useApp((s) => s.jobs.length),
    messages: useApp((s) => s.messages.length),
    conversations: useApp((s) => s.conversations.length),
    notifications: useApp((s) => s.notifications.length),
    people: useApp((s) => s.designers.length + s.clients.length),
    events: useApp((s) => s.events.length),
  }
  const { ref, controls } = useFlash('storage')
  const segments = report
    ? ([
        { id: 'jobs', bytes: report.slices.jobs },
        { id: 'messages', bytes: report.slices.messages },
        { id: 'people', bytes: report.slices.people },
        { id: 'other', bytes: report.slices.other },
        { id: 'files', bytes: report.files.bytes },
      ] as const)
    : []
  const total = report ? report.localStorage + report.files.bytes : 0
  const unitMB = total >= 1024 * 1024
  const shown = unitMB ? total / 1024 / 1024 : total / 1024
  const quotaPct = report?.usage && report.quota ? Math.max(0.4, (report.usage / report.quota) * 100) : 0

  return (
    <SettingsCard>
      <motion.div ref={ref} animate={controls} id="set-storage" className="relative z-[1] -m-2 rounded-[22px] p-2">
        <GroupLabel
          right={
            <Button size="xs" variant="ghost" onClick={() => void refresh()} icon={<RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />}>
              {t('settings.data.refresh')}
            </Button>
          }
        >
          {t('settings.data.storage')}
        </GroupLabel>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-end gap-3">
              <p className="text-[44px] font-medium leading-none tracking-[-0.05em] text-ink">
                <AnimatedCounter value={Number(shown.toFixed(1))} decimals={1} suffix={unitMB ? ' MB' : ' KB'} startOnView={false} />
              </p>
              <p className="pb-1 text-[12.5px] text-ink-3">{t('settings.data.used')}</p>
            </div>
            {/* stacked bar */}
            <div className="mt-4 flex h-4 w-full gap-1 overflow-hidden rounded-full">
              {segments.map((s, i) => (
                <motion.span
                  key={s.id}
                  className="h-full rounded-full"
                  style={{ background: SLICE_COLORS[s.id] }}
                  initial={{ flexGrow: 0, opacity: 0 }}
                  animate={{ flexGrow: Math.max(s.bytes, total * 0.015), opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.08 * i, ease: EASE_OUT }}
                />
              ))}
              {!report && <span className="h-full flex-1 animate-pulse rounded-full bg-[var(--surface-3)]" />}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2">
              {segments.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: SLICE_COLORS[s.id] }} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{t(`settings.data.slice.${s.id}`)}</span>
                  <span className="font-mono text-[11.5px] text-ink-3">{formatBytes(s.bytes)}</span>
                </li>
              ))}
            </ul>
            <div className="tile mt-4 flex items-center gap-3 p-3">
              <HardDrive className="size-4 shrink-0 text-ink-3" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-ink-2">{t('settings.data.quota')}</span>
                  <span className="font-mono text-ink-3">
                    {report?.usage !== undefined && report.quota ? `${formatBytes(report.usage)} / ${formatBytes(report.quota)}` : '—'}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <motion.div className="h-full rounded-full bg-ink" initial={{ width: 0 }} animate={{ width: `${quotaPct}%` }} transition={{ duration: 0.9, ease: EASE_OUT }} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {(
              [
                ['jobs', counts.jobs],
                ['messages', counts.messages],
                ['conversations', counts.conversations],
                ['notifications', counts.notifications],
                ['people', counts.people],
                ['files', report?.files.count ?? 0],
              ] as const
            ).map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.snappy, delay: 0.04 * i }}
                className="tile p-3"
              >
                <p className="font-mono text-[22px] font-medium leading-none tracking-[-0.03em] text-ink">
                  <AnimatedCounter value={v} startOnView={false} />
                </p>
                <p className="mt-1 truncate text-[11.5px] text-ink-3">{t(`settings.data.count.${k}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </SettingsCard>
  )
}

export function DataSection() {
  const t = useT()
  const navigate = useNavigate()
  const resetDemo = useApp((s) => s.resetDemo)
  const meta = SECTIONS.find((s) => s.id === 'data')!
  const [result, setResult] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const exportFlash = useFlash('export')
  const importFlash = useFlash('import')
  const resetFlash = useFlash('reset')

  const onExport = () => {
    const size = exportData()
    toast({ title: t('settings.data.exported'), description: formatBytes(size), tone: 'success' })
  }

  const onImport = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setBusy(true)
    const res = await importData(file)
    setBusy(false)
    setResult(res)
    if (res.ok) {
      toast({ title: t('settings.data.imported'), description: t('settings.data.importedDesc', { jobs: res.counts.jobs, people: res.counts.people }), tone: 'success' })
      fireConfetti({ particleCount: 90 })
    } else {
      toast({ title: t('settings.data.importFailed'), description: t(`settings.data.error.${res.error}`), tone: 'error' })
    }
  }

  return (
    <>
      <SectionHeader icon={meta.icon} color={meta.color} title={t('settings.nav.data')} description={t('settings.data.desc')} />

      <StorageCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard>
          <motion.div ref={exportFlash.ref} animate={exportFlash.controls} id="set-export" className="relative z-[1] -m-2 flex h-full flex-col gap-4 rounded-[22px] p-2">
            <div className="flex items-start gap-3.5">
              <IconTile icon={FileDown} color="#3E8EF7" size={44} />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">{t('settings.data.export')}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{t('settings.data.exportDesc')}</p>
              </div>
            </div>
            <div className="tile flex items-center gap-3 p-3 font-mono text-[11.5px] text-ink-3">
              <FileJson className="size-4 shrink-0" />
              <span className="truncate">designtab-backup-{new Date().toISOString().slice(0, 10)}.json</span>
            </div>
            <Button className="mt-auto self-start" icon={<FileDown className="size-4" />} onClick={onExport}>
              {t('settings.data.exportCta')}
            </Button>
          </motion.div>
        </SettingsCard>

        <SettingsCard>
          <motion.div ref={importFlash.ref} animate={importFlash.controls} id="set-import" className="relative z-[1] -m-2 flex h-full flex-col gap-4 rounded-[22px] p-2">
            <div className="flex items-start gap-3.5">
              <IconTile icon={Upload} color="#2FB36B" size={44} />
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">{t('settings.data.import')}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{t('settings.data.importDesc')}</p>
              </div>
            </div>
            <Dropzone onFiles={(f) => void onImport(f)} accept="application/json,.json" multiple={false} compact>
              <motion.span
                className="flex size-10 items-center justify-center rounded-2xl bg-accent text-accent-ink"
                animate={busy ? { rotate: 360 } : { rotate: 0 }}
                transition={busy ? { repeat: Infinity, duration: 1, ease: 'linear' } : spring.snappy}
              >
                {busy ? <RefreshCw className="size-4" /> : <FileJson className="size-4" />}
              </motion.span>
              <p className="text-[13.5px] font-medium">{t('settings.data.importDrop')}</p>
            </Dropzone>
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  key={result.ok ? 'ok' : result.error}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6 }}
                  className={cn('flex items-start gap-2.5 rounded-[16px] p-3 text-[12.5px]', result.ok ? 'bg-success-soft text-ink' : 'bg-danger-soft text-ink')}
                >
                  {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />}
                  <span>
                    {result.ok
                      ? t('settings.data.importedDetail', { jobs: result.counts.jobs, messages: result.counts.messages, people: result.counts.people })
                      : t(`settings.data.error.${result.error}`) + (result.detail ? ` (${result.detail})` : '')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </SettingsCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SettingsCard className="overflow-hidden border-[color-mix(in_oklab,var(--danger)_30%,transparent)]">
          <motion.div ref={resetFlash.ref} animate={resetFlash.controls} id="set-reset" className="relative z-[1] -m-2 flex h-full flex-col gap-4 rounded-[22px] p-2">
            <div className="flex items-start gap-3.5">
              <motion.span
                className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-danger-soft text-danger"
                whileHover={{ rotate: -180 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              >
                <RotateCcw className="size-5" />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
                  {t('settings.data.reset')}
                  <span className="whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-danger">{t('settings.data.danger')}</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{t('settings.data.resetDesc')}</p>
              </div>
            </div>
            <Button variant="danger" className="mt-auto self-start" icon={<AlertTriangle className="size-4" />} onClick={() => setConfirm(true)}>
              {t('settings.data.resetCta')}
            </Button>
          </motion.div>
        </SettingsCard>

        <SettingsCard variant="night" className="overflow-hidden">
          <div className="relative z-[1] flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[13px] bg-accent text-accent-ink">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-[15px] font-medium">{t('settings.data.privacy')}</p>
          </div>
          <ul className="relative z-[1] mt-4 flex flex-col gap-2.5">
            {[
              { icon: ServerOff, text: t('settings.data.privacy.p1') },
              { icon: Database, text: t('settings.data.privacy.p2') },
              { icon: Lock, text: t('settings.data.privacy.p3') },
            ].map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: EASE_OUT }}
                className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-on-night/75"
              >
                <p.icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                {p.text}
              </motion.li>
            ))}
          </ul>
        </SettingsCard>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="danger"
        title={t('settings.data.resetConfirmTitle')}
        description={t('settings.data.resetConfirmDesc')}
        confirmLabel={t('settings.data.resetCta')}
        requireText="reset"
        icon={<RotateCcw />}
        onConfirm={async () => {
          await resetDemo()
          usePrefs.getState().clearRecents()
          toast({ title: t('settings.data.resetDone'), description: t('settings.data.resetDoneDesc'), tone: 'success' })
          navigate('/overview')
        }}
      />
    </>
  )
}
