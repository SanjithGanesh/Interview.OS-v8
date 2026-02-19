import React, { useMemo } from 'react'
import { useQuery } from '@spaces/sdk/storage'
import { Card, Badge } from '../components/ui'
import { TrendingUp, Target, CheckCircle, Clock } from 'lucide-react'
import { ACTIVITY_TYPES } from '../constants'

interface ActivityLog {
  recordId: string
  data: {
    actionType: string
    jobId?: string
    details?: string
  }
  createdAt: string
}

interface Job {
  recordId: string
  data: {
    company: string
    role: string
    pipelineStage: string
    archived?: boolean
  }
  createdAt: string
}

export default function UsagePage() {
  const { records: activities } = useQuery('activity_log', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { records: jobs } = useQuery('jobs')

  const stats = useMemo(() => {
    const logs = activities as ActivityLog[]
    const allJobs = jobs as Job[]

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalJobs = allJobs.length
    const activeJobs = allJobs.filter((j) => !j.data.archived).length

    const jobsAddedThisWeek = logs.filter(
      (log) =>
        log.data.actionType === ACTIVITY_TYPES.ADD_JOB &&
        new Date(log.createdAt) >= weekAgo
    ).length

    const stageMovesThisWeek = logs.filter(
      (log) =>
        log.data.actionType === ACTIVITY_TYPES.MOVE_STAGE &&
        new Date(log.createdAt) >= weekAgo
    ).length

    const prepSessionsCompleted = logs.filter(
      (log) => log.data.actionType === ACTIVITY_TYPES.START_PREP
    ).length

    const timerSessionsCompleted = logs.filter(
      (log) => log.data.actionType === ACTIVITY_TYPES.FINISH_TIMER
    ).length

    return {
      totalJobs,
      activeJobs,
      jobsAddedThisWeek,
      stageMovesThisWeek,
      prepSessionsCompleted,
      timerSessionsCompleted,
    }
  }, [activities, jobs])

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-content tracking-tight mb-1">Usage</h1>
        <p className="text-sm text-content-muted">Your Interview.OS activity at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="card-hover bg-surface-elevated border border-border rounded-2xl p-6 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-content-muted uppercase tracking-wider">Total Jobs</p>
            <div className="w-9 h-9 rounded-xl bg-primary-muted flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-5xl font-bold text-content tabular-nums mb-1">{stats.totalJobs}</p>
          <p className="text-sm text-content-secondary">
            <span className="font-semibold text-success">{stats.activeJobs}</span> active
          </p>
        </div>

        <div className="card-hover bg-surface-elevated border border-border rounded-2xl p-6 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-content-muted uppercase tracking-wider">This Week</p>
            <div className="w-9 h-9 rounded-xl bg-success-muted flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-5xl font-bold text-content tabular-nums mb-1">{stats.jobsAddedThisWeek}</p>
          <p className="text-sm text-content-secondary">jobs added</p>
        </div>

        <div className="card-hover bg-surface-elevated border border-border rounded-2xl p-6 group">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-content-muted uppercase tracking-wider">Momentum</p>
            <div className="w-9 h-9 rounded-xl bg-info-muted flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-info" />
            </div>
          </div>
          <p className="text-5xl font-bold text-content tabular-nums mb-1">{stats.stageMovesThisWeek}</p>
          <p className="text-sm text-content-secondary">stage moves this week</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Prep Activity */}
        <div className="card-hover bg-surface-elevated border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-content">Prep Activity</h3>
              <p className="text-xs text-content-muted mt-0.5">All time</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-muted flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-overlay">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-content">JD Analyses</span>
              </div>
              <span className="text-lg font-bold text-primary tabular-nums">{stats.prepSessionsCompleted}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-overlay">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm font-medium text-content">Timer Drills</span>
              </div>
              <span className="text-lg font-bold text-success tabular-nums">{stats.timerSessionsCompleted}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-hover bg-surface-elevated border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-content">Recent Activity</h3>
              <p className="text-xs text-content-muted mt-0.5">Last 5 actions</p>
            </div>
          </div>
          <div className="space-y-1">
            {(activities as ActivityLog[]).slice(0, 5).map((log) => (
              <div key={log.recordId} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg hover:bg-surface-overlay transition-colors">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-sm text-content font-medium truncate">{log.data.details || log.data.actionType}</p>
                </div>
                <p className="text-xs text-content-muted whitespace-nowrap font-medium">
                  {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
            {(activities as ActivityLog[]).length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-content-muted">No activity yet.</p>
                <p className="text-xs text-content-muted mt-1">Add a job to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
