import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutations } from '@spaces/sdk/storage'
import { Modal, Button, Badge } from './ui'
import { ExternalLink, Trash2, Edit, CheckCircle, DollarSign, MapPin, Star, Copy, X } from 'lucide-react'
import { PRIORITY_CONFIG, PIPELINE_STAGES } from '../constants'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OfferDetails {
  baseSalary?: string
  currency?: string
  equity?: string
  location?: string
  startDate?: string
  totalCompNotes?: string
  otherNotes?: string
}

export interface OfferQuickPicks {
  workMode?: string
  deadline?: string
  deadlineCustomDate?: string
  bonusType?: string
  bonusPct?: string
  benefits?: string[]
  timeOff?: string[]
  stipends?: string[]
  learning?: string[]
  negotiationRoom?: string
  negotiationLevers?: string[]
  cultureSignals?: string[]
}

interface JobData {
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
  statusOutcome?: string
  archived?: boolean
  offerDetails?: OfferDetails
  offerQuickPicks?: OfferQuickPicks
}

interface Job {
  recordId: string
  data: JobData
  createdAt: string
  createdBy: string
}

interface JobDetailsModalProps {
  job: Job
  onClose: () => void
}

// ─── Quick Picks data ─────────────────────────────────────────────────────────

const QP_WORK_MODES = ['Remote', 'Hybrid', 'Onsite', 'Flexible']

const QP_DEADLINES = [
  'No deadline given', '3 days', '1 week', '2 weeks', '3 weeks', '1 month', 'Custom date',
]

const QP_BONUS_TYPES = [
  'Annual target %', 'Sign-on (one-time $)', 'Performance bonus', 'No bonus',
]

const QP_BONUS_PCTS = ['5%', '10%', '15%', '20%', '25%+', 'Custom']

const QP_BENEFITS = [
  'Health Insurance', 'Dental', 'Vision', '401k Match', 'HSA', 'FSA',
  'Life Insurance', 'Disability Insurance', 'EAP',
]

const QP_TIME_OFF = [
  'PTO (standard)', 'Unlimited PTO', 'Paid Sick Leave', 'Paid Holidays',
  'Summer Fridays', 'Parental Leave (paid)', 'Bereavement Leave',
]

const QP_STIPENDS = [
  'Home Office Stipend', 'Internet Reimbursement', 'Phone Reimbursement',
  'Commute/Transit Benefit', 'Relocation Package', 'Meals/Food Stipend', 'Travel Allowance',
]

const QP_LEARNING = [
  'Learning Budget', 'Conference Budget', 'Certifications Covered',
  'Mentorship Program', 'Clear Promotion Ladder',
]

const QP_NEG_ROOM = ['None', 'Low', 'Medium', 'High']

const QP_NEG_LEVERS = [
  'Base flexible', 'Bonus flexible', 'Equity flexible', 'Level flexible',
  'Start date flexible', 'Remote flexibility possible', 'Competing offers leverage',
]

const QP_CULTURE = [
  'Strong manager signal', 'Fast growth team', 'High ownership role', 'Good WLB',
  'Brand name value', 'Mission alignment', 'Risky/uncertain team', 'Unknown team fit',
]

const QP_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'Other']

// ─── Quick Picks summary generator ───────────────────────────────────────────

const QP_SUMMARY_MARKER = 'Quick Picks Summary:'

function buildQPSummary(qp: OfferQuickPicks): string {
  const lines: string[] = [QP_SUMMARY_MARKER]
  if (qp.workMode) lines.push(`Work mode: ${qp.workMode}`)
  if (qp.deadline) {
    const dl = qp.deadline === 'Custom date' && qp.deadlineCustomDate
      ? `Custom date (${qp.deadlineCustomDate})`
      : qp.deadline
    lines.push(`Deadline: ${dl}`)
  }
  if (qp.bonusType) {
    let bonus = qp.bonusType
    if (qp.bonusType === 'Annual target %' && qp.bonusPct) {
      bonus += ` — ${qp.bonusPct}`
    }
    lines.push(`Bonus: ${bonus}`)
  }
  if (qp.benefits?.length) lines.push(`Benefits: ${qp.benefits.join(', ')}`)
  if (qp.timeOff?.length) lines.push(`Time off: ${qp.timeOff.join(', ')}`)
  if (qp.stipends?.length) lines.push(`Stipends: ${qp.stipends.join(', ')}`)
  if (qp.learning?.length) lines.push(`Learning: ${qp.learning.join(', ')}`)
  if (qp.negotiationRoom) lines.push(`Negotiation room: ${qp.negotiationRoom}`)
  if (qp.negotiationLevers?.length) lines.push(`Negotiation levers: ${qp.negotiationLevers.join(', ')}`)
  if (qp.cultureSignals?.length) lines.push(`Culture signals: ${qp.cultureSignals.join(', ')}`)
  return lines.join('\n')
}

/** Merges the QP summary block into an existing notes field without overwriting user text. */
function mergeQPSummary(existingNotes: string, newSummary: string): string {
  const markerIdx = existingNotes.indexOf(QP_SUMMARY_MARKER)
  if (markerIdx === -1) {
    // No existing summary — append
    if (!existingNotes.trim()) return newSummary
    return `${existingNotes.trimEnd()}\n\n──────────────\n${newSummary}`
  }
  // Replace the existing block (from marker to end of section)
  const before = existingNotes.slice(0, markerIdx)
  return `${before}${newSummary}`
}

/** Removes only the QP summary block from notes, leaving user text intact. */
function removeQPSummary(notes: string): string {
  const markerIdx = notes.indexOf(QP_SUMMARY_MARKER)
  if (markerIdx === -1) return notes
  // Find the divider line before the marker (if any) and remove it too
  const divider = '──────────────\n'
  const dividerIdx = notes.lastIndexOf(divider, markerIdx)
  const cutFrom = dividerIdx !== -1 && dividerIdx === markerIdx - divider.length
    ? dividerIdx
    : markerIdx
  return notes.slice(0, cutFrom).trimEnd()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChipsProps {
  options: string[]
  selected: string[]
  onToggle: (val: string) => void
}
function Chips({ options, selected, onToggle }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isSelected = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              isSelected
                ? 'bg-primary-muted border-primary text-primary'
                : 'bg-surface-elevated border-border text-content-secondary hover:border-primary/40 hover:text-content'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

interface SegmentProps {
  options: string[]
  value: string
  onChange: (val: string) => void
}
function Segment({ options, value, onChange }: SegmentProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            value === opt
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface-elevated border-border text-content-secondary hover:border-primary/40 hover:text-content'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

const EMPTY_QP: OfferQuickPicks = {
  workMode: '',
  deadline: '',
  deadlineCustomDate: '',
  bonusType: '',
  bonusPct: '',
  benefits: [],
  timeOff: [],
  stipends: [],
  learning: [],
  negotiationRoom: '',
  negotiationLevers: [],
  cultureSignals: [],
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  const { put, remove } = useMutations('jobs')
  const { create: logActivity } = useMutations('activity_log')

  // Always read from live query so we see the latest saved data
  const { records: allJobs } = useQuery('jobs')
  const liveJob = (allJobs as Job[]).find(j => j.recordId === job.recordId)
  const liveData = liveJob?.data ?? job.data

  // ── Notes state ────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState(liveData.notes || '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearQPConfirm, setShowClearQPConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Offer Details state (manual inputs) ───────────────────────────────
  const [isEditingOffer, setIsEditingOffer] = useState(false)
  const [offerSaved, setOfferSaved] = useState(false)
  const [offerForm, setOfferForm] = useState<OfferDetails & { currency?: string }>({
    baseSalary: '',
    currency: 'USD',
    equity: '',
    location: '',
    startDate: '',
    totalCompNotes: '',
    otherNotes: '',
  })

  // ── Quick Picks state ─────────────────────────────────────────────────
  const [qp, setQP] = useState<OfferQuickPicks>(EMPTY_QP)

  const isOfferStage = liveData.pipelineStage === PIPELINE_STAGES.OFFER

  // Sync notes
  useEffect(() => {
    if (!isEditing) setNotes(liveData.notes || '')
  }, [liveData.notes, isEditing])

  // Sync offer form from live data
  useEffect(() => {
    if (!isEditingOffer) {
      setOfferForm({
        baseSalary: liveData.offerDetails?.baseSalary || '',
        currency: (liveData.offerDetails as any)?.currency || 'USD',
        equity: liveData.offerDetails?.equity || '',
        location: liveData.offerDetails?.location || liveData.location || '',
        startDate: liveData.offerDetails?.startDate || '',
        totalCompNotes: liveData.offerDetails?.totalCompNotes || '',
        otherNotes: liveData.offerDetails?.otherNotes || '',
      })
    }
  }, [liveData.offerDetails, liveData.location, isEditingOffer])

  // Sync QP from live data
  useEffect(() => {
    const stored = liveData.offerQuickPicks as OfferQuickPicks | undefined
    setQP({
      ...EMPTY_QP,
      ...(stored ?? {}),
      benefits: stored?.benefits ?? [],
      timeOff: stored?.timeOff ?? [],
      stipends: stored?.stipends ?? [],
      learning: stored?.learning ?? [],
      negotiationLevers: stored?.negotiationLevers ?? [],
      cultureSignals: stored?.cultureSignals ?? [],
    })
  }, [liveData.offerQuickPicks])

  // ── Helpers ────────────────────────────────────────────────────────────

  const toggleMulti = useCallback((field: keyof OfferQuickPicks, val: string) => {
    setQP(prev => {
      const arr = (prev[field] as string[]) ?? []
      const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
      return { ...prev, [field]: next }
    })
  }, [])

  /** Persist QP + inject summary into otherNotes */
  const saveQP = useCallback((nextQP: OfferQuickPicks) => {
    const summary = buildQPSummary(nextQP)
    const currentNotes = liveData.offerDetails?.otherNotes || ''
    const mergedNotes = mergeQPSummary(currentNotes, summary)
    const updatedOfferDetails: OfferDetails = {
      ...(liveData.offerDetails ?? {}),
      otherNotes: mergedNotes,
    }
    put(job.recordId, {
      ...liveData,
      offerQuickPicks: nextQP,
      offerDetails: updatedOfferDetails,
    })
  }, [liveData, job.recordId, put])

  /** Auto-save QP whenever selections change (debounce-free for simplicity) */
  const handleQPChange = useCallback((updater: (prev: OfferQuickPicks) => OfferQuickPicks) => {
    setQP(prev => {
      const next = updater(prev)
      saveQP(next)
      return next
    })
  }, [saveQP])

  const handleSaveNotes = () => {
    put(job.recordId, { ...liveData, notes })
    logActivity({ actionType: 'edit_job', jobId: job.recordId, details: 'Updated notes' })
    setIsEditing(false)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  const handleSaveOffer = () => {
    const cleanOffer: OfferDetails & { currency?: string } = {}
    if (offerForm.baseSalary) cleanOffer.baseSalary = offerForm.baseSalary
    if (offerForm.currency) cleanOffer.currency = offerForm.currency
    if (offerForm.equity) cleanOffer.equity = offerForm.equity
    if (offerForm.location) cleanOffer.location = offerForm.location
    if (offerForm.startDate) cleanOffer.startDate = offerForm.startDate
    if (offerForm.totalCompNotes) cleanOffer.totalCompNotes = offerForm.totalCompNotes
    // Preserve existing otherNotes (QP summary lives there)
    if (liveData.offerDetails?.otherNotes) cleanOffer.otherNotes = liveData.offerDetails.otherNotes
    if (offerForm.otherNotes && !liveData.offerDetails?.otherNotes) cleanOffer.otherNotes = offerForm.otherNotes

    put(job.recordId, { ...liveData, offerDetails: cleanOffer })
    logActivity({ actionType: 'edit_job', jobId: job.recordId, details: 'Updated offer details' })
    setIsEditingOffer(false)
    setOfferSaved(true)
    setTimeout(() => setOfferSaved(false), 2000)
  }

  const handleClearQP = () => setShowClearQPConfirm(true)

  const confirmClearQP = () => {
    const emptyQP: OfferQuickPicks = { ...EMPTY_QP, benefits: [], timeOff: [], stipends: [], learning: [], negotiationLevers: [], cultureSignals: [] }
    setQP(emptyQP)
    const currentOtherNotes = liveData.offerDetails?.otherNotes || ''
    const cleaned = removeQPSummary(currentOtherNotes)
    put(job.recordId, {
      ...liveData,
      offerQuickPicks: emptyQP,
      offerDetails: { ...(liveData.offerDetails ?? {}), otherNotes: cleaned },
    })
    setShowClearQPConfirm(false)
  }

  const handleCopySummary = () => {
    const summary = buildQPSummary(qp)
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasAnyQP = !!(
    qp.workMode || qp.deadline || qp.bonusType || qp.negotiationRoom ||
    qp.benefits?.length || qp.timeOff?.length || qp.stipends?.length ||
    qp.learning?.length || qp.negotiationLevers?.length || qp.cultureSignals?.length
  )

  const handleDelete = () => setShowDeleteConfirm(true)

  const confirmDelete = () => {
    remove(job.recordId)
    logActivity({ actionType: 'delete_job', jobId: job.recordId, details: `Deleted ${liveData.company} - ${liveData.role}` })
    onClose()
  }

  const handleOpenLink = () => {
    if (liveData.jobLink) {
      window.open(liveData.jobLink.startsWith('http') ? liveData.jobLink : `https://${liveData.jobLink}`, '_blank', 'noopener,noreferrer')
    }
  }

  const hasOfferDetails = !!(
    liveData.offerDetails?.baseSalary || liveData.offerDetails?.equity ||
    liveData.offerDetails?.location || liveData.offerDetails?.startDate
  )

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <Modal open={true} onClose={onClose} size="xl">
        <Modal.Header>
          <div className="flex items-start justify-between w-full">
            <div className="flex-1">
              <Modal.Title>{liveData.role}</Modal.Title>
              <p className="text-content-secondary mt-1">{liveData.company}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOfferStage && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  <Star className="w-3 h-3" />
                  Offer
                </span>
              )}
              <Badge color={PRIORITY_CONFIG[liveData.priority as keyof typeof PRIORITY_CONFIG]?.color || 'muted'}>
                {liveData.priority}
              </Badge>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body>
          <div className="space-y-6">
            {/* ── Basic Info ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Pipeline Stage</label>
                <p className="mt-1 text-content font-medium">{liveData.pipelineStage}</p>
              </div>
              {liveData.location && (
                <div>
                  <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Location</label>
                  <p className="mt-1 text-content font-medium">{liveData.location}</p>
                </div>
              )}
            </div>

            {liveData.nextActionType && (
              <div>
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Next Action</label>
                <p className="mt-1 text-content font-medium">
                  {liveData.nextActionType}{liveData.nextActionDate && ` • ${liveData.nextActionDate}`}
                </p>
              </div>
            )}

            {liveData.interviewDateTime && (
              <div>
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Interview</label>
                <p className="mt-1 text-content font-medium">
                  {liveData.interviewType} • {new Date(liveData.interviewDateTime).toLocaleString()}
                </p>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                OFFER DETAILS + QUICK PICKS (only in Offer stage)
            ══════════════════════════════════════════════════════════════ */}
            {isOfferStage && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">Offer Details</span>
                    {offerSaved && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium ml-2">
                        <CheckCircle className="w-3.5 h-3.5" />Saved
                      </span>
                    )}
                  </div>
                  {!isEditingOffer && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingOffer(true)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {hasOfferDetails ? 'Edit' : 'Add offer details'}
                    </Button>
                  )}
                </div>

                {/* ── Manual inputs (Base Salary + Location) ── */}
                {isEditingOffer ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Base Salary *</label>
                        <input
                          type="text"
                          value={offerForm.baseSalary || ''}
                          onChange={e => setOfferForm(p => ({ ...p, baseSalary: e.target.value }))}
                          placeholder="e.g. 150,000"
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Currency</label>
                        <select
                          value={offerForm.currency || 'USD'}
                          onChange={e => setOfferForm(p => ({ ...p, currency: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                        >
                          {QP_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Location (offer) *</label>
                        <input
                          type="text"
                          value={offerForm.location || ''}
                          onChange={e => setOfferForm(p => ({ ...p, location: e.target.value }))}
                          placeholder="e.g. New York, NY"
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Equity / RSU (optional)</label>
                        <input
                          type="text"
                          value={offerForm.equity || ''}
                          onChange={e => setOfferForm(p => ({ ...p, equity: e.target.value }))}
                          placeholder="e.g. $200K RSU / 4yr"
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Start Date (optional)</label>
                        <div className="date-input-wrapper">
                          <input
                            type="date"
                            value={offerForm.startDate || ''}
                            onChange={e => setOfferForm(p => ({ ...p, startDate: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-amber-700 mb-1 block">Total Comp note (optional)</label>
                        <input
                          type="text"
                          value={offerForm.totalCompNotes || ''}
                          onChange={e => setOfferForm(p => ({ ...p, totalCompNotes: e.target.value }))}
                          placeholder="~$190K total"
                          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveOffer}>Save Details</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingOffer(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : hasOfferDetails ? (
                  <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {liveData.offerDetails?.baseSalary && (
                      <div>
                        <span className="text-amber-600 font-semibold">Base: </span>
                        <span className="text-amber-900">{(liveData.offerDetails as any).currency || ''} {liveData.offerDetails.baseSalary}</span>
                      </div>
                    )}
                    {liveData.offerDetails?.equity && (
                      <div><span className="text-amber-600 font-semibold">Equity: </span><span className="text-amber-900">{liveData.offerDetails.equity}</span></div>
                    )}
                    {liveData.offerDetails?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-900">{liveData.offerDetails.location}</span>
                      </div>
                    )}
                    {liveData.offerDetails?.startDate && (
                      <div><span className="text-amber-600 font-semibold">Start: </span><span className="text-amber-900">{liveData.offerDetails.startDate}</span></div>
                    )}
                    {liveData.offerDetails?.totalCompNotes && (
                      <div className="col-span-2"><span className="text-amber-600 font-semibold">Total Comp: </span><span className="text-amber-900">{liveData.offerDetails.totalCompNotes}</span></div>
                    )}
                  </div>
                ) : (
                  <p className="px-5 py-4 text-sm text-amber-600 italic">
                    No offer details yet. Click &quot;Add offer details&quot; to capture Base Salary, Location, and more.
                  </p>
                )}

                {/* ══════════════ QUICK PICKS ══════════════ */}
                <div className="border-t border-amber-200 px-5 py-5 space-y-5">
                  {/* Quick Picks header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Quick Picks</span>
                    <div className="flex items-center gap-2">
                      {hasAnyQP && (
                        <button
                          onClick={handleCopySummary}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                          title="Copy summary to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copied ? 'Copied!' : 'Copy summary'}
                        </button>
                      )}
                      {hasAnyQP && (
                        <button
                          onClick={handleClearQP}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                          title="Clear all quick picks"
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* A) Work Mode */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Work Mode</label>
                    <Segment
                      options={QP_WORK_MODES}
                      value={qp.workMode || ''}
                      onChange={val => handleQPChange(p => ({ ...p, workMode: val }))}
                    />
                  </div>

                  {/* B) Offer Deadline */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Offer Deadline</label>
                    <Segment
                      options={QP_DEADLINES}
                      value={qp.deadline || ''}
                      onChange={val => handleQPChange(p => ({ ...p, deadline: val }))}
                    />
                    {qp.deadline === 'Custom date' && (
                      <div className="date-input-wrapper mt-2">
                        <input
                          type="date"
                          value={qp.deadlineCustomDate || ''}
                          onChange={e => handleQPChange(p => ({ ...p, deadlineCustomDate: e.target.value }))}
                          className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content"
                        />
                      </div>
                    )}
                  </div>

                  {/* C) Bonus Type */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Bonus Type</label>
                    <Segment
                      options={QP_BONUS_TYPES}
                      value={qp.bonusType || ''}
                      onChange={val => handleQPChange(p => ({ ...p, bonusType: val, bonusPct: val === 'Annual target %' ? p.bonusPct : '' }))}
                    />
                    {qp.bonusType === 'Annual target %' && (
                      <div className="mt-2">
                        <label className="text-xs text-amber-600 mb-1.5 block">Bonus %</label>
                        <Segment
                          options={QP_BONUS_PCTS}
                          value={qp.bonusPct || ''}
                          onChange={val => handleQPChange(p => ({ ...p, bonusPct: val }))}
                        />
                        {qp.bonusPct === 'Custom' && (
                          <input
                            type="text"
                            placeholder="e.g. 22%"
                            value={qp.bonusPct === 'Custom' ? '' : qp.bonusPct || ''}
                            onChange={e => handleQPChange(p => ({ ...p, bonusPct: e.target.value }))}
                            className="mt-2 px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:border-amber-400 text-content w-32"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* D) Benefits */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Benefits</label>
                    <Chips
                      options={QP_BENEFITS}
                      selected={qp.benefits || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.benefits ?? []
                        return { ...p, benefits: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* E) Time Off */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Time Off</label>
                    <Chips
                      options={QP_TIME_OFF}
                      selected={qp.timeOff || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.timeOff ?? []
                        return { ...p, timeOff: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* F) Stipends & Allowances */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Stipends &amp; Allowances</label>
                    <Chips
                      options={QP_STIPENDS}
                      selected={qp.stipends || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.stipends ?? []
                        return { ...p, stipends: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* G) Learning & Growth */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Learning &amp; Growth</label>
                    <Chips
                      options={QP_LEARNING}
                      selected={qp.learning || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.learning ?? []
                        return { ...p, learning: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* H) Negotiation Room */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Negotiation Room</label>
                    <Segment
                      options={QP_NEG_ROOM}
                      value={qp.negotiationRoom || ''}
                      onChange={val => handleQPChange(p => ({ ...p, negotiationRoom: val }))}
                    />
                  </div>

                  {/* I) Negotiation Levers */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Negotiation Levers</label>
                    <Chips
                      options={QP_NEG_LEVERS}
                      selected={qp.negotiationLevers || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.negotiationLevers ?? []
                        return { ...p, negotiationLevers: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* J) Culture Signals */}
                  <div>
                    <label className="text-xs font-semibold text-amber-700 mb-2 block">Culture / Team Signals <span className="font-normal text-amber-600">(optional)</span></label>
                    <Chips
                      options={QP_CULTURE}
                      selected={qp.cultureSignals || []}
                      onToggle={val => handleQPChange(p => {
                        const arr = p.cultureSignals ?? []
                        return { ...p, cultureSignals: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
                      })}
                    />
                  </div>

                  {/* Live summary preview */}
                  {hasAnyQP && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-100 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Summary (auto-saved to Other Notes)</p>
                      <pre className="text-xs text-amber-800 whitespace-pre-wrap font-mono leading-relaxed">
                        {buildQPSummary(qp)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Notes Section ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Notes</label>
                <div className="flex items-center gap-2">
                  {noteSaved && (
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />Saved
                    </span>
                  )}
                  {!isEditing && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {liveData.notes ? 'Edit' : 'Add notes'}
                    </Button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none"
                    placeholder="Add notes about this job..."
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setNotes(liveData.notes || ''); setIsEditing(false) }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  {liveData.notes ? (
                    <div className="p-3 rounded-lg bg-surface-elevated border border-border text-sm text-content whitespace-pre-wrap">{liveData.notes}</div>
                  ) : (
                    <span className="text-content-muted text-sm italic">No notes yet. Click &quot;Add notes&quot; to add one.</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Keywords ── */}
            {liveData.keywordExtract && liveData.keywordExtract.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Keywords</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {liveData.keywordExtract.map((kw, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-primary-muted text-primary text-sm font-medium">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Job Description ── */}
            {liveData.jdText && (
              <div>
                <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">Job Description</label>
                <div className="mt-2 p-4 rounded-xl bg-surface-elevated border border-border max-h-64 overflow-y-auto">
                  <p className="text-sm text-content whitespace-pre-wrap">{liveData.jdText}</p>
                </div>
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className="flex items-center justify-between w-full">
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
            <div className="flex gap-2">
              {liveData.jobLink && (
                <Button variant="secondary" onClick={handleOpenLink}>
                  <ExternalLink className="w-4 h-4 mr-2" />Open Link
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Modal open={true} onClose={() => setShowDeleteConfirm(false)} size="sm">
          <Modal.Header onClose={() => setShowDeleteConfirm(false)}>
            <Modal.Title>Delete this job?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-content-secondary text-sm">
              This will permanently remove <span className="font-semibold text-content">{liveData.role}</span> at{' '}
              <span className="font-semibold text-content">{liveData.company}</span>. This cannot be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Clear Quick Picks Confirmation */}
      {showClearQPConfirm && (
        <Modal open={true} onClose={() => setShowClearQPConfirm(false)} size="sm">
          <Modal.Header onClose={() => setShowClearQPConfirm(false)}>
            <Modal.Title>Clear Quick Picks?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-content-secondary text-sm">
              This will remove all Quick Picks selections and the auto-generated summary from Other Notes.
              Your manually written notes will not be affected.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setShowClearQPConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmClearQP}>
              <X className="w-4 h-4 mr-2" />Clear Quick Picks
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  )
}
