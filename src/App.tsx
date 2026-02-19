/**
 * Main Application
 * 
 * Minimal app shell with:
 * - Authentication (DeepSpacePill)
 * - RecordProvider for storage
 * - Navigation
 * - Protected routes
 * 
 * Add pages by:
 * 1. Creating page component in src/pages/
 * 2. Importing here
 * 3. Adding Route below
 * 4. Adding nav item if needed
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth, DeepSpacePill, isWidgetContext, getWidgetAuthToken } from '@spaces/sdk/auth'
import { initScreenshotListener } from '@spaces/sdk/screenshot'
import { NotificationBell } from '@spaces/sdk/notifications'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '@spaces/sdk/config'

// Widget base path (injected at build time for subpath deployments)
declare global {
  interface Window {
    __WIDGET_BASE__?: string
  }
}
const WIDGET_BASE = typeof window !== 'undefined' ? (window.__WIDGET_BASE__ || '') : ''
import { RecordProvider, useUser, useQuery, useMutations, type UserProfile } from '@spaces/sdk/storage'

/**
 * Get the storage roomId for this widget instance.
 *
 * Canvas widgets receive their canvas roomId via URL search params
 * (injected by the parent canvas into the iframe src). This ensures
 * per-canvas data isolation — each canvas gets its own RecordRoom
 * Durable Object.
 *
 * Standalone mode (accessed directly, not in an iframe) uses a fallback
 * based on the URL pathname so each deployment has its own storage.
 */
function getWidgetRoomId(): string {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const canvasRoomId = params.get('roomId')
  if (canvasRoomId) return canvasRoomId
  // Standalone fallback: use the deployment path (unique per widget build)
  return window.location.pathname.replace(/^\/+|\/+$/g, '') || 'default'
}

/**
 * Fetch user profile using postMessage auth (for canvas widgets).
 * Gets auth token from parent frame, then fetches /api/users/me.
 */
async function fetchUserViaPostMessage(): Promise<UserProfile> {
  const token = await getWidgetAuthToken()
  if (!token) {
    throw new Error('No auth token from parent')
  }
  
  const apiUrl = getApiUrl()
  const response = await fetch(`${apiUrl}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`)
  }
  
  return response.json()
}

import { schemas, analyticsSchemas } from './schemas'
import { ROLES, ROLE_CONFIG, type Role, isInterviewOsAdmin, GLOBAL_ANALYTICS_ROOM_ID, deriveUserKey } from './constants'
import { Badge } from './components/ui'
import type { Notification } from '@spaces/sdk/notifications'
import { useAnalyticsTracker, AnalyticsContext, type AnalyticsContextValue, useTheme } from './hooks'

// Pages
import TodayPage from './pages/TodayPage'
import PipelinePage from './pages/PipelinePage'
import PrepPage from './pages/PrepPage'
import UsagePage from './pages/UsagePage'
import FeedbackPage from './pages/FeedbackPage'
import AnalyticsPage from './pages/AnalyticsPage'

// ============================================================================
// Navigation
// ============================================================================

function Navigation() {
  const { user } = useUser()
  const isDeepSpaceAdmin = user?.role === 'admin'
  // Interview.OS admin: exact email match — gating Analytics tab + Admin badge
  const isIosAdmin = isInterviewOsAdmin(user?.email)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  
  const userRole = (user?.role ?? ROLES.VIEWER) as Role
  const roleConfig = ROLE_CONFIG[userRole] ?? ROLE_CONFIG[ROLES.VIEWER]
  
  // Track widget open once per session (fires once when user is loaded)
  const { track } = useAnalyticsTracker()
  const hasTrackedOpen = useRef(false)
  useEffect(() => {
    if (user?.id && !hasTrackedOpen.current) {
      hasTrackedOpen.current = true
      track('widget_open')
    }
  }, [user?.id, track])
  
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (notification.link) {
      navigate(notification.link)
    }
  }, [navigate])
  
  // Define navigation items with feature-identity accent colors
  const navItems: Array<{ 
    path: string; 
    label: string; 
    roles: Role[]; 
    adminOnly?: boolean; 
    icon: ReactNode;
    accentColor: string;
    accentBg: string;
  }> = [
    { 
      path: '/', 
      label: 'Today', 
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      accentColor: 'var(--color-nav-today)',
      accentBg: 'var(--color-nav-today-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      path: '/pipeline', 
      label: 'Pipeline', 
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      accentColor: 'var(--color-nav-pipeline)',
      accentBg: 'var(--color-nav-pipeline-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    { 
      path: '/prep', 
      label: 'Prep', 
      roles: [ROLES.MEMBER, ROLES.ADMIN],
      accentColor: 'var(--color-nav-prep)',
      accentBg: 'var(--color-nav-prep-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      path: '/usage', 
      label: 'Usage', 
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      accentColor: 'var(--color-nav-usage)',
      accentBg: 'var(--color-nav-usage-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      path: '/feedback', 
      label: 'Feedback', 
      roles: [ROLES.VIEWER, ROLES.MEMBER, ROLES.ADMIN],
      accentColor: 'var(--color-nav-feedback)',
      accentBg: 'var(--color-nav-feedback-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    // Analytics tab — only visible to Interview.OS admin (exact email match)
    { 
      path: '/analytics', 
      label: 'Analytics', 
      roles: [ROLES.ADMIN],
      adminOnly: true,
      accentColor: 'var(--color-nav-analytics)',
      accentBg: 'var(--color-nav-analytics-bg)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
  ]
  
  // Filter visible nav items:
  // - adminOnly items are shown ONLY to the Interview.OS admin (email match)
  // - other items follow deepSpace role as before
  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly) return isIosAdmin
    if (isDeepSpaceAdmin) return true
    return item.roles.includes(userRole)
  })
  
  return (
    <nav className="bg-surface-elevated/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-muted rounded-lg flex items-center justify-center border border-primary-border">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-content">Interview.OS</span>
          </Link>
          
          {/* Nav Links */}
          <div className="flex items-center gap-0.5">
            {visibleNavItems.map(item => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="nav-item px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border"
                  style={{
                    color: isActive ? item.accentColor : undefined,
                    backgroundColor: isActive ? item.accentBg : undefined,
                    borderColor: isActive ? item.accentColor + '33' : 'transparent',
                    fontWeight: isActive ? 600 : undefined,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = item.accentColor
                      el.style.backgroundColor = item.accentBg
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = ''
                      el.style.backgroundColor = ''
                    }
                  }}
                >
                  <span style={{ color: isActive ? item.accentColor : undefined }}>
                    {item.icon}
                  </span>
                  {item.label}
                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full ml-0.5"
                      style={{ backgroundColor: item.accentColor }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-overlay/60 transition-colors text-content-secondary hover:text-content"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 3v1m0 16v1m8.485-9H21M3 12H2m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M17 12a5 5 0 11-10 0 5 5 0 0110 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="text-xs font-medium hidden sm:inline">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Show "Admin" badge only for the Interview.OS admin email */}
            {isIosAdmin ? (
              <Badge color="warning" size="sm">Admin</Badge>
            ) : (
              <Badge color={roleConfig.color} size="sm">
                {roleConfig.title}
              </Badge>
            )}
            
            {user?.id && (
              <NotificationBell
                miniappId="starter"
                userId={user.id}
                onNotificationClick={handleNotificationClick}
                pollInterval={30000}
              />
            )}
            
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-surface-overlay/60 rounded-lg border border-border">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full ring-2 ring-border" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-overlay flex items-center justify-center text-xs text-content-secondary">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-sm text-content-secondary">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// ============================================================================
// Protected Route
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: Role[]
  requireIosAdmin?: boolean
}

function ProtectedRoute({ children, allowedRoles, requireIosAdmin }: ProtectedRouteProps) {
  const { user, isLoading } = useUser()
  const isDeepSpaceAdmin = user?.role === 'admin'
  const iosAdmin = isInterviewOsAdmin(user?.email)
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Loading...</div>
      </div>
    )
  }
  
  // Analytics route: only Interview.OS admin (exact email)
  if (requireIosAdmin) {
    if (!iosAdmin) return <Navigate to="/" replace />
    return <>{children}</>
  }
  
  if (isDeepSpaceAdmin) return <>{children}</>
  
  const userRole = (user?.role ?? ROLES.VIEWER) as Role
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

// ============================================================================
// App Router
// ============================================================================

function AppRouter() {
  const { user, isLoading } = useUser()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <div className="text-content-muted">Loading...</div>
        </div>
      </div>
    )
  }
  
  return (
    <BrowserRouter basename={WIDGET_BASE}>
      <div className="h-screen bg-surface overflow-hidden flex flex-col">
        <Navigation />
        
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route
              path="/prep"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MEMBER, ROLES.ADMIN]}>
                  <PrepPage />
                </ProtectedRoute>
              }
            />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]} requireIosAdmin>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

// ============================================================================
// Global Analytics Wiring
// ============================================================================

/**
 * Architecture: Callback-bridge pattern
 * ──────────────────────────────────────
 *
 * Two RecordProviders cannot be nested without the inner one shadowing the
 * outer for ALL collections. Instead we use a callback bridge:
 *
 *   <OuterRecordProvider roomId=canvasId>          — jobs, activity, etc.
 *     <AnalyticsContext.Provider value={...}>       — shared analytics context
 *       <AnalyticsRecordProvider roomId=GLOBAL>     — hidden, for analytics only
 *         <AnalyticsBridge onUpdate={setCtx} />     — reads events + create from global DO
 *       </AnalyticsRecordProvider>
 *       <AppRouter />                               — useQuery('jobs') → outer DO ✓
 *                                                     useAnalyticsTracker → shared ctx ✓
 *     </AnalyticsContext.Provider>
 *   </OuterRecordProvider>
 *
 * AnalyticsBridge calls onUpdate() whenever events or create changes.
 * The outer shell stores that in state and feeds it to AnalyticsContext.Provider.
 * AppRouter reads from AnalyticsContext — no RecordProvider confusion.
 */

interface AnalyticsBridgeData {
  track: AnalyticsContextValue['track']
  events: AnalyticsContextValue['events']
  isLoading: boolean
}

/**
 * Lives INSIDE the global analytics RecordProvider.
 * Reads useMutations/useQuery from that provider, then calls onUpdate()
 * to lift the values up to the outer AnalyticsContext.Provider.
 */
function AnalyticsBridge({
  onUpdate,
}: {
  onUpdate: (data: AnalyticsBridgeData) => void
}) {
  const { user } = useUser()
  const { create } = useMutations('analytics_events')
  const { records: events, status } = useQuery('analytics_events', {
    orderBy: 'createdAt',
    orderDir: 'asc',
  })

  const isLoading = status !== 'ready'

  const track = useCallback(
    (
      eventType: string,
      extra?: { fromStage?: string; toStage?: string }
    ) => {
      if (!user?.id) return
      try {
        const userKey = deriveUserKey(user.id)
        const dateKey = new Date().toISOString().split('T')[0]
        create({
          eventType,
          userKey,
          dateKey,
          ...(extra?.fromStage ? { fromStage: extra.fromStage } : {}),
          ...(extra?.toStage ? { toStage: extra.toStage } : {}),
        })
      } catch (err) {
        console.warn('[analytics] track failed silently:', err)
      }
    },
    [user, create]
  ) as AnalyticsContextValue['track']

  // Push updated values up to the outer context any time they change
  useEffect(() => {
    onUpdate({ track, events: events as AnalyticsContextValue['events'], isLoading })
  }, [track, events, isLoading, onUpdate])

  return null // purely a side-effect component
}

/**
 * AppWithAnalytics: lives inside the outer (per-canvas) RecordProvider.
 *
 *  1. Reads allJobs from the outer provider.
 *  2. Manages AnalyticsContext state via AnalyticsBridge.
 *  3. Renders the global analytics RecordProvider (hidden, sibling of AppRouter).
 *  4. Renders AppRouter — its useQuery/useMutations hit the outer provider.
 */
function AppWithAnalytics({ fetchUser }: { fetchUser?: () => Promise<UserProfile> }) {
  const { records: allJobs } = useQuery('jobs')

  const [analyticsCtx, setAnalyticsCtx] = useState<AnalyticsContextValue>({
    track: () => {},
    events: [],
    isLoading: true,
    allJobs,
  })

  const handleBridgeUpdate = useCallback((data: AnalyticsBridgeData) => {
    setAnalyticsCtx((prev) => ({
      ...prev,
      ...data,
      allJobs, // always use latest allJobs from outer provider
    }))
  }, [allJobs])

  // Keep allJobs in sync when it changes
  useEffect(() => {
    setAnalyticsCtx((prev) => ({ ...prev, allJobs }))
  }, [allJobs])

  const analyticsProviderProps = fetchUser
    ? { fetchUser, allowAnonymous: true as const }
    : { allowAnonymous: true as const }

  return (
    <AnalyticsContext.Provider value={analyticsCtx}>
      {/* Hidden analytics RecordProvider — connects to global Durable Object.
          AnalyticsBridge reads from it and lifts values into AnalyticsContext. */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <RecordProvider
          roomId={GLOBAL_ANALYTICS_ROOM_ID}
          schemas={analyticsSchemas}
          {...analyticsProviderProps}
        >
          <AnalyticsBridge onUpdate={handleBridgeUpdate} />
        </RecordProvider>
      </div>

      {/* Main app — useQuery('jobs') hits the outer per-canvas RecordProvider */}
      <AppRouter />
    </AnalyticsContext.Provider>
  )
}

// ============================================================================
// Main App
// ============================================================================

/**
 * Canvas widget shell — Clerk is NOT in the tree, auth via postMessage.
 */
function WidgetApp() {
  useEffect(() => initScreenshotListener(), [])

  return (
    <RecordProvider
      roomId={getWidgetRoomId()}
      schemas={schemas}
      fetchUser={fetchUserViaPostMessage}
      allowAnonymous
    >
      {/* AppWithAnalytics reads allJobs from the outer (per-canvas) provider,
          then passes them into GlobalAnalyticsProvider + AnalyticsProvider */}
      <AppWithAnalytics fetchUser={fetchUserViaPostMessage} />
    </RecordProvider>
  )
}

/**
 * Deployed / standalone shell — Clerk is in the tree, full auth flow.
 */
function DeployedApp() {
  const { isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-content-secondary">Authenticating...</div>
      </div>
    )
  }

  return (
    <>
      <DeepSpacePill />
      <RecordProvider
        roomId={getWidgetRoomId()} 
        schemas={schemas}
        allowAnonymous
      >
        <AppWithAnalytics />
      </RecordProvider>
    </>
  )
}

export default function App() {
  return isWidgetContext() ? <WidgetApp /> : <DeployedApp />
}
