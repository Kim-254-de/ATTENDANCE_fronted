import { useRef, type ChangeEvent } from 'react'
import { BookOpen, Camera, LogOut, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { resizeImageFile } from '@/lib/image'
import { useForgotPassword, useLogout, useMe, useRemoveAvatar, useSetAvatar } from '@/auth/authApi'

/**
 * A student's own details. Read-only: name, email and registration number are
 * what the student records check verified at registration, so they aren't
 * editable here (ask the registrar). The password and profile photo can be changed.
 */
export function StudentProfilePage() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const user = me?.role === 'student' ? me : undefined
  const setAvatar = useSetAvatar()
  const removeAvatar = useRemoveAvatar()
  const forgotPassword = useForgotPassword()
  const fileInputRef = useRef<HTMLInputElement>(null)
  if (!user) return null

  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate('/login?role=student', { replace: true }) })

  const onPickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be re-picked after an error
    if (!file) return
    const dataUrl = await resizeImageFile(file)
    setAvatar.mutate(dataUrl)
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-navy-900 px-6 pb-7 pt-6 text-white">
          <div className="relative inline-block">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-20 rounded-2xl object-cover shadow-lg shadow-black/15" />
            ) : (
              <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 text-2xl font-bold shadow-lg shadow-black/15">{initials(user.fullName)}</div>
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
          <p className="mt-5 text-xl font-bold">{user.fullName}</p>
          <p className="mt-1 text-sm text-blue-200">{user.programme ?? 'Programme not recorded'}</p>
          <p className="mt-1 font-mono text-xs text-blue-200">{user.registrationNumber}</p>
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
          <Info icon={<Mail className="size-5" />} label="Email" value={user.email} />
          <Info icon={<BookOpen className="size-5" />} label="Year of study" value={user.yearOfStudy ? `Year ${user.yearOfStudy}` : 'Not recorded'} />
          <Info icon={<ShieldCheck className="size-5 text-success" />} label="Account status" value="Active and verified" valueClass="text-success" />
          <div className="space-y-3 border-t border-line pt-4">
            {forgotPassword.isSuccess ? (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-success"><Mail className="size-4" aria-hidden /> Check your inbox for the reset link.</p>
            ) : (
              <>
                <Button variant="accent" className="w-full" loading={forgotPassword.isPending} onClick={() => forgotPassword.mutate(user.email)}>
                  Send reset link
                </Button>
                {forgotPassword.isError && <p className="text-sm text-red-600">{errorMessage(forgotPassword.error)}</p>}
              </>
            )}
            <Button variant="danger" className="w-full" loading={logout.isPending} onClick={signOut}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Info({ icon, label, value, valueClass = 'text-ink' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return <div className="flex items-start gap-3">{icon}<div><p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p><p className={`mt-1 break-all text-sm font-medium ${valueClass}`}>{value}</p></div></div>
}
