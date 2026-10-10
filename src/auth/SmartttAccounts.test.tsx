import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** VITE_SMARTTT_ACCOUNTS=true: students and lecturers sign in with their SMARTTT account (backend docs/smarttt-accounts.md). */
beforeEach(() => { vi.stubEnv('VITE_SMARTTT_ACCOUNTS', 'true') })
afterEach(() => { vi.unstubAllEnvs() })

describe('signing in with a SMARTTT account', () => {
  it('tells students to use their SMARTTT login, with no Register tab', async () => {
    renderApp('/login?role=student')
    expect(await screen.findByText(/sign in with your smarttt account/i)).toBeInTheDocument()
    expect(screen.getByLabelText('SMARTTT admission number or email')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^register$/i })).not.toBeInTheDocument()
    expect(screen.getByText(/no separate sign-up/i)).toBeInTheDocument()
  })

  it('tells lecturers the same, with no Create an account link', async () => {
    renderApp('/login?role=lecturer')
    expect(await screen.findByLabelText('SMARTTT staff ID or email')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument()
  })

  it('leaves department officers on their attendance password', async () => {
    renderApp('/login?role=department')
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByText(/smarttt/i)).not.toBeInTheDocument()
  })

  it('sends anyone opening sign-up back to sign in, saying why', async () => {
    renderApp('/signup?role=student')
    expect(await screen.findByRole('status')).toHaveTextContent(/there is no separate sign-up for attendance/i)
    expect(screen.getByLabelText('SMARTTT admission number or email')).toBeInTheDocument()
  })

  it('points a forgotten password to SMARTTT, from the sign-in page', async () => {
    const user = userEvent.setup()
    renderApp('/login?role=lecturer')
    await user.click(await screen.findByRole('link', { name: /forgot password/i }))
    expect(await screen.findByRole('heading', { name: /reset it in smarttt/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument()
  })

  it('still lets an officer reset their attendance password', async () => {
    renderApp('/forgot-password?role=faculty')
    expect(await screen.findByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })
})
