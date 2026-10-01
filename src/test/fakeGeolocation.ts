/**
 * jsdom has no GPS. This stand-in reports each fix in `fixes` (accuracy
 * in metres) a few milliseconds apart, the way a phone's first coarse guess
 * tightens into a GPS fix; `'denied'` is a student who blocked location.
 */
export function fakeGeolocation(fixes: number[] | 'denied') {
  const timers: ReturnType<typeof setTimeout>[] = []
  const geolocation = {
    watchPosition: (onFix: PositionCallback, onError?: PositionErrorCallback | null) => {
      if (fixes === 'denied') {
        timers.push(setTimeout(() => onError?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'denied' } as GeolocationPositionError)))
      } else {
        fixes.forEach((accuracy, i) => timers.push(setTimeout(() => onFix({
          coords: { latitude: -0.3703, longitude: 35.9322, accuracy },
          timestamp: Date.now(),
        } as GeolocationPosition), 10 + i * 50)))
      }
      return 1
    },
    clearWatch: () => timers.forEach(clearTimeout),
  }
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
  // The browser only offers location over https; jsdom's page isn't.
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
}
