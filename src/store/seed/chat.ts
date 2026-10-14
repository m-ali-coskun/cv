import { ME_CLIENT_ID, ME_DESIGNER_ID, type Conversation, type Message } from '../types'
import { ago, art, minsAgo, thread } from './factories'

const built = [
  thread(
    'cv-maya',
    ME_CLIENT_ID,
    'd-maya',
    ['DT-2841'],
    [
      { from: 'c', kind: 'brief', jobId: 'DT-2841', text: 'New brief: Cold brew launch — key visual & social kit\nHero key visual plus a 12-piece social kit.', at: ago(12) },
      { from: 'd', text: 'Hi Ali! Love this brief. The retro-sunny direction is right up my street ☀️', at: ago(12, -1) },
      { from: 'd', kind: 'delivery', jobId: 'DT-2841', text: 'v1 is ready for review 🎉\nTwo directions to compare.', at: ago(5), attachments: [art('2841-v1a', 'brand', 'poster'), art('2841-v1b', 'brand', 'pattern')] },
      { from: 'c', kind: 'revision', jobId: 'DT-2841', text: 'Go with direction B, push the retro type further\n• Use direction B as base\n• Bigger, bolder flavour names', at: ago(4) },
      { from: 'd', text: 'On it! v2 coming your way this week.', at: ago(4, -2), reactions: [{ emoji: '🙌', by: [ME_CLIENT_ID] }] },
      { from: 'd', kind: 'delivery', jobId: 'DT-2841', text: 'v2 is ready for review 🎉\nDirection B refined, full social kit attached.', at: ago(0, 5), attachments: [art('2841-v2a', 'brand', 'poster'), art('2841-v2b', 'brand', 'type')] },
      { from: 'd', text: 'Let me know if you want me to jump on a quick call to walk through it!', at: minsAgo(40) },
    ],
    { pinned: true, unreadFor: 'c' },
  ),
  thread(
    'cv-leo',
    ME_CLIENT_ID,
    'd-leo',
    ['DT-2796'],
    [
      { from: 'c', kind: 'brief', jobId: 'DT-2796', text: 'New brief: Founder story — 3 min brand film edit', at: ago(9) },
      { from: 'd', text: 'Footage looks beautiful. Do you have a preferred music style?', at: ago(8) },
      { from: 'c', text: 'Something warm and acoustic. We are licensing a track — should land soon.', at: ago(8, -1) },
      { from: 'd', text: 'Rough cut is at 48%. Still waiting on that music track to lock the edit 🎵', at: ago(0, 3) },
    ],
    { unreadFor: 'c' },
  ),
  thread(
    'cv-lumen',
    'c-lumen',
    ME_DESIGNER_ID,
    ['DT-2830'],
    [
      { from: 'c', kind: 'brief', jobId: 'DT-2830', text: 'New brief: Café rebrand — menu boards & cups', at: ago(14) },
      { from: 'd', text: 'Thanks Emma! Starting with the menu boards.', at: ago(13) },
      { from: 'c', text: 'The cup sleeves look amazing — can we see the loyalty card tomorrow?', at: minsAgo(90) },
    ],
    { pinned: true, unreadFor: 'd' },
  ),
  thread(
    'cv-orbit',
    'c-orbit',
    ME_DESIGNER_ID,
    ['DT-2848'],
    [
      { from: 'c', kind: 'brief', jobId: 'DT-2848', text: 'New brief: Summer challenge — ad set (6 videos)\nSix 15s vertical ads for the summer challenge campaign.', at: ago(0, 2) },
      { from: 'c', text: 'Hi Ali! We loved your Halo motion toolkit. Would you be up for this one? Timeline is tight 🙏', at: ago(0, 2) },
    ],
    { unreadFor: 'd' },
  ),
]

export const conversations: Conversation[] = built.map((b) => b.conversation)
export const messages: Message[] = built.flatMap((b) => b.messages)
