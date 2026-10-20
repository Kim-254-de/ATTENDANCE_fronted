import { CheckCircle2, GitMerge, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import type { DuplicateDepartment } from '@/types'
import { useDepartmentAliases, useDuplicateDepartments, useMergeDepartment, useRemoveDepartmentAlias } from './adminApi'

/**
 * One department, one spelling. Departments created under two spellings ("Computer Science" and
 * "Department of Computer Science") are merged here, and the spellings the system has learned
 * from SMARTTT are listed so a wrong one can be removed.
 */
export function DepartmentsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Duplicates />
      <Spellings />
    </div>
  )
}

function Duplicates() {
  const { data: groups, isPending, error, refetch } = useDuplicateDepartments()
  return (
    <section aria-labelledby="duplicates" className="space-y-3">
      <div>
        <h2 id="duplicates" className="font-semibold text-navy-900">Duplicate departments</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Departments whose names mean the same thing once spelling, punctuation and abbreviations are ignored. Merging moves the
          duplicate’s lecturers, officers, courses, units, audits and evaluation results into the department you keep. Its name stays
          recognised as a spelling of the kept one. A merge cannot be undone.
        </p>
      </div>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not check for duplicates.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !groups ? (
        <Skeleton className="h-32" />
      ) : groups.length === 0 ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-navy-900">
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
    if (!window.confirm(`Merge ${others.map((d) => `“${d.name}”`).join(', ')} into “${keep.name}”? This cannot be undone.`)) return
    for (const d of others) await merge.mutateAsync({ duplicateId: d.departmentId, intoDepartmentId: keepId })
  }

  return (
    <Card className="p-5">
      <fieldset>
        <legend className="text-sm font-semibold text-navy-900">Which one to keep?</legend>
        <ul className="mt-3 space-y-2">
          {group.map((d) => (
            <li key={d.departmentId}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-checked:border-navy-900 has-checked:bg-surface">
                <input type="radio" name={`keep-${group[0]!.departmentId}`} checked={keepId === d.departmentId} onChange={() => setKeepId(d.departmentId)} className="mt-1 accent-navy-900" />
                <span className="min-w-0">
                  <span className="block font-medium text-navy-900">{d.name}</span>
                  <span className="text-xs text-muted">
                    {d.facultyName ?? 'No faculty'} · {d.lecturerCount} lecturer{d.lecturerCount === 1 ? '' : 's'} · {d.unitCount} unit{d.unitCount === 1 ? '' : 's'}
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
      {merge.error && <p role="alert" className="mt-2 text-sm text-red-600">{errorMessage(merge.error)}</p>}
    </Card>
  )
}

function Spellings() {
  const { data: aliases, isPending, error } = useDepartmentAliases()
  const remove = useRemoveDepartmentAlias()
  return (
    <section aria-labelledby="spellings" className="space-y-3">
      <div>
        <h2 id="spellings" className="font-semibold text-navy-900">Learned spellings</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Other names SMARTTT uses for a department, learned when someone placed an unassigned lecturer or merged two departments.
          Removing one doesn’t move anyone already placed. Future lecturers with that spelling will be left unassigned again.
        </p>
      </div>
      {error ? (
        <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(error, 'Could not load the learned spellings.')}</Card>
      ) : isPending || !aliases ? (
        <Skeleton className="h-24" />
      ) : aliases.length === 0 ? (
        <Card className="p-5 text-sm text-muted">None yet. They appear as unassigned lecturers are placed.</Card>
      ) : (
        <Card className="divide-y divide-line">
          {aliases.map((a) => (
            <div key={a.aliasId} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-navy-900">“{a.alias}” <span className="text-muted">means</span> <strong>{a.departmentName}</strong></p>
                <p className="text-xs text-muted">
                  {a.source === 'MERGE' ? 'From a merge' : 'From a placement'}{a.createdByName ? ` by ${a.createdByName}` : ''} · {new Date(a.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(a.aliasId)}
                disabled={remove.isPending}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                aria-label={`Remove the spelling “${a.alias}”`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </Card>
      )}
      {remove.error && <p role="alert" className="text-sm text-red-600">{errorMessage(remove.error)}</p>}
    </section>
  )
}
