/** 下载 / 剪贴板 / CSV 工具 */
import { useUi } from '@/stores/ui'

export function downloadFile(name: string, content: Blob | string, type?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

export async function copyText(t: string) {
  const ui = useUi()
  const fallback = () => {
    const ta = document.createElement('textarea')
    ta.value = t
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      ui.toast('已复制')
    } catch {
      ui.toast('复制失败，请手动选择复制')
    }
    ta.remove()
  }
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(t)
      ui.toast('已复制')
    } catch {
      fallback()
    }
  } else fallback()
}

export function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
export function toCSV(rows: unknown[][]): string {
  return '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/** 支持 Excel 粘贴（Tab 分隔）与 CSV，正确处理引号与换行 */
export function parseTable(text: string, keepEmpty = false): string[][] {
  const src = String(text || '')
    .replace(/^\ufeff/, '')
    .replace(/\r\n?/g, '\n')
  const d = src.indexOf('\t') >= 0 ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += ch
      continue
    }
    if (ch === '"' && cur.trim() === '') {
      q = true
      cur = ''
      continue
    }
    if (ch === d) {
      row.push(cur.trim())
      cur = ''
      continue
    }
    if (ch === '\n') {
      row.push(cur.trim())
      rows.push(row)
      row = []
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur !== '' || row.length) {
    row.push(cur.trim())
    rows.push(row)
  }
  const blank = (r: string[]) => r.every((c) => c === '')
  while (rows.length && blank(rows[rows.length - 1])) rows.pop()
  return keepEmpty ? rows : rows.filter((r) => !blank(r))
}
