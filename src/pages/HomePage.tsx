/**
 * Home Page
 * 
 * A simple welcome page. Replace with your app's main content.
 * 
 * See features/ directory for example pages:
 * - ItemsPage.tsx - Basic CRUD with ownership
 * - TasksPage.tsx - Claimable tasks with grading
 * - TeamsPage.tsx - Team collaboration with Yjs
 * - AdminPage.tsx - User management
 */

import { useUser } from '@spaces/sdk/storage'

export default function HomePage() {
  const { user } = useUser()

  return (
    <div className="h-full bg-surface overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Welcome */}
          <h1 className="text-3xl font-bold text-content mb-4">
            Welcome{user?.name ? `, ${user.name}` : ''}!
          </h1>
          
          <p className="text-content-secondary mb-8">
            This is your app. Start building something amazing.
          </p>
          
          {/* Getting Started */}
          <div className="bg-surface-elevated/60 rounded-xl border border-border p-6 text-left">
            <h2 className="text-lg font-semibold text-content mb-4">Getting Started</h2>
            
            <ul className="space-y-3 text-content-secondary text-sm">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">1.</span>
                <span>Edit <code className="text-primary bg-surface-overlay px-1.5 py-0.5 rounded text-xs">src/schemas.ts</code> to define your data collections</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">2.</span>
                <span>Create pages in <code className="text-primary bg-surface-overlay px-1.5 py-0.5 rounded text-xs">src/pages/</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-0.5">3.</span>
                <span>Add routes in <code className="text-primary bg-surface-overlay px-1.5 py-0.5 rounded text-xs">src/App.tsx</code></span>
              </li>
            </ul>
            
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-content-muted">
                See <code className="text-primary">features/</code> for example code you can copy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
