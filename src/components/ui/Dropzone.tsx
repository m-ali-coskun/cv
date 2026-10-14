import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { UploadCloud } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'

/** Drag & drop + click-to-browse file picker. Calls onFiles with the selection. */
export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  className,
  children,
  compact,
}: {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  className?: string
  children?: ReactNode
  compact?: boolean
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
      }}
      animate={{ scale: over ? 1.02 : 1 }}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-5' : 'px-6 py-10',
        over ? 'border-[var(--accent)] bg-accent-softer' : 'border-line-2 hover:border-[var(--ink-4)] hover:bg-[var(--surface-2)]',
        className,
      )}
    >
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
      {children ?? (
        <>
          <motion.span
            className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-ink"
            animate={over ? { y: -6, rotate: -6 } : { y: 0, rotate: 0 }}
          >
            <UploadCloud className="size-5" />
          </motion.span>
          <p className="text-[14px] font-medium">{t('core.common.dropFiles')}</p>
          {!compact && <p className="text-[12.5px] text-ink-3">{t('core.common.dropHint')}</p>}
        </>
      )}
    </motion.div>
  )
}
