import React, { useState, useEffect } from 'react'
import { useUser } from '@spaces/sdk/storage'
import { mcapi } from '@spaces/sdk'
import { Button, Card, Modal } from '../components/ui'
import { Send, Star, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'

// Question definitions
interface Question {
  id: string
  type: 'star' | 'likert' | 'single' | 'multi' | 'nps' | 'text'
  category: string
  text: string
  options?: string[]
  maxSelections?: number
  required?: boolean
}

const QUESTIONS: Question[] = [
  // Overall (2)
  {
    id: 'q1',
    type: 'star',
    category: 'Overall',
    text: 'Overall experience with Interview.OS',
    required: true,
  },
  {
    id: 'q2',
    type: 'nps',
    category: 'Overall',
    text: 'How likely are you to recommend Interview.OS to a friend?',
    required: true,
  },
  
  // Today page (5)
  {
    id: 'q3',
    type: 'likert',
    category: 'Today Page',
    text: 'Today page helped me clearly understand what to do next',
    required: true,
  },
  {
    id: 'q4',
    type: 'star',
    category: 'Today Page',
    text: 'Overdue + Upcoming sections felt accurate and useful',
    required: true,
  },
  {
    id: 'q5',
    type: 'likert',
    category: 'Today Page',
    text: 'Follow-up workflow for Applied jobs is practical',
    required: true,
  },
  {
    id: 'q6',
    type: 'likert',
    category: 'Today Page',
    text: 'Interview workflow (prep link + completed flow + offer/closed) feels complete',
    required: true,
  },
  {
    id: 'q7',
    type: 'star',
    category: 'Today Page',
    text: 'Today page layout and readability',
    required: true,
  },
  
  // Pipeline page (5)
  {
    id: 'q8',
    type: 'likert',
    category: 'Pipeline Page',
    text: 'Pipeline stages are sufficient and not confusing',
    required: true,
  },
  {
    id: 'q9',
    type: 'star',
    category: 'Pipeline Page',
    text: 'Moving jobs across stages is smooth and intuitive',
    required: true,
  },
  {
    id: 'q10',
    type: 'single',
    category: 'Pipeline Page',
    text: 'Confirmation popup before moving stages is',
    options: ['Helpful', 'Neutral', 'Annoying'],
    required: true,
  },
  {
    id: 'q11',
    type: 'star',
    category: 'Pipeline Page',
    text: 'Scheduling interview dates from pipeline is easy',
    required: true,
  },
  {
    id: 'q12',
    type: 'single',
    category: 'Pipeline Page',
    text: 'What is your biggest friction in Pipeline?',
    options: ['Too many clicks', 'Hard to scan', 'Buttons unclear', 'Cards too plain', 'I got lost', 'None'],
    required: true,
  },
  
  // Prep page (6)
  {
    id: 'q13',
    type: 'star',
    category: 'Prep Page',
    text: 'JD keyword extraction captured the right technical terms',
    required: true,
  },
  {
    id: 'q14',
    type: 'likert',
    category: 'Prep Page',
    text: 'Question sets felt relevant to the JD and role',
    required: true,
  },
  {
    id: 'q15',
    type: 'likert',
    category: 'Prep Page',
    text: 'Per-question timer + notes improved my practice',
    required: true,
  },
  {
    id: 'q16',
    type: 'single',
    category: 'Prep Page',
    text: 'The number of questions generated is',
    options: ['Too few', 'Just right', 'Too many'],
    required: true,
  },
  {
    id: 'q17',
    type: 'likert',
    category: 'Prep Page',
    text: 'Uploading resume + cover letter per job is useful',
    required: true,
  },
  {
    id: 'q18',
    type: 'single',
    category: 'Prep Page',
    text: 'Which prep category helped most?',
    options: ['Technical', 'Role deep-dive', 'Behavioral', 'Company fit', 'Resume alignment'],
    required: true,
  },
  
  // Growth (1)
  {
    id: 'q19',
    type: 'multi',
    category: 'Growth & Product Direction',
    text: 'What should we build next? (pick up to 3)',
    options: [
      'Resume-JD alignment suggestions',
      'Auto-generated recruiter follow-up emails',
      'Interview calendar sync',
      'Mock interview mode',
      'Analytics / streaks',
      'Autofill from job link',
      'Export job tracker (CSV)',
      'Other',
    ],
    maxSelections: 3,
    required: true,
  },
  
  // New suggestion-focused questions (5)
  {
    id: 'q21',
    type: 'single',
    category: 'Automation & Scaling',
    text: 'Which part of Interview.OS would you want automated the most?',
    options: [
      'Auto-follow-ups to recruiters',
      'Auto-extract job details from link',
      'Auto-generate interview questions from JD',
      'Auto-schedule interview reminders',
      'Auto-track application status',
      'Other',
    ],
    required: true,
  },
  {
    id: 'q22',
    type: 'single',
    category: 'Automation & Scaling',
    text: 'If Interview.OS had one "power feature", what should it be?',
    options: [
      'Resume + JD alignment suggestions',
      'Mock interview mode with scoring',
      'Auto email/LinkedIn message generator',
      'Interview question packs by company/role',
      'Analytics + streaks + weekly plan',
      'Other',
    ],
    required: true,
  },
  {
    id: 'q23',
    type: 'single',
    category: 'Automation & Scaling',
    text: 'How would you prefer to use Interview.OS?',
    options: [
      'Daily command center (every day)',
      'Only when applying',
      'Only before interviews',
      'Weekly review tool',
      'Other',
    ],
    required: true,
  },
  {
    id: 'q24',
    type: 'multi',
    category: 'Automation & Scaling',
    text: 'What would make you share Interview.OS with a friend? (pick up to 3)',
    options: [
      'Looks premium and simple',
      'Saves real time (automation)',
      'Better prep questions',
      'Better follow-up workflow',
      'Works great on mobile',
      'Free / affordable',
      'Other',
    ],
    maxSelections: 3,
    required: true,
  },
  {
    id: 'q25',
    type: 'multi',
    category: 'Automation & Scaling',
    text: 'Which integrations would you want most? (pick up to 3)',
    options: [
      'Google Calendar',
      'Gmail',
      'LinkedIn',
      'Notion',
      'Google Drive',
      'CSV export',
      'Other',
    ],
    maxSelections: 3,
    required: true,
  },
  
  // Open-ended (1)
  {
    id: 'q26',
    type: 'text',
    category: 'Final Thoughts',
    text: 'Anything else you would like to add?',
    required: false,
  },
]

const LIKERT_OPTIONS = [
  'Strongly disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly agree',
]

const NPS_LABELS = ['Not at all likely', 'Extremely likely']

// Local storage key for persistence
const STORAGE_KEY = 'interview-os-feedback-draft'

export default function FeedbackPage() {
  const { user } = useUser()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    // Load saved draft
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return {}
        }
      }
    }
    return {}
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showMissingQuestions, setShowMissingQuestions] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Autosave to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
    }
  }, [answers])

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    // Clear error messages when answering
    if (errorMessage) {
      setErrorMessage('')
      setShowMissingQuestions(false)
    }
  }

  const handleOtherText = (questionId: string, otherText: string) => {
    setAnswers(prev => ({ ...prev, [`${questionId}_otherText`]: otherText }))
  }

  const hasOtherOption = (question: Question): boolean => {
    if (!question.options) return false
    return question.options.some(opt => opt.toLowerCase() === 'other')
  }

  const isOtherSelected = (question: Question): boolean => {
    const answer = answers[question.id]
    if (question.type === 'single') {
      return answer === 'Other'
    } else if (question.type === 'multi') {
      return Array.isArray(answer) && answer.includes('Other')
    }
    return false
  }

  const handleClear = () => {
    setShowClearConfirm(true)
  }

  const confirmClear = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setShowClearConfirm(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const validateAnswers = (): { isValid: boolean; missingQuestions: number[] } => {
    const missingQuestions: number[] = []
    
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i]
      
      // Check if answer is provided
      if (q.required && !answers[q.id]) {
        missingQuestions.push(i)
        continue
      }
      
      // Check multi-select has at least one selection
      if (q.type === 'multi' && q.required && (!answers[q.id] || answers[q.id].length === 0)) {
        missingQuestions.push(i)
        continue
      }
      
      // Check if "Other" is selected and requires text
      if (hasOtherOption(q)) {
        const answer = answers[q.id]
        let otherIsSelected = false
        
        if (q.type === 'single' && answer === 'Other') {
          otherIsSelected = true
        } else if (q.type === 'multi' && Array.isArray(answer) && answer.includes('Other')) {
          otherIsSelected = true
        }
        
        // If "Other" is selected, require the text field
        if (otherIsSelected) {
          const otherText = answers[`${q.id}_otherText`]
          if (!otherText || otherText.trim() === '') {
            missingQuestions.push(i)
          }
        }
      }
    }
    
    return {
      isValid: missingQuestions.length === 0,
      missingQuestions
    }
  }

  const formatEmailBody = (): string => {
    const timestamp = new Date().toISOString()
    const userName = user?.name || 'Unknown User'
    const overallRating = answers['q1'] || 'N/A'
    const npsScore = answers['q2'] !== undefined ? answers['q2'] : 'N/A'
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #4f46e5; margin-top: 30px; margin-bottom: 15px; font-size: 1.3em; }
    .header-summary { background: #f9fafb; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .question-block { margin: 20px 0; padding: 15px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; }
    .question-text { font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
    .answer { color: #4f46e5; font-weight: 500; margin-left: 20px; }
    .answer ul { margin: 5px 0; padding-left: 20px; }
    .category-header { background: #6366f1; color: white; padding: 8px 12px; border-radius: 6px; margin-top: 25px; margin-bottom: 10px; font-weight: 600; }
    .star-rating { color: #f59e0b; }
    .timestamp { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Interview.OS Feedback Submission</h1>
  
  <div class="header-summary">
    <p><strong>Submitted:</strong> <span class="timestamp">${timestamp}</span></p>
    <p><strong>User:</strong> ${userName}</p>
    <p><strong>Overall Rating:</strong> <span class="star-rating">${String.fromCharCode(9733).repeat(overallRating)}${String.fromCharCode(9734).repeat(5 - overallRating)}</span> (${overallRating}/5)</p>
    <p><strong>NPS Score:</strong> ${npsScore}/10</p>
  </div>
`
    
    let currentCategory = ''
    QUESTIONS.forEach((q, index) => {
      const answer = answers[q.id]
      
      if (q.category !== currentCategory) {
        currentCategory = q.category
        html += `<div class="category-header">${currentCategory}</div>`
      }
      
      html += `<div class="question-block">`
      html += `<div class="question-text">Q${index + 1}. ${q.text}</div>`
      html += `<div class="answer">`
      
      if (q.type === 'star') {
        const stars = answer || 0
        html += `<span class="star-rating">${String.fromCharCode(9733).repeat(stars)}${String.fromCharCode(9734).repeat(5 - stars)}</span> (${stars}/5)`
      } else if (q.type === 'nps') {
        html += `${answer !== undefined ? answer : 'No answer'}/10`
      } else if (q.type === 'likert') {
        html += answer || 'No answer'
      } else if (q.type === 'single') {
        let displayAnswer = answer || 'No answer'
        if (answer === 'Other' && answers[`${q.id}_otherText`]) {
          displayAnswer += `: ${answers[`${q.id}_otherText`]}`
        }
        html += displayAnswer
      } else if (q.type === 'multi') {
        if (answer && answer.length > 0) {
          html += `<ul>${answer.map((a: string) => {
            if (a === 'Other' && answers[`${q.id}_otherText`]) {
              return `<li>Other: ${answers[`${q.id}_otherText`]}</li>`
            }
            return `<li>${a}</li>`
          }).join('')}</ul>`
        } else {
          html += 'No selections'
        }
      } else if (q.type === 'text') {
        html += `<p style="margin-left: 20px; white-space: pre-wrap;">${answer || 'No response'}</p>`
      }
      
      html += `</div></div>`
    })
    
    html += `</body></html>`
    return html
  }

  const handleSubmit = async () => {
    const validation = validateAnswers()
    if (!validation.isValid) {
      setErrorMessage(`Please answer all required questions before submitting. ${validation.missingQuestions.length} question${validation.missingQuestions.length === 1 ? '' : 's'} remaining.`)
      setShowMissingQuestions(true)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const emailBody = formatEmailBody()
      const timestamp = new Date().toISOString()
      
      const response = await mcapi.post('/miniapp-send-email', {
        miniappId: 'interview-os',
        to: 'gsj2442.2@gmail.com',
        subject: `Interview.OS Feedback Submission — ${timestamp} — 25Q`,
        html: emailBody,
        senderName: 'Interview.OS Feedback System',
      })

      if (response.success) {
        setSubmitStatus('success')
        // Clear saved draft
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      } else {
        throw new Error(response.error || 'Failed to send email')
      }
    } catch (error: any) {
      console.error('Failed to send feedback:', error)
      setSubmitStatus('error')
      setErrorMessage(error.message || 'Failed to send feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setAnswers({})
    setCurrentQuestion(0)
    setSubmitStatus('idle')
    setErrorMessage('')
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Success screen
  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-success-muted mb-6 shadow-inner">
              <CheckCircle2 className="w-14 h-14 text-success" />
            </div>
            <h1 className="text-4xl font-bold text-content mb-4 tracking-tight">Thank you!</h1>
            <p className="text-base text-content-secondary leading-relaxed">
              Your feedback was sent successfully. We really appreciate you helping us shape the next version of Interview.OS.
            </p>
          </div>
          <Button onClick={handleReset} size="lg" className="shadow-card btn-lift">
            <RotateCcw className="w-4 h-4 mr-2" />
            Submit Another Response
          </Button>
        </div>
      </div>
    )
  }

  const progress = ((Object.keys(answers).length) / QUESTIONS.length) * 100
  const question = QUESTIONS[currentQuestion]
  const answer = answers[question.id]

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-elevated/90 backdrop-blur-md border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-content mb-1 tracking-tight">Help us improve Interview.OS</h1>
              <p className="text-content-muted text-sm">
                Your answers directly shape the next version — takes about 3–5 minutes.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-content-muted uppercase tracking-wider">{Math.round(progress)}% done</p>
              <p className="text-xs text-content-muted mt-0.5">{currentQuestion + 1} / {QUESTIONS.length}</p>
            </div>
          </div>
          
          {/* Progress Bar — thicker, more visible */}
          <div className="mt-4">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-8 py-10">
        <Card className="p-8 shadow-card">
          {/* Category Badge */}
          {question.category && (
            <div className="mb-5">
              <span className="inline-flex items-center px-3 py-1 bg-primary-muted text-primary text-xs font-bold rounded-full border border-primary-border tracking-wide uppercase">
                {question.category}
              </span>
            </div>
          )}

          {/* Question Text */}
          <h2 className="text-xl font-bold text-content mb-6 leading-snug">
            {question.text}
            {question.required && <span className="text-danger ml-1 font-normal">*</span>}
          </h2>

          {/* Question Input */}
          <div className="mb-8">
            {question.type === 'star' && (
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleAnswer(question.id, num)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        num <= (answer || 0)
                          ? 'fill-warning text-warning'
                          : 'text-border-strong hover:text-warning/50'
                      }`}
                    />
                  </button>
                ))}
                {answer > 0 && (
                  <span className="ml-3 text-content-secondary font-medium">{answer}/5</span>
                )}
              </div>
            )}

            {question.type === 'nps' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleAnswer(question.id, num)}
                      className={`w-12 h-12 rounded-lg font-semibold transition-all ${
                        answer === num
                          ? 'bg-primary text-white shadow-card-hover'
                          : 'bg-surface-elevated border border-border text-content-secondary hover:border-primary hover:text-primary'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-content-muted">
                  <span>{NPS_LABELS[0]}</span>
                  <span>{NPS_LABELS[1]}</span>
                </div>
              </div>
            )}

            {question.type === 'likert' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {LIKERT_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-all ${
                      answer === option
                        ? 'bg-primary-muted border-2 border-primary'
                        : 'bg-surface-elevated border border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answer === option}
                      onChange={() => handleAnswer(question.id, option)}
                      className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                    />
                    <span className="ml-3 text-content font-medium text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'single' && question.options && (
              <div className={`${question.options.length > 4 ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5' : 'space-y-2.5'}`}>
                {question.options.map((option) => (
                  <div key={option} className={question.options && question.options.length > 4 ? '' : ''}>
                    <label
                      className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-all ${
                        answer === option
                          ? 'bg-primary-muted border-2 border-primary'
                          : 'bg-surface-elevated border border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answer === option}
                        onChange={() => handleAnswer(question.id, option)}
                        className="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                      />
                      <span className="ml-3 text-content font-medium text-sm">{option}</span>
                    </label>
                    {option === 'Other' && answer === 'Other' && (
                      <div className="mt-2 ml-8">
                        <input
                          type="text"
                          value={answers[`${question.id}_otherText`] || ''}
                          onChange={(e) => handleOtherText(question.id, e.target.value)}
                          placeholder="Type your answer..."
                          className="w-full px-4 py-3 rounded-lg border border-border bg-surface-input focus:border-primary focus:outline-none text-content placeholder:text-content-muted text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {question.type === 'multi' && question.options && (
              <div>
                <div className={`${question.options.length > 4 ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5' : 'space-y-2.5'} mb-3`}>
                  {question.options.map((option) => {
                    const selected = answer?.includes(option) || false
                    const isMaxed = question.maxSelections && answer?.length >= question.maxSelections && !selected
                    
                    return (
                      <div key={option}>
                        <label
                          className={`flex items-center p-3.5 rounded-xl cursor-pointer transition-all ${
                            selected
                              ? 'bg-primary-muted border-2 border-primary'
                              : isMaxed
                              ? 'bg-surface-elevated border border-border opacity-50 cursor-not-allowed'
                              : 'bg-surface-elevated border border-border hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={option}
                            checked={selected}
                            disabled={isMaxed}
                            onChange={(e) => {
                              const current = answer || []
                              if (e.target.checked) {
                                handleAnswer(question.id, [...current, option])
                              } else {
                                handleAnswer(question.id, current.filter((v: string) => v !== option))
                              }
                            }}
                            className="w-5 h-5 rounded text-primary focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                          />
                          <span className="ml-3 text-content font-medium text-sm">{option}</span>
                        </label>
                        {option === 'Other' && selected && (
                          <div className="mt-2 ml-8">
                            <input
                              type="text"
                              value={answers[`${question.id}_otherText`] || ''}
                              onChange={(e) => handleOtherText(question.id, e.target.value)}
                              placeholder="Type your answer..."
                              className="w-full px-4 py-3 rounded-lg border border-border bg-surface-input focus:border-primary focus:outline-none text-content placeholder:text-content-muted text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {question.maxSelections && (
                  <p className="text-xs text-content-muted">
                    Selected: {answer?.length || 0} / {question.maxSelections}
                  </p>
                )}
              </div>
            )}

            {question.type === 'text' && (
              <textarea
                value={answer || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Your thoughts here..."
                rows={6}
                className="w-full px-6 py-4 rounded-xl border border-border bg-surface-input focus:border-primary focus:outline-none resize-none text-content placeholder-content-muted"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-content-muted hover:text-danger transition-colors"
            >
              Clear all responses
            </button>

            <div className="flex items-center gap-3">
              {currentQuestion > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                >
                  Previous
                </Button>
              )}

              {currentQuestion < QUESTIONS.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  disabled={question.required && !answer}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateAnswers().isValid || isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {(errorMessage || submitStatus === 'error') && (
            <div className="mt-6 p-4 bg-danger-muted border border-danger-border rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-danger font-medium">
                    {errorMessage || 'Failed to submit feedback. Your responses are saved locally — please try again.'}
                  </p>
                  
                  {showMissingQuestions && validateAnswers().missingQuestions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-danger-border font-semibold">Jump to unanswered question:</p>
                      <div className="flex flex-wrap gap-2">
                        {validateAnswers().missingQuestions.map((index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentQuestion(index)
                              setShowMissingQuestions(false)
                              setErrorMessage('')
                            }}
                            className="px-3 py-1.5 bg-white border border-danger rounded-lg text-xs font-medium text-danger hover:bg-danger hover:text-white transition-colors"
                          >
                            Q{index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Progress Dots — click to jump */}
        <div className="flex justify-center gap-1 mt-6 flex-wrap px-4">
          {QUESTIONS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                index === currentQuestion
                  ? 'w-8 bg-primary'
                  : answers[QUESTIONS[index].id]
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-border hover:bg-border-strong'
              }`}
              title={`Question ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <Modal open={true} onClose={() => setShowClearConfirm(false)} size="sm">
          <Modal.Header onClose={() => setShowClearConfirm(false)}>
            <Modal.Title>Clear all responses?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-content-secondary text-sm">
              This will remove all saved answers for this feedback form. This cannot be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmClear}>
              Clear
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}
