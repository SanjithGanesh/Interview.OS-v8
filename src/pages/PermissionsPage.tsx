/**
 * Permissions Page
 *
 * Displays the auto-generated RBAC permission matrix from schemas.
 * Accessible to all authenticated users — schema definitions are not secret.
 *
 * Features:
 * - Per-collection CRUD permission matrix (role x operation)
 * - Current user's role row highlighted with "You" badge
 * - Team context for collections with teamField (user's own teams only)
 * - Expandable field details per collection
 * - Wildcard / default-deny indicators
 *
 * To use: Copy to starter/src/pages/ and add route in App.tsx
 */

import { useState, useMemo } from 'react'
import { useUser, useTeams, type Team } from '@spaces/sdk/storage'
import { analyzePermissions, type ResolvedPermission, type CollectionPermissionSummary, type FieldSchema } from '@spaces/sdk/worker'
import { Badge, type BadgeColor } from '../components/ui'
import { ROLES, ROLE_CONFIG, type Role } from '../constants'
import { schemas } from '../schemas'

// ============================================================================
// Constants
// ============================================================================

const LEVEL_DISPLAY: Record<string, { label: string; color: BadgeColor }> = {
  'true': { label: 'all', color: 'success' },
  'false': { label: 'none', color: 'danger' },
  'own': { label: 'own', color: 'primary' },
  'unclaimed-or-own': { label: 'unclaimed/own', color: 'info' },
  'collaborator': { label: 'collaborator', color: 'warning' },
  'team': { label: 'team', color: 'warning' },
  'access': { label: 'access', color: 'warning' },
}

// ============================================================================
// Main Page
// ============================================================================

export default function PermissionsPage() {
  const { user } = useUser()
  const { teams } = useTeams()
  const currentRole = user?.role ?? ROLES.VIEWER
  const roleConfig = ROLE_CONFIG[currentRole as Role] ?? ROLE_CONFIG[ROLES.VIEWER]

  const analysis = useMemo(() => analyzePermissions(schemas), [])

  // Sort roles: use ROLE_CONFIG key order first, then any extras alphabetically
  const roleOrder = Object.keys(ROLE_CONFIG)
  const sortedRoles = useMemo(() => {
    const known = analysis.roles.filter(r => roleOrder.includes(r))
    const unknown = analysis.roles.filter(r => !roleOrder.includes(r)).sort()
    known.sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b))
    return [...known, ...unknown]
  }, [analysis.roles])

  // Filter to only teams the current user is a member of
  const userTeams = useMemo(() => {
    if (!user?.id) return []
    return teams.filter(t =>
      t.createdBy === user.id || t.members?.some(m => m.userId === user.id)
    )
  }, [teams, user?.id])

  return (
    <div className="h-full bg-surface overflow-y-auto">
      {/* Header */}
      <div className="bg-surface-elevated/60 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content">Permissions</h1>
              <p className="text-content-muted mt-1">RBAC permission matrix for all collections</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-content-secondary">Your role:</span>
              <Badge color={roleConfig.color} size="sm">{roleConfig.title}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PermissionLegend />
        {analysis.collections.map(collection => (
          <CollectionCard
            key={collection.collection}
            collection={collection}
            roles={sortedRoles}
            currentRole={currentRole}
            userTeams={userTeams}
          />
        ))}
        {analysis.collections.length === 0 && (
          <p className="text-center text-content-muted py-8">No collections defined in schemas</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Permission Legend
// ============================================================================

function PermissionLegend() {
  return (
    <div className="bg-surface-overlay/40 rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-content-secondary mb-3">Permission Levels</h3>
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge color="success" size="sm">all</Badge>
          <span className="text-content-muted">Everyone with role</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="danger" size="sm">none</Badge>
          <span className="text-content-muted">Denied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="primary" size="sm">own</Badge>
          <span className="text-content-muted">Record owner only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="info" size="sm">unclaimed/own</Badge>
          <span className="text-content-muted">Unclaimed or owner</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="warning" size="sm">collaborator</Badge>
          <span className="text-content-muted">Owner or collaborator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge color="warning" size="sm">team</Badge>
          <span className="text-content-muted">Owner / collaborator / team member</span>
        </div>
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-border/30 text-xs text-content-muted">
        <span>
          <span className="border-b border-dashed border-content-muted">dashed border</span> = resolved via * wildcard
        </span>
        <span>
          <span className="italic opacity-50">italic + muted</span> = no permission defined (default deny)
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Collection Card
// ============================================================================

function CollectionCard({ collection, roles, currentRole, userTeams }: {
  collection: CollectionPermissionSummary
  roles: string[]
  currentRole: string
  userTeams: Team[]
}) {
  const [expanded, setExpanded] = useState(false)

  const metaBadges: Array<{ label: string; value: string }> = []
  if (collection.ownerField) metaBadges.push({ label: 'owner', value: collection.ownerField })
  if (collection.collaboratorsField) metaBadges.push({ label: 'collaborators', value: collection.collaboratorsField })
  if (collection.teamField) metaBadges.push({ label: 'team', value: collection.teamField })

  return (
    <div className="bg-surface-overlay/40 rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <code className="text-sm font-semibold text-primary bg-surface-overlay px-2 py-1 rounded">
            {collection.collection}
          </code>
          {metaBadges.map(mb => (
            <span key={mb.label} className="text-[10px] text-content-muted bg-surface-overlay/60 px-1.5 py-0.5 rounded">
              {mb.label}: <span className="text-content-secondary">{mb.value}</span>
            </span>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-content-secondary hover:text-content transition-colors shrink-0 ml-2"
        >
          {expanded ? 'Hide fields' : 'Show fields'}
        </button>
      </div>

      {/* Permission matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-4 py-2 text-left text-xs font-medium text-content-muted uppercase tracking-wide">Role</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-content-muted uppercase tracking-wide">Read</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-content-muted uppercase tracking-wide">Create</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-content-muted uppercase tracking-wide">Update</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-content-muted uppercase tracking-wide">Delete</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => {
              const perms = collection.permissions[role]
              if (!perms) return null
              const roleConfig = ROLE_CONFIG[role as Role]
              const isCurrentRole = role === currentRole
              return (
                <tr
                  key={role}
                  className={`border-b border-border/20 last:border-0 ${
                    isCurrentRole ? 'bg-primary-muted/30' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-content">{role}</span>
                    {roleConfig && (
                      <span className="text-[10px] text-content-muted ml-1.5">
                        {roleConfig.description}
                      </span>
                    )}
                    {isCurrentRole && (
                      <span className="ml-2"><Badge color="primary" size="sm">You</Badge></span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionBadge resolved={perms.read} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionBadge resolved={perms.create} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div>
                      <PermissionBadge resolved={perms.update} />
                      {perms.writableFields && (
                        <div
                          className="mt-1 text-[10px] text-content-muted cursor-help"
                          title={`Writable fields: ${perms.writableFields.join(', ')}`}
                        >
                          {perms.writableFields.length} field{perms.writableFields.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PermissionBadge resolved={perms.delete} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Team context for collections with teamField */}
      {collection.teamField && (
        <TeamContextInfo userTeams={userTeams} teamField={collection.teamField} />
      )}

      {/* Expandable field details */}
      {expanded && (
        <div className="border-t border-border/50">
          <FieldDetailsTable fields={collection.fields} />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Team Context Info
// ============================================================================

function TeamContextInfo({ userTeams, teamField }: { userTeams: Team[]; teamField: string }) {
  return (
    <div className="px-4 py-3 border-t border-border/30 bg-surface-overlay/20">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-content-muted mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <div className="text-xs">
          <p className="text-content-secondary mb-1">
            Records in this collection are team-scoped via the <code className="bg-surface-overlay px-1 py-0.5 rounded text-primary">{teamField}</code> field.
            The <Badge color="warning" size="sm">team</Badge> permission level applies only to records tagged with one of your teams.
          </p>
          {userTeams.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-content-muted">Your teams:</span>
              {userTeams.map(t => (
                <span key={t.id} className="bg-surface-overlay px-1.5 py-0.5 rounded text-content-secondary">
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-content-muted mt-1">You are not a member of any team. Team-scoped permissions will not grant you access to any records.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Permission Badge
// ============================================================================

function PermissionBadge({ resolved }: { resolved: ResolvedPermission }) {
  const key = String(resolved.level)
  const display = LEVEL_DISPLAY[key] ?? { label: key, color: 'muted' as BadgeColor }

  const isWildcard = resolved.source === 'wildcard'
  const isDefaultDeny = resolved.source === 'default-deny'

  const title = isWildcard
    ? `${display.label} (via * wildcard)`
    : isDefaultDeny
    ? 'No permission defined — defaults to deny'
    : display.label

  return (
    <span
      title={title}
      className={`inline-flex ${isDefaultDeny ? 'opacity-50 italic' : ''} ${isWildcard ? '[&>span]:border-dashed' : ''}`}
    >
      <Badge color={isDefaultDeny ? 'muted' : display.color} size="sm">
        {display.label}
        {isWildcard && <span className="ml-0.5 opacity-60">*</span>}
      </Badge>
    </span>
  )
}

// ============================================================================
// Field Details Table
// ============================================================================

function FieldDetailsTable({ fields }: { fields: Record<string, FieldSchema> }) {
  const fieldEntries = Object.entries(fields)

  if (fieldEntries.length === 0) {
    return <p className="px-4 py-3 text-sm text-content-muted">No fields defined</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30 bg-surface-overlay/20">
            <th className="px-4 py-2 text-left font-medium text-content-muted">Field</th>
            <th className="px-4 py-2 text-left font-medium text-content-muted">Type</th>
            <th className="px-4 py-2 text-center font-medium text-content-muted">Required</th>
            <th className="px-4 py-2 text-center font-medium text-content-muted">userBound</th>
            <th className="px-4 py-2 text-center font-medium text-content-muted">Immutable</th>
            <th className="px-4 py-2 text-center font-medium text-content-muted">System</th>
            <th className="px-4 py-2 text-left font-medium text-content-muted">Default</th>
          </tr>
        </thead>
        <tbody>
          {fieldEntries.map(([name, field]) => (
            <tr key={name} className="border-b border-border/10 last:border-0">
              <td className="px-4 py-1.5">
                <code className="text-content font-medium">{name}</code>
              </td>
              <td className="px-4 py-1.5 text-content-secondary">{field.type}</td>
              <td className="px-4 py-1.5 text-center">
                {field.required && <CheckIcon />}
              </td>
              <td className="px-4 py-1.5 text-center">
                {field.userBound && <CheckIcon />}
              </td>
              <td className="px-4 py-1.5 text-center">
                {field.immutable && <CheckIcon />}
              </td>
              <td className="px-4 py-1.5 text-center">
                {field.systemManaged && <CheckIcon />}
              </td>
              <td className="px-4 py-1.5 text-content-muted">
                {field.default !== undefined ? JSON.stringify(field.default) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-success inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
