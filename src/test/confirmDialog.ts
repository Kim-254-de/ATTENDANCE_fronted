import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Finds the open confirm dialog by its title and returns it, so a test can read what it says. */
export function findConfirm(title: RegExp | string) {
  return screen.findByRole('dialog', { name: title })
}

/** Answers the open confirm dialog named `title` by pressing `button` ("Cancel" or the action). */
export async function answerConfirm(user: UserEvent, title: RegExp | string, button: RegExp | string) {
  const dialog = await findConfirm(title)
  await user.click(within(dialog).getByRole('button', { name: button }))
  return dialog
}
