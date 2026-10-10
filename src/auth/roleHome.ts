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
}

export const roleHome = (role: string) => ROLE_HOME[role] ?? '/'
