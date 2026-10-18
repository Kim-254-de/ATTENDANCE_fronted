import type { DeviceLocation } from '@/types'

/**
 * The most precise position the device gives within `timeoutMs`.
 *
 * A phone's first fix is often its coarse Wi-Fi/cell guess (100 m+); GPS
 * tightens it over the next few seconds. So this watches the position and
 * keeps the best reading, settling early once it is within `goodEnoughMetres`.
 * `onReading` reports each improvement so the screen can show progress.
 *
 * Rejects with a message fit to show the lecturer when location is
 * unavailable, blocked, or produced nothing in time.
 */
export function bestPosition({
  goodEnoughMetres = 15,
  timeoutMs = 20_000,
  onReading,
}: {
  goodEnoughMetres?: number
  timeoutMs?: number
  onReading?: (reading: DeviceLocation) => void
} = {}): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share its location.'))
      return
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(new Error('Location only works over a secure (https://) connection.'))
      return
    }

    let best: DeviceLocation | null = null
    const finish = () => {
      navigator.geolocation.clearWatch(watchId)
      clearTimeout(timer)
      if (best) resolve(best)
      else reject(new Error('Could not get a location fix. Move nearer a window and try again.'))
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (best && coords.accuracy >= best.accuracy) return
        best = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }
        onReading?.(best)
        if (coords.accuracy <= goodEnoughMetres) finish()
      },
      (error) => {
        navigator.geolocation.clearWatch(watchId)
        clearTimeout(timer)
        reject(new Error(
          error.code === error.PERMISSION_DENIED
            ? 'Location is blocked for this site. Allow it in your browser settings, then try again.'
            : 'Could not get a location fix. Check that location is on, then try again.',
        ))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    )
    const timer = setTimeout(finish, timeoutMs)
  })
}
