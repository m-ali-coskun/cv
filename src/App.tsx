import { lazy } from 'react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/theme/ThemeProvider'

const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'))
const DiscoverPage = lazy(() => import('@/features/discover/DiscoverPage'))
const NetworkPage = lazy(() => import('@/features/network/NetworkPage'))
const PersonPage = lazy(() => import('@/features/network/PersonPage'))
const JobsPage = lazy(() => import('@/features/jobs/JobsPage'))
const JobDetailPage = lazy(() => import('@/features/jobs/JobDetailPage'))
const RequestsPage = lazy(() => import('@/features/jobs/RequestsPage'))
const NewBriefPage = lazy(() => import('@/features/brief/NewBriefPage'))
const MessagesPage = lazy(() => import('@/features/messages/MessagesPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const JoinPage = lazy(() => import('@/features/profile/JoinPage'))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'))
const FilesPage = lazy(() => import('@/features/files/FilesPage'))
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

/**
 * Hash routing keeps deep links working on static hosts (GitHub Pages)
 * without any server rewrites.
 */
const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'network', element: <NetworkPage /> },
      { path: 'network/:id', element: <PersonPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },
      { path: 'requests', element: <RequestsPage /> },
      { path: 'brief/new', element: <NewBriefPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'messages/:id', element: <MessagesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'join', element: <JoinPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/overview" replace /> },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
