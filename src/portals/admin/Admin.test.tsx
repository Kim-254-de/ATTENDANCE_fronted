import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { lastMockInvitationToken } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

afterEach(() => { vi.restoreAllMocks() })

const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

async function signInAtOversight(user: ReturnType<typeof userEvent.setup>, email: string, password = 'password', path = '/oversight') {
  const view = renderApp(path)
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), email)
  await user.type(screen.getByLabelText(/^password$/i), password)
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return view
}

/** Signs out the way the user would, and closes the page. */
async function signOut(user: ReturnType<typeof userEvent.setup>, view: { unmount: () => void }) {
  await user.click(screen.getAllByRole('button', { name: /sign out/i })[0]!)
  await screen.findByRole('heading', { name: /staff sign-in/i })
  view.unmount()
}

/** Follows an invitation link the way the invitee would, from a fresh page load. */
async function acceptInvitation(user: ReturnType<typeof userEvent.setup>, token: string, password: string) {
  const view = renderApp(`/accept-invite?token=${token}`)
  await user.type(await screen.findByLabelText('New password'), password)
  await user.type(screen.getByLabelText('Confirm new password'), password)
  await user.click(screen.getByRole('button', { name: /activate account/i }))
  return view
}

describe('public role selector', () => {
  it('offers only the student and lecturer sign-ins', async () => {
    renderApp('/')
    expect(await screen.findByRole('button', { name: /i'm a lecturer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /i'm a student/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /department/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /faculty/i })).not.toBeInTheDocument()
  })
})

describe('admin console', () => {
  it('signs an administrator in at the staff page and lists who has access', async () => {
    const user = userEvent.setup()
    await signInAtOversight(user, 'admin@university.edu')

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Prof. Daniel K. Rotich')).toBeInTheDocument()
    expect(within(table).getByText('Prof. Grace N. Mutiso')).toBeInTheDocument()
    // No way to remove your own access.
    expect(within(table).queryByRole('button', { name: /remove ms\. aisha njeri's access/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /account menu/i }))
    await user.click(screen.getByRole('link', { name: /my profile/i }))
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.getByText('Ms. Aisha Njeri')).toBeInTheDocument()
    expect(screen.getByText('admin@university.edu')).toBeInTheDocument()
  })

  it('opens the account menu from the header avatar, with the profile and sign-out', async () => {
    const user = userEvent.setup()
    await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')

    const header = screen.getByRole('banner')
    await user.click(within(header).getByRole('button', { name: /account menu/i }))
    expect(within(header).getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    await user.click(within(header).getByRole('link', { name: /my profile/i }))

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('Ms. Aisha Njeri').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin@university.edu').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Change password' })).toBeInTheDocument()
  })

  it('invites a QA officer, who needs no department', async () => {
    const user = userEvent.setup()
    await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Full name'), 'Mr. Otieno QA')
    await user.type(screen.getByLabelText('Work email'), 'otieno.qa@university.edu')
    await user.selectOptions(screen.getByLabelText('Role'), 'qa')
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(await screen.findByText(/invitation sent to otieno.qa@university.edu/i)).toBeInTheDocument()
    const row = (await screen.findByText('Mr. Otieno QA')).closest('tr')!
    expect(within(row).getByText('QA officer')).toBeInTheDocument()
  })

  it('invites a member of management, who needs no department and signs into the management portal', async () => {
    const user = userEvent.setup()
    const admin = await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Full name'), 'Dr. Wanjiru Kamau')
    await user.type(screen.getByLabelText('Work email'), 'w.kamau@university.edu')
    expect(screen.getByLabelText('Role')).toHaveValue('management')
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(await screen.findByText('Invitation sent to w.kamau@university.edu.')).toBeInTheDocument()
    const row = (await screen.findByText('Dr. Wanjiru Kamau')).closest('tr')!
    expect(within(row).getByText('Management')).toBeInTheDocument()
    expect(within(row).getByText('Whole university')).toBeInTheDocument()
    expect(within(row).getByText('Invited')).toBeInTheDocument()
    await signOut(user, admin)

    const invite = await acceptInvitation(user, lastMockInvitationToken()!, 'NewPass1')
    // Lands on the staff sign-in page, told what to do next.
    expect(await screen.findByText(/your account is ready/i)).toBeInTheDocument()
    invite.unmount()

    await signInAtOversight(user, 'w.kamau@university.edu', 'NewPass1')
    expect(await screen.findByRole('heading', { name: 'University Attendance' })).toBeInTheDocument()
  })

  it('refuses an unknown or already-used invitation link', async () => {
    renderApp('/accept-invite?token=invite-does-not-exist')
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid, has expired or has already been used/i)
    expect(screen.getByRole('link', { name: /go to staff sign-in/i })).toBeInTheDocument()
  })

  it('removes an officer’s access after a confirmation, and they can no longer sign in', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    const admin = await signInAtOversight(user, 'admin@university.edu')
    await user.click(await screen.findByRole('button', { name: /remove prof\. grace n\. mutiso's access/i }))
    const row = (await screen.findByText('Prof. Grace N. Mutiso')).closest('tr')!
    expect(await within(row).findByText('Deactivated')).toBeInTheDocument()
    await signOut(user, admin)

    await signInAtOversight(user, 'g.mutiso@university.edu', 'password')
    expect(await screen.findByRole('alert')).toHaveTextContent(/deactivated/i)
  })

  it('adds a department with its code; there are no faculties', async () => {
    const user = userEvent.setup()
    await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')
    expect(screen.queryByRole('link', { name: /^faculties$/i })).not.toBeInTheDocument()
    await user.click(navLink(/^departments$/i))
    await user.type(await screen.findByLabelText('Department name'), 'Education')
    await user.type(screen.getByLabelText('Code'), 'dedu')
    await user.click(screen.getByRole('button', { name: /add department/i }))
    expect(await screen.findByText('Education (DEDU) was added.')).toBeInTheDocument()
    const row = (await screen.findByRole('cell', { name: 'Education' })).closest('tr')!
    expect(within(row).getByText('DEDU')).toBeInTheDocument()

    // Another spelling of an existing department, or a code already in use, is refused.
    await user.type(screen.getByLabelText('Department name'), 'Department of Computer Science')
    await user.type(screen.getByLabelText('Code'), 'DCS2')
    await user.click(screen.getByRole('button', { name: /add department/i }))
    expect(await screen.findByText(/same department as/i)).toBeInTheDocument()
  })

  it('verifies a unit the timetable does not list its lecturer for', async () => {
    const user = userEvent.setup()
    await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')
    await user.click(navLink(/^units$/i))
    expect(await screen.findByText('MATH 210')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /verify cosc 340 for dr\. brian otieno/i }))
    await screen.findByRole('button', { name: /verify math 210/i })
    await vi.waitFor(() => expect(screen.queryByText('COSC 340')).not.toBeInTheDocument())
  })

  it('sends a signed-out visitor of the console to the staff sign-in page', async () => {
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: /staff sign-in/i })).toBeInTheDocument()
  })
})

describe('inviting department officers', () => {
  it('invites the officer for one department', async () => {
    const user = userEvent.setup()
    const admin = await signInAtOversight(user, 'admin@university.edu')
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Full name'), 'Mr. Otieno Ouma')
    await user.type(screen.getByLabelText('Work email'), 'o.ouma@university.edu')
    await user.selectOptions(screen.getByLabelText('Role'), 'department')
    const send = screen.getByRole('button', { name: /send invitation/i })
    expect(send).toBeDisabled()
    await screen.findByRole('option', { name: /^software engineering/i })
    await user.selectOptions(screen.getByLabelText('Department'), screen.getByRole('option', { name: /^software engineering/i }))
    await user.click(send)
    const row = (await screen.findByText('Mr. Otieno Ouma')).closest('tr')!
    expect(within(row).getByText('Department officer')).toBeInTheDocument()
    expect(within(row).getByText('Software Engineering')).toBeInTheDocument()
    await signOut(user, admin)

    renderApp(`/accept-invite?token=${lastMockInvitationToken()!}`)
    expect(await screen.findByText(/you have been invited as department officer for/i)).toBeInTheDocument()
    expect(screen.getByText('Software Engineering', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('o.ouma@university.edu')).toBeInTheDocument()
  })
})

describe('password reset link', () => {
  it('sets a new password from the emailed link', async () => {
    const user = userEvent.setup()
    renderApp('/reset-password?token=valid-reset-token')
    await user.type(await screen.findByLabelText('New password'), 'NewPass1')
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass2')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Confirm new password'))
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass1')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText(/your password has been changed/i)).toBeInTheDocument()
  })
})
