import { useRef, type ChangeEvent, type ReactNode } from 'react'
import { BadgeCheck, Camera, IdCard, LogOut, Mail, Pencil } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChangePasswordRow } from '@/auth/ChangePasswordRow'
import { DeleteAccountRow } from '@/auth/DeleteAccountRow'
import { useLogout, useMe, useRemoveAvatar, useSetAvatar } from '@/auth/authApi'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { resizeImageFile } from '@/lib/image'
import type { AccountStatus } from '@/types'

// Only shown when it needs attention: anyone reading this page while ACTIVE knows they're active.
const STATUS_STYLE: Record<Exclude<AccountStatus, 'ACTIVE'>, { label: string; className: string }> = {
  PENDING_VERIFICATION: { label: 'Pending email verification', className: 'text-warning' },
  PENDING_APPROVAL: { label: 'Pending administrator approval', className: 'text-warning' },
  SUSPENDED: { label: 'Suspended', className: 'text-danger' },
  DEACTIVATED: { label: 'Deactivated', className: 'text-danger' },
}

/**
 * Identity, then details, then settings, then Sign out, with Delete account last and quiet:
 * the order account pages conventionally follow, with one prominent button.
 */
export function ProfilePage() {
  const { data: me } = useMe()
  // Lecturer-only page (RequireAuth sends students to theirs); narrowing keeps the lecturer fields typed.
  const user = me?.role === 'lecturer' ? me : undefined
  const logout = useLogout()
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

  const status = user.status === 'ACTIVE' ? null : STATUS_STYLE[user.status]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-linear-to-b from-brand-600 to-brand-800 px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-4">
            <div className="relative inline-block shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-14 rounded-2xl object-cover shadow-lg shadow-black/15" />
              ) : (
                <div className="grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={setAvatar.isPending}
                aria-label="Change photo"
                className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-brand text-white shadow-md hover:bg-brand-strong"
              >
                <Camera className="size-4" aria-hidden />
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickPhoto} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold">{user.fullName}</p>
              {/* The title (Dr., Prof.) is already part of the name, so the role goes here instead. */}
              <p className="mt-0.5 text-sm text-brand-200">Lecturer · {user.department}</p>
              <Link to="/profile/edit" className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <Pencil className="size-3.5" aria-hidden /> Edit profile
              </Link>
            </div>
          </div>
          {(user.avatarUrl || setAvatar.isPending || removeAvatar.isPending) && (
            <button
              type="button"
              onClick={() => removeAvatar.mutate()}
              disabled={removeAvatar.isPending || setAvatar.isPending}
              className="mt-2 text-xs font-medium text-brand-200 underline hover:text-white"
            >
              {setAvatar.isPending ? 'Uploading…' : removeAvatar.isPending ? 'Removing…' : 'Remove photo'}
            </button>
          )}
          {(setAvatar.isError || removeAvatar.isError) && (
            <p className="mt-2 text-xs text-red-300">{errorMessage(setAvatar.error ?? removeAvatar.error)}</p>
          )}
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <Info icon={<IdCard className="size-5 text-muted" />} label="Staff number" value={user.staffNumber} valueClass="font-mono font-semibold text-ink" />
          <Info icon={<Mail className="size-5 text-muted" />} label="Email" value={user.email} />
          {status && <Info icon={<BadgeCheck className={`size-5 ${status.className}`} />} label="Account status" value={status.label} valueClass={status.className} />}
        </div>
        <div className="border-t border-line px-5 py-3 sm:px-6">
          <ChangePasswordRow />
        </div>
      </Card>
      <Button
        variant="danger"
        className="w-full justify-center"
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
        loading={logout.isPending}
      >
        <LogOut className="size-4" aria-hidden /> Sign Out
      </Button>
      <DeleteAccountRow />
    </div>
  )
}

function Info({ icon, label, value, valueClass = 'text-ink' }: { icon: ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5" aria-hidden>{icon}</span>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className={`mt-1 break-all text-sm font-medium ${valueClass}`}>{value}</p></div>
    </div>
  )
}
