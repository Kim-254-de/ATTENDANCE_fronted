import type { Account } from '@/types'

export type OfficerRole = 'admin' | 'department' | 'management' | 'qa'
export type Officer = Extract<Account, { role: OfficerRole }>

/** "Department officer · Computer Science": what this account is, and over what. */
export function officerSubtitle(user: Officer): string {
  switch (user.role) {
    case 'admin': return 'Administrator'
    case 'department': return `Department officer · ${user.departmentName}`
    case 'management': return 'Management'
    case 'qa': return user.title ? `Quality assurance · ${user.title}` : 'Quality assurance officer'
  }
}
