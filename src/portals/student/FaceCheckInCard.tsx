import { ScanFace } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useMyFaceStatus, useSetFaceConsent } from './faceApi'

const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * The student's consent to face check-in. Their face is sensitive personal
 * data, so it is off until they turn it on here; only then can a lecturer
 * register their face, in class. Turning it off deletes the registered face.
 * The QR code works either way.
 */
export function FaceCheckInCard() {
  const { data: status, isPending, error } = useMyFaceStatus()
  const setConsent = useSetFaceConsent()
  const [agreeing, setAgreeing] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const turnOff = () => {
    if (!window.confirm('Turn off face check-in? Your registered face will be deleted. You can still check in by scanning the QR code.')) return
    setConsent.mutate(false)
  }

  return (
    <Card className="space-y-4 p-6" aria-labelledby="face-checkin-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><ScanFace className="size-5" aria-hidden /></span>
        <div>
          <h2 id="face-checkin-title" className="font-semibold text-navy-900">Face check-in</h2>
          <p className="mt-0.5 text-sm text-muted">
            If you can't scan the QR code, your lecturer can check you in by photographing your face on their phone.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">{errorMessage(error, 'Could not load your face check-in settings.')}</p>
      ) : isPending || !status ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : status.consentGiven ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
            <b>On.</b>{' '}
            {status.enrolled && status.enrolledAt
              ? `Your face was registered on ${formatDate(status.enrolledAt)}.`
              : 'Your face isn\'t registered yet. Your lecturer will take your photo in class.'}
          </p>
          <Button variant="danger" className="w-full" onClick={turnOff} loading={setConsent.isPending}>
            Turn off and delete my face data
          </Button>
        </div>
      ) : agreeing ? (
        <div className="space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            <li>Your lecturer will take three photos of your face, after checking your student ID.</li>
            <li>Only a numerical template of your face is kept, not the photos. It is used only to check you in to your own classes.</li>
            <li>You can turn this off at any time here, which deletes your face data straight away.</li>
          </ul>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-blue-600" />
            I agree to my face being used to check me in to class.
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setAgreeing(false); setAgreed(false) }}>Cancel</Button>
            <Button variant="accent" disabled={!agreed} loading={setConsent.isPending} onClick={() => setConsent.mutate(true, { onSuccess: () => setAgreeing(false) })}>
              Turn on
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted"><b className="text-ink">Off.</b> You check in by scanning the QR code only.</p>
          <Button variant="accent" className="w-full" onClick={() => setAgreeing(true)}>Turn on face check-in</Button>
        </div>
      )}
      {setConsent.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(setConsent.error)}</p>}
    </Card>
  )
}
