import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={clsx('rounded-2xl bg-white shadow-[0_1px_3px_rgba(18,48,95,0.08)]', className)} />
}
