import {
  ME_CLIENT_ID,
  ME_DESIGNER_ID,
  type AppNotification,
  type CalendarEvent,
  type Invoice,
  type Match,
  type Role,
  type SwipeDecision,
} from '../types'
import { ago, calEvent, dayAt, minsAgo } from './factories'

const A = ME_CLIENT_ID
const ME = ME_DESIGNER_ID

/**
 * Matches exist for every client ↔ designer pair that has a job or a chat.
 * New designers / clients (`isNew`) are deliberately left UNDECIDED so the
 * Discover deck is full in both roles.
 */
export function buildMatches(): Match[] {
  return [
    // Ali as client
    { id: 'mt-1', clientId: A, designerId: 'd-maya', createdAt: ago(60), initiatedBy: 'client', superLike: false, favorite: true, note: 'Go-to for packaging. Books up fast — brief early.' },
    { id: 'mt-2', clientId: A, designerId: 'd-leo', createdAt: ago(15), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-3', clientId: A, designerId: 'd-sofia', createdAt: ago(25), initiatedBy: 'designer', superLike: true, favorite: false },
    { id: 'mt-4', clientId: A, designerId: 'd-kenji', createdAt: ago(50), initiatedBy: 'client', superLike: false, favorite: true, note: 'Best product CGI we have worked with. Needs CAD early.' },
    { id: 'mt-5', clientId: A, designerId: 'd-amara', createdAt: ago(40), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-9', clientId: A, designerId: 'd-elena', createdAt: ago(320), initiatedBy: 'client', superLike: true, favorite: true, note: 'Retail + retouching. Calm under pressure.' },
    { id: 'mt-10', clientId: A, designerId: 'd-nadia', createdAt: ago(230), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-11', clientId: A, designerId: 'd-jonas', createdAt: ago(20), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-12', clientId: A, designerId: 'd-ethan', createdAt: ago(2), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-13', clientId: A, designerId: 'd-zoe', createdAt: ago(10), initiatedBy: 'designer', superLike: false, favorite: false, note: 'Annual report 2027 — talk in January.' },
    // Ali as designer
    { id: 'mt-6', clientId: 'c-lumen', designerId: ME, createdAt: ago(45), initiatedBy: 'client', superLike: false, favorite: true },
    { id: 'mt-7', clientId: 'c-orbit', designerId: ME, createdAt: ago(12), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-8', clientId: 'c-verde', designerId: ME, createdAt: ago(5), initiatedBy: 'designer', superLike: false, favorite: false },
    { id: 'mt-14', clientId: 'c-pulse', designerId: ME, createdAt: ago(400), initiatedBy: 'client', superLike: true, favorite: true, note: 'Biggest repeat client. Hannah approves fast.' },
    { id: 'mt-15', clientId: 'c-pixelforge', designerId: ME, createdAt: ago(55), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-16', clientId: 'c-paperkite', designerId: ME, createdAt: ago(75), initiatedBy: 'client', superLike: false, favorite: false },
    { id: 'mt-17', clientId: 'c-volta', designerId: ME, createdAt: ago(3), initiatedBy: 'client', superLike: false, favorite: false },
  ]
}

export function buildDecisions(): Record<Role, Record<string, SwipeDecision>> {
  return {
    client: {
      'd-maya': 'like',
      'd-leo': 'like',
      'd-sofia': 'like',
      'd-kenji': 'like',
      'd-amara': 'like',
      'd-elena': 'super',
      'd-nadia': 'like',
      'd-jonas': 'like',
      'd-ethan': 'like',
      'd-zoe': 'like',
      'd-felix': 'pass',
    },
    designer: {
      'c-lumen': 'like',
      'c-orbit': 'like',
      'c-verde': 'like',
      'c-pulse': 'like',
      'c-pixelforge': 'like',
      'c-paperkite': 'like',
      'c-volta': 'like',
    },
  }
}

export function buildNotifications(): AppNotification[] {
  return [
    // ───────── client role ─────────
    { id: 'n-1', role: 'client', kind: 'delivery', title: 'Maya Chen delivered v2', body: 'Cold brew launch — key visual & social kit', createdAt: ago(0, 5), read: false, link: '/jobs/DT-2841', actorAvatarSeed: 'maya-chen' },
    { id: 'n-2', role: 'client', kind: 'ai', title: '3 jobs at risk of slipping', body: 'DT-2826 is 2 days overdue, DT-2796 is blocked on a music licence and due tomorrow, DT-2846 has waited 3 days for your review.', createdAt: ago(0, 1), read: false, link: '/jobs' },
    { id: 'n-3', role: 'client', kind: 'job_request', title: 'Elena Rossi proposed a new deadline', body: 'Gift guide — product retouching & composites · +3 days', createdAt: ago(0, 20), read: false, link: '/jobs/DT-2863', actorAvatarSeed: 'elena-rossi' },
    { id: 'n-4', role: 'client', kind: 'message', title: 'Leo Martins', body: 'Rough cut is at 48%. Cutting to temp, but I’ll need the final track to lock the edit 🎵', createdAt: ago(0, 3), read: false, link: '/messages/cv-leo', actorAvatarSeed: 'leo-martins' },
    { id: 'n-5', role: 'client', kind: 'deadline', title: 'DT-2838 is due today', body: 'Customer stories — 3 testimonial edits · blocked on legal sign-off', createdAt: ago(0, 8), read: false, link: '/jobs/DT-2838', actorAvatarSeed: 'jonas-lindqvist' },
    { id: 'n-6', role: 'client', kind: 'like', title: 'Hana Kim liked Northlight Studio', body: 'A new illustrator who joined 4 days ago. Like back to match.', createdAt: ago(0, 11), read: false, link: '/discover', actorAvatarSeed: 'hana-kim' },
    { id: 'n-7', role: 'client', kind: 'payment', title: 'INV-1047 is overdue', body: 'Hi-fi screens milestone for Sofia Novak · €960 was due 2 days ago.', createdAt: ago(1, 3), read: false, link: '/payments', actorAvatarSeed: 'sofia-novak' },
    { id: 'n-8', role: 'client', kind: 'match', title: 'It’s a match with Ethan Brooks!', body: 'You both liked each other. Say hi and send a first brief.', createdAt: ago(2), read: true, link: '/network/d-ethan', actorAvatarSeed: 'ethan-brooks' },
    { id: 'n-9', role: 'client', kind: 'job_accepted', title: 'Sofia Novak accepted DT-2852', body: 'Pricing page redesign', createdAt: ago(1, 16), read: true, link: '/jobs/DT-2852', actorAvatarSeed: 'sofia-novak' },
    { id: 'n-10', role: 'client', kind: 'status', title: 'Kenji moved DT-2844 to Final touches', body: 'Sneaker drop — 3D hero renders & 6s loop · 86%', createdAt: ago(1, 6), read: true, link: '/jobs/DT-2844', actorAvatarSeed: 'kenji-watanabe' },
    { id: 'n-11', role: 'client', kind: 'like', title: 'Aisha Bello liked Northlight Studio', body: 'Brand designer from Lagos · joined 10 days ago.', createdAt: ago(3, 2), read: true, link: '/discover', actorAvatarSeed: 'aisha-bello' },
    { id: 'n-12', role: 'client', kind: 'job_declined', title: 'Leo Martins declined DT-2822', body: 'Fully booked during Design Week — recommended Jonas Lindqvist.', createdAt: ago(5, 18), read: true, link: '/jobs/DT-2822', actorAvatarSeed: 'leo-martins' },
    { id: 'n-13', role: 'client', kind: 'approved', title: 'You approved DT-2803 · 5★', body: '€1,300 released to Amara Okafor.', createdAt: ago(7), read: true, link: '/jobs/DT-2803', actorAvatarSeed: 'amara-okafor' },
    { id: 'n-14', role: 'client', kind: 'system', title: '10 new designers joined this week', body: 'Fresh portfolios in visual, video, motion, 3D and more — swipe through them in Discover.', createdAt: ago(1, 9), read: false, link: '/discover' },

    // ───────── designer role ─────────
    { id: 'n-15', role: 'designer', kind: 'job_request', title: 'New request from Orbit Fitness', body: '30-day challenge — ad set (6 videos) · 3,000 EUR', createdAt: ago(0, 2), read: false, link: '/jobs/DT-2848', actorAvatarSeed: 'orbit-fitness' },
    { id: 'n-16', role: 'designer', kind: 'job_request', title: 'New request from Paper Kite Press', body: 'Book cover — “The Cartographer’s Daughter” · 1,800 EUR', createdAt: ago(0, 9), read: false, link: '/jobs/DT-2866', actorAvatarSeed: 'paper-kite-press' },
    { id: 'n-17', role: 'designer', kind: 'message', title: 'Emma Schultz', body: 'The cup sleeves look amazing — can we see the loyalty card tomorrow?', createdAt: minsAgo(90), read: false, link: '/messages/cv-lumen', actorAvatarSeed: 'lumen-coffee' },
    { id: 'n-18', role: 'designer', kind: 'revision', title: 'Pulse Bank requested revisions', body: 'Quarterly report — editorial design & data visuals · 3 items', createdAt: ago(1, 6), read: false, link: '/jobs/DT-2842', actorAvatarSeed: 'pulse-bank' },
    { id: 'n-19', role: 'designer', kind: 'payment', title: 'INV-1043 is overdue', body: 'Pixelforge Games · €1,360 kick-off deposit was due 2 days ago.', createdAt: ago(1, 22), read: false, link: '/payments', actorAvatarSeed: 'pixelforge-games' },
    { id: 'n-20', role: 'designer', kind: 'deadline', title: 'DT-2830 is due tomorrow', body: 'Café rebrand — menu boards & cups · loyalty card and window vinyl still open', createdAt: ago(0, 12), read: false, link: '/jobs/DT-2830', actorAvatarSeed: 'lumen-coffee' },
    { id: 'n-21', role: 'designer', kind: 'like', title: 'Solace Skin liked your profile', body: 'DTC skincare from Stockholm · looking for 3D and motion.', createdAt: ago(0, 14), read: false, link: '/discover', actorAvatarSeed: 'solace-skin' },
    { id: 'n-22', role: 'designer', kind: 'ai', title: 'Your week at a glance', body: '3 new requests worth €7,400, one counter-offer waiting on Pulse, and one overdue invoice to chase.', createdAt: ago(0, 1), read: false, link: '/requests' },
    { id: 'n-23', role: 'designer', kind: 'status', title: 'Counter-offer sent to Pulse Bank', body: 'Savings goals — feature UI & onboarding · +4 days proposed', createdAt: ago(1, 2), read: true, link: '/jobs/DT-2864', actorAvatarSeed: 'pulse-bank' },
    { id: 'n-24', role: 'designer', kind: 'delivery', title: 'Orbit Fitness opened your delivery', body: 'App Store preview video — 30s · v1 has a new comment', createdAt: ago(0, 4), read: true, link: '/jobs/DT-2849', actorAvatarSeed: 'orbit-fitness' },
    { id: 'n-25', role: 'designer', kind: 'match', title: 'It’s a match with Volta Motors!', body: 'They liked your portfolio first. Say hi and talk scope.', createdAt: ago(3), read: true, link: '/network/c-volta', actorAvatarSeed: 'volta-motors' },
    { id: 'n-26', role: 'designer', kind: 'like', title: 'Hotel Alpenhof liked your profile', body: 'Boutique hotel in Innsbruck · rebrand & booking site.', createdAt: ago(4, 6), read: true, link: '/discover', actorAvatarSeed: 'hotel-alpenhof' },
    { id: 'n-27', role: 'designer', kind: 'approved', title: 'Lumen Coffee approved DT-2818', body: 'Payment of 1,800 EUR released · 5★ review', createdAt: ago(26), read: true, link: '/jobs/DT-2818', actorAvatarSeed: 'lumen-coffee' },
    { id: 'n-28', role: 'designer', kind: 'payment', title: 'INV-1018 was paid', body: '1,800 EUR received from Lumen Coffee.', createdAt: ago(26), read: true, link: '/payments', actorAvatarSeed: 'lumen-coffee' },
    { id: 'n-29', role: 'designer', kind: 'system', title: 'Your profile is in the top 5% this week', body: 'Add 1–2 recent projects to keep the momentum — profiles with 6+ pieces get 2× more likes.', createdAt: ago(2, 3), read: true, link: '/profile' },
  ]
}

export function buildInvoices(): Invoice[] {
  return [
    // ───────── client side (Northlight pays) ─────────
    { id: 'INV-1031', jobId: 'DT-2803', clientId: A, designerId: 'd-amara', amount: 1300, currency: 'EUR', status: 'paid', issuedAt: ago(34), dueAt: ago(6), paidAt: ago(7), lineItems: [{ label: 'Annual report illustrations ×8', amount: 1300 }] },
    { id: 'INV-1022', jobId: 'DT-2779', clientId: A, designerId: 'd-maya', amount: 1600, currency: 'EUR', status: 'paid', issuedAt: ago(52), dueAt: ago(30), paidAt: ago(31), lineItems: [{ label: 'Tin wrap artwork (3 sizes)', amount: 1100 }, { label: 'Gift box + shelf talker', amount: 500 }] },
    { id: 'INV-1027', jobId: 'DT-2788', clientId: A, designerId: 'd-kenji', amount: 2600, currency: 'EUR', status: 'paid', issuedAt: ago(44), dueAt: ago(22), paidAt: ago(24), lineItems: [{ label: 'CGI stills ×12', amount: 2200 }, { label: 'Leather macros ×2', amount: 400 }] },
    { id: 'INV-1038', jobId: 'DT-2841', clientId: A, designerId: 'd-maya', amount: 2400, currency: 'EUR', status: 'escrow', issuedAt: ago(12), dueAt: dayAt(2, 18), lineItems: [{ label: 'Key visual', amount: 1400 }, { label: 'Social kit', amount: 1000 }] },
    { id: 'INV-1040', jobId: 'DT-2796', clientId: A, designerId: 'd-leo', amount: 1800, currency: 'EUR', status: 'escrow', issuedAt: ago(9), dueAt: dayAt(1, 18), lineItems: [{ label: 'Brand film edit (3:00)', amount: 1400 }, { label: 'Cut-downs & subtitles', amount: 400 }] },
    { id: 'INV-1044', jobId: 'DT-2844', clientId: A, designerId: 'd-kenji', amount: 3100, currency: 'EUR', status: 'escrow', issuedAt: ago(16), dueAt: dayAt(3, 18), lineItems: [{ label: 'Hero renders + macros', amount: 2100 }, { label: '6s loop (4K)', amount: 1000 }] },
    { id: 'INV-1045', jobId: 'DT-2838', clientId: A, designerId: 'd-jonas', amount: 2200, currency: 'EUR', status: 'escrow', issuedAt: ago(13), dueAt: dayAt(0, 18), lineItems: [{ label: 'Testimonial edits ×3', amount: 1800 }, { label: 'Grade & mix', amount: 400 }] },
    { id: 'INV-1035', jobId: 'DT-2835', clientId: A, designerId: 'd-elena', amount: 3400, currency: 'EUR', status: 'escrow', issuedAt: ago(8), dueAt: dayAt(8, 18), lineItems: [{ label: 'Key visual — 3 crops', amount: 1400 }, { label: 'Retail POS kit', amount: 2000 }] },
    { id: 'INV-1046', jobId: 'DT-2846', clientId: A, designerId: 'd-elena', amount: 2200, currency: 'EUR', status: 'escrow', issuedAt: ago(15), dueAt: dayAt(4, 18), lineItems: [{ label: 'Invitation suite', amount: 900 }, { label: 'Stage & table visuals', amount: 1300 }] },
    { id: 'INV-1042', jobId: 'DT-2815', clientId: A, designerId: 'd-amara', amount: 1900, currency: 'EUR', status: 'pending', issuedAt: ago(9, 18), dueAt: dayAt(4, 18), lineItems: [{ label: 'Editorial illustrations ×6', amount: 1650 }, { label: 'Cover variation', amount: 250 }] },
    { id: 'INV-1047', jobId: 'DT-2833', clientId: A, designerId: 'd-sofia', amount: 960, currency: 'EUR', status: 'overdue', issuedAt: ago(9), dueAt: ago(2), lineItems: [{ label: 'Hi-fi screens milestone (40%)', amount: 960 }] },
    { id: 'INV-1048', jobId: 'DT-2826', clientId: A, designerId: 'd-nadia', amount: 2800, currency: 'EUR', status: 'escrow', issuedAt: ago(20), dueAt: ago(2), lineItems: [{ label: 'Logo sting', amount: 1200 }, { label: 'Transitions & lower-thirds', amount: 1600 }] },
    { id: 'INV-1053', jobId: 'DT-2808', clientId: A, designerId: 'd-elena', amount: 2000, currency: 'EUR', status: 'draft', issuedAt: ago(25), dueAt: ago(3), lineItems: [{ label: 'Trade fair booth graphics (cancelled)', amount: 2000 }] },

    // ───────── designer side (Ali gets paid) ─────────
    { id: 'INV-1036', jobId: 'DT-2830', clientId: 'c-lumen', designerId: ME, amount: 2100, currency: 'EUR', status: 'pending', issuedAt: ago(1, 2), dueAt: dayAt(8, 18), lineItems: [{ label: 'Menu boards ×3', amount: 900 }, { label: 'Cup sleeves (S/M/L)', amount: 700 }, { label: 'Loyalty card + window vinyl', amount: 500 }] },
    { id: 'INV-1018', jobId: 'DT-2818', clientId: 'c-lumen', designerId: ME, amount: 1800, currency: 'EUR', status: 'paid', issuedAt: ago(40), dueAt: ago(25), paidAt: ago(26), lineItems: [{ label: 'Seasonal campaign visual', amount: 900 }, { label: 'Posters + social kit', amount: 900 }] },
    { id: 'INV-1024', jobId: 'DT-2799', clientId: 'c-pixelforge', designerId: ME, amount: 2600, currency: 'EUR', status: 'paid', issuedAt: ago(48), dueAt: ago(32), paidAt: ago(33), lineItems: [{ label: 'Character key art ×3', amount: 1950 }, { label: 'Capsule system', amount: 650 }] },
    { id: 'INV-1012', jobId: 'DT-2784', clientId: 'c-paperkite', designerId: ME, amount: 2200, currency: 'EUR', status: 'paid', issuedAt: ago(70), dueAt: ago(48), paidAt: ago(50), lineItems: [{ label: 'Colophon redraw', amount: 1200 }, { label: 'Spine & catalogue system', amount: 1000 }] },
    { id: 'INV-1041', jobId: 'DT-2853', clientId: 'c-pulse', designerId: ME, amount: 2800, currency: 'EUR', status: 'escrow', issuedAt: ago(9), dueAt: dayAt(6, 18), lineItems: [{ label: 'Key visual + card renders', amount: 1600 }, { label: 'Social set + splash', amount: 1200 }] },
    { id: 'INV-1039', jobId: 'DT-2842', clientId: 'c-pulse', designerId: ME, amount: 2400, currency: 'EUR', status: 'escrow', issuedAt: ago(16), dueAt: dayAt(3, 18), lineItems: [{ label: 'Report design (16 pp)', amount: 1600 }, { label: 'Charts ×8', amount: 800 }] },
    { id: 'INV-1043', jobId: 'DT-2856', clientId: 'c-pixelforge', designerId: ME, amount: 1360, currency: 'EUR', status: 'overdue', issuedAt: ago(9), dueAt: ago(2), lineItems: [{ label: 'Kick-off deposit (40%)', amount: 1360 }] },
    { id: 'INV-1049', jobId: 'DT-2849', clientId: 'c-orbit', designerId: ME, amount: 1500, currency: 'EUR', status: 'escrow', issuedAt: ago(10), dueAt: dayAt(2, 18), lineItems: [{ label: 'App Store preview (30s + 15s)', amount: 1500 }] },
    { id: 'INV-1033', jobId: 'DT-2811', clientId: 'c-verde', designerId: ME, amount: 420, currency: 'EUR', status: 'pending', issuedAt: ago(2, 16), dueAt: dayAt(5, 18), lineItems: [{ label: 'Lookbook deposit (30%)', amount: 420 }] },
  ]
}

export function buildEvents(): CalendarEvent[] {
  return [
    // ───────── client role ─────────
    calEvent({ role: 'client', title: 'Weekly studio sync', at: dayAt(-7, 10), durationMin: 30, kind: 'call' }),
    calEvent({ role: 'client', title: 'Logo sting v2 review', at: dayAt(-4, 15), durationMin: 45, kind: 'review', jobId: 'DT-2826', withId: 'd-nadia' }),
    calEvent({ role: 'client', title: 'Founder film — string-out walkthrough', at: dayAt(-3, 17), durationMin: 30, kind: 'call', jobId: 'DT-2796', withId: 'd-leo' }),
    calEvent({ role: 'client', title: 'Weekly studio sync', at: dayAt(0, 10), durationMin: 30, kind: 'call' }),
    calEvent({ role: 'client', title: 'Review gala visuals', at: dayAt(0, 11, 30), durationMin: 45, kind: 'review', jobId: 'DT-2846', withId: 'd-elena' }),
    calEvent({ role: 'client', title: 'Review call with Maya — cold brew v2', at: dayAt(0, 15), durationMin: 30, kind: 'call', jobId: 'DT-2841', withId: 'd-maya' }),
    calEvent({ role: 'client', title: 'Testimonial edits due', at: dayAt(0, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2838', withId: 'd-jonas' }),
    calEvent({ role: 'client', title: 'Kick-off: pricing page', at: dayAt(1, 11), durationMin: 45, kind: 'call', jobId: 'DT-2852', withId: 'd-sofia' }),
    calEvent({ role: 'client', title: 'Founder film due', at: dayAt(1, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2796', withId: 'd-leo' }),
    calEvent({ role: 'client', title: 'Intro call with Ethan Brooks', at: dayAt(2, 16), durationMin: 30, kind: 'call', withId: 'd-ethan' }),
    calEvent({ role: 'client', title: 'Key visual sign-off — flagship campaign', at: dayAt(2, 12), durationMin: 30, kind: 'milestone', jobId: 'DT-2835', withId: 'd-elena' }),
    calEvent({ role: 'client', title: 'Focus: write Q1 briefs', at: dayAt(3, 9), durationMin: 120, kind: 'focus' }),
    calEvent({ role: 'client', title: 'Sneaker renders due', at: dayAt(3, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2844', withId: 'd-kenji' }),
    calEvent({ role: 'client', title: 'Onboarding v2 review', at: dayAt(5, 14), durationMin: 60, kind: 'review', jobId: 'DT-2833', withId: 'd-sofia' }),
    calEvent({ role: 'client', title: 'Explainer styleframes milestone', at: dayAt(5, 17), durationMin: 30, kind: 'milestone', jobId: 'DT-2857', withId: 'd-nadia' }),
    calEvent({ role: 'client', title: 'Speaker renders due', at: dayAt(12, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2860', withId: 'd-kenji' }),
    calEvent({ role: 'client', title: 'Explainer animation due', at: dayAt(16, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2857', withId: 'd-nadia' }),
    calEvent({ role: 'client', title: 'Annual report 2027 — planning with Zoë', at: dayAt(20, 15), durationMin: 45, kind: 'call', withId: 'd-zoe' }),

    // ───────── designer role ─────────
    calEvent({ role: 'designer', title: 'Seasonal campaign retro with Lumen', at: dayAt(-6, 11), durationMin: 30, kind: 'review', jobId: 'DT-2818', withId: 'c-lumen' }),
    calEvent({ role: 'designer', title: 'Lookbook kick-off with Lucía', at: dayAt(-2, 16), durationMin: 45, kind: 'call', jobId: 'DT-2811', withId: 'c-verde' }),
    calEvent({ role: 'designer', title: 'Focus block — loyalty card', at: dayAt(0, 9), durationMin: 120, kind: 'focus', jobId: 'DT-2830' }),
    calEvent({ role: 'designer', title: 'Metal card — social set', at: dayAt(0, 14), durationMin: 150, kind: 'focus', jobId: 'DT-2853' }),
    calEvent({ role: 'designer', title: 'App Store preview — feedback call', at: dayAt(1, 15), durationMin: 30, kind: 'review', jobId: 'DT-2849', withId: 'c-orbit' }),
    calEvent({ role: 'designer', title: 'Café rebrand final files', at: dayAt(1, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2830', withId: 'c-lumen' }),
    calEvent({ role: 'designer', title: 'Ironvale title cards', at: dayAt(2, 9), durationMin: 240, kind: 'focus', jobId: 'DT-2856' }),
    calEvent({ role: 'designer', title: 'Intro call — Volta Motors', at: dayAt(2, 14), durationMin: 45, kind: 'call', withId: 'c-volta' }),
    calEvent({ role: 'designer', title: 'Quarterly report revisions due', at: dayAt(3, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2842', withId: 'c-pulse' }),
    calEvent({ role: 'designer', title: 'Savings goals scoping call', at: dayAt(4, 11), durationMin: 45, kind: 'call', jobId: 'DT-2864', withId: 'c-pulse' }),
    calEvent({ role: 'designer', title: '30-day challenge ads due', at: dayAt(5, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2848', withId: 'c-orbit' }),
    calEvent({ role: 'designer', title: 'Lookbook deposit due', at: dayAt(5, 12), durationMin: 15, kind: 'milestone', jobId: 'DT-2811', withId: 'c-verde' }),
    calEvent({ role: 'designer', title: 'Ironvale trailer due', at: dayAt(7, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2856', withId: 'c-pixelforge' }),
    calEvent({ role: 'designer', title: 'Portfolio refresh', at: dayAt(8, 10), durationMin: 90, kind: 'focus' }),
    calEvent({ role: 'designer', title: 'Lookbook SS27 due', at: dayAt(10, 18), durationMin: 15, kind: 'deadline', jobId: 'DT-2811', withId: 'c-verde' }),
    calEvent({ role: 'designer', title: 'Book cover concepts milestone', at: dayAt(7, 12), durationMin: 30, kind: 'milestone', jobId: 'DT-2866', withId: 'c-paperkite' }),
  ]
}
