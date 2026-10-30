import { useCallback, useSyncExternalStore } from 'react'

/**
 * The current time in ms, rounded down to `stepMs` and re-rendering once per step. Reading the
 * clock through this, never `Date.now()` in render, keeps renders pure and lets a screen notice
 * on its own when a deadline passes.
 */
export function useNow(stepMs = 1000): number {
  const subscribe = useCallback(
    (notify: () => void) => {
      const id = setInterval(notify, stepMs)
      return () => clearInterval(id)
    },
    [stepMs],
  )
  const snapshot = useCallback(() => Math.floor(Date.now() / stepMs) * stepMs, [stepMs])
  return useSyncExternalStore(subscribe, snapshot)
}
