/**
 * App Constants
 * 
 * Define roles, status values, and other constants here.
 * Import feature-specific constants from their directories.
 */

import type { BadgeColor } from './components/ui'

// ============================================================================
// User Roles
// ============================================================================

export const ROLES = {
  VIEWER: 'viewer',
  MEMBER: 'member',
  ADMIN: 'admin',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_CONFIG: Record<Role, { title: string; color: BadgeColor; description: string }> = {
  [ROLES.VIEWER]: {
    title: 'Viewer',
    color: 'muted',
    description: 'Read-only access',
  },
  [ROLES.MEMBER]: {
    title: 'Member',
    color: 'primary',
    description: 'Can create and edit own content',
  },
  [ROLES.ADMIN]: {
    title: 'Admin',
    color: 'warning',
    description: 'Full access to all features',
  },
}

// ============================================================================
// Analytics Global Room
// ============================================================================

/**
 * Fixed global room ID for analytics events.
 * ALL users write to this single Durable Object so admin can read
 * cross-user events regardless of which canvas they opened the widget on.
 *
 * CRITICAL: This must NEVER be derived from getWidgetRoomId() or URL params.
 * It is a single shared room for the entire app across all canvases.
 */
export const GLOBAL_ANALYTICS_ROOM_ID = 'interviewos_analytics_global'

/**
 * Set to true to show the diagnostics panel on the Analytics page.
 * Flip to false before final production publish.
 */
export const DEBUG_ANALYTICS = true

// ============================================================================
// Admin Identity
// ============================================================================

/**
 * The one admin email for Interview.OS.
 * Analytics tab and Admin badge are gated behind this exact match.
 */
export const ADMIN_EMAIL = 'gsj2442@gmail.com'

/**
 * Returns true if the given email is the Interview.OS admin.
 * Uses exact match (case-insensitive).
 */
export function isInterviewOsAdmin(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()
}

/**
 * Derive a stable, opaque user key for analytics.
 * We hash the user ID so no real identifier is stored in analytics_events.
 * Falls back to a salted string hash if SubtleCrypto is unavailable.
 */
export function deriveUserKey(userId: string): string {
  // Simple deterministic obfuscation — not crypto, just opaque enough
  // for analytics counting. No real PII in storage.
  let hash = 5381
  const str = `ios-user:${userId}`
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  }
  return `u${Math.abs(hash).toString(36)}`
}

// ============================================================================
// Interview.OS Constants
// ============================================================================

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
} as const

export type Priority = typeof PRIORITY[keyof typeof PRIORITY]

export const PRIORITY_CONFIG: Record<Priority, { color: BadgeColor }> = {
  [PRIORITY.LOW]: { color: 'muted' },
  [PRIORITY.MEDIUM]: { color: 'info' },
  [PRIORITY.HIGH]: { color: 'danger' },
}

export const PIPELINE_STAGES = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  CLOSED: 'Closed',
} as const

export type PipelineStage = typeof PIPELINE_STAGES[keyof typeof PIPELINE_STAGES]

export const PIPELINE_STAGES_ORDER = [
  PIPELINE_STAGES.WISHLIST,
  PIPELINE_STAGES.APPLIED,
  PIPELINE_STAGES.INTERVIEW,
  PIPELINE_STAGES.OFFER,
  PIPELINE_STAGES.CLOSED,
]

export const NEXT_ACTION_TYPES = {
  APPLY: 'Apply',
  FOLLOW_UP: 'Follow Up',
  PREPARE: 'Prepare for Interview',
  INTERVIEW: 'Interview',
  SEND_THANK_YOU: 'Send Thank You',
  CHECK_STATUS: 'Check Status',
  COMPLETE_ASSESSMENT: 'Complete Assessment',
  SUBMIT_MATERIALS: 'Submit Materials',
  SCHEDULE_INTERVIEW: 'Schedule Interview',
  WAITING: 'Waiting for Response',
} as const

export type NextActionType = typeof NEXT_ACTION_TYPES[keyof typeof NEXT_ACTION_TYPES]

export const INTERVIEW_TYPES = {
  PHONE: 'Phone',
  TECHNICAL: 'Technical',
  ONSITE: 'Onsite',
  HR: 'HR',
  FINAL: 'Final',
  PANEL: 'Panel',
  BEHAVIORAL: 'Behavioral',
} as const

export type InterviewType = typeof INTERVIEW_TYPES[keyof typeof INTERVIEW_TYPES]

export const STATUS_OUTCOMES = {
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed',
} as const

export type StatusOutcome = typeof STATUS_OUTCOMES[keyof typeof STATUS_OUTCOMES]

export const QUESTION_TYPES = {
  BEHAVIORAL: 'Behavioral',
  TECHNICAL: 'Technical',
  RESUME: 'Resume-based',
  COMPANY: 'Company-specific',
  ROLE: 'Role-specific',
  LEADERSHIP: 'Leadership/STAR',
  PROBLEM_SOLVING: 'Problem Solving',
  CULTURE_FIT: 'Culture Fit',
} as const

export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES]

// Sample questions for each category
export const QUESTION_BANK: Record<QuestionType, string[]> = {
  [QUESTION_TYPES.BEHAVIORAL]: [
    'Tell me about a time you faced a conflict with a team member.',
    'Describe a situation where you had to meet a tight deadline.',
    'Give an example of when you showed leadership.',
    'Tell me about a time you failed and what you learned.',
    'Describe a situation where you had to adapt to change.',
  ],
  [QUESTION_TYPES.TECHNICAL]: [
    'Explain your approach to debugging a complex issue.',
    'Walk me through your process for designing a new feature.',
    'How do you ensure code quality in your projects?',
    'Describe your experience with [relevant technology].',
    'How do you stay current with industry trends?',
  ],
  [QUESTION_TYPES.RESUME]: [
    'Tell me about your role at [previous company].',
    'Walk me through [specific project on resume].',
    'What were your main accomplishments at [previous role]?',
    'Why did you leave your last position?',
    'Explain the gap in your employment history.',
  ],
  [QUESTION_TYPES.COMPANY]: [
    'Why do you want to work here?',
    'What do you know about our company?',
    'How would you contribute to our mission?',
    'What excites you about this opportunity?',
    'Where do you see this company in 5 years?',
  ],
  [QUESTION_TYPES.ROLE]: [
    'Why are you interested in this role?',
    'What makes you qualified for this position?',
    'What would you do in your first 90 days?',
    'How does this role fit into your career goals?',
    'What questions do you have about the role?',
  ],
  [QUESTION_TYPES.LEADERSHIP]: [
    'Describe a time you motivated a team.',
    'Tell me about a difficult decision you made.',
    'How do you handle underperforming team members?',
    'Give an example of resolving a team conflict.',
    'Describe your leadership style.',
  ],
  [QUESTION_TYPES.PROBLEM_SOLVING]: [
    'How do you approach a problem you have never seen before?',
    'Walk me through solving [hypothetical scenario].',
    'Describe a time you found an innovative solution.',
    'How do you prioritize when everything is urgent?',
    'Tell me about a complex problem you solved.',
  ],
  [QUESTION_TYPES.CULTURE_FIT]: [
    'What type of work environment do you thrive in?',
    'How do you handle feedback?',
    'What are your values and how do they align with ours?',
    'Describe your ideal team dynamic.',
    'What motivates you at work?',
  ],
}

export const ACTIVITY_TYPES = {
  ADD_JOB: 'add_job',
  MOVE_STAGE: 'move_stage',
  COMPLETE_ACTION: 'complete_action',
  START_PREP: 'start_prep',
  FINISH_TIMER: 'finish_timer',
  MARK_PRACTICED: 'mark_practiced',
  EDIT_JOB: 'edit_job',
  DELETE_JOB: 'delete_job',
} as const

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES]

// ============================================================================
// Technical Keywords & JD Analysis
// ============================================================================

// Known technical terms (languages, frameworks, tools, cloud services, databases, etc.)
export const TECHNICAL_TERMS = new Set([
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp', 'go', 'golang',
  'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'perl', 'r', 'matlab', 'shell',
  // Web Technologies
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxt', 'gatsby', 'html', 'css',
  'sass', 'scss', 'tailwind', 'bootstrap', 'webpack', 'vite', 'rollup', 'babel',
  // Backend Frameworks
  'node', 'nodejs', 'node.js', 'express', 'fastapi', 'django', 'flask', 'rails', 'spring',
  'springboot', 'asp.net', 'laravel', 'nestjs',
  // Databases
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
  'cassandra', 'oracle', 'sqlite', 'mariadb', 'neo4j', 'firestore', 'cosmosdb',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
  'circleci', 'gitlab', 'github', 'bitbucket', 'cloudformation', 'lambda', 's3', 'ec2',
  'ecs', 'eks', 'fargate', 'cloudfront', 'route53', 'vpc', 'iam',
  // Data & ML
  'spark', 'hadoop', 'kafka', 'airflow', 'pandas', 'numpy', 'tensorflow', 'pytorch',
  'scikit-learn', 'keras', 'mlflow', 'sagemaker', 'databricks', 'snowflake', 'bigquery',
  // APIs & Protocols
  'rest', 'restful', 'graphql', 'grpc', 'websocket', 'mqtt', 'soap', 'oauth', 'jwt', 'api',
  'microservices', 'serverless',
  // Testing & Quality
  'jest', 'mocha', 'cypress', 'selenium', 'pytest', 'junit', 'testng', 'postman', 'ci/cd',
  // Mobile
  'ios', 'android', 'react-native', 'flutter', 'xamarin',
  // Other Tools
  'git', 'jira', 'confluence', 'slack', 'figma', 'sketch', 'postman', 'datadog', 'newrelic',
  'splunk', 'grafana', 'prometheus', 'nginx', 'apache', 'linux', 'unix', 'bash',
])

// Phrases that often precede technical skills
export const SKILL_INDICATORS = [
  'experience with',
  'proficient in',
  'knowledge of',
  'familiarity with',
  'expertise in',
  'skilled in',
  'working knowledge of',
  'hands-on experience with',
  'strong background in',
  'advanced knowledge of',
]

/**
 * Extract keywords from job description text
 * Returns { technical: string[], general: string[] }
 */
export function extractKeywords(jdText: string): { technical: string[]; general: string[] } {
  if (!jdText.trim()) return { technical: [], general: [] }

  const technical = new Set<string>()
  const general = new Set<string>()

  // Lowercase for matching
  const lowerText = jdText.toLowerCase()

  // 1. Find technical terms from our known list
  TECHNICAL_TERMS.forEach(term => {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    if (pattern.test(lowerText)) {
      technical.add(term)
    }
  })

  // 2. Find capitalized acronyms (API, SQL, AWS, etc.) - likely technical
  const acronymPattern = /\b[A-Z]{2,}\b/g
  const acronymMatches: string[] = jdText.match(acronymPattern) ?? []
  acronymMatches.forEach(acronym => {
    const lower = acronym.toLowerCase()
    if (lower.length >= 2 && lower.length <= 10) {
      technical.add(lower)
    }
  })

  // 3. Extract words after skill indicator phrases
  SKILL_INDICATORS.forEach(indicator => {
    const pattern = new RegExp(`${indicator}\\s+([a-zA-Z0-9/.+#-]+(?:\\s+[a-zA-Z0-9/.+#-]+){0,2})`, 'gi')
    const matches = lowerText.matchAll(pattern)
    for (const match of matches) {
      const terms = match[1].split(/\s+/)
      terms.forEach(term => {
        if (term.length > 2 && !['and', 'or', 'the', 'with', 'for'].includes(term)) {
          technical.add(term)
        }
      })
    }
  })

  // 4. Extract general high-frequency keywords (fallback)
  const words = lowerText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !['about', 'their', 'would', 'should', 'could', 'these', 'those', 'which', 'where', 'there'].includes(w))

  const wordCount: Record<string, number> = {}
  words.forEach(w => {
    if (!technical.has(w)) {
      wordCount[w] = (wordCount[w] || 0) + 1
    }
  })

  const sortedGeneral = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)

  sortedGeneral.forEach(word => general.add(word))

  return {
    technical: Array.from(technical).slice(0, 20),
    general: Array.from(general).slice(0, 10),
  }
}

/**
 * Generate interview questions from JD text and keywords
 */
export interface GeneratedQuestion {
  id: string
  category: string
  text: string
  keywords: string[]
  difficulty?: 'Easy' | 'Medium' | 'Hard'
}

// ============================================================================
// JD Classification
// ============================================================================

export type JDRoleType =
  | 'technical_swe'       // Software engineering / ML / Data Science
  | 'product_design'      // Product management, design, UX
  | 'finance_business'    // Finance, banking, investment, ops
  | 'leadership_exec'     // Executive, C-suite, general management
  | 'operations'          // Operations, supply chain, logistics
  | 'general'             // Catch-all / unknown

const SWE_SIGNALS = [
  'software engineer', 'software developer', 'frontend', 'backend', 'fullstack', 'full-stack',
  'machine learning', 'data scientist', 'data engineer', 'ml engineer', 'devops', 'sre',
  'platform engineer', 'infrastructure', 'mobile developer', 'ios developer', 'android developer',
  'site reliability', 'cloud architect',
]

const PRODUCT_DESIGN_SIGNALS = [
  'product manager', 'product designer', 'ux designer', 'ui designer', 'user researcher',
  'design lead', 'product lead', 'head of product', 'vp of product', 'chief product',
]

const FINANCE_SIGNALS = [
  'cfo', 'chief financial', 'investment', 'portfolio', 'asset management', 'hedge fund',
  'private equity', 'banking', 'trader', 'risk management', 'compliance', 'fintech',
  'financial analyst', 'equity research', 'fund manager', 'wealth management',
  'capital markets', 'credit', 'fixed income', 'treasury', 'derivatives',
]

const LEADERSHIP_EXEC_SIGNALS = [
  'ceo', 'coo', 'chief executive', 'chief operating', 'chairman', 'managing director',
  'executive director', 'president', 'vp of', 'vice president', 'svp', 'evp',
  'general manager', 'head of', 'director of', 'principal',
]

const OPERATIONS_SIGNALS = [
  'operations manager', 'supply chain', 'logistics', 'procurement', 'project manager',
  'program manager', 'scrum master', 'business analyst', 'operations analyst',
  'hr manager', 'talent', 'recruiting',
]

/**
 * Classify a JD into a role type based on content signals.
 * Priority: explicit SWE tech terms > product > finance > exec > ops > general
 */
export function classifyJD(jdText: string, technicalKeywords: string[]): JDRoleType {
  const lower = jdText.toLowerCase()

  // Strong SWE signal: multiple recognized technical terms from our known list
  const sweTechCount = technicalKeywords.filter(kw => TECHNICAL_TERMS.has(kw.toLowerCase())).length
  if (sweTechCount >= 3) return 'technical_swe'

  // Check explicit role signal phrases
  if (SWE_SIGNALS.some(s => lower.includes(s))) return 'technical_swe'
  if (PRODUCT_DESIGN_SIGNALS.some(s => lower.includes(s))) return 'product_design'
  if (FINANCE_SIGNALS.some(s => lower.includes(s))) return 'finance_business'
  if (LEADERSHIP_EXEC_SIGNALS.some(s => lower.includes(s))) return 'leadership_exec'
  if (OPERATIONS_SIGNALS.some(s => lower.includes(s))) return 'operations'

  // Soft SWE: 1–2 SWE tech terms is borderline, treat as technical
  if (sweTechCount >= 1) return 'technical_swe'

  return 'general'
}

export function generateQuestionsFromJD(
  jdText: string,
  technicalKeywords: string[],
  generalKeywords: string[],
  company: string,
  role: string
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = []
  let idCounter = 1

  const roleType = classifyJD(jdText, technicalKeywords)
  const kw0 = technicalKeywords[0] || generalKeywords[0] || 'this area'
  const kw1 = technicalKeywords[1] || generalKeywords[1] || kw0
  const kw2 = technicalKeywords[2] || generalKeywords[2] || kw0
  const topGeneral = generalKeywords.slice(0, 3)

  // ─── CATEGORY 1: Domain / Technical (adapted to role type) ───────────────

  if (roleType === 'technical_swe') {
    // Pure SWE technical questions derived from JD tech stack
    if (technicalKeywords.length > 0) {
      technicalKeywords.slice(0, 6).forEach(keyword => {
        questions.push({
          id: `tech-${idCounter++}`,
          category: 'Technical (JD-Specific)',
          text: `Explain your experience with ${keyword} and how you would apply it in this role at ${company}.`,
          keywords: [keyword],
          difficulty: 'Medium',
        })
      })
      if (technicalKeywords.length >= 2) {
        questions.push({
          id: `tech-${idCounter++}`,
          category: 'Technical (JD-Specific)',
          text: `How would you architect a system using ${kw0} and ${kw1}? What are the key trade-offs?`,
          keywords: [kw0, kw1],
          difficulty: 'Hard',
        })
      }
      if (technicalKeywords.length >= 3) {
        questions.push({
          id: `tech-${idCounter++}`,
          category: 'Technical (JD-Specific)',
          text: `Walk me through a production issue involving ${kw2}. How did you debug and resolve it?`,
          keywords: [kw2],
          difficulty: 'Hard',
        })
      }
    }
  } else if (roleType === 'product_design') {
    const productQuestions = [
      `Walk me through how you would prioritize a product roadmap when you have more requests than resources.`,
      `Describe a product decision you made that required balancing user needs against business constraints.`,
      `How do you measure the success of a feature after it ships?`,
      `Tell me about a time you had to say no to a feature request from stakeholders.`,
      `Walk me through your process for turning user research insights into product requirements.`,
      `How do you drive alignment between engineering, design, and business teams?`,
    ]
    productQuestions.forEach(text => {
      questions.push({
        id: `domain-${idCounter++}`,
        category: 'Product & Design Craft',
        text,
        keywords: topGeneral,
        difficulty: 'Medium',
      })
    })
  } else if (roleType === 'finance_business') {
    const financeQuestions = [
      `Walk me through how you would evaluate a new investment opportunity or business case.`,
      `Describe your experience with financial modeling and what tools or frameworks you rely on.`,
      `How do you approach risk assessment in your decision-making process?`,
      `Tell me about a time you identified a financial risk and what steps you took to mitigate it.`,
      `How do you communicate complex financial analysis to non-finance stakeholders?`,
      `Describe a time you had to navigate regulatory or compliance requirements.`,
    ]
    financeQuestions.forEach(text => {
      questions.push({
        id: `domain-${idCounter++}`,
        category: 'Finance & Domain Knowledge',
        text,
        keywords: topGeneral,
        difficulty: 'Medium',
      })
    })
  } else if (roleType === 'leadership_exec') {
    const execQuestions = [
      `How do you set strategic direction and ensure alignment across your organization?`,
      `Describe how you have built and scaled a high-performing team.`,
      `Tell me about a time you had to make a major decision with incomplete information.`,
      `How do you balance short-term results with long-term organizational health?`,
      `Walk me through how you manage relationships with a board, investors, or key stakeholders.`,
      `Describe a transformational change you led. How did you drive adoption?`,
    ]
    execQuestions.forEach(text => {
      questions.push({
        id: `domain-${idCounter++}`,
        category: 'Leadership & Strategy',
        text,
        keywords: topGeneral,
        difficulty: 'Hard',
      })
    })
  } else if (roleType === 'operations') {
    const opsQuestions = [
      `Describe how you would identify and eliminate a significant bottleneck in an operational process.`,
      `Tell me about a time you improved an existing process. What metrics did you use to track success?`,
      `How do you manage multiple competing priorities and stakeholders simultaneously?`,
      `Walk me through a complex project you managed end-to-end. What was your planning approach?`,
      `How do you build cross-functional alignment when teams have different goals?`,
      `Describe a situation where something went significantly off plan. How did you recover?`,
    ]
    opsQuestions.forEach(text => {
      questions.push({
        id: `domain-${idCounter++}`,
        category: 'Operations & Execution',
        text,
        keywords: topGeneral,
        difficulty: 'Medium',
      })
    })
  } else {
    // general — extract domain clues from JD keywords
    const generalDomainQuestions = [
      `What specific skills or experiences make you well-suited for this ${role} position?`,
      `Tell me about a time you had to quickly become expert in an unfamiliar domain.`,
      `Describe the most complex problem you have solved in your career so far.`,
      `How do you stay current with developments in your field?`,
      `Walk me through a major project from inception to completion.`,
    ]
    generalDomainQuestions.forEach(text => {
      questions.push({
        id: `domain-${idCounter++}`,
        category: 'Role & Domain Depth',
        text,
        keywords: topGeneral,
        difficulty: 'Medium',
      })
    })
  }

  // ─── CATEGORY 2: Role Deep-Dive (JD-specific, all types) ─────────────────

  const deepDiveBase = [
    `What do you see as the three most important priorities for someone starting as ${role} at ${company}?`,
    `Describe a past situation that most closely maps to what this role requires. What would you do differently now?`,
    `How would you build relationships with key stakeholders in your first 90 days?`,
  ]

  // Add JD-keyword-derived deep dives
  if (generalKeywords.length > 0) {
    deepDiveBase.push(
      `The JD emphasizes "${generalKeywords[0]}". Tell me about a time you demonstrated this in practice.`
    )
  }
  if (generalKeywords.length > 1) {
    deepDiveBase.push(
      `How would you approach "${generalKeywords[1]}" in this role given ${company}'s context?`
    )
  }

  deepDiveBase.forEach(text => {
    questions.push({
      id: `role-${idCounter++}`,
      category: 'Role Deep-Dive',
      text,
      keywords: topGeneral,
      difficulty: 'Hard',
    })
  })

  // ─── CATEGORY 3: Behavioral (STAR) ───────────────────────────────────────

  const behavioralQuestions = [
    'Tell me about a time you faced a significant conflict with a team member or stakeholder. How did you resolve it?',
    'Describe a situation where you had to deliver results under serious time or resource pressure.',
    'Give an example of when you drove something forward without being explicitly asked to.',
    'Tell me about a time you failed or made a significant mistake. What did you learn?',
    'Describe a situation where you had to change your approach mid-way through a project.',
    'Tell me about a time you received challenging feedback. How did you respond and what changed?',
  ]

  behavioralQuestions.forEach(text => {
    questions.push({
      id: `behavioral-${idCounter++}`,
      category: 'Behavioral (STAR)',
      text,
      keywords: [],
      difficulty: 'Medium',
    })
  })

  // ─── CATEGORY 4: Company & Role Alignment ────────────────────────────────

  const companyQuestions = [
    `Why do you want to work at ${company}? What specifically draws you to this organisation?`,
    `What do you know about ${company}'s current challenges or strategic direction?`,
    `How does this ${role} role fit into your longer-term career trajectory?`,
    `What excites you most about this opportunity versus alternatives you might be considering?`,
    `What type of working culture helps you do your best work?`,
  ]

  companyQuestions.forEach(text => {
    questions.push({
      id: `company-${idCounter++}`,
      category: 'Company & Role Alignment',
      text,
      keywords: [],
      difficulty: 'Easy',
    })
  })

  // ─── CATEGORY 5: Scenario / Case (adapted to role type) ──────────────────

  if (roleType === 'technical_swe') {
    const scenarioQuestions = [
      `You have inherited a legacy codebase with poor test coverage and growing tech debt. How do you approach improving it while continuing to ship features?`,
      `A critical service goes down in production affecting users. Walk me through your incident response process.`,
      `You are asked to build a feature in 2 weeks but the design is unclear and requirements keep changing. How do you handle this?`,
    ]
    scenarioQuestions.forEach(text => {
      questions.push({
        id: `scenario-${idCounter++}`,
        category: 'Technical Scenarios',
        text,
        keywords: technicalKeywords.slice(0, 2),
        difficulty: 'Hard',
      })
    })
  } else if (roleType === 'product_design') {
    const scenarioQuestions = [
      `Your team is 3 sprints behind. The CEO wants an update. How do you handle this?`,
      `A major customer is requesting a feature that 80% of users would not use. Do you build it? How do you decide?`,
      `You have data showing users are dropping off at step 3 of your onboarding flow. Walk me through how you investigate and address this.`,
    ]
    scenarioQuestions.forEach(text => {
      questions.push({
        id: `scenario-${idCounter++}`,
        category: 'Product Scenarios',
        text,
        keywords: topGeneral,
        difficulty: 'Hard',
      })
    })
  } else if (roleType === 'finance_business') {
    const scenarioQuestions = [
      `You are given a portfolio of assets where 2 positions are significantly underperforming. How do you decide whether to hold, reduce, or exit?`,
      `A colleague flags a potential compliance issue in a recent transaction. What steps do you take?`,
      `You need to present a business case for a $50M investment to the executive team. Walk me through your approach.`,
    ]
    scenarioQuestions.forEach(text => {
      questions.push({
        id: `scenario-${idCounter++}`,
        category: 'Finance Scenarios',
        text,
        keywords: topGeneral,
        difficulty: 'Hard',
      })
    })
  } else if (roleType === 'leadership_exec') {
    const scenarioQuestions = [
      `Your top performer just resigned unexpectedly. You have a critical project deadline in 6 weeks. How do you respond?`,
      `The board is pushing for a strategy you believe is wrong. How do you navigate this?`,
      `Two of your direct reports are in ongoing conflict that is affecting team morale. How do you address it?`,
    ]
    scenarioQuestions.forEach(text => {
      questions.push({
        id: `scenario-${idCounter++}`,
        category: 'Leadership Scenarios',
        text,
        keywords: topGeneral,
        difficulty: 'Hard',
      })
    })
  } else {
    const genericScenarioQuestions = [
      `Describe a situation where you had competing priorities and limited time. How did you decide what to focus on?`,
      `You are asked to deliver a project with an unrealistic deadline. How do you handle the conversation with your manager?`,
      `A key collaborator is blocking progress on something critical. What do you do?`,
    ]
    genericScenarioQuestions.forEach(text => {
      questions.push({
        id: `scenario-${idCounter++}`,
        category: 'Scenario Questions',
        text,
        keywords: topGeneral,
        difficulty: 'Medium',
      })
    })
  }

  return questions
}
