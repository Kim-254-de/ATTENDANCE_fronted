import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Allocation, CreateUnitInput, TaughtUnit } from '@/types'

export const MY_UNITS_KEY = ['units', 'mine'] as const
const studentsKey = (unitId: string | undefined) => ['units', unitId, 'students'] as const

/** The units the signed-in lecturer teaches — also the only ones they can activate a class for. */
export const useMyUnits = () =>
  useQuery({
    queryKey: MY_UNITS_KEY,
    queryFn: async () => (await api.get<TaughtUnit[]>('/units')).data,
    staleTime: 60_000,
  })

/**
 * The unit ActivateClass may open a session for right now, per the lecturer's
 * issued timetable — null if nothing is scheduled. Polled so the card updates
 * itself once class time arrives without a manual refresh.
 */
export const useCurrentUnit = () =>
  useQuery({
    queryKey: ['units', 'current'],
    queryFn: async () => (await api.get<TaughtUnit | null>('/units/current')).data,
    refetchInterval: 30_000,
  })

export const useCreateUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUnitInput) => (await api.post<TaughtUnit>('/units', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_UNITS_KEY }),
  })
}

/**
 * A unit's roster. Read-only: who's enrolled is the registrar's record, synced
 * from the ERP by the backend on every read — there is nothing here to write.
 */
export const useUnitStudents = (unitId: string | undefined) =>
  useQuery({
    queryKey: studentsKey(unitId),
    queryFn: async () => (await api.get<Allocation[]>(`/units/${unitId}/students`)).data,
    enabled: !!unitId,
  })
