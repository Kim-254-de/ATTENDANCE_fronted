import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody } from '@/types'
import { env } from './env'

/**
 * Auth uses an httpOnly session cookie set by the API, so no token is ever
 * readable from JavaScript (mitigates XSS token theft). Because the browser
 * attaches that cookie automatically, mutating requests also carry a CSRF
 * token: the API sets an `XSRF-TOKEN` cookie and expects it echoed back in
 * the `X-XSRF-TOKEN` header.
 */
export const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
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
  error?: { code?: string; message?: string; details?: unknown }
}
const isEnvelope = (v: unknown): v is Envelope =>
  typeof v === 'object' && v !== null && typeof (v as Envelope).success === 'boolean'

/** Auth calls must never trigger a refresh-and-retry (that would loop or hide real failures). */
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/lecturer/register', '/auth/verify-email']

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
      error.response!.data = { message: body.error.message ?? 'Something went wrong.', code: body.error.code, details: body.error.details }
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
    if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (!err.response) return 'Cannot reach the server. Check your connection.'
    if (err.response.status === 429) return 'Too many attempts. Please wait a moment and try again.'
    const body = err.response.data as ApiErrorBody | undefined
    // A coded 5xx came from our API, which only ever sends safe, user-facing messages (e.g.
    // ERP_UNAVAILABLE explains the staff records system is down). An uncoded one is a proxy page.
    if (err.response.status >= 500) return body?.code && body.message ? body.message : 'The server had a problem. Please try again shortly.'
    return body?.message ?? fallback
  }
  return fallback
}

/** Per-field messages from a 400 VALIDATION_FAILED, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof AxiosError)) return {}
  const details = (err.response?.data as ApiErrorBody | undefined)?.details
  if (!Array.isArray(details)) return {}
  return Object.fromEntries(details.map((d) => [d.field, d.message]))
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 401
}
