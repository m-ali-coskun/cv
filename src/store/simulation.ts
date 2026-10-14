/**
 * The "other side" of the marketplace.
 *
 * designTab runs fully client-side, so every counterpart (the designers Ali
 * hires, the clients who hire Ali) is simulated here: they type, reply, accept
 * briefs, ask for revisions, approve work and like you back. All bot content is
 * English by design (only UI chrome is translated).
 */
import { uid } from '@/lib/ids'
import { prng } from '@/lib/random'
import { toast } from './toasts'
import { useUI } from './ui'
import { ME_CLIENT_ID, ME_DESIGNER_ID, type Job, type JobStatus, type Match, type Message, type Role } from './types'
// NOTE: circular import is safe — `useApp` is only touched inside functions at runtime.
import { useApp } from './index'

const timers = new Set<ReturnType<typeof setTimeout>>()
const rnd = prng(Date.now())

function later(ms: number, fn: () => void) {
  const t = setTimeout(() => {
    timers.delete(t)
    try {
      fn()
    } catch (e) {
      console.error('[simulation]', e)
    }
  }, ms)
  timers.add(t)
}

const S = () => useApp.getState()

function person(id: string) {
  const s = S()
  return s.designers.find((d) => d.id === id) ?? s.clients.find((c) => c.id === id)
}
function jobOf(id: string): Job | undefined {
  return S().jobs.find((j) => j.id === id)
}

/** Show the typing indicator, then post `text` as `senderId`. */
function typeThenSay(conversationId: string, senderId: string, text: string, opts?: { delay?: number; jobId?: string; kind?: Message['kind'] }) {
  const start = opts?.delay ?? 900 + rnd.int(0, 900)
  const typingFor = Math.min(4200, 900 + text.length * 22)
  later(start, () => useUI.getState().setTyping(conversationId, true))
  later(start + typingFor, () => {
    useUI.getState().setTyping(conversationId, false)
    const msg = S().postMessage(conversationId, senderId, { text, jobId: opts?.jobId, kind: opts?.kind })
    announceMessage(conversationId, senderId, msg)
  })
  return start + typingFor
}

function announceMessage(conversationId: string, senderId: string, msg: Message) {
  const s = S()
  const conv = s.conversations.find((c) => c.id === conversationId)
  if (!conv || conv.muted) return
  const role: Role = senderId === conv.designerId ? 'client' : 'designer'
  const onScreen = useUI.getState().activeConversationId === conversationId && s.settings.role === role
  if (onScreen) {
    s.markConversationRead(conversationId, role === 'client' ? conv.clientId : conv.designerId)
    return
  }
  const p = person(senderId)
  if (s.settings.role === role) {
    toast({
      title: p?.name ?? 'New message',
      description: msg.text.length > 90 ? msg.text.slice(0, 88) + '…' : msg.text,
      tone: 'message',
      avatarSeed: p?.avatarSeed,
      link: `/messages/${conversationId}`,
    })
  }
}

// ───────────────────────────── canned lines ─────────────────────────────

const DESIGNER_REPLIES = {
  thanks: ['Anytime! 🙌', 'My pleasure — this one is fun to work on.', 'Thank you! Means a lot 😊'],
  deadline: [
    'All on track for the deadline. I’ll share a progress update tomorrow morning.',
    'Timeline looks good on my side — first look by Thursday, final on the due date.',
  ],
  revision: [
    'Noted! I’ll work those changes in and send the next version shortly.',
    'Makes sense. I’ll tighten that up and ping you when it’s ready.',
  ],
  question: [
    'Good question — let me check and come back to you within the hour.',
    'I’d suggest we go with option A, it reads better at small sizes. Want me to mock both?',
    'Yes, that works. I’ll include it in the next round.',
  ],
  files: ['Got the files, thank you! The references help a lot.', 'Received 👍 I’ll pull these into the working file.'],
  generic: [
    'Sounds great, I’m on it.',
    'Love that direction! I’ll explore a couple of options around it.',
    'Perfect, that gives me everything I need for now.',
    'Quick update: moodboard is done, moving into first concepts today.',
    'Will do! I’ll keep you posted here.',
  ],
}

const CLIENT_REPLIES = {
  thanks: ['Thank you!! 🙏', 'Appreciate it, great work as always.'],
  progress: [
    'Love the progress so far!',
    'Looking really good — the team is excited.',
    'This is heading in exactly the right direction 🔥',
  ],
  question: [
    'Good point. Let’s go with whatever feels more on-brand to you.',
    'Let me check with the team and get back to you today.',
    'Yes please, that would be great.',
  ],
  generic: [
    'Great, thanks for the update!',
    'Perfect 👌',
    'Sounds good to us.',
    'Thanks! Shout if you need anything else from our side.',
  ],
}

function pickReply(text: string, side: 'designer' | 'client') {
  const t = text.toLowerCase()
  if (side === 'designer') {
    if (/thank|thx|danke|teşekk/.test(t)) return rnd.pick(DESIGNER_REPLIES.thanks)
    if (/deadline|when|date|time|eta|due/.test(t)) return rnd.pick(DESIGNER_REPLIES.deadline)
    if (/change|revis|tweak|adjust|fix|update/.test(t)) return rnd.pick(DESIGNER_REPLIES.revision)
    if (/file|asset|attach|upload|shared/.test(t)) return rnd.pick(DESIGNER_REPLIES.files)
    if (t.includes('?')) return rnd.pick(DESIGNER_REPLIES.question)
    return rnd.pick(DESIGNER_REPLIES.generic)
  }
  if (/thank|thx|danke|teşekk/.test(t)) return rnd.pick(CLIENT_REPLIES.thanks)
  if (t.includes('?')) return rnd.pick(CLIENT_REPLIES.question)
  if (/progress|update|wip|draft|version|moodboard/.test(t)) return rnd.pick(CLIENT_REPLIES.progress)
  return rnd.pick(CLIENT_REPLIES.generic)
}

// ───────────────────────────── incoming request templates ─────────────────────────────

const REQUEST_TEMPLATES: { title: string; summary: string; discipline: Job['discipline']; deliverables: string[]; budget: number; days: number; mood: string[]; palette: string[] }[] = [
  {
    title: 'Launch teaser — 15s vertical cut',
    summary: 'Cut a punchy 15s teaser for our app launch from existing footage.',
    discipline: 'video',
    deliverables: ['9:16 master (15s)', '1:1 cut-down', 'Captions burned in', 'Thumbnail frame'],
    budget: 900,
    days: 6,
    mood: ['Energetic', 'Bold'],
    palette: ['#0B0B0C', '#9999FF', '#FFFFFF'],
  },
  {
    title: 'Podcast cover art + episode template',
    summary: 'Square cover art and a reusable episode thumbnail template.',
    discipline: 'visual',
    deliverables: ['Cover 3000×3000', 'Episode template (PSD)', 'Social banner'],
    budget: 650,
    days: 9,
    mood: ['Warm', 'Editorial'],
    palette: ['#F4E9DC', '#C2410C', '#1C1917'],
  },
  {
    title: 'Onboarding flow redesign (5 screens)',
    summary: 'Refresh our mobile onboarding — 5 screens, light + dark.',
    discipline: 'uiux',
    deliverables: ['User flow', 'Hi-fi screens (light/dark)', 'Prototype link', 'Dev handoff notes'],
    budget: 2400,
    days: 14,
    mood: ['Minimal', 'Friendly'],
    palette: ['#FF61F6', '#111827', '#F9FAFB'],
  },
  {
    title: 'Logo animation for brand intro',
    summary: 'Animate our new logo into a 4s sting for videos and socials.',
    discipline: 'motion',
    deliverables: ['4s logo sting (4K)', 'Transparent ProRes', 'Lottie export'],
    budget: 1100,
    days: 8,
    mood: ['Playful', 'Premium'],
    palette: ['#CF96FD', '#1B0533', '#FFFFFF'],
  },
  {
    title: 'Packaging illustration — limited edition tea',
    summary: 'Hand-drawn botanical illustration wrapping a cylindrical tin.',
    discipline: 'illustration',
    deliverables: ['Wrap illustration (vector)', 'Colour variants ×3', 'Print-ready PDF'],
    budget: 1500,
    days: 12,
    mood: ['Organic', 'Whimsical'],
    palette: ['#FF9A00', '#14532D', '#FEF3C7'],
  },
  {
    title: 'Product renders for Kickstarter',
    summary: 'Photoreal renders of our speaker in 3 colourways + exploded view.',
    discipline: '3d',
    deliverables: ['Hero render ×3', 'Exploded view', '360° turntable'],
    budget: 2800,
    days: 16,
    mood: ['Clean', 'Studio'],
    palette: ['#2EE6C5', '#0F172A', '#E2E8F0'],
  },
]

// ───────────────────────────── public API ─────────────────────────────

let designerRoleSpawned = false

export const sim = {
  cancelAll() {
    timers.forEach(clearTimeout)
    timers.clear()
    designerRoleSpawned = false
  },

  /** Client Ali sent a brief → designer bot reads, replies and accepts. */
  onBriefSent(jobId: string) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    const conv = job.conversationId
    const t = typeThenSay(
      conv,
      job.designerId,
      `Hi Ali! Thanks for the brief — “${job.title}” looks exciting. Going through the assets now.`,
      { delay: 1800, jobId },
    )
    const counter = rnd.bool(0.2)
    later(t + 2600, () => {
      const j = jobOf(jobId)
      if (!j || j.status !== 'requested') return
      if (counter) {
        const due = new Date(new Date(j.dueAt).getTime() + 3 * 864e5).toISOString()
        S().acceptJob(jobId, { counterDueAt: due, note: 'I want to give this the polish it deserves.' })
      } else {
        S().acceptJob(jobId)
      }
    })
    if (!counter) {
      later(t + 14000, () => {
        const j = jobOf(jobId)
        if (!j || j.status !== 'queued') return
        S().setJobStatus(jobId, 'in_progress', { silent: true })
        S().setJobProgress(jobId, 18)
        typeThenSay(conv, j.designerId, 'Kicked off! 🚀 Moodboard first — I’ll share it here in a bit.', { jobId })
      })
    }
  },

  onCounterAnswered(jobId: string, accepted: boolean) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    typeThenSay(
      job.conversationId,
      job.designerId,
      accepted ? 'Amazing, thank you! Starting first thing tomorrow.' : 'Understood — I’ll make the original date work. 💪',
      { jobId },
    )
    later(6000, () => {
      const j = jobOf(jobId)
      if (!j) return
      if (!accepted && j.status === 'requested') S().acceptJob(jobId)
    })
  },

  /** Client Ali requested revisions → designer acknowledges and gets back to work. */
  onRevisionRequested(jobId: string) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    const t = typeThenSay(
      job.conversationId,
      job.designerId,
      `Thanks for the clear notes! I’ll work through them and send v${job.versions.length + 1} soon.`,
      { jobId },
    )
    later(t + 3000, () => {
      const j = jobOf(jobId)
      if (j?.status === 'revisions') S().setJobStatus(jobId, 'in_progress', { silent: true })
    })
    // …and a little later, deliver the next version.
    later(t + 45000, () => {
      const j = jobOf(jobId)
      if (!j || j.status !== 'in_progress') return
      S().submitVersion(jobId, { note: 'Revisions applied — all notes addressed. Let me know what you think!', media: [] })
    })
  },

  onApproved(jobId: string) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    typeThenSay(job.conversationId, job.designerId, 'Thank you so much! Loved working on this — happy to help with the next one 💛', { jobId })
  },

  /** Any message sent by Ali → the counterpart replies. */
  onMessageSent(conversationId: string, msg: Message) {
    const s = S()
    const conv = s.conversations.find((c) => c.id === conversationId)
    if (!conv) return
    const fromClientSide = msg.senderId === conv.clientId
    const bot = fromClientSide ? conv.designerId : conv.clientId
    if (bot === ME_CLIENT_ID || bot === ME_DESIGNER_ID) return
    // React with an emoji sometimes, for life-likeness.
    if (rnd.bool(0.25)) later(1200, () => S().toggleReaction(msg.id, rnd.pick(['👍', '❤️', '🔥', '🙌']), bot))
    const text = msg.text || (msg.attachments?.length ? 'shared files' : '')
    typeThenSay(conversationId, bot, pickReply(text, fromClientSide ? 'designer' : 'client'), { jobId: msg.jobId })
  },

  onMatched(match: Match) {
    useUI.getState().set({ celebration: match })
    const s = S()
    const conv = s.ensureConversation(match.clientId, match.designerId)
    const role = s.settings.role
    const other = role === 'client' ? match.designerId : match.clientId
    const line =
      role === 'client'
        ? rnd.pick([
            'Hey Ali! Thanks for the match 👋 I’d love to hear what you’re working on.',
            'Hi! Super happy we matched — your projects look right up my alley.',
          ])
        : rnd.pick([
            'Hi Ali! We loved your portfolio — we have a project that could be a great fit.',
            'Hello! Thanks for matching. Are you open for new work this month?',
          ])
    typeThenSay(conv, other, line, { delay: 4000 })
  },

  /** Liked but not (yet) mutual — maybe they like you back later. */
  onLikedWithoutMatch(profileId: string, role: Role) {
    if (!rnd.bool(0.45)) return
    later(rnd.int(7000, 16000), () => {
      const s = S()
      if (s.decisions[role][profileId] !== 'like') return
      const clientId = role === 'client' ? ME_CLIENT_ID : profileId
      const designerId = role === 'client' ? profileId : ME_DESIGNER_ID
      const match = s.createMatch(clientId, designerId, role)
      const p = person(profileId)
      s.notify(
        {
          role,
          kind: 'match',
          title: `${p?.name ?? 'Someone'} liked you back!`,
          body: 'It’s a match — start a conversation or send a brief.',
          link: `/network/${profileId}`,
          actorAvatarSeed: p?.avatarSeed,
        },
        { toast: s.settings.role === role },
      )
      sim.onMatched(match)
    })
  },

  // ───── designer side (Ali is the designer, clients are bots) ─────

  onEnterDesignerRole() {
    if (designerRoleSpawned) return
    designerRoleSpawned = true
    later(25000, () => {
      if (S().settings.role === 'designer') sim.spawnIncomingRequest()
    })
  },

  spawnIncomingRequest(): Job | undefined {
    const s = S()
    const candidates = s.clients.filter((c) => c.id !== ME_CLIENT_ID)
    if (!candidates.length) return undefined
    const matchedIds = new Set(s.matches.filter((m) => m.designerId === ME_DESIGNER_ID).map((m) => m.clientId))
    const pool = candidates.filter((c) => matchedIds.has(c.id))
    const client = rnd.pick(pool.length ? pool : candidates)
    const tpl = rnd.pick(REQUEST_TEMPLATES)
    s.createMatch(client.id, ME_DESIGNER_ID, 'client')
    const job = s.createJob({
      title: tpl.title,
      summary: tpl.summary,
      description: `${tpl.summary}\n\nWe’re ${client.name} (${client.industry}). Everything you need is attached — let us know if anything is unclear!`,
      designerId: ME_DESIGNER_ID,
      clientId: client.id,
      discipline: tpl.discipline,
      priority: rnd.pick(['medium', 'high', 'medium', 'urgent'] as const),
      dueAt: new Date(Date.now() + tpl.days * 864e5).toISOString(),
      budget: tpl.budget,
      deliverables: tpl.deliverables,
      styleGuide: {
        palette: tpl.palette,
        fonts: [rnd.pick(['Inter', 'Söhne', 'GT America', 'Neue Montreal', 'Satoshi'])],
        mood: tpl.mood,
        references: [{ id: uid('rf_'), label: 'Brand guidelines', url: 'https://example.com/brand' }],
        dos: ['Keep it on-brand', 'Leave breathing room around the logo'],
        donts: ['No stock-photo look'],
        notes: '',
      },
      assets: [
        {
          id: uid('a_'),
          name: 'brand-moodboard.jpg',
          kind: 'image',
          size: 2_400_000,
          media: { kind: 'art', seed: `${tpl.title}-mood`, variant: 'mesh', discipline: tpl.discipline },
          addedBy: client.id,
          addedAt: new Date().toISOString(),
        },
      ],
      revisionLimit: 2,
      tags: [tpl.discipline],
    })
    s.notify(
      {
        role: 'designer',
        kind: 'job_request',
        title: `New request from ${client.name}`,
        body: `${tpl.title} · ${tpl.budget} ${s.settings.currency}`,
        link: `/jobs/${job.id}`,
        actorAvatarSeed: client.avatarSeed,
      },
      { toast: s.settings.role === 'designer' },
    )
    return job
  },

  onDesignerAccepted(jobId: string, counter: boolean) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    if (counter) {
      typeThenSay(job.conversationId, job.clientId, 'Let me check with the team about the new date…', { jobId })
      later(9000, () => {
        const j = jobOf(jobId)
        if (j?.counterOffer?.status === 'pending') S().respondCounterOffer(jobId, rnd.bool(0.75))
      })
      return
    }
    typeThenSay(job.conversationId, job.clientId, `Wonderful, thanks Ali! Excited to see what you come up with ✨`, { jobId })
  },

  onDesignerDeclined(jobId: string) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    typeThenSay(job.conversationId, job.clientId, 'No worries at all, thanks for letting us know quickly!', { jobId })
  },

  onDesignerStatusChanged(jobId: string, status: JobStatus) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    if (status === 'in_progress' || status === 'final_touches') {
      if (rnd.bool(0.6)) typeThenSay(job.conversationId, job.clientId, rnd.pick(CLIENT_REPLIES.progress), { jobId, delay: 2500 })
    }
  },

  /** Designer Ali delivered → the client bot reviews and approves or asks for changes. */
  onDesignerDelivered(jobId: string) {
    const job = jobOf(jobId)
    if (!job?.conversationId) return
    const conv = job.conversationId
    const askChanges = job.revisions.length < Math.min(1, job.revisionLimit) && rnd.bool(0.6)
    const t = typeThenSay(conv, job.clientId, 'Ooh, opening it now 👀', { jobId, delay: 2000 })
    later(t + 7000, () => {
      const j = jobOf(jobId)
      if (!j || j.status !== 'in_review') return
      const v = j.versions[j.versions.length - 1]
      if (askChanges) {
        // drop a couple of pins on the delivery too
        if (v) {
          S().updateJob(jobId, {
            versions: j.versions.map((x) =>
              x.id === v.id
                ? {
                    ...x,
                    annotations: [
                      ...x.annotations,
                      { id: uid('an_'), x: 32, y: 28, mediaIndex: 0, text: 'Can this headline be a touch bigger?', authorId: j.clientId, createdAt: new Date().toISOString(), resolved: false },
                      { id: uid('an_'), x: 68, y: 72, mediaIndex: 0, text: 'Love this detail — keep it!', authorId: j.clientId, createdAt: new Date().toISOString(), resolved: false },
                    ],
                  }
                : x,
            ),
          })
        }
        S().requestRevision(jobId, {
          summary: 'Really close! A few small tweaks before we sign off',
          items: ['Increase headline size slightly', 'Try the accent colour on the CTA', 'Export an extra 4:5 version'],
          versionId: v?.id,
        })
        S().notify(
          {
            role: 'designer',
            kind: 'revision',
            title: `${person(j.clientId)?.name ?? 'Client'} requested revisions`,
            body: j.title,
            link: `/jobs/${jobId}`,
            actorAvatarSeed: person(j.clientId)?.avatarSeed,
          },
          { toast: S().settings.role === 'designer' },
        )
      } else {
        S().approveJob(jobId, { rating: 5, review: 'Exceeded expectations — fast, thoughtful and a joy to work with.' })
      }
    })
  },

  onInvoiceReminder(invoiceId: string) {
    later(8000, () => {
      const inv = S().invoices.find((i) => i.id === invoiceId)
      if (inv && inv.status !== 'paid') {
        S().payInvoice(invoiceId)
        S().notify(
          {
            role: 'designer',
            kind: 'payment',
            title: `${invoiceId} was paid`,
            body: `${inv.amount} ${inv.currency} received from ${person(inv.clientId)?.name ?? 'client'}.`,
            link: '/payments',
            actorAvatarSeed: person(inv.clientId)?.avatarSeed,
          },
          { toast: S().settings.role === 'designer' },
        )
      }
    })
  },
}
