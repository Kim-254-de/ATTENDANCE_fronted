import { BookOpen, Building2, GraduationCap, LayoutGrid, Library, Users } from 'lucide-react'

/**
 * The portal's primary navigation, shared by Sidebar (lg+) and BottomNav
 * (below lg) so the two can never list different pages. Two more items than
 * the department portal: Departments, the faculty's own distinguishing view,
 * and Courses, a faculty-wide view across every department (the department
 * portal's own Courses page is the one place to actually assign a lecturer).
 */
export const nav = [
  { to: '/faculty-dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/faculty-departments', label: 'Departments', icon: Building2 },
  { to: '/faculty-courses', label: 'Courses', icon: Library },
  { to: '/faculty-lecturers', label: 'Lecturers', icon: GraduationCap },
  { to: '/faculty-students', label: 'Students', icon: Users },
  { to: '/faculty-units', label: 'Units', icon: BookOpen },
]
