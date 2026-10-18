/**
 * Each role's landing page — where an account goes when it has nowhere better
 * to be: straight after signing in, on the site root, or after RequireAuth
 * turns it away from another portal's page. One map rather than a ternary per
 * call site, so adding a portal is a single line here.
 */
export const ROLE_HOME: Record<string, string> = {
  lecturer: '/lecturer-dashboard',
  student: '/student-dashboard',
  department: '/department-dashboard',
  faculty: '/faculty-dashboard',
  admin: '/admin',
  qa: '/qa-dashboard',
}

/**
 * Roles that sign in at the unlisted staff page (/oversight) rather than from
 * the public role selector: their accounts are invited, never self-made.
 */
export const OVERSIGHT_ROLES: ReadonlySet<string> = new Set(['department', 'faculty', 'admin', 'qa'])

export const roleHome = (role: string) => ROLE_HOME[role] ?? '/'
