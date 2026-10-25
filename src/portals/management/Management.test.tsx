import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

/** Signs in at the staff page as the seeded management account. */
async function signInAsManagement(user: ReturnType<typeof userEvent.setup>, path = '/oversight') {
  renderApp(path)
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), 'd.rotich@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

const rows = (list: string) => within(screen.getByRole('list', { name: list })).getAllByRole('listitem')

describe('management portal', () => {
  it('compares every department in the university, best attended first', async () => {
    const user = userEvent.setup()
    await signInAsManagement(user)

    expect(await screen.findByRole('heading', { name: 'University Attendance' })).toBeInTheDocument()
    const stats = await screen.findByRole('region', { name: /key statistics/i })
    expect(within(stats).getByText('Departments')).toBeInTheDocument()
    // Software Engineering (68%) and Business Administration (61%) are under the 75% minimum.
    expect(within(stats).getByText('Below 75%').nextElementSibling).toHaveTextContent('2')

    // Best first; a department with no classes yet comes last.
    expect(rows('Attendance by department').map((r) => r.getAttribute('aria-label')!.split(':')[0])).toEqual([
      'Computer Science', 'Software Engineering', 'Business Administration', 'Actuarial Science',
    ])
    const business = rows('Attendance by department')[2]!
    expect(business).toHaveAccessibleName(/61% attendance, below the minimum/)
    expect(within(business).getByText(/^DBA ·/)).toBeInTheDocument()
    expect(rows('Attendance by department')[3]).toHaveAccessibleName(/no classes held yet/)

    await user.type(screen.getByLabelText('Search department'), 'actuar')
    expect(rows('Attendance by department')).toHaveLength(1)
  })

  it('drills from a department to its years, a year’s units, and a unit’s lecturer and students', async () => {
    const user = userEvent.setup()
    await signInAsManagement(user)

    await user.click(await screen.findByRole('listitem', { name: /^computer science:/i }))
    expect(await screen.findByRole('heading', { name: 'Computer Science' })).toBeInTheDocument()
    const years = rows('Attendance by year of study')
    expect(years.map((y) => y.getAttribute('aria-label')!.split(':')[0])).toEqual(['Year 1', 'Year 2', 'Year 3', 'Year 4'])
    expect(years[1]).toHaveAccessibleName(/no classes held yet/)
    expect(years[2]).toHaveAccessibleName(/90% attendance/)
    // CS502 is postgraduate: in no year.
    expect(screen.getByText(/1 postgraduate unit belongs to no year/i)).toBeInTheDocument()

    await user.click(years[3]!)
    expect(await screen.findByRole('heading', { name: 'Computer Science · Year 4' })).toBeInTheDocument()
    const units = rows('Attendance by unit')
    // CS405 has been taught; CS410 has not held a class yet, so it comes last.
    expect(units.map((u) => u.getAttribute('aria-label')!.split(':')[0])).toEqual(['CS405 · Database Management Systems', 'CS410 · Distributed Systems'])

    await user.click(units[0]!)
    expect(await screen.findByRole('heading', { name: 'CS405 · Database Management Systems' })).toBeInTheDocument()
    expect(screen.getByText('Dr. Joseph K. Osei')).toBeInTheDocument()
    expect(screen.getByText('LEC00123')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(7)
    expect(within(table).getByText('Ama Mensah')).toBeInTheDocument()
    expect(within(table).getByText('12 / 18')).toBeInTheDocument()

    // The breadcrumbs lead back up.
    await user.click(screen.getByRole('link', { name: 'Year 4' }))
    expect(await screen.findByRole('heading', { name: 'Computer Science · Year 4' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'University' }))
    expect(await screen.findByRole('heading', { name: 'University Attendance' })).toBeInTheDocument()
  })

  it('sends an old faculty portal link to the management overview', async () => {
    const user = userEvent.setup()
    await signInAsManagement(user, '/faculty-dashboard')
    expect(await screen.findByRole('heading', { name: 'University Attendance' })).toBeInTheDocument()
  })
})
