import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { openMockSessionForScan } from '@/mocks/handlers'
import { fakeGeolocation } from '@/test/fakeGeolocation'
import { renderApp } from '@/test/renderApp'

/** jsdom has no camera: the scanner "reads" whatever the test types (same stand-in as Scan.test.tsx). */
vi.mock('@/portals/student/QrCameraScanner', () => ({
  QrCameraScanner: ({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) => (
    <form onSubmit={(e) => { e.preventDefault(); if (!paused) onScan(new FormData(e.currentTarget).get('code') as string) }}>
      <input name="code" aria-label="Code in view" />
      <button type="submit">Simulate scan</button>
    </form>
  ),
}))

// The scanner sends the phone's position; mock classes check it's there.
beforeEach(() => fakeGeolocation([8]))

async function signInAsStudent(path = '/student-dashboard') {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/registration number or email/i), 'STU00042')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('student home', () => {
  it("shows the overall attendance rate and a class open for check-in today", async () => {
    openMockSessionForScan('u1')
    await signInAsStudent()

    // Overall rate is computed from the student's full history (seeded past classes).
    expect(await screen.findByText('67%')).toBeInTheDocument()

    const todaysClasses = screen.getByRole('region', { name: "Today's Classes" })
    expect(within(todaysClasses).getByText(/CS301/)).toBeInTheDocument()
    expect(within(todaysClasses).getByRole('link', { name: /scan now/i })).toBeInTheDocument()
  })

  it('marks a class present right after the scan, and drops it from "Scan now"', async () => {
    const { payload } = openMockSessionForScan('u1')
    const user = await signInAsStudent()

    const todaysClasses = await screen.findByRole('region', { name: "Today's Classes" })
    await user.click(await within(todaysClasses).findByRole('link', { name: /scan now/i }))

    await user.type(await screen.findByLabelText('Code in view'), payload)
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }))
    await user.click(await screen.findByRole('link', { name: 'Done' }))

    const updated = await screen.findByRole('region', { name: "Today's Classes" })
    expect(within(updated).getByText('Present')).toBeInTheDocument()
    expect(within(updated).queryByRole('link', { name: /scan now/i })).not.toBeInTheDocument()
  })
})

describe('student units and history pages', () => {
  it("shows each unit's cumulative attendance rate, and picks up a fresh count after a scan", async () => {
    const { payload } = openMockSessionForScan('u1')
    const user = await signInAsStudent('/student-units')

    const cs301 = (await screen.findByText('CS301')).closest('li')!
    expect(within(cs301).getByText('100%')).toBeInTheDocument()
    expect(within(cs301).getByText('2 of 2 classes')).toBeInTheDocument()
    const cs405 = screen.getByText('CS405').closest('li')!
    expect(within(cs405).getByText('0%')).toBeInTheDocument()

    // Check in from Home, then come back: units were cached for a minute, the check-in refetched them.
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(await screen.findByRole('link', { name: /scan now/i }))
    await user.type(await screen.findByLabelText('Code in view'), payload)
    await user.click(screen.getByRole('button', { name: 'Simulate scan' }))
    await user.click(await screen.findByRole('link', { name: 'Done' }))

    await user.click(await screen.findByRole('link', { name: /progress/i }))
    await user.click(await screen.findByRole('link', { name: /my units/i }))
    const refreshedCs301 = (await screen.findByText('CS301')).closest('li')!
    expect(await within(refreshedCs301).findByText('3 of 3 classes')).toBeInTheDocument()
  })

  it('lists units from the timetable app that have no class list here yet, without an attendance link', async () => {
    await signInAsStudent('/student-units')

    const cs410 = (await screen.findByText('CS410')).closest('li')!
    expect(within(cs410).getByText('Dr. Mary Wambui')).toBeInTheDocument()
    expect(within(cs410).getByText(/attendance starts once your lecturer sets this unit up/i)).toBeInTheDocument()
    expect(within(cs410).queryByRole('link', { name: /view attendance/i })).not.toBeInTheDocument()
    expect(within(cs410).queryByText(/classes$/)).not.toBeInTheDocument()
  })

  it('shows the full attendance history with overall rate, status counts and per-class results', async () => {
    await signInAsStudent('/student-attendance')

    expect(await screen.findByText('67%')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Total: 3' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Present: 2' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Late: 0' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Absent: 1' })).toBeInTheDocument()

    const history = screen.getByRole('region', { name: 'Class history' })
    expect(within(history).getAllByText('Present')).toHaveLength(2)
    expect(within(history).getByText('Absent')).toBeInTheDocument()
  })
})

describe('student registration errors', () => {
  async function fillForm(user: ReturnType<typeof userEvent.setup>, reg: string) {
    await user.type(await screen.findByLabelText(/student id/i), reg)
    await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
    await user.type(screen.getByLabelText(/^email/i), 'amina@students.tharaka.ac.ke')
    await user.type(screen.getByLabelText(/^password$/i), 'StudentPass123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'StudentPass123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
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
    await user.type(await screen.findByLabelText(/student id/i), 'EBT1/08223/23')
    await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
    await user.type(screen.getByLabelText(/^email/i), 'amina@students.tharaka.ac.ke')
    await user.type(screen.getByLabelText(/^password$/i), 'Ebt10822323xyZ')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Ebt10822323xyZ')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/must not contain your registration number/i)).toBeInTheDocument()
  })
})
