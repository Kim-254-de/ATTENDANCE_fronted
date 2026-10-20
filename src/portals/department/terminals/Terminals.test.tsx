import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { openMockSessionForScan } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

/** The sidebar and the bottom nav render the same links, and jsdom applies no CSS. */
const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

async function signInAsDepartment(user: ReturnType<typeof userEvent.setup>) {
  renderApp('/oversight')
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), 'g.mutiso@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await screen.findByText('82.3%')
}

// The lost, retire and remove actions ask first.
afterEach(() => { vi.restoreAllMocks() })

describe('department terminals', () => {
  it('lists the devices, adds one and shows its one-time pairing code', async () => {
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await user.click(navLink(/^terminals$/i))

    expect(await screen.findByText('CS-TERM-01')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('Waiting to pair')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add terminal/i }))
    const add = screen.getByRole('dialog', { name: /add a terminal/i })
    await user.type(within(add).getByLabelText(/^name/i), 'cs-term-03')
    await user.click(within(add).getByLabelText(/fingerprint/i)) // untick: barcode only
    await user.click(within(add).getByRole('button', { name: /add and get pairing code/i }))

    const pairing = await screen.findByRole('dialog', { name: /pair CS-TERM-03/i })
    expect(within(pairing).getByText(/^\d{5}-[A-Z]{5}$/)).toBeInTheDocument()
    await user.click(within(pairing).getByRole('button', { name: /done/i }))
    expect(await screen.findByText('CS-TERM-03')).toBeInTheDocument()
  })

  it('refuses a duplicate name', async () => {
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await user.click(navLink(/^terminals$/i))
    await user.click(await screen.findByRole('button', { name: /add terminal/i }))
    const add = screen.getByRole('dialog', { name: /add a terminal/i })
    await user.type(within(add).getByLabelText(/^name/i), 'CS-TERM-01')
    await user.click(within(add).getByRole('button', { name: /add and get pairing code/i }))
    expect(await within(add).findByRole('alert')).toHaveTextContent(/already exists/i)
  })

  it('marks a device lost after asking', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await user.click(navLink(/^terminals$/i))
    const card = (await screen.findByText('CS-TERM-01')).closest('.space-y-4') as HTMLElement

    await user.click(within(card).getByRole('button', { name: /mark lost/i }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/stops recording immediately/i))
    expect(await within(card).findByText('Lost')).toBeInTheDocument()
  })

  it('queues a fingerprint enrolment, and removes an existing one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await user.click(navLink(/^terminals$/i))
    await user.click(await screen.findByRole('link', { name: /fingerprint enrolment/i }))

    // The first seeded student is already enrolled on CS-TERM-01; the rest are not.
    const enrolled = await screen.findByRole('button', { name: /remove fingerprint on CS-TERM-01/i })
    const rows = screen.getAllByRole('listitem')
    const fresh = rows.find((row) => within(row).queryByText('Not enrolled'))!
    await user.click(within(fresh).getByRole('button', { name: /^enrol$/i }))
    expect(await within(fresh).findByText(/waiting on CS-TERM-01/i)).toBeInTheDocument()

    await user.click(enrolled)
    expect(await screen.findByText(/removing from CS-TERM-01/i)).toBeInTheDocument()
  })
})

describe('linking a terminal from the live session', () => {
  it('shows the lecturer a link code for terminals to scan', async () => {
    const { session } = openMockSessionForScan('u1')
    const user = userEvent.setup()
    renderApp(`/session/${session.id}`)
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await user.click(await screen.findByRole('button', { name: /link a terminal/i }))
    const dialog = screen.getByRole('dialog', { name: /link a terminal/i })
    expect(within(dialog).getByText(/only terminals belonging to your department/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /done/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
