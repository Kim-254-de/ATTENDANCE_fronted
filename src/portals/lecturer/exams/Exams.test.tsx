import { act, screen, within } from '@testing-library/react'
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

async function signIn(identifier: string, path: string, options?: Parameters<typeof userEvent.setup>[0]) {
  const user = userEvent.setup(options)
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
    expect(await screen.findByText(/open your room from 30 minutes before the paper/i)).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /close room/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Close this room?' })
    expect(dialog).toHaveTextContent('Students in Room LH1 can no longer check in.')
    // Focus starts on Cancel, so a stray Enter doesn't close the room.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockExamRooms().lh1.session.status).toBe('OPEN')

    await user.click(screen.getByRole('button', { name: /close room/i }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Close room' }))
    expect(await screen.findByText(/room closed/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockExamRooms().lh1.session.status).toBe('CLOSED')
  })

  it('shows Open room by itself once the room’s slot starts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { lh1 } = mockExamRooms()
      const start = Date.now() + 31 * 60_000
      lh1.session.startsAt = new Date(start).toISOString()
      lh1.session.endsAt = new Date(start + 2 * 60 * 60_000).toISOString()
      await signIn('LEC00123', '/exams', { advanceTimers: vi.advanceTimersByTime })
      const card = (await screen.findByText('LH1')).closest('div.rounded-2xl') as HTMLElement
      expect(within(card).queryByRole('button', { name: /open room/i })).not.toBeInTheDocument()
      expect(within(card).getByText(/opens 30 minutes before/i)).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(90_000))
      expect(within(card).getByRole('button', { name: /open room/i })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers to open without the location check when this phone can’t tell where the room is', async () => {
    fakeGeolocation('denied')
    const user = await signIn('LEC00123', '/exams')
    const card = (await screen.findByText('LH1')).closest('div.rounded-2xl') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /open room/i }))
    expect(await within(card).findByRole('alert')).toHaveTextContent(/hasn’t been mapped/)
    await user.click(within(card).getByRole('button', { name: /open without the location check/i }))
    expect(await screen.findByRole('heading', { name: 'Room LH1' })).toBeInTheDocument()
    expect(mockExamRooms().lh1.session.geofence).toBe('OFF')
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
