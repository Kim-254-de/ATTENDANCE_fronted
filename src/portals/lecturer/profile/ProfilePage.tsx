import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, Check, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChangePasswordCard, Field } from '@/auth/ChangePasswordCard'
import {
  useLogout,
  useMe,
  useRemoveAvatar,
  useSetAvatar,
  useUpdateProfile,
  type UpdateProfileInput,
} from '@/auth/authApi'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { resizeImageFile } from '@/lib/image'
import type { AccountStatus } from '@/types'

const emptyForm: UpdateProfileInput = { title: '', department: '' }

const STATUS_STYLE: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active and verified', className: 'text-success' },
  PENDING_VERIFICATION: { label: 'Pending email verification', className: 'text-gold-600' },
  PENDING_APPROVAL: { label: 'Pending administrator approval', className: 'text-gold-600' },
  SUSPENDED: { label: 'Suspended', className: 'text-red-600' },
  DEACTIVATED: { label: 'Deactivated', className: 'text-red-600' },
}

export function ProfilePage() {
  const { data: me } = useMe()
  // Lecturer-only page (RequireAuth sends students to theirs); narrowing keeps the lecturer fields typed.
  const user = me?.role === 'lecturer' ? me : undefined
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
        <p className="text-sm font-semibold tracking-wide text-blue-700">ACCOUNT SETTINGS</p>
        <p className="mt-1 max-w-2xl text-sm text-muted">Keep your lecturer details current so attendance records and ERP reports identify you correctly.</p>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4 p-6 sm:p-8">
          <div className="border-b border-line pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Staff number</p>
            <p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.staffNumber}</p>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-blue-700" aria-hidden />
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p><p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className={`mt-0.5 size-5 ${status.className}`} aria-hidden />
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p><p className={`mt-1 text-sm font-medium ${status.className}`}>{status.label}</p></div>
          </div>
        </Card>

        <Card className="overflow-hidden ring-1 ring-blue-100">
          <div className="bg-linear-to-br from-blue-600 to-blue-800 px-6 pb-7 pt-6 text-white">
            <div className="relative inline-block">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-20 rounded-2xl object-cover shadow-lg shadow-black/15" />
              ) : (
                <div className="grid size-20 place-items-center rounded-2xl bg-blue-500 text-2xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={setAvatar.isPending}
                aria-label="Change photo"
                className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700"
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
        </Card>

        <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-3 border-b border-line pb-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserRound className="size-5" aria-hidden /></span>
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
        <Button
          variant="ghost"
          className="w-full justify-center text-red-600 hover:bg-red-50"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login?role=lecturer', { replace: true }) })}
          loading={logout.isPending}
        >
          <LogOut className="size-4" aria-hidden /> Sign Out
        </Button>
      </div>
    </div>
  )
}
