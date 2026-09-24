import { Zap } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { useMyUnits } from '@/features/units/unitsApi'
import { useCreateSession, setActiveSessionId } from './sessionApi'

const DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 90, label: '1.5 hr' },
  { minutes: 120, label: '2 hr' },
]

/**
 * The one action a lecturer needs fastest: pick the unit in front of them and
 * go live. Everything else — rotation window, image export, verification
 * rules — lives on the live session screen, not here.
 */
export function ActivateClass() {
  const unitSelectId = useId()
  const { data: units, isPending: unitsLoading, error: unitsError } = useMyUnits()
  const [unitId, setUnitId] = useState('')
  const [duration, setDuration] = useState(60)
  const navigate = useNavigate()

  const create = useCreateSession()

  const activate = () => {
    const closesAt = new Date(Date.now() + duration * 60_000).toISOString()
    create.mutate(
      { unitId, closesAt },
      {
        onSuccess: (session) => {
          setActiveSessionId(session.id)
          navigate(`/session/${session.id}`, { state: { session } })
        },
      },
    )
  }

  return (
    <Card className="overflow-hidden border border-gold-500/30">
      <div className="flex items-center gap-3 border-b border-line p-5">
        <span className="grid size-11 place-items-center rounded-xl bg-gold-100 text-gold-600"><Zap className="size-5" aria-hidden /></span>
        <div className="leading-tight">
          <h2 className="font-semibold text-navy-900">Activate Class</h2>
          <p className="text-sm text-muted">Start a session so students can check in</p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <label htmlFor={unitSelectId} className="sr-only">Unit</label>
        <select
          id={unitSelectId}
          className="input"
          value={unitId}
          disabled={unitsLoading}
          onChange={(e) => setUnitId(e.target.value)}
        >
          <option value="">{unitsLoading ? 'Loading units…' : units?.length === 0 ? 'No units assigned to you yet' : 'Select a unit'}</option>
          {units?.map((u) => <option key={u.id} value={u.id}>{u.name ? `${u.code} — ${u.name}` : u.code}</option>)}
        </select>
        {unitsError && <p role="alert" className="text-sm text-red-600">{errorMessage(unitsError, 'Could not load your units.')}</p>}
        {units?.length === 0 && (
          <p className="text-sm text-muted">
            <Link to="/units" className="font-semibold text-navy-900 underline">Add a unit</Link> you teach to activate a class for it.
          </p>
        )}

        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`${unitSelectId}-duration`}>Class duration</label>
          <select
            id={`${unitSelectId}-duration`}
            className="input !w-32 flex-none"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
          </select>
          <Button className="flex-1" onClick={activate} disabled={!unitId} loading={create.isPending}>
            <Zap className="size-4" aria-hidden /> Activate Class
          </Button>
        </div>
        {create.error && <p role="alert" className="text-sm text-red-600">{errorMessage(create.error)}</p>}
      </div>
    </Card>
  )
}
