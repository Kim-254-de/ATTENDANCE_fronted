import { AxiosError } from 'axios'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/setup'
import { api, errorMessage } from './api'

describe('api client (backend envelope adapter)', () => {
  it('unwraps { success, data } into the bare object', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ success: true, data: { a: 1 } })))
    expect((await api.get('/thing')).data).toEqual({ a: 1 })
  })

  it('passes non-envelope bodies (the mock handlers) through untouched', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ a: 1 })))
    expect((await api.get('/thing')).data).toEqual({ a: 1 })
  })

  it('turns an error envelope into { message, code } so errorMessage() works unchanged', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect staff number/email or password.' } },
          { status: 401 },
        ),
      ),
    )
    const err = await api.post('/auth/login', {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AxiosError)
    expect((err as AxiosError).response?.data).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Incorrect staff number/email or password.' })
    expect(errorMessage(err)).toBe('Incorrect staff number/email or password.')
  })

  it('on a 401 it refreshes the session once, then replays the request', async () => {
    let calls = 0
    let refreshes = 0
    server.use(
      http.get('/api/lecturer/units', () => (++calls === 1 ? new HttpResponse(null, { status: 401 }) : HttpResponse.json({ success: true, data: ['ok'] }))),
      http.post('/api/auth/refresh', () => { refreshes += 1; return new HttpResponse(null, { status: 204 }) }),
    )
    expect((await api.get('/lecturer/units')).data).toEqual(['ok'])
    expect(refreshes).toBe(1)
    expect(calls).toBe(2)
  })

  it('shares one refresh between simultaneous 401s', async () => {
    let refreshes = 0
    const seen = new Set<string>()
    server.use(
      http.get('/api/a', ({ request }) => (seen.has(request.url) ? HttpResponse.json({ data: 'a' }) : (seen.add(request.url), new HttpResponse(null, { status: 401 })))),
      http.get('/api/b', ({ request }) => (seen.has(request.url) ? HttpResponse.json({ data: 'b' }) : (seen.add(request.url), new HttpResponse(null, { status: 401 })))),
      http.post('/api/auth/refresh', () => { refreshes += 1; return new HttpResponse(null, { status: 204 }) }),
    )
    await Promise.all([api.get('/a'), api.get('/b')])
    expect(refreshes).toBe(1)
  })

  it('gives up (original 401) when the refresh fails, without looping', async () => {
    let calls = 0
    let refreshes = 0
    server.use(
      http.get('/api/lecturer/units', () => { calls += 1; return new HttpResponse(null, { status: 401 }) }),
      http.post('/api/auth/refresh', () => { refreshes += 1; return new HttpResponse(null, { status: 401 }) }),
    )
    const err = await api.get('/lecturer/units').catch((e: unknown) => e)
    expect((err as AxiosError).response?.status).toBe(401)
    expect(calls).toBe(1)
    expect(refreshes).toBe(1)
  })

  it('never tries to refresh for a failed sign-in', async () => {
    let refreshes = 0
    server.use(
      http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => { refreshes += 1; return new HttpResponse(null, { status: 204 }) }),
    )
    await api.post('/auth/login', {}).catch(() => undefined)
    expect(refreshes).toBe(0)
  })
})
