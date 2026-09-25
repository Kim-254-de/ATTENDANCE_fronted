import { Download } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMyUnits } from '@/features/units/unitsApi'
import { errorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/format'
import type { RecentSession, TaughtUnit } from '@/types'
import { rateColour, sessionExportUrl, useSessionReports, useUnitAttendanceRates } from './reportingApi'

/**
 * Layout borrowed from the Figma mockup (unit cards → filter tabs → session
 * log); the header/sidebar/bottom-nav chrome is our own real AppLayout, not
 * the mockup's (which still has the ERP badges and hamburger removed
 * elsewhere in this app). Credit hours from the mockup are dropped — not a
 * real field anywhere in the schema — and "QR Code / Download" becomes a
 * real per-session CSV export instead of trying to redisplay an expired
 * rotating code.
 */
export function AttendanceReportsPage() {
  const { data: units, isPending: unitsPending, error: unitsError, refetch: refetchUnits } = useMyUnits()
  const { data: sessions, isPending: sessionsPending, error: sessionsError, refetch: refetchSessions } = useSessionReports()
  const [searchParams] = useSearchParams()
  // Lets the Units page's "Attendance" link open this page pre-filtered to one unit.
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(searchParams.get('unit'))
  const rateByUnit = useUnitAttendanceRates()

  const filteredSessions = selectedUnitId ? (sessions ?? []).filter((s) => s.unitId === selectedUnitId) : sessions

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <p className="text-sm font-semibold text-gold-600">TEACHING</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">Attendance Reports</h2>
      </div>

      {unitsError ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(unitsError, 'Could not load your units.')}</p>
          <button onClick={() => refetchUnits()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : unitsPending || !units ? (
        <div className="flex gap-4 overflow-x-auto pb-1">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[150px] w-64 shrink-0" />)}</div>
      ) : units.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No units assigned yet.</Card>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {units.map((unit) => <UnitReportCard key={unit.id} unit={unit} rate={rateByUnit.get(unit.id) ?? 0} />)}
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by unit">
            <TabButton active={selectedUnitId === null} onClick={() => setSelectedUnitId(null)}>All Units</TabButton>
            {units.map((unit) => (
              <TabButton key={unit.id} active={selectedUnitId === unit.id} onClick={() => setSelectedUnitId(unit.id)}>{unit.code}</TabButton>
            ))}
          </div>
        </>
      )}

      <Card className="overflow-hidden">
        <div className="p-5"><h3 className="font-semibold text-navy-900">Session Log</h3></div>
        {sessionsError ? (
          <div role="alert" className="flex items-center justify-between border-t border-line p-5 text-sm">
            <span className="text-red-700">{errorMessage(sessionsError, 'Could not load the session log.')}</span>
            <button onClick={() => refetchSessions()} className="font-semibold text-navy-900 underline">Retry</button>
          </div>
        ) : sessionsPending || !filteredSessions ? (
          <div className="space-y-2 border-t border-line p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : filteredSessions.length === 0 ? (
          <p className="border-t border-line p-8 text-center text-sm text-muted">No sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-y border-line bg-surface/60 text-xs font-semibold tracking-wider text-muted">
                  {['DATE', 'UNIT', 'PRESENT', 'ABSENT', 'RATE', 'REFERENCE', ''].map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSessions.map((s) => <SessionRow key={s.id} session={s} />)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function UnitReportCard({ unit, rate }: { unit: TaughtUnit; rate: number }) {
  const { text, bar } = rateColour(rate)
  return (
    <Card className="w-64 shrink-0 space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{unit.code}</span>
        <span className={`text-lg font-bold ${text}`}>{rate.toFixed(0)}%</span>
      </div>
      <h3 className="truncate font-semibold text-navy-900">{unit.name ?? unit.code}</h3>
      <div className="h-1.5 w-full rounded-full bg-line" role="img" aria-label={`${rate.toFixed(0)}% average attendance`}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${rate}%` }} />
      </div>
      <p className="text-sm text-muted">{unit.studentCount} {unit.studentCount === 1 ? 'student' : 'students'}</p>
    </Card>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-navy-900/5'}`}
    >
      {children}
    </button>
  )
}

function SessionRow({ session }: { session: RecentSession }) {
  const { text, bar } = rateColour(session.rate)
  return (
    <tr>
      <td className="whitespace-nowrap px-5 py-4 text-muted">{formatShortDate(session.date)}</td>
      <td className="px-5 py-4"><span className="rounded-md bg-navy-900/5 px-2.5 py-1 text-xs font-semibold text-navy-900">{session.unitCode}</span></td>
      <td className="px-5 py-4 font-semibold text-navy-900">{session.present}</td>
      <td className="px-5 py-4 text-red-600">{session.absent}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-line" role="img" aria-label={`${session.rate}% attendance`}>
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${session.rate}%` }} />
          </div>
          <span className={`font-semibold ${text}`}>{session.rate}%</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted">{session.reference}</td>
      <td className="px-5 py-4">
        <a
          href={sessionExportUrl(session.id)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline"
        >
          <Download className="size-3.5" aria-hidden /> Download
        </a>
      </td>
    </tr>
  )
}
