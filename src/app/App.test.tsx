import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

describe('lecturer portal', () => {
  it('redirects unauthenticated users to login and rejects bad credentials', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByRole('heading', { name: /lecturer portal/i })

    await user.type(screen.getByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  })

  it('signs in, shows stats and generates a QR session', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.type(await screen.findByLabelText(/staff number or email/i), 'LEC00123')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Total Students')).toBeInTheDocument()
    expect(await screen.findByText('86.4%')).toBeInTheDocument()

    expect(await screen.findByText('QR-CS301-0908')).toBeInTheDocument()
    expect(screen.getAllByText('90%', { selector: 'span' })).toHaveLength(2)

    const generate = screen.getByRole('button', { name: /^generate$/i })
    expect(generate).toBeDisabled()

    const select = screen.getByLabelText('Unit')
    await waitFor(() => expect(screen.getByRole('option', { name: /CS301/ })).toBeInTheDocument())
    await user.selectOptions(select, 'u1')
    await user.click(generate)

    expect(await screen.findByRole('button', { name: /refresh/i })).toBeEnabled()
    expect(screen.getByRole('timer')).toHaveTextContent(/expires in 15:0\d|14:5\d/i)
  })
})
