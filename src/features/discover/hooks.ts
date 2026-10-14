import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n'
import { useApp } from '@/store'
import { useDiscipline, useRole } from '@/store/selectors'
import { toast } from '@/store/toasts'
import { fireStars } from '@/lib/confetti'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Role, type SwipeDecision } from '@/store/types'
import { useDiscoverUI } from './discoverStore'
import {
  isFresh,
  matchesDisciplineTab,
  matchesQuery,
  pairForPerson,
  passesFilters,
  relationOf,
  sortPeople,
  targetKind,
  type Person,
  type Relation,
} from './model'

/** All people on the other side of the marketplace for the active role (discipline tab applied). */
export function usePool() {
  const role = useRole()
  const discipline = useDiscipline()
  const designers = useApp((s) => s.designers)
  const clients = useApp((s) => s.clients)
  const decisions = useApp((s) => s.decisions)
  const matches = useApp((s) => s.matches)
  const filters = useDiscoverUI((s) => s.filters[role])
  const query = useDiscoverUI((s) => s.query)
  const returning = useDiscoverUI((s) => s.returning)

  return useMemo(() => {
    const kind = targetKind(role)
    const base: Person[] =
      kind === 'designer'
        ? designers.filter((d) => d.id !== ME_DESIGNER_ID).map((d) => ({ kind: 'designer' as const, data: d }))
        : clients.filter((c) => c.id !== ME_CLIENT_ID).map((c) => ({ kind: 'client' as const, data: c }))
    const inTab = base.filter((p) => matchesDisciplineTab(p, discipline))
    const filtered = sortPeople(
      inTab.filter((p) => matchesQuery(p, query) && passesFilters(p, filters)),
      filters.sort,
      role,
      discipline,
    )
    const rel = new Map<string, Relation>()
    for (const p of base) rel.set(p.data.id, relationOf(p, decisions, matches))
    let deck = filtered.filter((p) => rel.get(p.data.id) === 'none')
    if (returning) {
      const i = deck.findIndex((p) => p.data.id === returning.id)
      if (i > 0) deck = [deck[i], ...deck.slice(0, i), ...deck.slice(i + 1)]
    }
    const fresh = sortPeople(filtered.filter(isFresh), 'newest', role, discipline)
    const passedCount = Object.values(decisions[role]).filter((d) => d === 'pass').length
    return { role, kind, discipline, base, inTab, filtered, deck, fresh, rel, passedCount, filters, query }
  }, [role, discipline, designers, clients, decisions, matches, filters, query, returning])
}

/** Relationship between Ali and one person. */
export function useRelation(p: Person | undefined): Relation {
  const decisions = useApp((s) => s.decisions)
  const matches = useApp((s) => s.matches)
  return useMemo(() => (p ? relationOf(p, decisions, matches) : 'none'), [p, decisions, matches])
}

/** Like / pass / super-like / undo with feedback, shared by every surface. */
export function useSwipeActions() {
  const t = useT()
  const role = useRole()

  const undo = useCallback(
    (id?: string, opts?: { silent?: boolean }) => {
      const ui = useDiscoverUI.getState()
      const rec = ui.popHistory(role, id)
      const targetId = rec?.id ?? id
      if (!targetId) return false
      const app = useApp.getState()
      const dec = app.decisions[role][targetId]
      if (!dec) return false
      app.undoSwipe(targetId)
      if (dec === 'super') useApp.setState((s) => ({ superLikesLeft: Math.min(3, s.superLikesLeft + 1) }))
      if (rec?.matchId) app.unmatch(rec.matchId)
      ui.setReturning({ id: targetId, dir: rec?.dir ?? 0 })
      if (!opts?.silent) {
        const p = app.designers.find((d) => d.id === targetId) ?? app.clients.find((c) => c.id === targetId)
        toast({ title: t('discover.toast.undone', { name: p?.name ?? '' }), tone: 'info', avatarSeed: p?.avatarSeed, duration: 2600 })
      }
      return true
    },
    [role, t],
  )

  const decide = useCallback(
    (p: Person, decision: SwipeDecision, opts?: { from?: Element | null; dir?: -1 | 1 | 0 }) => {
      const app = useApp.getState()
      const personRole: Role = pairForPerson(p).role
      if (personRole !== app.settings.role) return { matched: false as const }
      if (decision === 'super' && app.superLikesLeft <= 0) {
        toast({ title: t('discover.toast.noSuper'), description: t('discover.toast.noSuperHint'), tone: 'info' })
        decision = 'like'
      }
      // history first, so the deck already knows the exit direction when the card leaves
      useDiscoverUI.getState().pushHistory(personRole, {
        id: p.data.id,
        decision,
        at: Date.now(),
        dir: opts?.dir ?? (decision === 'pass' ? -1 : decision === 'like' ? 1 : 0),
      })
      const res = app.swipe(p.data.id, decision)
      if (res.match) {
        const matchId = res.match.id
        useDiscoverUI.setState((s) => ({
          history: { ...s.history, [personRole]: s.history[personRole].map((h) => (h.id === p.data.id ? { ...h, matchId } : h)) },
        }))
      }
      if (!res.matched && decision !== 'pass') {
        if (decision === 'super') fireStars({ from: opts?.from ?? undefined })
        toast({
          title: t(decision === 'super' ? 'discover.toast.superSent' : 'discover.toast.likeSent', { name: p.data.name }),
          description: t('discover.toast.likeSentHint'),
          tone: 'success',
          avatarSeed: p.data.avatarSeed,
          duration: 3600,
          action: { label: t('core.action.undo'), onClick: () => undo(p.data.id) },
        })
      }
      return res
    },
    [t, undo],
  )

  const reviewPassed = useCallback(() => {
    const app = useApp.getState()
    const ids = Object.entries(app.decisions[role])
      .filter(([, d]) => d === 'pass')
      .map(([id]) => id)
    ids.forEach((id) => app.undoSwipe(id))
    useDiscoverUI.setState((s) => ({ history: { ...s.history, [role]: s.history[role].filter((h) => h.decision !== 'pass') } }))
    toast({ title: t('discover.toast.reviewed', { count: ids.length }), tone: 'success' })
    return ids.length
  }, [role, t])

  return { decide, undo, reviewPassed, role }
}

/** Last swipe of the active role (for the Undo button). */
export function useLastSwipe() {
  const role = useRole()
  const list = useDiscoverUI((s) => s.history[role])
  return list[list.length - 1]
}

export function useIsMobile(query = '(max-width: 639px)') {
  const get = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false)
  const [m, setM] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}
