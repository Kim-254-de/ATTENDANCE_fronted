import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { QaChecklistItem, QaChecklistTemplate, QaChecklistTemplateDetail } from '@/types'

const TEMPLATES_KEY = ['qa', 'checklist-templates'] as const
const templateKey = (id: string | undefined) => ['qa', 'checklist-templates', id] as const

export const useChecklistTemplates = () =>
  useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => (await api.get<QaChecklistTemplate[]>('/quality-assurance/checklist-templates')).data,
    staleTime: 60_000,
  })

/** One template plus its ordered items, each mapped to a standard. */
export const useChecklistTemplate = (templateId: string | undefined) =>
  useQuery({
    queryKey: templateKey(templateId),
    queryFn: async () => (await api.get<QaChecklistTemplateDetail>(`/quality-assurance/checklist-templates/${templateId}`)).data,
    enabled: !!templateId,
    staleTime: 30_000,
  })

export const useCreateChecklistTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) =>
      (await api.post<QaChecklistTemplate>('/quality-assurance/checklist-templates', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  })
}

export const useSetTemplateActive = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<QaChecklistTemplate>(`/quality-assurance/checklist-templates/${id}`, { isActive })).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY })
      qc.invalidateQueries({ queryKey: templateKey(vars.id) })
    },
  })
}

export interface CreateChecklistItemInput {
  standardId: string
  prompt: string
  guidance?: string
  sortOrder?: number
}

export const useCreateChecklistItem = (templateId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateChecklistItemInput) =>
      (await api.post<QaChecklistItem>(`/quality-assurance/checklist-templates/${templateId}/items`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKey(templateId) }),
  })
}

/** Refused with 409 once any audit has recorded a finding against the item — the backend's error message is shown as-is. */
export const useDeleteChecklistItem = (templateId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/quality-assurance/checklist-templates/${templateId}/items/${itemId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKey(templateId) }),
  })
}
