import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { mockExamRooms } from '@/mocks/exams'
import { fakeGeolocation } from '@/test/fakeGeolocation'
import { renderApp } from '@/test/renderApp'

/** jsdom has no camera: the scanner "reads" whatever code the test types (as in Scan.test.tsx). */
vi.mock('@/portals/student/QrCameraScanner', () => ({
  QrCameraScanner: ({ onScan, paused }: { onScan: (text: string) => void; paused?: boolean }) => (
    <form onSubmit={(e) => { e.preventDefault(); if (!paused) onScan(new FormData(e.currentTarget).get('code') as string) }}>
      <input name="code" aria-label="Code in view" />
      <button type="submit">Simulate scan</button>
    </form>
  ),
}))

beforeEach(() => fakeGeolocation([8]))

async function signIn(identifier: string, path: string) {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/(staff|registration) number or email/i), identifier)
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

async function scan(user: ReturnType<typeof userEvent.setup>, code: string) {
  const input = await screen.findByLabelText('Code in view')
  await user.clear(input)
  await user.type(input, code)
  await user.click(screen.getByRole('button', { name: 'Simulate scan' }))
}

describe('invigilation', () => {
  it('lists the lecturer’s exam rooms; only the one in its slot can be opened', async () => {
    await signIn('LEC00123', '/exams')
    expect(await screen.findByRole('heading', { name: /your exam rooms/i })).toBeInTheDocument()
    const today = (await screen.findByText('LH1')).closest('div.rounded-2xl') as HTMLElement
    expect(within(today).getByText('Main invigilator')).toBeInTheDocument()
    expect(within(today).getByText('2 seated')).toBeInTheDocument()
    expect(within(today).getByRole('button', { name: /open room/i })).toBeInTheDocument()
    const tomorrow = screen.getByText('LH3').closest('div.rounded-2xl') as HTMLElement
    expect(within(tomorrow).queryByRole('button', { name: /open room/i })).not.toBeInTheDocument()
    expect(within(tomorrow).getByText(/opens 30 minutes before/i)).toBeInTheDocument()
    // Someone else's room isn't listed.
    expect(screen.queryByText('LH2')).not.toBeInTheDocument()
  })

  it('opens the room, shows its code and who is still absent, and closes it', async () => {
    const user = await signIn('LEC00123', '/exams')
    const card = (await screen.findByText('LH1')).closest('div.rounded-2xl') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /open room/i }))

    expect(await screen.findByRole('heading', { name: 'Room LH1' })).toBeInTheDocument()
    expect(await screen.findByRole('timer')).toHaveTextContent(/refreshes in/i)
    expect(await screen.findByText(/of 2 checked in/)).toBeInTheDocument()
    // The main invigilator sees every room of the paper.
    expect(within(screen.getByRole('list', { name: 'Absent in LH1' })).getByText('STU00042')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Absent in LH2' })).getByText('STU00099')).toBeInTheDocument()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /close room/i }))
    expect(await screen.findByText(/room closed/i)).toBeInTheDocument()
    expect(mockExamRooms().lh1.session.status).toBe('CLOSED')
  })
})

describe('exam check-in with the usual scanner', () => {
  it('checks a seated student in and names the room', async () => {
    const { lh1, codeFor } = mockExamRooms()
    lh1.session.status = 'OPEN'
    const user = await signIn('STU00042', '/scan')
    await scan(user, codeFor(lh1))
    expect(await screen.findByText("You're marked present")).toBeInTheDocument()
    expect(screen.getByText(/COSC 130 · Room LH1 · recorded at/)).toBeInTheDocument()
  })

  it('sends a student in the wrong room to their own', async () => {
    const { lh2, codeFor } = mockExamRooms()
    lh2.session.status = 'OPEN'
    const user = await signIn('STU00042', '/scan')
    await scan(user, codeFor(lh2))
    expect(await screen.findByText('Not checked in')).toBeInTheDocument()
    expect(screen.getByText('You sit COSC 130 in LH1, not here.')).toBeInTheDocument()
  })
})
