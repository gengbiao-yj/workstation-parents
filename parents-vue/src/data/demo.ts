/**
 * 默认状态与示例数据生成器
 * 从原始单文件版本 1:1 移植：默认值、文案、随机数调用顺序保持一致，
 * 以便按欢迎页所选阶段生成结构相同、观感一致的示例家庭数据。
 */
import type { AppState, Kid, Skill, GrowthRecord, Book, StageId } from '@/types'
import {
  BOOK_COLORS,
  DIM,
  D_ALL,
  DEMO_BOOKS,
  EVT,
  HABIT_PRESETS,
  OUT_LIST,
  REL,
  SKILL_PRESETS,
  STAGE,
  STAGE_AGE,
  SIBLING,
  BASE_H,
  BASE_W,
  SUBJECT_PRESETS,
  type HabitPreset,
  type SkillPresetDef
} from '@/data/constants'
import { uid, todayStr, addDays, daysBetween, dowOf, mondayOf, pad2, parseDate, round1, clamp } from '@/lib/date'
import { rng } from '@/art/home'

/* ---------- 默认状态 ---------- */
export function defaultState(): AppState {
  return {
    v: 1,
    demo: false,
    settings: {
      parent: { name: '妈妈', gender: 'F' },
      partner: { show: false, name: '爸爸', gender: 'M' },
      anim: true,
      cat: true,
      ai: { provider: 'deepseek', base: 'https://api.deepseek.com', key: '', model: 'deepseek-flash', mask: true, temp: 0.7 },
      lastBackup: 0,
      onboarded: false,
      cur: '',
      maskSeq: 0
    },
    kids: [],
    habits: [],
    checks: {},
    skills: [],
    events: [],
    people: [],
    growth: [],
    journal: [],
    abilities: [],
    books: [],
    exams: [],
    todos: [],
    chats: []
  }
}

export function migrate(s: any): AppState {
  const d = defaultState()
  s.settings = Object.assign({}, d.settings, s.settings || {})
  ;['ai', 'parent', 'partner'].forEach((k: string) => {
    s.settings[k] = Object.assign({}, (d.settings as any)[k], s.settings[k] || {})
  })
  ;['kids', 'habits', 'skills', 'events', 'people', 'growth', 'journal', 'abilities', 'books', 'exams', 'todos', 'chats'].forEach((k: string) => {
    if (!Array.isArray(s[k])) s[k] = []
  })
  if (!s.checks || typeof s.checks !== 'object') s.checks = {}
  s.kids = s.kids.filter((k: any) => k && k.id && k.name)
  s.kids.forEach((k: any, i: number) => {
    if (!STAGE[k.stage]) k.stage = 'p1'
    if (k.color === undefined) k.color = i
    if (!Array.isArray(k.tags)) k.tags = []
  })
  s.habits = s.habits.filter((h: any) => h && h.id && h.kid && DIM[h.dim])
  s.habits.forEach((h: any) => {
    if (!Array.isArray(h.days) || !h.days.length) h.days = D_ALL.slice()
    if (h.on === undefined) h.on = true
    h.target = +h.target || 1
  })
  s.events = s.events.filter((e: any) => e && e.id && e.date && EVT[e.type])
  s.events.forEach((e: any) => {
    if (!e.done || typeof e.done !== 'object') e.done = {}
    if (!e.skip || typeof e.skip !== 'object') e.skip = {}
    if (!Array.isArray(e.list)) e.list = []
    if (e.kid === undefined) e.kid = ''
  })
  s.skills.forEach((k: any) => {
    if (!Array.isArray(k.steps)) k.steps = []
  })
  s.people = s.people.filter((p: any) => p && p.id && p.name)
  s.people.forEach((p: any) => {
    if (!REL[p.rel]) p.rel = 'friend'
    p.close = clamp(+p.close || 2, 1, 3)
    if (!p.greeted || typeof p.greeted !== 'object') p.greeted = {}
  })
  s.chats.forEach((c: any) => {
    if (!Array.isArray(c.msgs)) c.msgs = []
    if (!c.t && c.date) c.t = c.date
    if (!c.t) c.t = Date.now()
    if (c.kid === null) c.kid = ''
    c.msgs.forEach((m: any) => {
      if (m.role === 'assistant') m.role = 'bot'
      if (m.streaming) {
        m.streaming = false
        if (!m.content) m.err = '上次生成被中断了（页面关闭或刷新），可以点「重试」。'
        else m.content += '\n\n（上次生成被中断，可以点「重新生成」）'
      }
    })
  })
  return s as AppState
}

/* ---------- 示例数据 · 按欢迎页选的阶段生成一个两孩家庭（主角 + 一个不同阶段的兄弟姐妹） ---------- */

export function kidFromStage(stage: any, opt?: any): Kid {
  opt = opt || {}
  const age = STAGE_AGE[stage as keyof typeof STAGE_AGE]
  const y = new Date().getFullYear() - age
  const md = opt.md || '03-15'
  return {
    id: opt.id || uid('k'),
    name: opt.name,
    gender: opt.gender || 'F',
    birthday: y + '-' + md,
    stage: stage,
    color: opt.color || 0,
    school: opt.school || '',
    grade: opt.grade || STAGE[stage].grades[1],
    cls: opt.cls || '',
    teacher: opt.teacher || '',
    interests: opt.interests || '',
    personality: opt.personality || '',
    health: opt.health || '',
    note: '',
    tags: []
  }
}

export function addPresetHabits(st: AppState, kid: string, stage: any, onlyOn?: boolean): void {
  ;(HABIT_PRESETS[stage as StageId] || []).forEach((p: HabitPreset) => {
    if (onlyOn && !p[5]) return
    st.habits.push({ id: uid('h'), kid: kid, dim: p[0], name: p[1], unit: p[2], target: p[3], days: p[4].slice(), on: !!p[5], kind: p[6] || '', since: '' })
  })
}

export function addPresetSkill(st: AppState, kid: string, preset: SkillPresetDef, doneN: number, startDs: string): Skill {
  const sk: Skill = {
    id: uid('sk'),
    kid: kid,
    pre: preset.id,
    name: preset.t,
    dim: preset.dim,
    icon: preset.icon,
    tip: preset.tip,
    start: startDs,
    note: '',
    steps: preset.steps.map((t) => ({ t: t, done: '' }))
  }
  for (let i = 0; i < doneN && i < sk.steps.length; i++) {
    sk.steps[i].done = addDays(startDs, Math.round((i + 1) * (daysBetween(parseDate(startDs) as Date, new Date()) / (doneN + 0.6))))
  }
  st.skills.push(sk)
  return sk
}

export function genChecks(st: AppState, kid: string, R: () => number, days: number, rateBase: number): void {
  const t = todayStr()
  const hs = st.habits.filter((h) => h.kid === kid && h.on)
  const dimBias: Record<string, number> = { de: 0.06, zhi: 0.04, ti: -0.02, mei: -0.12, lao: -0.06 }
  for (let i = days; i >= 0; i--) {
    const ds = addDays(t, -i)
    const w = dowOf(ds)
    const trend = ((days - i) / days) * 0.1
    hs.forEach((h, j) => {
      if (h.days.indexOf(w) < 0) return
      if (i === 0 && (j % 3 === 1 || j % 4 === 3)) return // 今天还没做完
      const p = rateBase + trend + (dimBias[h.dim] || 0) + (w >= 6 && h.dim === 'zhi' ? -0.1 : 0)
      if (R() < p) {
        const v = h.unit ? Math.round(h.target * (0.85 + R() * 0.5)) : true
        if (!st.checks[kid]) st.checks[kid] = {}
        if (!st.checks[kid][ds]) st.checks[kid][ds] = {}
        st.checks[kid][ds][h.id] = v
      }
    })
  }
}

export function genGrowth(st: AppState, kid: string, stage: any, gender: string, R: () => number): void {
  const gi = gender === 'F' ? 1 : 0
  const h1 = BASE_H[stage as StageId][gi]
  const w1 = BASE_W[stage as StageId][gi]
  const per = stage === 'm' ? 7.2 : stage === 'h' ? 3.2 : 6
  const t = todayStr()
  const pts = [-900, -780, -660, -540, -420, -300, -190, -95, -6]
  pts.forEach((off, i) => {
    const yrs = off / 365
    const h = round1(h1 + per * yrs + (R() - 0.5) * 0.6)
    const w = round1(w1 + (stage === 'm' ? 5 : stage === 'h' ? 2.5 : 2.6) * yrs + (R() - 0.5) * 0.5)
    const g: GrowthRecord = { id: uid('g'), kid: kid, date: addDays(t, off), h: h, w: w }
    if (i % 3 === 2 || i === pts.length - 1) {
      g.vl = i === pts.length - 1 && stage !== 'k' ? 4.9 : 5.0
      g.vr = 5.0
    }
    st.growth.push(g)
  })
}

export function demoState(stage?: any, gender?: string, parentGender?: string): AppState {
  stage = stage || 'p1'
  gender = gender || 'F'
  const R = rng(20261107 + stage.charCodeAt(0))
  const st = defaultState()
  st.demo = true
  const t = todayStr()
  const mon = mondayOf(t)
  const mainName = gender === 'F' ? '朵朵' : '乐乐'
  const sibStage = SIBLING[stage as keyof typeof SIBLING]
  const sibGender = gender === 'F' ? 'M' : 'F'
  const sibOlder = STAGE_AGE[sibStage as keyof typeof STAGE_AGE] > STAGE_AGE[stage as keyof typeof STAGE_AGE]
  const sibName = sibGender === 'F' ? (sibOlder ? '小雨' : '妞妞') : (sibOlder ? '小宇' : '豆丁')
  const sibLabel = sibOlder ? (sibGender === 'F' ? '姐姐' : '哥哥') : (sibGender === 'F' ? '妹妹' : '弟弟')
  st.settings.parent = { name: mainName + (parentGender === 'M' ? '爸爸' : '妈妈'), gender: parentGender === 'M' ? 'M' : 'F' }
  st.settings.partner = { show: false, name: parentGender === 'M' ? '妈妈' : '爸爸', gender: parentGender === 'M' ? 'F' : 'M' }
  st.settings.onboarded = true
  const schoolName: Record<string, string> = { k: '向日葵幼儿园', p1: '星河实验小学', p2: '星河实验小学', m: '星河实验中学', h: '星河第一高级中学' }
  const main = kidFromStage(stage, {
    name: mainName,
    gender: gender,
    color: 0,
    md: '03-15',
    school: schoolName[stage],
    cls: stage === 'k' ? '中二班' : stage === 'h' ? '（5）班' : '（3）班',
    teacher: stage === 'k' ? '王老师' : '李老师',
    interests: ({ k: '恐龙、画画、搭积木', p1: '画画、游泳、恐龙', p2: '钢琴、游泳、科学实验', m: '篮球、编程、科幻小说', h: '摄影、篮球、天文' } as Record<string, string>)[stage],
    personality: ({ k: '爱笑、好奇心强，有点怕生', p1: '开朗、爱问为什么，做事有点急', p2: '认真、有主见，比较在意别人的评价', m: '安静、有想法，最近不太爱说话', h: '独立、自律，压力大时容易失眠' } as Record<string, string>)[stage],
    health: stage === 'k' ? '对芒果过敏' : stage === 'h' ? '轻度近视，已配眼镜' : ''
  })
  const sib = kidFromStage(sibStage, {
    name: sibName,
    gender: sibGender,
    color: 1,
    md: '09-08',
    school: schoolName[sibStage],
    teacher: '张老师',
    interests: ({ k: '小汽车、跳舞', p1: '乐高、跳绳', p2: '画画、羽毛球', m: '足球、动漫', h: '吉他、跑步' } as Record<string, string>)[sibStage],
    personality: '活泼，喜欢跟着' + (sibOlder ? '弟弟妹妹玩' : gender === 'F' ? '姐姐' : '哥哥')
  })
  st.kids = [main, sib]
  st.settings.cur = main.id

  ;[main, sib].forEach((k, ki) => {
    addPresetHabits(st, k.id, k.stage, false)
    genChecks(st, k.id, R, ki ? 40 : 86, ki ? 0.6 : 0.68)
    genGrowth(st, k.id, k.stage, k.gender, R)
  })

  // 技能挑战
  const pres = SKILL_PRESETS.filter((p) => p.stages.indexOf(stage) >= 0)
  const plan = [
    [0.62, 80],
    [1, 150],
    [1, 120],
    [0.4, 30],
    [0, 3]
  ]
  pres.slice(0, 5).forEach((p, i) => {
    addPresetSkill(st, main.id, p, Math.round(p.steps.length * plan[i][0]), addDays(t, -plan[i][1]))
  })
  const sp = SKILL_PRESETS.filter((p) => p.stages.indexOf(sibStage) >= 0)
  if (sp[0]) addPresetSkill(st, sib.id, sp[0], Math.ceil(sp[0].steps.length * 0.5), addDays(t, -50))
  if (sp[1]) addPresetSkill(st, sib.id, sp[1], sp[1].steps.length, addDays(t, -140))

  // 日程（围绕今天）
  function ev(o: any): any {
    const e = Object.assign(
      { id: uid('e'), kid: main.id, type: 'other', title: '', date: t, start: '', endT: '', repeat: 'none', until: '', place: '', note: '', list: [], done: {}, skip: {}, review: '', fav: '', rating: 0 },
      o
    )
    st.events.push(e)
    return e
  }
  const young = stage === 'k' || stage === 'p1'
  const sat = addDays(mon, 5)
  const sun = addDays(mon, 6)
  const swim = ev({ type: 'class', title: stage === 'm' || stage === 'h' ? '篮球训练' : '游泳课', date: addDays(sat, -63), start: '09:00', endT: '10:00', repeat: 'weekly', place: stage === 'm' || stage === 'h' ? '体育中心' : '市游泳馆' })
  const art = ev({ type: 'class', title: ({ k: '美术课', p1: '美术课', p2: '钢琴课', m: '编程课', h: '摄影课' } as Record<string, string>)[stage], date: addDays(mon, 2 - 70), start: '17:30', endT: '18:30', repeat: 'weekly', place: '少年宫' })
  const studyT = ({
    k: [['绘本共读', 1], ['数字小游戏', 3], ['自然观察', 6]],
    p1: [['口算 15 分钟', 1], ['英语绘本', 2], ['拼音复习', 4], ['科学小实验', 6]],
    p2: [['数学错题整理', 1], ['英语听读', 2], ['作文练笔', 4], ['科学阅读', 6]],
    m: [['数学专题', 1], ['英语听力', 2], ['物理预习', 4], ['周复盘', 7]],
    h: [['数学刷题', 1], ['英语阅读', 3], ['物理专题', 5], ['周复盘', 7]]
  } as Record<string, [string, number][]>)[stage]
  studyT.forEach((x) => {
    const e = ev({ type: 'study', title: x[0], date: addDays(mon, x[1] - 1 - 56), start: x[1] >= 6 ? '10:30' : '19:00', endT: x[1] >= 6 ? '11:10' : '19:30', repeat: 'weekly', place: '书房' })
    for (let ds = e.date; ds < t; ds = addDays(ds, 7)) if (R() < 0.82) e.done[ds] = true
  })
  for (let d0 = swim.date; d0 < t; d0 = addDays(d0, 7)) swim.done[d0] = true
  for (let d1 = art.date; d1 < t; d1 = addDays(d1, 7)) art.done[d1] = true
  ev({ type: 'family', title: young ? '家庭桌游夜' : '家庭电影夜', kid: '', date: addDays(sun, -42), start: '19:30', endT: '20:30', repeat: 'weekly', place: '客厅' })
  const outA = ({ k: ['海洋馆', '城市海洋馆'], p1: ['科技馆', '市科技馆'], p2: ['自然博物馆', '自然博物馆'], m: ['参观大学', '城市大学'], h: ['看展', '美术馆'] } as Record<string, string[]>)[stage]
  ev({ type: 'outing', kid: '', title: '去' + outA[0], date: t, start: '14:30', endT: '17:30', place: outA[1], budget: 200, note: '提前在网上预约', list: OUT_LIST.slice(0, 6).map((x, i) => ({ t: x, ok: i < 3 })) })
  ev({ type: 'outing', kid: '', title: young ? '郊外爬山 + 野餐' : '城市骑行 15 公里', date: addDays(sat, 7), start: '09:00', endT: '15:00', place: young ? '青龙山' : '滨江绿道', budget: 150, list: OUT_LIST.slice(0, 5).map((x) => ({ t: x, ok: false })) })
  ev({
    type: 'outing',
    kid: '',
    title: young ? '动物园' : '露营观星',
    date: addDays(t, -13),
    start: '09:30',
    endT: '16:00',
    place: young ? '野生动物园' : '星空营地',
    review: young ? '第一次喂长颈鹿，回来画了一幅画。走了很多路没喊累。' : '自己搭好了帐篷，认出了北斗七星，聊到很晚。',
    fav: young ? '喂长颈鹿' : '看银河',
    rating: 5,
    done: (function () {
      const o: Record<string, boolean> = {}
      o[addDays(t, -13)] = true
      return o
    })()
  })
  ev({ type: 'school', title: '家长会', date: addDays(t, 6), start: '17:00', endT: '18:30', place: main.school, note: '准备想问老师的 3 个问题' })
  ev({ type: 'school', title: stage === 'k' ? '幼儿园亲子运动会' : '秋季运动会', date: addDays(t, 13), start: '08:30', place: main.school })
  ev({ type: 'health', title: stage === 'k' ? '体检 + 牙齿涂氟' : '牙科复查', date: addDays(t, 14), start: '10:00', place: '儿童医院口腔科' })
  ev({ type: 'family', title: young ? '一起包饺子' : '一起做晚饭', date: addDays(t, 2), start: '17:30', endT: '18:30' })
  ev({ type: 'sport', title: young ? '公园练骑车' : '夜跑 3 公里', date: addDays(t, 1), start: '16:00', endT: '17:00', place: '小区公园' })
  ev({ type: 'class', kid: sib.id, title: sibStage === 'k' ? '舞蹈课' : sibStage === 'm' ? '足球训练' : '羽毛球课', date: addDays(mon, 3 - 56), start: '18:00', endT: '19:00', repeat: 'weekly' })
  ev({ type: 'school', kid: sib.id, title: '开放日', date: addDays(t, 4), start: '09:00' })

  // 关系网
  function pp(o: any): any {
    const p = Object.assign({ id: uid('p'), kid: main.id, rel: 'friend', label: '', close: 2, gender: 'F', birthday: '', likes: '', contact: '', note: '', met: '', greeted: {} }, o)
    st.people.push(p)
    return p
  }
  const pg = st.settings.parent.gender
  pp({ name: pg === 'F' ? '妈妈' : '爸爸', rel: 'family', label: pg === 'F' ? '妈妈' : '爸爸', close: 3, gender: pg })
  pp({ name: pg === 'F' ? '爸爸' : '妈妈', rel: 'family', label: pg === 'F' ? '爸爸' : '妈妈', close: 3, gender: pg === 'F' ? 'M' : 'F' })
  pp({ name: sibName, rel: 'family', label: sibLabel, close: 3, gender: sibGender, birthday: sib.birthday, likes: sib.interests, sibling: sib.id })
  const md = (n: number) => addDays(t, n).slice(5)
  const gy = (age: number, n: number) => +addDays(t, n).slice(0, 4) - age + '-' + md(n)
  pp({ name: '奶奶', rel: 'family', label: '奶奶', close: 3, gender: 'F', birthday: '1958-' + md(25), likes: '喜欢花、听戏', note: '每周日去奶奶家吃饭' })
  pp({ name: '外公', rel: 'family', label: '外公', close: 2, gender: 'M', birthday: '1956-' + md(70), likes: '下象棋、钓鱼' })
  const a = STAGE_AGE[stage as keyof typeof STAGE_AGE]
  let friendsF: any[] = [
    ['小美', 'F', 3, 3, '喜欢粉色、小兔子和手工', '幼儿园就认识，住同一个小区'],
    ['安安', 'F', 3, 40, '喜欢画画和跳舞', '同桌'],
    ['浩浩', 'M', 2, -20, '喜欢恐龙和乐高', '一起学游泳']
  ]
  let friendsM: any[] = [
    ['小宇', 'M', 3, 3, '喜欢足球和奥特曼', '幼儿园就认识，住同一个小区'],
    ['一一', 'M', 3, 40, '喜欢乐高和科学', '同桌'],
    ['可可', 'F', 2, -20, '喜欢画画和猫', '一起学游泳']
  ]
  if (a >= 12) {
    friendsF = [
      ['林夏', 'F', 3, 3, '喜欢追剧、手账和奶茶', '小学同学，现在同班'],
      ['苏苏', 'F', 3, 40, '喜欢画画和乐队', '同桌'],
      ['陈一鸣', 'M', 2, -20, '喜欢篮球和编程', '社团认识']
    ]
    friendsM = [
      ['周子航', 'M', 3, 3, '喜欢篮球和科幻', '小学同学，现在同班'],
      ['李想', 'M', 3, 40, '喜欢编程和游戏', '同桌'],
      ['何安', 'F', 2, -20, '喜欢摄影和音乐', '社团认识']
    ]
  }
  ;(gender === 'F' ? friendsF : friendsM).forEach((f: any, i: number) => {
    const p = pp({ name: f[0] === sibName ? f[0] + '同学' : f[0], rel: 'friend', close: f[2], gender: f[1], birthday: gy(a, f[3]), likes: f[4], met: f[5], contact: f[0] + '妈妈 138****' + (2201 + i * 37) })
    if (f[3] < 0) p.greeted[addDays(t, f[3]).slice(0, 4)] = true
  })
  ;[
    ['豆豆', 'M', 12, '喜欢汽车模型'],
    ['乐言', 'F', 55, '喜欢读书'],
    ['子墨', 'M', 120, ''],
    ['甜甜', 'F', 190, '喜欢唱歌']
  ].forEach((c: any, i: number) => {
    pp({ name: a >= 12 ? ['王子墨', '赵欣然', '孙浩然', '吴可欣'][i] : c[0], rel: 'classmate', close: i < 2 ? 2 : 1, gender: c[1], birthday: gy(a, c[2]), likes: c[3] })
  })
  pp({ name: main.teacher, rel: 'teacher', label: stage === 'k' ? '班主任' : '班主任 · 语文', close: 2, gender: 'F', birthday: '', note: '每周五在家校群发周小结' })
  pp({ name: '张教练', rel: 'coach', label: swim.title.replace('课', '').replace('训练', '') + '教练', close: 1, gender: 'M' })
  pp({ name: '楼下的晨晨', rel: 'neighbor', close: 1, gender: gender, birthday: gy(Math.max(3, a - 1), 160), likes: '喜欢滑板车' })
  pp({ kid: sib.id, name: main.name, rel: 'family', label: sibOlder ? (gender === 'F' ? '妹妹' : '弟弟') : (gender === 'F' ? '姐姐' : '哥哥'), close: 3, gender: gender, birthday: main.birthday, sibling: main.id })
  pp({ kid: sib.id, name: '团团', rel: 'friend', close: 3, gender: sibGender, birthday: gy(STAGE_AGE[sibStage as keyof typeof STAGE_AGE], 9), likes: '喜欢小汽车' })

  // 成长日记
  const J = young
    ? [
        [0, 'happy', '早上自己穿好衣服，还帮我把垃圾带下楼。', 'lao'],
        [-2, 'excited', '第一次抬起脚滑了 5 米！摔了一下没哭，自己爬起来继续。', 'ti', 1],
        [-4, 'sad', '和小美因为一支彩笔吵架了。睡前聊了聊，第二天主动去道歉。', 'de'],
        [-6, 'calm', '读完了一整本书，还给我讲了里面的故事。', 'zhi'],
        [-9, 'tired', '游泳课不想去，哭了一会儿。到了泳池又玩得很开心。', 'ti'],
        [-13, 'happy', '动物园喂了长颈鹿，回来画了一幅画贴在作品墙上。', 'mei'],
        [-18, 'worried', '担心下周的跳绳测试，我们一起每天练 10 分钟。', 'ti'],
        [-25, 'happy', '第一次自己系好了鞋带！', 'lao', 1]
      ]
    : [
        [0, 'calm', '晚饭时主动聊了社团的事，说想参加下学期的比赛。', 'de'],
        [-2, 'tired', '作业多，睡得有点晚。约好周末一起调整一下作息。', 'ti'],
        [-4, 'happy', '自己做了一顿晚饭，番茄炒蛋有点咸，但全家都吃光了。', 'lao', 1],
        [-7, 'worried', '担心考试，聊完后决定每天先把错题弄懂。', 'zhi'],
        [-13, 'excited', '露营认出了北斗七星，聊到很晚。', 'zhi'],
        [-16, 'angry', '因为手机时间吵了一架。冷静后一起重新定了规则。', 'de'],
        [-22, 'happy', '篮球比赛投进了关键一球，回家讲了一晚上。', 'ti'],
        [-30, 'calm', '读完《' + DEMO_BOOKS[stage as StageId][0][0] + '》，写了一段读后感。', 'zhi']
      ]
  J.forEach((j: any, i: number) => {
    st.journal.push({ id: uid('j'), kid: main.id, date: addDays(t, j[0]), mood: j[1], text: j[2], dim: j[3], first: !!j[4], t: Date.now() - i * 1000 })
  })
  st.journal.push({ id: uid('j'), kid: sib.id, date: addDays(t, -1), mood: 'happy', text: '和' + main.name + '一起搭了一个大城堡。', dim: 'mei', t: Date.now() - 50000 })

  // 学习能力评估（按月）
  const base: Record<string, number> = { read: 3, focus: 2, think: 3, express: 3, plan: 2, curious: 4 }
  for (let mo = 3; mo >= 0; mo--) {
    const dt = new Date()
    dt.setDate(1)
    dt.setMonth(dt.getMonth() - mo)
    const mk = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1)
    const sc: Record<string, number> = {}
    Object.keys(base).forEach((k, i) => {
      sc[k] = clamp(base[k] + (mo <= 1 && i % 2 === 0 ? 1 : 0) + (mo === 0 && k === 'focus' ? 1 : 0), 1, 5)
    })
    st.abilities.push({ id: uid('a'), kid: main.id, month: mk, s: sc, note: mo === 0 ? '专注力明显进步，能坐下来做完 20 分钟的练习。' : '' })
  }
  // 书架
  DEMO_BOOKS[stage as StageId].forEach((b, i) => {
    st.books.push({ id: uid('b'), kid: main.id, title: b[0], author: b[1], status: i < 3 ? 'done' : i === 3 ? 'reading' : 'want', date: i < 3 ? addDays(t, -10 - i * 18) : '', rating: i < 3 ? 5 - (i % 2) : 0, note: i === 0 ? '最喜欢的一本，读了三遍' : '', color: BOOK_COLORS[i % BOOK_COLORS.length] })
  })
  DEMO_BOOKS[sibStage].slice(0, 3).forEach((b, i) => {
    st.books.push({ id: uid('b'), kid: sib.id, title: b[0], author: b[1], status: i ? 'reading' : 'done', date: i ? '' : addDays(t, -20), rating: 4, color: BOOK_COLORS[(i + 3) % 8] } as Book)
  })
  // 学校成绩（只记一笔，不排名）
  const subs = SUBJECT_PRESETS[stage as StageId]
  if (subs.length)
    [
      [-200, '上学期期末'],
      [-12, '期中']
    ].forEach((x: any, i: number) => {
      st.exams.push({
        id: uid('x'),
        kid: main.id,
        date: addDays(t, x[0]),
        name: x[1],
        note: i ? '数学计算粗心，老师说上课更积极了' : '',
        items: subs.map((sname, j) => {
          const full = stage === 'm' || stage === 'h' ? (j < 3 ? 120 : 100) : 100
          return { sub: sname, score: Math.round(full * (0.82 + R() * 0.14 + i * 0.02)), full: full }
        })
      })
    })
  st.todos = [
    { id: uid('t'), text: '周一前交秋游回执', done: false },
    { id: uid('t'), text: '给' + swim.title.replace('课', '') + '课续费', done: false },
    { id: uid('t'), text: '准备' + (gender === 'F' ? friendsF : friendsM)[0][0] + '的生日礼物', done: false },
    { id: uid('t'), text: '整理换季衣服', done: true }
  ]
  return st
}

/* 新建一个孩子时的默认内容：按阶段打开推荐打卡项，家人放进关系网 */
export function setupKid(st: AppState, k: Kid): void {
  addPresetHabits(st, k.id, k.stage, false)
  const pg = st.settings.parent
  const pt = st.settings.partner
  st.people.push({ id: uid('p'), kid: k.id, name: pg.gender === 'F' ? '妈妈' : '爸爸', rel: 'family', label: pg.gender === 'F' ? '妈妈' : '爸爸', close: 3, gender: pg.gender, birthday: '', likes: '', contact: '', note: '', met: '', greeted: {} })
  if (pt.show) st.people.push({ id: uid('p'), kid: k.id, name: pt.gender === 'F' ? '妈妈' : '爸爸', rel: 'family', label: pt.gender === 'F' ? '妈妈' : '爸爸', close: 3, gender: pt.gender, birthday: '', likes: '', contact: '', note: '', met: '', greeted: {} })
}
