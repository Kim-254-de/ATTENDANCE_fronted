import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

async function signIn(path: string) {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
  await user.type(screen.getByLabelText(/password/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('units', () => {
  it('lets a lecturer add a unit by code, which then appears in the list pending verification', async () => {
    const user = await signIn('/units')
    expect(await screen.findByRole('heading', { name: /your units/i })).toBeInTheDocument()
    await screen.findByText('CS301')

    await user.click(screen.getByRole('button', { name: /add unit/i }))
    await user.type(screen.getByLabelText(/unit code/i), 'cosc 100')
    await user.click(screen.getByRole('button', { name: /^add unit$/i }))

    expect(await screen.findByText('COSC 100')).toBeInTheDocument()
    expect(screen.getByText('COSC 100 Course')).toBeInTheDocument()
    expect(screen.getByText(/pending verification/i)).toBeInTheDocument()
  })

  it('shows a unit roster read-only — no way for a lecturer to add, approve or remove a student', async () => {
    await signIn('/units/u1')
    await screen.findByRole('heading', { name: /data structures/i })

    const students = await screen.findByRole('region', { name: 'Students' })
    expect(within(students).getByText('SC211/0001/2022')).toBeInTheDocument()
    expect(within(students).getByText('Amina Wanjiku Kamau')).toBeInTheDocument()
    // Enrolled per the registrar but without an account yet, so they cannot check in.
    expect(within(students).getByText(/hasn't registered yet/i)).toBeInTheDocument()
    expect(screen.getByText(/comes from the registrar's enrolment records/i)).toBeInTheDocument()

    expect(screen.queryByLabelText(/add students/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve|decline|^remove$|restore/i })).not.toBeInTheDocument()
  })
})
