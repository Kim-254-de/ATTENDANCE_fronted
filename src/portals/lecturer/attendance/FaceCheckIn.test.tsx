import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { openMockSessionForScan } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

/**
 * jsdom has no camera, so FaceCamera is replaced by a stand-in whose "photo"
 * is whoever the test types. The mock API reads `face:<name>` back out of it
 * (src/mocks/handlers.ts seenInPhoto).
 */
vi.mock('@/components/FaceCamera', () => ({
  FaceCamera: ({ onCapture, captureLabel, disabled }: { onCapture: (image: string) => void; captureLabel: string; disabled?: boolean }) => (
    <form onSubmit={(e) => {
      e.preventDefault()
      if (!disabled) onCapture(`data:image/jpeg;base64,${btoa(`face:${new FormData(e.currentTarget).get('who') as string}`)}`)
    }}>
      <input name="who" aria-label="Face in view" />
      <button type="submit" disabled={disabled}>{captureLabel}</button>
    </form>
  ),
}))

async function signIn(identifier: string, path: string) {
  const user = userEvent.setup()
  renderApp(path)
  await user.type(await screen.findByLabelText(/(staff|registration) number or email/i), identifier)
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  return user
}

async function photograph(user: ReturnType<typeof userEvent.setup>, who: string, button: RegExp) {
  const input = await screen.findByLabelText('Face in view')
  await user.clear(input)
  await user.type(input, who)
  await user.click(screen.getByRole('button', { name: button }))
}

describe('face check-in terminal', () => {
  it('identifies a student, records them only when the lecturer confirms, and shows them as Face on the live session', async () => {
    const { session } = openMockSessionForScan('u1')
    const user = await signIn('LEC00123', `/session/${session.id}/face`)

    await photograph(user, 'Amina Wanjiku Kamau', /identify student/i)
    const match = await screen.findByRole('region', { name: 'Match' })
    expect(within(match).getByText('Amina Wanjiku Kamau')).toBeInTheDocument()
    expect(within(match).getByText('SC211/0001/2022')).toBeInTheDocument()
    expect(within(match).getByRole('timer')).toHaveTextContent(/confirm within/i)
    // While a match waits for the lecturer, the next photo can't replace it.
    expect(screen.getByRole('button', { name: /identify student/i })).toBeDisabled()

    await user.click(within(match).getByRole('button', { name: /confirm/i }))
    expect(await screen.findByText('Amina Wanjiku Kamau is marked present.')).toBeInTheDocument()
    const recent = await screen.findByRole('region', { name: /recent face check-ins/i })
    expect(within(recent).getByText('Amina Wanjiku Kamau')).toBeInTheDocument()

    // The same student again: already recorded, nothing to confirm.
    await photograph(user, 'Amina Wanjiku Kamau', /identify student/i)
    expect(await screen.findByRole('alert')).toHaveTextContent(/already checked in/i)
    expect(screen.queryByRole('region', { name: 'Match' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /back to the live session/i }))
    const attendees = await screen.findByRole('region', { name: /checked-in students/i })
    const row = within(attendees).getByText('Amina Wanjiku Kamau').closest('li')!
    expect(within(row).getByText('Face')).toBeInTheDocument()
  })

  it('records nobody when the lecturer says it is not them', async () => {
    const { session } = openMockSessionForScan('u1')
    const user = await signIn('LEC00123', `/session/${session.id}/face`)

    await photograph(user, 'Amina Wanjiku Kamau', /identify student/i)
    await user.click(within(await screen.findByRole('region', { name: 'Match' })).getByRole('button', { name: /not them/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not confirmed/i)
    expect(screen.queryByRole('region', { name: /recent face check-ins/i })).not.toBeInTheDocument()
  })

  it.each([
    ['nobody', /not recognised/i],
    ['twins', /not sure who this is/i],
    ['none', /no face found/i],
    // Has an account, but on another unit (and never registered): never a candidate here.
    ['Cynthia Achieng Ouma', /not recognised/i],
  ])('tells the lecturer what to do when the photo of %s matches nobody', async (who, message) => {
    const { session } = openMockSessionForScan('u1')
    const user = await signIn('LEC00123', `/session/${session.id}/face`)
    await photograph(user, who, /identify student/i)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    // The camera stays ready for the next try.
    expect(screen.getByRole('button', { name: /identify student/i })).toBeEnabled()
  })

  it('is reached from the live session', async () => {
    const { session } = openMockSessionForScan('u1')
    const user = await signIn('LEC00123', `/session/${session.id}`)
    await user.click(await screen.findByRole('link', { name: /face check-in/i }))
    expect(await screen.findByRole('button', { name: /identify student/i })).toBeInTheDocument()
  })
})

describe('registering faces from the unit roster', () => {
  it("shows each student's face status, and registers a face from three photos", async () => {
    const user = await signIn('LEC00123', '/units/u1')
    const students = await screen.findByRole('region', { name: 'Students' })
    const row = (name: string) => within(students).getByText(name).closest('li')!

    expect(within(row('Amina Wanjiku Kamau')).getByText('Face registered')).toBeInTheDocument()
    // No account yet: nothing to show.
    expect(within(row('Felix Kiprono Rotich')).queryByText(/face/i)).not.toBeInTheDocument()

    await user.click(within(row('Brian Otieno Odhiambo')).getByRole('button', { name: /register face/i }))
    const dialog = await screen.findByRole('dialog', { name: /register face: brian otieno odhiambo/i })
    expect(within(dialog).getByText(/check their student id card/i)).toBeInTheDocument()

    await photograph(user, 'Brian Otieno Odhiambo', /take photo 1 of 3/i)
    await photograph(user, 'Brian Otieno Odhiambo', /take photo 2 of 3/i)
    await photograph(user, 'Brian Otieno Odhiambo', /take photo 3 of 3/i)
    await user.click(within(dialog).getByRole('button', { name: /save face/i }))

    expect(await screen.findByText("Brian Otieno Odhiambo's face is registered.")).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await within(row('Brian Otieno Odhiambo')).findByText('Face registered')).toBeInTheDocument()
  })

  it("shows when a student hasn't turned face check-in on, with no way to register them", async () => {
    await signIn('LEC00123', '/units/u2')
    const students = await screen.findByRole('region', { name: 'Students' })
    const cynthia = within(students).getByText('Cynthia Achieng Ouma').closest('li')!
    expect(within(cynthia).getByText('Face check-in off')).toBeInTheDocument()
    expect(within(cynthia).queryByRole('button', { name: /register face/i })).not.toBeInTheDocument()
  })

  it('asks for only the photo the server could not use to be retaken', async () => {
    const user = await signIn('LEC00123', '/units/u1')
    const students = await screen.findByRole('region', { name: 'Students' })
    await user.click(within(within(students).getByText('Brian Otieno Odhiambo').closest('li')!).getByRole('button', { name: /register face/i }))

    await photograph(user, 'Brian Otieno Odhiambo', /take photo 1 of 3/i)
    await photograph(user, 'none', /take photo 2 of 3/i)
    await photograph(user, 'Brian Otieno Odhiambo', /take photo 3 of 3/i)
    await user.click(screen.getByRole('button', { name: /save face/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no face found/i)
    expect(screen.getByRole('button', { name: /take photo 3 of 3/i })).toBeInTheDocument()
  })

  it("removes a registered face, keeping the student's consent", async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await signIn('LEC00123', '/units/u1')
    const students = await screen.findByRole('region', { name: 'Students' })
    const amina = () => within(students).getByText('Amina Wanjiku Kamau').closest('li')!

    await user.click(within(amina()).getByRole('button', { name: /^remove face$/i }))
    expect(await screen.findByText("Amina Wanjiku Kamau's face was removed.")).toBeInTheDocument()
    expect(await within(amina()).findByRole('button', { name: /register face/i })).toBeInTheDocument()
  })
})

describe("the student's face check-in consent", () => {
  it('is off until the student agrees, and turning it off says it deletes their face', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await signIn('STU00042', '/student-profile')

    const card = await screen.findByRole('heading', { name: 'Face check-in' })
    expect(await screen.findByText(/you check in by scanning the qr code only/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /turn on face check-in/i }))
    const turnOn = screen.getByRole('button', { name: /^turn on$/i })
    expect(turnOn).toBeDisabled()
    await user.click(screen.getByLabelText(/i agree to my face being used/i))
    await user.click(turnOn)
    expect(await screen.findByText(/your face isn't registered yet/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /turn off and delete my face data/i }))
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/will be deleted/i))
    expect(await screen.findByText(/you check in by scanning the qr code only/i)).toBeInTheDocument()
    expect(card).toBeInTheDocument()
  })
})
