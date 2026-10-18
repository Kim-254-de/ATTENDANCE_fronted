import { useCallback, useEffect, useRef, useState } from 'react'

/** A position as POST /attendance/check-in takes it (backend docs/student-app-checkin.md). */
export interface CheckInLocation {
  latitude: number
  longitude: number
  /** Metres, 68% confidence. */
  accuracy: number
  /** When the fix was taken, epoch ms: the server refuses one more than 60 s off its clock. */
  capturedAt: number
}

export type LocationStatus =
  /** Watching; no fix yet. */
  | 'locating'
  /** At least one fix. */
  | 'ready'
  /** The student (or the browser's settings) blocked location for this site. */
  | 'denied'
  /** No geolocation here at all: an old browser, or not https. */
  | 'unavailable'

/** Settle on a fix this precise (the server's limit is 50 m; the fence is 20 m). */
const GOOD_ENOUGH_METRES = 20
/** How long a scan waits for a good fix before sending the best one it has. */
const MAX_WAIT_MS = 10_000
/** Never send a fix older than this; the server allows 60 s, and the request takes a moment. */
const MAX_AGE_MS = 45_000
/** A better-accuracy fix older than this gives way to a newer one: the student may have walked in. */
const PREFER_NEWER_AFTER_MS = 15_000

const isFresh = (fix: CheckInLocation) => Date.now() - fix.capturedAt < MAX_AGE_MS
const isGood = (fix: CheckInLocation) => isFresh(fix) && fix.accuracy <= GOOD_ENOUGH_METRES

/**
 * Watches the device's position for as long as the scanner is open, so a
 * precise GPS fix is usually ready by the time a code is read (the first fix
 * is often a coarse network guess; GPS tightens it over a few seconds).
 *
 * `fixForCheckIn()` resolves with the best fresh fix: at once if one is
 * already good enough, else as soon as one is, else after MAX_WAIT_MS with the
 * best it has. Null when there is none (blocked, unavailable, nothing yet):
 * the check-in is then sent without a location, which a class with no
 * location check accepts and a fenced one answers LOCATION_REQUIRED.
 */
export function useCheckInLocation() {
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation && (typeof window === 'undefined' || window.isSecureContext)
  const [status, setStatus] = useState<LocationStatus>(supported ? 'locating' : 'unavailable')
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const best = useRef<CheckInLocation | null>(null)
  const denied = useRef(false)
  const listeners = useRef(new Set<() => void>())

  useEffect(() => {
    if (!supported) return
    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const fix = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, capturedAt: timestamp }
        const current = best.current
        if (!current || fix.accuracy <= current.accuracy || fix.capturedAt - current.capturedAt > PREFER_NEWER_AFTER_MS) {
          best.current = fix
          setAccuracy(fix.accuracy)
        }
        setStatus('ready')
        listeners.current.forEach((notify) => notify())
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          denied.current = true
          setStatus('denied')
        }
        listeners.current.forEach((notify) => notify())
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [supported])

  const fixForCheckIn = useCallback((): Promise<CheckInLocation | null> => {
    const usable = () => (best.current && isFresh(best.current) ? best.current : null)
    if (!supported || denied.current || (best.current && isGood(best.current))) return Promise.resolve(usable())

    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer)
        listeners.current.delete(check)
        resolve(usable())
      }
      const check = () => {
        if (denied.current || (best.current && isGood(best.current))) done()
      }
      const timer = setTimeout(done, MAX_WAIT_MS)
      listeners.current.add(check)
    })
  }, [supported])

  return { status, accuracy, fixForCheckIn }
}
