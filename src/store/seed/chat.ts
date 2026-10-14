import { ME_CLIENT_ID, ME_DESIGNER_ID, type Conversation, type Job, type Message } from '../types'
import { ago, art, minsAgo, thread, type ScriptLine } from './factories'

const A = ME_CLIENT_ID
const ME = ME_DESIGNER_ID

/**
 * Conversations. One thread per client ↔ designer pair. Job-related messages
 * (brief, accepted, delivery, revision, approval) are derived from the job
 * records so chat and job detail always tell the same story.
 *
 * In every script `c` = the conversation's client side, `d` = the designer side.
 */
export function buildChat(jobs: Job[]): { conversations: Conversation[]; messages: Message[] } {
  const J = (id: string) => {
    const j = jobs.find((x) => x.id === id)
    if (!j) throw new Error(`[seed] unknown job ${id}`)
    return j
  }
  const brief = (id: string): ScriptLine => {
    const j = J(id)
    return { from: 'c', kind: 'brief', jobId: id, text: `New brief: ${j.title}\n${j.summary}`, at: j.createdAt }
  }
  const accepted = (id: string, text = 'Accepted ✅ — your job is in my queue. I’ll keep you posted here.'): ScriptLine => {
    const ev = J(id).timeline.find((e) => e.kind === 'accepted')
    return { from: 'd', kind: 'status', jobId: id, text, at: ev?.at ?? J(id).createdAt }
  }
  const status = (id: string, from: string, to: string, at: string): ScriptLine => ({
    from: 'd',
    kind: 'status',
    jobId: id,
    text: `Status update: ${from} → ${to}`,
    at,
  })
  const delivery = (id: string, n: number, extra?: Partial<ScriptLine>): ScriptLine => {
    const v = J(id).versions[n - 1]
    return { from: 'd', kind: 'delivery', jobId: id, text: `v${n} is ready for review 🎉\n${v.note}`, attachments: v.media, at: v.submittedAt, ...extra }
  }
  const revisionMsg = (id: string, n: number, extra?: Partial<ScriptLine>): ScriptLine => {
    const r = J(id).revisions[n - 1]
    return {
      from: 'c',
      kind: 'revision',
      jobId: id,
      text: `${r.summary}\n• ${r.items.map((i) => i.text).join('\n• ')}`,
      at: r.requestedAt,
      ...extra,
    }
  }
  const approval = (id: string, extra?: Partial<ScriptLine>): ScriptLine => {
    const j = J(id)
    return {
      from: 'c',
      kind: 'approval',
      jobId: id,
      text: j.review ? `Approved ✅ — “${j.review}”` : 'Approved ✅ — fantastic work, thank you!',
      at: j.approvedAt ?? j.updatedAt,
      ...extra,
    }
  }

  const built = [
    // ═══════════════════════════ Ali as CLIENT ═══════════════════════════
    thread(
      'cv-maya',
      A,
      'd-maya',
      ['DT-2841', 'DT-2779'],
      [
        { from: 'd', text: 'Hi Ali! Thanks for the match 👋 Your Northlight packaging work is lovely — would be great to collaborate.', at: ago(59) },
        brief('DT-2779'),
        { from: 'd', jobId: 'DT-2779', text: 'Foil tests from the printer — the copper reads beautifully on the dark tin.', at: ago(45), attachments: [art('2779-foil', 'brand', 'pattern')], reactions: [{ emoji: '😍', by: [A] }] },
        delivery('DT-2779', 1),
        approval('DT-2779', { reactions: [{ emoji: '💛', by: ['d-maya'] }] }),
        brief('DT-2841'),
        { from: 'd', text: 'Hi Ali! Love this brief. The retro-sunny direction is right up my street ☀️', at: ago(11, 23) },
        { from: 'c', jobId: 'DT-2841', text: 'Here are the flavour shots from Tuesday’s shoot 📸', at: ago(9), attachments: [art('2841-flavour-a', 'brand', 'photo'), art('2841-flavour-b', 'brand', 'photo')] },
        delivery('DT-2841', 1),
        { from: 'c', text: 'B is the one! Dropping pins on the delivery now 📌', at: ago(4, 3) },
        revisionMsg('DT-2841', 1, { key: 'rev' }),
        { from: 'd', text: 'On it! v2 coming your way this week.', at: ago(3, 22), replyTo: 'rev', reactions: [{ emoji: '🙌', by: [A] }] },
        delivery('DT-2841', 2),
        { from: 'd', text: 'Voice note — quick walkthrough of the v2 social kit', at: minsAgo(55), duration: 48 },
        { from: 'd', text: 'Let me know if you want me to jump on a quick call to walk through it!', at: minsAgo(40) },
      ],
      { pinned: true, unreadFor: 'c', unread: 3 },
    ),
    thread(
      'cv-leo',
      A,
      'd-leo',
      ['DT-2796', 'DT-2822'],
      [
        { from: 'd', text: 'Hey Ali! Super happy we matched — your projects look right up my alley.', at: ago(14, 20) },
        { from: 'c', text: 'Likewise! I have a founder film coming up — will send a brief soon.', at: ago(14, 18) },
        brief('DT-2796'),
        { from: 'd', key: 'music', text: 'Footage looks beautiful. Do you have a preferred music style?', at: ago(8, 22) },
        accepted('DT-2796'),
        { from: 'c', text: 'Something warm and acoustic. We are licensing a track — should land in a couple of days.', at: ago(8, 19), replyTo: 'music' },
        status('DT-2796', 'Queued', 'In progress', ago(7)),
        brief('DT-2822'),
        {
          from: 'd',
          kind: 'status',
          jobId: 'DT-2822',
          text: 'I have to pass on this one — I’m fully booked during Design Week. Jonas Lindqvist would be perfect for it!',
          at: ago(5, 18),
        },
        { from: 'c', text: 'Totally understand, thanks for the tip! 🙏', at: ago(5, 17), reactions: [{ emoji: '👍', by: ['d-leo'] }] },
        { from: 'd', jobId: 'DT-2796', text: 'String-out is done — here’s a frame grab from the opening.', at: ago(3), attachments: [art('2796-grab', 'video', 'video')] },
        { from: 'c', text: 'Music licence is still with legal… sorry! Can you keep cutting to temp?', at: ago(1, 2) },
        { from: 'd', jobId: 'DT-2796', text: 'Rough cut is at 48%. Cutting to temp, but I’ll need the final track to lock the edit 🎵', at: ago(0, 3) },
      ],
      { unreadFor: 'c' },
    ),
    thread(
      'cv-jonas',
      A,
      'd-jonas',
      ['DT-2838'],
      [
        { from: 'd', text: 'Hi Ali! Thanks for the match. Customer stories are my favourite thing to cut.', at: ago(19, 20) },
        brief('DT-2838'),
        accepted('DT-2838'),
        status('DT-2838', 'Queued', 'In progress', ago(12)),
        delivery('DT-2838', 1),
        revisionMsg('DT-2838', 1),
        { from: 'd', text: 'Great notes. All three are quick fixes.', at: ago(4) },
        status('DT-2838', 'In progress', 'Final touches', ago(1)),
        { from: 'd', key: 'legal', jobId: 'DT-2838', text: 'Heads-up: I can’t lock subtitles until legal signs off the claims in story 1. Everything else is ready.', at: ago(0, 20) },
        { from: 'c', text: 'Chasing legal now — should have it by tomorrow morning.', at: ago(0, 18), replyTo: 'legal' },
      ],
      { muted: true },
    ),
    thread(
      'cv-sofia',
      A,
      'd-sofia',
      ['DT-2852', 'DT-2833'],
      [
        { from: 'd', text: 'Hi Ali! I super-liked Northlight — your product work is so clean. Would love to help with UX.', at: ago(24, 22) },
        { from: 'c', text: 'Thank you Sofia! Perfect timing, we have an onboarding project.', at: ago(24, 20) },
        brief('DT-2833'),
        accepted('DT-2833'),
        status('DT-2833', 'Queued', 'In progress', ago(16)),
        { from: 'd', jobId: 'DT-2833', text: 'User flow for the six steps — quick sanity check before hi-fi?', at: ago(12), attachments: [art('2833-flow', 'uiux', 'ui')] },
        { from: 'c', text: 'Looks right. Go for it!', at: ago(11, 22), reactions: [{ emoji: '🚀', by: ['d-sofia'] }] },
        delivery('DT-2833', 1),
        revisionMsg('DT-2833', 1),
        { from: 'd', text: 'Merging steps 2 and 3 makes a lot of sense. On it.', at: ago(4, 20) },
        brief('DT-2852'),
        accepted('DT-2852'),
        { from: 'd', text: 'Kick-off call tomorrow at 11:00 works for me 👍', at: ago(1, 15) },
        { from: 'd', jobId: 'DT-2833', text: 'Progress: steps merged and the progress bar is in. Dark mode next.', at: ago(1, 2), attachments: [art('2833-wip', 'uiux', 'ui')] },
        { from: 'c', text: 'So much clearer already 🙌', at: ago(1, 1) },
      ],
    ),
    thread(
      'cv-kenji',
      A,
      'd-kenji',
      ['DT-2860', 'DT-2844', 'DT-2788'],
      [
        { from: 'd', text: 'Hello Ali! Thanks for matching. Are you working on any product launches?', at: ago(49, 20) },
        brief('DT-2788'),
        delivery('DT-2788', 1),
        revisionMsg('DT-2788', 1),
        delivery('DT-2788', 2),
        approval('DT-2788', { reactions: [{ emoji: '🙏', by: ['d-kenji'] }] }),
        brief('DT-2844'),
        accepted('DT-2844'),
        delivery('DT-2844', 1),
        revisionMsg('DT-2844', 1),
        { from: 'd', text: 'Thank you! Lower angle it is — the sole contrast will pop now.', at: ago(6, 12) },
        status('DT-2844', 'In progress', 'Final touches', ago(1, 6)),
        { from: 'd', jobId: 'DT-2844', text: 'Sneak peek of the 6s loop 👀', at: ago(1, 5), attachments: [art('2844-loop', '3d', 'blob3d')], reactions: [{ emoji: '🔥', by: [A] }] },
        brief('DT-2860'),
        { from: 'c', jobId: 'DT-2860', text: 'Added the product dimensions PDF too. No rush on a reply — finish the sneakers first!', at: ago(0, 5) },
      ],
    ),
    thread(
      'cv-amara',
      A,
      'd-amara',
      ['DT-2815', 'DT-2803'],
      [
        { from: 'd', text: 'Hi Ali! Thanks for the match 💛 I’m booked for a few weeks but would love to squeeze in something editorial.', at: ago(39, 20) },
        brief('DT-2803'),
        accepted('DT-2803'),
        status('DT-2803', 'Queued', 'In progress', ago(32)),
        delivery('DT-2803', 1),
        revisionMsg('DT-2803', 1),
        brief('DT-2815'),
        accepted('DT-2815'),
        delivery('DT-2803', 2),
        status('DT-2815', 'Queued', 'In progress', ago(8)),
        approval('DT-2803'),
        { from: 'd', text: 'Thank you so much! Loved working on this — the studio dog is my favourite 🐶', at: ago(6, 22) },
        { from: 'd', key: 'sketches', jobId: 'DT-2815', text: 'Sketches for 4–6 — I went a bit wild with number 5 🙈', at: ago(2), attachments: [art('2815-sk4', 'illustration', 'illustration'), art('2815-sk5', 'illustration', 'illustration'), art('2815-sk6', 'illustration', 'pattern')] },
        { from: 'c', text: 'Number 5 is my favourite! Go with it.', at: ago(1, 20), replyTo: 'sketches', reactions: [{ emoji: '❤️', by: ['d-amara'] }] },
        { from: 'd', jobId: 'DT-2815', text: 'Illustration 4 is coloured, starting 5 tomorrow.', at: ago(0, 7) },
      ],
      { unreadFor: 'c' },
    ),
    thread(
      'cv-elena',
      A,
      'd-elena',
      ['DT-2863', 'DT-2835', 'DT-2846', 'DT-2808'],
      [
        brief('DT-2808'),
        { from: 'c', jobId: 'DT-2808', text: 'Bad news — the trade fair has been postponed to spring. I’m cancelling this one for now, sorry Elena 😔', at: ago(19, 1) },
        { from: 'sys', kind: 'system', jobId: 'DT-2808', text: 'DT-2808 was cancelled. The escrow was refunded to Northlight Studio.', at: ago(19) },
        { from: 'd', text: 'No problem at all — ping me when it’s back on!', at: ago(18, 22) },
        brief('DT-2846'),
        accepted('DT-2846'),
        brief('DT-2835'),
        accepted('DT-2835'),
        status('DT-2846', 'In progress', 'Final touches', ago(4, 6)),
        delivery('DT-2846', 1),
        { from: 'c', key: 'foil', jobId: 'DT-2846', text: 'Left a pin on the invitation — would gold foil work there?', at: ago(1, 6) },
        { from: 'd', text: 'Absolutely, foil is easy. I’ll add a separate foil layer once you approve.', at: ago(1, 5), replyTo: 'foil' },
        brief('DT-2863'),
        { from: 'd', jobId: 'DT-2835', text: 'Small blocker on the flagship campaign: the final product photos aren’t in yet, so POS is on hold.', at: ago(1, 2) },
        {
          from: 'd',
          jobId: 'DT-2863',
          text: 'I’d love to take this on! Could we push the deadline by three days? 14 SKUs need an extra colour-check round with your printer.',
          at: ago(0, 20),
        },
      ],
      { unreadFor: 'c', unread: 2 },
    ),
    thread(
      'cv-nadia',
      A,
      'd-nadia',
      ['DT-2857', 'DT-2826'],
      [
        brief('DT-2826'),
        accepted('DT-2826'),
        status('DT-2826', 'Queued', 'In progress', ago(18)),
        { from: 'd', key: 'frames', jobId: 'DT-2826', text: 'Styleframes for the sting — three directions.', at: ago(12), attachments: [art('2826-sf1', 'motion', 'mesh'), art('2826-sf2', 'motion', 'blob3d'), art('2826-sf3', 'motion', 'video')] },
        { from: 'c', text: 'Direction 2 all the way.', at: ago(11, 20), replyTo: 'frames' },
        delivery('DT-2826', 1),
        revisionMsg('DT-2826', 1),
        status('DT-2826', 'Revisions', 'In progress', ago(7, 20)),
        delivery('DT-2826', 2),
        brief('DT-2857'),
        revisionMsg('DT-2826', 2),
        accepted('DT-2857'),
        { from: 'd', text: 'Thanks for the new brief! The explainer script reads great.', at: ago(2, 17) },
        { from: 'c', jobId: 'DT-2826', text: 'How are the sting tweaks going? We’re past the date — can you share a WIP today?', at: ago(1) },
        { from: 'd', jobId: 'DT-2826', text: 'Sorry for the delay — I was sick for two days. WIP tonight, final v3 tomorrow, promise 🙏', at: ago(0, 22) },
      ],
      { unreadFor: 'c' },
    ),
    thread(
      'cv-ethan',
      A,
      'd-ethan',
      [],
      [
        { from: 'd', text: 'Hey Ali! Thanks for the match 👋 I’d love to hear what you’re working on.', at: ago(1, 22) },
        { from: 'c', text: 'Hi Ethan! We have a fintech dashboard coming up in a few weeks — your Tradewell work is exactly the vibe.', at: ago(1, 20) },
        { from: 'd', text: 'Amazing. Happy to do a quick intro call — Thursday works?', at: ago(1, 19) },
        { from: 'c', text: 'Thursday 16:00 CET works. Sending an invite.', at: ago(1, 18) },
        { from: 'd', text: 'Invite received ✅ See you then!', at: ago(0, 9), reactions: [{ emoji: '👍', by: [A] }] },
      ],
    ),
    thread(
      'cv-zoe',
      A,
      'd-zoe',
      [],
      [
        { from: 'd', text: 'Hi Ali! Thanks for the match. I saw Northlight’s annual report — I’d love to do the data illustrations next year 🙂', at: ago(9, 20) },
        { from: 'c', text: 'That would be great! Our next report kicks off in January, let’s talk then.', at: ago(9, 18) },
        { from: 'd', text: 'Here’s a small sample of infographic spreads, in case it helps.', at: ago(9, 17), attachments: [art('zoe-sample-1', 'illustration', 'pattern'), art('zoe-sample-2', 'illustration', 'illustration')] },
        { from: 'c', text: 'Bookmarked! Love the hand-drawn charts.', at: ago(9, 16), reactions: [{ emoji: '❤️', by: ['d-zoe'] }] },
      ],
    ),

    // ═══════════════════════════ Ali as DESIGNER ═══════════════════════════
    thread(
      'cv-lumen',
      'c-lumen',
      ME,
      ['DT-2830', 'DT-2818'],
      [
        { from: 'c', text: 'Hi Ali! We loved your portfolio — we have a seasonal campaign that could be a great fit.', at: ago(44, 20) },
        { from: 'd', text: 'Hi Emma! Coffee projects are my favourite. Tell me more ☕', at: ago(44, 18) },
        brief('DT-2818'),
        delivery('DT-2818', 1),
        revisionMsg('DT-2818', 1),
        delivery('DT-2818', 2),
        approval('DT-2818', { reactions: [{ emoji: '🥹', by: [ME] }] }),
        brief('DT-2830'),
        accepted('DT-2830'),
        { from: 'd', text: 'Thanks Emma! Starting with the menu boards.', at: ago(13) },
        status('DT-2830', 'Queued', 'In progress', ago(11)),
        delivery('DT-2830', 1),
        revisionMsg('DT-2830', 1),
        status('DT-2830', 'In progress', 'Final touches', ago(1, 2)),
        { from: 'c', jobId: 'DT-2830', text: 'The cup sleeves look amazing — can we see the loyalty card tomorrow?', at: minsAgo(90) },
      ],
      { pinned: true, unreadFor: 'd' },
    ),
    thread(
      'cv-orbit',
      'c-orbit',
      ME,
      ['DT-2848', 'DT-2849'],
      [
        { from: 'c', text: 'Hello! Thanks for matching. Are you open for new work this month?', at: ago(11, 20) },
        { from: 'd', text: 'Hi Daniel! Yes — I have room from next week.', at: ago(11, 18) },
        brief('DT-2849'),
        accepted('DT-2849'),
        status('DT-2849', 'Queued', 'In progress', ago(8)),
        { from: 'd', key: 'board', jobId: 'DT-2849', text: 'Storyboard for the 30s preview — 6 beats.', at: ago(5), attachments: [art('2849-board', 'video', 'ui')] },
        { from: 'c', text: 'Love it. Beat 4 is 🔥', at: ago(4, 20), replyTo: 'board' },
        status('DT-2849', 'In progress', 'Final touches', ago(2, 4)),
        delivery('DT-2849', 1),
        { from: 'c', jobId: 'DT-2849', text: 'Ooh, opening it now 👀 Love the transition into the workout timer!', at: ago(0, 4) },
        brief('DT-2848'),
        { from: 'c', jobId: 'DT-2848', text: 'Hi Ali! We loved your Halo motion toolkit. Would you be up for this one? Timeline is tight 🙏', at: minsAgo(118) },
      ],
      { unreadFor: 'd', unread: 3 },
    ),
    thread(
      'cv-verde',
      'c-verde',
      ME,
      ['DT-2811'],
      [
        { from: 'd', text: 'Hi Lucía! I love what Verde does with deadstock fabric — it would be a dream to work on your lookbook.', at: ago(4, 22) },
        { from: 'c', text: 'Ali! We were literally looking at your profile yesterday 😄 Sending a brief.', at: ago(4, 20) },
        brief('DT-2811'),
        accepted('DT-2811'),
        { from: 'c', jobId: 'DT-2811', text: 'Photo selects are in the brief — here’s my favourite.', at: ago(2, 15), attachments: [art('2811-fav', 'visual', 'photo')] },
        { from: 'd', text: 'Gorgeous light. Thinking full-bleed opener with tiny type.', at: ago(2, 14), reactions: [{ emoji: '❤️', by: ['c-verde'] }] },
      ],
    ),
    thread(
      'cv-pulse',
      'c-pulse',
      ME,
      ['DT-2864', 'DT-2853', 'DT-2842'],
      [
        brief('DT-2842'),
        accepted('DT-2842'),
        status('DT-2842', 'Queued', 'In progress', ago(14)),
        brief('DT-2853'),
        accepted('DT-2853'),
        status('DT-2853', 'Queued', 'In progress', ago(7)),
        delivery('DT-2842', 1),
        { from: 'c', jobId: 'DT-2842', text: 'Thanks Ali! Sharing with finance and the CEO — feedback early next week.', at: ago(4) },
        { from: 'd', jobId: 'DT-2853', text: 'Metal card hero render — first pass on the brushed finish.', at: ago(2), attachments: [art('2853-card', 'visual', 'photo')], reactions: [{ emoji: '🔥', by: ['c-pulse'] }] },
        brief('DT-2864'),
        revisionMsg('DT-2842', 1),
        {
          from: 'd',
          jobId: 'DT-2864',
          text: 'I’d love to take this on! Could we push the deadline by four days? It lets me run proper usability tests on the goal-setup flow.',
          at: ago(1, 2),
        },
        { from: 'c', jobId: 'DT-2864', text: 'Checking the new date with the product team — will confirm by tomorrow.', at: ago(0, 6) },
      ],
      { pinned: true, unreadFor: 'd' },
    ),
    thread(
      'cv-pixelforge',
      'c-pixelforge',
      ME,
      ['DT-2856', 'DT-2799'],
      [
        { from: 'c', text: 'Moi Ali! Our art team loved your 3D work. We need key art for our Steam page — interested?', at: ago(54, 20) },
        { from: 'd', text: 'Hi Mikko! A cosy-dark RPG? I’m in. 🗡️', at: ago(54, 16) },
        brief('DT-2799'),
        accepted('DT-2799'),
        delivery('DT-2799', 1),
        approval('DT-2799'),
        { from: 'd', text: 'Thank you! Can’t wait to see it on Steam.', at: ago(32, 20) },
        brief('DT-2856'),
        accepted('DT-2856'),
        status('DT-2856', 'Queued', 'In progress', ago(9)),
        { from: 'd', jobId: 'DT-2856', text: 'Title card styleframes — embers and iron.', at: ago(6), attachments: [art('2856-sf1', 'motion', 'mesh'), art('2856-sf2', 'motion', 'video')] },
        { from: 'c', text: 'These are perfect. The team is hyped.', at: ago(5, 20) },
        { from: 'd', text: 'Friendly reminder: the kick-off invoice INV-1043 is now due — could you check with finance? 🙏', at: ago(2) },
        { from: 'c', text: 'Sorry! Finance is on it. Also — gameplay capture slips to next week, apologies.', at: ago(1, 20) },
        { from: 'd', jobId: 'DT-2856', text: 'No worries, I’ll keep building the title cards around placeholders.', at: ago(1, 18) },
      ],
    ),
    thread(
      'cv-paperkite',
      'c-paperkite',
      ME,
      ['DT-2866', 'DT-2784'],
      [
        { from: 'c', text: 'Hello Ali! Thanks for matching. We’re refreshing our imprint identity — interested?', at: ago(74, 20) },
        { from: 'd', text: 'Very! Publishing is a dream category for me.', at: ago(74, 18) },
        brief('DT-2784'),
        accepted('DT-2784'),
        status('DT-2784', 'Queued', 'In progress', ago(68)),
        delivery('DT-2784', 1),
        revisionMsg('DT-2784', 1),
        delivery('DT-2784', 2),
        revisionMsg('DT-2784', 2),
        delivery('DT-2784', 3),
        approval('DT-2784'),
        brief('DT-2866'),
        { from: 'c', jobId: 'DT-2866', text: 'We think your eye for type would make the hand-lettered title sing. Manuscript excerpt attached — no spoilers past chapter 3 😉', at: ago(0, 8) },
      ],
      { unreadFor: 'd', unread: 2 },
    ),
    thread(
      'cv-volta',
      'c-volta',
      ME,
      [],
      [
        { from: 'c', text: 'Hi Ali! We loved your portfolio — we’re preparing the Volta One launch and need someone who can make engineering feel emotional.', at: ago(2, 22) },
        { from: 'd', text: 'Hi Julia! That’s exactly my kind of brief. Do you have a launch date and a rough scope?', at: ago(2, 20) },
        { from: 'c', text: 'Launch film + key visuals, budget around €12k. Can we do a call next week?', at: ago(2, 6) },
        { from: 'd', text: 'Absolutely — I’ve sent a few slots. Looking forward!', at: ago(2, 5), reactions: [{ emoji: '👍', by: ['c-volta'] }] },
      ],
    ),
  ]

  return {
    conversations: built.map((b) => b.conversation),
    messages: built.flatMap((b) => b.messages),
  }
}
