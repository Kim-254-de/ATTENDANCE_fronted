import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { setThemePreference } from '@/lib/theme'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  afterEach(() => setThemePreference('system'))

  it('shows the next theme and cycles System → Dark → Light → System', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /switch to dark/i })

    await userEvent.click(button)
    expect(button).toHaveAccessibleName(/switch to light/i)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    await userEvent.click(button)
    expect(button).toHaveAccessibleName(/switch to system/i)
    expect(document.documentElement.dataset.theme).toBe('light')

    await userEvent.click(button)
    expect(button).toHaveAccessibleName(/switch to dark/i)
    expect(localStorage.getItem('theme')).toBeNull()
  })
})
