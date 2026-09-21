import clsx from 'clsx'

export const Skeleton = ({ className }: { className?: string }) => (
  <div aria-hidden className={clsx('animate-pulse rounded-xl bg-line', className)} />
)
