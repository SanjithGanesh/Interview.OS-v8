import React, { useState } from 'react'
import { Modal, Button } from './ui'
import { Mail, Linkedin, Copy, Check, Sparkles } from 'lucide-react'

interface Job {
  recordId: string
  data: {
    company: string
    role: string
    followUpRecruiterName?: string
    followUpContactType?: string
    followUpContact?: string
    followUpStatus?: string
    followUpDate?: string
    followUpNotes?: string
    followUpCustomLine?: string
  }
}

interface FollowUpModalProps {
  job: Job
  onClose: () => void
  onUpdate: (jobId: string, field: string, value: any) => void
}

export default function FollowUpModal({ job, onClose, onUpdate }: FollowUpModalProps) {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const getEmailTemplate = () => {
    const customLine = job.data.followUpCustomLine || `I'm excited about the ${job.data.role} position at ${job.data.company}`
    return `Subject: Following up on ${job.data.role} Application

Hi ${job.data.followUpRecruiterName || 'there'},

${customLine}.

I wanted to follow up on my application and see if there are any updates on the hiring process. I'm very interested in this opportunity and would love to learn more about next steps.

Thank you for your time and consideration.

Best regards`
  }

  const getLinkedInTemplate = () => {
    const customLine = job.data.followUpCustomLine || `I'm excited about the ${job.data.role} role`
    return `Hi ${job.data.followUpRecruiterName || 'there'},

${customLine} at ${job.data.company}. I recently applied and wanted to connect to learn more about the team and opportunity.

Would love to chat if you have time!

Best`
  }

  const handleCopyTemplate = (template: string, type: string) => {
    navigator.clipboard.writeText(template)
    setCopiedTemplate(type)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <Modal.Header onClose={onClose}>
        <Modal.Title>Manage Follow-up</Modal.Title>
        <Modal.Description>
          {job.data.company} — {job.data.role}
        </Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-5">
          {/* Recruiter/Referral Info */}
          <div>
            <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Recruiter / Referral Name</label>
            <input
              type="text"
              value={job.data.followUpRecruiterName || ''}
              onChange={(e) => onUpdate(job.recordId, 'followUpRecruiterName', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              placeholder="e.g., Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Contact Type</label>
              <select
                value={job.data.followUpContactType || 'Email'}
                onChange={(e) => onUpdate(job.recordId, 'followUpContactType', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              >
                <option value="Email">Email</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Phone">Phone</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Follow-up Status</label>
              <select
                value={job.data.followUpStatus || 'Not Sent'}
                onChange={(e) => onUpdate(job.recordId, 'followUpStatus', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              >
                <option value="Not Sent">Not Sent</option>
                <option value="Sent">Sent</option>
                <option value="Replied">Replied</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Contact (Email / URL / Phone)</label>
            <input
              type="text"
              value={job.data.followUpContact || ''}
              onChange={(e) => onUpdate(job.recordId, 'followUpContact', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              placeholder="e.g., jane@company.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Follow-up Date</label>
            <div className="date-input-wrapper">
              <input
                type="date"
                value={job.data.followUpDate || ''}
                onChange={(e) => onUpdate(job.recordId, 'followUpDate', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Custom Opening Line <span className="text-content-muted font-normal normal-case tracking-normal">(used in templates below)</span></label>
            <input
              type="text"
              value={job.data.followUpCustomLine || ''}
              onChange={(e) => onUpdate(job.recordId, 'followUpCustomLine', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none transition-colors text-sm"
              placeholder="e.g., I'm excited about this role…"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">Notes</label>
            <textarea
              value={job.data.followUpNotes || ''}
              onChange={(e) => onUpdate(job.recordId, 'followUpNotes', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none transition-colors text-sm"
              rows={3}
              placeholder="Any additional notes…"
            />
          </div>

          {/* ── Message Templates ────────────────────────────────────────────── */}
          <div className="border-t border-border pt-5">
            {/* Templates section header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-content leading-none">Message Templates</h4>
                <p className="text-xs text-content-muted mt-0.5">Ready-to-use outreach — personalized from your inputs above</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Email Template */}
              <div className="template-card rounded-xl border border-border bg-surface-elevated overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-card">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-content">Email Template</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">Email</span>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(getEmailTemplate(), 'email')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      copiedTemplate === 'email'
                        ? 'bg-success-muted text-success border border-success-border'
                        : 'bg-surface-overlay text-content-secondary hover:bg-primary-muted hover:text-primary hover:border-primary-border border border-border active:scale-95'
                    }`}
                  >
                    {copiedTemplate === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {/* Template body */}
                <div className="px-4 py-3">
                  <pre className="text-xs text-content-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {getEmailTemplate()}
                  </pre>
                </div>
              </div>

              {/* LinkedIn Template */}
              <div className="template-card rounded-xl border border-border bg-surface-elevated overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-card">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Linkedin className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-content">LinkedIn Template</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-muted text-primary text-xs font-semibold">LinkedIn</span>
                  </div>
                  <button
                    onClick={() => handleCopyTemplate(getLinkedInTemplate(), 'linkedin')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      copiedTemplate === 'linkedin'
                        ? 'bg-success-muted text-success border border-success-border'
                        : 'bg-surface-overlay text-content-secondary hover:bg-primary-muted hover:text-primary hover:border-primary-border border border-border active:scale-95'
                    }`}
                  >
                    {copiedTemplate === 'linkedin' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {/* Template body */}
                <div className="px-4 py-3">
                  <pre className="text-xs text-content-secondary whitespace-pre-wrap font-sans leading-relaxed">
                    {getLinkedInTemplate()}
                  </pre>
                </div>
              </div>

              {/* Helper hint */}
              <p className="text-xs text-content-muted text-center pt-1">
                Edit the <span className="font-semibold text-content-secondary">Custom Opening Line</span> above to personalize these templates.
              </p>
            </div>
          </div>
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
