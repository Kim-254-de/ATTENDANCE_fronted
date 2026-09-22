import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ME_KEY } from '@/features/auth/authApi'
import { isUnauthorized } from './api'

export function makeQueryClient() {
  // A 401 from any call other than the auth check means the session expired
  // mid-use: re-check the session so RequireAuth sends the user to /login.
  const onUnauthorized = (err: unknown) => {
    if (isUnauthorized(err)) void client.invalidateQueries({ queryKey: ME_KEY })
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (err, q) => q.queryKey[0] !== 'auth' && onUnauthorized(err) }),
    mutationCache: new MutationCache({ onError: (err, _v, _c, m) => m.options.mutationKey?.[0] !== 'login' && onUnauthorized(err) }),
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  })
  return client
}
