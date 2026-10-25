import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminDepartment, CreatedDepartment, DepartmentAlias, DirectoryStatus, DirectorySyncResult, DuplicateDepartment, InvitationResult, Officer, PlacementLecturer, PlacementResult, PendingUnit } from '@/types'

export const ADMIN_OFFICERS_KEY = ['admin', 'officers'] as const
const DEPARTMENTS_KEY = ['admin', 'departments'] as const
const PENDING_UNITS_KEY = ['admin', 'units', 'pending'] as const

/** Every administrator, member of management, department and QA officer, with invitation status. */
export const useAdminOfficers = () =>
  useQuery({
    queryKey: ADMIN_OFFICERS_KEY,
    queryFn: async () => (await api.get<Officer[]>('/admin/officers')).data,
    staleTime: 30_000,
  })

/**
 * Creates a department with its code: in SMARTTT first, then here. The
 * Timetable Allocator and Generator import it from here.
 */
export const useCreateDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; code: string }) => (await api.post<CreatedDepartment>('/admin/departments', input)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY })
      await qc.invalidateQueries({ queryKey: DIRECTORY_KEY })
    },
  })
}

const DIRECTORY_KEY = ['admin', 'directory'] as const

/** Departments belong to SMARTTT: whether it is connected, and what only exists here. */
export const useDirectoryStatus = () =>
  useQuery({ queryKey: DIRECTORY_KEY, queryFn: async () => (await api.get<DirectoryStatus>('/admin/directory')).data })

/** Reads SMARTTT's departments now and sends the ones only here to SMARTTT. */
export const useSyncDirectory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<DirectorySyncResult>('/admin/directory/sync', undefined, { timeout: 60_000 })).data,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: DIRECTORY_KEY })
      await qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY })
    },
  })
}

export type AdminInvitation =
  | { role: 'admin' | 'qa' | 'management' | 'timetabling'; fullName: string; email: string }
  | { role: 'department'; fullName: string; email: string; departmentId: string }

/** Invites an administrator, a QA officer, a member of management, or one department's officer. */
export const useAdminInvite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AdminInvitation) => (await api.post<InvitationResult>('/admin/invitations', input)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_OFFICERS_KEY })
    },
  })
}

/** Every department with its code: the admin's list, and the picker for placing lecturers and inviting officers. */
export const useAdminDepartments = () =>
  useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: async () => (await api.get<AdminDepartment[]>('/admin/departments')).data,
    staleTime: 60_000,
  })

/** Lecturers, unassigned ones first. */
export const useAdminLecturers = (filters: { search: string; unassignedOnly: boolean }) =>
  useQuery({
    queryKey: ['admin', 'lecturers', filters],
    queryFn: async () =>
      (await api.get<PlacementLecturer[]>('/admin/lecturers', {
        params: { ...(filters.search ? { q: filters.search } : {}), ...(filters.unassignedOnly ? { unassigned: 'true' } : {}) },
      })).data,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  })

/** Places or moves a lecturer in any department. */
export const useAdminMoveLecturer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lecturerUserId, departmentId }: { lecturerUserId: string; departmentId: string }) =>
      (await api.patch<PlacementResult>(`/admin/lecturers/${lecturerUserId}/department`, { departmentId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'lecturers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'departments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'department-aliases'] })
    },
  })
}

/** Groups of departments whose names mean the same thing ("Computer Science", "Department of Computer Science"). */
export const useDuplicateDepartments = () =>
  useQuery({
    queryKey: ['admin', 'department-duplicates'],
    queryFn: async () => (await api.get<DuplicateDepartment[][]>('/admin/department-duplicates')).data,
    staleTime: 30_000,
  })

/** Spellings of departments learned from placements and merges. */
export const useDepartmentAliases = () =>
  useQuery({
    queryKey: ['admin', 'department-aliases'],
    queryFn: async () => (await api.get<DepartmentAlias[]>('/admin/department-aliases')).data,
    staleTime: 30_000,
  })

/** Folds a duplicate department into the one kept. Cannot be undone. */
export const useMergeDepartment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ duplicateId, intoDepartmentId }: { duplicateId: string; intoDepartmentId: string }) =>
      (await api.post<{ departmentId: string; name: string }>(`/admin/departments/${duplicateId}/merge`, { intoDepartmentId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export const useRemoveDepartmentAlias = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (aliasId: string) => { await api.delete(`/admin/department-aliases/${aliasId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'department-aliases'] }),
  })
}

/** Units waiting for an administrator to confirm their lecturer, oldest first. */
export const usePendingUnits = () =>
  useQuery({
    queryKey: PENDING_UNITS_KEY,
    queryFn: async () => (await api.get<PendingUnit[]>('/admin/units/pending')).data,
    staleTime: 30_000,
  })

/** Confirms the lecturer is allocated to teach the unit, so they can activate its classes. */
export const useVerifyUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (unitId: string) => (await api.post<{ unitId: string; code: string; status: 'VERIFIED' }>(`/admin/units/${unitId}/verify`)).data,
    onSettled: () => qc.invalidateQueries({ queryKey: PENDING_UNITS_KEY }),
  })
}
