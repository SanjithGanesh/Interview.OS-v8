import React, { useState } from 'react'
import { useMutations } from '@spaces/sdk/storage'
import { Modal, Button } from './ui'
import {
  PRIORITY,
  PIPELINE_STAGES,
  PIPELINE_STAGES_ORDER,
} from '../constants'
import { useAnalyticsTracker } from '../hooks'

interface AddJobModalProps {
  onClose: () => void
}

export default function AddJobModal({ onClose }: AddJobModalProps) {
  const { create: createJob } = useMutations('jobs')
  const { create: logActivity } = useMutations('activity_log')
  const { track } = useAnalyticsTracker()

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    jobLink: '',
    location: '',
    priority: PRIORITY.MEDIUM,
    pipelineStage: PIPELINE_STAGES.WISHLIST,
    nextActionDate: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const jobId = await createJob({
      ...formData,
      archived: false,
      keywordExtract: [],
    })

    await logActivity({
      actionType: 'add_job',
      jobId,
      details: `Added ${formData.company} - ${formData.role}`,
    })

    // Analytics: track job creation (fire-and-forget, fails silently)
    track('job_created')

    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-120px)]">
        <Modal.Header onClose={onClose}>
          <Modal.Title>Add New Job</Modal.Title>
        </Modal.Header>

        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ maxHeight: 'calc(100vh - 280px)', WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-content mb-2">
                  Company <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-content mb-2">
                  Role <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                  placeholder="e.g., Senior Product Designer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-content mb-2">Job Link</label>
              <input
                type="url"
                value={formData.jobLink}
                onChange={(e) => setFormData({ ...formData, jobLink: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-content mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                  placeholder="e.g., Remote, NYC"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-content mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                >
                  {Object.values(PRIORITY).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-content mb-2">
                Pipeline Stage
              </label>
              <select
                value={formData.pipelineStage}
                onChange={(e) => setFormData({ ...formData, pipelineStage: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
              >
                {PIPELINE_STAGES_ORDER.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-content mb-2">
                Reminder Date
              </label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={formData.nextActionDate}
                  onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-content mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:outline-none resize-none"
                placeholder="Recruiter name, referral, quick reminders…"
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-elevated">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Job</Button>
        </div>
      </form>
    </Modal>
  )
}
