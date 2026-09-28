import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { openMockSessionForScan } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/setup'

/**
 * jsdom has no camera, so the scanner is replaced by a stand-in that "reads"
 * whatever code the test types — the page under test is everything around it.
 */
vi.mock('@/features/attendance/QrCameraScanner', () => ({
  QrCameraScanner: ({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) => (
    <form onSubmit={(e) => { e.preventDefault(); if (!paused) onScan(new FormData(e.currentTarget).get('code') as string) }}>
      <input name="code" aria-label="Code in view" />
      <button type="submit">Simulate scan</button>
    </form>
  ),
}))

async function signIn(identifier: string, path: string) {
  const user = userEvent.setup()
  renderApp(path)
  // A student page sends a signed-out visitor to the student form ("Registration number or email").
  await user.type(await screen.findByLabelText(/(staff|registration) number or email/i), identifier)
  await user.type(screen.getByLabelText(/password/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

async function scan(user: ReturnType<typeof userEvent.setup>, code: string) {
  const input = await screen.findByLabelText('Code in view')
  await user.clear(input)
  await user.type(input, code)
  await user.click(screen.getByRole('button', { name: 'Simulate scan' }))
}

describe('student QR check-in', () => {
  it('goes from the dashboard to the scanner and marks the student present', async () => {
    const { payload } = openMockSessionForScan('u1')
    const user = await signIn('STU00042', '/student-dashboard')

    await user.click(await screen.findByRole('link', { name: /scan attendance qr code/i }))
    expect(await screen.findByRole('heading', { name: /scan the class qr code/i })).toBeInTheDocument()

    await scan(user, payload)
    expect(await screen.findByText("You're marked present")).toBeInTheDocument()
    expect(screen.getByText(/CS301 · recorded at/)).toBeInTheDocument()
  })

  it('says so when the student has already checked in to that class', async () => {
    const { payload } = openMockSessionForScan('u1')
    const user = await signIn('STU00042', '/scan') // signs in straight back to the scanner
    await scan(user, payload)
    await screen.findByText("You're marked present")

    await user.click(screen.getByRole('link', { name: 'Done' }))
    await user.click(await screen.findByRole('link', { name: /scan attendance qr code/i }))
    await scan(user, payload)
    expect(await screen.findByText('Already checked in')).toBeInTheDocument()
    expect(screen.getByText(/already been recorded/i)).toBeInTheDocument()
  })

  it('keeps the camera open and asks for a rescan when the code has expired', async () => {
    const { expiredPayload, payload } = openMockSessionForScan('u1')
    const user = await signIn('STU00042', '/scan')
    await scan(user, expiredPayload)
    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/i)

    // The camera keeps seeing the stale code: it isn't sent again.
    const sent: string[] = []
    server.events.on('request:start', ({ request }) => { if (request.url.endsWith('/attendance/check-in')) sent.push(request.url) })
    await scan(user, expiredPayload)
    await scan(user, expiredPayload)
    expect(sent).toHaveLength(0)

    // The screen rotates to a fresh code, which goes through.
    await scan(user, payload)
    expect(await screen.findByText("You're marked present")).toBeInTheDocument()
    expect(sent).toHaveLength(1)
    server.events.removeAllListeners()
  })

  it('ignores QR codes that are not attendance codes without calling the server', async () => {
    const user = await signIn('STU00042', '/scan')
    await scan(user, 'WIFI:S:CampusNet;T:WPA;P:secret;;')
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't an attendance code/i)
  })

  it('stops with the reason when the class is not accepting check-ins', async () => {
    const { payload, session } = openMockSessionForScan('u1')
    session.status = 'PAUSED'
    const user = await signIn('STU00042', '/scan')
    await scan(user, payload)
    expect(await screen.findByText('Not checked in')).toBeInTheDocument()
    expect(screen.getByText('This class session is paused.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /scan again/i }))
    expect(await screen.findByLabelText('Code in view')).toBeInTheDocument()
  })

  it('is a student-only page', async () => {
    await signIn('LEC00123', '/scan')
    expect(await screen.findByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /scan the class qr code/i })).not.toBeInTheDocument()
  })
})
