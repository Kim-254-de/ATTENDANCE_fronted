import { setupWorker } from 'msw/browser'
import { dataHandlers, handlers } from './handlers'

// 'true' mocks everything; 'data' mocks only dataHandlers (none today, so every request reaches the backend).
export const worker = setupWorker(...(import.meta.env.VITE_USE_MOCKS === 'data' ? dataHandlers : handlers))
