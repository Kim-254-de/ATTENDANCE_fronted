import { Download } from 'lucide-react'
import { env } from '@/lib/env'

type Params = Record<string, string | boolean | undefined>

/**
 * A plain URL, not a mutation — same as the lecturer's session export: the
 * browser's own navigation downloads it using the backend's
 * Content-Disposition header, with the session cookie attached. Every QA
 * export takes the same filters as the list it exports, so they pass straight
 * through; empty ones are dropped rather than sent as `?status=`, which the
 * backend's strict query schemas would refuse.
 */
function qaExportUrl(path: string, params: Params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return `${env.apiUrl}/quality-assurance/${path}${qs ? `?${qs}` : ''}`
}

/** CSV + PDF download links for one export, e.g. `basePath="audits/export"` → `audits/export.csv` and `.pdf`. */
export function ExportLinks({ basePath, params, label }: { basePath: string; params?: Params; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Export ${label}`}>
      {(['csv', 'pdf'] as const).map((format) => (
        <a
          key={format}
          href={qaExportUrl(`${basePath}.${format}`, params)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-navy-900 transition hover:bg-surface"
        >
          <Download className="size-4" aria-hidden /> {format.toUpperCase()}
        </a>
      ))}
    </div>
  )
}
