import { useMemo, useState } from 'react'
import { useMe, useMyJobs } from '@/store/selectors'
import { CLOSED, featuredJobs, focusJobs } from './data'
import { usePrefs, type WidgetId } from './prefs'
import { HeroCarousel } from './widgets/HeroCarousel'
import { ClientPulseCard, DesignerPulseCard } from './widgets/Pulse'
import { AttentionCard } from './widgets/Attention'
import { AiCard } from './widgets/AiCard'
import { BriefGaugeCard, ProfileGaugeCard } from './widgets/Gauges'
import { ActivityCard } from './widgets/Activity'
import { UpcomingCard } from './widgets/Upcoming'
import { PeopleCard } from './widgets/People'
import { MoneyCard } from './widgets/Money'
import { FoldersCard, NewOnCard, QuickActionsCard } from './widgets/Extras'
import { FocusHero } from './widgets/FocusHero'
import { InboxCard, RequestsCard } from './widgets/Requests'
import { TodayStrip } from './widgets/TodayStrip'

/** Visible-widget lookup (stable per render). */
function useShow() {
  const hidden = usePrefs((s) => s.hidden)
  return (id: WidgetId) => !hidden.includes(id)
}

/*
 * Layout (xl = 12 columns, md = 2 columns, phones = 1 column; the grid is
 * `dense` so 1-column cards fill the holes next to the hero on tablets):
 *
 *   strip ······································· 12
 *   hero 4 │ pulse 8
 *   attention 8 (2 rows) │ ai 4
 *                        │ gauge 4
 *   upcoming 8 │ quick 4
 *   money 8    │ activity 4 (2 rows)
 *   people 8   │
 *   folders ···································· 12
 *   marquee ···································· 12
 */
const S = {
  full: 'md:col-span-2 xl:col-span-12',
  hero: 'md:col-span-1 xl:col-span-4',
  wide: 'md:col-span-2 xl:col-span-8',
  wideTall: 'md:col-span-2 xl:col-span-8 xl:row-span-2',
  side: 'md:col-span-1 xl:col-span-4',
  sideTall: 'md:col-span-2 xl:col-span-4 xl:row-span-2',
  sideWideOnTablet: 'md:col-span-2 xl:col-span-4',
}

export function ClientDashboard() {
  const show = useShow()
  const jobs = useMyJobs()
  const featured = useMemo(() => featuredJobs(jobs, 3), [jobs])
  const live = useMemo(() => jobs.filter((j) => !CLOSED.includes(j.status)), [jobs])
  const [heroIndex, setHeroIndex] = useState(0)
  const [gaugeJobId, setGaugeJobId] = useState<string | null>(null)
  const heroJob = featured.length ? featured[((heroIndex % featured.length) + featured.length) % featured.length] : undefined
  const gaugeJob = live.find((j) => j.id === gaugeJobId) ?? heroJob ?? live[0]

  return (
    <>
      <TodayStrip jobs={jobs} className={S.full} />
      {show('hero') && <HeroCarousel jobs={featured} index={heroIndex} onIndex={setHeroIndex} className={S.hero} />}
      {show('pulse') && <ClientPulseCard jobs={jobs} className={S.wide} />}
      {show('attention') && <AttentionCard className={S.wideTall} />}
      {show('ai') && <AiCard jobs={jobs} className={S.side} />}
      {show('gauge') && <BriefGaugeCard job={gaugeJob} jobs={live} onPick={setGaugeJobId} className={S.side} />}
      {show('upcoming') && <UpcomingCard jobs={jobs} className={S.wide} />}
      {show('quick') && <QuickActionsCard jobs={jobs} className={S.side} />}
      {show('money') && <MoneyCard jobs={jobs} className={S.wide} />}
      {show('activity') && <ActivityCard jobs={jobs} className={S.sideTall} />}
      {show('people') && <PeopleCard jobs={jobs} className={S.wide} />}
      {show('folders') && <FoldersCard jobs={jobs} className={S.full} />}
      {show('marquee') && <NewOnCard className={S.full} />}
    </>
  )
}

/*
 *   strip ······································· 12
 *   focus 4 │ pulse 8
 *   attention 8 (2 rows) │ ai 4
 *                        │ profile gauge 4
 *   requests 8 │ inbox 4
 *   upcoming 8 │ quick 4
 *   money 8    │ activity 4 (2 rows)
 *   people 8   │
 *   folders / marquee ·························· 12
 */
export function DesignerDashboard() {
  const show = useShow()
  const jobs = useMyJobs()
  const me = useMe().designer
  const focus = useMemo(() => focusJobs(jobs, 3), [jobs])

  return (
    <>
      <TodayStrip jobs={jobs} className={S.full} />
      {show('hero') && <FocusHero jobs={focus} className={S.hero} />}
      {show('pulse') && <DesignerPulseCard jobs={jobs} me={me} className={S.wide} />}
      {show('attention') && <AttentionCard className={S.wideTall} />}
      {show('ai') && <AiCard jobs={jobs} className={S.side} />}
      {show('gauge') && <ProfileGaugeCard me={me} className={S.side} />}
      {show('requests') && <RequestsCard jobs={jobs} className={S.wide} />}
      {show('messages') && <InboxCard className={S.side} />}
      {show('upcoming') && <UpcomingCard jobs={jobs} className={S.wide} />}
      {show('quick') && <QuickActionsCard jobs={jobs} className={S.side} />}
      {show('money') && <MoneyCard jobs={jobs} className={S.wide} />}
      {show('activity') && <ActivityCard jobs={jobs} className={S.sideTall} />}
      {show('people') && <PeopleCard jobs={jobs} className={S.wide} />}
      {show('folders') && <FoldersCard jobs={jobs} className={S.full} />}
      {show('marquee') && <NewOnCard className={S.full} />}
    </>
  )
}
