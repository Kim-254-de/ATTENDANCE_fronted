import '@testing-library/jest-dom/vitest'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { handlers, resetMocks } from '@/mocks/handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMocks()
})
afterAll(() => server.close())

// jsdom has no canvas; qrcode.react only needs a no-op context in tests.
HTMLCanvasElement.prototype.getContext = (() => null) as never
