import React, { useState, useMemo } from 'react'
import { useQuery, useMutations, useUser } from '@spaces/sdk/storage'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Card, EmptyState, LoadingSpinner } from '../components/ui'
import { Plus, Calendar, Clock, CheckCircle, ExternalLink, Inbox, BookOpen, AlertCircle } from 'lucide-react'
import { PRIORITY_CONFIG, PIPELINE_STAGES } from '../constants'
import AddJobModal from '../components/AddJobModal.tsx'
import JobDetailsModal from '../components/JobDetailsModal.tsx'
import FollowUpModal from '../components/FollowUpModal.tsx'
import InterviewModal from '../components/InterviewModal.tsx'

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
    // Follow-up fields
    followUpRecruiterName?: string
    followUpContactType?: string
    followUpContact?: string
    followUpStatus?: string
    followUpDate?: string
    followUpNotes?: string
    followUpCustomLine?: string
    // Interview reflection fields
    interviewQuestionsAsked?: string
    interviewPerformance?: string
    interviewImprovements?: string
  }
  createdAt: string
  createdBy: string
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { records: jobs, status } = useQuery('jobs', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { put } = useMutations('jobs')
  const { create: logActivity } = useMutations('activity_log')

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [followUpModalJob, setFollowUpModalJob] = useState<Job | null>(null)
  const [interviewModalJob, setInterviewModalJob] = useState<Job | null>(null)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const next7Days = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }, [])

  // Derived columns from pipeline jobs
  const { overdue, upcoming, followUp, interview } = useMemo(() => {
    const activeJobs = (jobs as Job[]).filter(
      (job) =>
        !job.data.archived &&
        job.data.pipelineStage !== PIPELINE_STAGES.OFFER &&
        job.data.pipelineStage !== PIPELINE_STAGES.CLOSED
    )

    // Overdue: past interview date OR past follow-up/reminder date
    const overdue = activeJobs.filter((job) => {
      const hasOverdueInterview = job.data.interviewDateTime && job.data.interviewDateTime < new Date().toISOString()
      const hasOverdueFollowUp = job.data.followUpDate && job.data.followUpDate < today
      const hasOverdueReminder = job.data.nextActionDate && job.data.nextActionDate < today
      return hasOverdueInterview || hasOverdueFollowUp || hasOverdueReminder
    })

    // Upcoming: Wishlist jobs + future interviews + future Applied follow-ups (next 7 days)
    const upcoming = activeJobs.filter((job) => {
      // Wishlist jobs are "upcoming applications"
      if (job.data.pipelineStage === PIPELINE_STAGES.WISHLIST) return true
      
      // Interview stage with future date in next 7 days
      if (job.data.pipelineStage === PIPELINE_STAGES.INTERVIEW && job.data.interviewDateTime) {
        const interviewDate = job.data.interviewDateTime.split('T')[0]
        return interviewDate >= today && interviewDate <= next7Days
      }
      
      // Applied with future follow-up date in next 7 days
      if (job.data.pipelineStage === PIPELINE_STAGES.APPLIED && job.data.followUpDate) {
        return job.data.followUpDate >= today && job.data.followUpDate <= next7Days
      }
      
      return false
    })

    // Follow-up: Applied stage jobs (exclude Offer/Closed)
    const followUp = activeJobs.filter((job) => {
      return job.data.pipelineStage === PIPELINE_STAGES.APPLIED
    })

    // Interview: Interview stage jobs
    const interview = activeJobs.filter((job) => {
      return job.data.pipelineStage === PIPELINE_STAGES.INTERVIEW
    })

    return { overdue, upcoming, followUp, interview }
  }, [jobs, today, next7Days])

  const handleMarkDone = (job: Job) => {
    // Clear next action
    put(job.recordId, { ...job.data, nextActionType: undefined, nextActionDate: undefined })
    logActivity({
      actionType: 'complete_action',
      jobId: job.recordId,
      details: `Completed action: ${job.data.nextActionType}`,
    })
  }

  const handleOpenLink = (url: string) => {
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')
    }
  }

  const handleFollowUpFieldChange = (jobId: string, field: string, value: any) => {
    const job = (jobs as Job[]).find(j => j.recordId === jobId)
    if (!job) return
    
    put(jobId, {
      ...job.data,
      [field]: value,
    })
  }

  const handlePrepareInPrep = (jobId: string) => {
    // Navigate to Prep page - in future, could pass jobId to select it
    navigate('/prep')
  }

  const handleNextRound = async (jobId: string, nextDateTime: string) => {
    const job = (jobs as Job[]).find(j => j.recordId === jobId)
    if (!job) return
    
    const currentRound = job.data.interviewRound || 1
    await put(jobId, {
      ...job.data,
      interviewDateTime: nextDateTime,
      interviewRound: currentRound + 1,
    })
  }

  const handleMoveToStage = async (jobId: string, stage: string) => {
    const job = (jobs as Job[]).find(j => j.recordId === jobId)
    if (!job) return
    
    await put(jobId, {
      ...job.data,
      pipelineStage: stage,
    })
    
    await logActivity({
      actionType: 'move_stage',
      jobId,
      details: `Moved to ${stage}`,
    })
  }

  const handleInterviewFieldChange = (jobId: string, field: string, value: any) => {
    const job = (jobs as Job[]).find(j => j.recordId === jobId)
    if (!job) return
    
    put(jobId, {
      ...job.data,
      [field]: value,
    })
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  const hasJobs = (jobs as Job[]).length > 0

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Hero Section */}
      <div className="mb-12">
        <div className="gradient-hero rounded-3xl p-12 text-white shadow-hero relative overflow-hidden">
          {/* Subtle decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 translate-x-16 -translate-y-16 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-white/5 translate-y-10 pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-5xl font-bold mb-3 tracking-tight">Interview.OS</h1>
            <p className="text-xl text-white/85 mb-8 font-light">Track applications. Always know the next move.</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/30 font-semibold shadow-lg min-w-[140px] h-12 backdrop-blur-sm transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Job
            </Button>
          </div>
        </div>
      </div>

      {!hasJobs ? (
        /* Onboarding Empty State */
        <div className="max-w-3xl mx-auto">
          <Card className="p-12">
            <h2 className="text-3xl font-bold text-center mb-8 text-content">
              Add your first job in 10 seconds
            </h2>

            <div className="grid grid-cols-3 gap-8 mb-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-muted text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <p className="font-semibold text-content">Add a job</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-muted text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <p className="font-semibold text-content">Set the next action</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-muted text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <p className="font-semibold text-content">Move it as you progress</p>
              </div>
            </div>

            <div className="flex justify-center mb-10">
              <Button onClick={() => setShowAddModal(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add your first job
              </Button>
            </div>

            <div className="border-t border-border pt-8">
              <h3 className="text-lg font-semibold mb-4 text-content">Sample job card preview:</h3>
              <div className="bg-surface-elevated border border-border rounded-xl p-6 shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-content">Senior Product Designer</h4>
                    <p className="text-content-secondary font-medium">Acme Corp</p>
                  </div>
                  <Badge color="info">Medium</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-content-secondary">
                  <Calendar className="w-4 h-4" />
                  <span>Follow Up • {today}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Today Command Center */
        <>
          <div className="flex items-baseline gap-4 mb-8">
            <h2 className="text-3xl font-bold text-content tracking-tight">Today&apos;s Command Center</h2>
            <span className="text-sm text-content-muted font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>

          {/* Two-column layout with independent stacks */}
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Overdue + Follow-up */}
            <div className="flex flex-col gap-8">
              {/* Overdue Section */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5 section-header-accent" style={{ color: 'var(--color-danger)' }}>
                    <AlertCircle className="w-4 h-4 text-danger" />
                    <h3 className="text-base font-bold text-content tracking-tight uppercase text-xs" style={{ letterSpacing: '0.08em' }}>Overdue</h3>
                  </div>
                  <span className="count-chip bg-danger-muted text-danger border border-danger-border">
                    {overdue.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {overdue.length === 0 ? (
                    <div className="empty-card rounded-xl p-8 text-center">
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-success-muted/40 animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="relative w-14 h-14 rounded-full bg-success-muted flex items-center justify-center ring-4 ring-success/10">
                          <CheckCircle className="w-7 h-7 text-success" />
                        </div>
                      </div>
                      <p className="font-bold text-content mb-1">All clear!</p>
                      <p className="text-sm text-content-muted leading-relaxed">No overdue items.<br/>You&apos;re on top of everything.</p>
                    </div>
                  ) : (
                    overdue.map((job) => (
                      <div key={job.recordId} className="card-hover today-card-danger bg-surface-elevated border border-border rounded-xl p-5 border-l-4 cursor-pointer" style={{ borderLeftColor: 'var(--color-danger)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1" onClick={() => setSelectedJob(job)}>
                            <h4 className="font-bold text-base text-content mb-0.5 leading-tight">{job.data.role}</h4>
                            <p className="text-sm text-content-secondary font-medium">{job.data.company}</p>
                          </div>
                          <Badge color={PRIORITY_CONFIG[job.data.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}>
                            {job.data.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-danger mb-3 bg-danger-muted px-3 py-2 rounded-lg border border-danger-border">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {job.data.interviewDateTime
                              ? `Interview • ${new Date(job.data.interviewDateTime).toLocaleDateString()}`
                              : job.data.followUpDate
                              ? `Follow-up • ${job.data.followUpDate}`
                              : `Reminder • ${job.data.nextActionDate}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkDone(job)}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Mark Done
                          </Button>
                          {job.data.jobLink && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenLink(job.data.jobLink!)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Follow-up Section */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5 section-header-accent" style={{ color: 'var(--color-warning)' }}>
                    <Clock className="w-4 h-4 text-warning" />
                    <h3 className="text-content tracking-tight uppercase text-xs font-bold" style={{ letterSpacing: '0.08em' }}>Follow-up</h3>
                  </div>
                  <span className="count-chip bg-warning-muted text-warning border border-warning-border">
                    {followUp.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {followUp.length === 0 ? (
                    <div className="empty-card rounded-xl p-8 text-center">
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-warning-muted/40" style={{ transform: 'scale(1.2)' }} />
                        <div className="relative w-14 h-14 rounded-full bg-warning-muted flex items-center justify-center ring-4 ring-warning/10">
                          <Clock className="w-7 h-7 text-warning" />
                        </div>
                      </div>
                      <p className="font-bold text-content mb-1">No follow-ups</p>
                      <p className="text-sm text-content-muted leading-relaxed">Move a job to <span className="font-semibold text-content-secondary">Applied</span> stage to track follow-ups here.</p>
                    </div>
                  ) : (
                    followUp.map((job) => (
                      <div key={job.recordId} className="card-hover today-card-warning bg-surface-elevated border border-border rounded-xl p-5 border-l-4" style={{ borderLeftColor: 'var(--color-warning)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-base text-content mb-0.5 leading-tight">{job.data.role}</h4>
                            <p className="text-sm text-content-secondary font-medium">{job.data.company}</p>
                          </div>
                          <Badge color={PRIORITY_CONFIG[job.data.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}>
                            {job.data.priority}
                          </Badge>
                        </div>

                        {job.data.followUpDate && (
                          <div className="flex items-center gap-2 text-xs font-medium text-content-secondary mb-3 bg-surface-overlay px-3 py-2 rounded-lg">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Follow-up: {job.data.followUpDate}</span>
                          </div>
                        )}

                        <Button
                          size="sm"
                          onClick={() => setFollowUpModalJob(job)}
                          className="w-full"
                        >
                          Manage Follow-up
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Upcoming + Interview */}
            <div className="flex flex-col gap-8">
              {/* Upcoming Section */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5 section-header-accent" style={{ color: 'var(--color-info)' }}>
                    <Calendar className="w-4 h-4 text-info" />
                    <h3 className="text-content tracking-tight uppercase text-xs font-bold" style={{ letterSpacing: '0.08em' }}>Upcoming</h3>
                  </div>
                  <span className="count-chip bg-info-muted text-info border border-info-border">
                    {upcoming.length}
                  </span>
                  <span className="text-xs text-content-muted font-medium">Next 7 days</span>
                </div>
                <div className="space-y-3">
                  {upcoming.length === 0 ? (
                    <div className="empty-card rounded-xl p-8 text-center">
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-info-muted/40" style={{ transform: 'scale(1.2)' }} />
                        <div className="relative w-14 h-14 rounded-full bg-info-muted flex items-center justify-center ring-4 ring-info/10">
                          <Calendar className="w-7 h-7 text-info" />
                        </div>
                      </div>
                      <p className="font-bold text-content mb-1">Nothing scheduled</p>
                      <p className="text-sm text-content-muted leading-relaxed">Add a job to Pipeline<br/>to see upcoming events here.</p>
                    </div>
                  ) : (
                    upcoming.map((job) => {
                      let nextItemLabel = ''
                      if (job.data.pipelineStage === PIPELINE_STAGES.WISHLIST) {
                        nextItemLabel = 'Wishlist: Apply soon'
                      } else if (job.data.interviewDateTime) {
                        nextItemLabel = `Interview: ${new Date(job.data.interviewDateTime).toLocaleDateString()}`
                      } else if (job.data.followUpDate) {
                        nextItemLabel = `Follow-up: ${job.data.followUpDate}`
                      }
                      
                      return (
                        <div key={job.recordId} className="card-hover today-card-info bg-surface-elevated border border-border rounded-xl p-5 border-l-4 cursor-pointer" style={{ borderLeftColor: 'var(--color-info)' }} onClick={() => setSelectedJob(job)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-base text-content mb-0.5 leading-tight">{job.data.role}</h4>
                              <p className="text-sm text-content-secondary font-medium">{job.data.company}</p>
                            </div>
                            <Badge color={PRIORITY_CONFIG[job.data.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}>
                              {job.data.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-info mb-2 bg-info-muted px-3 py-2 rounded-lg border border-info-border">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{nextItemLabel}</span>
                          </div>
                          <div className="text-xs text-content-muted mt-2">
                            Stage: <span className="font-semibold text-content-secondary">{job.data.pipelineStage}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Interview Section */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2.5 section-header-accent" style={{ color: 'var(--color-success)' }}>
                    <BookOpen className="w-4 h-4 text-success" />
                    <h3 className="text-content tracking-tight uppercase text-xs font-bold" style={{ letterSpacing: '0.08em' }}>Interview</h3>
                  </div>
                  <span className="count-chip bg-success-muted text-success border border-success-border">
                    {interview.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {interview.length === 0 ? (
                    <div className="empty-card rounded-xl p-8 text-center">
                      <div className="relative w-14 h-14 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-success-muted/40" style={{ transform: 'scale(1.2)' }} />
                        <div className="relative w-14 h-14 rounded-full bg-success-muted flex items-center justify-center ring-4 ring-success/10">
                          <BookOpen className="w-7 h-7 text-success" />
                        </div>
                      </div>
                      <p className="font-bold text-content mb-1">No active interviews</p>
                      <p className="text-sm text-content-muted leading-relaxed">Move a job to <span className="font-semibold text-content-secondary">Interview</span> stage to see it here.</p>
                    </div>
                  ) : (
                    interview.map((job) => (
                      <div key={job.recordId} className="card-hover today-card-success bg-surface-elevated border border-border rounded-xl p-5 border-l-4" style={{ borderLeftColor: 'var(--color-success)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-base text-content mb-0.5 leading-tight">{job.data.role}</h4>
                            <p className="text-sm text-content-secondary font-medium">{job.data.company}</p>
                          </div>
                          <Badge color={PRIORITY_CONFIG[job.data.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}>
                            {job.data.priority}
                          </Badge>
                        </div>
                        
                        {job.data.interviewDateTime && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-success mb-3 bg-success-muted px-3 py-2 rounded-lg border border-success-border">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              {job.data.interviewType} • {new Date(job.data.interviewDateTime).toLocaleString()}
                              {job.data.interviewRound && job.data.interviewRound > 1 && (
                                <span className="ml-2 opacity-70">(Round {job.data.interviewRound})</span>
                              )}
                            </span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Button
                            size="sm"
                            onClick={() => handlePrepareInPrep(job.recordId)}
                            className="w-full"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Prepare in Prep
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setInterviewModalJob(job)}
                            className="w-full"
                          >
                            Post-Interview Actions
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} />}
      {selectedJob && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      {followUpModalJob && (
        <FollowUpModal
          job={followUpModalJob}
          onClose={() => setFollowUpModalJob(null)}
          onUpdate={handleFollowUpFieldChange}
        />
      )}
      {interviewModalJob && (
        <InterviewModal
          job={interviewModalJob}
          onClose={() => setInterviewModalJob(null)}
          onUpdate={handleInterviewFieldChange}
          onNextRound={handleNextRound}
          onMoveToStage={handleMoveToStage}
        />
      )}
    </div>
  )
}
