import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/** Shown for render crashes and failed lazy chunks instead of a blank page. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV && !notFound) console.error(error)

  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-navy-900">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="text-sm text-muted">
          {notFound ? 'The page you’re looking for doesn’t exist.' : 'An unexpected error occurred. Reloading usually fixes it — if not, contact IT support.'}
        </p>
        <div className="flex justify-center gap-3">
          {!notFound && <Button onClick={() => window.location.reload()}>Reload</Button>}
          <Link to="/" className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-navy-900">Go to dashboard</Link>
        </div>
      </div>
    </main>
  )
}
