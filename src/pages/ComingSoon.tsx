import { Card } from '@/components/ui/Card'

export function ComingSoon({ name }: { name: string }) {
  return (
    <Card className="p-10 text-center">
      <h2 className="text-lg font-semibold text-navy-900">{name}</h2>
      <p className="mt-1 text-sm text-muted">This section is planned for the next milestone.</p>
    </Card>
  )
}
