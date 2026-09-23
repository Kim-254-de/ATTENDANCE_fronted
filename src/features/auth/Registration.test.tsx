import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/setup'

async function fillForm(values: Partial<Record<'name' | 'staff' | 'email' | 'password' | 'confirm', string>> = {}) {
  const user = userEvent.setup()
  const v = { name: 'Mary Atieno', staff: 'stf/0002', email: 'Mary.Atieno@uni.ac.ke', password: 'Lecturer-Pass-2026', ...values }
  await user.type(await screen.findByLabelText('Full name'), v.name)
  await user.type(screen.getByLabelText('Staff number'), v.staff)
  await user.type(screen.getByLabelText('School email'), v.email)
  await user.type(screen.getByLabelText('Password'), v.password)
  await user.type(screen.getByLabelText('Confirm password'), values.confirm ?? v.password)
  await user.click(screen.getByRole('button', { name: /register account/i }))
}

describe('lecturer registration', () => {
  it('is reachable from the sign-in page', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    await user.click(await screen.findByRole('link', { name: /create an account/i }))
    expect(await screen.findByRole('heading', { name: /^create account$/i })).toBeInTheDocument()
  })

  it('keeps the old /register link working', async () => {
    renderApp('/register')
    expect(await screen.findByRole('heading', { name: /^create account$/i })).toBeInTheDocument()
  })

  it('checks the password rules before sending anything', async () => {
    let calls = 0
    server.use(http.post('/api/auth/lecturer/register', () => { calls += 1; return HttpResponse.json({}) }))
    renderApp('/signup')
    await fillForm({ password: 'short', confirm: 'different' })
    expect(await screen.findByText('Password must be at least 12 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
  })

  it('rejects a password containing the staff number', async () => {
    renderApp('/signup')
    await fillForm({ password: 'Stf/0002-Password1' })
    expect(await screen.findByText(/must not contain your staff number/i)).toBeInTheDocument()
  })

  it('sends the registration and tells the lecturer to check their email', async () => {
    let body: unknown
    server.use(
      http.post('/api/auth/lecturer/register', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { success: true, data: { id: '1', fullName: 'Mary Atieno', email: 'mary.atieno@uni.ac.ke', staffNumber: 'STF/0002', status: 'PENDING_VERIFICATION', nextStep: 'VERIFY_EMAIL', message: 'Your staff number was verified successfully.' } },
          { status: 201 },
        )
      }),
    )
    renderApp('/signup')
    await fillForm()
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByText('mary.atieno@uni.ac.ke')).toBeInTheDocument()
    expect(body).toEqual({ fullName: 'Mary Atieno', staffNumber: 'stf/0002', email: 'Mary.Atieno@uni.ac.ke', password: 'Lecturer-Pass-2026', confirmPassword: 'Lecturer-Pass-2026' })
  })

  it('shows the ERP rejection when the staff number is not in the staff records', async () => {
    server.use(
      http.post('/api/auth/lecturer/register', () =>
        HttpResponse.json(
          { success: false, error: { code: 'ERP_STAFF_NOT_FOUND', message: 'Registration was not completed. This staff number is not listed in the institutional staff records.' } },
          { status: 403 },
        ),
      ),
    )
    renderApp('/signup')
    await fillForm({ staff: 'STF/9999' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/not listed in the institutional staff records/i)
    expect(screen.queryByRole('heading', { name: /check your email/i })).not.toBeInTheDocument()
  })

  it('puts server-side validation errors on the matching field', async () => {
    server.use(
      http.post('/api/auth/lecturer/register', () =>
        HttpResponse.json(
          { success: false, error: { code: 'VALIDATION_FAILED', message: 'The submitted details are not valid.', details: [{ field: 'email', message: 'Email domain is not allowed.' }] } },
          { status: 400 },
        ),
      ),
    )
    renderApp('/signup')
    await fillForm()
    expect(await screen.findByText('Email domain is not allowed.')).toBeInTheDocument()
    expect(screen.getByLabelText('School email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('email verification link', () => {
  it('confirms the address exactly once', async () => {
    let calls = 0
    server.use(
      http.post('/api/auth/verify-email', () => {
        calls += 1
        return HttpResponse.json({ success: true, data: { status: 'PENDING_APPROVAL', nextStep: 'AWAIT_APPROVAL', message: 'Email confirmed. An administrator will review and approve your account.' } })
      }),
    )
    renderApp('/verify-email?token=abcdefghijklmnopqrstuvwxyz')
    expect(await screen.findByText(/administrator will review/i)).toBeInTheDocument()
    expect(calls).toBe(1)
  })

  it('explains an expired or used link', async () => {
    renderApp('/verify-email?token=expired')
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i)
  })

  it('handles a link with no token', async () => {
    renderApp('/verify-email')
    expect(await screen.findByRole('alert')).toHaveTextContent(/missing its confirmation token/i)
  })
})
