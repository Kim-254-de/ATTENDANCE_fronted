import { Check, GraduationCap, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'

const benefits = [
  'Live ERP data synchronisation',
  'QR-based attendance sessions',
  'Student performance analytics',
]

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(380px,44%)_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-900 px-10 py-12 text-white lg:flex lg:min-h-dvh lg:flex-col xl:px-14">
        <div className="pointer-events-none absolute -right-28 -top-24 size-80 rounded-full border-[32px] border-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 -left-24 size-72 rounded-full bg-navy-800/80" aria-hidden />
        <div className="pointer-events-none absolute bottom-28 right-[-2rem] size-48 rounded-full bg-navy-800/70" aria-hidden />
        <Brand />
        <div className="relative mt-auto max-w-lg pb-10 pt-24">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-sky-300">LECTURER PORTAL</p>
          <h2 className="max-w-md text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">Join the Academic Portal</h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">Register to access QR attendance tracking, student management, ERP sync, and your full course portfolio in one place.</p>
          <ul className="mt-10 space-y-5">
            {benefits.map((benefit) => <li key={benefit} className="flex items-center gap-3 text-base text-blue-50"><span className="grid size-7 place-items-center rounded-full bg-gold-500/25 text-gold-500"><Check className="size-4" strokeWidth={3} aria-hidden /></span>{benefit}</li>)}
          </ul>
        </div>
        <div className="relative mt-auto flex items-center gap-2 text-sm text-emerald-300"><span className="size-2 rounded-full bg-emerald-400" aria-hidden /> ERP System Online</div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="absolute right-5 top-5 text-navy-900/70 sm:right-8 sm:top-8"><HelpCircle className="size-6" aria-hidden /></div>
        <div className="w-full max-w-xl">
          <div className="mb-8 lg:hidden"><Brand dark /></div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">{title}</h1>
            {subtitle && <div className="mt-3 text-base text-muted">{subtitle}</div>}
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <div className={`relative flex items-center gap-3 ${dark ? 'text-navy-900' : 'text-white'}`}><span className="grid size-12 place-items-center rounded-xl bg-gold-500 shadow-[0_8px_18px_rgba(201,151,28,0.25)]"><GraduationCap className="size-6 text-white" aria-hidden /></span><div className="leading-tight"><p className="text-xl font-bold tracking-tight">UniLearn ERP</p><p className={`text-sm ${dark ? 'text-muted' : 'text-blue-200'}`}>Lecturer Portal</p></div></div>
}
