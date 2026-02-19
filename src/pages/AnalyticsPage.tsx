import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@spaces/sdk/storage'
import { Card, Badge, LoadingSpinner } from '../components/ui'
import { Users, Activity, Briefcase, Calendar, TrendingUp, BarChart2, Shield, Bug, RefreshCw } from 'lucide-react'
import { isInterviewOsAdmin, PIPELINE_STAGES_ORDER, GLOBAL_ANALYTICS_ROOM_ID, DEBUG_ANALYTICS } from '../constants'
import { useAnalyticsData } from '../hooks'

// ============================================================================
// KPI Card
// ============================================================================

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="card-hover bg-surface-elevated rounded-2xl p-6 border border-border shadow-card">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-bold text-content-muted uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-4xl font-bold text-content tabular-nums mb-1">{value}</p>
      {sub && <p className="text-sm text-content-muted">{sub}</p>}
    </div>
  )
}

// ============================================================================
// Minimal bar chart (CSS-only, no external lib)
// ============================================================================

function MiniBarChart({
  data,
  maxVal,
}: {
  data: Array<{ label: string; value: number }>
  maxVal: number
}) {
  if (maxVal === 0) return <p className="text-sm text-content-muted text-center py-6">No data yet</p>

  return (
    <div className="space-y-3">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-content-secondary w-32 shrink-0 truncate font-medium">{label}</span>
          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${maxVal > 0 ? (value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-content w-6 text-right tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Daily opens sparkline (14-day)
// ============================================================================

function DailyOpensChart({
  data,
}: {
  data: Array<{ date: string; count: number; uniqueCount: number }>
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => {
          const height = Math.max((d.count / maxCount) * 100, d.count > 0 ? 6 : 2)
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-content text-content-inverse text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-card">
                {d.date}: <span className="font-bold">{d.count}</span> opens ({d.uniqueCount} unique)
              </div>
              <div
                className="w-full bg-primary rounded-sm transition-all duration-300 hover:bg-primary-hover"
                style={{ height: `${height}%`, opacity: d.count === 0 ? 0.2 : 1 }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels — show every other */}
      <div className="flex items-center gap-1 mt-2">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % 2 === 0 ? (
              <span className="text-[10px] text-content-muted">{d.date.slice(8)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// AnalyticsPage
// ============================================================================

// ============================================================================
// Diagnostics Card (admin-only, gated behind DEBUG_ANALYTICS)
// ============================================================================

function DiagnosticsCard({
  user,
  rawEvents,
}: {
  user: any
  rawEvents: any[]
}) {
  const last10 = [...rawEvents].reverse().slice(0, 10)

  return (
    <div className="bg-warning-muted border border-warning-border rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Bug className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-content">Diagnostics</h2>
          <p className="text-xs text-warning">
            Build: <span className="font-bold">Analytics Global Room Enabled (V3)</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1 font-bold">Logged-in email</p>
          <p className="text-sm font-medium text-content break-all">{user?.email ?? '—'}</p>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1 font-bold">IsAdmin</p>
          <p className={`text-sm font-bold ${isInterviewOsAdmin(user?.email) ? 'text-success' : 'text-danger'}`}>
            {isInterviewOsAdmin(user?.email) ? 'true' : 'false'}
          </p>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1 font-bold">Global analytics roomId</p>
          <p className="text-sm font-mono text-primary break-all">{GLOBAL_ANALYTICS_ROOM_ID}</p>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <p className="text-xs text-content-muted uppercase tracking-wider mb-1 font-bold">Total events loaded</p>
          <p className="text-3xl font-bold text-content tabular-nums">{rawEvents.length}</p>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold text-content-muted uppercase tracking-wider">
            Last 10 events (newest first)
          </p>
        </div>
        {last10.length === 0 ? (
          <p className="text-sm text-content-muted text-center py-6">No events yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-content-muted uppercase tracking-wider bg-surface-overlay">
                <th className="px-4 py-2 font-bold">Event</th>
                <th className="px-4 py-2 font-bold">Date</th>
                <th className="px-4 py-2 font-bold">UserKey</th>
                <th className="px-4 py-2 font-bold">Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {last10.map((e) => (
                <tr key={e.recordId} className="hover:bg-surface-overlay/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-muted text-primary text-xs font-semibold">
                      {e.data.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-content-muted font-mono text-xs">{e.data.dateKey}</td>
                  <td className="px-4 py-2.5 text-content-muted font-mono text-xs">{e.data.userKey}</td>
                  <td className="px-4 py-2.5 text-content-secondary text-xs">
                    {e.data.fromStage && e.data.toStage
                      ? `${e.data.fromStage} → ${e.data.toStage}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// AnalyticsPage
// ============================================================================

export default function AnalyticsPage() {
  const { user, isLoading: userLoading } = useUser()
  const navigate = useNavigate()
  const { summary, isLoading: dataLoading, rawEvents } = useAnalyticsData()

  // Double-gating in case route guard didn't fire yet
  const canView = isInterviewOsAdmin(user?.email)

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Shield className="w-12 h-12 text-gray-300" />
        <p className="text-lg font-semibold text-gray-500">Not authorized</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-indigo-600 hover:underline"
        >
          Go to Today
        </button>
      </div>
    )
  }

  if (dataLoading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  // Stage move bar chart data
  const stageMoveData = summary.stageMoveBreakdown.map((s) => ({
    label: s.transition,
    value: s.count,
  }))
  const maxMoveCount = Math.max(...stageMoveData.map((d) => d.value), 1)

  // Jobs by stage bar chart (ordered by pipeline)
  const jobsByStageData = PIPELINE_STAGES_ORDER.map((stage) => ({
    label: stage,
    value: summary.jobsByStage[stage] || 0,
  }))
  const maxJobsCount = Math.max(...jobsByStageData.map((d) => d.value), 1)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-bold text-content tracking-tight">Analytics</h1>
              <Badge color="warning" size="sm">Admin Only</Badge>
            </div>
            <p className="text-sm text-content-muted">
              Cross-user usage data — no personal identifiers shown
            </p>
          </div>
          <div className="text-right bg-surface-elevated border border-border rounded-2xl px-6 py-4">
            <p className="text-xs font-bold text-content-muted uppercase tracking-wider mb-1">Active last 7 days</p>
            <p className="text-4xl font-bold text-content tabular-nums">{summary.activeUsersLast7Days}</p>
            <p className="text-xs text-content-secondary mt-0.5">unique users</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Total Opens"
            value={summary.totalOpens}
            icon={<Activity className="w-4 h-4 text-primary" />}
            accent="bg-primary-muted"
          />
          <KpiCard
            label="Unique Users"
            value={summary.uniqueUsers}
            icon={<Users className="w-4 h-4 text-purple-600" />}
            accent="bg-purple-50"
          />
          <KpiCard
            label="Jobs Created"
            value={summary.jobsCreated}
            icon={<Briefcase className="w-4 h-4 text-info" />}
            accent="bg-info-muted"
          />
          <KpiCard
            label="Interviews"
            value={summary.interviewsScheduled}
            icon={<Calendar className="w-4 h-4 text-success" />}
            accent="bg-success-muted"
          />
          <KpiCard
            label="Stage Moves"
            value={summary.stageMovesTotal}
            icon={<TrendingUp className="w-4 h-4 text-warning" />}
            accent="bg-warning-muted"
          />
        </div>

        {/* Daily Opens Chart */}
        <div className="card-hover bg-surface-elevated rounded-2xl p-8 border border-border shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-content">Daily Opens <span className="text-content-muted font-normal text-sm">(14 days)</span></h2>
            <span className="text-xs text-content-muted">Hover bars for detail</span>
          </div>
          <DailyOpensChart data={summary.dailyOpens} />
        </div>

        {/* Two-column: Stage moves + Jobs by stage */}
        <div className="grid grid-cols-2 gap-5">
          {/* Stage Move Breakdown */}
          <div className="card-hover bg-surface-elevated rounded-2xl p-8 border border-border shadow-card">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-content">Stage Move Breakdown</h2>
            </div>
            {stageMoveData.length === 0 ? (
              <p className="text-sm text-content-muted text-center py-6">No stage moves tracked yet</p>
            ) : (
              <>
                <MiniBarChart data={stageMoveData} maxVal={maxMoveCount} />
                <div className="mt-6 pt-6 border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-content-muted uppercase tracking-wider">
                        <th className="pb-3 font-bold">Transition</th>
                        <th className="pb-3 font-bold text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.stageMoveBreakdown.map((s) => (
                        <tr key={s.transition} className="hover:bg-surface-overlay/50 transition-colors">
                          <td className="py-2.5 text-content-secondary">{s.transition}</td>
                          <td className="py-2.5 text-content font-bold text-right tabular-nums">{s.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Jobs by Stage */}
          <div className="card-hover bg-surface-elevated rounded-2xl p-8 border border-border shadow-card">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-info-muted flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-info" />
              </div>
              <h2 className="text-lg font-bold text-content">Active Jobs by Stage</h2>
            </div>
            <MiniBarChart data={jobsByStageData} maxVal={maxJobsCount} />
            <div className="mt-6 pt-6 border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-content-muted uppercase tracking-wider">
                    <th className="pb-3 font-bold">Stage</th>
                    <th className="pb-3 font-bold text-right">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobsByStageData.map((s) => (
                    <tr key={s.label} className="hover:bg-surface-overlay/50 transition-colors">
                      <td className="py-2.5 text-content-secondary">{s.label}</td>
                      <td className="py-2.5 text-content font-bold text-right tabular-nums">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Diagnostics panel — admin-only, DEBUG_ANALYTICS flag */}
        {DEBUG_ANALYTICS && (
          <DiagnosticsCard user={user} rawEvents={rawEvents ?? []} />
        )}

        {/* Privacy note */}
        <div className="flex items-start gap-3 p-5 bg-surface-overlay rounded-xl border border-border text-sm text-content-secondary">
          <Shield className="w-4 h-4 mt-0.5 shrink-0 text-content-muted" />
          <span>
            Analytics are fully anonymized. User counts use opaque identifiers derived from
            DeepSpace user IDs — no emails or real IDs are stored in the analytics collection.
          </span>
        </div>
      </div>
    </div>
  )
}
