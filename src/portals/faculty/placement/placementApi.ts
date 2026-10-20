import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PlacementLecturer, PlacementResult } from '@/types'

/** Every unassigned lecturer in the institution, then the faculty's own staff. */
export const usePlacementLecturers = (filters: { search: string; unassignedOnly: boolean }) =>
  useQuery({
    queryKey: ['faculty', 'placement', filters],
    queryFn: async () =>
      (await api.get<PlacementLecturer[]>('/faculties/lecturer-placement', {
        params: { ...(filters.search ? { q: filters.search } : {}), ...(filters.unassignedOnly ? { unassigned: 'true' } : {}) },
      })).data,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })

/** Places an unassigned lecturer in one of the faculty's departments, or moves one of its staff. */
export const useMoveLecturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lecturerUserId, departmentId }: { lecturerUserId: string; departmentId: string }) =>
      (await api.patch<PlacementResult>(`/faculties/lecturers/${lecturerUserId}/department`, { departmentId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty'] })
    },
  })
}
