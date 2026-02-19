/**
 * ChatMount — No-op stub for canvas and non-chat deployments.
 *
 * This placeholder satisfies the import in main.tsx without pulling in
 * any chat dependencies. During deployment with chat enabled, the build
 * pipeline replaces this file with the real implementation from build-env.
 */

export default function ChatMount(): null {
  return null
}
