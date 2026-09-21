import { setupWorker } from 'msw/browser'
import { dataHandlers, handlers } from './handlers'

// 'true' mocks everything; 'data' leaves /auth/* to the real backend and mocks the rest.
export const worker = setupWorker(...(import.meta.env.VITE_USE_MOCKS === 'data' ? dataHandlers : handlers))
