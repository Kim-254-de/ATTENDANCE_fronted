import { ClipboardCheck, LayoutGrid, ListChecks, MessageSquareQuote, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react'

/**
 * The portal's primary navigation, shared by Sidebar (lg+) and BottomNav
 * (below lg) so the two can never list different pages. A QA officer's
 * remit is institution-wide — there is no "my department" equivalent — so
 * every page here is its own standalone list rather than a drill-down chain.
 */
export const nav = [
  { to: '/qa-dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/qa-standards', label: 'Standards', icon: ShieldCheck },
  { to: '/qa-checklists', label: 'Checklists', icon: ListChecks },
  { to: '/qa-audits', label: 'Audits', icon: ClipboardCheck },
  { to: '/qa-corrective-actions', label: 'Corrective Actions', icon: Wrench },
  { to: '/qa-evaluations', label: 'Course Evaluations', icon: MessageSquareQuote },
  { to: '/qa-eligibility', label: 'Exam Eligibility', icon: ShieldAlert },
]
