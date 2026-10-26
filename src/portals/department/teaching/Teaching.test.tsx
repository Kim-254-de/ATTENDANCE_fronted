import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { env } from '@/lib/env'
import { renderApp } from '@/test/renderApp'

/**
 * The department's Teaching page, against the in-memory teaching API
 * (src/mocks/teaching.ts): the seeded department has one course, one unit
 * as a whole class with no lecturer yet, and one lecturer on its list.
 */

const navLink = (name: RegExp) => screen.getAllByRole('link', { name })[0]!

async function openTeaching() {
  const user = userEvent.setup()
  renderApp('/oversight')
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), 'g.mutiso@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await screen.findByText('82.3%')
  await user.click(navLink(/^teaching$/i))
  await screen.findByText('COSC 103')
  return user
}

afterEach(() => { vi.restoreAllMocks() })

describe('department teaching', () => {
  it('replaces the old Courses page', async () => {
    renderApp('/department-courses')
    // Signed out, the redirect lands on the staff sign-in; the nav no longer has Courses.
    expect(await screen.findByRole('heading', { name: /staff sign-in/i })).toBeInTheDocument()
  })

  it('says what blocks publishing, then publishes once every group has a lecturer', async () => {
    const user = await openTeaching()
    expect(screen.getByText(/1 thing to finish before publishing/i)).toBeInTheDocument()
    expect(screen.getByText('COSC 103 has no lecturer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publish to the director/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^choose$/i }))
    const dialog = await screen.findByRole('dialog', { name: 'COSC 103' })
    await user.click(within(dialog).getByRole('button', { name: /mary wambui/i }))
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Dr. Mary Wambui (FT)')).toBeInTheDocument()
    const publish = screen.getByRole('button', { name: /publish to the director/i })
    expect(publish).toBeEnabled()
    await user.click(publish)
    expect(await screen.findByText(/published to the director by dept officer/i)).toBeInTheDocument()
    // Locked until reopened.
    expect(screen.queryByRole('button', { name: /add a unit/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /reopen/i }))
    expect(await screen.findByRole('button', { name: /add a unit/i })).toBeInTheDocument()
  })

  it('adds a course, then a unit taken by it, as one whole class', async () => {
    const user = await openTeaching()
    await user.click(screen.getByRole('tab', { name: /courses/i }))
    await user.click(screen.getByRole('button', { name: /add a course/i }))
    let dialog = await screen.findByRole('dialog', { name: /add a course/i })
    await user.type(within(dialog).getByLabelText(/programme/i), 'bsc.comp sci')
    await user.clear(within(dialog).getByLabelText(/^year$/i))
    await user.type(within(dialog).getByLabelText(/^year$/i), '2')
    await user.type(within(dialog).getByLabelText(/^students$/i), '60')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('BSC.COMP SCI Y2S1')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /units/i }))
    await user.click(screen.getByRole('button', { name: /add a unit/i }))
    dialog = await screen.findByRole('dialog', { name: /add a unit/i })
    await user.type(within(dialog).getByLabelText(/^code$/i), 'cosc 201')
    await user.type(within(dialog).getByLabelText(/^title$/i), 'Data Structures')
    await user.click(within(dialog).getByRole('checkbox', { name: /BSC.COMP SCI Y2S1/ }))
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('COSC 201')).toBeInTheDocument()
    expect(screen.getByText('COSC 201 has no lecturer.')).toBeInTheDocument()
  })

  it('offers the allocation form as PDF, Word and Excel', async () => {
    await openTeaching()
    expect(screen.getByRole('link', { name: /pdf/i })).toHaveAttribute('href', `${env.apiUrl}/departments/teaching/export/pdf`)
    expect(screen.getByRole('link', { name: /word/i })).toHaveAttribute('href', `${env.apiUrl}/departments/teaching/export/docx`)
    expect(screen.getByRole('link', { name: /excel/i })).toHaveAttribute('href', `${env.apiUrl}/departments/teaching/export/xlsx`)
  })

  it('says why a paper cannot be saved until a unit is ticked', async () => {
    const user = await openTeaching()
    await user.click(screen.getByRole('tab', { name: /^exams$/i }))
    await user.click(await screen.findByRole('button', { name: /add a paper/i }))
    const dialog = await screen.findByRole('dialog', { name: /add a paper/i })
    expect(within(dialog).getByText(/tick at least one unit to save/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^save$/i })).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox', { name: /cosc 103/i }))
    expect(within(dialog).queryByText(/tick at least one unit to save/i)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^save$/i })).toBeEnabled()
  })

  it('has exam papers and invigilators on their own tabs, without the teaching publish button', async () => {
    const user = await openTeaching()
    await user.click(screen.getByRole('tab', { name: /^exams$/i }))
    expect(await screen.findByText("COSC 103 is on no paper; add it to one, or mark it 'no written exam'.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publish papers/i })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /publish to the director/i })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /no written exam/i })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /invigilators/i }))
    expect(await screen.findByText(/the director hasn't shared an exam draft yet/i)).toBeInTheDocument()
  })
})

describe('the uploaded exam list', () => {
  it('reads the Word letter, shows what to check, saves the papers and lets the numbers be corrected', async () => {
    const user = await openTeaching()
    await user.click(screen.getByRole('tab', { name: /^exams$/i }))
    await user.click((await screen.findAllByRole('button', { name: /upload exam list/i }))[0]!)
    const dialog = await screen.findByRole('dialog', { name: /upload your exam list/i })
    const file = new File(['letter'], 'drafts.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    await user.upload(within(dialog).getByLabelText(/choose the \.docx file/i), file)

    expect(await within(dialog).findByText(/3 papers read/i)).toBeInTheDocument()
    expect(within(dialog).getByText('Same as line 1')).toBeInTheDocument()
    expect(within(dialog).getByText(/smarttt doesn't know math 999/i)).toBeInTheDocument()
    expect(within(dialog).getByText('Also listed by DBSC')).toBeInTheDocument()
    // The repeated row starts left out; leave out the unknown code too.
    expect(within(dialog).getByRole('checkbox', { name: 'Include line 3' })).not.toBeChecked()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Include line 4' }))
    await user.click(within(dialog).getByRole('button', { name: /save 2 papers/i }))

    expect(await screen.findByText('Linear Algebra')).toBeInTheDocument()
    expect(screen.getByText('92')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /^numbers/i })[0]!)
    const numbers = await screen.findByRole('dialog', { name: /students sitting math 241/i })
    const counts = within(numbers).getAllByRole('spinbutton', { name: 'Students' })
    await user.clear(counts[0]!)
    await user.type(counts[0]!, '95')
    await user.click(within(numbers).getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('107')).toBeInTheDocument()
  })
})
