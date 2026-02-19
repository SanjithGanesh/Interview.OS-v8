import React, { useState } from 'react'
import { Modal, Button } from './ui'
import { PIPELINE_STAGES } from '../constants'

interface Job {
  recordId: string
  data: {
    company: string
    role: string
    interviewRound?: number
    interviewQuestionsAsked?: string
    interviewPerformance?: string
    interviewImprovements?: string
  }
}

interface InterviewModalProps {
  job: Job
  onClose: () => void
  onUpdate: (jobId: string, field: string, value: any) => void
  onNextRound: (jobId: string, nextDateTime: string) => Promise<void>
  onMoveToStage: (jobId: string, stage: string) => Promise<void>
}

export default function InterviewModal({ 
  job, 
  onClose, 
  onUpdate, 
  onNextRound, 
  onMoveToStage 
}: InterviewModalProps) {
  const [step, setStep] = useState<'gate' | 'reflection' | 'next-round' | 'schedule' | 'outcome'>('gate')
  const [nextDateTime, setNextDateTime] = useState('')

  const handleCompletedNo = () => {
    onClose()
  }

  const handleCompletedYes = () => {
    setStep('reflection')
  }

  const handleContinueToNextRound = () => {
    setStep('next-round')
  }

  const handleScheduleRound = () => {
    setStep('schedule')
  }

  const handleNoNextRound = () => {
    setStep('outcome')
  }

  const handleScheduleSubmit = async () => {
    if (nextDateTime) {
      await onNextRound(job.recordId, nextDateTime)
      onClose()
    }
  }

  const handleMoveToOffer = async () => {
    await onMoveToStage(job.recordId, PIPELINE_STAGES.OFFER)
    onClose()
  }

  const handleMoveToClosed = async () => {
    await onMoveToStage(job.recordId, PIPELINE_STAGES.CLOSED)
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        <Modal.Title>Interview Management</Modal.Title>
        <Modal.Description>
          {job.data.company} — {job.data.role}
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        {step === 'gate' && (
          <div className="space-y-6 text-center py-6">
            <div className="text-lg font-semibold text-content">
              Has this interview been completed?
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={handleCompletedYes} className="min-w-[120px]">
                Yes
              </Button>
              <Button variant="ghost" onClick={handleCompletedNo} className="min-w-[120px]">
                No
              </Button>
            </div>
          </div>
        )}

        {step === 'reflection' && (
          <div className="space-y-5">
            <div>
              <div className="text-center mb-6">
                <p className="text-sm text-content-secondary">
                  Great! Let's capture some notes about how it went.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-content mb-2 block">
                Questions Asked
              </label>
              <textarea
                value={job.data.interviewQuestionsAsked || ''}
                onChange={(e) => onUpdate(job.recordId, 'interviewQuestionsAsked', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none transition-colors"
                rows={3}
                placeholder="List the questions you were asked…"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-content mb-2 block">
                How did I do?
              </label>
              <textarea
                value={job.data.interviewPerformance || ''}
                onChange={(e) => onUpdate(job.recordId, 'interviewPerformance', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none transition-colors"
                rows={3}
                placeholder="Your self-assessment…"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-content mb-2 block">
                What I didn&apos;t know / need to improve
              </label>
              <textarea
                value={job.data.interviewImprovements || ''}
                onChange={(e) => onUpdate(job.recordId, 'interviewImprovements', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none transition-colors"
                rows={3}
                placeholder="Areas for improvement…"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Button onClick={handleContinueToNextRound} className="w-full">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'next-round' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-content mb-2">
                Is there another round?
              </div>
              <p className="text-sm text-content-secondary">
                Let us know if you'll be moving forward
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={handleScheduleRound} className="min-w-[160px]">
                Yes, schedule next round
              </Button>
              <Button variant="ghost" onClick={handleNoNextRound} className="min-w-[160px]">
                No, move to outcome
              </Button>
            </div>
          </div>
        )}

        {step === 'schedule' && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-content mb-2 block">
                Next Interview Date &amp; Time
              </label>
              <div className="date-input-wrapper">
                <input
                  type="datetime-local"
                  value={nextDateTime}
                  onChange={(e) => setNextDateTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleScheduleSubmit} 
                disabled={!nextDateTime}
                className="flex-1"
              >
                Schedule Round {(job.data.interviewRound || 1) + 1}
              </Button>
              <Button variant="ghost" onClick={() => setStep('next-round')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'outcome' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-content mb-2">
                What&apos;s the outcome?
              </div>
              <p className="text-sm text-content-secondary">
                Select the final status for this application
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button onClick={handleMoveToOffer} className="min-w-[120px]">
                Offer
              </Button>
              <Button variant="ghost" onClick={handleMoveToClosed} className="min-w-[120px]">
                Closed
              </Button>
            </div>
            <div className="text-center">
              <Button variant="ghost" onClick={() => setStep('next-round')} size="sm">
                Back
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
