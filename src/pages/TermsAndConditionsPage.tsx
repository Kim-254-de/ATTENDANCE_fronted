import { useState } from 'react'
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By using the Smart Attendance System, you agree to follow these terms and the university procedures that apply to your courses. Please read them before using attendance features.',
  },
  {
    title: 'User Registration and Account Security',
    body: 'Create and use your own account. Keep your password private, choose a strong password, and tell the university support team promptly if you think someone else has accessed your account.',
  },
  {
    title: 'Accurate Information',
    body: 'Provide information that is complete and correct. Tell the appropriate university office if your account details are wrong or change.',
  },
  {
    title: 'Attendance Recording',
    body: 'Attendance records show the check-ins accepted by the system. A successful check-in does not replace any separate course or university attendance requirements.',
  },
  {
    title: 'QR Code Usage',
    body: 'Use the QR code shown for your class and follow the lecturer’s instructions. Codes may be time-limited or refreshed. A scan may fail if a code has expired or your attendance has already been recorded.',
  },
  {
    title: 'Biometric and Facial Recognition',
    body: 'A course or institution may enable additional identity checks. Biometric or facial recognition should only be used when the university has confirmed that it is part of the process and explained the applicable options and handling of that information.',
  },
  {
    title: 'Privacy and Protection of Personal Data',
    body: 'The system uses account and attendance information to provide attendance services. Access should be limited to people who need it for university duties. For details about information collected, its use, and your choices, contact the university through its official support channels.',
  },
  {
    title: 'Acceptable Use of the System',
    body: 'Use the system for university attendance and related activities. Follow course instructions, respect other people’s information, and report suspected errors or security concerns.',
  },
  {
    title: 'Prohibited Activities',
    body: 'Do not register or check in as another student, share login credentials, falsify attendance, copy or manipulate QR codes, interfere with the system, or attempt to bypass any identity verification.',
  },
  {
    title: 'Attendance Corrections and Disputes',
    body: 'If a record is missing or incorrect, contact your lecturer or the relevant university office as soon as possible. Include the course, class date, and a clear explanation. The university will review the information and advise you of the outcome.',
  },
  {
    title: 'System Availability and Technical Problems',
    body: 'The system may sometimes be unavailable, delayed, or affected by network or device problems. If you cannot check in, tell your lecturer promptly and follow the course’s alternative attendance instructions.',
  },
  {
    title: 'Student Responsibilities',
    body: 'Use your own account and device where possible, check that a check-in was successful, protect your credentials, and raise attendance or technical issues through the appropriate university channel.',
  },
  {
    title: 'Administrator and Lecturer Responsibilities',
    body: 'Authorized staff should use attendance information only for appropriate university duties, handle reports carefully, and follow institutional procedures when reviewing corrections or access concerns.',
  },
  {
    title: 'Data Retention and Deletion',
    body: 'Attendance and account information is kept and deleted according to the university’s applicable records practices. Contact the university to ask about the retention period or how to make a request about your information.',
  },
  {
    title: 'Account Suspension or Termination',
    body: 'Access may be limited or removed when an account is misused, no longer authorized, or needs protection. Where appropriate, the university will explain the reason and how you can raise a concern.',
  },
  {
    title: 'Changes to the Terms and Conditions',
    body: 'These terms may be updated as the system or university procedures change. The current version will be made available through the system. If a change needs your agreement, the university should ask you to review it.',
  },
  {
    title: 'Limitation of Liability',
    body: 'The university works to keep attendance information accurate and the system available, but technical problems can occur. This section does not remove any rights or responsibilities that cannot be limited under the rules that apply to your institution.',
  },
  {
    title: 'Contact and Support Information',
    body: 'For help with your account, a check-in, or these terms, contact your lecturer or the university’s official IT or student support team. Use the contact details published by your institution.',
  },
]

export function TermsAndConditionsPage() {
  const [agreed, setAgreed] = useState(false)
  const [response, setResponse] = useState<'accepted' | 'declined' | null>(null)

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 hover:text-navy-700">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-navy-900">
            <GraduationCap className="size-5 text-gold-600" aria-hidden="true" />
            Smart Attendance
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 border-b border-line pb-7 sm:mb-10 sm:pb-9">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-navy-700">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            Student information
          </p>
          <h1 className="text-3xl font-bold text-navy-950 sm:text-4xl">Terms and Conditions</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            These terms explain how to use the university attendance system and what to expect when recording attendance.
          </p>
        </div>

        <ol className="grid list-none gap-x-12 gap-y-7 p-0 md:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.title} className="flex gap-4 border-b border-line pb-6">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold-100 text-sm font-bold text-navy-900" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <section aria-labelledby={`terms-section-${index + 1}`}>
                <h2 id={`terms-section-${index + 1}`} className="text-base font-bold text-navy-900">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink">{section.body}</p>
              </section>
            </li>
          ))}
        </ol>

        <section aria-label="Your agreement" className="mt-10 border-t-2 border-navy-900 bg-white p-5 shadow-[0_1px_3px_rgba(18,48,95,0.08)] sm:p-7">
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium leading-6 text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked)
                setResponse(null)
              }}
              className="mt-1 size-4 shrink-0 accent-navy-900"
            />
            <span>I have read, understood, and agree to the Terms and Conditions of the System.</span>
          </label>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setResponse('declined')}
              className="min-h-11 rounded-md border border-line px-5 text-sm font-semibold text-navy-900 transition-colors hover:bg-surface"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={!agreed}
              onClick={() => setResponse('accepted')}
              className="min-h-11 rounded-md bg-navy-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-900/40"
            >
              Accept
            </button>
          </div>
          {response && (
            <p role="status" className={`mt-4 text-sm font-medium ${response === 'accepted' ? 'text-success' : 'text-muted'}`}>
              {response === 'accepted'
                ? 'Thank you for reviewing and accepting these terms.'
                : 'You have declined these terms. Contact your university support team for guidance.'}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
