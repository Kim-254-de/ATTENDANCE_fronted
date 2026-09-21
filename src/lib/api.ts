import axios, { AxiosError } from 'axios'
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
