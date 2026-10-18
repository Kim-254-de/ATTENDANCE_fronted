import { Camera, CameraOff, SwitchCamera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Called with a JPEG data URL of the current frame when the capture button is pressed. */
  onCapture: (image: string) => void
  /** Label of the capture button, e.g. "Identify" or "Take photo 2 of 3". */
  captureLabel: string
  /** Disables capturing (not the camera), e.g. while a photo is being checked. */
  disabled?: boolean
  /** Which camera to start with. The lecturer photographs the student, so the back one by default. */
  initialFacing?: 'environment' | 'user'
}

type CameraProblem = 'insecure' | 'denied' | 'no-camera' | 'failed'

const insecureContext = () => typeof window !== 'undefined' && !window.isSecureContext

const PROBLEM_TEXT: Record<CameraProblem, string> = {
  insecure: 'The camera only works over a secure (https) connection. Open this page from the official https address.',
  denied: 'Camera access was blocked. Allow camera access for this site in your browser settings, then reload the page.',
  'no-camera': 'No camera was found on this device.',
  failed: 'The camera could not be started. Close other apps using the camera and try again.',
}

/**
 * Long side of a captured frame. Plenty for a face at arm's length, and keeps
 * a photo to ~100 KB, well under the API's limit (verification.schema.ts).
 */
const MAX_SIDE_PX = 720
const JPEG_QUALITY = 0.85

/**
 * A live camera view with a capture button, for face check-in and face
 * registration. The camera is released when the component unmounts.
 *
 * The preview of the front camera is mirrored, as people expect a selfie view
 * to be; the captured photo never is.
 */
export function FaceCamera({ onCapture, captureLabel, disabled = false, initialFacing = 'environment' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [facing, setFacing] = useState(initialFacing)
  const [problem, setProblem] = useState<CameraProblem | null>(() => (insecureContext() ? 'insecure' : null))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (insecureContext()) return
    let cancelled = false
    let stream: MediaStream | null = null

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no camera'), { name: 'NotFoundError' })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        if (!cancelled) setReady(true)
      } catch (error) {
        if (cancelled) return
        const name = error instanceof Error ? error.name : String(error)
        setProblem(/NotAllowed|Permission/i.test(name) ? 'denied' : /NotFound|Overconstrained/i.test(name) ? 'no-camera' : 'failed')
      }
    })()

    return () => {
      cancelled = true
      setReady(false)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [facing])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
  }

  if (problem) {
    return (
      <div role="alert" className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-navy-900 p-6 text-center text-white">
        <CameraOff className="size-8 text-blue-200" aria-hidden />
        <p className="text-sm leading-6">{PROBLEM_TEXT[problem]}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-navy-900">
        <video
          ref={videoRef}
          className={`size-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          muted
          playsInline
          aria-label="Camera view"
        />
        {/* Where to put the face: a guide, not a crop. */}
        <div className="pointer-events-none absolute inset-x-[18%] top-[14%] bottom-[22%] rounded-[50%] border-2 border-dashed border-white/50" aria-hidden />
        {!ready && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-blue-200">Starting camera…</p>}
        <button
          type="button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          aria-label="Switch camera"
        >
          <SwitchCamera className="size-5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={capture}
        disabled={disabled || !ready}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-navy-900 shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Camera className="size-5" aria-hidden /> {captureLabel}
      </button>
    </div>
  )
}
