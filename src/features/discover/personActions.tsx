import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { FileText, Heart, MessageCircle, RotateCcw, Star, Repeat2, X, Clock3 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { SwipeDecision } from '@/store/types'
import { useRelation, useSwipeActions } from './hooks'
import { findMatch, pairForPerson, type Person } from './model'

/** Everything you can do with a person, wired to the store. */
export function usePersonActions(p: Person | undefined) {
  const t = useT()
  const navigate = useNavigate()
  const role = useRole()
  const relation = useRelation(p)
  const matches = useApp((s) => s.matches)
  const match = useMemo(() => (p ? findMatch(matches, p) : undefined), [matches, p])
  const { decide, undo } = useSwipeActions()
  const [confirm, confirmDialog] = useConfirm()
  const pair = p ? pairForPerson(p) : undefined
  const roleOk = !!pair && pair.role === role
  const canBrief = !!p && p.kind === 'designer' && role === 'client'

  const message = useCallback(() => {
    if (!pair) return
    const id = useApp.getState().ensureConversation(pair.clientId, pair.designerId)
    navigate(`/messages/${id}`)
  }, [pair, navigate])

  const brief = useCallback(() => {
    if (p) navigate(`/brief/new?designer=${p.data.id}`)
  }, [p, navigate])

  const act = useCallback(
    (d: SwipeDecision, from?: Element | null) => {
      if (!p) return
      return decide(p, d, { from })
    },
    [p, decide],
  )

  const undoDecision = useCallback(() => {
    if (p) undo(p.data.id)
  }, [p, undo])

  const switchRole = useCallback(() => {
    if (!pair) return
    useApp.getState().setRole(pair.role)
    toast({ title: t('core.role.switchedTo', { role: t(`core.role.${pair.role}`) }), tone: 'info' })
  }, [pair, t])

  const toggleFavorite = useCallback(() => {
    if (!match) return
    useApp.getState().toggleFavoriteMatch(match.id)
    if (!match.favorite) toast({ title: t('discover.toast.favorited', { name: p?.data.name ?? '' }), tone: 'success', avatarSeed: p?.data.avatarSeed, duration: 2400 })
  }, [match, p, t])

  const unmatch = useCallback(async () => {
    if (!match || !p) return false
    const ok = await confirm({
      title: t('discover.unmatch.title', { name: p.data.name }),
      description: t('discover.unmatch.text'),
      confirmLabel: t('discover.unmatch.confirm'),
      tone: 'danger',
    })
    if (!ok) return false
    const app = useApp.getState()
    app.unmatch(match.id)
    // keep them out of the deck: an unmatch counts as a pass
    if (app.settings.role === pairForPerson(p).role) app.swipe(p.data.id, 'pass')
    toast({ title: t('discover.toast.unmatched', { name: p.data.name }), tone: 'info', avatarSeed: p.data.avatarSeed })
    return true
  }, [match, p, confirm, t])

  return { relation, match, roleOk, canBrief, pair, message, brief, act, undoDecision, switchRole, toggleFavorite, unmatch, confirmDialog }
}

export type PersonActions = ReturnType<typeof usePersonActions>

/**
 * Primary CTA row adapting to the relationship:
 *  undecided/passed → Pass · Super · Like
 *  liked            → waiting + Undo
 *  matched          → Message · Send brief
 */
export function RelationCTA({ p, a, size = 'md', className, block }: { p: Person; a: PersonActions; size?: 'sm' | 'md'; className?: string; block?: boolean }) {
  const t = useT()
  const superLeft = useApp((s) => s.superLikesLeft)
  const first = p.data.name.split(' ')[0]

  if (!a.roleOk) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button variant="soft" size={size} icon={<Repeat2 className="size-4" />} onClick={a.switchRole}>
          {t('discover.cta.switchRole', { role: t(`core.role.${a.pair?.role ?? 'client'}`) })}
        </Button>
      </div>
    )
  }

  if (a.relation === 'matched') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Button size={size} icon={<MessageCircle className="size-4" />} onClick={a.message} className={cn(block && 'flex-1')}>
          {t('core.action.message')}
        </Button>
        {a.canBrief && (
          <Button variant="accent" size={size} icon={<FileText className="size-4" />} onClick={a.brief} className={cn(block && 'flex-1')}>
            {t('discover.cta.sendBrief')}
          </Button>
        )}
      </div>
    )
  }

  if (a.relation === 'liked' || a.relation === 'super') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span className="inline-flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-accent-soft px-4 text-[13px] font-medium text-accent-text">
          <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="shrink-0">
            {a.relation === 'super' ? <Star className="size-4 fill-current" /> : <Heart className="size-4 fill-current" />}
          </motion.span>
          <span className="truncate">{t('discover.cta.waiting', { name: first })}</span>
          <Clock3 className="ml-auto size-3.5 shrink-0 opacity-60" />
        </span>
        <Button variant="glass" size={size} icon={<RotateCcw className="size-4" />} onClick={a.undoDecision}>
          {t('core.action.undo')}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {a.relation === 'passed' ? (
        <Button variant="glass" size={size} icon={<RotateCcw className="size-4" />} onClick={a.undoDecision}>
          {t('discover.cta.reconsider')}
        </Button>
      ) : (
        <Button variant="glass" size={size} icon={<X className="size-4" />} onClick={(e) => a.act('pass', e.currentTarget)} className="text-[#e5484d]">
          {t('core.action.pass')}
        </Button>
      )}
      <Button
        variant="glass"
        size={size}
        icon={<Star className="size-4 fill-[#3e8ef7] text-[#3e8ef7]" />}
        onClick={(e) => a.act('super', e.currentTarget)}
        disabled={superLeft <= 0}
        title={t('discover.superLeft', { count: superLeft })}
      >
        <span className="hidden sm:inline">{t('discover.action.super')}</span>
      </Button>
      <Button size={size} icon={<Heart className="size-4 fill-current" />} onClick={(e) => a.act('like', e.currentTarget)} className={cn(block && 'flex-1')}>
        {t('core.action.like')}
      </Button>
    </div>
  )
}
