import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { openMockSessionForScan } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

/** jsdom has no camera: the scanner "reads" whatever the test types (same stand-in as Scan.test.tsx). */
vi.mock('@/features/attendance/QrCameraScanner', () => ({
  QrCameraScanner: ({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) => (
    <form onSubmit={(e) => { e.preventDefault(); if (!paused) onScan(new FormData(e.currentTarget).get('code') as string) }}>
      <input name="code" aria-label="Code in view" />
      <button type="submit">Simulate scan</button>
    </form>
  ),
}))

async function signInAsStudent(path = '/student-dashboard') {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/registration number or email/i), 'STU00042')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('student dashboard', () => {
  it("shows the student's units, attendance rate and recent classes from the API", async () => {
    await signInAsStudent()

    const unitsSection = await screen.findByRole('region', { name: 'My units' })
    const cs301 = (await within(unitsSection).findByText('CS301')).closest('li')!
    expect(within(cs301).getByText('100%')).toBeInTheDocument()
    expect(within(cs301).getByText('2 of 2 classes')).toBeInTheDocument()
    const cs405 = within(unitsSection).getByText('CS405').closest('li')!
    expect(within(cs405).getByText('0%')).toBeInTheDocument()

    // 2 of the 3 recent classes attended.
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    const recent = screen.getByRole('region', { name: 'Recent classes' })
    expect(within(recent).getAllByText('Present')).toHaveLength(2)
    expect(within(recent).getByText('Absent')).toBeInTheDocument()
  })

  it('offers "Scan now" for an open class, and shows it attended right after the scan', async () => {
    const { payload } = openMockSessionForScan('u1')
    const user = await signInAsStudent()
    const recent = await screen.findByRole('region', { name: 'Recent classes' })
    // Still open and not scanned: not counted against the student yet.
    expect(within(await screen.findByRole('region', { name: 'My units' })).getByText('2 of 2 classes')).toBeInTheDocument()
    await user.click(await within(recent).findByRole('link', { name: /scan now/i }))

    await user.type(await screen.findByLabelText('Code in view'), payload)
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }))
    await user.click(await screen.findByRole('link', { name: 'Done' }))

    // Units were cached for a minute before the scan; the check-in refetched them.
    expect(await within(await screen.findByRole('region', { name: 'My units' })).findByText('3 of 3 classes')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Recent classes' })).queryByRole('link', { name: /scan now/i })).not.toBeInTheDocument()
  })
})

describe('student registration errors', () => {
  async function fillForm(user: ReturnType<typeof userEvent.setup>, reg: string) {
    await user.type(await screen.findByLabelText(/registration number/i), reg)
    await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
    await user.type(screen.getByLabelText(/^email/i), 'amina@students.tharaka.ac.ke')
    await user.type(screen.getByLabelText(/^password$/i), 'StudentPass123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'StudentPass123')
    await user.click(screen.getByRole('button', { name: /register as student/i }))
  }

  it('shows the records check refusal from the server', async () => {
    const user = userEvent.setup()
    renderApp('/signup?role=student')
    await fillForm(user, 'EBT1/99999/23')
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in the student records/i)
  })

  it('catches a password containing the registration number before sending', async () => {
    const user = userEvent.setup()
    renderApp('/signup?role=student')
    await user.type(await screen.findByLabelText(/registration number/i), 'EBT1/08223/23')
    await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
    await user.type(screen.getByLabelText(/^email/i), 'amina@students.tharaka.ac.ke')
    await user.type(screen.getByLabelText(/^password$/i), 'Ebt10822323xyZ')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Ebt10822323xyZ')
    await user.click(screen.getByRole('button', { name: /register as student/i }))
    expect(await screen.findByText(/must not contain your registration number/i)).toBeInTheDocument()
  })
})
