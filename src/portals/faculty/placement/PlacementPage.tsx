import { useEffect, useState } from 'react'
import { LecturerPlacement } from '@/components/oversight/LecturerPlacement'
import { useFacultyDepartments } from '../departments/departmentsApi'
import { useMoveLecturer, usePlacementLecturers } from './placementApi'

/** Placing unassigned lecturers in the faculty's departments, and moving staff between them. */
export function PlacementPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(id)
  }, [search])

  const { data, isPending, error, refetch } = usePlacementLecturers({ search: debounced, unassignedOnly })
  const { data: departments } = useFacultyDepartments()
  const move = useMoveLecturer()

  return (
    <div className="mx-auto max-w-4xl">
      <LecturerPlacement
        lecturers={data}
        isPending={isPending}
        error={error}
        refetch={refetch}
        departments={(departments ?? []).map((d) => ({ id: d.departmentId, name: d.departmentName }))}
        search={search}
        onSearchChange={setSearch}
        unassignedOnly={unassignedOnly}
        onUnassignedOnlyChange={setUnassignedOnly}
        onMove={(lecturerUserId, departmentId) => move.mutateAsync({ lecturerUserId, departmentId })}
      />
    </div>
  )
}
