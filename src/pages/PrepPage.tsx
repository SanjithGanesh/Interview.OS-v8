import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutations } from '@spaces/sdk/storage'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Badge, Modal } from '../components/ui'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Upload, 
  X, 
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  Trash2,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import { 
  PIPELINE_STAGES, 
  extractKeywords, 
  generateQuestionsFromJD,
  type GeneratedQuestion 
} from '../constants'

interface Job {
  recordId: string
  data: {
    company: string
    role: string
    pipelineStage: string
    jdText?: string
    keywordExtract?: string[]
    technicalKeywords?: string[]
    generalKeywords?: string[]
    jdAnalyzedAt?: string
    generatedQuestions?: GeneratedQuestion[]
    questionNotes?: Record<string, {
      notes?: string
      practiced?: boolean
      confidence?: number
      timeSpent?: number
    }>
    resumeFile?: {
      fileId: string
      filename: string
      uploadedAt: string
    }
    coverLetterFile?: {
      fileId: string
      filename: string
      uploadedAt: string
    }
    statusOutcome?: string
    archived?: boolean
  }
}

export default function PrepPage() {
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId')
  
  const { records: jobs } = useQuery('jobs')
  const { put: updateJob } = useMutations('jobs')
  const { create: logActivity } = useMutations('activity_log')

  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [jdText, setJdText] = useState('')
  const [technicalKeywords, setTechnicalKeywords] = useState<string[]>([])
  const [generalKeywords, setGeneralKeywords] = useState<string[]>([])
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [questionNotes, setQuestionNotes] = useState<Record<string, any>>({})
  
  // Question timers (per question)
  const [questionTimers, setQuestionTimers] = useState<Record<string, number>>({})
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>({})
  
  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  
  // File upload states
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Filter jobs not in Offer or Closed
  const prepJobs = useMemo(() => {
    return (jobs as Job[]).filter(
      (job) =>
        !job.data.archived &&
        job.data.pipelineStage !== PIPELINE_STAGES.OFFER &&
        job.data.pipelineStage !== PIPELINE_STAGES.CLOSED
    )
  }, [jobs])

  const selectedJob = useMemo(() => {
    return prepJobs.find((j) => j.recordId === selectedJobId)
  }, [prepJobs, selectedJobId])

  // Load job from URL parameter
  useEffect(() => {
    if (jobIdFromUrl && prepJobs.length > 0) {
      const jobExists = prepJobs.some(j => j.recordId === jobIdFromUrl)
      if (jobExists) {
        setSelectedJobId(jobIdFromUrl)
      }
    }
  }, [jobIdFromUrl, prepJobs])

  // Load selected job data
  useEffect(() => {
    if (selectedJob) {
      setJdText(selectedJob.data.jdText || '')
      setTechnicalKeywords(selectedJob.data.technicalKeywords || [])
      setGeneralKeywords(selectedJob.data.generalKeywords || [])
      setQuestions(selectedJob.data.generatedQuestions || [])
      setQuestionNotes(selectedJob.data.questionNotes || {})
      
      // Initialize timers for all questions (default 120 seconds)
      const timers: Record<string, number> = {}
      const running: Record<string, boolean> = {}
      ;(selectedJob.data.generatedQuestions || []).forEach(q => {
        timers[q.id] = 120
        running[q.id] = false
      })
      setQuestionTimers(timers)
      setRunningTimers(running)
    } else {
      // Reset state when no job selected
      setJdText('')
      setTechnicalKeywords([])
      setGeneralKeywords([])
      setQuestions([])
      setQuestionNotes({})
      setQuestionTimers({})
      setRunningTimers({})
    }
  }, [selectedJob])

  // Timer effects (one per question)
  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {}
    
    Object.keys(runningTimers).forEach(questionId => {
      if (runningTimers[questionId] && questionTimers[questionId] > 0) {
        intervals[questionId] = setInterval(() => {
          setQuestionTimers(prev => ({
            ...prev,
            [questionId]: Math.max(0, prev[questionId] - 1)
          }))
        }, 1000)
      }
    })
    
    return () => {
      Object.values(intervals).forEach(clearInterval)
    }
  }, [runningTimers, questionTimers])

  // Stop timer when it hits 0
  useEffect(() => {
    Object.keys(questionTimers).forEach(questionId => {
      if (questionTimers[questionId] === 0 && runningTimers[questionId]) {
        setRunningTimers(prev => ({ ...prev, [questionId]: false }))
      }
    })
  }, [questionTimers, runningTimers])

  const analyzeJD = () => {
    if (!jdText.trim()) return

    const { technical, general } = extractKeywords(jdText)
    setTechnicalKeywords(technical)
    setGeneralKeywords(general)

    if (selectedJob) {
      const generatedQuestions = generateQuestionsFromJD(
        jdText,
        technical,
        general,
        selectedJob.data.company,
        selectedJob.data.role
      )
      
      setQuestions(generatedQuestions)
      
      // Initialize timers for new questions
      const timers: Record<string, number> = {}
      const running: Record<string, boolean> = {}
      generatedQuestions.forEach(q => {
        timers[q.id] = 120
        running[q.id] = false
      })
      setQuestionTimers(timers)
      setRunningTimers(running)

      updateJob(selectedJob.recordId, {
        ...selectedJob.data,
        jdText,
        technicalKeywords: technical,
        generalKeywords: general,
        jdAnalyzedAt: new Date().toISOString(),
        generatedQuestions,
      })
      
      logActivity({
        actionType: 'start_prep',
        jobId: selectedJob.recordId,
        details: 'Analyzed job description and generated questions',
      })
    }
  }

  const regenerateQuestions = () => {
    if (!selectedJob || !jdText.trim()) return
    setShowRegenerateConfirm(true)
  }

  const confirmRegenerate = () => {
    setShowRegenerateConfirm(false)
    analyzeJD()
  }

  const updateQuestionNote = (questionId: string, field: string, value: any) => {
    const updated = {
      ...questionNotes,
      [questionId]: {
        ...(questionNotes[questionId] || {}),
        [field]: value,
      }
    }
    setQuestionNotes(updated)
    
    if (selectedJob) {
      updateJob(selectedJob.recordId, {
        ...selectedJob.data,
        questionNotes: updated,
      })
    }
  }

  const toggleTimer = (questionId: string) => {
    setRunningTimers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }))
  }

  const resetTimer = (questionId: string) => {
    setQuestionTimers(prev => ({ ...prev, [questionId]: 120 }))
    setRunningTimers(prev => ({ ...prev, [questionId]: false }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const collapseAll = () => {
    const categories = [...new Set(questions.map(q => q.category))]
    const collapsed: Record<string, boolean> = {}
    categories.forEach(cat => { collapsed[cat] = true })
    setCollapsedCategories(collapsed)
  }

  const expandAll = () => {
    setCollapsedCategories({})
  }

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    const grouped: Record<string, GeneratedQuestion[]> = {}
    questions.forEach(q => {
      if (!grouped[q.category]) grouped[q.category] = []
      grouped[q.category].push(q)
    })
    return grouped
  }, [questions])

  // Progress stats
  const practicedCount = useMemo(() => {
    return Object.values(questionNotes).filter(n => n.practiced).length
  }, [questionNotes])

  // File upload handlers (simplified - using mock storage for now)
  const handleFileUpload = async (type: 'resume' | 'coverLetter', file: File) => {
    if (!selectedJob) return
    
    const setUploading = type === 'resume' ? setUploadingResume : setUploadingCover
    setUploading(true)
    
    try {
      // Mock file upload (in production, this would use DeepSpace storage API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const fileData = {
        fileId: `file_${Date.now()}`,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      }
      
      const field = type === 'resume' ? 'resumeFile' : 'coverLetterFile'
      
      updateJob(selectedJob.recordId, {
        ...selectedJob.data,
        [field]: fileData,
      })
      
      logActivity({
        actionType: 'edit_job',
        jobId: selectedJob.recordId,
        details: `Uploaded ${type}`,
      })
    } catch (err) {
      alert(`Failed to upload ${type}. Please try again.`)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (type: 'resume' | 'coverLetter') => {
    if (!selectedJob) return
    
    const field = type === 'resume' ? 'resumeFile' : 'coverLetterFile'
    
    updateJob(selectedJob.recordId, {
      ...selectedJob.data,
      [field]: undefined,
    })
    
    logActivity({
      actionType: 'edit_job',
      jobId: selectedJob.recordId,
      details: `Removed ${type}`,
    })
  }

  const isEndState = selectedJob && (
    selectedJob.data.pipelineStage === PIPELINE_STAGES.OFFER ||
    selectedJob.data.pipelineStage === PIPELINE_STAGES.CLOSED
  )

  const hasJD = jdText.trim().length > 0
  const hasAnalyzed = questions.length > 0

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1.5 text-content tracking-tight">Prep Engine</h1>
          <p className="text-sm text-content-muted">
            Turn your JD into interview-ready practice — questions, timers, and notes.
          </p>
        </div>

        {/* Job Selector */}
        <Card className="p-6 mb-6 shadow-card card-hover">
          <label className="block text-xs font-bold text-content-muted uppercase tracking-wider mb-3">Select Job to Prep</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-input focus:border-primary focus:outline-none text-content transition-colors text-sm"
          >
            <option value="">Choose a job...</option>
            {prepJobs.map((job) => (
              <option key={job.recordId} value={job.recordId}>
                {job.data.company} — {job.data.role}
              </option>
            ))}
          </select>
        </Card>

        {/* Empty State - No Job Selected */}
        {!selectedJobId && (
          <Card className="p-16 text-center shadow-card">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-primary-muted flex items-center justify-center mx-auto mb-6 shadow-inner">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-content mb-3 tracking-tight">
                Ace your next interview.
              </h2>
              <p className="text-content-secondary text-sm leading-relaxed max-w-xs mx-auto">
                Select a job above to unlock JD analysis, AI-generated questions, timers, and notes.
              </p>
            </div>
          </Card>
        )}

        {/* End State Warning */}
        {isEndState && (
          <Card className="p-8 text-center mb-8 bg-warning-muted border-warning-border shadow-card">
            <p className="text-warning font-semibold">
              This job is in an end state. Prep modules are hidden by design.
            </p>
          </Card>
        )}

        {/* Main Prep Workspace */}
        {selectedJob && !isEndState && (
          <div className="space-y-8">
            
            {/* Selected Job Info */}
            <Card className="p-6 bg-primary-muted border-primary-border shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-primary mb-1">Prepping for</div>
                  <div className="text-lg font-bold text-content">
                    {selectedJob.data.company} - {selectedJob.data.role}
                  </div>
                </div>
                <Badge color="primary">{selectedJob.data.pipelineStage}</Badge>
              </div>
            </Card>

            {/* JD Analysis Section */}
            <Card className="p-8 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-primary-muted flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-content">Job Description Analysis</h2>
                  <p className="text-xs text-content-muted mt-0.5">Paste the JD and we&apos;ll extract keywords and generate questions</p>
                </div>
              </div>
              
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here to unlock question generation..."
                className="w-full h-52 px-5 py-4 rounded-xl border border-border bg-surface-elevated focus:border-primary focus:outline-none resize-none mb-5 text-content text-sm transition-colors placeholder:text-content-muted"
              />
              
              <Button 
                onClick={analyzeJD} 
                className="w-full py-4 text-base font-semibold"
                disabled={!hasJD}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze JD & Generate Questions
              </Button>

              {/* Extracted Keywords */}
              {(technicalKeywords.length > 0 || generalKeywords.length > 0) && (
                <div className="mt-8 pt-8 border-t border-border">
                  <h3 className="text-lg font-bold text-content mb-5">Extracted Keywords</h3>
                  
                  {technicalKeywords.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-semibold text-content mb-3">
                        Technical Terms ({technicalKeywords.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {technicalKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 rounded-full bg-primary-muted text-primary text-sm font-medium border border-primary-border"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {generalKeywords.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-content-secondary mb-3">
                        Other Keywords ({generalKeywords.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generalKeywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 rounded-full bg-surface-elevated text-content-secondary text-sm font-medium border border-border"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Documents Section */}
            <Card className="p-8 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-info-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-content">Documents</h2>
                  <p className="text-xs text-content-muted mt-0.5">Upload per-job resume and cover letter for reference</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                {/* Resume Upload */}
                <div>
                  <label className="block text-xs font-bold text-content-muted uppercase tracking-wider mb-3">Resume</label>
                  {selectedJob.data.resumeFile ? (
                    <div className="p-4 rounded-xl border border-border bg-surface-elevated flex items-center justify-between hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-content">
                            {selectedJob.data.resumeFile.filename}
                          </div>
                          <div className="text-xs text-content-muted">
                            {new Date(selectedJob.data.resumeFile.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile('resume')}
                        className="p-2 hover:bg-danger-muted rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload('resume', file)
                        }}
                        className="hidden"
                        disabled={uploadingResume}
                      />
                      <div className="p-8 rounded-xl border-2 border-dashed border-border bg-surface-elevated hover:border-primary hover:bg-primary-muted transition-all text-center group">
                        {uploadingResume ? (
                          <div className="text-sm text-content-secondary animate-pulse">Uploading...</div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-surface-overlay group-hover:bg-white flex items-center justify-center mx-auto mb-3 transition-colors">
                              <Upload className="w-5 h-5 text-content-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-sm font-medium text-content-secondary group-hover:text-content transition-colors">
                              Click to upload resume
                            </div>
                            <div className="text-xs text-content-muted mt-1">PDF, DOC, DOCX</div>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>

                {/* Cover Letter Upload */}
                <div>
                  <label className="block text-xs font-bold text-content-muted uppercase tracking-wider mb-3">Cover Letter</label>
                  {selectedJob.data.coverLetterFile ? (
                    <div className="p-4 rounded-xl border border-border bg-surface-elevated flex items-center justify-between hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-info-muted flex items-center justify-center">
                          <FileText className="w-4 h-4 text-info" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-content">
                            {selectedJob.data.coverLetterFile.filename}
                          </div>
                          <div className="text-xs text-content-muted">
                            {new Date(selectedJob.data.coverLetterFile.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile('coverLetter')}
                        className="p-2 hover:bg-danger-muted rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload('coverLetter', file)
                        }}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                      <div className="p-8 rounded-xl border-2 border-dashed border-border bg-surface-elevated hover:border-primary hover:bg-primary-muted transition-all text-center group">
                        {uploadingCover ? (
                          <div className="text-sm text-content-secondary animate-pulse">Uploading...</div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-surface-overlay group-hover:bg-white flex items-center justify-center mx-auto mb-3 transition-colors">
                              <Upload className="w-5 h-5 text-content-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-sm font-medium text-content-secondary group-hover:text-content transition-colors">
                              Click to upload cover letter
                            </div>
                            <div className="text-xs text-content-muted mt-1">PDF, DOC, DOCX</div>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </Card>

            {/* Question Bank Gate */}
            {!hasJD && (
              <Card className="p-12 text-center shadow-card">
                <Sparkles className="w-12 h-12 text-content-muted mx-auto mb-4" />
                <h3 className="text-xl font-bold text-content mb-2">Question Bank Locked</h3>
                <p className="text-content-secondary max-w-md mx-auto">
                  Paste the Job Description and click "Analyze JD & Generate Questions" to generate a tailored question set.
                </p>
              </Card>
            )}

            {/* Question Bank */}
            {hasAnalyzed && (
              <Card className="p-8 shadow-card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-content mb-2">Question Bank</h2>
                    <p className="text-sm text-content-secondary">
                      Practiced {practicedCount} / {questions.length} questions
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={expandAll}>
                      Expand All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={collapseAll}>
                      Collapse All
                    </Button>
                    <Button variant="secondary" onClick={regenerateQuestions}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>

                    {/* Regenerate Confirm Modal */}
                    {showRegenerateConfirm && (
                      <Modal open={true} onClose={() => setShowRegenerateConfirm(false)} size="sm">
                        <Modal.Header onClose={() => setShowRegenerateConfirm(false)}>
                          <Modal.Title>Regenerate questions?</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                          <p className="text-content-secondary text-sm">
                            This will create a new question set. Existing notes will not be carried over.
                          </p>
                        </Modal.Body>
                        <Modal.Footer>
                          <Button variant="ghost" onClick={() => setShowRegenerateConfirm(false)}>
                            Cancel
                          </Button>
                          <Button onClick={confirmRegenerate}>
                            Regenerate
                          </Button>
                        </Modal.Footer>
                      </Modal>
                    )}
                  </div>
                </div>

                {/* Questions by Category */}
                <div className="space-y-6">
                  {Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
                    <div key={category} className="border border-border rounded-xl overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full p-5 bg-surface-elevated hover:bg-surface-overlay flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-content">{category}</h3>
                          <Badge color="muted" size="sm">{categoryQuestions.length}</Badge>
                        </div>
                        {collapsedCategories[category] ? (
                          <ChevronDown className="w-5 h-5 text-content-secondary" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-content-secondary" />
                        )}
                      </button>

                      {/* Questions in Category */}
                      {!collapsedCategories[category] && (
                        <div className="divide-y divide-border">
                          {categoryQuestions.map((question) => {
                            const notes = questionNotes[question.id] || {}
                            const timer = questionTimers[question.id] || 120
                            const isRunning = runningTimers[question.id] || false
                            const isPracticed = notes.practiced || false

                            return (
                              <div key={question.id} className={`p-6 bg-surface transition-colors ${isPracticed ? 'bg-success-muted/30' : ''}`}>
                                {/* Question Header */}
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                      {question.difficulty && (
                                        <Badge 
                                          color={
                                            question.difficulty === 'Easy' ? 'success' :
                                            question.difficulty === 'Medium' ? 'info' :
                                            'danger'
                                          }
                                          size="sm"
                                        >
                                          {question.difficulty}
                                        </Badge>
                                      )}
                                      {question.keywords.length > 0 && question.keywords.slice(0, 3).map((kw, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 rounded-md bg-primary-muted text-primary text-xs font-medium border border-primary-border"
                                        >
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                    <p className="text-sm font-medium text-content leading-relaxed">
                                      {question.text}
                                    </p>
                                  </div>

                                  {/* Timer Pill */}
                                  <div className="shrink-0">
                                    <div className={`timer-pill inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-bold text-xl transition-all ${
                                      timer === 0
                                        ? 'border-danger-border bg-danger-muted text-danger'
                                        : timer < 30
                                        ? 'border-warning-border bg-warning-muted text-warning animate-pulse'
                                        : isRunning
                                        ? 'border-primary-border bg-primary-muted text-primary'
                                        : 'border-border bg-surface-elevated text-content'
                                    }`}>
                                      {formatTime(timer)}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                      <button
                                        onClick={() => toggleTimer(question.id)}
                                        className="p-2 hover:bg-surface-elevated rounded-lg transition-colors border border-border"
                                      >
                                        {isRunning ? (
                                          <Pause className="w-3.5 h-3.5 text-content-secondary" />
                                        ) : (
                                          <Play className="w-3.5 h-3.5 text-content-secondary" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => resetTimer(question.id)}
                                        className="p-2 hover:bg-surface-elevated rounded-lg transition-colors border border-border"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-content-muted" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                <textarea
                                  value={notes.notes || ''}
                                  onChange={(e) => updateQuestionNote(question.id, 'notes', e.target.value)}
                                  placeholder="Your notes / draft answer... (auto-saved)"
                                  className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-surface-elevated focus:border-primary focus:outline-none resize-none mb-4 text-sm text-content placeholder:text-content-muted transition-colors"
                                />

                                {/* Actions */}
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      checked={isPracticed}
                                      onChange={(e) => updateQuestionNote(question.id, 'practiced', e.target.checked)}
                                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <span className={`text-sm font-medium transition-colors ${isPracticed ? 'text-success' : 'text-content-secondary group-hover:text-content'}`}>
                                      {isPracticed ? '✓ Practiced' : 'Mark as practiced'}
                                    </span>
                                  </label>

                                  {/* Confidence Rating */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-content-muted font-medium">Confidence</span>
                                    {[1, 2, 3, 4, 5].map(level => (
                                      <button
                                        key={level}
                                        onClick={() => updateQuestionNote(question.id, 'confidence', level)}
                                        className="p-0.5 hover:bg-surface-elevated rounded transition-colors"
                                      >
                                        <Star
                                          className={`w-4 h-4 transition-colors ${
                                            (notes.confidence || 0) >= level
                                              ? 'text-warning fill-warning'
                                              : 'text-border-strong hover:text-warning/50'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
