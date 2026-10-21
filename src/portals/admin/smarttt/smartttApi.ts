import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  SmartttAllocationDocuments,
  SmartttAllocationResult,
  SmartttDetail,
  SmartttNotification,
  SmartttNotificationSent,
  SmartttNotificationTarget,
  SmartttNotificationType,
  SmartttPage,
  SmartttProgram,
  SmartttStaffId,
  SmartttStaffIdUploads,
  SmartttTerm,
  SmartttTimetableUpload,
  SmartttUploadStarted,
  SmartttUploadStatus,
  SmartttVenueSummary,
  SmartttVenueUpload,
} from '@/types'

/**
 * SMARTTT's admin functions, which the console reaches through the attendance
 * API (/admin/smarttt/...) for the signed-in administrator: SMARTTT still
 * runs them and keeps the data. Answers keep SMARTTT's field names.
 */

const BASE = '/admin/smarttt'
const KEY = ['admin', 'smarttt'] as const
const keys = {
  terms: [...KEY, 'terms'] as const,
  uploads: [...KEY, 'timetable-uploads'] as const,
  allocation: [...KEY, 'lecturer-allocation'] as const,
  notifications: [...KEY, 'notifications'] as const,
  programs: [...KEY, 'programs'] as const,
  staffIds: [...KEY, 'staff-ids'] as const,
  staffIdUploads: [...KEY, 'staff-id-uploads'] as const,
  venues: [...KEY, 'venues'] as const,
}

/** Uploads are read (a PDF timetable is parsed) while the administrator waits. */
const UPLOAD_TIMEOUT = 180_000

const list = <T>(data: SmartttPage<T> | T[]): T[] => (Array.isArray(data) ? data : data.results)

function upload<T>(path: string, file: File, fields: Record<string, string> = {}) {
  const form = new FormData()
  form.append('file', file)
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  return api.post<T>(`${BASE}${path}`, form, { timeout: UPLOAD_TIMEOUT }).then((r) => r.data)
}

// -- terms ---------------------------------------------------------------------------------

export const useSmartttTerms = () =>
  useQuery({
    queryKey: keys.terms,
    queryFn: async () => list((await api.get<SmartttPage<SmartttTerm>>(`${BASE}/terms`, { params: { page_size: 100 } })).data),
  })

export const useSetCurrentTerm = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (termId: string) => (await api.post<SmartttDetail>(`${BASE}/terms/${termId}/set-current`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.terms }),
  })
}

/** Deletes every timetable slot of the term. Cannot be undone. */
export const useClearTermSlots = () =>
  useMutation({
    mutationFn: async (termId: string) => (await api.delete<SmartttDetail>(`${BASE}/terms/${termId}/slots`)).data,
  })

// -- master timetable ---------------------------------------------------------------------

export const useTimetableUploads = () =>
  useQuery({
    queryKey: keys.uploads,
    queryFn: async () => list((await api.get<SmartttPage<SmartttTimetableUpload>>(`${BASE}/timetable/uploads`)).data),
  })

export const useUploadTimetable = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => upload<SmartttUploadStarted>('/timetable/uploads', file),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.uploads }),
  })
}

/** Polls an upload SMARTTT is reading in the background until it finishes. */
export const useUploadProgress = (batchId: string | null) =>
  useQuery({
    queryKey: [...keys.uploads, 'status', batchId],
    queryFn: async () => (await api.get<SmartttUploadStatus>(`${BASE}/timetable/uploads/${batchId}/status`)).data,
    enabled: !!batchId,
    refetchInterval: (query) => (['received', 'processing'].includes(query.state.data?.status ?? 'processing') ? 2500 : false),
  })

export const useDeleteTimetableUpload = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (uploadId: string) => { await api.delete(`${BASE}/timetable/uploads/${uploadId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.uploads }),
  })
}

// -- lecturer allocation --------------------------------------------------------------------

export const useAllocationDocuments = () =>
  useQuery({
    queryKey: keys.allocation,
    queryFn: async () => (await api.get<SmartttAllocationDocuments>(`${BASE}/lecturer-allocation`)).data,
  })

export const useUploadAllocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      upload<SmartttAllocationResult>('/lecturer-allocation', file, dryRun ? { dry_run: 'true' } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.allocation }),
  })
}

/** Removes a department's allocation document and the lecturers it set. */
export const useRemoveAllocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (source: string) => (await api.delete<SmartttDetail>(`${BASE}/lecturer-allocation`, { params: { source } })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.allocation }),
  })
}

// -- notifications --------------------------------------------------------------------------

export const useSmartttNotifications = () =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: async () => list((await api.get<SmartttPage<SmartttNotification>>(`${BASE}/notifications`)).data),
  })

/** Every programme, page by page (SMARTTT lists 50 at a time). */
export const useSmartttPrograms = () =>
  useQuery({
    queryKey: keys.programs,
    queryFn: async () => {
      const programs: SmartttProgram[] = []
      for (let page = 1; page <= 50; page += 1) {
        const data = (await api.get<SmartttPage<SmartttProgram> | SmartttProgram[]>(`${BASE}/programs`, { params: { page } })).data
        programs.push(...list(data))
        if (Array.isArray(data) || !data.next) break
      }
      return programs.sort((a, b) => a.name.localeCompare(b.name))
    },
    staleTime: 5 * 60_000,
  })

export interface NotificationInput {
  title: string
  message: string
  notification_type: SmartttNotificationType
  target: SmartttNotificationTarget
  target_program?: string
  target_year?: number
}

export const useSendNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NotificationInput) => (await api.post<SmartttNotificationSent>(`${BASE}/notifications`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  })
}

// -- staff IDs ------------------------------------------------------------------------------

export const useStaffIds = () =>
  useQuery({ queryKey: keys.staffIds, queryFn: async () => (await api.get<SmartttStaffId[]>(`${BASE}/staff-ids`)).data })

export const useStaffIdUploads = () =>
  useQuery({ queryKey: keys.staffIdUploads, queryFn: async () => (await api.get<SmartttStaffIdUploads>(`${BASE}/staff-id-uploads`)).data })

const useStaffIdMutation = <V>(mutationFn: (v: V) => Promise<SmartttDetail>) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.staffIds })
      await qc.invalidateQueries({ queryKey: keys.staffIdUploads })
    },
  })
}

export const useUploadStaffIds = () => useStaffIdMutation((file: File) => upload<SmartttDetail>('/staff-ids', file))

/** Removes one staff ID; a lecturer account registered with it is disabled in SMARTTT. */
export const useRemoveStaffId = () =>
  useStaffIdMutation(async (id: string) => (await api.delete<SmartttDetail>(`${BASE}/staff-ids/${id}`)).data)

/** Undoes a whole CSV upload: every ID it added is removed. */
export const useUndoStaffIdUpload = () =>
  useStaffIdMutation(async (id: string) => (await api.delete<SmartttDetail>(`${BASE}/staff-id-uploads/${id}`)).data)

// -- venue capacities -------------------------------------------------------------------------

export const useVenueSummary = () =>
  useQuery({ queryKey: keys.venues, queryFn: async () => (await api.get<SmartttVenueSummary>(`${BASE}/rooms/capacities`)).data })

export const useUploadVenues = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => upload<SmartttVenueUpload>('/rooms/capacities', file),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.venues }),
  })
}
