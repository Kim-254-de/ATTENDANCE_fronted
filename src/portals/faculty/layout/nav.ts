import { BookOpen, Building2, GraduationCap, LayoutGrid, Users } from 'lucide-react'

/**
 * The portal's primary navigation, shared by Sidebar (lg+) and BottomNav
 * (below lg) so the two can never list different pages. One more item than
 * the department portal: Departments, the faculty's own distinguishing view.
 */
export const nav = [
  { to: '/faculty-dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/faculty-departments', label: 'Departments', icon: Building2 },
  { to: '/faculty-lecturers', label: 'Lecturers', icon: GraduationCap },
  { to: '/faculty-students', label: 'Students', icon: Users },
  { to: '/faculty-units', label: 'Units', icon: BookOpen },
]
