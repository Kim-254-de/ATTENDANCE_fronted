import type { ReactNode } from 'react'

export function AuthShell({ title, subtitle, children, hero = false }: { title: string; subtitle?: ReactNode; children: ReactNode; hero?: boolean }) {
  return (
    <main className={hero ? 'min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(380px,44%)_1fr]' : 'min-h-dvh bg-surface flex items-center justify-center'}>
      {hero && (
        <section className="relative hidden overflow-hidden bg-navy-900 px-10 py-12 text-white lg:flex lg:min-h-dvh lg:flex-col xl:px-14">
          <div className="pointer-events-none absolute -right-28 -top-24 size-80 rounded-full border-[32px] border-white/5" aria-hidden />
          <div className="pointer-events-none absolute -bottom-28 -left-24 size-72 rounded-full bg-navy-800/80" aria-hidden />
          <div className="pointer-events-none absolute bottom-28 right-[-2rem] size-48 rounded-full bg-navy-800/70" aria-hidden />
        </section>
      )}

      <section className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="auth-card-in w-full max-w-xl">
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
