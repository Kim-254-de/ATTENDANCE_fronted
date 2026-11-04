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
  /** Uploaded with the exam list: its students are `rows`, from SMARTTT or corrected here. */
  listed: boolean
  rows: ListedRow[]
}

/** A class sitting a listed paper (from the master timetable, or who synced), and how many: who synced, or the department's number. */
export interface ListedRow {
  id: string
  programme: string
  year: number
  semester: number
  stream: string
  students: number
  /** SMARTTT's count when last read; null for a class the department added. */
  smartttStudents: number | null
  /** The department set this number: a fresh SMARTTT count leaves it. */
  edited: boolean
}

/** The uploaded exam list as read, before anything is saved. */
/** A class a letter's heading names and gives a number. Year or semester null: nothing says, so check it. */
export interface LetterClass {
  id: string
  heading: string
  name: string
  year: number | null
  semester: number | null
  students: number
  /** '' when no single SMARTTT programme has this name. */
  programme: string
}

export interface LetterClassInput {
  programme: string
  year: number
  semester: number
  students: number
}

export interface ExamListReview {
  classes: LetterClass[]
  programmes: Array<{ code: string; name: string }>
  entries: Array<{
    letterClasses: string[]
    line: number
    codes: string[]
    title: string
    section: string
    sitting: Sitting
    /** Who synced it in SMARTTT; null when SMARTTT couldn't be read. */
    students: number | null
    classRows: Array<{ label: string; students: number }>
    unknownCodes: string[]
    duplicateOf: number | null
    otherDepartments: string[]
    existingPaperId: string | null
    examiner: { lecturerId: string | null; staffNumber: string; name: string } | null
  }>
  smarttt: { available: boolean; reason: string | null }
  summary: { papers: number; newPapers: number; duplicates: number; unknown: number; noStudents: number; noClasses: number }
}

export interface ListedPaperInput {
  codes: string[]
  title: string
  sitting: Sitting
  classes?: LetterClassInput[]
}

export interface RowInput {
  programme: string
  year: number
  semester: number
  stream: string
  students: number
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
  /** Not in the way of publishing: papers nobody has synced yet (they still go to the Director). */
  warnings: Problem[]
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
  /** In the Director's shared draft (placed in a session). */
  placed: boolean
  /** The room with most of its students: the main invigilator's, who collects every room's scripts. */
  mainRoom: string | null
  /** The main invigilator: can be named before the draft. */
  invigilatorId: string | null
  invigilator: string | null
  invigilatorDepartment: string | null
  /** Each extra room of a paper split over rooms, with its own invigilator. */
  extras: Array<{ room: string; invigilatorId: string | null; invigilator: string | null; invigilatorDepartment: string | null }>
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
  title: string
  sitting: Sitting
  examinerId: string | null
  notes: string
}

/** A class row being edited: SMARTTT's count kept beside it, null for a class the department added. */
export type EditedRow = RowInput & { smartttStudents: number | null }

/** The paper's classes; one the department took off the paper (0, set by them) stays gone. */
export const editedRows = (paper: ExamPaper): EditedRow[] =>
  paper.rows.filter((r) => !(r.edited && r.students === 0)).map(({ programme, year, semester, stream, students, smartttStudents }) => ({ programme, year, semester, stream, students, smartttStudents }))

/**
 * A class for a paper nobody has synced, so the department only types its
 * number: programme from the first code's letters, year from its first
 * non-zero digit ("MATH 241" → MATH Y2S1). They can correct either. Left
 * as it is, the backend treats it as a guess (isGuessedRow): the Generator
 * seats it but doesn't hold it to a class's hard rules.
 */
export function guessedRow(paper: ExamPaper): EditedRow {
  const first = paper.codes.split('/')[0]?.trim() ?? ''
  const year = Number(/[1-9]/.exec(first.replace(/^\D+/, ''))?.[0] ?? 1)
  return { programme: first.replace(/[^A-Za-z]/g, '').toUpperCase(), year: Math.min(year, 10), semester: 1, stream: '', students: 0, smartttStudents: null }
}

/** What is saved: classes with a programme, without SMARTTT's count. */
export const rowInputs = (rows: EditedRow[]): RowInput[] =>
  rows.filter((r) => r.programme.trim()).map(({ programme, year, semester, stream, students }) => ({ programme, year, semester, stream, students }))

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
  useSave(async ({ id, body }: { id: string; body: PaperInput }) => (await api.patch(`${BASE}/exam-papers/${id}`, body, { params: params(term) })).data)

export const useDeletePaper = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/exam-papers/${id}`, { params: params(term) })).data)

export const useSavePractical = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: PracticalInput }) =>
    id ? (await api.put(`${BASE}/practicals/${id}`, body, { params: params(term) })).data : (await api.post(`${BASE}/practicals`, body, { params: params(term) })).data,
  )

export const useDeletePractical = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/practicals/${id}`, { params: params(term) })).data)

export const useExamBulk = (term: string | undefined, kind: 'practicals') =>
  useSave(async (rows: Record<string, string>[]) =>
    (await api.post<BulkResult>(`${BASE}/${kind}/bulk`, { rows }, { params: params(term), timeout: 120_000 })).data,
  )

/** The department's exam list (.docx) read and checked against SMARTTT; nothing is saved. */
export async function readExamList(term: string | undefined, file: File): Promise<ExamListReview> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const { data } = await api.post<ExamListReview>(`${BASE}/exam-list/read`, { file: btoa(binary) }, { params: params(term), timeout: 120_000 })
  return data
}

/**
 * Unit codes as a person types them: 'math 241' -> ['MATH 241'], 'COSC 0172/0170' ->
 * ['COSC 0172', 'COSC 0170'], 'BITE 131/COSC 130' -> both. Null when any part isn't a code.
 */
export function typedCodes(text: string): string[] | null {
  let prefix = ''
  const out: string[] = []
  for (const part of text.split(/[/&,]/).map((p) => p.trim()).filter(Boolean)) {
    const m = /^(?:([A-Za-z]{2,6})\s*-?\s*)?(\d{2,5}[A-Za-z]?)$/.exec(part)
    if (!m) return null
    if (m[1]) prefix = m[1].toUpperCase()
    if (!prefix) return null
    out.push(`${prefix} ${m[2]!.toUpperCase()}`)
  }
  return out.length ? [...new Set(out)] : null
}

export const useSaveExamList = (term: string | undefined) =>
  useSave(async (papers: ListedPaperInput[]) =>
    (await api.post<{ created: number; updated: number; smarttt: ExamListReview['smarttt'] }>(`${BASE}/exam-list`, { papers }, { params: params(term), timeout: 120_000 })).data,
  )

/** Every paper of the uploaded list removed at once. */
export const useDeleteExamList = (term: string | undefined) =>
  useSave(async () => (await api.delete<{ deleted: number }>(`${BASE}/exam-list`, { params: params(term) })).data)

export const useSetPaperRows = (term: string | undefined) =>
  useSave(async ({ paperId, rows }: { paperId: string; rows: RowInput[] }) =>
    (await api.put<ExamBoard>(`${BASE}/exam-papers/${paperId}/rows`, { rows }, { params: params(term) })).data,
  )

/** Many listed papers' class rows in one save, all or none. */
export const useSetManyPaperRows = (term: string | undefined) =>
  useSave(async (papers: Array<{ paperId: string; rows: RowInput[] }>) =>
    (await api.put<ExamBoard>(`${BASE}/exam-papers/rows`, { papers }, { params: params(term), timeout: 120_000 })).data,
  )

export const useRecount = (term: string | undefined) =>
  useSave(async () => (await api.post<ExamBoard>(`${BASE}/exam-papers/recount`, undefined, { params: params(term), timeout: 120_000 })).data)

export const usePublishExams = (term: string | undefined) =>
  useSave(async (action: 'publish' | 'reopen') => (await api.post(`${BASE}/exams/${action}`, undefined, { params: params(term) })).data)

export const useSetInvigilator = (term: string | undefined) =>
  useSave(async ({ paperId, lecturerId, room = '' }: { paperId: string; lecturerId: string | null; room?: string }) =>
    (await api.put(`${BASE}/invigilators/${paperId}`, { lecturerId, room }, { params: params(term) })).data,
  )

export const usePublishInvigilators = (term: string | undefined) =>
  useSave(async (action: 'publish' | 'reopen') => (await api.post(`${BASE}/invigilators/${action}`, undefined, { params: params(term) })).data)

/** The moderation letter; a plain link works because sign-in is a cookie. */
export function letterUrl(format: 'pdf' | 'docx', term: string | undefined, moderator: string, date: string): string {
  const q = new URLSearchParams({ ...(term ? { term } : {}), moderator, date })
  return `${env.apiUrl}${BASE}/moderation-letter/${format}?${q.toString()}`
}
