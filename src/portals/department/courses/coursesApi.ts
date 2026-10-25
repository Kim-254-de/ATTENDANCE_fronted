import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AllocatedUnit, CourseOffering, LecturerDirectoryEntry } from '@/types'

const COURSES_KEY = ['department', 'courses'] as const

/** Courses provided to the department, with how many of their planned segments are filled. */
export const useDepartmentCourses = () =>
  useQuery({
    queryKey: COURSES_KEY,
    queryFn: async () => (await api.get<CourseOffering[]>('/departments/courses')).data,
    staleTime: 30_000,
  })

/** How many lecturer-taught sections a course needs. */
export const useSetSegmentCount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ offeringId, segmentsPlanned }: { offeringId: string; segmentsPlanned: number }) =>
      (await api.patch<{ offeringId: string; segmentsPlanned: number }>(`/departments/courses/${offeringId}`, { segmentsPlanned })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: COURSES_KEY }),
  })
}

/**
 * Lecturers who can be allocated to a section: anyone in the institution, own staff first. A
 * department may borrow another department's lecturer; the unit stays this department's.
 */
export const useLecturerDirectory = (search: string) =>
  useQuery({
    queryKey: ['department', 'lecturer-directory', search],
    queryFn: async () =>
      (await api.get<LecturerDirectoryEntry[]>('/departments/lecturer-directory', { params: search ? { q: search } : {} })).data,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })

/** Allocates a lecturer, own staff or borrowed, to the next open segment — immediate, creates a real unit owned by this department. */
export const useAllocateLecturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ offeringId, lecturerUserId }: { offeringId: string; lecturerUserId: string }) =>
      (await api.post<AllocatedUnit>(`/departments/courses/${offeringId}/segments`, { lecturerUserId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      qc.invalidateQueries({ queryKey: ['department', 'lecturers'] });
      qc.invalidateQueries({ queryKey: ['department', 'units'] });
    },
  })
}
