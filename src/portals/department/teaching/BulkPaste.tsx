import { Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/lib/api'
import { readSpreadsheet, type BulkResult } from './teachingApi'
import { Dialog } from './ui'

export interface BulkColumn {
  key: string
  label: string
  example: string
  required?: boolean
  hint?: string
}

interface Sheet {
  name: string
  rows: string[][]
}

/** "Staff number" and "staff_number" both name the staff_number column. */
const headerKey = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function namedColumns(row: string[], columns: BulkColumn[]): number {
  const names = new Set(columns.flatMap((c) => [c.key, headerKey(c.label)]))
  return new Set(row.map(headerKey).filter((h) => names.has(h))).size
}

/**
 * The header row of a prepared sheet: the row naming the most of our columns,
 * so title rows above it ("DEPARTMENT OF …") are skipped. -1 when none does.
 */
function headerRow(rows: string[][], columns: BulkColumn[]): number {
  let best = -1
  let bestScore = 0
  rows.forEach((row, i) => {
    const score = namedColumns(row, columns)
    if (score > bestScore) { best = i; bestScore = score }
  })
  return best
}

const sheetText = (sheet: Sheet, columns: BulkColumn[]) =>
  sheet.rows.slice(Math.max(headerRow(sheet.rows, columns), 0)).map((r) => r.join('\t')).join('\n')

function bestSheet(sheets: Sheet[], columns: BulkColumn[]): number {
  const score = (s: Sheet) => {
    const i = headerRow(s.rows, columns)
    return i < 0 ? 0 : namedColumns(s.rows[i]!, columns)
  }
  return sheets.reduce((best, s, i) => (score(s) > score(sheets[best]!) ? i : best), 0)
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Splits text pasted from Excel (tab-separated) or a CSV file (comma-separated,
 * double quotes allowed) into rows keyed by the header row's column names.
 */
function parseTable(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) return []
  const delimiter = lines[0]!.includes('\t') ? '\t' : ','
  const split = (line: string): string[] => {
    if (delimiter === '\t') return line.split('\t')
    const out: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++ }
        else if (ch === '"') quoted = false
        else cell += ch
      } else if (ch === '"') quoted = true
      else if (ch === ',') { out.push(cell); cell = '' }
      else cell += ch
    }
    out.push(cell)
    return out
  }
  const header = split(lines[0]!).map(headerKey)
  return lines.slice(1).map((line) => {
    const cells = split(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => { if (h) row[h] = (cells[i] ?? '').trim() })
    return row
  })
}

function templateCsv(columns: BulkColumn[]): string {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return [columns.map((c) => quote(c.label)).join(','), columns.map((c) => quote(c.example)).join(',')].join('\n') + '\n'
}

function downloadText(filename: string, text: string) {
  // The byte-order mark makes Excel read the file as UTF-8.
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * "Paste from Excel": open a prepared Excel workbook or a CSV, or copy a block
 * of cells (with its header row) from Excel or the Word form and paste it here,
 * and every line is added or updated. Bad lines are listed by number and skipped.
 */
export function BulkPaste({ title, columns, templateName, submit, onClose }: {
  title: string
  columns: BulkColumn[]
  templateName: string
  submit: (rows: Record<string, string>[]) => Promise<BulkResult>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<BulkResult | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [reading, setReading] = useState(false)
  const rows = parseTable(text)

  const send = async () => {
    setBusy(true)
    setFailure(null)
    try {
      setResult(await submit(rows))
    } catch (err) {
      setFailure(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const showSheet = (all: Sheet[], index: number) => {
    setSheetIndex(index)
    setText(sheetText(all[index]!, columns))
    setResult(null)
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setFailure(null)
    setResult(null)
    setSheets([])
    const name = file.name.toLowerCase()
    if (name.endsWith('.xls')) {
      setFailure('This is an old Excel file (.xls). In Excel, use File > Save As > Excel Workbook (.xlsx), then open that.')
      return
    }
    if (!name.endsWith('.xlsx') && file.type !== XLSX_TYPE) {
      setText(await file.text())
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFailure('The workbook is larger than 5 MB. Keep only the sheet you need.')
      return
    }
    setReading(true)
    try {
      const read = await readSpreadsheet(file)
      setSheets(read)
      showSheet(read, bestSheet(read, columns))
    } catch (err) {
      setFailure(errorMessage(err))
    } finally {
      setReading(false)
    }
  }
  const header = headerRow(sheets[sheetIndex]?.rows ?? [], columns)

  return (
    <Dialog title={title} onClose={onClose} wide>
      <p className="text-sm text-muted">
        Open a prepared Excel workbook (.xlsx) or CSV file, or copy the cells from Excel <b>including the header row</b> and
        paste them below. Existing rows are updated; new ones are added.
      </p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-muted">
            <tr>{columns.map((c) => <th key={c.key} className="px-2 py-1 font-medium">{c.label}{c.required ? ' *' : ''}</th>)}</tr>
          </thead>
          <tbody>
            <tr>{columns.map((c) => <td key={c.key} className="px-2 py-1 text-muted">{c.example}</td>)}</tr>
          </tbody>
        </table>
      </div>
      {columns.some((c) => c.hint) && (
        <ul className="list-disc pl-5 text-xs text-muted">
          {columns.filter((c) => c.hint).map((c) => <li key={c.key}><b>{c.label}:</b> {c.hint}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={() => downloadText(templateName, templateCsv(columns))} className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-ink">
          <Download className="size-4" aria-hidden /> Download the template (opens in Excel)
        </button>
        <label className="cursor-pointer rounded-xl border border-brand-ink px-3 py-1.5 font-semibold text-brand-ink">
          {reading ? 'Reading…' : 'Open an Excel or CSV file'}
          <input type="file" accept={`.xlsx,.csv,${XLSX_TYPE},text/csv,text/plain`} className="sr-only" disabled={reading}
            onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      {sheets.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {sheets.length > 1 && (
            <label className="flex items-center gap-2">
              Sheet
              <select value={sheetIndex} onChange={(e) => showSheet(sheets, Number(e.target.value))} className="input w-auto">
                {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
              </select>
            </label>
          )}
          {header < 0 ? (
            <span className="text-warning">No row in this sheet has our column headings. Rename the header cells to match the table above, then open it again.</span>
          ) : (
            <span className="text-muted">
              {header > 0 ? `Started at the heading row; ${header} title row${header > 1 ? 's' : ''} above it left out. ` : ''}
              Check the rows below, then save.
            </span>
          )}
        </div>
      )}
      <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null) }} rows={10} aria-label="Pasted rows"
        placeholder={columns.map((c) => c.label).join('\t')}
        className="w-full rounded-xl border border-line bg-card px-3 py-2 font-mono text-xs text-ink" />
      <p className="text-xs text-muted">{rows.length} rows read.</p>
      {failure && <p role="alert" className="text-sm text-danger">{failure}</p>}
      {result && (
        <div className="rounded-xl bg-surface p-3 text-sm" role="status">
          <p className="text-success">{result.message ?? `${result.created} added, ${result.updated} updated.`}</p>
          {result.errorCount > 0 && (
            <>
              <p className="text-danger">{result.errorCount} rows skipped:</p>
              <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-danger">
                {result.errors.map((e) => <li key={e.line}>Row {e.line}: {e.message}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        <Button type="button" onClick={() => void send()} disabled={!rows.length} loading={busy}>Save {rows.length} rows</Button>
      </div>
    </Dialog>
  )
}
