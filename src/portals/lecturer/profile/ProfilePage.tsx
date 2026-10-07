import { useRef, type ChangeEvent } from 'react'
import { Camera, LogOut, Mail, MailCheck, Pencil, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  useForgotPassword,
  useLogout,
  useMe,
  useRemoveAvatar,
  useSetAvatar,
} from '@/auth/authApi'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { resizeImageFile } from '@/lib/image'
import type { AccountStatus } from '@/types'

const STATUS_STYLE: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active and verified', className: 'text-success' },
  PENDING_VERIFICATION: { label: 'Pending email verification', className: 'text-orange-600' },
  PENDING_APPROVAL: { label: 'Pending administrator approval', className: 'text-orange-600' },
  SUSPENDED: { label: 'Suspended', className: 'text-red-600' },
  DEACTIVATED: { label: 'Deactivated', className: 'text-red-600' },
}

export function ProfilePage() {
  const { data: me } = useMe()
  // Lecturer-only page (RequireAuth sends students to theirs); narrowing keeps the lecturer fields typed.
  const user = me?.role === 'lecturer' ? me : undefined
  const logout = useLogout()
  const forgotPassword = useForgotPassword()
  const navigate = useNavigate()

  const setAvatar = useSetAvatar()
  const removeAvatar = useRemoveAvatar()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const onPickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be re-picked after an error
    if (!file) return
    const dataUrl = await resizeImageFile(file)
    setAvatar.mutate(dataUrl)
  }

  const status = STATUS_STYLE[user.status]

  return (
    <div className="mx-auto max-w-xl">
        <Card className="h-fit overflow-hidden">
          <div className="bg-linear-to-b from-blue-600 to-blue-700 px-5 pb-5 pt-5 text-white sm:px-6">
            <div className="relative inline-block">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-16 rounded-2xl object-cover shadow-lg shadow-black/15" />
              ) : (
                <div className="grid size-16 place-items-center rounded-2xl bg-white/15 text-xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={setAvatar.isPending}
                aria-label="Change photo"
                className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-blue-700 text-white shadow-md hover:bg-blue-800"
              >
                <Camera className="size-4" aria-hidden />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickPhoto} />
            </div>
            <Link to="/profile/edit" className="group mt-3 block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span className="flex items-center gap-2 text-lg font-bold group-hover:underline">{user.fullName}<Pencil className="size-4 opacity-80" aria-hidden /></span>
              <span className="mt-0.5 block text-sm text-blue-200">{user.title || 'Lecturer'} · {user.department}</span>
              <span className="mt-0.5 block text-xs text-blue-200">Edit profile</span>
            </Link>
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
          <div className="space-y-3 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-muted" aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Email</p><p className="mt-1 break-all text-sm font-medium text-ink">{user.email}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className={`mt-0.5 size-5 ${status.className}`} aria-hidden />
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Account status</p><p className={`mt-1 text-sm font-medium ${status.className}`}>{status.label}</p></div>
            </div>
            <div className="border-t border-line pt-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Staff number</p><p className="mt-1 font-mono text-sm font-semibold text-navy-900">{user.staffNumber}</p></div>
            {forgotPassword.isSuccess ? (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-success"><MailCheck className="size-4" aria-hidden /> Check your inbox for the reset link.</p>
            ) : (
              <>
                <Button variant="lecturer" className="w-full justify-center" onClick={() => forgotPassword.mutate(user.email)} loading={forgotPassword.isPending}>
                  <Mail className="size-4" aria-hidden /> Send reset link
                </Button>
                {forgotPassword.isError && <p role="alert" className="text-sm text-red-600">{errorMessage(forgotPassword.error)}</p>}
              </>
            )}
            <Button
              variant="danger"
              className="w-full justify-center"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login?role=lecturer', { replace: true }) })}
              loading={logout.isPending}
            >
              <LogOut className="size-4" aria-hidden /> Sign Out
            </Button>
          </div>
        </Card>
    </div>
  )
}
