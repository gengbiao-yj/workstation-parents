/**
 * 领域接口回归测试（覆盖 habits / skills / events / people / growth / journal / abilities / books / exams / todos / chats）。
 * 用法：node scripts/rest-test.mjs [baseUrl]
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

async function newUser(prefix) {
  const username = `${prefix}_${Date.now().toString(36)}`
  const r = await call('POST', '/auth/register', { username, password: 'Rest#2026' })
  return { token: r.json?.token, username }
}

const today = new Date().toISOString().slice(0, 10)

const run = async () => {
  console.log('\n[0] 准备账号')
  const { token } = await newUser('rest')
  ok('注册并登录', !!token)
  if (!token) return

  console.log('\n[1] 孩子（其他模块的前置）')
  const kid = await call('POST', '/kids', { name: '小满', gender: 'F', stage: 'p1', birthday: '2017-04-12', tags: ['爱阅读'] }, token)
  ok('POST /kids 201', kid.status === 201, `status=${kid.status}`)
  const kidId = kid.json?.id
  ok('返回字符串 id', typeof kidId === 'string' && /^\d+$/.test(kidId), `id=${kidId}`)

  console.log('\n[2] 习惯 + 打卡')
  const habit = await call('POST', '/habits', {
    kidId,
    dim: 'zhi',
    name: '阅读',
    unit: '分钟',
    target: 20,
    days: [1, 2, 3, 4, 5],
    on: true,
    kind: 'read',
    since: '2026-09-01',
  }, token)
  ok('POST /habits 201', habit.status === 201, JSON.stringify(habit.json).slice(0, 120))
  const habitId = habit.json?.id
  ok('habit.target 是数字', habit.json?.target === 20)
  ok('habit.days 保留数组', JSON.stringify(habit.json?.days) === '[1,2,3,4,5]')

  const badHabit = await call('POST', '/habits', { kidId, name: '无维度' }, token)
  ok('缺 dim 用默认值也能建', badHabit.status === 201 && badHabit.json?.dim === 'de')

  const setCheck = await call('PUT', `/habits/${habitId}/checks`, { date: today, value: 25 }, token)
  ok('PUT 打卡 25 分钟', setCheck.status === 200 && setCheck.json?.value === 25, JSON.stringify(setCheck.json))
  await call('PUT', `/habits/${habitId}/checks`, { date: today, value: true }, token)
  const checks = await call('GET', `/habits/checks?from=${today}&to=${today}`, undefined, token)
  ok('GET /habits/checks 返回嵌套 map', checks.json?.[kidId]?.[today]?.[habitId] === true, JSON.stringify(checks.json))

  const clear = await call('PUT', `/habits/${habitId}/checks`, { date: today, value: null }, token)
  ok('value=null 取消打卡', clear.status === 200 && clear.json?.value === null)
  const checks2 = await call('GET', `/habits/checks?from=${today}&to=${today}`, undefined, token)
  ok('取消后不再出现', !checks2.json?.[kidId]?.[today]?.[habitId])

  const badDate = await call('PUT', `/habits/${habitId}/checks`, { date: '2026/11/10', value: 1 }, token)
  ok('非法 date → 400', badDate.status === 400, `status=${badDate.status}`)
  const badId = await call('GET', '/habits/abc', undefined, token)
  ok('非数字 id → 400', badId.status === 400, `status=${badId.status}`)
  const missing = await call('GET', '/habits/99999999', undefined, token)
  ok('不存在 → 404', missing.status === 404, `status=${missing.status}`)

  const patched = await call('PATCH', `/habits/${habitId}`, { target: 30, on: false }, token)
  ok('PATCH 局部更新', patched.json?.target === 30 && patched.json?.on === false && patched.json?.name === '阅读')

  console.log('\n[3] 技能（含步骤）')
  const skill = await call('POST', '/skills', {
    kidId,
    name: '学骑自行车',
    dim: 'ti',
    icon: 'bike',
    tip: '先拆脚踏板',
    start: '2026-10-01',
    steps: [{ t: '戴好头盔', done: '2026-10-02' }, { t: '推着车走直线', done: '' }],
  }, token)
  ok('POST /skills 201', skill.status === 201)
  ok('步骤按顺序返回', skill.json?.steps?.[0]?.t === '戴好头盔' && skill.json.steps[1].done === '')
  const skillId = skill.json?.id

  const stepDone = await call('PATCH', `/skills/${skillId}/steps/1`, { done: '2026-10-05' }, token)
  ok('单步打勾', stepDone.json?.done === '2026-10-05')
  const skill2 = await call('GET', `/skills/${skillId}`, undefined, token)
  ok('步骤日期已落库', skill2.json?.steps?.[1]?.done === '2026-10-05')

  const skillUpd = await call('PATCH', `/skills/${skillId}`, { steps: [{ t: '唯一一步', done: '' }] }, token)
  ok('传 steps 整体替换', skillUpd.json?.steps?.length === 1 && skillUpd.json.steps[0].t === '唯一一步')

  console.log('\n[4] 日程（清单 + 每日状态）')
  const ev = await call('POST', '/events', {
    kidId,
    type: 'study',
    title: '阅读时间',
    date: today,
    start: '19:00',
    endT: '19:30',
    repeat: 'daily',
    until: '2026-12-31',
    place: '家',
    list: [{ t: '水杯', ok: true }, { t: '课外书', ok: false }],
    done: { [today]: true },
    skip: {},
    rating: 5,
    budget: 120,
  }, token)
  ok('POST /events 201', ev.status === 201, JSON.stringify(ev.json).slice(0, 100))
  const evId = ev.json?.id
  ok('清单项 ok 标记', ev.json?.list?.[0]?.ok === true && ev.json.list[1].ok === false)
  ok('done map 还原', ev.json?.done?.[today] === true)
  ok('budget 数字', ev.json?.budget === 120)

  const day = await call('PUT', `/events/${evId}/day`, { date: '2026-11-11', state: 'skip' }, token)
  ok('单独取消某天', day.json?.state === 'skip')
  const evDetail = await call('GET', `/events/${evId}`, undefined, token)
  ok('skip map 出现', evDetail.json?.skip?.['2026-11-11'] === true)

  const evRange = await call('GET', `/events?from=${today}&to=${today}`, undefined, token)
  ok('按日期区间过滤', evRange.json?.length === 1 && evRange.json[0].title === '阅读时间')
  const evOut = await call('GET', '/events?from=2020-01-01&to=2020-01-02', undefined, token)
  ok('区间外为空', Array.isArray(evOut.json) && evOut.json.length === 0)

  console.log('\n[5] 关系网 + 生日祝福')
  const p1 = await call('POST', '/people', {
    kidId,
    name: '小明',
    rel: 'friend',
    close: 3,
    gender: 'M',
    birthday: '2016-05-01',
    greeted: { 2025: true },
    mk: 2,
  }, token)
  ok('POST /people 201', p1.status === 201)
  ok('greeted map', p1.json?.greeted?.['2025'] === true)
  ok('mk 保留', p1.json?.mk === 2)

  const p2 = await call('POST', '/people', { kidId, name: '小红', rel: 'classmate', close: 2 }, token)
  ok('第二个联系人', p2.status === 201)
  const greet = await call('PUT', `/people/${p2.json?.id}/greetings`, { year: 2026, greeted: true }, token)
  ok('勾选今年祝福', greet.json?.greeted === true)
  const ungreet = await call('PUT', `/people/${p2.json?.id}/greetings`, { year: 2026, greeted: false }, token)
  ok('取消祝福', ungreet.json?.greeted === false)

  console.log('\n[6] 成长档案（身高体重 / 日记 / 能力）')
  const growth = await call('POST', '/growth', { kidId, date: today, h: 128.5, w: 26.4, vl: 1.0, vr: 0.8 }, token)
  ok('POST /growth 201', growth.status === 201 && growth.json?.h === 128.5)

  const journal = await call('POST', '/journal', { kidId, date: today, mood: 'happy', text: '第一次系好鞋带', dim: 'lao', first: true }, token)
  ok('POST /journal 201', journal.status === 201)
  ok('text 回读一致', journal.json?.text === '第一次系好鞋带' && journal.json.first === true)
  ok('t 自动补时间戳', typeof journal.json?.t === 'number' && journal.json.t > 0)

  const ability = await call('POST', '/abilities', { kidId, month: '2026-11', s: { read: 4, focus: 3 } }, token)
  ok('POST /abilities 201', ability.status === 201)
  ok('s 是对象', ability.json?.s?.read === 4)

  const badMonth = await call('POST', '/abilities', { kidId, month: '2026-11-01', s: {} }, token)
  ok('month 格式错误 → 400', badMonth.status === 400)

  console.log('\n[7] 阅读 / 成绩')
  const book = await call('POST', '/books', {
    kidId, title: '夏洛的网', author: 'E.B.怀特', status: 'done', date: '2026-10-20', rating: 5,
  }, token)
  ok('POST /books 201', book.status === 201 && book.json?.rating === 5)
  const bookList = await call('GET', `/books?kidId=${kidId}&status=done`, undefined, token)
  ok('按状态过滤', bookList.json?.length === 1)

  const exam = await call('POST', '/exams', {
    kidId, date: today, name: '期中考试', items: [{ sub: '语文', score: 95, full: 100 }, { sub: '数学', score: 98.5, full: 100 }],
  }, token)
  ok('POST /exams 201', exam.status === 201)
  ok('items 顺序与小数', exam.json?.items?.[1]?.sub === '数学' && exam.json.items[1].score === 98.5)
  const examUpd = await call('PATCH', `/exams/${exam.json?.id}`, { items: [{ sub: '英语', score: 90, full: 100 }] }, token)
  ok('items 整体替换', examUpd.json?.items?.length === 1 && examUpd.json.items[0].sub === '英语')

  console.log('\n[8] 待办')
  const t1 = await call('POST', '/todos', { text: '买牛奶' }, token)
  const t2 = await call('POST', '/todos', { text: '交班费' }, token)
  ok('POST /todos 201', t1.status === 201 && t2.status === 201)
  const done = await call('PATCH', `/todos/${t1.json?.id}`, { done: true }, token)
  ok('PATCH 完成状态', done.json?.done === true)
  const reorder = await call('PUT', '/todos/reorder', { ids: [t2.json?.id, t1.json?.id] }, token)
  ok('重排生效', reorder.json?.[0]?.text === '交班费', JSON.stringify(reorder.json?.map?.((x) => x.text)))

  console.log('\n[9] AI 会话')
  const chat = await call('POST', '/chats', {
    title: '阅读建议',
    kidId,
    tpl: 'read',
    batchOnly: true,
    msgs: [
      { role: 'user', content: '怎么让孩子爱读书', show: '怎么让孩子爱读书', t: Date.now() },
      { role: 'bot', content: '固定共读时间…', model: 'deepseek-chat', t: Date.now() },
    ],
  }, token)
  ok('POST /chats 201', chat.status === 201, JSON.stringify(chat.json).slice(0, 100))
  ok('消息顺序与 role', chat.json?.msgs?.[1]?.role === 'bot' && chat.json.msgs[0].role === 'user')
  ok('batchOnly 保留', chat.json?.batchOnly === true)
  const appended = await call('POST', `/chats/${chat.json?.id}/messages`, { role: 'user', content: '再具体一点' }, token)
  ok('追加消息', appended.json?.msgs?.length === 3 && appended.json.msgs[2].content === '再具体一点')

  console.log('\n[10] 租户隔离')
  const { token: tokenB } = await newUser('restb')
  const kidsB = await call('GET', '/kids', undefined, tokenB)
  ok('新账号看不到别人的孩子', Array.isArray(kidsB.json) && kidsB.json.length === 0)
  const habitB = await call('GET', '/habits', undefined, tokenB)
  ok('新账号看不到别人的习惯', Array.isArray(habitB.json) && habitB.json.length === 0)
  const cross = await call('GET', `/habits/${habitId}`, undefined, tokenB)
  ok('跨账号按 id 查询 → 404', cross.status === 404, `status=${cross.status}`)

  console.log('\n[11] 级联删除')
  await call('DELETE', `/kids/${kidId}`, undefined, token)
  const afterDel = await call('GET', '/habits', undefined, token)
  ok('删孩子后习惯被级联清掉', Array.isArray(afterDel.json) && afterDel.json.length === 0)
  const orphanCheck = await call('GET', `/habits/checks?from=${today}&to=${today}`, undefined, token)
  ok('打卡记录一并清掉', !orphanCheck.json?.[kidId])

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => {
  console.error('测试异常：', e)
  process.exit(1)
})
