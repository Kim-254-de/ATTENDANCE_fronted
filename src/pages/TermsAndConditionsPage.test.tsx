import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

describe('TermsAndConditionsPage', () => {
  it('shows all required sections and requires agreement before accepting', async () => {
    const user = userEvent.setup()
    renderApp('/terms')

    expect(await screen.findByRole('heading', { name: 'Terms and Conditions' })).toBeInTheDocument()
    for (const title of [
      'Acceptance of Terms',
      'User Registration and Account Security',
      'Accurate Information',
      'Attendance Recording',
      'QR Code Usage',
      'Biometric and Facial Recognition',
      'Privacy and Protection of Personal Data',
      'Acceptable Use of the System',
      'Prohibited Activities',
      'Attendance Corrections and Disputes',
      'System Availability and Technical Problems',
      'Student Responsibilities',
      'Administrator and Lecturer Responsibilities',
      'Data Retention and Deletion',
      'Account Suspension or Termination',
      'Changes to the Terms and Conditions',
      'Limitation of Liability',
      'Contact and Support Information',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }

    expect(screen.getByLabelText('I have read, understood, and agree to the Terms and Conditions of the System.')).toBeInTheDocument()
    const accept = screen.getByRole('button', { name: 'Accept' })
    expect(accept).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Decline' }))
    expect(screen.getByRole('status')).toHaveTextContent(/you have declined/i)

    await user.click(screen.getByRole('checkbox'))
    expect(accept).toBeEnabled()
    await user.click(accept)
    expect(screen.getByRole('status')).toHaveTextContent(/thank you for reviewing and accepting/i)
  })
})
