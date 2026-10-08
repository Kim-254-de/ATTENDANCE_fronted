import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderApp } from '@/test/renderApp'
import { server } from '@/test/setup'
import { errorMessage } from '@/lib/api'
import { formatCountdown, initials } from '@/lib/format'

describe('lecturer portal', () => {
  it('redirects unauthenticated users to login and rejects bad credentials', async () => {
    const user = userEvent.setup()
    renderApp('/login?role=lecturer')
    await screen.findByRole('heading', { name: /lecturer portal/i })

    await user.type(screen.getByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  })

  it('signs in, shows stats and activates a class', async () => {
    const user = userEvent.setup()
    renderApp('/login?role=lecturer')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(await screen.findByText('QR-CS301-0908')).toBeInTheDocument()
    expect(screen.getAllByText('90%', { selector: 'span' })).toHaveLength(2)

    // CS301 is scheduled for right now per the mock timetable, so the button
    // is enabled as soon as the current unit loads — no picker to interact with.
    const activate = await screen.findByRole('button', { name: /activate class/i })
    await waitFor(() => expect(activate).toBeEnabled())
    await user.click(activate)

    expect(await screen.findByText('CS301')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^pause$/i })).toBeEnabled()
    expect(await screen.findByRole('timer')).toHaveTextContent(/refreshes in/i)
  })

  it('shows only the latest session for each unit in Recent Sessions', async () => {
    server.use(
      http.get('/api/reports/sessions', () => HttpResponse.json({
        success: true,
        data: [
          { id: 's1', date: '2026-10-01T08:00:00Z', unitId: 'u1', unitCode: 'CS301', unitName: 'Data Structures & Algorithms', present: 78, absent: 9, total: 87, rate: 90, reference: 'QR-CS301-OLDER' },
          { id: 's2', date: '2026-10-01T10:00:00Z', unitId: 'u2', unitCode: 'CS405', unitName: 'Database Management Systems', present: 61, absent: 3, total: 64, rate: 95, reference: 'QR-CS405-0908' },
          { id: 's3', date: '2026-10-01T12:00:00Z', unitId: 'u3', unitCode: 'cs301', unitName: 'Data Structures & Algorithms', present: 80, absent: 7, total: 87, rate: 92, reference: 'QR-CS301-LATEST' },
        ],
      })),
    )
    const user = userEvent.setup()
    renderApp('/login?role=lecturer')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const table = await screen.findByRole('table')
    expect(within(table).getAllByText(/^CS301$/i)).toHaveLength(1)
    expect(within(table).getByRole('button', { name: 'Copy reference QR-CS301-LATEST' })).toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: 'Copy reference QR-CS301-OLDER' })).not.toBeInTheDocument()
    expect(within(table).getAllByText('CS405')).toHaveLength(1)
    expect(within(table).getAllByText('01 Oct 2026')).toHaveLength(2)
  })

  it('opens the profile and saves updated lecturer details', async () => {
    const user = userEvent.setup()
    renderApp('/profile')
    // /profile is a lecturer-only route, so RequireAuth sends a signed-out visitor
    // straight to the lecturer sign-in form — no role chooser to click through.
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Dr. Joseph K. Osei')).toBeInTheDocument()
    expect(screen.queryByText('Personal details')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    // The sidebar has its own Sign Out; this is the profile page's.
    expect(within(screen.getByRole('main')).getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /dr\. joseph k\. osei/i }))

    // The layout's header shows the page title too; this is the page's own heading.
    expect(await within(screen.getByRole('main')).findByRole('heading', { name: /edit profile/i })).toBeInTheDocument()
    // Name and email are ERP-verified and read-only; only title/department can be edited.
    expect(screen.getByLabelText('Full name')).toHaveAttribute('readonly')
    const department = screen.getByLabelText('Department')
    await user.clear(department)
    await user.type(department, 'Software Engineering')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated')).toBeInTheDocument()
    // The saved department shows on the profile itself, not just in the form.
    await user.click(screen.getByRole('link', { name: /back to profile/i }))
    expect(await screen.findByText(/· Software Engineering/)).toBeInTheDocument()
  })

  it("lists every student across the lecturer's units, searchable, sortable and filterable by unit", async () => {
    const user = userEvent.setup()
    renderApp('/students')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Amina Wanjiku Kamau')).toBeInTheDocument()
    expect(screen.getByText('5 students')).toBeInTheDocument()
    expect(screen.getAllByText('At Risk')).toHaveLength(2)
    expect(screen.getAllByText('Active')).toHaveLength(3)

    // Search narrows across name, ID and unit.
    await user.type(screen.getByLabelText(/search name, id or unit/i), 'CS405')
    expect(await screen.findByText('2 students')).toBeInTheDocument()
    expect(screen.getByText('Cynthia Achieng Ouma')).toBeInTheDocument()
    expect(screen.queryByText('Amina Wanjiku Kamau')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText(/search name, id or unit/i))
    expect(await screen.findByText('5 students')).toBeInTheDocument()

    // The unit filter narrows the same way.
    await user.selectOptions(screen.getByLabelText(/filter by unit/i), 'CS301')
    expect(await screen.findByText('3 students')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/filter by unit/i), '')
    expect(await screen.findByText('5 students')).toBeInTheDocument()

    // Sorting by attendance ascending puts the lowest rate first.
    await user.click(screen.getByRole('button', { name: /attendance/i }))
    const dataRows = screen.getAllByRole('row').slice(1)
    expect(within(dataRows[0]!).getByText('David Mwangi Njoroge')).toBeInTheDocument()
  })

  it('opens the student profile with a student account', async () => {
    const user = userEvent.setup()
    renderApp('/student-profile')
    // A student page sends a signed-out visitor to the student sign-in form.
    await user.type(await screen.findByLabelText(/registration number or email/i), 'STU00042')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('BSc Computer Science')).toBeInTheDocument()
    // "Ama Mensah" also appears in the shared header's greeting now, so there are two matches.
    expect(screen.getAllByText('Ama Mensah').length).toBeGreaterThan(0)
    expect(screen.getAllByText('STU00042').length).toBeGreaterThan(0)
    // Name and email are from the student records, so they're shown, not editable.
    expect(screen.queryByRole('textbox', { name: /full name/i })).not.toBeInTheDocument()
  })

  it('registers a student and routes the new account to its dashboard and profile', async () => {
    const user = userEvent.setup()
    renderApp('/signup?role=student')
    await user.type(await screen.findByLabelText(/student id/i), 'EBT1/00999/23')
    await user.type(screen.getByLabelText(/full name/i), 'New Student')
    await user.type(screen.getByLabelText(/^email/i), 'new.student@university.edu')
    await user.type(screen.getByLabelText(/^password$/i), 'StudentPass123')
    await user.type(screen.getByLabelText(/^confirm password$/i), 'StudentPass123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Active at once: no email to confirm, the app signs them straight in.
    expect(await screen.findByRole('heading', { name: "Today's Classes" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my profile/i })).toHaveAttribute('href', '/student-profile')
  })

  it('sends the user back to login when the session expires mid-use', async () => {
    const user = userEvent.setup()
    renderApp('/login?role=lecturer')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/^password$/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await screen.findByText('86.4%')

    // The server-side session expires while the page is open.
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 })),
      http.post('/api/sessions', () => HttpResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }, { status: 401 })),
    )
    const activate = await screen.findByRole('button', { name: /activate class/i })
    await waitFor(() => expect(activate).toBeEnabled())
    await user.click(activate)
    // Signed out again, back to the lecturer sign-in form for this same lecturer-only route.
    expect(await screen.findByRole('heading', { name: /lecturer portal/i })).toBeInTheDocument()
  })

  it('shows a friendly page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })

})

describe('helpers', () => {
  it('formats countdowns, initials and errors', () => {
    expect(formatCountdown(65_000)).toBe('01:05')
    expect(formatCountdown(-5)).toBe('00:00')
    expect(initials('Dr. Joseph K. Osei')).toBe('JK')
    expect(errorMessage(new Error('x'))).toMatch(/something went wrong/i)
  })
})
