import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BookOpen, Calendar, Camera, Check, ClipboardCheck, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/ui/StatCard'
import { useOverview } from '@/features/dashboard/dashboardApi'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import type { AccountStatus } from '@/types'
import {
  useChangePassword,
  useLogout,
  useMe,
  useRemoveAvatar,
  useSetAvatar,
  useUpdateProfile,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from './authApi'

const emptyForm: UpdateProfileInput = { title: '', department: '' }

const STATUS_STYLE: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active and verified', className: 'text-success' },
  PENDING_VERIFICATION: { label: 'Pending email verification', className: 'text-gold-600' },
  PENDING_APPROVAL: { label: 'Pending administrator approval', className: 'text-gold-600' },
  SUSPENDED: { label: 'Suspended', className: 'text-red-600' },
  DEACTIVATED: { label: 'Deactivated', className: 'text-red-600' },
}

/** Downscales and re-compresses before upload, so payload size doesn't depend on the source photo. */
async function resizeImageFile(file: File, maxDim = 320, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function ProfilePage() {
  const { data: user } = useMe()
  const updateProfile = useUpdateProfile()
  const logout = useLogout()
  const navigate = useNavigate()
  const [form, setForm] = useState<UpdateProfileInput>(() => (user ? { title: user.title, department: user.department } : emptyForm))
  const [saved, setSaved] = useState(false)

  const setAvatar = useSetAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fill the form once per account: a background refetch of /auth/me must not wipe unsaved edits.
  useEffect(() => {
    if (user) setForm({ title: user.title, department: user.department })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null

  const setField = (field: keyof UpdateProfileInput, value: string) => {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(false)
    updateProfile.mutate(form, { onSuccess: () => setSaved(true) })
  }

  const onPickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be re-picked after an error
    if (!file) return
    const dataUrl = await resizeImageFile(file)
    setAvatar.mutate(dataUrl)
  }

  const status = STATUS_STYLE[user.status]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-gold-600">ACCOUNT SETTINGS</p>
        <p className="mt-1 max-w-2xl text-sm text-muted">Keep your lecturer details current so attendance records and ERP reports identify you correctly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="h-fit overflow-hidden">
          <div className="bg-navy-900 px-6 pb-7 pt-6 text-white">
            <div className="relative inline-block">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-20 rounded-2xl object-cover shadow-lg shadow-black/15" />
              ) : (
                <div className="grid size-20 place-items-center rounded-2xl bg-gold-500 text-2xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={setAvatar.isPending}
                aria-label="Change photo"
                className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-gold-500 text-navy-900 shadow-md hover:bg-gold-600"
              >
                <Camera className="size-4" aria-hidden />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickPhoto} />
            </div>
            <p className="mt-5 text-xl font-bold">{user.fullName}</p>
            <p className="mt-1 text-sm text-blue-200">{user.title || 'Lecturer'} · {user.department}</p>
            {(user.avatarUrl || setAvatar.isPending || removeAvatar.isPending) && (
              <button
                type="button"
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending || setAvatar.isPending}
                className="mt-2 text-xs font-medium text-blue-200 underline hover:text-white"
              >
                {setAvatar.isPending ? 'Uploading…' : removeAvatar.isPending ? 'Removing…' : 'Remove photo'}
              </button>
            )}
            {(setAvatar.isError || removeAvatar.isError) && (
              <p className="mt-2 text-xs text-red-300">{errorMessage(setAvatar.error ?? removeAvatar.error)}</p>
            )}
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p><p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className={`mt-0.5 size-5 ${status.className}`} aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p><p className={`mt-1 text-sm font-medium ${status.className}`}>{status.label}</p></div>
            </div>
            <div className="border-t border-line pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Staff number</p><p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.staffNumber}</p></div>
            <Button
              variant="ghost"
              className="w-full justify-center text-red-600 hover:bg-red-50"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
              loading={logout.isPending}
            >
              <LogOut className="size-4" aria-hidden /> Sign Out
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-3 border-b border-line pb-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><UserRound className="size-5" aria-hidden /></span>
              <div><h3 className="font-bold text-navy-900">Personal details</h3></div>
            </div>
            <form className="mt-6 space-y-5" onSubmit={submit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" value={user.fullName} readOnly />
                <Field label="School email" type="email" value={user.email} readOnly />
                <Field label="Title" value={form.title} onChange={(value) => setField('title', value)} placeholder="e.g. Dr." />
                <Field label="Department" value={form.department} onChange={(value) => setField('department', value)} required />
              </div>
              <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div aria-live="polite" className="text-sm">
                  {saved && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />Profile updated</span>}
                  {updateProfile.isError && <span className="text-red-600">{errorMessage(updateProfile.error)}</span>}
                </div>
                <Button type="submit" loading={updateProfile.isPending}>Save changes</Button>
              </div>
            </form>
          </Card>

          <ChangePasswordCard />
        </div>
      </div>

      <TeachingSummary />
    </div>
  )
}

function ChangePasswordCard() {
  const changePassword = useChangePassword()
  const [form, setForm] = useState<ChangePasswordInput>({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [done, setDone] = useState<string | null>(null)

  const setField = (field: keyof ChangePasswordInput, value: string) => {
    setDone(null)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDone(null)
    changePassword.mutate(form, {
      onSuccess: (result) => {
        setDone(result.message)
        setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      },
    })
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-3 border-b border-line pb-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><ShieldCheck className="size-5" aria-hidden /></span>
        <div><h3 className="font-bold text-navy-900">Change password</h3><p className="mt-1 text-sm text-muted">Signs you out on every other device you're currently signed in on.</p></div>
      </div>
      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Current password" type="password" value={form.currentPassword} onChange={(v) => setField('currentPassword', v)} required />
          <div />
          <Field label="New password" type="password" value={form.newPassword} onChange={(v) => setField('newPassword', v)} required />
          <Field label="Confirm new password" type="password" value={form.confirmNewPassword} onChange={(v) => setField('confirmNewPassword', v)} required />
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {done && <span className="inline-flex items-center gap-2 font-medium text-success"><Check className="size-4" aria-hidden />{done}</span>}
            {changePassword.isError && <span className="text-red-600">{errorMessage(changePassword.error)}</span>}
          </div>
          <Button type="submit" loading={changePassword.isPending}>Update password</Button>
        </div>
      </form>
    </Card>
  )
}

function TeachingSummary() {
  const { data, isPending, error, refetch } = useOverview()

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-gold-600">TEACHING SUMMARY</p>
      {error ? (
        <Card className="flex items-center justify-between p-5" role="alert">
          <p className="text-sm text-red-700">{errorMessage(error, 'Could not load your teaching summary.')}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold text-navy-900 underline">Retry</button>
        </Card>
      ) : isPending || !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={UserRound} label="Total Students" value={data.totalStudents} hint="Across all units" />
          <StatCard icon={ClipboardCheck} label="Avg. Attendance" value={`${data.avgAttendance.toFixed(1)}%`} hint={data.periodLabel} accent />
          <StatCard icon={BookOpen} label="Units allocated" value={data.unitsTaught} hint="Currently teaching" />
          <StatCard icon={Calendar} label="Sessions Held" value={data.sessionsHeld} hint={data.periodLabel} />
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">{label}</label>
      <input
        id={id}
        className={`input mt-2 ${readOnly ? 'cursor-not-allowed bg-navy-900/5 text-muted' : ''}`}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
      />
    </div>
  )
}
