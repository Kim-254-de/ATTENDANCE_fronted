/**
 * Marks a lecturer who teaches one of the department's (or faculty's) units
 * but belongs to another department, or to none yet. Units belong to the
 * department that owns the curriculum, so a borrowed lecturer's figures here
 * cover only the units they teach for it.
 */
export function BorrowedBadge({ homeDepartmentName }: { homeDepartmentName: string | null }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
      title="Teaches here, but is on another department's staff. Figures cover only the units taught here."
    >
      {homeDepartmentName ? `From ${homeDepartmentName}` : 'Unassigned'}
    </span>
  )
}
