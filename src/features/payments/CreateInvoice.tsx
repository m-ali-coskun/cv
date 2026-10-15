import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCheck, FilePlus2, Plus, Send, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT } from '@/lib/motion'
import { shortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { uid } from '@/lib/ids'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { ME_DESIGNER_ID, type Invoice, type Job } from '@/store/types'
import { CardHeader } from '@/components/ui/Glass'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Overlay'
import { Field, Input, Select } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { MediaView } from '@/components/art/MediaView'
import { InvoiceSheet, VAT_RATE } from './InvoiceViewer'
import { uninvoicedJobs } from './metrics'
import type { InvoiceRow } from './model'
import { Card, MonoId } from './ui'

/** Designer: approved / active jobs that still need an invoice. */
export function ReadyToInvoiceCard({ jobs, rows, onCreate, className }: { jobs: Job[]; rows: InvoiceRow[]; onCreate: (jobId?: string) => void; className?: string }) {
  const t = useT()
  const lang = useLang()
  const clients = useApp((s) => s.clients)
  const currency = useApp((s) => s.settings.currency)
  const list = useMemo(() => uninvoicedJobs(jobs, rows), [jobs, rows])
  const total = list.reduce((a, j) => a + j.budget, 0)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={t('payments.ready.title')}
        subtitle={list.length ? t('payments.ready.subtitle', { count: list.length, amount: formatMoney(total, currency, lang) }) : t('payments.ready.subtitleNone')}
        icon={<FilePlus2 className="size-5 text-ink-3" />}
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => onCreate()}>
            <span className="hidden sm:inline">{t('payments.ready.new')}</span>
          </Button>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<CheckCheck />}
          title={t('payments.ready.emptyTitle')}
          description={t('payments.ready.emptyBody')}
          action={
            <Button variant="soft" size="sm" icon={<Plus className="size-4" />} onClick={() => onCreate()}>
              {t('payments.ready.extra')}
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="relative z-[1] mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {list.slice(0, 4).map((j, i) => {
              const client = clients.find((c) => c.id === j.clientId)
              return (
                <motion.li
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.05, duration: 0.45, ease: EASE_OUT } }}
                  exit={{ opacity: 0, x: 30, scale: 0.96, filter: 'blur(6px)', transition: { duration: 0.25 } }}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-2 pr-2.5"
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-[14px]">
                    <MediaView media={j.cover} playBadge={false} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{j.title}</span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <MonoId className="text-[11.5px]">{j.id}</MonoId>
                      <span className="truncate">· {client?.name}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 sm:block">
                    <StatusBadge status={j.status} size="xs" />
                  </span>
                  <Button size="xs" icon={<Send className="size-3.5" />} onClick={() => onCreate(j.id)}>
                    {formatMoney(j.budget, j.currency, lang, true)}
                  </Button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}

interface Line {
  id: string
  label: string
  amount: string
}

const DUE_OPTIONS = ['7', '14', '30'] as const
type DueOpt = (typeof DUE_OPTIONS)[number]

/** Invoice builder with a live, printable preview. */
export function InvoiceBuilderModal({ open, onClose, jobId, onCreated }: { open: boolean; onClose: () => void; jobId?: string; onCreated: (inv: Invoice) => void }) {
  const t = useT()
  const lang = useLang()
  const allJobs = useApp((s) => s.jobs)
  const invoices = useApp((s) => s.invoices)
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const createInvoice = useApp((s) => s.createInvoice)
  const updateInvoice = useApp((s) => s.updateInvoice)
  const jobs = useMemo(
    () => allJobs.filter((j) => j.designerId === ME_DESIGNER_ID && !['requested', 'declined', 'cancelled'].includes(j.status)),
    [allJobs],
  )
  const [selected, setSelected] = useState<string>('')
  const [lines, setLines] = useState<Line[]>([])
  const [due, setDue] = useState<DueOpt>('14')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)

  const job = jobs.find((j) => j.id === selected)
  const existing = invoices.filter((i) => i.jobId === selected && i.status !== 'draft')

  const prefill = (j: Job | undefined) => {
    if (!j) return setLines([])
    const has = invoices.some((i) => i.jobId === j.id && i.status !== 'draft')
    if (!has && j.deliverables.length > 1 && j.deliverables.length <= 4) {
      const per = Math.floor(j.budget / j.deliverables.length / 10) * 10
      const rest = j.budget - per * (j.deliverables.length - 1)
      setLines(j.deliverables.map((d, i) => ({ id: uid('li_'), label: d.label, amount: String(i === j.deliverables.length - 1 ? rest : per) })))
    } else if (!has) setLines([{ id: uid('li_'), label: j.title, amount: String(j.budget) }])
    else setLines([{ id: uid('li_'), label: `Additional work — ${j.title}`, amount: String(Math.max(100, Math.round((j.budget * 0.15) / 50) * 50)) }])
  }

  useEffect(() => {
    if (!open) return
    const first = jobId ?? jobs.find((j) => !invoices.some((i) => i.jobId === j.id && i.status !== 'draft'))?.id ?? jobs[0]?.id ?? ''
    setSelected(first)
    prefill(jobs.find((j) => j.id === first))
    setDue('14')
    setTried(false)
    setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId])

  const parsed = lines.map((l) => ({ label: l.label.trim(), amount: Math.round(Number(l.amount.replace(',', '.')) * 100) / 100 }))
  const total = parsed.reduce((a, l) => a + (Number.isFinite(l.amount) ? l.amount : 0), 0)
  const lineErr = parsed.some((l) => !l.label || !Number.isFinite(l.amount) || l.amount <= 0)
  const valid = !!job && lines.length > 0 && !lineErr && total > 0
  const dueAt = new Date(Date.now() + Number(due) * 864e5).toISOString()

  const presets = job
    ? [
        { key: 'rush', label: 'Rush delivery (+15%)', amount: Math.round((job.budget * 0.15) / 10) * 10 },
        { key: 'revision', label: 'Extra revision round', amount: 250 },
        { key: 'source', label: 'Source files & licensing', amount: 180 },
      ]
    : []

  const previewRow: InvoiceRow | null = job
    ? {
        inv: {
          id: t('payments.builder.draftId'),
          jobId: job.id,
          clientId: job.clientId,
          designerId: job.designerId,
          amount: total,
          currency: job.currency,
          status: 'pending',
          issuedAt: new Date().toISOString(),
          dueAt,
          lineItems: parsed.filter((l) => l.label).map((l) => ({ label: l.label, amount: Number.isFinite(l.amount) ? l.amount : 0 })),
        },
        status: 'pending',
        job,
        discipline: job.discipline,
        designer: designers.find((d) => d.id === job.designerId),
        client: clients.find((c) => c.id === job.clientId),
        counterpart: clients.find((c) => c.id === job.clientId),
        counterpartId: job.clientId,
      }
    : null

  const submit = () => {
    setTried(true)
    if (!valid || !job) return
    setSaving(true)
    window.setTimeout(() => {
      const inv = createInvoice(job.id)
      if (!inv) {
        setSaving(false)
        return
      }
      const lineItems = parsed.map((l) => ({ label: l.label, amount: l.amount }))
      updateInvoice(inv.id, { lineItems, amount: total, dueAt })
      fireConfetti({ from: submitRef.current, particleCount: 120 })
      toast({
        title: t('payments.builder.created', { id: inv.id }),
        description: `${formatMoney(total, job.currency, lang)} · ${clients.find((c) => c.id === job.clientId)?.name ?? ''}`,
        tone: 'success',
      })
      onCreated({ ...inv, lineItems, amount: total, dueAt })
      onClose()
    }, 600)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={t('payments.builder.title')}
      description={t('payments.builder.subtitle')}
      footer={
        <>
          <span className="mr-auto hidden font-mono text-[13px] text-ink-2 sm:inline">
            {t('payments.builder.total')}: <span className="font-semibold text-ink">{formatMoney(total, job?.currency ?? 'EUR', lang)}</span>
          </span>
          <Button variant="outline" onClick={onClose}>
            {t('core.action.cancel')}
          </Button>
          <Button ref={submitRef} onClick={submit} loading={saving} icon={<Send className="size-4" />} disabled={!jobs.length}>
            {t('payments.builder.send')}
          </Button>
        </>
      }
    >
      {jobs.length === 0 ? (
        <EmptyState icon={<FilePlus2 />} title={t('payments.builder.noJobs')} description={t('payments.builder.noJobsBody')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-4">
            <Field label={t('payments.builder.job')}>
              <Select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value)
                  prefill(jobs.find((j) => j.id === e.target.value))
                }}
              >
                {jobs.map((j) => {
                  const inv = invoices.find((i) => i.jobId === j.id && i.status !== 'draft')
                  return (
                    <option key={j.id} value={j.id}>
                      {j.id} · {j.title}
                      {inv ? ` (${inv.id})` : ''}
                    </option>
                  )
                })}
              </Select>
            </Field>
            {existing.length > 0 && (
              <p className="rounded-xl bg-warning-soft px-3 py-2 text-[12px] text-[color-mix(in_oklab,var(--warning)_55%,var(--ink))]">
                {t('payments.builder.existing', { ids: existing.map((i) => i.id).join(', ') })}
              </p>
            )}

            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-2">{t('payments.builder.lines')}</p>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {lines.map((l, i) => {
                    const p = parsed[i]
                    const bad = tried && (!p.label || !Number.isFinite(p.amount) || p.amount <= 0)
                    return (
                      <motion.li
                        key={l.id}
                        layout
                        initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                        exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right font-mono text-[11.5px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                          <Input
                            value={l.label}
                            onChange={(e) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))}
                            placeholder={t('payments.builder.linePh')}
                            aria-label={t('payments.builder.linePh')}
                            className={cn('h-10', bad && !p.label && 'border-danger')}
                          />
                          <Input
                            value={l.amount}
                            inputMode="decimal"
                            onChange={(e) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, amount: e.target.value.replace(/[^\d.,]/g, '') } : x)))}
                            aria-label={t('payments.builder.amount')}
                            className={cn('h-10 w-24 text-right font-mono sm:w-28', bad && (!Number.isFinite(p.amount) || p.amount <= 0) && 'border-danger')}
                          />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                            aria-label={t('core.action.remove')}
                            title={t('core.action.remove')}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </motion.button>
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
              {tried && lineErr && <p className="mt-1.5 text-[12px] text-danger">{t('payments.builder.lineErr')}</p>}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Button size="xs" variant="outline" icon={<Plus className="size-3.5" />} onClick={() => setLines((ls) => [...ls, { id: uid('li_'), label: '', amount: '' }])}>
                  {t('payments.builder.addLine')}
                </Button>
                {presets.map((p) => (
                  <Button
                    key={p.key}
                    size="xs"
                    variant="soft"
                    icon={<Sparkles className="size-3.5" />}
                    onClick={() => setLines((ls) => [...ls, { id: uid('li_'), label: p.label, amount: String(p.amount) }])}
                  >
                    {t(`payments.builder.preset.${p.key}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-ink-2">{t('payments.builder.dueIn')}</span>
              <Segmented<DueOpt> size="sm" value={due} onChange={setDue} options={DUE_OPTIONS.map((d) => ({ value: d, label: t('payments.builder.days', { count: Number(d) }) }))} />
            </div>

            <dl className="space-y-1 rounded-2xl bg-[var(--surface-2)] p-3.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-3">{t('payments.viewer.net')}</dt>
                <dd className="font-mono tabular-nums">{formatMoney(total / (1 + VAT_RATE), job?.currency ?? 'EUR', lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">{t('payments.viewer.vat', { rate: Math.round(VAT_RATE * 100) })}</dt>
                <dd className="font-mono tabular-nums">{formatMoney(total - total / (1 + VAT_RATE), job?.currency ?? 'EUR', lang)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-1.5">
                <dt className="font-medium">{t('payments.builder.total')}</dt>
                <dd className="font-mono text-[17px] font-semibold tabular-nums">{formatMoney(total, job?.currency ?? 'EUR', lang)}</dd>
              </div>
              <p className="pt-1 text-[11.5px] text-ink-3">{t('payments.builder.dueOn', { date: shortDate(dueAt, lang) })}</p>
            </dl>
          </div>

          <div className="relative hidden min-w-0 lg:block">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('payments.builder.preview')}</p>
            <div className="relative max-h-[560px] overflow-hidden rounded-[22px] bg-[var(--surface-2)] p-3 [mask-image:linear-gradient(#000_82%,transparent)]">
              <div className="origin-top-left scale-[0.78]" style={{ width: '128.2%' }}>
                {previewRow && <InvoiceSheet row={previewRow} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
