import React, { useState, useMemo } from 'react'
import { useQuery, useMutations } from '@spaces/sdk/storage'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Card, EmptyState, LoadingSpinner, Modal } from '../components/ui'
import { Plus, ChevronLeft, ChevronRight, Edit, ExternalLink, Inbox, BookOpen, Calendar, AlertCircle, Layers, DollarSign, MapPin, Trophy } from 'lucide-react'
import { PRIORITY_CONFIG, PIPELINE_STAGES, PIPELINE_STAGES_ORDER } from '../constants'
import AddJobModal from '../components/AddJobModal.tsx'
import JobDetailsModal from '../components/JobDetailsModal.tsx'
import type { OfferDetails, OfferQuickPicks } from '../components/JobDetailsModal.tsx'
import { useAnalyticsTracker } from '../hooks'

interface Job {
  recordId: string
  data: {
    company: string
    role: string
    jobLink?: string
    location?: string
    priority: string
    pipelineStage: string
    nextActionType?: string
    nextActionDate?: string
    notes?: string
    jdText?: string
    keywordExtract?: string[]
    interviewDateTime?: string
    interviewType?: string
    interviewRound?: number
    statusOutcome?: string
    archived?: boolean
    offerDetails?: OfferDetails
    offerQuickPicks?: OfferQuickPicks
  }
  createdAt: string
  createdBy: string
}

// ─── Offer scoring helpers ────────────────────────────────────────────────────

type ScorePriority = 'max_pay' | 'work_life' | 'remote' | 'career_growth' | 'brand'

const PRIORITY_LABELS: Record<ScorePriority, string> = {
  max_pay: 'Max Pay',
  work_life: 'Work-Life Balance',
  remote: 'Remote / Flexibility',
  career_growth: 'Career Growth',
  brand: 'Brand & Learning',
}

function parseSalary(val?: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  // Handle k notation
  if (val.toLowerCase().includes('k')) return num * 1000
  return num
}

function scoreSalary(salary: number, maxSalary: number): number {
  if (maxSalary === 0) return 0
  return Math.round((salary / maxSalary) * 100)
}

function scoreWorkMode(workMode?: string): number {
  if (!workMode) return 50
  if (workMode === 'Remote') return 100
  if (workMode === 'Hybrid') return 60
  return 20
}

function computeOfferScore(
  job: Job,
  maxSalary: number,
  priority: ScorePriority
): number {
  const od = job.data.offerDetails
  const qp = job.data.offerQuickPicks
  const salaryScore = scoreSalary(parseSalary(od?.baseSalary), maxSalary)
  // workMode now lives in offerQuickPicks
  const workModeScore = scoreWorkMode(qp?.workMode)
  const hasBenefits = (qp?.benefits && qp.benefits.length > 0) ? 20 : 0
  const hasEquity = od?.equity ? 15 : 0

  const weights: Record<ScorePriority, { pay: number; workMode: number; benefits: number; equity: number }> = {
    max_pay:       { pay: 70, workMode: 5,  benefits: 10, equity: 15 },
    work_life:     { pay: 20, workMode: 50, benefits: 20, equity: 10 },
    remote:        { pay: 15, workMode: 70, benefits: 10, equity: 5  },
    career_growth: { pay: 30, workMode: 20, benefits: 15, equity: 35 },
    brand:         { pay: 30, workMode: 20, benefits: 25, equity: 25 },
  }

  const w = weights[priority]
  const totalWeight = w.pay + w.workMode + w.benefits + w.equity
  const raw = (
    (salaryScore / 100) * w.pay +
    (workModeScore / 100) * w.workMode +
    (hasBenefits / 20) * w.benefits +
    (hasEquity / 15) * w.equity
  )
  return Math.round((raw / totalWeight) * 100)
}

// Stage colors for visual distinction
const STAGE_COLORS = {
  [PIPELINE_STAGES.WISHLIST]: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500' },
  [PIPELINE_STAGES.APPLIED]: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500' },
  [PIPELINE_STAGES.INTERVIEW]: { bg: 'bg-green-50', border: 'border-green-200', accent: 'bg-green-500' },
  [PIPELINE_STAGES.OFFER]: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500' },
  [PIPELINE_STAGES.CLOSED]: { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'bg-gray-400' },
}

export default function PipelinePage() {
  const navigate = useNavigate()
  const { records: jobs, status } = useQuery('jobs', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { put } = useMutations('jobs')
  const { create: logActivity } = useMutations('activity_log')
  const { track } = useAnalyticsTracker()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ job: Job; direction: 'left' | 'right'; targetStage: string } | null>(null)
  const [scheduleInterviewJob, setScheduleInterviewJob] = useState<Job | null>(null)
  const [interviewDateTime, setInterviewDateTime] = useState('')
  const [showCompareOffers, setShowCompareOffers] = useState(false)
  const [comparePriority, setComparePriority] = useState<ScorePriority>('max_pay')

  const jobsByStage = useMemo(() => {
    const activeJobs = (jobs as Job[]).filter((job) => !job.data.archived)
    const stages: Record<string, Job[]> = {}
    
    PIPELINE_STAGES_ORDER.forEach((stage) => {
      stages[stage] = activeJobs.filter((job) => job.data.pipelineStage === stage)
    })
    
    return stages
  }, [jobs])

  const initiateMove = (job: Job, direction: 'left' | 'right') => {
    const currentIndex = PIPELINE_STAGES_ORDER.indexOf(job.data.pipelineStage as any)
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= PIPELINE_STAGES_ORDER.length) return
    
    const targetStage = PIPELINE_STAGES_ORDER[newIndex]
    setConfirmMove({ job, direction, targetStage })
  }

  const confirmMoveJob = () => {
    if (!confirmMove) return
    
    const { job, targetStage } = confirmMove
    const updatedData = { ...job.data, pipelineStage: targetStage }
    
    // Clear wishlist reminder date when moving from Wishlist to Applied
    if (job.data.pipelineStage === PIPELINE_STAGES.WISHLIST && targetStage === PIPELINE_STAGES.APPLIED) {
      updatedData.nextActionDate = undefined
      updatedData.nextActionType = undefined
    }
    
    put(job.recordId, updatedData)
    logActivity({
      actionType: 'move_stage',
      jobId: job.recordId,
      details: `Moved to ${targetStage}`,
    })

    // Analytics: track stage move with from/to breakdown
    track('stage_move', {
      fromStage: job.data.pipelineStage,
      toStage: targetStage,
    })
    
    setConfirmMove(null)
  }

  const handlePrepNavigation = (jobId: string) => {
    // Navigate to Prep page - PrepPage will need to be updated to read query params
    navigate(`/prep?jobId=${jobId}`)
  }

  const handleScheduleInterview = (job: Job) => {
    setScheduleInterviewJob(job)
    setInterviewDateTime(job.data.interviewDateTime || '')
  }

  const saveInterviewSchedule = () => {
    if (!scheduleInterviewJob || !interviewDateTime) return
    
    put(scheduleInterviewJob.recordId, {
      ...scheduleInterviewJob.data,
      interviewDateTime,
      interviewRound: (scheduleInterviewJob.data.interviewRound || 0) + 1,
    })
    
    logActivity({
      actionType: 'move_stage',
      jobId: scheduleInterviewJob.recordId,
      details: 'Scheduled interview',
    })

    // Analytics: track interview scheduled
    track('interview_scheduled')
    
    setScheduleInterviewJob(null)
    setInterviewDateTime('')
  }

  const formatInterviewDateTime = (dateTime?: string) => {
    if (!dateTime) return null
    const date = new Date(dateTime)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const isOverdue = (dateTime?: string) => {
    if (!dateTime) return false
    return new Date(dateTime) < new Date()
  }

  const handleOpenLink = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="flex-none px-8 pt-8 pb-6 border-b border-border">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-content tracking-tight">Pipeline</h1>
            <p className="text-sm text-content-muted mt-0.5">Track every application from wishlist to offer</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="btn-lift shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {PIPELINE_STAGES_ORDER.map((stage) => {
            const stageColor = STAGE_COLORS[stage as keyof typeof STAGE_COLORS]
            const showPrepButton = [PIPELINE_STAGES.WISHLIST, PIPELINE_STAGES.APPLIED, PIPELINE_STAGES.INTERVIEW].includes(stage as any)
            const jobCount = jobsByStage[stage]?.length || 0
            
            return (
              <div key={stage} className="flex flex-col">
                {/* Column Header */}
                <div className={`${stageColor.bg} rounded-xl p-4 mb-4 border ${stageColor.border}`}>
                  <div className={`w-8 h-1 ${stageColor.accent} rounded-full mb-3`} />
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-content tracking-tight uppercase" style={{ letterSpacing: '0.06em' }}>{stage}</h3>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface text-xs font-bold text-content-secondary shadow-sm border border-border">
                      {jobCount}
                    </span>
                  </div>
                  {/* Compare Offers button only on Offer column */}
                  {stage === PIPELINE_STAGES.OFFER && jobCount >= 2 && (
                    <button
                      onClick={() => setShowCompareOffers(true)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Compare Offers
                    </button>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {!jobsByStage[stage] || jobsByStage[stage].length === 0 ? (
                    <div className="empty-card rounded-xl p-6 text-center">
                      <Inbox className="w-6 h-6 text-content-muted mx-auto mb-2" />
                      <p className="text-xs font-medium text-content-muted">No jobs yet</p>
                      <p className="text-xs text-content-muted/70 mt-0.5">Drag or move a job here</p>
                    </div>
                  ) : (
                    jobsByStage[stage].map((job) => {
                      const formattedInterview = formatInterviewDateTime(job.data.interviewDateTime)
                      const interviewOverdue = isOverdue(job.data.interviewDateTime)
                      
                      return (
                        <div 
                          key={job.recordId} 
                          className="card-hover bg-surface-elevated rounded-xl border border-border overflow-hidden"
                          style={{ borderLeft: `3px solid` }}
                        >
                          {/* Stage color stripe — left edge */}
                          <div className="flex">
                            <div className={`w-0.5 shrink-0 ${stageColor.accent}`} />
                            <div className="flex-1 p-4">
                              {/* Role & Company */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 cursor-pointer min-w-0" onClick={() => setSelectedJob(job)}>
                                  <h4 className="text-sm font-bold text-content mb-0.5 truncate leading-tight">
                                    {job.data.role}
                                  </h4>
                                  <p className="text-xs text-content-secondary font-medium truncate">{job.data.company}</p>
                                </div>
                                <div className="ml-2 shrink-0">
                                  <Badge
                                    color={PRIORITY_CONFIG[job.data.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}
                                  >
                                    {job.data.priority}
                                  </Badge>
                                </div>
                              </div>

                              {/* Alert lines */}
                              {stage === PIPELINE_STAGES.WISHLIST && job.data.nextActionDate && (
                                <div className="flex items-center gap-1.5 text-xs text-content-secondary mb-3 px-2 py-1.5 bg-surface-overlay rounded-lg border border-border">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span>Apply by {job.data.nextActionDate}</span>
                                </div>
                              )}
                              
                              {formattedInterview && stage === PIPELINE_STAGES.INTERVIEW && (
                                <div className={`flex items-center gap-1.5 text-xs mb-3 px-2 py-1.5 rounded-lg font-medium border ${
                                  interviewOverdue 
                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                  {interviewOverdue ? (
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                  ) : (
                                    <Calendar className="w-3 h-3 shrink-0" />
                                  )}
                                  <span className="truncate">Interview • {formattedInterview}</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="space-y-1.5">
                                {/* Prep Button (Wishlist, Applied, Interview only) */}
                                {showPrepButton && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handlePrepNavigation(job.recordId)}
                                    className="w-full justify-center text-xs"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                    Go to Prep
                                  </Button>
                                )}

                                {/* Schedule Interview Button (Interview stage only) */}
                                {stage === PIPELINE_STAGES.INTERVIEW && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleScheduleInterview(job)}
                                    className="w-full justify-center text-xs"
                                  >
                                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                    {job.data.interviewDateTime ? 'Edit date' : 'Set date'}
                                  </Button>
                                )}

                                {/* Arrow & Action Buttons */}
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => initiateMove(job, 'left')}
                                    disabled={PIPELINE_STAGES_ORDER.indexOf(job.data.pipelineStage as any) === 0}
                                    className="flex-1"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedJob(job)}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  {job.data.jobLink && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenLink(job.data.jobLink!)}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => initiateMove(job, 'right')}
                                    disabled={
                                      PIPELINE_STAGES_ORDER.indexOf(job.data.pipelineStage as any) ===
                                      PIPELINE_STAGES_ORDER.length - 1
                                    }
                                    className="flex-1"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} />}
      {selectedJob && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      
      {/* Confirm Move Modal */}
      {confirmMove && (
        <Modal open={true} onClose={() => setConfirmMove(null)}>
          <Modal.Header onClose={() => setConfirmMove(null)}>
            <Modal.Title>Move job?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-content-secondary">
              Move <span className="font-semibold text-content">{confirmMove.job.data.role}</span> at{' '}
              <span className="font-semibold text-content">{confirmMove.job.data.company}</span> to{' '}
              <span className="font-semibold text-content">{confirmMove.targetStage}</span>?
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setConfirmMove(null)}>
              Cancel
            </Button>
            <Button onClick={confirmMoveJob}>
              Yes, Move
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Schedule Interview Modal */}
      {scheduleInterviewJob && (
        <Modal open={true} onClose={() => setScheduleInterviewJob(null)}>
          <Modal.Header onClose={() => setScheduleInterviewJob(null)}>
            <Modal.Title>Schedule Interview</Modal.Title>
            <Modal.Description>
              {scheduleInterviewJob.data.company} — {scheduleInterviewJob.data.role}
            </Modal.Description>
          </Modal.Header>
          <Modal.Body>
            <div>
              <label className="text-sm font-semibold text-content mb-2 block">
                Interview Date &amp; Time
              </label>
              <div className="date-input-wrapper">
                <input
                  type="datetime-local"
                  value={interviewDateTime}
                  onChange={(e) => setInterviewDateTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setScheduleInterviewJob(null)}>
              Cancel
            </Button>
            <Button onClick={saveInterviewSchedule} disabled={!interviewDateTime}>
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Compare Offers Modal */}
      {showCompareOffers && (
        <CompareOffersModal
          jobs={(jobs as Job[]).filter(j => !j.data.archived && j.data.pipelineStage === PIPELINE_STAGES.OFFER)}
          priority={comparePriority}
          onPriorityChange={setComparePriority}
          onClose={() => setShowCompareOffers(false)}
          onSelectJob={(job) => { setShowCompareOffers(false); setSelectedJob(job) }}
        />
      )}
    </div>
  )
}

// ─── Compare Offers Modal ─────────────────────────────────────────────────────

interface CompareOffersModalProps {
  jobs: Job[]
  priority: ScorePriority
  onPriorityChange: (p: ScorePriority) => void
  onClose: () => void
  onSelectJob: (job: Job) => void
}

function CompareOffersModal({ jobs, priority, onPriorityChange, onClose, onSelectJob }: CompareOffersModalProps) {
  const salaries = jobs.map(j => parseSalary(j.data.offerDetails?.baseSalary))
  const maxSalary = Math.max(...salaries, 0)

  const scoredJobs = useMemo(() => {
    return jobs
      .map(job => ({
        job,
        score: computeOfferScore(job, maxSalary, priority),
        salary: parseSalary(job.data.offerDetails?.baseSalary),
      }))
      .sort((a, b) => b.score - a.score)
  }, [jobs, maxSalary, priority])

  const SCORE_COLORS = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-100'
    if (score >= 55) return 'text-amber-700 bg-amber-100'
    return 'text-red-700 bg-red-100'
  }

  return (
    <Modal open={true} onClose={onClose} size="xl">
      <Modal.Header onClose={onClose}>
        <div>
          <Modal.Title>Compare Offers</Modal.Title>
          <p className="text-content-secondary text-sm mt-0.5">
            {jobs.length} offer{jobs.length !== 1 ? 's' : ''} in pipeline
          </p>
        </div>
      </Modal.Header>

      <Modal.Body>
        {/* Priority Selector */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-content mb-3">Your priority</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRIORITY_LABELS) as ScorePriority[]).map(p => (
              <button
                key={p}
                onClick={() => onPriorityChange(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  priority === p
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-elevated text-content-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Ranked offer cards */}
        <div className="space-y-4">
          {scoredJobs.map(({ job, score }, idx) => {
            const od = job.data.offerDetails
            const isTop = idx === 0
            return (
              <div
                key={job.recordId}
                className={`rounded-2xl border p-5 transition-all ${
                  isTop
                    ? 'border-amber-300 bg-amber-50 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
                    : 'border-border bg-surface-elevated shadow-card'
                }`}
              >
                {/* Rank badge + title */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      isTop ? 'bg-amber-400 text-white' : 'bg-surface-overlay text-content-secondary'
                    }`}>
                      {isTop ? <Trophy className="w-4 h-4" /> : `#${idx + 1}`}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-content">{job.data.role}</h4>
                      <p className="text-sm text-content-secondary">{job.data.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${SCORE_COLORS(score)}`}>
                      Score: {score}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mb-4">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-amber-400' : 'bg-primary'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                {/* Offer details grid */}
                {(() => {
                  const qpData = job.data.offerQuickPicks
                  const hasDetails = od?.baseSalary || od?.equity || od?.location || qpData?.workMode || (qpData?.benefits && qpData.benefits.length > 0)
                  if (!hasDetails) return <p className="text-sm text-content-muted italic mb-4">No offer details entered yet.</p>
                  return (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                      {od?.baseSalary && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-content-muted" />
                          <span className="text-content-secondary">Base: </span>
                          <span className="font-semibold text-content">{(od as any).currency || ''} {od.baseSalary}</span>
                        </div>
                      )}
                      {qpData?.bonusType && qpData.bonusType !== 'No bonus' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-content-secondary">Bonus: </span>
                          <span className="font-semibold text-content">
                            {qpData.bonusType === 'Annual target %' && qpData.bonusPct
                              ? `${qpData.bonusPct} target`
                              : qpData.bonusType}
                          </span>
                        </div>
                      )}
                      {od?.equity && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-content-secondary">Equity: </span>
                          <span className="font-semibold text-content">{od.equity}</span>
                        </div>
                      )}
                      {od?.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-content-muted" />
                          <span className="font-semibold text-content">{od.location}</span>
                          {qpData?.workMode && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                              qpData.workMode === 'Remote' ? 'bg-green-100 text-green-700' :
                              qpData.workMode === 'Hybrid' ? 'bg-blue-100 text-blue-700' :
                              'bg-surface-overlay text-content-secondary'
                            }`}>{qpData.workMode}</span>
                          )}
                        </div>
                      )}
                      {od?.startDate && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-content-secondary">Start: </span>
                          <span className="font-semibold text-content">{od.startDate}</span>
                        </div>
                      )}
                      {od?.totalCompNotes && (
                        <div className="col-span-2 flex items-start gap-1.5">
                          <span className="text-content-secondary">Total Comp: </span>
                          <span className="font-semibold text-content">{od.totalCompNotes}</span>
                        </div>
                      )}
                      {qpData?.benefits && qpData.benefits.length > 0 && (
                        <div className="col-span-2 flex items-start gap-1.5">
                          <span className="text-content-secondary">Benefits: </span>
                          <span className="text-content-secondary">{qpData.benefits.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                <button
                  onClick={() => onSelectJob(job)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  View / Edit offer →
                </button>
              </div>
            )
          })}
        </div>

        {/* Scoring note */}
        <div className="mt-6 p-4 rounded-xl bg-surface-elevated border border-border">
          <p className="text-xs text-content-muted">
            <span className="font-semibold text-content-secondary">How scores work: </span>
            Scores are calculated based on your selected priority. &quot;Max Pay&quot; weights base salary heavily (70%);
            &quot;Remote&quot; weights work mode (70%); &quot;Career Growth&quot; weights equity (35%). Offers without
            details entered receive lower scores. Click &quot;View / Edit offer&quot; to fill in details.
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
