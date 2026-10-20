<<<<<<< Updated upstream
import { Building2, GraduationCap, Landmark, UserCog } from 'lucide-react'
=======
import { BookCheck, Landmark, UserCog } from 'lucide-react'
>>>>>>> Stashed changes

/** Shared by Sidebar (lg+) and BottomNav (below lg). */
export const nav = [
  { to: '/admin', label: 'Officers', icon: UserCog, end: true },
  { to: '/admin-faculties', label: 'Faculties', icon: Landmark },
<<<<<<< Updated upstream
  { to: '/admin-departments', label: 'Departments', icon: Building2 },
  { to: '/admin-lecturers', label: 'Lecturers', icon: GraduationCap },
=======
  { to: '/admin-units', label: 'Units', icon: BookCheck },
>>>>>>> Stashed changes
]
