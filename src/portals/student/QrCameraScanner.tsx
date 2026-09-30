import { CameraOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Called with the text of each QR code read. Not called while `paused`. */
  onScan: (text: string) => void
  /** Stops reading without releasing the camera, e.g. while a check-in is being submitted. */
  paused?: boolean
}

type CameraProblem = 'insecure' | 'denied' | 'no-camera' | 'failed'

/** Browsers only expose the camera on https (or localhost). */
const insecureContext = () => typeof window !== 'undefined' && !window.isSecureContext

const PROBLEM_TEXT: Record<CameraProblem, string> = {
  insecure: 'The camera only works over a secure (https) connection. Open this page from the official https address.',
  denied: 'Camera access was blocked. Allow camera access for this site in your browser settings, then reload the page.',
  'no-camera': 'No camera was found on this device.',
  failed: 'The camera could not be started. Close other apps using the camera and try again.',
}

/**
 * The phone's back camera, reading QR codes. Uses `qr-scanner`, loaded only
 * when this component mounts, which decodes in a web worker so the page stays
 * responsive. The camera is released when the component unmounts.
 */
export function QrCameraScanner({ onScan, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  const pausedRef = useRef(paused)
  const [problem, setProblem] = useState<CameraProblem | null>(() => (insecureContext() ? 'insecure' : null))
  const [starting, setStarting] = useState(() => !insecureContext())

  useEffect(() => { onScanRef.current = onScan }, [onScan])
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    if (insecureContext()) return

    let cancelled = false
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null

    void (async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner')
        if (cancelled || !videoRef.current) return
        if (!(await QrScanner.hasCamera())) {
          if (!cancelled) setProblem('no-camera')
          return
        }
        const instance = new QrScanner(
          videoRef.current,
          (result: { data: string }) => { if (!pausedRef.current) onScanRef.current(result.data) },
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
            // qr-scanner only looks at the middle 2/3 by default, so a code that fills the
            // view (a student standing close to the screen) was never read. Use 90% of it.
            calculateScanRegion: (video: HTMLVideoElement) => {
              const size = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.9)
              return {
                x: Math.round((video.videoWidth - size) / 2),
                y: Math.round((video.videoHeight - size) / 2),
                width: size,
                height: size,
                downScaledWidth: 480,
                downScaledHeight: 480,
              }
            },
          },
        )
        scanner = instance
        await instance.start()
        if (cancelled) instance.destroy()
      } catch (error) {
        if (cancelled) return
        const name = error instanceof Error ? error.name : String(error)
        setProblem(/NotAllowed|Permission/i.test(name) ? 'denied' : /NotFound|no camera/i.test(name) ? 'no-camera' : 'failed')
      } finally {
        if (!cancelled) setStarting(false)
      }
    })()

    return () => {
      cancelled = true
      scanner?.destroy()
    }
  }, [])

  if (problem) {
    return (
      <div role="alert" className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl bg-navy-900 p-6 text-center text-white">
        <CameraOff className="size-8 text-gold-300" aria-hidden />
        <p className="text-sm leading-6">{PROBLEM_TEXT[problem]}</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-navy-900">
      <video ref={videoRef} className="size-full object-cover" muted playsInline aria-label="Camera view for scanning the attendance QR code" />
      {starting && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-blue-200">Starting camera…</p>}
    </div>
  )
}
