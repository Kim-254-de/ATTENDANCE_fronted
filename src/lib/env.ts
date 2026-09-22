import { z } from 'zod'

const schema = z.object({
  VITE_API_URL: z.string().min(1).default('/api'),
  VITE_USE_MOCKS: z.enum(['true', 'false']).default('false'),
})

const parsed = schema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
}
// Mock data in a production bundle would silently fake attendance records.
if (import.meta.env.PROD && parsed.data.VITE_USE_MOCKS === 'true') {
  throw new Error('VITE_USE_MOCKS=true is not allowed in a production build.')
}

export const env = { apiUrl: parsed.data.VITE_API_URL }
