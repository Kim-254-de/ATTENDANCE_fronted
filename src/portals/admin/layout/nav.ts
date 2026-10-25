import { BookCheck, Building2, CalendarCog, GraduationCap, UserCog } from 'lucide-react'

/** Shared by Sidebar (lg+) and BottomNav (below lg). */
export const nav = [
  { to: '/admin', label: 'Officers', icon: UserCog, end: true },
  { to: '/admin-departments', label: 'Departments', icon: Building2 },
  { to: '/admin-lecturers', label: 'Lecturers', icon: GraduationCap },
  { to: '/admin-units', label: 'Units', icon: BookCheck },
  // SMARTTT's timetable, notifications, staff IDs and venues: one console for both systems.
  { to: '/admin-smarttt', label: 'SMARTTT', icon: CalendarCog },
]
