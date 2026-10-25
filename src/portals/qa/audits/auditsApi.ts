import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QaAudit, QaAuditStatus, QaChecklistViewItem, QaDirectoryEntry, QaFinding, QaFindingRating } from '@/types'

const auditsKey = (filters: AuditFilters = {}) => ['qa', 'audits', filters] as const
const auditKey = (id: string | undefined) => ['qa', 'audits', 'one', id] as const
const checklistKey = (auditId: string | undefined) => ['qa', 'audits', auditId, 'checklist'] as const

/** Every department, for the "create audit" target picker — a QA officer has no department of its own to scope by. */
export const useQaDepartments = () =>
  useQuery({
    queryKey: ['qa', 'departments'],
    queryFn: async () => (await api.get<QaDirectoryEntry[]>('/quality-assurance/departments')).data,
    staleTime: 5 * 60_000,
  })

export interface AuditFilters {
  status?: QaAuditStatus
  targetDepartmentId?: string
  from?: string
  to?: string
}

export const useAudits = (filters: AuditFilters = {}) =>
  useQuery({
    queryKey: auditsKey(filters),
    queryFn: async () => (await api.get<QaAudit[]>('/quality-assurance/audits', { params: filters })).data,
    staleTime: 30_000,
  })

export const useAudit = (auditId: string | undefined) =>
  useQuery({
    queryKey: auditKey(auditId),
    queryFn: async () => (await api.get<QaAudit>(`/quality-assurance/audits/${auditId}`)).data,
    enabled: !!auditId,
    staleTime: 15_000,
  })

/** The checklist items for this audit's template, each left-joined to its finding (if any) — the "fill checklist" view. */
export const useAuditChecklist = (auditId: string | undefined) =>
  useQuery({
    queryKey: checklistKey(auditId),
    queryFn: async () => (await api.get<QaChecklistViewItem[]>(`/quality-assurance/audits/${auditId}/checklist`)).data,
    enabled: !!auditId,
    staleTime: 15_000,
  })

export interface CreateAuditInput {
  title: string
  targetDepartmentId: string
  checklistTemplateId: string
  leadAuditorUserId: string
  scheduledDate: string
  notes?: string
}

export const useCreateAudit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAuditInput) => (await api.post<QaAudit>('/quality-assurance/audits', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qa', 'audits'] }),
  })
}

/** Field edits and/or a forward-only status transition (PLANNED -> IN_PROGRESS -> COMPLETED) in one PATCH, matching the backend's own combined endpoint. */
export const useUpdateAudit = (auditId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title?: string; leadAuditorUserId?: string; scheduledDate?: string; notes?: string | null; status?: QaAuditStatus }) =>
      (await api.patch<QaAudit>(`/quality-assurance/audits/${auditId}`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKey(auditId) })
      qc.invalidateQueries({ queryKey: ['qa', 'audits'] })
    },
  })
}

/** PUT .../findings/:checklistItemId — a true upsert, so recording the same item twice just replaces the rating. */
export const useUpsertFinding = (auditId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ checklistItemId, rating, score, evidenceNotes }: { checklistItemId: string; rating: QaFindingRating; score?: number; evidenceNotes?: string }) =>
      (await api.put<QaFinding>(`/quality-assurance/audits/${auditId}/findings/${checklistItemId}`, { rating, score, evidenceNotes })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: checklistKey(auditId) })
      qc.invalidateQueries({ queryKey: auditKey(auditId) })
      qc.invalidateQueries({ queryKey: ['qa', 'audits'] })
    },
  })
}
