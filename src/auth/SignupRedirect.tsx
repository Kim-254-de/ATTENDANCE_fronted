import { Navigate, useSearchParams } from 'react-router-dom'

/** Sends an old sign-up link to the matching sign-in page, saying why. */
export function SignupRedirect() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') === 'student' ? 'student' : 'lecturer'
  return (
    <Navigate
      to={`/login?role=${role}`}
      replace
      state={{ message: 'There is no separate sign-up for attendance. Sign in with your SMARTTT account; if you have none, create it in SMARTTT first.' }}
    />
  )
}
