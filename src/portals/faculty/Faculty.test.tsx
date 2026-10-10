import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

/**
 * The portal renders a sidebar (lg+) and a bottom nav (below lg) from the same
 * nav array, and jsdom applies no CSS, so every nav item matches twice.
 */
const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

/** Signs in through the faculty form, as a real officer would. */
async function signInAsFaculty(user: ReturnType<typeof userEvent.setup>, path = '/login?role=faculty') {
  renderApp(path)
  await screen.findByRole('heading', { name: /faculty portal/i })
  await user.type(screen.getByLabelText(/^email$/i), 'd.rotich@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('faculty portal', () => {
  it('signs a faculty officer in and shows the overview stat tiles', async () => {
    const user = userEvent.setup()
    await signInAsFaculty(user)

    // Average of the seeded units' rates (90, 95, 76, 68, 0) once the overview has actually loaded.
    expect(await screen.findByText('65.8%')).toBeInTheDocument()
    const stats = screen.getByRole('region', { name: /key statistics/i })
    expect(within(stats).getByText('Departments')).toBeInTheDocument()
    // Departments and Lecturers both happen to read 3 here, so count distinct stat values instead of a specific one.
    expect(within(stats).getAllByText('3').length).toBe(2)
    expect(within(stats).getByText('260')).toBeInTheDocument()
    // The faculty's own name comes from GET /faculties/me.
    expect(await screen.findByText(/attendance across every department in physical engineering and technologies/i)).toBeInTheDocument()
  })

  it('does not offer self-registration on the faculty sign-in form', async () => {
    renderApp('/login?role=faculty')
    await screen.findByRole('heading', { name: /faculty portal/i })
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/staff number/i)).not.toBeInTheDocument()
  })

  it('lists departments worst-attended first and drills into one\'s lecturers and units', async () => {
    const user = userEvent.setup()
    await signInAsFaculty(user)
    await screen.findByRole('region', { name: /key statistics/i })
    await user.click(navLink(/^departments$/i))

    expect(await screen.findByText('3 departments')).toBeInTheDocument()
    // Actuarial Science has no units yet, so it averages to 0% and sorts first —
    // matching the real backend's convention (an empty department reports 0, not null).
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('Actuarial Science')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /software engineering/i }))
    expect(await screen.findByRole('heading', { name: 'Software Engineering' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /lecturers/i })).toBeInTheDocument()
    // Appears twice: once as the Lecturers table's link, once as the Units table's plain-text owner.
    expect(screen.getAllByText('Mr. Peter Njuguna').length).toBe(2)
    expect(screen.getByRole('heading', { name: /units/i })).toBeInTheDocument()
    expect(screen.getByText('CS210')).toBeInTheDocument()
  })

  it('lists every lecturer across departments and drills into one\'s units and timekeeping', async () => {
    const user = userEvent.setup()
    await signInAsFaculty(user)
    await screen.findByRole('region', { name: /key statistics/i })
    await user.click(navLink(/^lecturers$/i))

    expect(await screen.findByText('3 lecturers')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('Mr. Peter Njuguna')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Software Engineering')).toBeInTheDocument()

    await user.click(within(rows[0]!).getByRole('link', { name: /peter njuguna/i }))
    expect(await screen.findByRole('heading', { name: 'Mr. Peter Njuguna' })).toBeInTheDocument()
    expect(screen.getByText('Software Engineering')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /timekeeping/i })).toBeInTheDocument()
    expect(screen.getByText('23 min late')).toBeInTheDocument()
  })

  it('lists every student and unit across the faculty, with department named', async () => {
    const user = userEvent.setup()
    await signInAsFaculty(user)
    await screen.findByRole('region', { name: /key statistics/i })

    await user.click(navLink(/^students$/i))
    expect(await screen.findByText('9 students')).toBeInTheDocument()
    expect(screen.getByText('Grace Nyambura Maina')).toBeInTheDocument()

    await user.click(navLink(/^units$/i))
    expect(await screen.findByText('5 units')).toBeInTheDocument()
    expect(screen.getByText('Distributed Systems')).toBeInTheDocument()
    expect(screen.getAllByText('Software Engineering').length).toBeGreaterThan(0)
  })

  it('sends a signed-out visitor of a faculty page to the faculty sign-in form', async () => {
    renderApp('/faculty-lecturers')
    expect(await screen.findByRole('heading', { name: /faculty portal/i })).toBeInTheDocument()
  })

  it('bounces a lecturer who opens a faculty page back to their own dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/faculty-dashboard')
    // RequireAuth sent them to the faculty form (labelled "Email"); they sign in as a lecturer instead —
    // the identifier field accepts a staff number there just as well.
    await user.type(await screen.findByLabelText(/^email$/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Role-gated by the route's own handle, so a lecturer lands on the lecturer dashboard.
    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(screen.queryByText(/key statistics/i)).not.toBeInTheDocument()
  })
})
