import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody } from '@/types'

/**
 * Auth uses an httpOnly session cookie set by the API, so no token is ever
 * readable from JavaScript (mitigates XSS token theft).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  timeout: 15_000,
})

/**
 * The real backend wraps every response: `{ success: true, data }` or
 * `{ success: false, error: { code, message } }`. The rest of the app works with bare
 * objects and `{ message, code }` errors (which the mock handlers also return), so the
 * translation happens here, once. Anything that is not an envelope passes through untouched.
 */
interface Envelope {
  success: boolean
  data?: unknown
  error?: { code?: string; message?: string }
}
const isEnvelope = (v: unknown): v is Envelope =>
  typeof v === 'object' && v !== null && typeof (v as Envelope).success === 'boolean'

/** Auth calls must never trigger a refresh-and-retry (that would loop or hide real failures). */
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout']

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean }
let refreshing: Promise<unknown> | null = null

api.interceptors.response.use(
  (res) => {
    if (isEnvelope(res.data)) res.data = res.data.data ?? null
    return res
  },
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) throw error

    const body = error.response?.data
    if (isEnvelope(body) && body.error) {
      error.response!.data = { message: body.error.message ?? 'Something went wrong.', code: body.error.code }
    }

    // The access token lasts ~15 minutes. On a 401, quietly trade the refresh cookie for a new
    // one and replay the request once; only if that fails does the user see a sign-in screen.
    const config = error.config as Retriable | undefined
    const canRefresh =
      error.response?.status === 401 && config && !config._retried && !NO_REFRESH.some((p) => config.url?.startsWith(p))
    if (canRefresh) {
      config._retried = true
      refreshing ??= api.post('/auth/refresh').finally(() => { refreshing = null })
      try {
        await refreshing
        return await api.request(config)
      } catch {
        throw error
      }
    }
    throw error
  },
)

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof AxiosError) {
    if (!err.response) return 'Cannot reach the server. Check your connection.'
    return (err.response.data as ApiErrorBody | undefined)?.message ?? fallback
  }
  return fallback
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 401
}
