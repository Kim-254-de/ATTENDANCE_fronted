import { Building2 } from 'lucide-react'

/**
 * The sidebar's navigation. One entry: every other page is reached by
 * tapping down from it (a department, a year, a unit), and stays highlighted
 * while you are anywhere below it.
 */
export const nav = [
  { to: '/management', label: 'Departments', icon: Building2, end: false },
]
