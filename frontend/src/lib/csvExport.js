// src/lib/csvExport.js
// Client-side CSV generation — no backend needed

/**
 * Download a CSV file from rows data.
 * @param {string[][]} rows  - First row should be headers
 * @param {string}     filename - e.g. 'expenses-2025-01.csv'
 */
export function downloadCsv(rows, filename) {
  const csv  = rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Format a date string to YYYY-MM-DD */
export function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-CA') } // en-CA = YYYY-MM-DD
  catch { return String(d) }
}