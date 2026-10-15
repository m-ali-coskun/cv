import { useApp } from '@/store'
import { toast } from '@/store/toasts'
import { useUI } from '@/store/ui'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type AppNotification, type Role } from '@/store/types'
import type { TFn } from '@/i18n'

type Sample = Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'role'>

/** Realistic sample notifications (content stays English, like all seed data). */
const SAMPLES: Record<Role, Sample[]> = {
  client: [
    { kind: 'message', title: 'Maya Chen', body: 'Quick heads-up — v3 of the key visual lands tomorrow morning ☕', link: '/messages', actorAvatarSeed: 'maya-chen' },
    { kind: 'like', title: 'Hana Kim liked Northlight Studio', body: 'Illustrator from Seoul · like back to match.', link: '/discover', actorAvatarSeed: 'hana-kim' },
    { kind: 'ai', title: '2 briefs could use a deadline buffer', body: 'designTab AI spotted tight timelines on two active jobs.', link: '/jobs' },
    { kind: 'payment', title: 'Milestone released', body: '€1,300 released from escrow to Amara Okafor.', link: '/payments', actorAvatarSeed: 'amara-okafor' },
  ],
  designer: [
    { kind: 'job_request', title: 'New request from Lumen Coffee', body: 'Seasonal menu boards · 1,200 EUR', link: '/requests', actorAvatarSeed: 'lumen-coffee' },
    { kind: 'message', title: 'Emma Schultz', body: 'Loved the latest round — can we hop on a quick call?', link: '/messages', actorAvatarSeed: 'lumen-coffee' },
    { kind: 'payment', title: 'Payment received', body: '1,800 EUR from Pulse Bank is on its way.', link: '/payments', actorAvatarSeed: 'pulse-bank' },
    { kind: 'ai', title: 'You are trending in Discover', body: 'Your profile got 3× more views today — add a fresh project.', link: '/profile' },
  ],
}

let cursor = 0

/** Pushes a realistic notification for the active role (with toast). */
export function sendTestNotification() {
  const s = useApp.getState()
  const role = s.settings.role
  const list = SAMPLES[role]
  const sample = list[cursor++ % list.length]!
  s.notify({ ...sample, role }, { toast: true })
}

/** A client sends designer-Ali a fresh request (works from either role). */
export function simulateIncomingRequest(t: TFn, navigate: (to: string) => void) {
  const s = useApp.getState()
  const job = s.spawnIncomingRequest()
  if (!job) {
    toast({ title: t('settings.demo.noRequest'), tone: 'info' })
    return
  }
  if (s.settings.role === 'client') {
    toast({
      title: t('settings.demo.requestSent'),
      description: `${job.id} · ${job.title}`,
      tone: 'success',
      action: {
        label: t('settings.demo.openStudio'),
        onClick: () => {
          useApp.getState().setRole('designer')
          navigate('/requests')
        },
      },
    })
  }
}

/** Replays the "It's a match!" overlay with the latest match of the active role. */
export function replayMatch(t: TFn) {
  const s = useApp.getState()
  const role = s.settings.role
  const mine = s.matches.filter((m) => (role === 'client' ? m.clientId === ME_CLIENT_ID : m.designerId === ME_DESIGNER_ID))
  const latest = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!latest) {
    toast({ title: t('settings.demo.noMatch'), tone: 'info' })
    return
  }
  useUI.getState().set({ celebration: latest })
}
