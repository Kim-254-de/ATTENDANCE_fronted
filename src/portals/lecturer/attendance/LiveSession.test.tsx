import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openMockSessionForScan } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

async function signIn(path: string) {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

describe('ending a live class', () => {
  it('asks in the app’s own dialog, keeps the class live on Cancel, and ends it on confirm', async () => {
    const { session } = openMockSessionForScan('u1')
    const user = await signIn(`/session/${session.id}`)
    expect(await screen.findByRole('timer')).toHaveTextContent(/refreshes in/i)

    await user.click(screen.getByRole('button', { name: 'End class' }))
    const dialog = await screen.findByRole('dialog', { name: 'End this class?' })
    expect(dialog).toHaveTextContent(`Students can no longer check in to ${session.unitCode}.`)
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'End class' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'End class' }))
    expect(await screen.findByText('Class ended')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
