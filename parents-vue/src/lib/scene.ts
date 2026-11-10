import { home } from '@/art/home'
import { DIMS, DIM, ROOM_DIM } from '@/data/constants'
import { bdaysOf, dayStats, isDone, checkVal, latestGrowth, growthOf, ageOf, journalOf, booksOf, skillsOf, skillProg, weekStats, occOn, occState, kidRoomNow, isYoung, stageOf, nextBday, nextOuting, readMinutes } from './query'
import { addDays, daysBetween, dowOf, fmtShort, nowMin, pad2, parseDate, todayStr, WEEK } from './date'

function clipText(s: unknown, n: number): string {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
import type { AppState, Kid } from '@/types'

export const SPOTS: Record<string, number[][]> = {
  study: [[318, 352], [160, 440], [440, 390]],
  living: [[690, 356], [600, 420], [880, 352]],
  art: [[1346, 356], [1250, 300], [1540, 372]],
  sport: [[238, 872], [130, 720], [446, 744]],
  kitchen: [[612, 742], [960, 720], [1000, 880]],
  bedroom: [[1298, 856], [1230, 740], [1390, 720]]
}

export const HOME_MODES = [
  { id: 'today', t: '今日' },
  { id: 'week', t: '本周五育' },
  { id: 'night', t: '睡前小结' }
]

export interface SceneCtx {
  mode: 'today' | 'week' | 'night'
  kidRoom: Record<string, string>
  kidSpot: Record<string, number>
  parentAt: Record<number, number[]>
  tod: 'day' | 'dusk' | 'night'
  kidHex: (k?: Kid | null) => string
}

export function homeKids(s: AppState, ctx: SceneCtx, cur: Kid | null) {
  if (!cur) return []
  const list = [cur].concat(s.kids.filter((k) => k !== cur).slice(0, 2))
  const used: Record<string, number> = {}
  return list.map((k, i) => {
    const room = ctx.mode === 'night' ? 'bedroom' : ctx.kidRoom[k.id] || kidRoomNow(s, k)
    if (ctx.mode !== 'night') ctx.kidRoom[k.id] = room
    let idx = ctx.kidSpot[k.id] || 0
    if (i > 0 && used[room] !== undefined && idx === used[room]) idx = (idx + 1) % 3
    used[room] = idx
    const sp = SPOTS[room][idx]
    return { id: k.id, name: k.name, gender: k.gender, color: k.color, colorHex: ctx.kidHex(k), stage: k.stage, room, active: i === 0, at: sp }
  })
}

export function homeParents(s: AppState, ctx: SceneCtx) {
  const st = s.settings
  const n = nowMin()
  const cook = (n >= 17 * 60 + 20 && n < 18 * 60 + 30) || (n >= 6 * 60 + 40 && n < 7 * 60 + 40)
  const out: any[] = [{ gender: st.parent.gender, name: st.parent.name, at: ctx.parentAt[0] || (cook ? [748, 716] : [944, 360]) }]
  if (st.partner.show) out.push({ gender: st.partner.gender, name: st.partner.name, at: ctx.parentAt[1] || [1012, 344] })
  return out
}

export function screenData(s: AppState, k: Kid) {
  const t = todayStr()
  const d = new Date()
  const occ = occOn(s, t, k.id).filter((o) => o.type !== 'bday')
  const o: any = {
    title: d.getMonth() + 1 + '月' + d.getDate() + '日 周' + WEEK[d.getDay()],
    sub: k.name + ' · 今天 ' + occ.length + ' 项',
    items: occ.map((x) => ({ time: x.start, t: x.title, color: x.color, st: occState(x), done: x.done })),
    empty: '今天没有安排，' + (isYoung(k) ? '一起玩点什么吧' : '留点自由时间吧')
  }
  const bd = bdaysOf(s, k.id, 7).filter((b) => !b.greeted)[0]
  const out = nextOuting(s, k.id)
  const kb = nextBday(k.birthday)
  if (kb && kb.days <= 7) {
    o.countLabel = kb.days ? '距 ' + k.name + ' 生日' : k.name + ' 今天生日'
    o.countNum = kb.days
    o.countUnit = kb.days ? '天' : '生日快乐'
    if (!kb.days) o.countNum = '今天'
  } else if (bd && bd.days <= 3) {
    o.countLabel = '距 ' + bd.p.name + ' 生日'
    o.countNum = bd.days === 0 ? '今天' : bd.days
    o.countUnit = '天 · 记得提醒' + k.name + '祝贺'
    if (bd.days === 0) o.countUnit = '提醒' + k.name + '去祝贺'
  } else if (out) {
    const dd = daysBetween(parseDate(t) as Date, parseDate(out.ds) as Date)
    o.countLabel = (dd ? '距 ' : '') + clipText(out.title, 8) + (dd ? '' : ' · 今天')
    o.countNum = dd || out.start || '今天'
    o.countUnit = dd ? '天' : occState(out) === 'now' ? '玩得开心' : '记得带好东西'
  } else {
    const wd = dowOf(t)
    o.countLabel = wd >= 6 ? '周末快乐' : '距 周末'
    o.countNum = wd >= 6 ? '周末' : 6 - wd
    o.countUnit = wd >= 6 ? '一起出去走走吧' : '天'
  }
  return o
}

export function sceneData(s: AppState, ctx: SceneCtx) {
  const k = s.kids.find((x) => x.id === s.settings.cur) || s.kids[0]
  const t = todayStr()
  if (!k) return { kids: [], parents: [], rooms: {}, tod: 'day', mode: 'today' }
  const d: any = {
    kids: homeKids(s, ctx, k),
    parents: homeParents(s, ctx),
    rooms: {},
    tod: ctx.mode === 'night' ? 'night' : ctx.tod,
    mode: ctx.mode === 'week' ? 'week' : 'today',
    accent: ctx.kidHex(k),
    young: isYoung(k),
    cat: s.settings.cat !== false
  }
  ;['living', 'study', 'sport', 'art', 'kitchen'].forEach((room) => {
    const dim = ROOM_DIM[room as keyof typeof ROOM_DIM]
    const ds = dayStats(s, k.id, t, dim)
    const ws = weekStats(s, k.id, t, dim)
    d.rooms[room] = { prog: ds.n ? ds.done + '/' + ds.n : '', done: ds.n > 0 && ds.done === ds.n, rate: ws.rate, sub: '本周 ' + ws.done + '/' + ws.n }
  })
  const lg = latestGrowth(s, k.id, 'h')
  d.rooms.bedroom = { prog: lg ? lg.h + 'cm' : '' }
  d.screen = screenData(s, k)
  const cork: any[] = []
  occOn(s, t, k.id, { nobd: true })
    .filter((o) => o.type === 'study')
    .forEach((o) => {
      cork.push({ t: o.title, sub: o.start || '', done: o.done })
    })
  dayStats(s, k.id, t, 'zhi').due.forEach((h) => {
    if (cork.length < 4) cork.push({ t: h.name, sub: h.unit ? h.target + ' ' + h.unit : '', done: isDone(h, checkVal(s, k.id, t, h.id)) })
  })
  d.cork = { title: '今日学习', prog: cork.length ? cork.filter((c) => c.done).length + '/' + cork.length : '', lines: cork, empty: '今天没有学习计划' }
  const lao = dayStats(s, k.id, t, 'lao')
  d.fridge = {
    title: '今日家务',
    prog: lao.n ? lao.done + '/' + lao.n : '',
    lines: lao.due.map((h) => ({ t: h.name, done: isDone(h, checkVal(s, k.id, t, h.id)) })),
    empty: '今天休息一下'
  }
  const gr = growthOf(s, k.id).filter((g) => g.h > 0)
  const cur = gr.length ? gr[gr.length - 1] : null
  const lo = cur ? Math.max(40, Math.floor(cur.h / 10) * 10 - 60) : 60
  const marks: any[] = []
  let lastY: number | null = null
  gr.slice(-4).forEach((g, i, arr) => {
    const isCur = i === arr.length - 1
    const a = ageOf(k.birthday, g.date)
    if (!isCur && lastY !== null && Math.abs(g.h - lastY) < 6) return
    marks.push({ h: g.h, label: isCur ? g.h + '' : a ? a.y + '岁' + (a.m >= 6 ? '半' : '') : fmtShort(g.date), cur: isCur, color: ctx.kidHex(k) })
    if (!isCur) lastY = g.h
  })
  d.ruler = { lo, hi: lo + 120, marks }
  d.medals = skillsOf(s, k.id)
    .filter((sk) => skillProg(sk).finished)
    .map((sk) => ({ t: sk.name.replace(/^(学会|学|自己|独立)/, ''), c1: DIM[sk.dim].color, c2: ctx.kidHex(k) }))
  const de = weekStats(s, k.id, t, 'de')
  d.stars = { got: de.done, total: de.n }
  d.works = journalOf(s, k.id).filter((j) => j.dim === 'mei').length + booksOf(s, k.id).filter((b) => b.status === 'done').length * 0
  const bd = bdaysOf(s, k.id, 7).filter((b) => !b.greeted)[0]
  if (bd) d.gift = { name: bd.p.name, when: bd.days === 0 ? '就是今天' : bd.days === 1 ? '明天' : bd.days + ' 天后', color: '#e2569a' }
  const bk = skillsOf(s, k.id).filter((sk) => sk.pre === 'bike')[0] || skillsOf(s, k.id).filter((sk) => sk.dim === 'ti' && !skillProg(sk).finished)[0]
  if (bk) {
    const p = skillProg(bk)
    d.bike = { label: p.finished ? (bk.pre === 'bike' ? '会骑车啦' : '完成啦') : clipText(bk.name.replace(/^学/, '学'), 4) + ' ' + p.done + '/' + p.n, rate: p.rate, done: bk.pre === 'bike' ? p.finished : false }
  } else d.bike = { done: !isYoung(k) }
  return d
}

export function renderScene(s: AppState, ctx: SceneCtx) {
  return home(sceneData(s, ctx))
}

export { DIMS, readMinutes, pad2, addDays }
