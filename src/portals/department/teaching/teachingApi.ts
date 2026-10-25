import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { env } from '@/lib/env'

/**
 * The department's teaching for a term of the Timetable Generator: courses,
 * units and groups with lecturers, and the department's own lecturer list.
 * The officer's department comes from their account; `term` is the
 * Generator's term id (undefined: its newest).
 */

export type RoomType = 'lecture_hall' | 'lab' | 'seminar'
export type EmploymentType = 'full_time' | 'part_time'
export type CourseMode = 'regular' | 'odel' | 'weekend' | 'evening' | 'school_based' | 'part_time'

export const ROOM_TYPES: Record<RoomType, string> = { lecture_hall: 'Lecture hall', lab: 'Lab', seminar: 'Seminar room' }

/** How a cohort studies; ODEL students sit their exams in a room of their own. */
export const COURSE_MODES: Record<CourseMode, string> = {
  regular: 'Regular', odel: 'ODEL', weekend: 'Weekend', evening: 'Evening', school_based: 'School-based', part_time: 'Part-time',
}

export interface Term {
  id: string
  academicYear: string
  semester: number
  name: string
  publishedVersion: number | null
}

export interface Meeting {
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
}

export interface TeachingCourse {
  id: string
  departmentCode: string
  programme: string
  year: number
  semester: number
  subClass: string
  label: string
  students: number
  mode: CourseMode
}

export interface UnitGroup {
  id: string
  key: string
  label: string
  members: Array<{ id: string; label: string; departmentCode: string | null; students: number; givenStudents: number | null }>
  students: number
  lecturerId: string | null
  lecturer: string | null
  lectureHours: number | null
  practicalHours: number | null
  cfHours: number | null
  meetings: Meeting[]
}

export interface TeachingUnit {
  id: string
  code: string
  title: string
  weeklyHours: number
  classLength: number
  roomType: RoomType
  courses: Array<{ id: string; label: string; departmentCode: string | null; students: number }>
  servicing: boolean
  changedSincePublished: boolean
  groups: UnitGroup[]
}

export interface TeachingLecturer {
  id: string
  title: string
  fullName: string
  staffNumber: string | null
  employmentType: EmploymentType
  phone: string
  email: string
  maxWeeklyHours: number | null
  maxExamDuties: number | null
  active: boolean
  display: string
}

export interface BoardLecturer extends TeachingLecturer {
  groups: number
  /** Across every department they teach for. */
  weeklyHours: number
}

export interface Board {
  term: Term
  terms: Term[]
  department: { id: string; name: string; code: string }
  canEdit: boolean
  published: boolean
  publication: {
    publishedBy: string
    publishedAt: string
    unitCount: number
    groupCount: number
    reopenedAt: string | null
    reopenedBy: string | null
  } | null
  courses: Array<TeachingCourse & { usedBy: string[] }>
  otherCourses: TeachingCourse[]
  units: TeachingUnit[]
  lecturers: BoardLecturer[]
  problems: Array<{ code: string; message: string; unitId: string | null }>
  times: { publishedVersion: number | null; error: string | null }
  summary: { courses: number; units: number; groups: number; withLecturer: number; changed: number; problems: number }
}

export interface BulkResult {
  created: number
  updated: number
  errors: Array<{ line: number; message: string }>
  errorCount: number
  message?: string
}

export interface CourseInput {
  programme: string
  year: number
  semester: number
  subClass: string
  students: number
  mode: CourseMode
}

export interface UnitInput {
  code: string
  title: string
  weeklyHours: number
  classLength: number
  roomType: RoomType
  courseIds: string[]
}

export interface GroupInput {
  label: string
  members: Array<{ courseId: string; students: number | null }>
}

export interface GroupPatch {
  lecturerId: string | null
  lectureHours: number | null
  practicalHours: number | null
  cfHours: number | null
}

export interface LecturerInput {
  title: string
  fullName: string
  staffNumber: string | null
  employmentType: EmploymentType
  phone: string
  email: string
  maxWeeklyHours: number | null
  maxExamDuties: number | null
  active: boolean
}

const BASE = '/departments/teaching'
const KEY = ['department', 'teaching'] as const
const params = (term: string | undefined) => (term ? { term } : {})

export const useBoard = (term: string | undefined) =>
  useQuery({
    queryKey: [...KEY, 'board', term ?? null],
    queryFn: async () => (await api.get<Board>(BASE, { params: params(term) })).data,
    staleTime: 15_000,
  })

/** Every save changes the board (problems, counts, the lecturers' hours), so it is read again. */
function useSave<V, R>(fn: (vars: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export const useSaveCourse = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: CourseInput }) =>
    id ? (await api.patch(`${BASE}/courses/${id}`, body, { params: params(term) })).data : (await api.post(`${BASE}/courses`, body, { params: params(term) })).data,
  )

export const useDeleteCourse = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/courses/${id}`, { params: params(term) })).data)

export const useSaveUnit = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: UnitInput }) =>
    id ? (await api.patch(`${BASE}/units/${id}`, body, { params: params(term) })).data : (await api.post(`${BASE}/units`, body, { params: params(term) })).data,
  )

export const useDeleteUnit = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/units/${id}`, { params: params(term) })).data)

export const useSaveGroups = (term: string | undefined) =>
  useSave(async ({ unitId, groups }: { unitId: string; groups: GroupInput[] }) =>
    (await api.put(`${BASE}/units/${unitId}/groups`, { groups }, { params: params(term) })).data,
  )

export const useSaveGroup = (term: string | undefined) =>
  useSave(async ({ id, body }: { id: string; body: GroupPatch }) => (await api.patch(`${BASE}/groups/${id}`, body, { params: params(term) })).data)

export const useSaveLecturer = (term: string | undefined) =>
  useSave(async ({ id, body }: { id?: string; body: LecturerInput }) =>
    id
      ? (await api.patch<TeachingLecturer>(`${BASE}/lecturers/${id}`, body, { params: params(term) })).data
      : (await api.post<TeachingLecturer>(`${BASE}/lecturers`, body, { params: params(term) })).data,
  )

export const useDeleteLecturer = (term: string | undefined) =>
  useSave(async (id: string) => (await api.delete(`${BASE}/lecturers/${id}`, { params: params(term) })).data)

export type BulkKind = 'courses' | 'units' | 'groups' | 'lecturers'

export const useBulk = (term: string | undefined, kind: BulkKind) =>
  useSave(async (rows: Record<string, string>[]) =>
    (await api.post<BulkResult>(`${BASE}/${kind}/bulk`, { rows }, { params: params(term), timeout: 120_000 })).data,
  )

export const usePublish = (term: string | undefined) =>
  useSave(async (action: 'publish' | 'reopen') => (await api.post<Board>(`${BASE}/${action}`, undefined, { params: params(term) })).data)

/** A .xlsx read back as cells, for the paste dialog (browsers can't read .xlsx themselves). */
export async function readSpreadsheet(file: File): Promise<Array<{ name: string; rows: string[][] }>> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const { data } = await api.post<{ sheets: Array<{ name: string; rows: string[][] }> }>(`${BASE}/spreadsheet`, { file: btoa(binary) }, { timeout: 60_000 })
  return data.sheets
}

/** The allocation form; a plain link works because sign-in is a cookie. */
export const exportUrl = (format: 'pdf' | 'docx' | 'xlsx', term: string | undefined) =>
  `${env.apiUrl}${BASE}/export/${format}${term ? `?term=${encodeURIComponent(term)}` : ''}`

export const meetingText = (m: Meeting) => `${m.dayOfWeek} ${m.startTime}–${m.endTime}${m.room ? ` ${m.room}` : ''}`

/** 'A', 'B', … for splitting a unit into n groups. */
export const groupLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))

/** A course divided between n groups as evenly as possible. */
export function evenSplit(students: number, parts: number): number[] {
  const base = Math.floor(students / parts)
  return Array.from({ length: parts }, (_, i) => base + (i < students % parts ? 1 : 0))
}

const KIND = /\((FT|PT)\)\s*$/i
const TITLE = /^(DR|PROF|MR|MRS|MS|MISS|ENG|REV)\.?\s+/i

/** 'Dr. Jane Otieno (PT)' typed in the lecturer picker -> its title, name and FT/PT. */
export function splitTyped(typed: string): Pick<LecturerInput, 'title' | 'fullName' | 'employmentType'> {
  let text = typed.trim()
  const kind = KIND.exec(text)
  text = text.replace(KIND, '')
  const title = TITLE.exec(text)
  return {
    title: title ? `${title[1]![0]!.toUpperCase()}${title[1]!.slice(1).toLowerCase()}.` : 'Dr.',
    fullName: text.replace(TITLE, '').trim(),
    employmentType: kind?.[1]!.toLowerCase() === 'pt' ? 'part_time' : 'full_time',
  }
}
