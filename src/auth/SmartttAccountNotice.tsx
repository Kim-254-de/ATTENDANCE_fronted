/**
 * With SMARTTT accounts on, students and lecturers have no attendance
 * account of their own to create: the one they use for SMARTTT is it.
 */
export function SmartttAccountNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-sm leading-6 text-muted ${className}`}>
      No account yet? Create one in <strong className="text-navy-900">SMARTTT</strong> first, then sign in here with the same
      details. There is no separate sign-up for attendance.
    </p>
  )
}
