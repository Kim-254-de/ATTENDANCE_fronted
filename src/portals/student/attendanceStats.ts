import { MIN_REQUIRED_ATTENDANCE } from '@/lib/attendancePolicy'
import type { AttendanceMark, StudentAttendanceRecord } from '@/types'

export { MIN_REQUIRED_ATTENDANCE }

/** A check-in more than this many minutes after the session opened counts as late. */
const LATE_THRESHOLD_MINUTES = 30

export type DisplayMark = AttendanceMark | 'LATE'

/**
 * PRESENT, ABSENT and OPEN come straight from the backend; LATE is derived here from real
 * timestamps (opensAt vs recordedAt) since the backend has no "late" concept of its own — being
 * late still counts as attended there, this just flags it in the UI.
 */
export function displayMark(record: StudentAttendanceRecord): DisplayMark {
  if (record.mark !== 'PRESENT' || !record.recordedAt) return record.mark
  const minutesLate = (new Date(record.recordedAt).getTime() - new Date(record.opensAt).getTime()) / 60_000
  return minutesLate > LATE_THRESHOLD_MINUTES ? 'LATE' : 'PRESENT'
}

/** Records that fall on today's calendar date (local time). */
export function todaysRecords(records: StudentAttendanceRecord[]): StudentAttendanceRecord[] {
  const today = new Date().toDateString()
  return records.filter((r) => new Date(r.opensAt).toDateString() === today)
}

/**
 * Consecutive days, walking back from today, with at least one class attended.
 * A day with no class held is skipped rather than breaking the streak; a day
 * that held a class but has no PRESENT record breaks it.
 */
export function attendanceStreak(records: StudentAttendanceRecord[]): number {
  const presentByDay = new Map<string, boolean>()
  for (const r of records) {
    const day = new Date(r.opensAt).toDateString()
    presentByDay.set(day, (presentByDay.get(day) ?? false) || r.mark === 'PRESENT')
  }
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 365; i++) {
    const key = cursor.toDateString()
    if (presentByDay.has(key)) {
      if (presentByDay.get(key)) streak += 1
      else break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** "Today" / "Yesterday" / "Tue, Sep 8" (this year) / "Tue, Sep 8, 2025" (older). */
function dayLabel(date: Date, today: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  if (date.getFullYear() !== today.getFullYear()) options.year = 'numeric'
  return date.toLocaleDateString([], options)
}

/** Groups records (already newest-first) under a "Today" / "Yesterday" / dated heading per calendar day. */
export function groupByDay<T extends { opensAt: string }>(records: T[]): { label: string; records: T[] }[] {
  const today = new Date()
  const groups: { label: string; records: T[] }[] = []
  for (const record of records) {
    const label = dayLabel(new Date(record.opensAt), today)
    const current = groups.at(-1)
    if (current?.label === label) current.records.push(record)
    else groups.push({ label, records: [record] })
  }
  return groups
}

export interface DayAttendance { label: string; attended: number; held: number }

/** Mon–Fri of the current calendar week, with how many held classes were attended each day. */
export function thisWeeksDays(records: StudentAttendanceRecord[]): DayAttendance[] {
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset)

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, i) => {
    const key = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).toDateString()
    const dayRecords = records.filter((r) => r.mark !== 'OPEN' && new Date(r.opensAt).toDateString() === key)
    return { label, attended: dayRecords.filter((r) => r.mark === 'PRESENT').length, held: dayRecords.length }
  })
}

export interface WeekRate { label: string; rate: number | null }

/** Attendance rate per week (days 1–7, 8–14, ...) of the current calendar month. */
export function thisMonthsWeeks(records: StudentAttendanceRecord[]): WeekRate[] {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const weekCount = Math.ceil(daysInMonth / 7)
  const buckets = Array.from({ length: weekCount }, () => ({ attended: 0, held: 0 }))

  for (const r of records) {
    if (r.mark === 'OPEN') continue
    const date = new Date(r.opensAt)
    if (date.getFullYear() !== today.getFullYear() || date.getMonth() !== today.getMonth()) continue
    const bucket = buckets[Math.floor((date.getDate() - 1) / 7)]!
    bucket.held += 1
    if (r.mark === 'PRESENT') bucket.attended += 1
  }

  return buckets.map((b, i) => ({ label: `W${i + 1}`, rate: b.held ? Math.round((b.attended / b.held) * 1000) / 10 : null }))
}
