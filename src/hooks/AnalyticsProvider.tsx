/**
 * AnalyticsProvider
 *
 * Must be rendered INSIDE GlobalAnalyticsProvider (the inner RecordProvider
 * with roomId = GLOBAL_ANALYTICS_ROOM_ID).
 *
 * useMutations / useQuery here attach to the global analytics Durable Object
 * automatically because it is the nearest RecordProvider ancestor.
 *
 * `allJobs` is passed from the bridge component (AppWithAnalytics) which lives
 * in the outer per-canvas RecordProvider — so job data stays isolated while
 * the analytics dashboard can still render "Jobs by Stage".
 */

import React, { useCallback, useMemo } from 'react'
import { useMutations, useQuery, useUser } from '@spaces/sdk/storage'
import { deriveUserKey } from '../constants'
import { AnalyticsContext, type AnalyticsEvent, type AnalyticsEventType } from './analyticsContext'

export function AnalyticsProvider({
  children,
  allJobs,
}: {
  children: React.ReactNode
  allJobs: any[]
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
      eventType: AnalyticsEventType,
      extra?: { fromStage?: string; toStage?: string }
    ) => {
      if (!user?.id) return // not loaded yet — skip silently

      try {
        const userKey = deriveUserKey(user.id)
        const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        create({
          eventType,
          userKey,
          dateKey,
          ...(extra?.fromStage ? { fromStage: extra.fromStage } : {}),
          ...(extra?.toStage ? { toStage: extra.toStage } : {}),
        })
      } catch (err) {
        // Analytics failure must never break the main action
        console.warn('[analytics] track failed silently:', err)
      }
    },
    [user, create]
  )

  const value = useMemo(
    () => ({
      track,
      events: events as AnalyticsEvent[],
      isLoading,
      allJobs,
    }),
    [track, events, isLoading, allJobs]
  )

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}
