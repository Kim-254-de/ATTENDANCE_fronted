import { BookOpen, GraduationCap, LayoutGrid, Library, MessageSquareQuote, ShieldAlert, TabletSmartphone, Users } from 'lucide-react'

/**
 * The portal's primary navigation, shared by Sidebar (lg+) and BottomNav
 * (below lg) so the two can never list different pages.
 */
export const nav = [
  { to: '/department-dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/department-courses', label: 'Courses', icon: Library },
  { to: '/department-lecturers', label: 'Lecturers', icon: GraduationCap },
  { to: '/department-students', label: 'Students', icon: Users },
  { to: '/department-units', label: 'Units', icon: BookOpen },
  { to: '/department-eligibility', label: 'Exam Eligibility', icon: ShieldAlert },
  { to: '/department-evaluations', label: 'Evaluations', icon: MessageSquareQuote },
  { to: '/department-terminals', label: 'Terminals', icon: TabletSmartphone },
]
