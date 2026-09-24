import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { parseRegistrationNumbers } from './unitsApi'

async function signIn(path: string) {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
  await user.type(screen.getByLabelText(/password/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('units', () => {
  it('lets a lecturer add a unit, which then appears in the list', async () => {
    const user = await signIn('/units')
    expect(await screen.findByRole('heading', { name: /your units/i })).toBeInTheDocument()
    await screen.findByText('CS301')

    await user.click(screen.getByRole('button', { name: /add unit/i }))
    await user.type(screen.getByLabelText(/unit code/i), 'cosc 100')
    await user.type(screen.getByLabelText(/unit name/i), 'Introduction to Computing')
    // Typing into segmented time inputs is slow under userEvent; this test needs more than the default 5s.
    await user.type(screen.getByLabelText(/start time/i), '0900')
    await user.type(screen.getByLabelText(/end time/i), '1100')
    await user.click(screen.getByRole('button', { name: /^add unit$/i }))

    expect(await screen.findByText('COSC 100')).toBeInTheDocument()
    expect(screen.getByText('Introduction to Computing')).toBeInTheDocument()
  }, 10_000)

  it('adds students by registration number and reports the ones that failed', async () => {
    const user = await signIn('/units/u1')
    await screen.findByRole('heading', { name: /data structures/i })

    await user.type(screen.getByLabelText(/add students/i), 'sc211/0001/2022, SC211/0002/OLD{enter}nonsense')
    await user.click(screen.getByRole('button', { name: /^add students$/i }))

    const status = (await screen.findByText('1 added, 2 not added')).closest<HTMLElement>('[role="status"]')!
    expect(within(status).getByText('SC211/0002/OLD')).toBeInTheDocument()
    expect(within(status).getByText(/not an active student/i)).toBeInTheDocument()
    expect(within(status).getByText(/not found in student records/i)).toBeInTheDocument()

    const students = screen.getByRole('region', { name: 'Students' })
    expect(within(students).getByText('SC211/0001/2022')).toBeInTheDocument()
    expect(within(students).getByText(/hasn't registered yet/i)).toBeInTheDocument()
    // The failures stay in the box so they can be corrected and resubmitted.
    expect(screen.getByLabelText(/add students/i)).toHaveValue('SC211/0002/OLD\nNONSENSE')
  })

  it('splits pasted class lists and removes duplicates', () => {
    expect(parseRegistrationNumbers(' a1 ,A1;\n b2\t\tc3 \n')).toEqual(['A1', 'B2', 'C3'])
  })
})
