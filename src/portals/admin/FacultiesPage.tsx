import { useState, type FormEvent } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useAdminFaculties, useCreateFaculty, useDirectoryStatus, useSyncDirectory } from './adminApi'

/**
 * Faculties: added here (created in SMARTTT, which owns faculties and
 * departments), then each gets a faculty officer (Officers), who adds its departments.
 */
export function FacultiesPage() {
  const faculties = useAdminFaculties()
  const create = useCreateFaculty()
  const [name, setName] = useState('')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate(name.trim(), { onSuccess: () => setName('') })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Add a faculty</h2>
        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="sr-only">Faculty name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Faculty of Science and Technology" className="input" />
          </label>
          <Button type="submit" loading={create.isPending} disabled={name.trim().length < 3}><Plus className="size-4" aria-hidden /> Add faculty</Button>
        </form>
        {create.isError && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(create.error)}</p>}
      </Card>

      <DirectoryCard />

      {faculties.error ? (
        <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(faculties.error, 'Could not load faculties.')}</Card>
      ) : faculties.isPending ? (
        <Skeleton className="h-40" />
      ) : faculties.data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No faculties yet.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-3">Faculty</th>
                <th scope="col" className="px-5 py-3">Departments</th>
                <th scope="col" className="px-5 py-3">Officers</th>
                <th scope="col" className="px-5 py-3">SMARTTT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {faculties.data.map((f) => (
                <tr key={f.facultyId}>
                  <td className="px-5 py-3 font-medium text-ink">{f.name}</td>
                  <td className="px-5 py-3">{f.departmentCount}</td>
                  <td className="px-5 py-3">{f.officerCount === 0 ? <span className="text-warning">None yet</span> : f.officerCount}</td>
                  <td className="px-5 py-3">{f.inSmarttt ? <span className="text-success">Linked</span> : <span className="text-warning">Only here</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/**
 * Faculties and departments made here before SMARTTT owned them exist only
 * here; sending them creates them in SMARTTT (or links to SMARTTT's own by name).
 */
function DirectoryCard() {
  const status = useDirectoryStatus()
  const sync = useSyncDirectory()
  if (!status.data?.smartttConnected) return null
  const { faculties, departments } = status.data.onlyHere
  const report = sync.data?.toSmarttt

  return (
    <Card className="space-y-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">SMARTTT</h2>
          <p className="mt-1 text-sm text-muted">
            {faculties + departments === 0
              ? 'Every faculty and department is in SMARTTT.'
              : `${faculties} faculty(ies) and ${departments} department(s) exist only here. Send them to SMARTTT so both systems share one list.`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => sync.mutate()} loading={sync.isPending}>
          <RefreshCw className="size-4" aria-hidden /> {faculties + departments === 0 ? 'Check SMARTTT' : 'Send to SMARTTT'}
        </Button>
      </div>
      {sync.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(sync.error)}</p>}
      {report && (
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-success">
          Sent {report.faculties} faculty(ies) and {report.departments} department(s) to SMARTTT.
          {report.skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-orange-700">{report.skipped.map((s) => <li key={s}>{s}</li>)}</ul>
          )}
        </div>
      )}
    </Card>
  )
}
