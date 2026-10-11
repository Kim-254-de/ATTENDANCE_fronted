import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { useAdminFaculties, useCreateFaculty } from './adminApi'

/** Faculties: created here, then each gets a faculty officer (Officers), who creates its departments. */
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
        <h2 className="font-semibold text-navy-900">Add a faculty</h2>
        <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="sr-only">Faculty name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Faculty of Science and Technology" className="input" />
          </label>
          <Button type="submit" loading={create.isPending} disabled={name.trim().length < 3}><Plus className="size-4" aria-hidden /> Add faculty</Button>
        </form>
        {create.isError && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(create.error)}</p>}
      </Card>

      {faculties.error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(faculties.error, 'Could not load faculties.')}</Card>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {faculties.data.map((f) => (
                <tr key={f.facultyId}>
                  <td className="px-5 py-3 font-medium text-navy-900">{f.name}</td>
                  <td className="px-5 py-3">{f.departmentCount}</td>
                  <td className="px-5 py-3">{f.officerCount === 0 ? <span className="text-orange-700">None yet</span> : f.officerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
