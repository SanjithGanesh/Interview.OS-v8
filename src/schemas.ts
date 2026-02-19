/**
 * Collection Schemas
 * 
 * Defines all collections with fields and RBAC permissions.
 * This is the SINGLE SOURCE OF TRUTH - imported by both worker and frontend.
 * 
 * Roles (stored on user records):
 * - viewer: Read-only access (default for new users)
 * - member: Can create and edit own content
 * - admin: Full access (automatically assigned to global admins)
 * 
 * To add features, copy schema files to src/schemas/ then import:
 *   import { itemsSchema } from './schemas/items-schema'
 *   import { challengesSchema } from './schemas/tasks-schema'
 *   import { teamsSchemas } from './schemas/teams-schema'
 *   import { settingsSchema } from './schemas/admin-schema'
 */

import type { CollectionSchema } from '@spaces/sdk/worker'
import { USERS_COLLECTION_FIELDS } from '@spaces/sdk/worker'
import { settingsSchema } from './schemas/admin-schema'

// ============================================================================
// Users Collection (required)
// ============================================================================

const usersSchema: CollectionSchema = {
  name: 'users',
  fields: {
    // System-managed fields (from SDK)
    ...USERS_COLLECTION_FIELDS,
    
    // Add your app-specific user fields here
    // bio: { type: 'string' },
    // preferences: { type: 'string' },
  },
  permissions: {
    viewer: { 
      read: 'own',
      create: false,
      update: 'own', 
      delete: false,
      writableFields: [],  // Add fields users can update
    },
    member: { 
      read: true,
      create: false,
      update: 'own', 
      delete: false,
      writableFields: [],
    },
    admin: { read: true, create: false, update: true, delete: true },
  },
}

// ============================================================================
// Jobs Collection
// ============================================================================

const jobsSchema: CollectionSchema = {
  name: 'jobs',
  fields: {
    company: { type: 'string', required: true },
    role: { type: 'string', required: true },
    jobLink: { type: 'string' },
    location: { type: 'string' },
    priority: { type: 'string', required: true }, // Low, Medium, High
    pipelineStage: { type: 'string', required: true }, // Saved, Applied, Recruiter Screen, etc.
    nextActionType: { type: 'string' }, // enum
    nextActionDate: { type: 'string' }, // ISO date string
    notes: { type: 'string' },
    jdText: { type: 'string' }, // Job description text
    keywordExtract: { type: 'array' }, // Extracted keywords
    technicalKeywords: { type: 'array' }, // Technical keywords (prioritized)
    generalKeywords: { type: 'array' }, // General keywords
    jdAnalyzedAt: { type: 'string' }, // ISO date string - when JD was last analyzed
    generatedQuestions: { type: 'array' }, // Array of generated question objects
    questionNotes: { type: 'object' }, // Map of questionId -> { notes, practiced, confidence, timeSpent }
    interviewDateTime: { type: 'string' }, // ISO date string
    interviewType: { type: 'string' }, // Phone, Technical, Onsite, HR, Final
    interviewRound: { type: 'number' }, // Interview round number (1, 2, 3, etc.)
    statusOutcome: { type: 'string' }, // Offer, Rejected, Withdrawn, Closed
    archived: { type: 'boolean' },
    // File uploads (DeepSpace internal storage)
    resumeFile: { type: 'object' }, // { fileId, filename, uploadedAt }
    coverLetterFile: { type: 'object' }, // { fileId, filename, uploadedAt }
    // Follow-up workspace fields (for Applied stage)
    followUpRecruiterName: { type: 'string' },
    followUpContactType: { type: 'string' }, // Email, LinkedIn, Phone, Other
    followUpContact: { type: 'string' }, // Email/URL/Phone
    followUpStatus: { type: 'string' }, // Not Sent, Sent, Replied
    followUpDate: { type: 'string' }, // ISO date string
    followUpNotes: { type: 'string' },
    followUpCustomLine: { type: 'string' }, // Custom line for templates
    // Interview reflection fields
    interviewQuestionsAsked: { type: 'string' },
    interviewPerformance: { type: 'string' },
    interviewImprovements: { type: 'string' },
    // Offer details (captured when job reaches Offer stage)
    offerDetails: { type: 'object' }, // OfferDetails: { baseSalary, currency, bonus, equity, location, workMode, benefits, startDate, totalCompNotes, otherNotes }
    // Offer Quick Picks (structured preset selections per job)
    offerQuickPicks: { type: 'object' }, // OfferQuickPicks: { workMode, deadline, bonusType, bonusPct, benefits[], timeOff[], stipends[], learning[], negotiationRoom, negotiationLevers[], cultureSignals[] }
  },
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Activity Log Collection
// ============================================================================

const activityLogSchema: CollectionSchema = {
  name: 'activity_log',
  fields: {
    actionType: { type: 'string', required: true },
    jobId: { type: 'string' },
    details: { type: 'string' },
  },
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Question Practice Collection
// ============================================================================

const questionPracticeSchema: CollectionSchema = {
  name: 'question_practice',
  fields: {
    jobId: { type: 'string', required: true },
    questionId: { type: 'string', required: true },
    practiced: { type: 'boolean' },
    notes: { type: 'string' },
    answer: { type: 'string' },
  },
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Feedback Collection
// ============================================================================

const feedbackSchema: CollectionSchema = {
  name: 'feedback',
  fields: {
    text: { type: 'string', required: true },
    rating: { type: 'number' },
    anonymous: { type: 'boolean' },
  },
  permissions: {
    viewer: { read: false, create: true, update: false, delete: false },
    member: { read: false, create: true, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// User Preferences Collection (per-user: theme, settings)
// ============================================================================

const userPreferencesSchema: CollectionSchema = {
  name: 'user_preferences',
  fields: {
    theme: { type: 'string' },     // 'light' | 'dark'
    updatedAt: { type: 'string' }, // ISO date string
  },
  permissions: {
    viewer: { read: 'own', create: true, update: 'own', delete: 'own' },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

// ============================================================================
// Analytics Events Collection (global — admin-readable, any user can create)
// ============================================================================

/**
 * analytics_events stores anonymized usage events from all users.
 * - Any authenticated user can append events (create: true)
 * - Only admin can read all events
 * - Events contain: eventType, userKey (hashed/opaque), date (YYYY-MM-DD), extra metadata
 * - No PII stored — userKey is an opaque hash, not email
 *
 * IMPORTANT: This schema is intentionally NOT included in the main `schemas` export.
 * It lives in its own global RecordProvider (GLOBAL_ANALYTICS_ROOM_ID) so that
 * all users write to the same Durable Object regardless of which canvas they opened
 * the widget on. Mixing it into the per-canvas provider is the root cause of the
 * "Unique Users stuck at 1" bug.
 */
export const analyticsEventsSchema: CollectionSchema = {
  name: 'analytics_events',
  fields: {
    eventType: { type: 'string', required: true }, // 'widget_open' | 'job_created' | 'interview_scheduled' | 'stage_move'
    userKey: { type: 'string', required: true },   // opaque hash (not email, not real id)
    dateKey: { type: 'string', required: true },   // YYYY-MM-DD
    fromStage: { type: 'string' },                 // for stage_move events
    toStage: { type: 'string' },                   // for stage_move events
  },
  permissions: {
    viewer: { read: false, create: true, update: false, delete: false },
    member: { read: false, create: true, update: false, delete: false },
    admin: { read: true, create: true, update: false, delete: true },
  },
}

/** Schemas for the global analytics RecordProvider (fixed roomId). */
export const analyticsSchemas: CollectionSchema[] = [analyticsEventsSchema]

// ============================================================================
// Export all schemas (per-canvas provider — does NOT include analytics_events)
// ============================================================================

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  jobsSchema,
  activityLogSchema,
  questionPracticeSchema,
  feedbackSchema,
  userPreferencesSchema,
  // analyticsEventsSchema is intentionally excluded — see GlobalAnalyticsProvider in App.tsx
]
