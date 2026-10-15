import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { uid } from '@/lib/ids'
import type { CardBrand } from './model'

/**
 * Feature-local persisted state (kept out of the shared app store):
 *  - saved cards → 'designtab-cards' (only brand + last 4 digits are stored)
 *  - earnings prefs, payouts and reminder bookkeeping → 'designtab-payments'
 */

export type CardFinish = 'aurora' | 'graphite' | 'ocean' | 'sunset' | 'theme'

export interface SavedCard {
  id: string
  brand: CardBrand
  last4: string
  name: string
  exp: string
  finish: CardFinish
  isDefault: boolean
  addedAt: string
}

const DEFAULT_CARDS: SavedCard[] = [
  { id: 'card-1', brand: 'visa', last4: '4242', name: 'Ali', exp: '09/29', finish: 'aurora', isDefault: true, addedAt: '2026-01-12T10:00:00.000Z' },
  { id: 'card-2', brand: 'mastercard', last4: '8810', name: 'Northlight Studio', exp: '03/28', finish: 'graphite', isDefault: false, addedAt: '2026-04-02T10:00:00.000Z' },
]

interface CardsState {
  cards: SavedCard[]
  addCard: (c: Omit<SavedCard, 'id' | 'addedAt' | 'isDefault'> & { isDefault?: boolean }) => SavedCard
  removeCard: (id: string) => void
  setDefault: (id: string) => void
}

export const useCards = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: DEFAULT_CARDS,
      addCard: (c) => {
        const first = get().cards.length === 0
        const card: SavedCard = { ...c, id: uid('card_'), addedAt: new Date().toISOString(), isDefault: first || !!c.isDefault }
        set((s) => ({ cards: [...(card.isDefault ? s.cards.map((x) => ({ ...x, isDefault: false })) : s.cards), card] }))
        return card
      },
      removeCard: (id) =>
        set((s) => {
          const removed = s.cards.find((c) => c.id === id)
          const rest = s.cards.filter((c) => c.id !== id)
          if (removed?.isDefault && rest.length) rest[0] = { ...rest[0], isDefault: true }
          return { cards: rest }
        }),
      setDefault: (id) => set((s) => ({ cards: s.cards.map((c) => ({ ...c, isDefault: c.id === id })) })),
    }),
    {
      name: 'designtab-cards',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ cards: s.cards.map(({ id, brand, last4, name, exp, finish, isDefault, addedAt }) => ({ id, brand, last4, name, exp, finish, isDefault, addedAt })) }),
    },
  ),
)

export interface Payout {
  id: string
  amount: number
  fee: number
  instant: boolean
  at: string
  /** Ties the payout to the current demo data (a reset hides it). */
  seededAt: string
}

interface PayPrefs {
  goal: number
  taxRate: number
  /** Client: monthly design budget. */
  budget: number
  /** Designer: payout speed preference. */
  instantDefault: boolean
  payouts: Payout[]
  /** invoiceId → time a reminder was sent (ms). */
  reminded: Record<string, number>
  /** "yyyy-m" of the last month whose goal was celebrated. */
  celebrated?: string
  setGoal: (n: number) => void
  setTaxRate: (n: number) => void
  setBudget: (n: number) => void
  setInstantDefault: (v: boolean) => void
  addPayout: (p: Omit<Payout, 'id' | 'at'>) => Payout
  markReminded: (invoiceId: string) => void
  setCelebrated: (key: string) => void
}

export const usePayPrefs = create<PayPrefs>()(
  persist(
    (set) => ({
      goal: 10000,
      taxRate: 0.25,
      budget: 15000,
      instantDefault: false,
      payouts: [],
      reminded: {},
      setGoal: (goal) => set({ goal: Math.max(100, Math.round(goal)) }),
      setTaxRate: (taxRate) => set({ taxRate }),
      setBudget: (budget) => set({ budget: Math.max(500, Math.round(budget)) }),
      setInstantDefault: (instantDefault) => set({ instantDefault }),
      addPayout: (p) => {
        const payout: Payout = { ...p, id: uid('po_'), at: new Date().toISOString() }
        set((s) => ({ payouts: [payout, ...s.payouts].slice(0, 40) }))
        return payout
      },
      markReminded: (id) => set((s) => ({ reminded: { ...s.reminded, [id]: Date.now() } })),
      setCelebrated: (celebrated) => set({ celebrated }),
    }),
    { name: 'designtab-payments', storage: createJSONStorage(() => localStorage) },
  ),
)
