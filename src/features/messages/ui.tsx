import { Fragment, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { disciplineTheme } from '@/theme/disciplines'
import { Avatar } from '@/components/ui/Avatar'
import type { Job } from '@/store/types'
import { isDesignerP, tokenize, type Person, type Presence } from './model'

/** Keyframes used by the chat (scoped names; injected once per page). */
export function ChatKeyframes() {
  return (
    <style>{`
@keyframes msg-vbar { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(.45) } }
@keyframes msg-rec { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
@keyframes msg-flash { 0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 70%, transparent) } 100% { box-shadow: 0 0 0 14px transparent } }
@keyframes msg-ring { 0% { transform: scale(.8); opacity: .7 } 100% { transform: scale(2.1); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .msg-anim { animation: none !important } }
`}</style>
  )
}

export function PersonAvatar({ person, size = 40, status, className }: { person: Person | undefined; size?: number; status?: Presence; className?: string }) {
  if (!person) return <Avatar seed="unknown" size={size} className={className} />
  if (isDesignerP(person)) return <Avatar seed={person.avatarSeed} media={person.avatar} size={size} status={status} className={className} />
  return <Avatar kind="brand" name={person.name} color={person.logoColor} seed={person.avatarSeed} size={size} status={status} className={className} />
}

/** Three bouncing dots (typing indicator). */
export function TypingDots({ className, dot = 'bg-current', size = 6 }: { className?: string; dot?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-[3px]', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn('rounded-full', dot)}
          style={{ width: size, height: size }}
          animate={{ y: [0, -size * 0.7, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

/** Highlights `query` occurrences inside a string. */
export function highlight(text: string, query?: string): ReactNode {
  const q = query?.trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  const out: ReactNode[] = []
  let i = 0
  let j = lower.indexOf(ql, i)
  while (j !== -1) {
    if (j > i) out.push(text.slice(i, j))
    out.push(
      <mark key={j} className="rounded-[4px] bg-accent px-0.5 text-accent-ink">
        {text.slice(j, j + q.length)}
      </mark>,
    )
    i = j + q.length
    j = lower.indexOf(ql, i)
  }
  out.push(text.slice(i))
  return out
}

/** Message text with clickable links, job mentions (DT-1234) and search highlight. */
export function RichText({ text, query, onJob, className, linkClass }: { text: string; query?: string; onJob?: (id: string) => void; className?: string; linkClass?: string }) {
  const tokens = tokenize(text)
  return (
    <span className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere]', className)}>
      {tokens.map((tk, i) =>
        tk.t === 'text' ? (
          <Fragment key={i}>{highlight(tk.v, query)}</Fragment>
        ) : tk.t === 'link' ? (
          <a key={i} href={tk.v} target="_blank" rel="noreferrer noopener" className={cn('underline decoration-1 underline-offset-2 hover:opacity-80', linkClass)} onClick={(e) => e.stopPropagation()}>
            {highlight(tk.v.replace(/^https?:\/\//, ''), query)}
          </a>
        ) : (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onJob?.(tk.v)
            }}
            className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded-md bg-accent px-1.5 py-px align-middle font-mono text-[0.82em] font-semibold text-accent-ink transition-transform hover:scale-105 active:scale-95"
          >
            {tk.v}
          </button>
        ),
      )}
    </span>
  )
}

/** Mono job id pill with the discipline colour dot. */
export function JobChip({ job, onClick, className, active }: { job: Job; onClick?: () => void; className?: string; active?: boolean }) {
  const d = disciplineTheme(job.discipline)
  const cls = cn(
    'inline-flex h-5.5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 font-mono text-[10.5px] font-medium tracking-tight',
    active ? 'bg-white/15 text-current dark:bg-black/10' : 'bg-[var(--surface-2)] text-ink-2',
    onClick && 'transition-colors hover:bg-[var(--surface-3)]',
    className,
  )
  const inner = (
    <>
      <span className="size-1.5 rounded-full" style={{ background: d.accent, boxShadow: `0 0 0 2px color-mix(in oklab, ${d.accent} 25%, transparent)` }} />
      {job.id}
    </>
  )
  if (!onClick)
    return (
      <span className={cls} title={job.title}>
        {inner}
      </span>
    )
  return (
    <motion.button
      type="button"
      title={job.title}
      whileTap={{ scale: 0.94 }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cls}
    >
      {inner}
    </motion.button>
  )
}

/** Popovers nested in glass lose their backdrop blur — give them a near-solid surface. */
export const POPOVER_SURFACE = 'bg-[color-mix(in_oklab,var(--surface)_96%,transparent)] dark:bg-[color-mix(in_oklab,var(--surface-2)_97%,transparent)]'

/** Small uppercase mono section label (reference: "PERMITTING"). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-3', className)}>{children}</p>
}
