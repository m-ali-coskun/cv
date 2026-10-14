import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ExternalLink, FolderOpen, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useT } from '@/i18n'
import type { Job, MediaRef } from '@/store/types'
import { toast } from '@/store/toasts'
import { formatBytes } from '@/lib/format'
import { spring } from '@/lib/motion'
import { FolderCard } from '@/components/ui/FolderCard'
import { Lightbox } from '@/components/ui/Lightbox'
import { MediaView } from '@/components/art/MediaView'
import { Tooltip } from '@/components/ui/Tooltip'

/** Palette swatches (click = copy hex), fonts, mood chips, do/don't and the brief's assets folder. */
export function StyleGuidePreview({ job, compact }: { job: Job; compact?: boolean }) {
  const t = useT()
  const sg = job.styleGuide
  const [copied, setCopied] = useState<string | null>(null)
  const [lb, setLb] = useState<number | null>(null)
  const folderRef = useRef<HTMLDivElement>(null)
  const visual = job.assets.filter((a) => a.kind === 'image' || a.kind === 'video')
  const media: MediaRef[] = (visual.length ? visual : job.assets).map((a) => a.media)
  const total = job.assets.reduce((n, a) => n + a.size, 0)

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex)
    } catch {
      /* clipboard blocked — still show the value */
    }
    setCopied(hex)
    toast({ title: t('jobs.sg.copied', { hex }), duration: 1600 })
    setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1400)
  }

  return (
    <div className="flex flex-col gap-4">
      {sg.palette.length > 0 && (
        <div>
          <Label>{t('jobs.sg.palette')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {sg.palette.map((hex, i) => (
              <Tooltip key={hex + i} content={<span className="font-mono">{hex.toUpperCase()}</span>}>
                <motion.button
                  type="button"
                  onClick={() => copy(hex)}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0, transition: { ...spring.bouncy, delay: 0.15 + i * 0.05 } }}
                  whileHover={{ y: -4, scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={hex}
                  className="relative flex size-9 items-center justify-center rounded-[12px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.08),0_6px_14px_-8px_rgba(0,0,0,.4)]"
                  style={{ background: hex }}
                >
                  {copied === hex && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-white/85 p-0.5 text-[#0b0b0c]">
                      <Check className="size-3" />
                    </motion.span>
                  )}
                </motion.button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {sg.fonts.length > 0 && (
        <div>
          <Label>{t('jobs.sg.fonts')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {sg.fonts.map((f) => (
              <span key={f} className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-[var(--surface)] px-2.5 shadow-[0_1px_2px_rgba(0,0,0,.05)]">
                <span className="text-[17px] font-semibold leading-none tracking-[-0.03em]" style={{ fontFamily: `'${f}', var(--font-sans)` }}>
                  Aa
                </span>
                <span className="text-[12px] text-ink-2">{f}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {sg.mood.length > 0 && (
        <div>
          <Label>{t('jobs.sg.mood')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {sg.mood.map((m, i) => (
              <motion.span
                key={m}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.05 } }}
                className="inline-flex h-7 items-center rounded-full bg-accent-soft px-2.5 text-[12px] font-medium text-accent-text"
              >
                {m}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {!compact && (sg.dos.length > 0 || sg.donts.length > 0) && (
        <div className="grid grid-cols-1 gap-1.5 text-[12px] sm:grid-cols-2">
          {sg.dos.slice(0, 2).map((d) => (
            <span key={d} className="flex items-start gap-1.5 text-ink-2">
              <ThumbsUp className="mt-px size-3.5 shrink-0 text-[var(--success)]" /> {d}
            </span>
          ))}
          {sg.donts.slice(0, 2).map((d) => (
            <span key={d} className="flex items-start gap-1.5 text-ink-2">
              <ThumbsDown className="mt-px size-3.5 shrink-0 text-danger" /> {d}
            </span>
          ))}
        </div>
      )}

      {job.assets.length > 0 && (
        <div>
          <Label>{t('jobs.sg.assets')}</Label>
          <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end min-[420px]:gap-4">
            <div ref={folderRef} className="w-[150px] shrink-0">
              <FolderCard
                size="sm"
                items={media.slice(0, 3)}
                title={t('jobs.sg.folder')}
                subtitle={`${job.assets.length} · ${formatBytes(total)}`}
                onClick={() => setLb(0)}
                icon={<FolderOpen className="size-4" />}
                ariaLabel={t('jobs.sg.openAssets')}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1 max-[419px]:-mx-1.5">
              {job.assets.slice(0, 3).map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setLb(Math.max(0, media.indexOf(a.media) >= 0 ? media.indexOf(a.media) : i))}
                  className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-[var(--surface)]"
                >
                  <span className="size-7 shrink-0 overflow-hidden rounded-lg">
                    <MediaView media={a.media} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{a.name}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-3">{formatBytes(a.size)}</span>
                </button>
              ))}
              {sg.references[0] && (
                <a
                  href={sg.references[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-1.5 text-[12px] font-medium text-accent-text hover:underline"
                >
                  <ExternalLink className="size-3.5" /> {sg.references[0].label}
                </a>
              )}
            </div>
          </div>
          <Lightbox
            items={media}
            index={lb}
            onClose={() => setLb(null)}
            onIndexChange={setLb}
            title={job.title}
            captions={(visual.length ? visual : job.assets).map((a) => a.name)}
            originFor={() => folderRef.current}
          />
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-3">{children}</p>
}
