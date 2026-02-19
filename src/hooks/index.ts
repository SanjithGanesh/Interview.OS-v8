/**
 * Custom hooks for Interview.OS
 *
 * Architecture note (V3 global analytics fix):
 * ─────────────────────────────────────────────
 * The app has TWO RecordProviders:
 *   1. Outer (per-canvas)  — roomId = getWidgetRoomId()  — jobs, activity, etc.
 *   2. Inner (global)      — roomId = GLOBAL_ANALYTICS_ROOM_ID — analytics_events ONLY
 *
 * useQuery / useMutations always attach to the NEAREST RecordProvider ancestor.
 * AnalyticsProvider (in hooks/AnalyticsProvider.tsx) lives inside the inner
 * RecordProvider so its hooks target the global analytics room automatically.
 *
 * Analytics operations are surfaced via AnalyticsContext so callers don't
 * need to know which provider they're in.
 *
 * Exports:
 *   AnalyticsProvider   — component (re-exported from AnalyticsProvider.tsx)
 *   useAnalyticsTracker — returns { track }
 *   useAnalyticsData    — returns { summary, isLoading, rawEvents }
 *   AnalyticsContext    — the underlying context (for advanced use)
 */

import { useContext, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutations, useUser } from '@spaces/sdk/storage'

// Context + types live in a separate file to avoid circular imports
export type { AnalyticsEventType, AnalyticsEvent, AnalyticsContextValue } from './analyticsContext'
export { AnalyticsContext } from './analyticsContext'
import { AnalyticsContext } from './analyticsContext'

// Re-export AnalyticsProvider from the tsx component file
export { AnalyticsProvider } from './AnalyticsProvider'

// ============================================================================
// useAnalyticsTracker
// ============================================================================

/**
 * Returns a `track` function that appends an anonymized event to the
 * GLOBAL analytics room. Safe to call from any user context.
 * Fails silently — never breaks the calling action.
 */
export function useAnalyticsTracker() {
  const { track } = useContext(AnalyticsContext)
  return { track }
}

// ============================================================================
// useAnalyticsData
// ============================================================================

export interface AnalyticsSummary {
  totalOpens: number
  uniqueUsers: number
  jobsCreated: number
  interviewsScheduled: number
  stageMovesTotal: number
  stageMoveBreakdown: Array<{ transition: string; count: number }>
  jobsByStage: Record<string, number>
  dailyOpens: Array<{ date: string; count: number; uniqueCount: number }>
  activeUsersLast7Days: number
}

/**
 * Reads and aggregates all analytics events from the GLOBAL analytics room.
 * Only meaningful when called from an admin context (non-admin sees 0 records
 * due to schema permissions: viewer/member read: false).
 */
export function useAnalyticsData() {
  const { events, isLoading, allJobs } = useContext(AnalyticsContext)

  const summary = useMemo((): AnalyticsSummary | null => {
    if (isLoading) return null

    const evts = events

    // --- KPIs ---
    const opens = evts.filter((e) => e.data.eventType === 'widget_open')
    const totalOpens = opens.length
    const uniqueUsers = new Set(evts.map((e) => e.data.userKey)).size

    const jobsCreated = evts.filter((e) => e.data.eventType === 'job_created').length
    const interviewsScheduled = evts.filter(
      (e) => e.data.eventType === 'interview_scheduled'
    ).length

    const stageMoves = evts.filter((e) => e.data.eventType === 'stage_move')
    const stageMovesTotal = stageMoves.length

    // --- Stage move breakdown ---
    const breakdownMap: Record<string, number> = {}
    stageMoves.forEach((e) => {
      if (e.data.fromStage && e.data.toStage) {
        const key = `${e.data.fromStage} → ${e.data.toStage}`
        breakdownMap[key] = (breakdownMap[key] || 0) + 1
      }
    })
    const stageMoveBreakdown = Object.entries(breakdownMap)
      .map(([transition, count]) => ({ transition, count }))
      .sort((a, b) => b.count - a.count)

    // --- Jobs by stage (current snapshot from per-canvas provider, admin sees all) ---
    const jobsByStage: Record<string, number> = {}
    ;(allJobs as any[]).forEach((job) => {
      if (job.data?.archived) return
      const stage = job.data?.pipelineStage || 'Unknown'
      jobsByStage[stage] = (jobsByStage[stage] || 0) + 1
    })

    // --- Daily opens (last 14 days) ---
    const today = new Date()
    const dailyOpens: Array<{ date: string; count: number; uniqueCount: number }> = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
      const dateKey = d.toISOString().split('T')[0]
      const dayEvts = opens.filter((e) => e.data.dateKey === dateKey)
      dailyOpens.push({
        date: dateKey,
        count: dayEvts.length,
        uniqueCount: new Set(dayEvts.map((e) => e.data.userKey)).size,
      })
    }

    // --- Active users last 7 days ---
    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
    const sevenDaysAgoKey = sevenDaysAgo.toISOString().split('T')[0]
    const recentUsers = new Set(
      evts
        .filter((e) => e.data.dateKey >= sevenDaysAgoKey)
        .map((e) => e.data.userKey)
    )
    const activeUsersLast7Days = recentUsers.size

    return {
      totalOpens,
      uniqueUsers,
      jobsCreated,
      interviewsScheduled,
      stageMovesTotal,
      stageMoveBreakdown,
      jobsByStage,
      dailyOpens,
      activeUsersLast7Days,
    }
  }, [events, allJobs, isLoading])

  return { summary, isLoading, rawEvents: events }
}

// ============================================================================
// useTheme — per-user dark mode preference
// ============================================================================

export type Theme = 'light' | 'dark'

/**
 * Reads and writes the current user's theme preference from user_preferences
 * collection (per-user, own-only). Applies it to <html data-theme="...">.
 * Falls back to 'light' for new users or when not loaded yet.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void; isLoading: boolean } {
  const { user } = useUser()
  const { records, status } = useQuery('user_preferences')
  const { create, put } = useMutations('user_preferences')

  // Find this user's preference record (own-only, so there should be at most 1)
  const prefRecord = (records as any[]).find(r => r.data?.theme)

  const theme: Theme = (prefRecord?.data?.theme as Theme) ?? 'light'
  const isLoading = status !== 'ready'

  // Apply theme to <html> element whenever it changes
  useEffect(() => {
    if (isLoading) return
    const root = document.documentElement
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [theme, isLoading])

  const toggleTheme = useCallback(() => {
    if (!user?.id) return
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light'
    const now = new Date().toISOString()
    if (prefRecord) {
      put(prefRecord.recordId, { theme: nextTheme, updatedAt: now })
    } else {
      create({ theme: nextTheme, updatedAt: now })
    }
    // Optimistically apply immediately (effect will confirm after re-render)
    const root = document.documentElement
    if (nextTheme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [theme, prefRecord, create, put, user?.id])

  return { theme, toggleTheme, isLoading }
}
