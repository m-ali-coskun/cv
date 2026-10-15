import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUp,
  ArrowUpRight,
  CalendarPlus,
  Check,
  ChevronLeft,
  CornerUpLeft,
  FilePlus2,
  Loader2,
  MessageSquareText,
  Mic,
  PackageCheck,
  Paperclip,
  Pencil,
  RotateCcw,
  Smile,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { EASE_OUT, spring } from '@/lib/motion'
import { deleteFile, saveFile } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { uid } from '@/lib/ids'
import { useT } from '@/i18n'
import { statusText, useApp } from '@/store'
import { toast } from '@/store/toasts'
import type { Conversation, Job, MediaRef, Message, Role } from '@/store/types'
import { MediaView } from '@/components/art/MediaView'
import { Menu } from '@/components/ui/Menu'
import { Kbd } from '@/components/ui/Badge'
import { CAN_DELIVER, CAN_REQUEST_REVISION, CLOSED, EMOJI_GROUPS, mmss, previewOf, quickReplies, type Person } from './model'
import { useMessagesPrefs } from './store'
import { blip } from './hooks'
import { POPOVER_SURFACE } from './ui'

export interface ComposerHandle {
  addFiles: (files: File[]) => void
  focus: () => void
}

interface ComposerProps {
  conv: Conversation
  role: Role
  meId: string
  counterpart?: Person
  counterpartId: string
  jobs: Job[]
  last?: Message
  replyTo: Message | null
  editing: Message | null
  onCancelReply: () => void
  onCancelEdit: () => void
  onEditLast: () => void
  onSent: () => void
}

interface PendingFile {
  id: string
  name: string
  size: number
  media?: MediaRef
}

const MAX_BYTES = 50 * 1024 * 1024
const MAX_RECORD_S = 120

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { conv, role, meId, counterpart, counterpartId, jobs, last, replyTo, editing, onCancelReply, onCancelEdit, onEditLast, onSent },
  ref,
) {
  const t = useT()
  const navigate = useNavigate()
  const sendMessage = useApp((s) => s.sendMessage)
  const editMessage = useApp((s) => s.editMessage)
  const setDraft = useApp((s) => s.setDraft)
  const addEvent = useApp((s) => s.addEvent)
  const pushEmoji = useMessagesPrefs((s) => s.pushEmoji)

  const [text, setText] = useState(conv.draft ?? '')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef(text)
  textRef.current = text
  const draftBeforeEdit = useRef<string | null>(null)

  // ── drafts: debounce to the store, flush on unmount (conversation switch)
  useEffect(() => {
    if (editing) return
    const id = window.setTimeout(() => {
      if ((useApp.getState().conversations.find((c) => c.id === conv.id)?.draft ?? '') !== text) setDraft(conv.id, text)
    }, 350)
    return () => window.clearTimeout(id)
  }, [text, conv.id, setDraft, editing])
  useEffect(
    () => () => {
      if (draftBeforeEdit.current !== null) return
      const current = useApp.getState().conversations.find((c) => c.id === conv.id)?.draft ?? ''
      if (current !== textRef.current) useApp.getState().setDraft(conv.id, textRef.current)
    },
    [conv.id],
  )

  // ── auto-grow
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(168, el.scrollHeight)}px`
  }, [text])

  const focus = useCallback(() => {
    const el = taRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    const n = el.value.length
    el.setSelectionRange(n, n)
  }, [])

  // ── edit mode
  useEffect(() => {
    if (editing) {
      if (draftBeforeEdit.current === null) draftBeforeEdit.current = textRef.current
      setText(editing.text)
      requestAnimationFrame(focus)
    } else if (draftBeforeEdit.current !== null) {
      setText(draftBeforeEdit.current)
      draftBeforeEdit.current = null
    }
  }, [editing, focus])

  useEffect(() => {
    if (replyTo) requestAnimationFrame(focus)
  }, [replyTo, focus])

  // ── attachments
  const addFiles = useCallback(
    async (list: File[]) => {
      for (const f of list.slice(0, 10)) {
        if (f.size > MAX_BYTES) {
          toast({ title: t('messages.composer.tooLarge', { name: f.name }), tone: 'error' })
          continue
        }
        const id = uid('up_')
        setFiles((a) => [...a, { id, name: f.name, size: f.size }])
        try {
          const media = await saveFile(f)
          setFiles((a) => a.map((x) => (x.id === id ? { ...x, media } : x)))
        } catch {
          setFiles((a) => a.filter((x) => x.id !== id))
          toast({ title: t('messages.composer.uploadFailed'), tone: 'error' })
        }
      }
    },
    [t],
  )
  const removeFile = (id: string) => {
    setFiles((a) => {
      const f = a.find((x) => x.id === id)
      if (f?.media?.kind === 'file') void deleteFile(f.media.fileId)
      return a.filter((x) => x.id !== id)
    })
  }

  useImperativeHandle(ref, () => ({ addFiles: (f) => void addFiles(f), focus }), [addFiles, focus])

  const insert = (s: string) => {
    const el = taRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = text.slice(0, start) + s + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + s.length, start + s.length)
    })
  }

  // ── send
  const uploading = files.some((f) => !f.media)
  const canSend = !!text.trim() || files.some((f) => f.media) || !!editing
  const send = (override?: string) => {
    const body = (override ?? text).trim()
    if (editing) {
      if (body && body !== editing.text) {
        editMessage(editing.id, body)
        toast({ title: t('messages.toast.edited'), tone: 'success', duration: 1600 })
      }
      onCancelEdit()
      return
    }
    if (uploading) {
      toast({ title: t('messages.composer.waitUpload'), tone: 'info', duration: 2000 })
      return
    }
    const ready = files.filter((f) => f.media).map((f) => f.media!)
    if (!body && !ready.length) return
    sendMessage(conv.id, {
      text: body,
      attachments: ready.length ? ready : undefined,
      kind: ready.length ? 'attachment' : 'text',
      replyToId: replyTo?.id,
    })
    if (override === undefined) setText('')
    setFiles([])
    setEmojiOpen(false)
    onCancelReply()
    blip('send')
    onSent()
  }

  // ── voice recording
  const [rec, setRec] = useState<{ start: number; locked: boolean; simulated: boolean; cancelling: boolean } | null>(null)
  const recState = useRef(rec)
  recState.current = rec
  const recMedia = useRef<{ mr?: MediaRecorder; stream?: MediaStream; chunks: Blob[] } | null>(null)
  const press = useRef<{ x: number; t: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const begin = async (locked: boolean) => {
    if (recState.current) return
    setElapsed(0)
    setRec({ start: Date.now(), locked, simulated: false, cancelling: false })
    recMedia.current = { chunks: [] }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!recMedia.current) {
        stream.getTracks().forEach((tr) => tr.stop())
        return
      }
      const mr = new MediaRecorder(stream)
      recMedia.current.mr = mr
      recMedia.current.stream = stream
      mr.ondataavailable = (e) => {
        if (e.data.size) recMedia.current?.chunks.push(e.data)
      }
      mr.start()
    } catch {
      setRec((r) => (r ? { ...r, simulated: true } : r))
    }
  }

  const finish = useCallback(
    async (cancel: boolean) => {
      const state = recState.current
      const media = recMedia.current
      if (!state) return
      recMedia.current = null
      setRec(null)
      const seconds = (Date.now() - state.start) / 1000
      const stopStream = () => media?.stream?.getTracks().forEach((tr) => tr.stop())
      if (cancel || seconds < 0.7) {
        if (media?.mr && media.mr.state !== 'inactive') media.mr.stop()
        stopStream()
        if (!cancel) toast({ title: t('messages.voice.holdHint'), tone: 'info', duration: 2200 })
        else blip('pop')
        return
      }
      const duration = Math.max(1, Math.round(seconds))
      const replyToId = replyTo?.id
      if (media?.mr && media.mr.state !== 'inactive') {
        const mr = media.mr
        await new Promise<void>((res) => {
          mr.onstop = () => res()
          mr.stop()
        })
        stopStream()
        try {
          const blob = new Blob(media.chunks, { type: mr.mimeType || 'audio/webm' })
          const ref = await saveFile(blob, `voice-note-${new Date().toISOString().slice(0, 19)}.webm`)
          sendMessage(conv.id, { kind: 'voice', text: 'Voice message', duration, attachments: [ref], replyToId })
        } catch {
          sendMessage(conv.id, { kind: 'voice', text: 'Voice message', duration, replyToId })
        }
      } else {
        stopStream()
        sendMessage(conv.id, { kind: 'voice', text: 'Voice message', duration, replyToId })
        if (state.simulated) toast({ title: t('messages.voice.simulatedTitle'), description: t('messages.voice.simulatedBody'), tone: 'info' })
      }
      onCancelReply()
      blip('send')
      onSent()
    },
    [conv.id, sendMessage, replyTo, onCancelReply, onSent, t],
  )

  useEffect(() => {
    if (!rec) return
    const id = window.setInterval(() => {
      const s = (Date.now() - rec.start) / 1000
      setElapsed(s)
      if (s >= MAX_RECORD_S) void finish(false)
    }, 200)
    return () => window.clearInterval(id)
  }, [rec, finish])

  // release the mic if the conversation changes mid-recording
  useEffect(
    () => () => {
      recMedia.current?.stream?.getTracks().forEach((tr) => tr.stop())
      recMedia.current = null
    },
    [],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
      return
    }
    if (e.key === 'Escape') {
      if (emojiOpen) setEmojiOpen(false)
      else if (editing) onCancelEdit()
      else if (replyTo) onCancelReply()
      return
    }
    if (e.key === 'ArrowUp' && !text && !editing) {
      e.preventDefault()
      onEditLast()
    }
  }

  const replies = useMemo(() => quickReplies(role, last, meId), [role, last, meId])
  const showReplies = !text && !files.length && !editing && !rec
  const name = counterpart ? ('contactName' in counterpart ? counterpart.contactName.split(' ')[0] : counterpart.name.split(' ')[0]) : ''

  return (
    <div className="relative z-[5] px-2.5 pb-2.5 pt-1 sm:px-4 sm:pb-4">
      {/* quick replies */}
      <AnimatePresence initial={false}>
        {showReplies && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="no-scrollbar mask-fade-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 pt-0.5">
              {replies.map((r, i) => (
                <motion.button
                  key={r}
                  type="button"
                  initial={{ opacity: 0, y: 10, scale: 0.9, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { delay: 0.04 * i, ...spring.snappy } }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => send(r)}
                  className="glass glass-pill h-8 shrink-0 whitespace-nowrap px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                >
                  <span className="relative z-[1]">{r}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ layout: spring.smooth }}
        className={cn(
          'glass glass-strong relative rounded-[26px] transition-shadow duration-300',
          focused && 'shadow-[0_0_0_4px_var(--accent-softer),var(--glass-shadow)]',
          editing && 'shadow-[0_0_0_2px_var(--accent-line),var(--glass-shadow)]',
        )}
      >
        {/* reply / edit banner */}
        <AnimatePresence initial={false}>
          {(replyTo || editing) && (
            <motion.div
              key={editing ? 'edit' : 'reply'}
              initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="relative z-[1] overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-3.5 pb-1 pt-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
                  {editing ? <Pencil className="size-4" /> : <CornerUpLeft className="size-4" />}
                </span>
                <div className="min-w-0 flex-1 border-l-2 border-[var(--accent)] pl-2.5">
                  <p className="text-[12px] font-medium text-accent-text">
                    {editing
                      ? t('messages.composer.editing')
                      : t('messages.composer.replyingTo', { name: replyTo!.senderId === meId ? t('messages.list.you') : (counterpart?.name ?? '') })}
                  </p>
                  <p className="truncate text-[12.5px] text-ink-2">{previewOf((editing ?? replyTo)!, t)}</p>
                </div>
                <button
                  type="button"
                  onClick={editing ? onCancelEdit : onCancelReply}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-ink-2 hover:text-ink"
                  aria-label={t('messages.action.cancel')}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* pending attachments */}
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div key="files" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative z-[1] overflow-hidden">
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-1 pt-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {files.map((f) => (
                    <motion.div
                      layout
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.6, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={spring.bouncy}
                      className="group/f relative size-[72px] shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-2)] ring-1 ring-[var(--line)]"
                      title={`${f.name} · ${formatBytes(f.size)}`}
                    >
                      {f.media ? (
                        <MediaView media={f.media} />
                      ) : (
                        <span className="flex size-full items-center justify-center text-ink-3">
                          <Loader2 className="size-5 animate-spin" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3 font-mono text-[9px] text-white">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="absolute right-1 top-1 flex size-5.5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-transform hover:scale-110"
                        aria-label={t('messages.composer.removeFile')}
                      >
                        <X className="size-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-[1] flex items-end gap-1 p-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {rec ? (
              <RecordingBar
                key="rec"
                elapsed={elapsed}
                locked={rec.locked}
                cancelling={rec.cancelling}
                simulated={rec.simulated}
                onCancel={() => void finish(true)}
                onSend={() => void finish(false)}
              />
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
                className="flex min-w-0 flex-1 items-end gap-0.5"
              >
                <div className="flex shrink-0 items-center">
                  <ShortcutsMenu jobs={jobs} role={role} conv={conv} counterpart={counterpart} counterpartId={counterpartId} navigate={navigate} sendMessage={sendMessage} addEvent={addEvent} onSent={onSent} />
                  <ComposerIcon label={t('messages.composer.attach')} onClick={() => fileRef.current?.click()}>
                    <Paperclip />
                  </ComposerIcon>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      void addFiles(Array.from(e.target.files ?? []))
                      e.target.value = ''
                    }}
                  />
                </div>
                <textarea
                  ref={taRef}
                  rows={1}
                  value={text}
                  data-msg-composer
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onPaste={(e) => {
                    const list = Array.from(e.clipboardData.files ?? [])
                    if (list.length) {
                      e.preventDefault()
                      void addFiles(list)
                    }
                  }}
                  placeholder={editing ? t('messages.composer.editPlaceholder') : t('messages.composer.placeholder', { name: name || '…' })}
                  aria-label={t('messages.composer.label')}
                  className="no-scrollbar max-h-[168px] min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] leading-[1.4] text-ink outline-none placeholder:text-ink-3 sm:text-[14.5px]"
                />
                <EmojiPicker open={emojiOpen} setOpen={setEmojiOpen} onPick={(e) => (insert(e), pushEmoji(e))} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* send ↔ mic morph */}
          {!rec?.locked && (
            <div className="relative shrink-0">
              <AnimatePresence mode="popLayout" initial={false}>
                {canSend && !rec ? (
                  <motion.button
                    key="send"
                    type="button"
                    onClick={() => send()}
                    initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.4, rotate: 90, opacity: 0 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.88, y: -2 }}
                    transition={spring.bouncy}
                    aria-label={editing ? t('messages.composer.save') : t('messages.composer.send')}
                    data-msg-send
                    className="flex size-10 items-center justify-center rounded-full bg-ink text-[var(--surface)] shadow-[0_8px_20px_-8px_rgba(0,0,0,.6)] dark:bg-accent dark:text-accent-ink"
                  >
                    {editing ? <Check className="size-5" strokeWidth={2.4} /> : <ArrowUp className="size-5" strokeWidth={2.4} />}
                  </motion.button>
                ) : (
                  <MicButton key="mic" recording={!!rec} press={press} begin={begin} finish={finish} setRec={setRec} label={t('messages.voice.hold')} />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-1.5 hidden items-center justify-between px-3 text-[11px] text-ink-3 @lg:flex">
        <span className="flex items-center gap-1.5">
          <Kbd className="h-5 min-w-5 bg-[var(--surface-2)] text-[10px] text-ink-2">↵</Kbd> {t('messages.composer.hintSend')}
          <Kbd className="ml-2 h-5 min-w-5 bg-[var(--surface-2)] text-[10px] text-ink-2">⇧↵</Kbd> {t('messages.composer.hintNewline')}
          <Kbd className="ml-2 h-5 min-w-5 bg-[var(--surface-2)] text-[10px] text-ink-2">↑</Kbd> {t('messages.composer.hintEdit')}
        </span>
        <AnimatePresence>
          {text.length > 280 && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono">
              {text.length}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

function ComposerIcon({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.86 }}
      transition={spring.snappy}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:size-[19px]',
        active ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-[var(--surface-2)] hover:text-ink',
      )}
    >
      {children}
    </motion.button>
  )
}

/* ───────────────────────────── mic ───────────────────────────── */

type RecSetter = React.Dispatch<React.SetStateAction<{ start: number; locked: boolean; simulated: boolean; cancelling: boolean } | null>>

const MicButton = forwardRef<
  HTMLButtonElement,
  {
    recording: boolean
    press: React.RefObject<{ x: number; t: number } | null>
    begin: (locked: boolean) => Promise<void>
    finish: (cancel: boolean) => Promise<void>
    setRec: RecSetter
    label: string
  }
>(function MicButton({ recording, press, begin, finish, setRec, label }, ref) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: recording ? 1.25 : 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={spring.bouncy}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        press.current = { x: e.clientX, t: Date.now() }
        void begin(false)
      }}
      onPointerMove={(e) => {
        if (!press.current) return
        const dx = e.clientX - press.current.x
        setRec((r) => (r && !r.locked && r.cancelling !== dx < -70 ? { ...r, cancelling: dx < -70 } : r))
      }}
      onPointerUp={(e) => {
        const p = press.current
        press.current = null
        if (!p) return
        const held = Date.now() - p.t
        const dx = e.clientX - p.x
        if (held < 320) {
          // quick tap → hands-free (locked) recording
          setRec((r) => (r ? { ...r, locked: true } : r))
          return
        }
        void finish(dx < -70)
      }}
      onPointerCancel={() => {
        press.current = null
        void finish(true)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          void begin(true)
        }
      }}
      className={cn(
        'relative flex size-10 touch-none select-none items-center justify-center rounded-full',
        recording ? 'bg-danger text-white shadow-[0_8px_24px_-6px_var(--danger)]' : 'bg-accent text-accent-ink shadow-[0_8px_20px_-10px_var(--accent)]',
      )}
    >
      {recording && <span className="msg-anim absolute inset-0 rounded-full bg-danger [animation:msg-ring_1.2s_var(--ease-out)_infinite]" />}
      <Mic className="relative size-[19px]" />
    </motion.button>
  )
})

function RecordingBar({
  elapsed,
  locked,
  cancelling,
  simulated,
  onCancel,
  onSend,
}: {
  elapsed: number
  locked: boolean
  cancelling: boolean
  simulated: boolean
  onCancel: () => void
  onSend: () => void
}) {
  const t = useT()
  return (
    <motion.div
      initial={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: -30, filter: 'blur(6px)', transition: { duration: 0.15 } }}
      transition={spring.smooth}
      className="flex h-10 min-w-0 flex-1 items-center gap-3 pl-2 pr-1"
      role="status"
      aria-live="polite"
    >
      {locked && (
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.85 }}
          onClick={onCancel}
          aria-label={t('messages.voice.cancel')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"
        >
          <Trash2 className="size-4" />
        </motion.button>
      )}
      <span className="relative flex size-2.5 shrink-0">
        <span className="msg-anim absolute inset-0 animate-ping rounded-full bg-danger opacity-70" />
        <span className="relative size-2.5 rounded-full bg-danger" />
      </span>
      <span className="font-mono text-[13px] tabular-nums text-ink">{mmss(elapsed)}</span>
      <span className="flex h-6 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className="msg-anim block h-full w-[3px] shrink-0 rounded-full bg-danger/70"
            style={{ animation: `msg-rec ${0.5 + (i % 6) * 0.11}s ease-in-out ${(i % 9) * 0.06}s infinite`, transformOrigin: 'center' }}
          />
        ))}
      </span>
      {!locked ? (
        <motion.span
          animate={{ x: cancelling ? -6 : [0, -5, 0], opacity: cancelling ? 1 : 0.75 }}
          transition={cancelling ? spring.snappy : { duration: 1.4, repeat: Infinity }}
          className={cn('hidden shrink-0 items-center gap-0.5 text-[12px] sm:flex', cancelling ? 'font-medium text-danger' : 'text-ink-3')}
        >
          <ChevronLeft className="size-3.5" />
          {cancelling ? t('messages.voice.release') : t('messages.voice.slide')}
        </motion.span>
      ) : (
        <>
          {simulated && <span className="hidden shrink-0 text-[11px] text-ink-3 sm:inline">{t('messages.voice.demo')}</span>}
          <motion.button
            type="button"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            whileTap={{ scale: 0.85 }}
            transition={spring.bouncy}
            onClick={onSend}
            aria-label={t('messages.voice.send')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[var(--surface)] dark:bg-accent dark:text-accent-ink"
          >
            <ArrowUp className="size-5" strokeWidth={2.4} />
          </motion.button>
        </>
      )}
    </motion.div>
  )
}

/* ───────────────────────────── emoji ───────────────────────────── */

function EmojiPicker({ open, setOpen, onPick }: { open: boolean; setOpen: (v: boolean) => void; onPick: (e: string) => void }) {
  const t = useT()
  const recent = useMessagesPrefs((s) => s.recentEmoji)
  const [tab, setTab] = useState('recent')
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])
  const groups = [{ id: 'recent', icon: '🕘', emojis: recent }, ...EMOJI_GROUPS]
  const active = groups.find((g) => g.id === tab) ?? groups[0]
  return (
    <div ref={root} className="relative shrink-0">
      <ComposerIcon label={t('messages.composer.emoji')} onClick={() => setOpen(!open)} active={open}>
        <Smile />
      </ComposerIcon>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.92, y: 8, filter: 'blur(4px)', transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            style={{ transformOrigin: 'bottom right' }}
            className={cn('glass glass-strong absolute bottom-[calc(100%+12px)] right-0 z-[60] w-[min(320px,calc(100vw-32px))] rounded-[24px] p-2', POPOVER_SURFACE)}
            role="dialog"
            aria-label={t('messages.composer.emoji')}
          >
            <div className="relative z-[1] flex items-center gap-0.5 border-b border-[var(--line)] px-1 pb-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setTab(g.id)}
                  className={cn('relative flex h-8 flex-1 items-center justify-center rounded-xl text-[16px] transition-colors', tab === g.id ? '' : 'opacity-60 hover:opacity-100')}
                  aria-label={t(`messages.emoji.${g.id}`)}
                  title={t(`messages.emoji.${g.id}`)}
                >
                  {tab === g.id && <motion.span layoutId="emoji-tab" className="absolute inset-0 rounded-xl bg-[var(--surface-2)]" transition={spring.pill} />}
                  <span className="relative">{g.icon}</span>
                </button>
              ))}
            </div>
            <p className="relative z-[1] px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{t(`messages.emoji.${active.id}`)}</p>
            <motion.div key={active.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="no-scrollbar relative z-[1] grid max-h-[220px] grid-cols-8 gap-0.5 overflow-y-auto">
              {active.emojis.map((e, i) => (
                <motion.button
                  key={e + i}
                  type="button"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { delay: Math.min(i, 24) * 0.008 } }}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onPick(e)}
                  className="flex aspect-square items-center justify-center rounded-xl text-[21px] hover:bg-[var(--surface-2)]"
                >
                  {e}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────────────────────── shortcuts ───────────────────────────── */

function ShortcutsMenu({
  jobs,
  role,
  conv,
  counterpart,
  counterpartId,
  navigate,
  sendMessage,
  addEvent,
  onSent,
}: {
  jobs: Job[]
  role: Role
  conv: Conversation
  counterpart?: Person
  counterpartId: string
  navigate: ReturnType<typeof useNavigate>
  sendMessage: ReturnType<typeof useApp.getState>['sendMessage']
  addEvent: ReturnType<typeof useApp.getState>['addEvent']
  onSent: () => void
}) {
  const t = useT()
  const sorted = useMemo(() => [...jobs].sort((a, b) => Number(CLOSED.includes(a.status)) - Number(CLOSED.includes(b.status))), [jobs])
  const [sel, setSel] = useState<string | undefined>(sorted[0]?.id)
  const job = sorted.find((j) => j.id === sel) ?? sorted[0]

  const scheduleCall = () => {
    const at = new Date()
    at.setDate(at.getDate() + 1)
    at.setHours(10, 0, 0, 0)
    addEvent({ title: `Call with ${counterpart?.name ?? 'counterpart'}`, at: at.toISOString(), durationMin: 30, kind: 'call', jobId: job?.id, withId: counterpartId })
    toast({
      title: t('messages.toast.callScheduled'),
      description: t('messages.toast.callScheduledBody', { name: counterpart?.name ?? '' }),
      tone: 'success',
      link: '/calendar',
    })
  }

  return (
    <Menu
      width={300}
      align="start"
      className={cn(POPOVER_SURFACE, 'bottom-[calc(100%+10px)] top-auto origin-bottom-left')}
      trigger={({ onClick, open }) => (
        <ComposerIcon label={t('messages.shortcuts.title')} onClick={onClick} active={open}>
          <Zap />
        </ComposerIcon>
      )}
    >
      {(close) => {
        const run = (fn: () => void) => () => {
          fn()
          close()
        }
        const rows: { key: string; icon: ReactNode; label: string; hint?: string; disabled?: boolean; onClick: () => void; show: boolean }[] = [
          { key: 'open', icon: <ArrowUpRight />, label: t('messages.shortcuts.openJob'), disabled: !job, onClick: () => job && navigate(`/jobs/${job.id}`), show: true },
          {
            key: 'revision',
            icon: <RotateCcw />,
            label: t('messages.shortcuts.requestRevision'),
            hint: job && !CAN_REQUEST_REVISION.includes(job.status) ? t(`core.status.${job.status}`) : undefined,
            disabled: !job || !CAN_REQUEST_REVISION.includes(job.status),
            onClick: () => job && navigate(`/jobs/${job.id}?tab=revisions`),
            show: role === 'client',
          },
          {
            key: 'deliver',
            icon: <PackageCheck />,
            label: t('messages.shortcuts.deliver'),
            hint: job && !CAN_DELIVER.includes(job.status) ? t(`core.status.${job.status}`) : undefined,
            disabled: !job || !CAN_DELIVER.includes(job.status),
            onClick: () => job && navigate(`/jobs/${job.id}?tab=deliveries`),
            show: role === 'designer',
          },
          {
            key: 'progress',
            icon: <TrendingUp />,
            label: t('messages.shortcuts.shareProgress'),
            disabled: !job || CLOSED.includes(job.status),
            onClick: () => {
              if (!job) return
              sendMessage(conv.id, { text: `Progress update on ${job.id}: ${job.progress}% · ${statusText(job.status)}`, jobId: job.id })
              blip('send')
              onSent()
            },
            show: role === 'designer',
          },
          {
            key: 'ask',
            icon: <MessageSquareText />,
            label: t('messages.shortcuts.askUpdate'),
            disabled: !job || CLOSED.includes(job.status),
            onClick: () => {
              if (!job) return
              sendMessage(conv.id, { text: `Hi! Could you share a quick progress update on ${job.id}?`, jobId: job.id })
              blip('send')
              onSent()
            },
            show: role === 'client',
          },
          {
            key: 'brief',
            icon: <FilePlus2 />,
            label: t('messages.shortcuts.newBrief'),
            onClick: () => navigate(`/brief/new?designer=${counterpartId}`),
            show: role === 'client',
          },
          { key: 'call', icon: <CalendarPlus />, label: t('messages.shortcuts.scheduleCall'), onClick: scheduleCall, show: true },
        ]
        return (
          <div className="p-0.5">
            <p className="px-2.5 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{t('messages.shortcuts.title')}</p>
            {sorted.length > 1 && (
              <div className="no-scrollbar mb-1 flex gap-1 overflow-x-auto px-1.5 pb-1">
                {sorted.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSel(j.id)}
                    className={cn(
                      'relative h-7 shrink-0 rounded-full px-2.5 font-mono text-[11px] font-medium transition-colors',
                      job?.id === j.id ? 'text-[var(--surface)] dark:text-accent-ink' : 'text-ink-2 hover:bg-[var(--surface-2)]',
                    )}
                  >
                    {job?.id === j.id && <motion.span layoutId="sc-job" className="absolute inset-0 rounded-full bg-ink dark:bg-accent" transition={spring.pill} />}
                    <span className="relative">{j.id}</span>
                  </button>
                ))}
              </div>
            )}
            {job ? (
              <p className="truncate px-2.5 pb-1.5 text-[12px] text-ink-3">{job.title}</p>
            ) : (
              <p className="px-2.5 pb-1.5 text-[12px] text-ink-3">{t('messages.shortcuts.noJob')}</p>
            )}
            {rows
              .filter((r) => r.show)
              .map((r) => (
                <button
                  key={r.key}
                  type="button"
                  disabled={r.disabled}
                  onClick={run(r.onClick)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-2)] text-ink-2 [&_svg]:size-3.5">{r.icon}</span>
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.hint && <span className="text-[11px] text-ink-3">{r.hint}</span>}
                </button>
              ))}
          </div>
        )
      }}
    </Menu>
  )
}

