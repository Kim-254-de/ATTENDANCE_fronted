import { useEffect, useState } from 'react'
import { LecturerPlacement } from '@/components/oversight/LecturerPlacement'
import { useAdminDepartments, useAdminLecturers, useAdminMoveLecturer } from './adminApi'

/** Placing lecturers in departments across the whole institution — the one place a lecturer can change faculty. */
export function LecturersPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])

  const { data, isPending, error, refetch } = useAdminLecturers({ search: debounced, unassignedOnly })
  const { data: departments } = useAdminDepartments()
  const move = useAdminMoveLecturer()

  return (
    <div className="mx-auto max-w-4xl">
      <LecturerPlacement
        lecturers={data}
        isPending={isPending}
        error={error}
        refetch={refetch}
        departments={(departments ?? []).map((d) => ({ id: d.departmentId, name: d.name, group: d.facultyName ?? 'No faculty' }))}
        search={search}
        onSearchChange={setSearch}
        unassignedOnly={unassignedOnly}
        onUnassignedOnlyChange={setUnassignedOnly}
        onMove={(lecturerUserId, departmentId) => move.mutateAsync({ lecturerUserId, departmentId })}
      />
    </div>
  )
}
