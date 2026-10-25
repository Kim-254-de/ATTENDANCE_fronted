import { CheckCircle2, GitMerge, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage, fieldErrors } from '@/lib/api'
import type { DuplicateDepartment } from '@/types'
import {
  useAdminDepartments,
  useCreateDepartment,
  useDepartmentAliases,
  useDirectoryStatus,
  useDuplicateDepartments,
  useMergeDepartment,
  useRemoveDepartmentAlias,
  useSyncDirectory,
} from './adminApi'

/**
 * The university's departments. Faculties play no part: the administrator
 * creates each department here with a name and a code ("DCOMP"), unique
 * across the university. It is created in SMARTTT first, and the Timetable
 * Allocator and Generator import it from here to build the timetable.
 *
 * One department, one spelling: departments created under two spellings
 * ("Computer Science" and "Department of Computer Science") are merged here,
 * and the spellings learned from SMARTTT are listed so a wrong one can be removed.
 */
export function DepartmentsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <AddDepartment />
      <DirectoryCard />
      <DepartmentList />
      <Duplicates />
      <Spellings />
    </div>
  )
}

function AddDepartment() {
  const id = useId()
  const create = useCreateDepartment()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const fields = fieldErrors(create.error)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate({ name: name.trim(), code: code.trim().toUpperCase() }, { onSuccess: () => { setName(''); setCode('') } })
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-ink">Add a department</h2>
      <p className="mt-1 text-sm text-muted">The code is how the Timetable Allocator and Generator know the department. It must be unique.</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-start" noValidate>
        <div className="space-y-1">
          <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">Department name</label>
          <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Computer Science" className="input" maxLength={160} aria-invalid={!!fields.name || undefined} />
          {fields.name && <p className="text-xs text-danger">{fields.name}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${id}-code`} className="text-sm font-medium text-ink">Code</label>
          <input id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. DCOMP" className="input uppercase" maxLength={32} aria-invalid={!!fields.code || undefined} />
          {fields.code && <p className="text-xs text-danger">{fields.code}</p>}
        </div>
        <Button type="submit" className="sm:mt-6" loading={create.isPending} disabled={name.trim().length < 3 || !code.trim()}>
          <Plus className="size-4" aria-hidden /> Add department
        </Button>
      </form>
      {create.isError && !fields.name && !fields.code && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(create.error)}</p>}
      {create.isSuccess && <p role="status" className="mt-2 text-sm text-success">{create.data.name} ({create.data.code}) was added.</p>}
    </Card>
  )
}

function DepartmentList() {
  const { data: departments, isPending, error, refetch } = useAdminDepartments()
  return (
    <section aria-labelledby="all-departments" className="space-y-3">
      <h2 id="all-departments" className="font-semibold text-ink">All departments</h2>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not load the departments.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !departments ? (
        <Skeleton className="h-40" />
      ) : departments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No departments yet. Add the first one above.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-3">Department</th>
                <th scope="col" className="px-5 py-3">Code</th>
                <th scope="col" className="px-5 py-3">Lecturers</th>
                <th scope="col" className="px-5 py-3">SMARTTT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {departments.map((d) => (
                <tr key={d.departmentId}>
                  <td className="px-5 py-3 font-medium text-ink">{d.name}</td>
                  <td className="px-5 py-3 font-mono text-ink">{d.code ?? <span className="font-sans text-warning">No code</span>}</td>
                  <td className="px-5 py-3 text-ink">{d.lecturerCount}</td>
                  <td className="px-5 py-3">{d.inSmarttt ? <span className="text-success">Linked</span> : <span className="text-warning">Only here</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  )
}

/**
 * Departments made here before SMARTTT owned them exist only here; sending
 * them creates them in SMARTTT (or links to SMARTTT's own by name).
 */
function DirectoryCard() {
  const status = useDirectoryStatus()
  const sync = useSyncDirectory()
  if (!status.data?.smartttConnected) return null
  const { departments } = status.data.onlyHere
  const report = sync.data?.toSmarttt

  return (
    <Card className="space-y-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">SMARTTT</h2>
          <p className="mt-1 text-sm text-muted">
            {departments === 0
              ? 'Every department is in SMARTTT.'
              : `${departments} department(s) exist only here. Send them to SMARTTT so both systems share one list.`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => sync.mutate()} loading={sync.isPending}>
          <RefreshCw className="size-4" aria-hidden /> {departments === 0 ? 'Check SMARTTT' : 'Send to SMARTTT'}
        </Button>
      </div>
      {sync.isError && <p role="alert" className="text-sm text-danger">{errorMessage(sync.error)}</p>}
      {report && (
        <div role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          Sent {report.departments} department(s) to SMARTTT.
          {report.skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-warning">{report.skipped.map((s) => <li key={s}>{s}</li>)}</ul>
          )}
        </div>
      )}
    </Card>
  )
}

function Duplicates() {
  const { data: groups, isPending, error, refetch } = useDuplicateDepartments()
  return (
    <section aria-labelledby="duplicates" className="space-y-3">
      <div>
        <h2 id="duplicates" className="font-semibold text-ink">Duplicate departments</h2>
        <p className="mt-1 text-sm text-muted">The same department under different names. Merge them into one.</p>
      </div>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-danger">{errorMessage(error, 'Could not check for duplicates.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-ink underline">Retry</button>
        </Card>
      ) : isPending || !groups ? (
        <Skeleton className="h-32" />
      ) : groups.length === 0 ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-ink">
          <CheckCircle2 className="size-5 text-success" aria-hidden /> Every department has a single spelling.
        </Card>
      ) : (
        groups.map((group) => <DuplicateGroup key={group.map((d) => d.departmentId).join()} group={group} />)
      )}
    </section>
  )
}

function DuplicateGroup({ group }: { group: DuplicateDepartment[] }) {
  // The list comes busiest first, which is usually the one to keep.
  const [keepId, setKeepId] = useState(group[0]!.departmentId)
  const merge = useMergeDepartment()
  const keep = group.find((d) => d.departmentId === keepId)!

  const mergeAll = async () => {
    const others = group.filter((d) => d.departmentId !== keepId)
    const names = others.map((d) => `“${d.name}”`).join(', ')
    if (!window.confirm(`Merge ${names} into “${keep.name}”?\n\nIts lecturers, officers, courses, units, audits and evaluation results move to “${keep.name}”. This cannot be undone.`)) return
    for (const d of others) await merge.mutateAsync({ duplicateId: d.departmentId, intoDepartmentId: keepId })
  }

  return (
    <Card className="p-5">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Which one to keep?</legend>
        <ul className="mt-3 space-y-2">
          {group.map((d) => (
            <li key={d.departmentId}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-checked:border-brand-ink has-checked:bg-surface">
                <input type="radio" name={`keep-${group[0]!.departmentId}`} checked={keepId === d.departmentId} onChange={() => setKeepId(d.departmentId)} className="mt-1 accent-brand" />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{d.name}</span>
                  <span className="block text-xs leading-5 text-muted">
                    {d.code ?? 'No code'} · {d.lecturerCount} lecturer{d.lecturerCount === 1 ? '' : 's'} · {d.unitCount} unit{d.unitCount === 1 ? '' : 's'}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Button type="button" variant="secondary" className="mt-4" onClick={mergeAll} loading={merge.isPending}>
        <GitMerge className="size-4" aria-hidden /> Merge into “{keep.name}”
      </Button>
      {merge.error && <p role="alert" className="mt-2 text-sm text-danger">{errorMessage(merge.error)}</p>}
    </Card>
  )
}

function Spellings() {
  const { data: aliases, isPending, error } = useDepartmentAliases()
  const remove = useRemoveDepartmentAlias()
  return (
    <section aria-labelledby="spellings" className="space-y-3">
      <div>
        <h2 id="spellings" className="font-semibold text-ink">Learned spellings</h2>
        <p className="mt-1 text-sm text-muted">Other names SMARTTT uses for a department.</p>
      </div>
      {error ? (
        <Card className="p-5 text-sm text-danger" role="alert">{errorMessage(error, 'Could not load the learned spellings.')}</Card>
      ) : isPending || !aliases ? (
        <Skeleton className="h-24" />
      ) : aliases.length === 0 ? (
        <Card className="p-5 text-sm text-muted">None yet.</Card>
      ) : (
        <Card className="divide-y divide-line">
          {aliases.map((a) => (
            <div key={a.aliasId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">“{a.alias}” <span className="text-muted">means</span> <strong>{a.departmentName}</strong></p>
                <p className="text-xs text-muted">
                  {a.source === 'MERGE' ? 'From a merge' : 'From a placement'}{a.createdByName ? ` by ${a.createdByName}` : ''} · {new Date(a.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(a.aliasId)}
                disabled={remove.isPending}
                className="rounded-lg p-2 text-danger hover:bg-danger-soft disabled:opacity-40"
                aria-label={`Remove the spelling “${a.alias}”`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </Card>
      )}
      {remove.error && <p role="alert" className="text-sm text-danger">{errorMessage(remove.error)}</p>}
    </section>
  )
}
