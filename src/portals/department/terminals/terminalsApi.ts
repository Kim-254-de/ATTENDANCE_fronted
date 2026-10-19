import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * The department's portable check-in terminals and fingerprint enrolment
 * (backend docs/terminals.md). Shapes are the backend's own.
 */

export type TerminalCapability = 'BARCODE' | 'CARD' | 'FINGERPRINT'
export type TerminalStatus = 'PENDING' | 'ACTIVE' | 'LOST' | 'RETIRED'

export const CAPABILITY_LABEL: Record<TerminalCapability, string> = {
  BARCODE: 'ID card barcode',
  CARD: 'NFC card',
  FINGERPRINT: 'Fingerprint',
}

export interface Terminal {
  id: string
  code: string
  label: string | null
  capabilities: TerminalCapability[]
  status: TerminalStatus
  pairingExpiresAt: string | null
  pairedAt: string | null
  lastSeenAt: string | null
  batteryPercent: number | null
  network: 'WIFI' | 'CELLULAR' | null
  appVersion: string | null
  linkedSession: { sessionId: string; unitCode: string | null; linkedAt: string | null } | null
  createdAt: string
}

/** Returned once when a device is added or re-paired: show it for the device to scan. */
export interface Pairing {
  terminal: Terminal
  pairingCode: string
  expiresAt: string
}

export interface EnrolmentStudent {
  registrationNumber: string
  studentUserId: string | null
  fullName: string | null
  unitCodes: string[]
  fingerprints: { id: string; terminalCode: string; label: string | null; enrolledAt: string }[]
  pending: { id: string; kind: 'ENROL_FINGERPRINT' | 'DELETE_FINGERPRINT'; terminalCode: string; label: string | null; createdAt: string }[]
}

const TERMINALS_KEY = ['department', 'terminals'] as const
const ENROLMENT_KEY = ['department', 'enrolment'] as const

/** Polled, so battery, last-seen and linked class stay current while the page is open. */
export const useTerminals = () =>
  useQuery({
    queryKey: TERMINALS_KEY,
    queryFn: async () => (await api.get<Terminal[]>('/departments/terminals')).data,
    refetchInterval: 30_000,
  })

export const useCreateTerminal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { code: string; label?: string; capabilities: TerminalCapability[] }) =>
      (await api.post<Pairing>('/departments/terminals', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: TERMINALS_KEY }),
  })
}

/** A fresh pairing code. The device's old key stops working at once. */
export const useReissuePairing = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (terminalId: string) => (await api.post<Pairing>(`/departments/terminals/${terminalId}/pairing`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: TERMINALS_KEY }),
  })
}

export const useDecommission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ terminalId, action }: { terminalId: string; action: 'lost' | 'retire' }) =>
      (await api.post<Terminal>(`/departments/terminals/${terminalId}/${action}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: TERMINALS_KEY }),
  })
}

export const useEnrolmentStudents = (search: string) =>
  useQuery({
    queryKey: [...ENROLMENT_KEY, search],
    queryFn: async () =>
      (await api.get<EnrolmentStudent[]>('/departments/enrolment/students', { params: search ? { q: search } : {} })).data,
    // Pending enrolments clear when the device reports in, so keep checking.
    refetchInterval: 15_000,
    placeholderData: (previous) => previous,
  })

export const useRequestEnrolment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ terminalId, registrationNumber, label }: { terminalId: string; registrationNumber: string; label?: string }) =>
      (await api.post<{ commandId: string }>(`/departments/terminals/${terminalId}/enrolments`, { registrationNumber, ...(label ? { label } : {}) })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ENROLMENT_KEY }),
  })
}

export const useCancelCommand = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commandId: string) => (await api.post(`/departments/enrolment/commands/${commandId}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ENROLMENT_KEY }),
  })
}

export const useRevokeFingerprint = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fingerprintId: string) => (await api.delete(`/departments/enrolment/fingerprints/${fingerprintId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ENROLMENT_KEY }),
  })
}
