/**
 * Starter Template - Entry Point
 * 
 * Uses RecordRoom-based storage with RBAC and real-time sync.
 * 
 * When running inside the canvas (iframe), Clerk is skipped entirely —
 * auth is handled via postMessage from the parent frame.
 * When deployed as a standalone site, SpacesAuthProvider wraps the tree
 * so Clerk satellite auth works normally.
 */

import { createRoot } from 'react-dom/client'
import { SpacesAuthProvider, PillCoordinatorProvider } from '@spaces/sdk'
import { isWidgetContext } from '@spaces/sdk/auth'
import ChatMount from './chat-mount'
import App from './App'
import './styles.css'

const inWidget = isWidgetContext()

const tree = (
  <PillCoordinatorProvider>
    <App />
    <ChatMount />
  </PillCoordinatorProvider>
)

createRoot(document.getElementById('root')!).render(
  inWidget ? tree : <SpacesAuthProvider>{tree}</SpacesAuthProvider>,
)
