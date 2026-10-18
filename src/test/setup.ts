import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { handlers, resetMocks } from '@/mocks/handlers'

// The mock API answers after realistic delays (sign-in alone takes 450 ms) and pages are
// lazy-loaded, so the default 1 s wait for a findBy* is too tight when the whole suite runs at once.
configure({ asyncUtilTimeout: 4000 })

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// Whatever .env.local says: tests use attendance-held accounts unless they
// switch SMARTTT accounts on themselves (src/auth/SmartttAccounts.test.tsx).
beforeEach(() => { vi.stubEnv('VITE_SMARTTT_ACCOUNTS', 'false') })
afterEach(() => {
  server.resetHandlers()
  resetMocks()
})
afterAll(() => server.close())

// jsdom has no canvas; qrcode.react only needs a no-op context in tests.
HTMLCanvasElement.prototype.getContext = (() => null) as never
