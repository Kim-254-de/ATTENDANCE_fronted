import { Landmark, UserCog } from 'lucide-react'

/** Shared by Sidebar (lg+) and BottomNav (below lg). */
export const nav = [
  { to: '/admin', label: 'Officers', icon: UserCog, end: true },
  { to: '/admin-faculties', label: 'Faculties', icon: Landmark },
]
