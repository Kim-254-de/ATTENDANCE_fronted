import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

/** The portal renders a sidebar (lg+) and a bottom nav (below lg) from the same nav array, so every item matches twice. */
const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

/**
 * Signs in through the staff form, as a real QA officer would, and waits for
 * the dashboard's own data to load. "Compliance by Category" is unique to
 * this page — every other wait in this file below is picked the same way:
 * standard codes/titles and status words are reused across pages (the
 * dashboard's own compliance panels show the same codes the Standards page
 * does), so waiting on one of those would resolve against whichever page
 * happens to still be mounted and silently hide a navigation that never
 * actually finished.
 */
async function signInAsQa(user: ReturnType<typeof userEvent.setup>, path = '/oversight') {
  renderApp(path)
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), 's.achieng@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  // "Compliance by Category" renders as soon as the page mounts, before its query resolves —
  // waiting on it (or on any static heading) doesn't prove the data actually loaded. Waiting on
  // the computed stat value itself does.
  const stats = await screen.findByRole('region', { name: /key statistics/i })
  await within(stats).findByText('50.0%')
}

describe('quality assurance portal', () => {
  it('signs a QA officer in and shows the KPI dashboard', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)

    // 1 of the 2 seeded audits (audit-1) is completed — confirmed by signInAsQa itself.
    expect(screen.getByText(/1 corrective action.*past due date/i)).toBeInTheDocument()
  })

  it('does not offer self-registration on the staff sign-in form', async () => {
    renderApp('/oversight')
    await screen.findByRole('heading', { name: /staff sign-in/i })
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument()
  })

  it('lists the standards catalog, including an inactive one', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^standards$/i))

    // "Add a standard" only exists on this page — the dashboard's compliance panels also
    // show standard codes/titles, so waiting on one of those wouldn't prove we navigated.
    await screen.findByRole('heading', { name: /add a standard/i })
    // The form card above renders before the catalog's own query resolves, so the list itself
    // still needs an awaited find, not a synchronous get.
    expect(await screen.findByText('STD-GOV-01')).toBeInTheDocument()
    expect(screen.getByText('Institutional governance and leadership')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('adds a new standard to the catalog', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^standards$/i))
    await screen.findByRole('heading', { name: /add a standard/i })

    await user.type(screen.getByLabelText(/^code$/i), 'STD-RES-02')
    await user.type(screen.getByLabelText(/^title$/i), 'Research ethics compliance')
    await user.click(screen.getByRole('button', { name: /add standard/i }))

    expect(await screen.findByText('STD-RES-02')).toBeInTheDocument()
    expect(screen.getByText('Research ethics compliance')).toBeInTheDocument()
  })

  it('opens a checklist template and shows its items', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^checklists$/i))

    // "New checklist template" only exists on this list page; the list of templates below it
    // is a separate, still-loading query, so it needs an awaited find before clicking into one.
    await screen.findByRole('heading', { name: /new checklist template/i })
    await user.click(await screen.findByText('General Internal Audit Checklist'))

    // The checklist item's own prompt text only exists on a template's detail page.
    expect(await screen.findByText(/does the unit publish an up-to-date governance charter/i)).toBeInTheDocument()
    expect(screen.getByText('STD-STAFF-01')).toBeInTheDocument()
  })

  it('lists audits and drills into the completed one\'s findings', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^audits$/i))

    // "New audit" only exists on this list page; the audit list below it is a separate,
    // still-loading query, so it needs an awaited find, not a synchronous get.
    await screen.findByRole('heading', { name: /new audit/i })
    expect(await screen.findByText('CS Department Q3 Internal Audit')).toBeInTheDocument()
    expect(screen.getByText('Software Engineering Annual Review')).toBeInTheDocument()

    await user.click(screen.getByText('CS Department Q3 Internal Audit'))

    // A checklist item's prompt only exists on an audit's own detail page — the list page
    // already shows a "Completed" status badge, so that word alone would not prove we navigated.
    expect(await screen.findByText(/does the unit publish an up-to-date governance charter/i)).toBeInTheDocument()
    expect(screen.getByText(/completed/i)).toBeInTheDocument()
    // The non-compliant and the partial finding each offer raising a corrective action.
    expect(screen.getAllByRole('button', { name: /raise a corrective action/i })).toHaveLength(2)
  })

  it('runs a planned audit through to completion by filling every item', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^audits$/i))
    await screen.findByRole('heading', { name: /new audit/i })
    await user.click(await screen.findByText('Software Engineering Annual Review'))

    // Unique to a PLANNED audit's own detail page.
    await user.click(await screen.findByRole('button', { name: /start audit/i }))
    expect(await screen.findByText(/in progress/i)).toBeInTheDocument()

    const prompts = [
      /does the unit publish an up-to-date governance charter/i,
      /are course outlines reviewed within the last two years/i,
      /do all teaching staff hold the required minimum qualification/i,
    ]
    for (const prompt of prompts) {
      const row = within(screen.getByRole('group', { name: prompt }))
      await user.selectOptions(row.getByRole('combobox'), 'Compliant')
      await user.click(row.getByRole('button', { name: /^save$/i }))
      await row.findByRole('button', { name: /^update$/i })
    }

    await user.click(await screen.findByRole('button', { name: /mark completed/i }))
    expect(await screen.findByText(/^completed$/i)).toBeInTheDocument()
  })

  it('moves a corrective action through its forward-only workflow', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^corrective actions$/i))

    // The CAPA's own description text only exists on this page.
    await screen.findByText(/review and republish every course outline/i)
    const card = within(screen.getByRole('group', { name: /review and republish every course outline/i }))
    expect(card.getByText('Overdue')).toBeInTheDocument()

    await user.click(card.getByRole('button', { name: /^start$/i }))
    await card.findByRole('button', { name: /mark verified/i })
    await user.click(card.getByRole('button', { name: /mark verified/i }))
    await card.findByText(/verified by ms\. susan achieng/i)
    await user.click(card.getByRole('button', { name: /^close$/i }))

    // The move to CLOSED is forward-only and terminal: no further transition button is offered.
    await card.findByText('Closed')
    expect(card.queryByRole('button', { name: /^start$|mark verified|^close$/i })).not.toBeInTheDocument()
  })

  it('shows the attendance trend and narrows the dashboard and its export to one department', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)

    const trend = within((await screen.findByRole('heading', { name: /attendance rate trend/i })).closest('div')!)
    expect(trend.getByRole('rowheader', { name: 'Software Engineering' })).toBeInTheDocument()
    expect(trend.getByText('47.3%')).toBeInTheDocument()

    const filters = within(screen.getByRole('form', { name: /dashboard filters/i }))
    await user.selectOptions(filters.getByLabelText(/^department$/i), 'Computer Science')

    await waitFor(() => expect(trend.queryByRole('rowheader', { name: 'Software Engineering' })).not.toBeInTheDocument())
    expect(trend.getByRole('rowheader', { name: 'Computer Science' })).toBeInTheDocument()
    const exports = within(screen.getByRole('group', { name: /export dashboard report/i }))
    expect(exports.getByRole('link', { name: /pdf/i })).toHaveAttribute('href', expect.stringMatching(/\/quality-assurance\/dashboard\/export\.pdf\?.*targetDepartmentId=dept-cs/))
  })

  it('filters the audit register by status, and exports what is shown', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^audits$/i))
    await screen.findByText('CS Department Q3 Internal Audit')

    const filters = within(screen.getByRole('form', { name: /audit filters/i }))
    await user.selectOptions(filters.getByLabelText(/^status$/i), 'Planned')

    await waitFor(() => expect(screen.queryByText('CS Department Q3 Internal Audit')).not.toBeInTheDocument())
    expect(screen.getByText('Software Engineering Annual Review')).toBeInTheDocument()
    const exports = within(screen.getByRole('group', { name: /export audit register/i }))
    expect(exports.getByRole('link', { name: /csv/i })).toHaveAttribute('href', expect.stringMatching(/\/audits\/export\.csv\?status=PLANNED$/))
  })

  it("offers a single audit's findings report as CSV and PDF", async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^audits$/i))
    await user.click(await screen.findByText('CS Department Q3 Internal Audit'))

    const exports = within(await screen.findByRole('group', { name: /export audit report/i }))
    expect(exports.getByRole('link', { name: /csv/i })).toHaveAttribute('href', expect.stringMatching(/\/audits\/audit-1\/export\.csv$/))
    expect(exports.getByRole('link', { name: /pdf/i })).toHaveAttribute('href', expect.stringMatching(/\/audits\/audit-1\/export\.pdf$/))
  })

  it('shows only overdue corrective actions when asked, without sending a date range', async () => {
    const user = userEvent.setup()
    await signInAsQa(user)
    await user.click(navLink(/^corrective actions$/i))
    await screen.findByText(/review and republish every course outline/i)
    expect(screen.getByText(/qualification audit of every part-time lecturer/i)).toBeInTheDocument()

    const filters = within(screen.getByRole('form', { name: /corrective action filters/i }))
    // The CAPA endpoint has no from/to, so the shared filters must not offer one here.
    expect(filters.queryByLabelText(/^from$/i)).not.toBeInTheDocument()
    await user.click(filters.getByLabelText(/overdue only/i))

    await waitFor(() => expect(screen.queryByText(/qualification audit of every part-time lecturer/i)).not.toBeInTheDocument())
    expect(screen.getByText(/review and republish every course outline/i)).toBeInTheDocument()
    const exports = within(screen.getByRole('group', { name: /export capa register/i }))
    expect(exports.getByRole('link', { name: /csv/i })).toHaveAttribute('href', expect.stringMatching(/\/corrective-actions\/export\.csv\?overdue=true$/))
  })

  it('bounces a lecturer who opens a QA page back to their own dashboard', async () => {
    const user = userEvent.setup()
    renderApp('/qa-dashboard')
    // RequireAuth sends a signed-out visitor of a QA page to the staff sign-in form (QA is invited-only).
    await user.type(await screen.findByLabelText(/^email$/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(screen.queryByText(/compliance by category/i)).not.toBeInTheDocument()
  })
})
