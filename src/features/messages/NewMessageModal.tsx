import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArchiveRestore, ArrowUpRight, Compass, MessageCirclePlus, Search, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { item, stagger } from '@/lib/motion'
import { timeAgo } from '@/lib/dates'
import { useLang, useT } from '@/i18n'
import { useApp } from '@/store'
import { matchScore, useConversations, useMyMatches, useRole } from '@/store/selectors'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Badge'
import { personLine, type Person } from './model'
import { PersonAvatar, Eyebrow, highlight } from './ui'

/**
 * Start a conversation with a match that has no thread yet (or bring an
 * archived thread back). `ensureConversation` creates / unarchives it.
 */
export function NewMessageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const role = useRole()
  const matches = useMyMatches()
  const convs = useConversations({ includeArchived: true })
  const ensure = useApp((s) => s.ensureConversation)
  const [q, setQ] = useState('')

  const { fresh, archived, active } = useMemo(() => {
    const byPair = new Map(convs.map((v) => [`${v.conversation.clientId}|${v.conversation.designerId}`, v]))
    const fresh: { person: Person; matchId: string; createdAt: string; favorite: boolean; clientId: string; designerId: string }[] = []
    for (const m of matches) {
      const person = (m.designer ?? m.client) as Person | undefined
      if (!person) continue
      if (byPair.has(`${m.match.clientId}|${m.match.designerId}`)) continue
      fresh.push({ person, matchId: m.match.id, createdAt: m.match.createdAt, favorite: m.match.favorite, clientId: m.match.clientId, designerId: m.match.designerId })
    }
    fresh.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt.localeCompare(a.createdAt))
    const archived = convs.filter((v) => v.conversation.archived && v.counterpart)
    const active = convs.filter((v) => !v.conversation.archived && v.counterpart)
    return { fresh, archived, active }
  }, [matches, convs])

  const ql = q.trim().toLowerCase()
  const has = (p: Person | undefined) => !ql || (p && `${p.name} ${personLine(p)}`.toLowerCase().includes(ql))
  const freshShown = fresh.filter((f) => has(f.person))
  const archivedShown = archived.filter((v) => has(v.counterpart))
  const activeShown = active.filter((v) => has(v.counterpart)).slice(0, ql ? 12 : 6)

  const start = (clientId: string, designerId: string) => {
    const id = ensure(clientId, designerId)
    onClose()
    setQ('')
    navigate(`/messages/${id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={t('messages.new.title')} description={t('messages.new.subtitle')} size="md">
      <label className="relative mb-4 flex h-11 items-center gap-2 rounded-full bg-[var(--surface-2)] pl-4 pr-2 focus-within:shadow-[0_0_0_4px_var(--accent-softer)]">
        <Search className="size-4 text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('messages.new.search')}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3 sm:text-[14px]"
        />
      </label>

      {freshShown.length === 0 && archivedShown.length === 0 && activeShown.length === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title={ql ? t('messages.new.noResults') : t('messages.new.emptyTitle')}
          description={t('messages.new.emptyBody')}
          action={
            <Button
              icon={<Compass className="size-4" />}
              onClick={() => {
                onClose()
                navigate('/discover')
              }}
            >
              {t('messages.new.discover')}
            </Button>
          }
        />
      ) : (
        <motion.div variants={stagger(0.04)} initial="hidden" animate="show" className="space-y-5">
          {freshShown.length === 0 && !ql && (
            <motion.div variants={item} className="flex items-center gap-3 rounded-[20px] bg-accent-soft p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink">
                <Sparkles className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{t('messages.new.emptyTitle')}</span>
                <span className="block text-[12px] text-ink-2">{t('messages.new.emptyBody')}</span>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  navigate('/discover')
                }}
              >
                {t('messages.new.discoverShort')}
              </Button>
            </motion.div>
          )}
          {freshShown.length > 0 && (
            <section>
              <Eyebrow className="mb-2 px-1">{t('messages.new.matches', { count: freshShown.length })}</Eyebrow>
              <ul className="space-y-1.5">
                {freshShown.map((f) => {
                  const score = matchScore(f.person, role)
                  return (
                    <motion.li key={f.matchId} variants={item}>
                      <button
                        type="button"
                        onClick={() => start(f.clientId, f.designerId)}
                        className="group flex w-full items-center gap-3 rounded-[20px] p-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <PersonAvatar person={f.person} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[14.5px] font-medium">{highlight(f.person.name, ql)}</span>
                            {f.favorite && <Star className="size-3.5 shrink-0 fill-[#FFB21E] text-[#FFB21E]" />}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-3">{personLine(f.person)}</span>
                        </span>
                        <span className="hidden flex-col items-end gap-1 sm:flex">
                          <Pill tone="accent" size="xs">
                            {t('messages.new.score', { score })}
                          </Pill>
                          <span className="font-mono text-[10.5px] text-ink-3">{t('messages.new.matched', { when: timeAgo(f.createdAt, lang) })}</span>
                        </span>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-[var(--surface)] transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-6 dark:bg-accent dark:text-accent-ink">
                          <MessageCirclePlus className="size-4" />
                        </span>
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </section>
          )}
          {archivedShown.length > 0 && (
            <section>
              <Eyebrow className="mb-2 px-1">{t('messages.new.archived')}</Eyebrow>
              <ul className="space-y-1.5">
                {archivedShown.map((v) => (
                  <motion.li key={v.conversation.id} variants={item}>
                    <button
                      type="button"
                      onClick={() => start(v.conversation.clientId, v.conversation.designerId)}
                      className={cn('group flex w-full items-center gap-3 rounded-[20px] p-2.5 text-left transition-colors hover:bg-[var(--surface-2)]')}
                    >
                      <PersonAvatar person={v.counterpart} size={40} className="opacity-80" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{highlight(v.counterpart?.name ?? '', ql)}</span>
                        <span className="block truncate text-[12.5px] text-ink-3">{t('messages.new.archivedHint', { count: v.messages.length })}</span>
                      </span>
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-3 text-[12.5px] font-medium text-ink-2 group-hover:bg-[var(--surface-3)]">
                        <ArchiveRestore className="size-3.5" />
                        {t('messages.action.restore')}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
          {activeShown.length > 0 && (
            <section>
              <Eyebrow className="mb-2 px-1">{t('messages.new.active')}</Eyebrow>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {activeShown.map((v) => (
                  <motion.li key={v.conversation.id} variants={item}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        setQ('')
                        navigate(`/messages/${v.conversation.id}`)
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-[18px] bg-[var(--surface-2)] p-2 text-left transition-colors hover:bg-[var(--surface-3)]"
                    >
                      <PersonAvatar person={v.counterpart} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{highlight(v.counterpart?.name ?? '', ql)}</span>
                        <span className="block truncate font-mono text-[10.5px] text-ink-3">
                          {v.unread > 0 ? t('messages.new.unread', { count: v.unread }) : t('messages.new.messagesCount', { count: v.messages.length })}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
        </motion.div>
      )}
      <p className="mt-5 text-center text-[12px] text-ink-3">{t(role === 'client' ? 'messages.new.footerClient' : 'messages.new.footerDesigner')}</p>
    </Modal>
  )
}

