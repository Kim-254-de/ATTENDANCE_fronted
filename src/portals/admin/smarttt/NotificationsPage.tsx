import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { SmartttNotificationTarget, SmartttNotificationType } from '@/types'
import { Head, Notice, type Tone } from './parts'
import { useSendNotification, useSmartttNotifications, useSmartttPrograms, type NotificationInput } from './smartttApi'

const TYPES: Record<SmartttNotificationType, string> = {
  general: 'General',
  timetable_change: 'Timetable change',
  sync_reminder: 'Sync reminder',
  registration_reminder: 'Registration reminder',
}
const TARGETS: Record<SmartttNotificationTarget, string> = { all: 'All students', program: 'One programme', year: 'One year of study' }

/** Notifications to students in the SMARTTT app (in-app and push), and what was sent before. */
export function NotificationsPage() {
  const history = useSmartttNotifications()
  const programs = useSmartttPrograms()
  const send = useSendNotification()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<SmartttNotificationType>('general')
  const [target, setTarget] = useState<SmartttNotificationTarget>('all')
  const [program, setProgram] = useState('')
  const [year, setYear] = useState('1')
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const ready = title.trim() && message.trim() && (target !== 'program' || program)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const input: NotificationInput = { title: title.trim(), message: message.trim(), notification_type: type, target }
    if (target === 'program') input.target_program = program
    if (target === 'year') input.target_year = Number(year)
    setNotice(null)
    send.mutate(input, {
      onSuccess: (r) => {
        setTitle('')
        setMessage('')
        setNotice({ tone: 'success', text: `Sent to ${r.recipients} student(s); push delivered to ${r.push_sent} of ${r.push_attempted} device(s).` })
      },
      onError: (error) => setNotice({ tone: 'error', text: errorMessage(error) }),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold text-navy-900">Send a notification</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
          <label className="block space-y-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="input" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input h-auto py-2" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as SmartttNotificationType)} className="input">
              {Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
            Send to
            <select value={target} onChange={(e) => setTarget(e.target.value as SmartttNotificationTarget)} className="input">
              {Object.entries(TARGETS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {target === 'program' && (
            <label className="block space-y-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
              Programme
              <select value={program} onChange={(e) => setProgram(e.target.value)} className="input" disabled={programs.isPending}>
                <option value="">{programs.isPending ? 'Loading programmes…' : 'Choose a programme…'}</option>
                {(programs.data ?? []).map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              {programs.isError && <span role="alert" className="block text-xs font-normal text-red-600">{errorMessage(programs.error, 'Could not load the programmes.')}</span>}
            </label>
          )}
          {target === 'year' && (
            <label className="block space-y-1.5 text-sm font-semibold text-navy-900">
              Year of study
              <select value={year} onChange={(e) => setYear(e.target.value)} className="input">
                {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </label>
          )}
          {notice && <div className="md:col-span-2"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
          <div className="md:col-span-2">
            <Button type="submit" loading={send.isPending} disabled={!ready}><Send className="size-4" aria-hidden /> Send notification</Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold text-navy-900">Sent</h2>
        {history.error ? (
          <Card className="p-5 text-sm text-red-700" role="alert">{errorMessage(history.error, 'Could not load the notifications from SMARTTT.')}</Card>
        ) : history.isPending ? (
          <Skeleton className="h-32" />
        ) : history.data.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">No notifications sent yet.</Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <Head columns={['Title', 'Type', 'Sent to', 'Recipients', 'Sent']} />
              <tbody className="divide-y divide-line">
                {history.data.map((n) => (
                  <tr key={n.id}>
                    <td className="px-5 py-3 font-medium text-navy-900">{n.title}</td>
                    <td className="px-5 py-3 text-muted">{TYPES[n.notification_type as SmartttNotificationType] ?? n.notification_type}</td>
                    <td className="px-5 py-3 text-muted">{TARGETS[n.target as SmartttNotificationTarget] ?? n.target}</td>
                    <td className="px-5 py-3">{n.recipients_count}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(n.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}
