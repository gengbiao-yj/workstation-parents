/**
 * 导入 / 导出往返测试。
 * 用法：node scripts/sync-test.mjs [baseUrl]
 *
 * 覆盖：整库导入 → 导出比对 → replace 重导（幂等）→ merge（不重复）
 */
const BASE = process.argv[2] || 'http://127.0.0.1:3000/api'

let pass = 0
let fail = 0

function ok(label, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  PASS  ${label}${extra ? ' — ' + extra : ''}`)
  } else {
    fail++
    console.log(`  FAIL  ${label}${extra ? ' — ' + extra : ''}`)
  }
}

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* 无响应体 */
  }
  return { status: res.status, json }
}

/** 前端 localStorage 里的一份完整状态（id 是 k1 / h1 这类旧格式） */
function sampleState() {
  return {
    v: 1,
    demo: false,
    settings: {
      parent: { name: '妈妈', gender: 'F' },
      partner: { show: true, name: '爸爸', gender: 'M' },
      anim: true,
      cat: false,
      ai: {
        provider: 'deepseek',
        base: 'https://api.deepseek.com',
        key: 'sk-test-123',
        model: 'deepseek-chat',
        mask: true,
        temp: 0.7,
      },
      lastBackup: 1762700000000,
      onboarded: true,
      cur: 'k1',
      maskSeq: 3,
    },
    kids: [
      {
        id: 'k1',
        name: '小满',
        gender: 'F',
        birthday: '2017-04-12',
        stage: 'p1',
        color: 1,
        school: '实验小学',
        grade: '二年级',
        cls: '3 班',
        teacher: '王老师',
        interests: '画画',
        personality: '慢热',
        health: '近视 100 度',
        note: '怕黑',
        tags: ['敏感', '爱阅读'],
        mk: 1,
      },
      {
        id: 'k2',
        name: '小暑',
        gender: 'M',
        birthday: '2021-07-08',
        stage: 'k',
        color: 2,
        school: '阳光幼儿园',
        grade: '中班',
        cls: '',
        teacher: '',
        interests: '恐龙',
        personality: '活泼',
        health: '',
        note: '',
        tags: [],
      },
    ],
    habits: [
      {
        id: 'h1',
        kid: 'k1',
        dim: 'zhi',
        name: '阅读',
        unit: '分钟',
        target: 20,
        days: [1, 2, 3, 4, 5],
        on: true,
        kind: 'read',
        since: '2026-09-01',
      },
      {
        id: 'h2',
        kid: 'k1',
        dim: 'lao',
        name: '整理书桌',
        unit: '',
        target: 1,
        days: [1, 2, 3, 4, 5, 6, 7],
        on: false,
        kind: '',
        since: '',
      },
      {
        id: 'h3',
        kid: 'k2',
        dim: 'ti',
        name: '户外活动',
        unit: '分钟',
        target: 120,
        days: [1, 2, 3, 4, 5, 6, 7],
        on: true,
        kind: '',
        since: '2026-10-01',
      },
    ],
    checks: {
      k1: {
        '2026-11-09': { h1: 25, h2: true },
        '2026-11-10': { h1: 30 },
      },
      k2: {
        '2026-11-10': { h3: 90 },
      },
    },
    skills: [
      {
        id: 's1',
        kid: 'k1',
        name: '学骑自行车',
        dim: 'ti',
        icon: 'bike',
        tip: '先拆脚踏板',
        start: '2026-10-01',
        note: '',
        steps: [
          { t: '戴好头盔', done: '2026-10-02' },
          { t: '推着车走直线', done: '2026-10-05' },
          { t: '独立骑行 20 米', done: '' },
        ],
      },
      {
        id: 's2',
        kid: 'k2',
        pre: 's1',
        name: '自己系鞋带',
        dim: 'lao',
        icon: 'shoe',
        tip: '',
        start: '',
        note: '两色鞋带',
        steps: [{ t: '打第一个结', done: '' }],
      },
    ],
    events: [
      {
        id: 'e1',
        kid: 'k1',
        type: 'study',
        title: '阅读时间',
        date: '2026-11-10',
        start: '19:00',
        endT: '19:30',
        repeat: 'daily',
        until: '2026-12-31',
        place: '家',
        note: '',
        list: [
          { t: '水杯', ok: true },
          { t: '课外书', ok: false },
        ],
        done: { '2026-11-10': true },
        skip: { '2026-11-11': true },
        review: '今天读了 25 分钟',
        fav: '',
        rating: 5,
        budget: 120,
      },
      {
        id: 'e2',
        kid: '',
        type: 'family',
        title: '全家爬山',
        date: '2026-11-15',
        start: '09:00',
        endT: '',
        repeat: 'none',
        until: '',
        place: '香山',
        note: '带零食',
        list: [],
        done: {},
        skip: {},
        review: '',
        fav: 'star',
        rating: 0,
      },
    ],
    people: [
      {
        id: 'p1',
        kid: 'k1',
        name: '小明',
        rel: 'friend',
        label: '同班',
        close: 3,
        gender: 'M',
        birthday: '2016-05-01',
        likes: '乐高',
        contact: '妈妈微信',
        note: '',
        met: '2020-09-01',
        greeted: { '2025': true },
        mk: 2,
        sibling: 'p2',
        adult: false,
      },
      {
        id: 'p2',
        kid: 'k1',
        name: '小红',
        rel: 'classmate',
        label: '',
        close: 2,
        gender: 'F',
        birthday: '2016-08-09',
        likes: '',
        contact: '',
        note: '',
        met: '',
        greeted: {},
        adult: false,
      },
    ],
    growth: [{ id: 'g1', kid: 'k1', date: '2026-11-01', h: 128.5, w: 26.4, vl: 1.0, vr: 0.8 }],
    journal: [
      {
        id: 'j1',
        kid: 'k1',
        date: '2026-11-10',
        mood: 'happy',
        text: '今天第一次自己系好鞋带',
        dim: 'lao',
        first: true,
        t: 1762700000000,
      },
    ],
    abilities: [{ id: 'a1', kid: 'k1', month: '2026-11', s: { read: 4, focus: 3 }, note: '' }],
    books: [
      {
        id: 'b1',
        kid: 'k1',
        title: '夏洛的网',
        author: 'E.B.怀特',
        status: 'done',
        date: '2026-10-20',
        rating: 5,
        note: '',
        color: '#2f7ff0',
      },
    ],
    exams: [
      {
        id: 'x1',
        kid: 'k1',
        date: '2026-11-05',
        name: '期中考试',
        note: '',
        items: [
          { sub: '语文', score: 95, full: 100 },
          { sub: '数学', score: 98.5, full: 100 },
        ],
      },
    ],
    todos: [
      { id: 't1', text: '买牛奶', done: false },
      { id: 't2', text: '交班费', done: true },
    ],
    chats: [
      {
        id: 'c1',
        title: '阅读建议',
        kid: 'k1',
        tpl: 'read',
        t: 1762700000000,
        batchOnly: true,
        msgs: [
          { role: 'user', content: '怎么让孩子爱读书', show: '怎么让孩子爱读书', t: 1762700000000 },
          { role: 'bot', content: '固定共读时间…', model: 'deepseek-chat', t: 1762700001000 },
        ],
      },
    ],
  }
}

const check = (v) => typeof v === 'string' && /^\d+$/.test(v)

const run = async () => {
  const suffix = Date.now().toString(36)
  const username = `sync_${suffix}`
  const password = 'Sync#2026'

  console.log('\n[0] 准备账号')
  const reg = await call('POST', '/auth/register', { username, password, nickname: '同步测试' })
  ok('注册 201', reg.status === 201, `status=${reg.status}`)
  const token = reg.json?.token ?? reg.json?.accessToken
  ok('拿到 token', !!token)
  if (!token) return

  console.log('\n[1] 整库导入')
  const src = sampleState()
  const imp = await call('POST', '/import', { mode: 'replace', state: src }, token)
  ok('POST /import 201', imp.status === 201 || imp.status === 200, `status=${imp.status}`)
  const c = imp.json?.counts ?? {}
  ok('kids=2', c.kids === 2, JSON.stringify(c))
  ok('habits=3', c.habits === 3)
  ok('checks=4', c.checks === 4, `checks=${c.checks}`)
  ok('skills=2 / steps=4', c.skills === 2 && c.skillSteps === 4)
  ok('events=2 / items=2 / dayLogs=2', c.events === 2 && c.eventItems === 2 && c.eventDayLogs === 2)
  ok('people=2 / greetings=1', c.people === 2 && c.greetings === 1)
  ok('exams=1 / items=2', c.exams === 1 && c.examItems === 2)
  ok('chats=1 / msgs=2', c.chats === 1 && c.chatMessages === 2)
  ok('todos=2', c.todos === 2)

  const map = imp.json?.idMap ?? {}
  ok('返回 idMap.kids', map.kids?.k1 && check(map.kids.k1), JSON.stringify(map.kids ?? {}))

  console.log('\n[2] 导出比对')
  const exp = await call('GET', '/export', undefined, token)
  ok('GET /export 200', exp.status === 200)
  const s = exp.json ?? {}

  ok('kids 数量与顺序', s.kids?.length === 2 && s.kids[0].name === '小满')
  ok('kid id 已换成自增', check(s.kids[0].id))
  ok('kid 字段完整', s.kids[0].school === '实验小学' && s.kids[0].tags.length === 2 && s.kids[0].birthday === '2017-04-12')

  ok('habits 挂到新 kid id', s.habits?.length === 3 && s.habits[0].kid === s.kids[0].id)
  ok('habit target 是数字', s.habits[0].target === 20)
  ok('habit days 保留', JSON.stringify(s.habits[0].days) === '[1,2,3,4,5]')
  ok('habit on=false 保留', s.habits[1].on === false)

  const ck = s.checks?.[s.kids[0].id] ?? {}
  const h1 = s.habits[0].id
  const h2 = s.habits[1].id
  ok('checks 按日期分组', ck['2026-11-09']?.[h1] === 25 && ck['2026-11-09']?.[h2] === true, JSON.stringify(ck))
  ok('checks 第二组', ck['2026-11-10']?.[h1] === 30)
  ok('第二个孩子的 checks 独立', s.checks?.[s.kids[1].id]?.['2026-11-10']?.[s.habits[2].id] === 90)

  const sk = s.skills?.find((x) => x.name === '学骑自行车')
  ok('skill 步骤顺序与完成日', sk?.steps?.[0]?.t === '戴好头盔' && sk.steps[0].done === '2026-10-02' && sk.steps[2].done === '')
  const sk2 = s.skills?.find((x) => x.name === '自己系鞋带')
  ok('skill.pre 映射成新技能 id', sk2?.pre === sk?.id, `pre=${sk2?.pre} / s1=${sk?.id}`)
  ok('skill.note 保留', sk2?.note === '两色鞋带')

  const ev = s.events?.find((x) => x.title === '阅读时间')
  ok('event 基础字段', ev?.start === '19:00' && ev?.repeat === 'daily' && ev?.until === '2026-12-31')
  ok('event.budget 数字', ev?.budget === 120)
  ok('event.done / skip 还原成 map', ev?.done?.['2026-11-10'] === true && ev?.skip?.['2026-11-11'] === true)
  ok('event.list 保留 ok 标记', ev?.list?.length === 2 && ev.list[0].ok === true && ev.list[1].ok === false)
  const ev2 = s.events?.find((x) => x.title === '全家爬山')
  ok('全家事件 kid 为空串', ev2?.kid === '')
  ok('event.fav 保留', ev2?.fav === 'star')

  const p1 = s.people?.find((x) => x.name === '小明')
  ok('person 基础字段', p1?.close === 3 && p1?.met === '2020-09-01' && p1?.mk === 2)
  ok('person.greeted 还原', p1?.greeted?.['2025'] === true)
  const p2 = s.people?.find((x) => x.name === '小红')
  ok('person.sibling 映射成新 id', p1?.sibling === p2?.id, `sibling=${p1?.sibling} / p2=${p2?.id}`)

  ok('growth 小数保留', s.growth?.[0]?.h === 128.5 && s.growth[0].vl === 1 && s.growth[0].vr === 0.8)
  ok('journal text→content→text', s.journal?.[0]?.text === '今天第一次自己系好鞋带' && s.journal[0].first === true)
  ok('journal t 数字', s.journal?.[0]?.t === 1762700000000)
  ok('ability.s 是对象', s.abilities?.[0]?.s?.read === 4 && s.abilities[0].month === '2026-11')
  ok('book 字段', s.books?.[0]?.title === '夏洛的网' && s.books[0].rating === 5)
  ok('exam items 数字', s.exams?.[0]?.items?.[1]?.score === 98.5 && s.exams[0].items[1].full === 100)
  ok('todos', s.todos?.length === 2 && s.todos[1].done === true)
  ok('chat 消息顺序与 role', s.chats?.[0]?.msgs?.[1]?.role === 'bot' && s.chats[0].msgs[1].model === 'deepseek-chat')
  ok('chat.batchOnly 保留', s.chats?.[0]?.batchOnly === true)

  ok('settings 回灌', s.settings?.ai?.key === 'sk-test-123' && s.settings?.ai?.temp === 0.7)
  ok('settings.cur 指向新 kid id', s.settings?.cur === s.kids[0].id, `cur=${s.settings?.cur}`)
  ok('settings.detail 保留', s.settings?.partner?.show === true && s.settings?.maskSeq === 3 && s.settings?.cat === false)

  console.log('\n[3] replace 重导（幂等）')
  const imp2 = await call('POST', '/import', { mode: 'replace', state: src }, token)
  ok('再次导入成功', imp2.status === 201 || imp2.status === 200)
  const exp2 = await call('GET', '/export', undefined, token)
  const s2 = exp2.json ?? {}
  ok('不会翻倍', s2.kids?.length === 2 && s2.habits?.length === 3 && s2.checks?.[s2.kids[0].id]?.['2026-11-09']
    ? Object.keys(s2.checks[s2.kids[0].id]['2026-11-09']).length === 2
    : false)
  ok('旧数据已清空（id 全部换新）', s2.kids[0].id !== s.kids[0].id, `${s.kids[0].id} -> ${s2.kids[0].id}`)

  console.log('\n[4] merge 模式不重复')
  const imp3 = await call('POST', '/import', { mode: 'merge', state: src }, token)
  ok('merge 成功', imp3.status === 201 || imp3.status === 200)
  const exp3 = await call('GET', '/export', undefined, token)
  const s3 = exp3.json ?? {}
  ok('merge 后数量不变', s3.kids?.length === 2 && s3.habits?.length === 3 && s3.todos?.length === 2)

  console.log('\n[5] 鉴权与边界')
  const noAuth = await call('GET', '/export', undefined, undefined)
  ok('未登录 401', noAuth.status === 401, `status=${noAuth.status}`)
  const bad = await call('POST', '/import', { state: [] }, token)
  ok('state 是数组 → 400', bad.status === 400, `status=${bad.status}`)

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => {
  console.error('测试异常：', e)
  process.exit(1)
})
