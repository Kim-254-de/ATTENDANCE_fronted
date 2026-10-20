import { Building2, GraduationCap, Landmark, UserCog } from 'lucide-react'

/** Shared by Sidebar (lg+) and BottomNav (below lg). */
export const nav = [
  { to: '/admin', label: 'Officers', icon: UserCog, end: true },
  { to: '/admin-faculties', label: 'Faculties', icon: Landmark },
  { to: '/admin-departments', label: 'Departments', icon: Building2 },
  { to: '/admin-lecturers', label: 'Lecturers', icon: GraduationCap },
]
