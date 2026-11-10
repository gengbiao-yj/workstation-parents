import {
  BDAY_COLOR,
  DIM,
  EVT,
  MOODS,
  REL,
  STAGE,
  type StageDef
} from '@/data/constants'
import type {
  AbilityRecord,
  AppState,
  Book,
  Ev,
  Exam,
  GrowthRecord,
  Habit,
  JournalEntry,
  Kid,
  Occurrence,
  Person,
  Skill,
  StageId
} from '@/types'
import {
  addDays,
  daysBetween,
  dowOf,
  fmtMD,
  mondayOf,
  nowMin,
  pad2,
  parseDate,
  round1,
  timeMin,
  todayStr
} from './date'

export function stageOf(k?: Kid | null): StageDef {
  return STAGE[(k && k.stage) || 'p1'] || STAGE.p1
}
export function isYoung(k?: Kid | null): boolean {
  return !!k && (k.stage === 'k' || k.stage === 'p1')
}

/* ---------------- 孩子 ---------------- */
export function kidById(s: AppState, id: string): Kid | null {
  return s.kids.find((k) => k.id === id) || null
}
export function ageOf(bd?: string | null, at?: string): { y: number; m: number } | null {
  const b = parseDate(bd)
  if (!b) return null
  const n = at ? (parseDate(at) as Date) : new Date()
  let y = n.getFullYear() - b.getFullYear()
  let m = n.getMonth() - b.getMonth()
  if (n.getDate() < b.getDate()) m--
  if (m < 0) {
    y--
    m += 12
  }
  return { y, m }
}
export function ageText(k?: Kid | null): string {
  const a = ageOf(k && k.birthday)
  if (!a) return ''
  return a.y + ' 岁' + (a.y < 12 && a.m ? ' ' + a.m + ' 个月' : '')
}
export function mdOf(bd?: string | null): string {
  if (!bd) return ''
  const p = String(bd).split(/[-/.]/)
  if (p.length === 3) return pad2(+p[1]) + '-' + pad2(+p[2])
  if (p.length === 2) return pad2(+p[0]) + '-' + pad2(+p[1])
  return ''
}
export function nextBday(bd?: string | null): { date: string; days: number } | null {
  const md = mdOf(bd)
  if (!md) return null
  const n = new Date()
  const t = todayStr(n)
  const y = n.getFullYear()
  let ds = y + '-' + md
  const d = parseDate(ds)
  if (!d || d.getMonth() + 1 !== +md.slice(0, 2)) ds = y + '-02-28'
  if (ds < t) ds = y + 1 + '-' + md
  return { date: ds, days: daysBetween(parseDate(t) as Date, parseDate(ds) as Date) }
}
export function bdayAge(bd: string | undefined, onDate: string): number | null {
  const p = String(bd || '').split('-')
  if (p.length !== 3 || !(+p[0] > 1900)) return null
  return +onDate.slice(0, 4) - +p[0]
}

/* ---------------- 打卡 ---------------- */
export function habitsOf(s: AppState, kid: string, dim?: string, all = false): Habit[] {
  return s.habits.filter((h) => h.kid === kid && (all || h.on) && (!dim || h.dim === dim))
}
export function habitById(s: AppState, id: string): Habit | null {
  return s.habits.find((h) => h.id === id) || null
}
export function dueOn(h: Habit, ds: string): boolean {
  return h.on && h.days.indexOf(dowOf(ds)) >= 0 && (!h.since || ds >= h.since)
}
export function checkVal(s: AppState, kid: string, ds: string, hid: string): true | number | undefined {
  const a = s.checks[kid]
  const b = a && a[ds]
  return b ? b[hid] : undefined
}
export function isDone(h: Habit, v: true | number | undefined | null | false): boolean {
  if (v === undefined || v === null || v === false) return false
  if (!h.unit) return !!v
  return +v >= h.target
}
export function habitText(h: Habit): string {
  return h.unit ? h.name + ' ' + h.target + ' ' + h.unit : h.name
}
export interface DayStat {
  due: Habit[]
  n: number
  done: number
  rate: number | null
}
export function dayStats(s: AppState, kid: string, ds: string, dim?: string): DayStat {
  const due = habitsOf(s, kid, dim).filter((h) => dueOn(h, ds))
  let done = 0
  due.forEach((h) => {
    if (isDone(h, checkVal(s, kid, ds, h.id))) done++
  })
  return { due, n: due.length, done, rate: due.length ? done / due.length : null }
}
export function rangeStats(s: AppState, kid: string, from: string, to: string, dim?: string) {
  let n = 0
  let done = 0
  for (let ds = from; ds <= to; ds = addDays(ds, 1)) {
    const r = dayStats(s, kid, ds, dim)
    n += r.n
    done += r.done
  }
  return { n, done, rate: n ? done / n : null }
}
export function weekStats(s: AppState, kid: string, ds?: string, dim?: string) {
  const m = mondayOf(ds || todayStr())
  let e = addDays(m, 6)
  const t = todayStr()
  if (e > t && m <= t) e = t
  return rangeStats(s, kid, m, e, dim)
}
export function streakOf(s: AppState, kid: string, hid: string): number {
  const h = habitById(s, hid)
  if (!h) return 0
  let n = 0
  let ds = todayStr()
  if (dueOn(h, ds) && !isDone(h, checkVal(s, kid, ds, hid))) ds = addDays(ds, -1)
  for (let i = 0; i < 400; i++) {
    if (dueOn(h, ds)) {
      if (isDone(h, checkVal(s, kid, ds, hid))) n++
      else break
    }
    ds = addDays(ds, -1)
  }
  return n
}
export function dayTotal(s: AppState, kid: string, ds: string): number {
  const b = s.checks[kid] && s.checks[kid][ds]
  if (!b) return 0
  let n = 0
  Object.keys(b).forEach((k) => {
    const h = habitById(s, k)
    if (h && isDone(h, b[k])) n++
  })
  return n
}
export function readMinutes(s: AppState, kid: string, from: string, to: string): number {
  const hs = s.habits.filter((h) => h.kid === kid && h.kind === 'read')
  let m = 0
  for (let ds = from; ds <= to; ds = addDays(ds, 1)) {
    hs.forEach((h) => {
      const v = checkVal(s, kid, ds, h.id)
      if (v) m += h.unit === '分钟' ? (v === true ? h.target : +v) : 0
    })
  }
  return m
}

/* ---------------- 日程 ---------------- */
export function evById(s: AppState, id: string): Ev | null {
  return s.events.find((e) => e.id === id) || null
}
export function evFor(e: Ev, kid?: string): boolean {
  return !e.kid || e.kid === kid || !kid
}
export function evOn(e: Ev, ds: string): boolean {
  if (e.skip[ds]) return false
  if (e.repeat === 'weekly') return ds >= e.date && (!e.until || ds <= e.until) && dowOf(ds) === dowOf(e.date)
  if (e.repeat === 'daily') return ds >= e.date && (!e.until || ds <= e.until)
  if (e.end && e.end > e.date) return ds >= e.date && ds <= e.end
  return e.date === ds
}
export function occOn(s: AppState, ds: string, kid?: string, opt?: { nobd?: boolean }): Occurrence[] {
  const o = opt || {}
  const out: Occurrence[] = []
  s.events.forEach((e) => {
    if (evFor(e, kid) && evOn(e, ds)) {
      out.push({
        ev: e,
        ds,
        start: e.start || '',
        endT: e.endT || '',
        done: !!e.done[ds],
        color: EVT[e.type].color,
        title: e.title,
        type: e.type
      })
    }
  })
  if (!o.nobd) {
    const md = ds.slice(5)
    s.people.forEach((p) => {
      if ((!kid || p.kid === kid) && p.birthday && mdOf(p.birthday) === md) {
        out.push({ bday: p, ds, start: '', title: p.name + ' 生日', type: 'bday', color: BDAY_COLOR, done: !!p.greeted[ds.slice(0, 4)] })
      }
    })
    s.kids.forEach((k) => {
      if (k.birthday && mdOf(k.birthday) === md) out.push({ kidBday: k, ds, start: '', title: k.name + ' 生日', type: 'bday', color: BDAY_COLOR })
    })
  }
  out.sort((a, b) => ((a.start || '00:00') < (b.start || '00:00') ? -1 : (a.start || '00:00') > (b.start || '00:00') ? 1 : 0))
  return out
}
export type OccState = 'past' | 'future' | 'now' | 'all'
export function occState(o: Occurrence): OccState {
  const t = todayStr()
  if (o.ds < t) return 'past'
  if (o.ds > t) return 'future'
  if (!o.start) return o.done ? 'past' : 'all'
  const n = nowMin()
  const s = timeMin(o.start)
  const e = o.endT ? timeMin(o.endT) : s + 60
  if (n >= e) return 'past'
  if (n >= s) return 'now'
  return 'future'
}
export function upcoming(s: AppState, kid: string, days = 30, types?: string[]): Occurrence[] {
  const out: Occurrence[] = []
  const t = todayStr()
  for (let i = 0; i < days; i++) {
    const ds = addDays(t, i)
    occOn(s, ds, kid).forEach((o) => {
      if (!types || types.indexOf(o.type) >= 0) {
        if (i === 0 && occState(o) === 'past' && o.type !== 'bday') return
        out.push(o)
      }
    })
  }
  return out
}
export function nextOuting(s: AppState, kid: string): Occurrence | null {
  const l = upcoming(s, kid, 60, ['outing'])
  return l.length ? l[0] : null
}

/* ---------------- 关系网 ---------------- */
export function peopleOf(s: AppState, kid: string): Person[] {
  return s.people.filter((p) => p.kid === kid)
}
export function personById(s: AppState, id: string): Person | null {
  return s.people.find((p) => p.id === id) || null
}
export function bdaysOf(s: AppState, kid: string, days = 30) {
  const out: { p: Person; date: string; days: number; age: number | null; greeted: boolean }[] = []
  peopleOf(s, kid).forEach((p) => {
    const nb = nextBday(p.birthday)
    if (nb && nb.days <= days) {
      out.push({ p, date: nb.date, days: nb.days, age: bdayAge(p.birthday, nb.date), greeted: !!p.greeted[nb.date.slice(0, 4)] })
    }
  })
  return out.sort((a, b) => a.days - b.days)
}
export function isAdultRel(p: Person): boolean {
  return (
    p.rel === 'teacher' ||
    p.rel === 'coach' ||
    (p.rel === 'family' && !/哥|姐|弟|妹/.test(p.label || '')) ||
    (p.rel === 'neighbor' && !!p.adult)
  )
}

/* ---------------- 成长记录 ---------------- */
export function growthOf(s: AppState, kid: string): GrowthRecord[] {
  return s.growth.filter((g) => g.kid === kid).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
export function latestGrowth(s: AppState, kid: string, field?: 'h' | 'w' | 'vl'): GrowthRecord | null {
  const l = growthOf(s, kid).filter((g) => (field ? (g[field] as number) > 0 : true))
  return l.length ? l[l.length - 1] : null
}
export function yearGain(s: AppState, kid: string) {
  const l = growthOf(s, kid).filter((g) => g.h > 0)
  if (l.length < 2) return null
  const last = l[l.length - 1]
  let best: { g: GrowthRecord; d: number } | null = null
  l.forEach((g) => {
    const d = daysBetween(parseDate(g.date) as Date, parseDate(last.date) as Date)
    if (d >= 150 && (!best || Math.abs(d - 365) < Math.abs(best.d - 365))) best = { g, d }
  })
  if (!best) return null
  const b = best as { g: GrowthRecord; d: number }
  return { cm: round1(last.h - b.g.h), per: round1(((last.h - b.g.h) / b.d) * 365), days: b.d }
}
export function journalOf(s: AppState, kid: string): JournalEntry[] {
  return s.journal
    .filter((j) => j.kid === kid)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.t || 0) - (a.t || 0)))
}
export function latestMood(s: AppState, kid: string): JournalEntry | null {
  const j = journalOf(s, kid).filter((x) => x.mood)
  return j.length ? j[0] : null
}
export function moodOf(id?: string) {
  return MOODS.find((m) => m.id === id) || null
}

/* ---------------- 技能 / 学习力 / 阅读 / 成绩 ---------------- */
export function skillsOf(s: AppState, kid: string): Skill[] {
  return s.skills.filter((k) => k.kid === kid)
}
export function skillById(s: AppState, id: string): Skill | null {
  return s.skills.find((k) => k.id === id) || null
}
export function skillProg(k: Skill) {
  const n = k.steps.length
  const d = k.steps.filter((x) => x.done).length
  let cur: { i: number; s: { t: string; done: string } } | null = null
  for (let i = 0; i < n; i++) {
    if (!k.steps[i].done) {
      cur = { i, s: k.steps[i] }
      break
    }
  }
  return { n, done: d, rate: n ? d / n : 0, cur, finished: n > 0 && d === n }
}
export function abilitiesOf(s: AppState, kid: string): AbilityRecord[] {
  return s.abilities.filter((a) => a.kid === kid).sort((a, b) => (a.month < b.month ? -1 : 1))
}
export function booksOf(s: AppState, kid: string): Book[] {
  return s.books.filter((b) => b.kid === kid)
}
export function examsOf(s: AppState, kid: string): Exam[] {
  return s.exams.filter((e) => e.kid === kid).sort((a, b) => (a.date < b.date ? -1 : 1))
}

/* ---------------- 孩子此刻在哪个房间 ---------------- */
export function kidRoomNow(s: AppState, k?: Kid | null): string {
  if (!k) return 'living'
  const t = todayStr()
  const n = nowMin()
  const st = stageOf(k)
  const cur = occOn(s, t, k.id, { nobd: true }).filter((o) => occState(o) === 'now')[0]
  if (cur) {
    const m: Record<string, string> = { study: 'study', sport: 'sport', class: 'art', family: 'living', outing: 'living', health: 'bedroom', school: 'study' }
    return m[cur.type] || 'living'
  }
  if (n >= timeMin(st.bed) || n < 6 * 60 + 30) return 'bedroom'
  if (n < 8 * 60) return 'kitchen'
  if (n >= 17 * 60 + 30 && n < 18 * 60 + 30) return 'kitchen'
  const ds = dayStats(s, k.id, t)
  const next = ds.due.filter((h) => !isDone(h, checkVal(s, k.id, t, h.id)))[0]
  if (next) return DIM[next.dim].room
  return 'living'
}

/* ---------------- 小工具 ---------------- */
export function dimOf(id?: string) {
  return DIM[id || ''] || DIM.de
}
export function relOf(id?: string) {
  return REL[id || 'friend'] || REL.friend
}
export function evTypeOf(id?: string) {
  return EVT[id || 'other'] || EVT.other
}
export function stageName(id?: StageId): string {
  return (STAGE[id || 'p1'] || STAGE.p1).name
}
export function mdLabel(bd?: string): string {
  return mdOf(bd) ? fmtMD(bd) : ''
}
