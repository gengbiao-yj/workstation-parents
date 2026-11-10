/**
 * data store 集成测试。
 *
 * 验证：pinia 里的 sync 实例（markRaw）方法能正常工作、attach() 能接管云端数据、
 * 深度 watch 后调用 syncNow 能落库。打包 stores/data.ts 在 Node 里跑。
 *
 * 用法：node scripts/store-test.mjs
 */
import { build } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outDir = resolve(root, '.tmp-store')
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
      lib: { entry: resolve(root, 'src/stores/data.ts'), formats: ['es'], fileName: () => 'data.mjs' },
      outDir,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { external: ['vue', 'pinia'] },
    },
  })
  return pathToFileURL(resolve(outDir, 'data.mjs')).href
}

async function register() {
  const username = `store_${Date.now().toString(36)}`
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'Store#2026' }),
  })
  const json = await res.json()
  return json.token
}

async function exportState(token) {
  const res = await fetch(`${API}/export`, { headers: { authorization: `Bearer ${token}` } })
  return res.json()
}

const run = async () => {
  globalThis.window = globalThis
  const token = await register()
  globalThis.localStorage = memoryStorage({ 'jz-api-token': token })

  const out = await bundle()
  const [{ createPinia, setActivePinia }] = await Promise.all([import('pinia')])
  setActivePinia(createPinia())
  const mod = await import(out)
  const data = mod.useData()

  console.log('\n[1] store 初始化')
  ok('空状态起步', data.state.kids.length === 0)
  ok('sync 可访问', !!data.sync && typeof data.sync.syncNow === 'function')

  console.log('\n[2] 通过 store 写入（加孩子，临时 id）')
  data.state.kids.push({
    id: 'k1',
    name: '小满',
    gender: 'F',
    birthday: '2017-04-12',
    stage: 'p1',
    color: 1,
    school: '',
    grade: '二年级',
    cls: '',
    teacher: '',
    interests: '',
    personality: '',
    health: '',
    note: '',
    tags: [],
  })
  data.state.settings.cur = 'k1'
  data.state.todos.push({ id: 't1', text: '买牛奶', done: false })

  // 走 flush 而不是 syncNow，验证 pinia 里方法内部的 this.status.value 没被打断
  await data.sync.flush()
  ok('状态回到 idle', data.sync.status.value === 'idle', `status=${data.sync.status.value}`)
  ok('孩子 id 已变成数字', /^\d+$/.test(data.state.kids[0].id), `id=${data.state.kids[0].id}`)
  ok('settings.cur 同步换了', data.state.settings.cur === data.state.kids[0].id)

  let remote = await exportState(token)
  ok('云端有孩子和待办', remote.kids.length === 1 && remote.todos.length === 1)

  console.log('\n[3] 深度 watch → 自动排队同步')
  data.state.todos[0].done = true
  // watch 是异步触发的，手动跑一次 flush 等价于等待防抖到期
  await new Promise((r) => setTimeout(r, 50))
  await data.sync.flush()
  remote = await exportState(token)
  ok('改动已落库', remote.todos[0].done === true)

  console.log('\n[4] attach()：已登录时接管云端数据')
  const state2 = memoryStorage({ 'jz-api-token': token })
  globalThis.localStorage = state2
  setActivePinia(createPinia())
  const data2 = mod.useData()
  // 模拟本机已有别的数据（会被云端覆盖）
  data2.state.kids.push({ id: 'zz', name: '本地临时', gender: 'M', birthday: '', stage: 'k', color: 0, school: '', grade: '', cls: '', teacher: '', interests: '', personality: '', health: '', note: '', tags: [] })
  const result = await data2.attach()
  ok('attach 返回 pulled', result === 'pulled', `result=${result}`)
  ok('云端覆盖本地', data2.state.kids.length === 1 && data2.state.kids[0].name === '小满')

  console.log('\n[5] detach()：退出后不再同步')
  data2.detach()
  data2.state.todos.push({ id: 't2', text: '退出后的改动', done: false })
  await new Promise((r) => setTimeout(r, 30))
  const after = await exportState(token)
  ok('退出后不再写云端', !after.todos.some((t) => t.text === '退出后的改动'))

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => {
  console.error('测试异常：', e)
  process.exit(1)
})
