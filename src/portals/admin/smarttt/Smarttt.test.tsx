import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderApp } from '@/test/renderApp'

/**
 * The one admin console: SMARTTT's admin functions (its old separate admin
 * page) and SMARTTT-owned departments, against the mock API.
 */

afterEach(() => { vi.restoreAllMocks() })

async function signInAsAdmin(user: ReturnType<typeof userEvent.setup>, path = '/oversight') {
  renderApp(path)
  await screen.findByRole('heading', { name: /staff sign-in/i })
  await user.type(screen.getByLabelText(/^email$/i), 'admin@university.edu')
  await user.type(screen.getByLabelText(/^password$/i), 'password')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
  await screen.findByRole('table')
}

const openSmarttt = async (user: ReturnType<typeof userEvent.setup>, tab: RegExp) => {
  await user.click(screen.getAllByRole('link', { name: /^smarttt$/i })[0]!)
  await user.click(within(await screen.findByRole('navigation', { name: 'SMARTTT' })).getByRole('link', { name: tab }))
}

const file = (name: string, type = 'application/octet-stream') => new File(['content'], name, { type })

/**
 * Answers a file upload as SMARTTT would. jsdom under vitest cannot build a
 * fetch Request from FormData holding a File, so MSW never sees uploads; they
 * are answered at the API client instead (the backend's tests cover the bytes
 * reaching SMARTTT). Everything else still goes through MSW.
 */
function answerUploads(answer: unknown) {
  const post = api.post.bind(api)
  return vi.spyOn(api, 'post').mockImplementation((url, data, config) =>
    data instanceof FormData ? Promise.resolve({ data: answer, status: 200, statusText: 'OK', headers: {}, config: config ?? {} }) : post(url, data, config))
}

describe("SMARTTT's admin functions in the console", () => {
  it('lists the terms and makes another one current', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await user.click(screen.getAllByRole('link', { name: /^smarttt$/i })[0]!)

    // The section opens on its terms.
    const row = (await screen.findByText('2025/2026 Semester 3')).closest('tr')!
    expect(within(screen.getByText('2026/2027 Semester 1').closest('tr')!).getByText('Current')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: /make current/i }))
    expect(await screen.findByText('2025/2026 Semester 3 is now the current term.')).toBeInTheDocument()
    expect(within(row).getByText('Current')).toBeInTheDocument()
  })

  it('uploads the master timetable and reports how it went', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await openSmarttt(user, /master timetable/i)
    expect(await screen.findByText('TUN_SEP_DEC_2026_TT_V2.pdf')).toBeInTheDocument()

    const uploaded = answerUploads({ batch_id: 'upload-2', status: 'processing' })
    await user.upload(screen.getByLabelText('Timetable file'), file('TT.pdf', 'application/pdf'))
    await user.click(screen.getByRole('button', { name: /^upload$/i }))
    const form = uploaded.mock.calls[0]![1] as FormData
    expect(uploaded.mock.calls[0]![0]).toBe('/admin/smarttt/timetable/uploads')
    expect((form.get('file') as File).name).toBe('TT.pdf')
    expect(await screen.findByText('Done: 900 of 902 rows saved, 2 failed.')).toBeInTheDocument()
  })

  it('refuses a file of the wrong type before sending it', async () => {
    const user = userEvent.setup({ applyAccept: false })
    await signInAsAdmin(user)
    await openSmarttt(user, /venues/i)
    await user.upload(await screen.findByLabelText('Capacities file'), file('rooms.pdf'))
    await user.click(screen.getByRole('button', { name: /upload capacities/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Only .csv, .xlsx files are accepted.')
  })

  it("uploads a department's allocation and shows what matched", async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await openSmarttt(user, /lecturer allocation/i)
    expect(await screen.findByText('Computer Science and ICT')).toBeInTheDocument()

    const uploaded = answerUploads({
      detail: 'Saved 3 allocation row(s) from Mathematics.', source: 'Mathematics', academic_year: '2026/2027', awaiting_timetable: false,
      matched: 2, unmatched: 1, slots_updated: 4, conflict_slots: 0,
      results: [{ unit_code: 'MATH 110', lecturer: 'Dr. Jane Otieno', group: null, programme: 'BSc Mathematics', year_semester: 'Y1S1', slots_assigned: 2, account_linked: true }],
      not_found: [{ unit_code: 'MATH 999', lecturer: 'Dr. Unknown', reason: 'no such unit in the timetable' }],
      conflicts: [],
    })
    await user.upload(screen.getByLabelText('Allocation document'), file('MATH.docx'))
    await user.click(screen.getByRole('button', { name: /upload allocation/i }))
    expect((uploaded.mock.calls[0]![1] as FormData).get('dry_run')).toBeNull()
    expect(await screen.findByText('Saved 3 allocation row(s) from Mathematics.')).toBeInTheDocument()
    expect(screen.getByText(/2 matched, 1 not matched, 4 slot\(s\) updated/)).toBeInTheDocument()
    expect(screen.getByText(/MATH 999/)).toBeInTheDocument()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /remove computer science and ict's allocation/i }))
    expect(await screen.findByText('Removed the allocation from Computer Science and ICT.')).toBeInTheDocument()
  })

  it('sends a notification to one programme', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await openSmarttt(user, /notifications/i)
    expect(await screen.findByText('Timetable V2 is out')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), 'Room change')
    await user.type(screen.getByLabelText('Message'), 'COSC 103 moves to LH2.')
    await user.selectOptions(screen.getByLabelText('Send to'), 'program')
    const programme = screen.getByLabelText('Programme')
    await within(programme).findByRole('option', { name: 'BSc Computer Science' })
    await user.selectOptions(programme, 'BSc Computer Science')
    await user.click(screen.getByRole('button', { name: /send notification/i }))
    expect(await screen.findByText(/Sent to 340 student\(s\)/)).toBeInTheDocument()
    expect(await screen.findByText('Room change')).toBeInTheDocument()
  })

  it('removes a staff ID after a warning', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await openSmarttt(user, /staff ids/i)
    expect(await screen.findByText('STF/0002')).toBeInTheDocument()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Remove STF/0001' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('lecturer account registered with it is disabled'))
    expect(await screen.findByText('Staff ID removed.')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByText('STF/0001')).not.toBeInTheDocument())
  })

  it('shows the venues still on a placeholder capacity', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user)
    await openSmarttt(user, /venues/i)
    expect(await screen.findByText(/99 of 102 venue\(s\) have a confirmed capacity/)).toBeInTheDocument()
    expect(screen.getByText('G 12, UTC-AA 3, STB 4')).toBeInTheDocument()
  })
})

describe('departments, owned by SMARTTT', () => {
  it('marks a department that only exists here and sends it to SMARTTT', async () => {
    const user = userEvent.setup()
    await signInAsAdmin(user, '/oversight')
    await user.click(screen.getAllByRole('link', { name: /^departments$/i })[0]!)

    const row = (await screen.findByRole('cell', { name: 'Accounting' })).closest('tr')!
    expect(within(row).getByText('Only here')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /send to smarttt/i }))
    expect(await screen.findByText(/Sent 1 department\(s\) to SMARTTT/)).toBeInTheDocument()
    await vi.waitFor(() => expect(within(screen.getByRole('cell', { name: 'Accounting' }).closest('tr')!).getByText('Linked')).toBeInTheDocument())
  })
})

describe('administrators come from SMARTTT', () => {
  it('offers no administrator invitations, and says how administrators are added', async () => {
    vi.stubEnv('VITE_SMARTTT_ACCOUNTS', 'true')
    const user = userEvent.setup()
    await signInAsAdmin(user)
    const roles = screen.getByLabelText('Role')
    expect(within(roles).queryByRole('option', { name: 'Administrator' })).not.toBeInTheDocument()
    expect(screen.getByText(/give the person staff status in SMARTTT/i)).toBeInTheDocument()
  })

  it('tells administrators at the staff sign-in page to use their SMARTTT login', async () => {
    vi.stubEnv('VITE_SMARTTT_ACCOUNTS', 'true')
    renderApp('/oversight')
    expect(await screen.findByText(/Administrators: your SMARTTT login and password/)).toBeInTheDocument()
  })
})
