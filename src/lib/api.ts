import axios, { AxiosError } from 'axios'
import type { ApiErrorEnvelope } from '@/types'
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

/** The API wraps every success response as `{ success: true, data }`; callers only care about `data`. */
api.interceptors.response.use((response) => {
  const body = response.data as { success?: boolean; data?: unknown } | undefined
  if (body && typeof body === 'object' && body.success === true) response.data = body.data
  return response
})

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    if (!err.response) return 'Cannot reach the server. Check your connection.'
    if (err.response.status === 429) return 'Too many attempts. Please wait a moment and try again.'
    if (err.response.status >= 500) return 'The server had a problem. Please try again shortly.'
    return (err.response.data as ApiErrorEnvelope | undefined)?.error?.message ?? fallback
  }
  return fallback
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof AxiosError && err.response?.status === 401
}
