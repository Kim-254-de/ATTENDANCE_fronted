import { z } from 'zod'

/** The backend's passwordSchema rules, checked here first so the common mistakes never round-trip. */
export const newPasswordRule = z
  .string()
  .min(6, 'At least 6 characters.')
  .max(128, 'At most 128 characters.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[0-9]/, 'Include a digit.')

export const NEW_PASSWORD_HINT = 'At least 6 characters, with an uppercase letter, a lowercase letter and a digit.'
