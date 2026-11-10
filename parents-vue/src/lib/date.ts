export const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n
}
export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}
export function round1(v: number): number {
  return Math.round(v * 10) / 10
}
export function sum(a: number[]): number {
  return a.reduce((x, y) => x + y, 0)
}
export function avg(a: number[]): number {
  return a.length ? sum(a) / a.length : 0
}
export function fmtNum(v: number | null | undefined, d = 1): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const m = Math.pow(10, d)
  return String(Math.round(v * m) / m)
}
export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return Math.round(v * 1000) / 10 + '%'
}
export function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

export function todayStr(d?: Date): string {
  const x = d || new Date()
  return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate())
}
export function parseDate(s?: string | null): Date | null {
  if (!s) return null
  const p = String(s).split(/[-/.]/)
  if (p.length < 3) return null
  return new Date(+p[0], +p[1] - 1, +p[2])
}
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
export function addDays(ds: string, n: number): string {
  const d = parseDate(ds) as Date
  d.setDate(d.getDate() + n)
  return todayStr(d)
}
export function dow7(d: Date): number {
  const x = d.getDay()
  return x === 0 ? 7 : x
}
export function dowOf(ds: string): number {
  return dow7(parseDate(ds) as Date)
}
export function timeMin(t?: string): number {
  const p = String(t || '').split(':')
  return (+p[0] || 0) * 60 + (+p[1] || 0)
}
export function nowMin(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
export function mondayOf(ds: string): string {
  return addDays(ds, 1 - dowOf(ds))
}
export function fmtMD(s?: string): string {
  const d = parseDate(s)
  return d ? d.getMonth() + 1 + '月' + d.getDate() + '日' : ''
}
export function fmtShort(s?: string): string {
  const d = parseDate(s)
  return d ? pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : ''
}
export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}
export function dayLabel(ds: string): string {
  const t = todayStr()
  const d = parseDate(ds) as Date
  if (ds === t) return '今天'
  if (ds === addDays(t, 1)) return '明天'
  if (ds === addDays(t, -1)) return '昨天'
  if (ds === addDays(t, 2)) return '后天'
  const diff = daysBetween(parseDate(t) as Date, d)
  return (Math.abs(diff) <= 6 ? '' : fmtMD(ds) + ' ') + '周' + WEEK[d.getDay()]
}
/** 一天中的时段：day / dusk / night */
export function tod(): 'day' | 'dusk' | 'night' {
  const h = new Date().getHours()
  return h >= 19 || h < 6 ? 'night' : h >= 17 ? 'dusk' : 'day'
}

let seq = 0
export function uid(p = 'id'): string {
  seq = (seq + 1) % 1296
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + seq.toString(36)
}
export function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
