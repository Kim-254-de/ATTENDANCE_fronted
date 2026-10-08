import { AxiosError } from 'axios'
import { IdCard, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FaceCamera } from '@/components/FaceCamera'
import { errorMessage } from '@/lib/api'
import type { Allocation, ApiErrorBody } from '@/types'
import { useEnrollFace } from '@/portals/lecturer/attendance/faceApi'

/** Must match ENROLLMENT_PHOTOS in the backend's verification.schema.ts. */
const PHOTOS = 3
const PROMPTS = ['Looking straight at the camera', 'Head turned slightly left', 'Head turned slightly right']

/**
 * Registers one student's face from three photos taken on the lecturer's
 * phone. The lecturer vouches for who it is by checking their student ID, so
 * that step is spelled out first. The backend refuses photos that don't show
 * one clear face, don't agree with each other, or match another student.
 */
export function FaceEnrollDialog({ unitId, student, onClose, onDone }: {
  unitId: string
  student: Allocation & { studentUserId: string }
  onClose: () => void
  onDone: (message: string) => void
}) {
  const enroll = useEnrollFace(unitId)
  const [photos, setPhotos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const name = student.fullName ?? 'this student'

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    setError(null)
    enroll.mutate({ studentUserId: student.studentUserId, images: photos }, {
      onSuccess: (result) => onDone(`${name}'s face is ${result.replaced ? 're-registered' : 'registered'}.`),
      onError: (err) => {
        setError(errorMessage(err, 'The photos could not be saved. Try again.'))
        const body = err instanceof AxiosError ? (err.response?.data as ApiErrorBody | undefined) : undefined
        const bad = (body?.details as { photo?: number } | undefined)?.photo
        // Retake only the photo the server pointed at; when the set as a whole was refused, start over.
        if (bad) setPhotos((p) => p.filter((_, i) => i !== bad - 1))
        else if (body?.code === 'FACE_PHOTOS_INCONSISTENT') setPhotos([])
      },
    })
  }

  const done = photos.length >= PHOTOS

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/80 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="enroll-title" className="mx-auto max-w-md space-y-4 rounded-2xl bg-navy-950 p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="enroll-title" className="text-lg font-bold">Register face: {name}</h2>
            {student.registrationNumber && <p className="font-mono text-xs text-sky-300">{student.registrationNumber}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-sm text-sky-100">
          <IdCard className="mt-0.5 size-4 shrink-0" aria-hidden />
          Check their student ID card first. This face will check them in to all their classes.
        </p>

        <ol className="grid grid-cols-3 gap-2" aria-label="Photos">
          {Array.from({ length: PHOTOS }, (_, i) => (
            <li key={i} className="space-y-1 text-center text-[11px] text-sky-300">
              {photos[i] ? (
                <button
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="block aspect-[3/4] w-full overflow-hidden rounded-lg ring-2 ring-emerald-400"
                  aria-label={`Retake photo ${i + 1}`}
                  disabled={enroll.isPending}
                >
                  <img src={photos[i]} alt="" className="size-full object-cover" />
                </button>
              ) : (
                <span className={`block aspect-[3/4] w-full rounded-lg border-2 border-dashed ${i === photos.length ? 'border-sky-300' : 'border-white/20'}`} />
              )}
              <span className="block leading-tight">{PROMPTS[i]}</span>
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-100">{error}</p>}

        {done ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-sky-300">Tap a photo to retake it.</p>
            <Button variant="lecturer" className="w-full" onClick={save} loading={enroll.isPending}>
              Save face
            </Button>
          </div>
        ) : (
          <FaceCamera
            onCapture={(image) => { setError(null); setPhotos((p) => [...p, image].slice(0, PHOTOS)) }}
            captureLabel={`Take photo ${photos.length + 1} of ${PHOTOS}`}
          />
        )}
      </div>
    </div>
  )
}
