import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { env } from '@/lib/env'
import type { Board, BulkResult } from './teachingApi'

/**
 * The department's exam papers, practicals and invigilators for a term of the
 * Timetable Generator. Exam papers and invigilators are each published to the
 * Director on their own, apart from the teaching.
 */

export interface Problem {
  code: string
  message: string
}

/** Who sits a paper: the units' regular classes, or their ODEL and part-time ones. */
export type Sitting = 'regular' | 'odel'

export interface ExamPaper {
  id: string
  codes: string
  sitting: Sitting
  units: Array<{ id: string; code: string; departmentCode: string }>
  title: string
  examinerId: string | null
  examiner: string | null
  notes: string
  classRows: string[]
  students: number
  changedSincePublished: boolean
}

export interface Practical {
  id: string
  unitId: string
  unitCode: string
  unitTitle: string
  date: string
  startTime: string
  endTime: string
}

export interface ExamBoard {
  term: Board['term']
  department: Board['department']
  canEdit: boolean
  published: boolean
  publication: Board['publication']
  papers: ExamPaper[]
  units: Array<{
    id: string; code: string; title: string; noWrittenExam: boolean
    paperId: string | null; paperCodes: string | null; paperDepartment: string | null; defaultExaminerId: string | null
    /** The sittings the unit's classes need papers for, and its ODEL paper when it has one. */
    sittings: Sitting[]; odelPaperId: string | null
  }>
  otherUnits: Array<{ id: string; code: string; title: string; departmentCode: string }>
  practicals: Practical[]
  lecturers: Array<{ id: string; display: string; staffNumber: string | null; active: boolean }>
  problems: Problem[]
  summary: { papers: number; students: number; changed: number; problems: number }
}

export interface InvigilationRow {
  paperId: string
  codes: string
  title: string
  date: string | null
  session: number | null
  startTime: string | null
  endTime: string | null
  rooms: string[]
  invigilatorId: string | null
  invigilator: string | null
  invigilatorDepartment: string | null
}

export interface InvigilationBoard {
  term: Board['term']
  department: Board['department']
  draft: { id: string; name: string; sharedAt: string | null; status: string } | null
  canEdit: boolean
  published: boolean
  publication: Board['publication']
  papers: InvigilationRow[]
  lecturers: Array<{ id: string; display: string; departmentCode: string; staffNumber: string | null; duties: number; maxExamDuties: number | null; own: boolean }>
  problems: Problem[]
}

export interface PaperInput {
  unitIds: string[]
  title: string
  sitting: Sitting
  examinerId: string | null
  notes: string
}

export interface PracticalInput {
  unitId: string
  date: string
  startTime: string
  endTime: string
}

const BASE = '/departments/teaching'
const KEY = ['department', 'teaching'] as const
const params = (term: string | undefined) => (term ? { term } : {})

export const useExamBoard = (term: string | undefined) =>
  useQuery({
    queryKey: [...KEY, 'exams', term ?? null],
    queryFn: async () => (await api.get<ExamBoard>(`${BASE}/exams`, { params: params(term) })).data,
    staleTime: 15_000,
  })

export const useInvigilationBoard = (term: string | undefined) =>
  useQuery({
    queryKey: [...KEY, 'invigilators', term ?? null],
    queryFn: async () => (await api.get<InvigilationBoard>(`${BASE}/invigilators`, { params: params(term) })).data,
    staleTime: 15_000,
  })

/** Every save is read back: papers, problems and duty counts move together. */
function useSave<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export const useSavePaper = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: PaperInput }) =>
    id ? (await api.patch(`${BASE}/exam-papers/${id}`, body, { params: params(term) })).data : (await api.post(`${BASE}/exam-papers`, body, { params: params(term) })).data,
  )

export const useDeletePaper = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/exam-papers/${id}`, { params: params(term) })).data)

export const usePapersFromUnits = (term: string | undefined) =>
  useSave(async () => (await api.post<{ created: number }>(`${BASE}/exam-papers/from-units`, undefined, { params: params(term) })).data)

export const useNoWrittenExam = (term: string | undefined) =>
  useSave(async ({ unitId, value }: { unitId: string; value: boolean }) =>
    (await api.put(`${BASE}/units/${unitId}/no-written-exam`, { noWrittenExam: value }, { params: params(term) })).data,
  )

export const useSavePractical = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: PracticalInput }) =>
    id ? (await api.put(`${BASE}/practicals/${id}`, body, { params: params(term) })).data : (await api.post(`${BASE}/practicals`, body, { params: params(term) })).data,
  )

export const useDeletePractical = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/practicals/${id}`, { params: params(term) })).data)

export const useExamBulk = (term: string | undefined, kind: 'exam-papers' | 'practicals') =>
  useSave(async (rows: Record<string, string>[]) =>
    (await api.post<BulkResult>(`${BASE}/${kind}/bulk`, { rows }, { params: params(term), timeout: 120_000 })).data,
  )

export const usePublishExams = (term: string | undefined) =>
  useSave(async (action: 'publish' | 'reopen') => (await api.post(`${BASE}/exams/${action}`, undefined, { params: params(term) })).data)

export const useSetInvigilator = (term: string | undefined) =>
  useSave(async ({ paperId, lecturerId }: { paperId: string; lecturerId: string | null }) =>
    (await api.put(`${BASE}/invigilators/${paperId}`, { lecturerId }, { params: params(term) })).data,
  )

export const usePublishInvigilators = (term: string | undefined) =>
  useSave(async (action: 'publish' | 'reopen') => (await api.post(`${BASE}/invigilators/${action}`, undefined, { params: params(term) })).data)

/** The moderation letter; a plain link works because sign-in is a cookie. */
export function letterUrl(format: 'pdf' | 'docx', term: string | undefined, moderator: string, date: string): string {
  const q = new URLSearchParams({ ...(term ? { term } : {}), moderator, date })
  return `${env.apiUrl}${BASE}/moderation-letter/${format}?${q.toString()}`
}
