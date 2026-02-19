/**
 * Shared Analytics Context definition.
 * Lives in its own file to avoid circular imports between
 * hooks/index.ts and hooks/AnalyticsProvider.tsx.
 */

import { createContext } from 'react'

export type AnalyticsEventType =
  | 'widget_open'
  | 'job_created'
  | 'interview_scheduled'
  | 'stage_move'

export interface AnalyticsEvent {
  recordId: string
  data: {
    eventType: AnalyticsEventType
    userKey: string
    dateKey: string
    fromStage?: string
    toStage?: string
  }
  createdAt: string
}

export interface AnalyticsContextValue {
  track: (eventType: AnalyticsEventType, extra?: { fromStage?: string; toStage?: string }) => void
  events: AnalyticsEvent[]
  isLoading: boolean
  allJobs: any[]
}

export const AnalyticsContext = createContext<AnalyticsContextValue>({
  track: () => {},
  events: [],
  isLoading: true,
  allJobs: [],
})
