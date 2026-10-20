import { useQaDepartments, useQaFaculties } from './audits/auditsApi'

export interface TargetFilterValues {
  targetDepartmentId?: string
  targetFacultyId?: string
  from?: string
  to?: string
}

/**
 * The department / faculty / date-range filters the dashboard, the audit
 * register and the CAPA register share. A QA officer has no home department
 * to scope by, so these are the only scoping there is. Department and faculty
 * are exclusive — an audit targets one or the other — so choosing one clears
 * the other. `dates={false}` hides the range for the CAPA list, whose endpoint
 * has no from/to and refuses unknown params.
 */
export function TargetFilters({ value, onChange, dates = true }: { value: TargetFilterValues; onChange: (next: TargetFilterValues) => void; dates?: boolean }) {
  const { data: departments } = useQaDepartments()
  const { data: faculties } = useQaFaculties()
  const set = (patch: TargetFilterValues) => onChange({ ...value, ...patch })

  return (
    <>
      <label className="block space-y-1.5 text-sm font-semibold text-ink">
        Department
        <select
          value={value.targetDepartmentId ?? ''}
          onChange={(e) => set({ targetDepartmentId: e.target.value || undefined, targetFacultyId: undefined })}
          className="input"
        >
          <option value="">All departments</option>
          {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5 text-sm font-semibold text-ink">
        Faculty
        <select
          value={value.targetFacultyId ?? ''}
          onChange={(e) => set({ targetFacultyId: e.target.value || undefined, targetDepartmentId: undefined })}
          className="input"
        >
          <option value="">All faculties</option>
          {faculties?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      {dates && (
        <>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            From
            <input type="date" value={value.from ?? ''} max={value.to} onChange={(e) => set({ from: e.target.value || undefined })} className="input" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            To
            <input type="date" value={value.to ?? ''} min={value.from} onChange={(e) => set({ to: e.target.value || undefined })} className="input" />
          </label>
        </>
      )}
    </>
  )
}
