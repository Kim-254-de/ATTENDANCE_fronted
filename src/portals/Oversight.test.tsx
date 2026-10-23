import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { renderApp } from '@/test/renderApp'

/**
 * The oversight backlog across portals: exam eligibility, borrowing a lecturer from another
 * department, placing lecturers in departments, and student course evaluations.
 */

afterEach(() => { vi.restoreAllMocks() })

/** Sidebar and bottom nav render the same items and jsdom applies no CSS, so take the first. */
const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

async function signInAtOversight(email: string) {
  const user = userEvent.setup()
  renderApp('/oversight')
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), email)
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

const DEPARTMENT = 'g.mutiso@university.edu'
const FACULTY = 'd.rotich@university.edu'
const QA = 's.achieng@university.edu'
const ADMIN = 'admin@university.edu'

describe('exam eligibility', () => {
  it('shows a department who is below the minimum and who is at risk, worst first', async () => {
    const user = await signInAtOversight(DEPARTMENT)
    await user.click(await screen.findByText('Exam Eligibility', { selector: 'span' }))

    const summary = await screen.findByRole('region', { name: /eligibility summary/i })
    await within(summary).findByText('2')
    const rows = (await screen.findAllByRole('row')).slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]!.textContent)).toEqual([
      expect.stringContaining('Hassan Ali Noor'),
      expect.stringContaining('Brian Otieno'),
      expect.stringContaining('Grace Nyambura Maina'),
    ])
    expect(within(rows[2]!).getByText('At risk')).toBeInTheDocument()
    // Another department's students never appear.
    expect(screen.queryByText('John Mutua Kilonzo')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/show every student/i))
    expect(await within(screen.getByRole('table')).findByText('Ama Mensah')).toBeInTheDocument()
  })

  it('lets QA change the rule, and the report follows it', async () => {
    const user = await signInAtOversight(QA)
    await user.click(await screen.findByText('Exam Eligibility', { selector: 'span' }))

    const min = await screen.findByLabelText(/minimum attendance/i)
    // Phones get cards and wider screens a table; jsdom applies no CSS and renders both, so read the table.
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Brian Otieno')).toBeInTheDocument()
    await user.clear(min)
    await user.type(min, '66.67')
    await user.click(screen.getByRole('button', { name: /save rule/i }))

    // 70% (14 of 20) is now above two-thirds, but within the 10-point margin.
    await waitFor(() => {
      const row = within(screen.getByRole('table')).getByText('Brian Otieno').closest('tr')!
      expect(within(row).getByText('At risk')).toBeInTheDocument()
    })
    expect(await screen.findByText(/last changed by ms\. susan achieng/i)).toBeInTheDocument()
  })
})

describe('allocating a lecturer from another department', () => {
  it('offers other departments’ lecturers, grouped apart, and allocates one', async () => {
    const user = await signInAtOversight(DEPARTMENT)
    await screen.findAllByRole('link', { name: /^courses$/i })
    await user.click(navLink(/^courses$/i))

    const select = await screen.findByLabelText(/lecturer for the next section/i)
    const others = await within(select).findByRole('group', { name: /other departments/i })
    expect(within(others).getByRole('option', { name: /dr\. ruth kamau — mathematics/i })).toBeInTheDocument()

    await user.selectOptions(select, within(others).getByRole('option', { name: /ruth kamau/i }))
    await user.click(screen.getByRole('button', { name: /assign to next open section/i }))
    expect(await screen.findByText(/every section has a lecturer/i)).toBeInTheDocument()
  })
})

describe('placing lecturers in departments', () => {
  it('lets a faculty officer place an unassigned lecturer in one of its departments', async () => {
    const user = await signInAtOversight(FACULTY)
    await user.click(await screen.findByText('Placement', { selector: 'span' }))

    expect(await screen.findByText(/smarttt says “comp\. sci & it”/i)).toBeInTheDocument()
    const place = screen.getByLabelText(/place dr\. samuel kiprono/i)
    await within(place).findByRole('option', { name: 'Computer Science' })
    await user.selectOptions(place, 'Computer Science')
    const card = screen.getByText('Dr. Samuel Kiprono').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^place$/i }))

    await waitFor(() => expect(within(card).getByText('Computer Science')).toBeInTheDocument())
    expect(within(card).getByRole('button', { name: /^move$/i })).toBeInTheDocument()
  })

  it('lets an administrator move a lecturer to another faculty', async () => {
    const user = await signInAtOversight(ADMIN)
    await screen.findAllByRole('link', { name: /^lecturers$/i })
    await user.click(navLink(/^lecturers$/i))

    const select = await screen.findByLabelText(/move mr\. peter njuguna/i)
    await within(select).findByRole('option', { name: 'Accounting' })
    // Departments are grouped by faculty, so a cross-faculty move is explicit.
    expect(within(select).getByRole('group', { name: 'Business and Economics' })).toBeInTheDocument()
    await user.selectOptions(select, 'Accounting')
    const card = screen.getByText('Mr. Peter Njuguna').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^move$/i }))
    await waitFor(() => expect(within(card).getByText(/business and economics/i)).toBeInTheDocument())
  })
})

describe('unifying department spellings', () => {
  it('remembers SMARTTT’s spelling when a lecturer is placed, and shows it to the administrator', async () => {
    const user = await signInAtOversight(FACULTY)
    await user.click(await screen.findByText('Placement', { selector: 'span' }))

    // "Comp. Sci & IT" matches no department here, so placing him teaches the system that spelling.
    const place = await screen.findByLabelText(/place dr\. samuel kiprono/i)
    await within(place).findByRole('option', { name: 'Computer Science' })
    await user.selectOptions(place, 'Computer Science')
    const card = screen.getByText('Dr. Samuel Kiprono').closest('li')!
    await user.click(within(card).getByRole('button', { name: /^place$/i }))
    expect(await within(card).findByRole('status')).toHaveTextContent(/smarttt’s “comp\. sci & it” now means computer science/i)
  })

  it('lets an administrator merge a department created under a second spelling', async () => {
    const user = await signInAtOversight(ADMIN)
    await screen.findAllByRole('link', { name: /^departments$/i })
    await user.click(navLink(/^departments$/i))

    const keep = await screen.findByRole('radio', { name: /^computer science/i })
    expect(screen.getByRole('radio', { name: /department of computer science/i })).toBeInTheDocument()
    await user.click(keep)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /merge into “computer science”/i }))

    expect(await screen.findByText(/every department has a single spelling/i)).toBeInTheDocument()
    // Both names already mean the same once normalised, so no extra spelling needs remembering.
    expect(screen.getByText(/none yet/i)).toBeInTheDocument()
  })
})

describe('course evaluations', () => {
  it('lets a student rate a unit once, anonymously', async () => {
    const user = userEvent.setup()
    renderApp('/student-dashboard')
    await user.type(await screen.findByLabelText(/registration number or email/i), 'STU00042')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await user.click(await screen.findByRole('link', { name: /course evaluation open/i }))
    expect(await screen.findByText(/your name is never stored with your answers/i)).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: /submit evaluation/i })
    expect(submit).toBeDisabled()
    for (const group of screen.getAllByRole('radiogroup')) {
      await user.click(within(group).getByRole('radio', { name: /^4/ }))
    }
    await user.type(screen.getByLabelText(/what should the lecturer keep doing/i), 'More worked examples.')
    await user.click(submit)

    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(1))
    expect(screen.getByText(/1 of 2 done/i)).toBeInTheDocument()
  })

  it('shows a department its results, hiding units with too few responses', async () => {
    const user = await signInAtOversight(DEPARTMENT)
    await user.click(await screen.findByText('Evaluations', { selector: 'span' }))
    await user.click(await screen.findByRole('link', { name: /semester 1 2026\/27/i }))

    expect(await screen.findByText('Clear examples every week.')).toBeInTheDocument()
    expect(screen.getByText('Notes came out late.')).toBeInTheDocument()
    // CS502 has a single response: counted, but its ratings are withheld.
    const cs502 = screen.getByText('CS502').closest('div.p-5, [class*="p-5"]') as HTMLElement
    expect(within(cs502).getByText(/hidden until at least 3 students respond/i)).toBeInTheDocument()
  })

  it('lets QA open a round with the default questions, then fixes them once answered', async () => {
    const user = await signInAtOversight(QA)
    await user.click(await screen.findByText('Course Evaluations', { selector: 'span' }))
    await user.click(await screen.findByRole('button', { name: /new round/i }))

    await user.type(screen.getByLabelText(/^title$/i), 'Mid-semester check')
    expect(screen.getAllByLabelText(/^question \d+$/i)).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: /create round/i }))

    // A new round has no answers, so it can still be edited or deleted.
    expect(await screen.findByRole('button', { name: /delete/i })).toBeInTheDocument()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(await screen.findByRole('button', { name: /new round/i })).toBeInTheDocument()

    // The seeded open round has answers: its questions are fixed and it cannot be deleted.
    await user.click(screen.getByRole('link', { name: /semester 1 2026\/27/i }))
    expect(await screen.findByText(/questions fixed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})

describe('the account menu', () => {
  it.each([
    ['department', DEPARTMENT, 'Department officer · Computer Science'],
    ['faculty', FACULTY, /^Faculty officer · /],
    ['QA', QA, /^Quality assurance/],
  ])('lets a %s officer reach their profile and sign out without the desktop sidebar', async (_, email, subtitle) => {
    const user = await signInAtOversight(email)
    const header = await screen.findByRole('banner')
    await user.click(await within(header).findByRole('button', { name: /account menu/i }))
    expect(within(header).getByText(subtitle)).toBeInTheDocument()

    await user.click(within(header).getByRole('link', { name: /my profile/i }))
    expect(await screen.findByRole('heading', { name: 'Change password' })).toBeInTheDocument()

    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: /account menu/i }))
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: /sign out/i }))
    expect(await screen.findByRole('heading', { name: /staff sign-in/i })).toBeInTheDocument()
  })
})
