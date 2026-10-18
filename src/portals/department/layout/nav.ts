import { BookOpen, GraduationCap, LayoutGrid, Library, Users } from 'lucide-react'

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
]
