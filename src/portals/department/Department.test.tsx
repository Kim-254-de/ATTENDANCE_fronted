import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

/**
 * The portal renders a sidebar (lg+) and a bottom nav (below lg) from the same
 * nav array, and jsdom applies no CSS, so every nav item matches twice.
 */
const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

/** Signs in through the department form, as a real officer would. */
async function signInAsDepartment(user: ReturnType<typeof userEvent.setup>, path = '/login?role=department') {
  renderApp(path)
  await screen.findByRole('heading', { name: /department portal/i })
  await user.type(screen.getByLabelText(/^email$/i), 'g.mutiso@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('department portal', () => {
  it('signs a department officer in and shows the overview stat tiles', async () => {
    const user = userEvent.setup()
    await signInAsDepartment(user)

    expect(await screen.findByText('82.3%')).toBeInTheDocument()
    const stats = screen.getByRole('region', { name: /key statistics/i })
    expect(within(stats).getByText('Lecturers')).toBeInTheDocument()
    expect(within(stats).getByText('3')).toBeInTheDocument()
    expect(within(stats).getByText('212')).toBeInTheDocument()
    expect(within(stats).getByText('5')).toBeInTheDocument()
    expect(within(stats).getByText('74')).toBeInTheDocument()
    expect(within(stats).getByText('78.5%')).toBeInTheDocument()
    // The department's own name comes from GET /departments/me.
    expect(await screen.findByText(/attendance across every unit taught in computer science/i)).toBeInTheDocument()
  })

  it('does not offer self-registration on the department sign-in form', async () => {
    renderApp('/login?role=department')
    await screen.findByRole('heading', { name: /department portal/i })
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/staff number/i)).not.toBeInTheDocument()
  })

  it('lists the department’s lecturers and drills into one’s units and timekeeping', async () => {
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await screen.findByText('82.3%')
    await user.click(navLink(/^lecturers$/i))

    expect(await screen.findByText('3 lecturers')).toBeInTheDocument()
    // Worst attendance first, so the row needing attention leads.
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('Mr. Peter Njuguna')).toBeInTheDocument()
    expect(within(rows[0]!).getByText(/17\.9 min late on average/i)).toBeInTheDocument()

    await user.click(within(rows[0]!).getByRole('link', { name: /peter njuguna/i }))
    expect(await screen.findByRole('heading', { name: 'Mr. Peter Njuguna' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /units taught/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /timekeeping/i })).toBeInTheDocument()
    expect(screen.getAllByText('CS210').length).toBeGreaterThan(0)
    // Both of this lecturer's sessions opened late, past the 15-minute threshold.
    expect(screen.getByText('23 min late')).toBeInTheDocument()
    expect(screen.getByText('16 min late')).toBeInTheDocument()
  })

  it('lists every student and unit across the department', async () => {
    const user = userEvent.setup()
    await signInAsDepartment(user)
    await screen.findByText('82.3%')

    await user.click(navLink(/^students$/i))
    // The seeded lecturer's five rows, plus four on colleagues' units.
    expect(await screen.findByText('9 students')).toBeInTheDocument()
    expect(screen.getByText('Grace Nyambura Maina')).toBeInTheDocument()

    await user.click(navLink(/^units$/i))
    expect(await screen.findByText('5 units')).toBeInTheDocument()
    expect(screen.getByText('Distributed Systems')).toBeInTheDocument()
    expect(screen.getAllByText('Dr. Mary Wambui')).toHaveLength(2)
  })

  it('sends a signed-out visitor of a department page to the department sign-in form', async () => {
    renderApp('/department-lecturers')
    expect(await screen.findByRole('heading', { name: /department portal/i })).toBeInTheDocument()
  })

  it('bounces a lecturer who opens a department page back to their own dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/department-dashboard')
    // RequireAuth sent them to the department form; they sign in as a lecturer instead.
    await user.type(await screen.findByLabelText(/^email$/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Role-gated by the route's own handle, so a lecturer lands on the lecturer dashboard.
    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(screen.queryByText(/key statistics/i)).not.toBeInTheDocument()
  })
})
