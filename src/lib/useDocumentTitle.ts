import { useEffect } from 'react'
import { useMatches } from 'react-router-dom'

/**
 * Sets the browser tab title from the matched route's `handle.title` (see routes.tsx), falling
 * back to `fallback` on a route that doesn't set one. Call from a layout rendered inside the
 * router (e.g. AppLayout, StudentLayout) — useMatches needs the router context.
 */
export function useDocumentTitle(fallback: string) {
  const matches = useMatches()
  const routeTitle = [...matches].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)
  const title = routeTitle ?? fallback
  useEffect(() => {
    document.title = `${title} · Smart Attendance`
  }, [title])
}
