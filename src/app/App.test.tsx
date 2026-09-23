import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/setup'
import { errorMessage } from '@/lib/api'
import { formatCountdown, initials } from '@/lib/format'

describe('lecturer portal', () => {
  it('redirects unauthenticated users to login and rejects bad credentials', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('heading', { name: /lecturer portal/i })

    await user.type(screen.getByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  })

  it('signs in, shows stats and activates a class', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(await screen.findByText('QR-CS301-0908')).toBeInTheDocument()
    expect(screen.getAllByText('90%', { selector: 'span' })).toHaveLength(2)

    const activate = screen.getByRole('button', { name: /activate class/i })
    expect(activate).toBeDisabled()

    const select = screen.getByLabelText('Unit')
    await waitFor(() => expect(screen.getByRole('option', { name: /CS301/ })).toBeInTheDocument())
    await user.selectOptions(select, 'u1')
    await user.click(activate)

    expect(await screen.findByText('CS301')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^pause$/i })).toBeEnabled()
    expect(await screen.findByRole('timer')).toHaveTextContent(/refreshes in/i)
  })

  it('opens the profile and saves updated lecturer details', async () => {
    const user = userEvent.setup()
    renderApp('/profile')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /your profile/i })).toBeInTheDocument()
    const name = screen.getByLabelText('Full name')
    await user.clear(name)
    await user.type(name, 'Dr. Joseph Osei')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated')).toBeInTheDocument()
    expect(screen.getAllByText('Dr. Joseph Osei').length).toBeGreaterThan(0)
  })

  it('opens the student profile with a student account', async () => {
    const user = userEvent.setup()
    renderApp('/student-profile')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'STU00042')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /student profile/i })).toBeInTheDocument()
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument()
    expect(screen.getAllByText('STU00042').length).toBeGreaterThan(0)
  })

  it('registers a student and routes the new account to its dashboard and profile', async () => {
    const user = userEvent.setup()
    renderApp('/signup?role=student')
    await user.type(await screen.findByLabelText(/school email/i), 'new.student@university.edu')
    await user.type(screen.getByLabelText(/full name/i), 'New Student')
    await user.type(screen.getByLabelText(/student number/i), 'STU00999')
    await user.type(screen.getByLabelText(/^password$/i), 'studentpass')
    await user.type(screen.getByLabelText(/confirm password/i), 'studentpass')
    await user.click(screen.getByRole('button', { name: /register as student/i }))

    expect(await screen.findByRole('heading', { name: /student sign in/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/student number or email/i), 'STU00999')
    await user.type(screen.getByLabelText(/password/i), 'studentpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /good morning, new/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my profile/i })).toHaveAttribute('href', '/student-profile')
  })

  it('sends the user back to login when the session expires mid-use', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await screen.findByText('86.4%')

    // The server-side session expires while the page is open.
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 })),
      http.post('/api/sessions', () => HttpResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 })),
    )
    await waitFor(() => expect(screen.getByRole('option', { name: /CS301/ })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Unit'), 'u1')
    await user.click(screen.getByRole('button', { name: /activate class/i }))
    expect(await screen.findByRole('heading', { name: /lecturer portal/i })).toBeInTheDocument()
  })

  it('shows a friendly page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

  it('shows a failed ERP sync instead of claiming everything is fine', async () => {
    server.use(
      http.get('/api/lecturer/overview', () =>
        HttpResponse.json({ totalStudents: 1, unitsTaught: 1, avgAttendance: 50, sessionsHeld: 1, periodLabel: 'Sep 2026', erpSync: { status: 'failed', lastSyncedAt: new Date().toISOString() } }),
      ),
    )
    const user = userEvent.setup()
    renderApp('/')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect((await screen.findAllByText(/ERP Sync Failed/i)).length).toBeGreaterThan(0)
  })
})

describe('helpers', () => {
  it('formats countdowns, initials and errors', () => {
    expect(formatCountdown(65_000)).toBe('01:05')
    expect(formatCountdown(-5)).toBe('00:00')
    expect(initials('Dr. Joseph K. Osei')).toBe('JK')
    expect(errorMessage(new Error('x'))).toMatch(/something went wrong/i)
  })
})
