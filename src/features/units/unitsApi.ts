import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Allocation, AllocationResult, CreateUnitInput, TaughtUnit } from '@/types'

export const MY_UNITS_KEY = ['units', 'mine'] as const
const studentsKey = (unitId: string | undefined) => ['units', unitId, 'students'] as const

/** The units the signed-in lecturer teaches — also the only ones they can activate a class for. */
export const useMyUnits = () =>
  useQuery({
    queryKey: MY_UNITS_KEY,
    queryFn: async () => (await api.get<TaughtUnit[]>('/units')).data,
    staleTime: 60_000,
  })

export const useCreateUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUnitInput) => (await api.post<TaughtUnit>('/units', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_UNITS_KEY }),
  })
}

export const useUnitStudents = (unitId: string | undefined) =>
  useQuery({
    queryKey: studentsKey(unitId),
    queryFn: async () => (await api.get<Allocation[]>(`/units/${unitId}/students`)).data,
    enabled: !!unitId,
  })

/** Each number is checked against the ERP; the answer says, per number, what happened. */
export const useAddStudents = (unitId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (registrationNumbers: string[]) =>
      (await api.post<AllocationResult[]>(`/units/${unitId}/students`, { registrationNumbers })).data,
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: studentsKey(unitId) }),
      qc.invalidateQueries({ queryKey: MY_UNITS_KEY }),
    ]),
  })
}

/** Approve a request (ACTIVE), remove a student (DROPPED), or restore one (ACTIVE). */
export const useSetAllocationStatus = (unitId: string | undefined) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ allocationId, status }: { allocationId: string; status: 'ACTIVE' | 'DROPPED' }) =>
      (await api.patch<Allocation>(`/units/${unitId}/students/${allocationId}`, { status })).data,
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: studentsKey(unitId) }),
      qc.invalidateQueries({ queryKey: MY_UNITS_KEY }),
    ]),
  })
}

/** Splits a pasted class list — one per line, or separated by commas, semicolons or tabs. */
export const parseRegistrationNumbers = (text: string) =>
  [...new Set(text.split(/[\n,;\t]+/).map((s) => s.trim().replace(/\s+/g, ' ').toUpperCase()).filter(Boolean))]
