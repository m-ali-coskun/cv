import { ME_CLIENT_ID, ME_DESIGNER_ID, type AppNotification, type CalendarEvent, type Invoice, type Match, type Role, type SwipeDecision } from '../types'
import { ago, calEvent, inDays, minsAgo } from './factories'

export const matches: Match[] = [
  { id: 'mt-1', clientId: ME_CLIENT_ID, designerId: 'd-maya', createdAt: ago(20), initiatedBy: 'client', superLike: false, favorite: true },
  { id: 'mt-2', clientId: ME_CLIENT_ID, designerId: 'd-leo', createdAt: ago(15), initiatedBy: 'client', superLike: false, favorite: false },
  { id: 'mt-3', clientId: ME_CLIENT_ID, designerId: 'd-sofia', createdAt: ago(3), initiatedBy: 'designer', superLike: true, favorite: false },
  { id: 'mt-4', clientId: ME_CLIENT_ID, designerId: 'd-kenji', createdAt: ago(1), initiatedBy: 'client', superLike: false, favorite: false },
  { id: 'mt-5', clientId: ME_CLIENT_ID, designerId: 'd-amara', createdAt: ago(40), initiatedBy: 'client', superLike: false, favorite: false },
  { id: 'mt-6', clientId: 'c-lumen', designerId: ME_DESIGNER_ID, createdAt: ago(30), initiatedBy: 'client', superLike: false, favorite: true },
  { id: 'mt-7', clientId: 'c-orbit', designerId: ME_DESIGNER_ID, createdAt: ago(1), initiatedBy: 'client', superLike: false, favorite: false },
  { id: 'mt-8', clientId: 'c-verde', designerId: ME_DESIGNER_ID, createdAt: ago(4), initiatedBy: 'designer', superLike: false, favorite: false },
]

export const decisions: Record<Role, Record<string, SwipeDecision>> = {
  client: { 'd-maya': 'like', 'd-leo': 'like', 'd-sofia': 'like', 'd-kenji': 'like', 'd-amara': 'like' },
  designer: { 'c-lumen': 'like', 'c-orbit': 'like', 'c-verde': 'like' },
}

export const notifications: AppNotification[] = [
  { id: 'n-1', role: 'client', kind: 'delivery', title: 'Maya Chen delivered v2', body: 'Cold brew launch — key visual & social kit', createdAt: ago(0, 5), read: false, link: '/jobs/DT-2841', actorAvatarSeed: 'maya-chen' },
  { id: 'n-2', role: 'client', kind: 'ai', title: '2 jobs at risk of slipping', body: 'DT-2796 is blocked on a music licence and due tomorrow.', createdAt: ago(0, 1), read: false, link: '/jobs' },
  { id: 'n-3', role: 'client', kind: 'match', title: 'It’s a match with Kenji Watanabe!', body: 'Send a brief to get started.', createdAt: ago(1), read: true, link: '/network/d-kenji', actorAvatarSeed: 'kenji-watanabe' },
  { id: 'n-4', role: 'designer', kind: 'job_request', title: 'New request from Orbit Fitness', body: 'Summer challenge — ad set (6 videos) · 3,000 EUR', createdAt: ago(0, 2), read: false, link: '/jobs/DT-2848', actorAvatarSeed: 'orbit-fitness' },
  { id: 'n-5', role: 'designer', kind: 'message', title: 'Emma Schultz', body: 'The cup sleeves look amazing — can we see the loyalty card tomorrow?', createdAt: minsAgo(90), read: false, link: '/messages/cv-lumen', actorAvatarSeed: 'lumen-coffee' },
]

export const invoices: Invoice[] = [
  { id: 'INV-1031', jobId: 'DT-2803', clientId: ME_CLIENT_ID, designerId: 'd-amara', amount: 1300, currency: 'EUR', status: 'paid', issuedAt: ago(8), dueAt: ago(1), paidAt: ago(7), lineItems: [{ label: 'Annual report illustrations', amount: 1300 }] },
  { id: 'INV-1038', jobId: 'DT-2841', clientId: ME_CLIENT_ID, designerId: 'd-maya', amount: 2400, currency: 'EUR', status: 'escrow', issuedAt: ago(12), dueAt: inDays(2), lineItems: [{ label: 'Key visual', amount: 1400 }, { label: 'Social kit', amount: 1000 }] },
  { id: 'INV-1040', jobId: 'DT-2796', clientId: ME_CLIENT_ID, designerId: 'd-leo', amount: 1800, currency: 'EUR', status: 'escrow', issuedAt: ago(9), dueAt: inDays(1), lineItems: [{ label: 'Brand film edit', amount: 1800 }] },
  { id: 'INV-1036', jobId: 'DT-2830', clientId: 'c-lumen', designerId: ME_DESIGNER_ID, amount: 2100, currency: 'EUR', status: 'pending', issuedAt: ago(3), dueAt: inDays(11), lineItems: [{ label: 'Café rebrand extension', amount: 2100 }] },
]

export const events: CalendarEvent[] = [
  calEvent({ role: 'client', title: 'Review call with Maya', at: inDays(0, 3), durationMin: 30, kind: 'call', jobId: 'DT-2841', withId: 'd-maya' }),
  calEvent({ role: 'client', title: 'Kick-off: pricing page', at: inDays(1, 2), durationMin: 45, kind: 'call', jobId: 'DT-2852', withId: 'd-sofia' }),
  calEvent({ role: 'designer', title: 'Focus block — loyalty card', at: inDays(0, 2), durationMin: 120, kind: 'focus', jobId: 'DT-2830' }),
  calEvent({ role: 'designer', title: 'Intro call — Orbit Fitness', at: inDays(1, 4), durationMin: 30, kind: 'call', withId: 'c-orbit' }),
]
