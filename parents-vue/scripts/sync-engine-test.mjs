/**
 * 同步引擎端到端测试。
 *
 * 把 src/lib/sync.ts 用 vite 打成 ESM（vue 走 external），在 Node 里跑真实接口，
 * 验证「临时 id → 服务端 id」的替换、增量修改、删除、打卡 map 的增删。
 *
 * 用法：node scripts/sync-engine-test.mjs
 * 前置：后端已在 127.0.0.1:3000 运行
 */
import { build } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
// 产物必须放在项目内，否则 bundle 里的 `import 'vue'` 解析不到 node_modules
const outDir = resolve(root, '.tmp-sync')
const API = process.env.API_BASE || 'http://127.0.0.1:3000/api'

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

function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  }
}

async function bundle() {
  await build({
    root,
    configFile: false,
    logLevel: 'error',
    resolve: { alias: { '@': resolve(root, 'src') } },
    define: { 'import.meta.env.VITE_API_BASE': JSON.stringify(API) },
    build: {
      lib: { entry: resolve(root, 'src/lib/sync.ts'), formats: ['es'], fileName: () => 'sync.mjs' },
      outDir,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { external: ['vue'] },
    },
  })
  return resolve(outDir, 'sync.mjs')
}

async function register() {
  const username = `eng_${Date.now().toString(36)}`
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'Engine#2026' }),
  })
  const json = await res.json()
  return json.token
}

async function exportState(token) {
  const res = await fetch(`${API}/export`, { headers: { authorization: `Bearer ${token}` } })
  return res.json()
}

function emptyState() {
  return {
    v: 1,
    demo: false,
    settings: {
      parent: { name: '妈妈', gender: 'F' },
      partner: { show: false, name: '爸爸', gender: 'M' },
      anim: true,
      cat: true,
      ai: { provider: 'deepseek', base: 'https://api.deepseek.com', key: '', model: 'deepseek-chat', mask: true, temp: 0.7 },
      lastBackup: 0,
      onboarded: true,
      cur: '',
      maskSeq: 0,
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
    chats: [],
  }
}

const run = async () => {
  // sync.ts 里用了 window.setTimeout
  globalThis.window = globalThis

  const out = await bundle()
  const token = await register()
  // api.ts 在模块初始化时就读 token，所以 stub 必须先装好再 import
  globalThis.localStorage = memoryStorage({ 'jz-api-token': token })

  const { ref } = await import('vue')
  const { SyncEngine } = await import(pathToFileURL(out).href)

  const state = ref(emptyState())
  const engine = new SyncEngine(state)

  console.log('\n[1] 首次同步：临时 id 换成服务端 id')
  state.value.kids.push({
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
    interests: '',
    personality: '',
    health: '',
    note: '',
    tags: ['爱阅读'],
  })
  state.value.settings.cur = 'k1'
  await engine.syncNow()

  const kid = state.value.kids[0]
  ok('孩子 id 已替换成数字', /^\d+$/.test(kid.id), `id=${kid.id}`)
  ok('settings.cur 跟着改', state.value.settings.cur === kid.id, `cur=${state.value.settings.cur}`)
  ok('无报错', !engine.error.value, engine.error.value)

  console.log('\n[2] 习惯 + 打卡（依赖上一步的真实 id）')
  state.value.habits.push({
    id: 'h1',
    kid: kid.id,
    dim: 'zhi',
    name: '阅读',
    unit: '分钟',
    target: 20,
    days: [1, 2, 3, 4, 5],
    on: true,
    kind: 'read',
    since: '2026-09-01',
  })
  state.value.checks[kid.id] = { '2026-11-10': { h1: 25 } }
  await engine.syncNow()

  const habit = state.value.habits[0]
  ok('习惯 id 已替换', /^\d+$/.test(habit.id), `id=${habit.id}`)
  ok('打卡 key 换成新 id', !!state.value.checks[kid.id]['2026-11-10'][habit.id], JSON.stringify(state.value.checks))

  let remote = await exportState(token)
  ok('服务端有 1 个孩子 1 个习惯', remote.kids.length === 1 && remote.habits.length === 1)
  ok('打卡值 = 25', remote.checks?.[kid.id]?.['2026-11-10']?.[habit.id] === 25)

  console.log('\n[3] 修改与删除')
  habit.target = 30
  habit.on = false
  await engine.syncNow()
  remote = await exportState(token)
  ok('PATCH 生效', remote.habits[0].target === 30 && remote.habits[0].on === false)

  state.value.checks[kid.id]['2026-11-10'][habit.id] = 45
  await engine.syncNow()
  remote = await exportState(token)
  ok('打卡值更新为 45', remote.checks?.[kid.id]?.['2026-11-10']?.[habit.id] === 45)

  delete state.value.checks[kid.id]['2026-11-10'][habit.id]
  await engine.syncNow()
  remote = await exportState(token)
  ok('取消打卡后服务端也清掉', remote.checks?.[kid.id]?.['2026-11-10']?.[habit.id] === undefined)

  state.value.habits.splice(0, 1)
  await engine.syncNow()
  remote = await exportState(token)
  ok('DELETE 生效', remote.habits.length === 0)

  console.log('\n[4] 嵌套子结构（步骤 / 清单 / 成绩 / 消息 / 祝福）')
  state.value.skills.push({
    id: 's1',
    kid: kid.id,
    name: '学骑自行车',
    dim: 'ti',
    icon: 'bike',
    tip: '',
    start: '2026-10-01',
    note: '',
    steps: [
      { t: '戴好头盔', done: '2026-10-02' },
      { t: '独立骑行', done: '' },
    ],
  })
  state.value.events.push({
    id: 'e1',
    kid: kid.id,
    type: 'study',
    title: '阅读时间',
    date: '2026-11-10',
    start: '19:00',
    endT: '',
    repeat: 'none',
    until: '',
    place: '家',
    note: '',
    list: [{ t: '水杯', ok: true }],
    done: { '2026-11-10': true },
    skip: {},
    review: '',
    fav: '',
    rating: 0,
  })
  state.value.people.push({
    id: 'p1',
    kid: kid.id,
    name: '小明',
    rel: 'friend',
    label: '',
    close: 3,
    gender: 'M',
    birthday: '',
    likes: '',
    contact: '',
    note: '',
    met: '',
    greeted: { 2026: true },
  })
  state.value.exams.push({
    id: 'x1',
    kid: kid.id,
    date: '2026-11-05',
    name: '期中',
    note: '',
    items: [
      { sub: '语文', score: 95, full: 100 },
      { sub: '数学', score: 98.5, full: 100 },
    ],
  })
  state.value.todos.push({ id: 't1', text: '买牛奶', done: false })
  state.value.chats.push({
    id: 'c1',
    title: '阅读建议',
    kid: kid.id,
    t: Date.now(),
    msgs: [
      { role: 'user', content: '怎么让孩子爱读书', t: Date.now() },
      { role: 'bot', content: '固定共读时间…', model: 'deepseek-chat', t: Date.now() },
    ],
  })
  await engine.syncNow()

  remote = await exportState(token)
  ok('技能步骤落库', remote.skills?.[0]?.steps?.length === 2 && remote.skills[0].steps[0].done === '2026-10-02')
  ok('日程清单与 done', remote.events?.[0]?.list?.[0]?.ok === true && remote.events[0].done?.['2026-11-10'] === true)
  ok('生日祝福', remote.people?.[0]?.greeted?.['2026'] === true)
  ok('成绩小数', remote.exams?.[0]?.items?.[1]?.score === 98.5)
  ok('待办', remote.todos?.[0]?.text === '买牛奶')
  ok('会话消息', remote.chats?.[0]?.msgs?.[1]?.role === 'bot')

  console.log('\n[5] 改子结构（改一步、勾一天、多一年祝福）')
  state.value.skills[0].steps[1].done = '2026-11-09'
  state.value.events[0].skip['2026-11-11'] = true
  state.value.people[0].greeted['2025'] = true
  await engine.syncNow()
  remote = await exportState(token)
  ok('步骤状态更新', remote.skills[0].steps[1].done === '2026-11-09')
  ok('skip 增加一天', remote.events[0].skip?.['2026-11-11'] === true)
  ok('祝福多一年', remote.people[0].greeted?.['2025'] === true)

  console.log('\n[6] 再次拉取（换设备视角）')
  const pulled = await engine.pull()
  ok('pull 拿到完整数据', pulled.kids.length === 1 && pulled.skills.length === 1)
  await engine.syncNow()
  const again = await exportState(token)
  ok('pull 后重建快照，不会重复插入', again.skills.length === 1 && again.events.length === 1)

  console.log('\n[7] bootstrap：云端有数据时以云端为准')
  const state2 = ref(emptyState())
  state2.value.kids.push({ id: 'k9', name: '本地新增', gender: 'M', birthday: '', stage: 'k', color: 0, school: '', grade: '', cls: '', teacher: '', interests: '', personality: '', health: '', note: '', tags: [] })
  const engine2 = new SyncEngine(state2)
  const mode = await engine2.bootstrap()
  ok('返回 pulled', mode === 'pulled', `mode=${mode}`)
  ok('用云端覆盖本地', state2.value.kids.length === 1 && state2.value.kids[0].name === '小满')

  console.log('\n[8] 断网降级')
  const savedFetch = globalThis.fetch
  globalThis.fetch = () => Promise.reject(new Error('offline'))
  state2.value.todos.push({ id: 't9', text: '离线待办', done: false })
  await engine2.syncNow()
  ok('状态标记为 offline', engine2.status.value === 'offline', `status=${engine2.status.value}`)
  globalThis.fetch = savedFetch
  await engine2.syncNow()
  ok('恢复后补推成功', engine2.status.value === 'idle', `status=${engine2.status.value}`)
  const after = await exportState(token)
  ok('断网期间的改动已落库', after.todos.some((t) => t.text === '离线待办'))

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => {
  console.error('测试异常：', e)
  process.exit(1)
})
