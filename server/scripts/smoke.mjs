/**
 * 冒烟测试：覆盖 健康检查 / 注册 / 登录 / 设置 / 孩子 CRUD / 鉴权拦截
 * 用法：node scripts/smoke.mjs [baseUrl]
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

const run = async () => {
  const suffix = Date.now().toString(36)
  const username = `smoke_${suffix}`
  const password = 'Smoke#2026'

  console.log('\n[1] 健康检查')
  const health = await call('GET', '/health')
  ok('GET /health 200', health.status === 200, `status=${health.status}`)
  ok('数据库连通', health.json?.db === 'up', `db=${health.json?.db}`)

  console.log('\n[2] 鉴权')
  const unauthed = await call('GET', '/kids')
  ok('未带 token 访问被拒', unauthed.status === 401, `status=${unauthed.status}`)

  const reg = await call('POST', '/auth/register', { username, password, nickname: '冒烟' })
  ok('注册成功', reg.status === 201 && !!reg.json?.token, `status=${reg.status}`)
  const token = reg.json?.token

  const dup = await call('POST', '/auth/register', { username, password })
  ok('重复用户名返回 409', dup.status === 409, `status=${dup.status}`)

  const badLogin = await call('POST', '/auth/login', { username, password: 'wrong-pass' })
  ok('错误密码返回 401', badLogin.status === 401, `status=${badLogin.status}`)

  const login = await call('POST', '/auth/login', { username, password })
  ok('登录成功', login.status === 200 && !!login.json?.token, `status=${login.status}`)

  const me = await call('GET', '/auth/me', undefined, token)
  ok('GET /auth/me 返回用户名', me.json?.username === username, `username=${me.json?.username}`)

  console.log('\n[3] 设置')
  const s1 = await call('GET', '/settings', undefined, token)
  ok('首次读取自动建行', s1.status === 200 && !!s1.json?.parent, `status=${s1.status}`)
  ok('ai.temp 默认 0.7', Number(s1.json?.ai?.temp) === 0.7, `temp=${s1.json?.ai?.temp}`)

  const s2 = await call(
    'PATCH',
    '/settings',
    { parent: { name: '妈妈', gender: 'F' }, ai: { temp: 0.4, model: 'deepseek-chat' }, cur: '1' },
    token,
  )
  ok('PATCH 部分更新生效', s2.json?.parent?.name === '妈妈' && s2.json?.ai?.model === 'deepseek-chat')
  ok('未提交字段保持不变', s2.json?.anim === true, `anim=${s2.json?.anim}`)

  console.log('\n[4] 孩子档案 CRUD')
  const c1 = await call(
    'POST',
    '/kids',
    { name: '小满', gender: 'F', birthday: '2018-05-20', stage: 'p1', tags: ['画画', '滑板'] },
    token,
  )
  ok('创建成功', c1.status === 201 && !!c1.json?.id, `status=${c1.status}`)
  ok('id 是字符串', typeof c1.json?.id === 'string', `id=${JSON.stringify(c1.json?.id)} type=${typeof c1.json?.id}`)
  ok('tags 存成数组', Array.isArray(c1.json?.tags) && c1.json.tags.length === 2, `${JSON.stringify(c1.json?.tags)}`)

  const kidId = c1.json?.id
  const list = await call('GET', '/kids', undefined, token)
  ok('列表返回 1 条', Array.isArray(list.json) && list.json.length === 1, `len=${list.json?.length}`)

  const one = await call('GET', `/kids/${kidId}`, undefined, token)
  ok('按 id 查询', one.json?.name === '小满', `name=${one.json?.name}`)

  const p1 = await call('PATCH', `/kids/${kidId}`, { note: '换牙期', health: '视力 5.0' }, token)
  ok('部分更新', p1.json?.note === '换牙期' && p1.json?.name === '小满', `note=${p1.json?.note}`)

  const bad = await call('GET', '/kids/999999', undefined, token)
  ok('不存在的 id 返回 404', bad.status === 404, `status=${bad.status}`)

  const nonNum = await call('GET', '/kids/abc', undefined, token)
  ok('非数字 id 返回 400', nonNum.status === 400, `status=${nonNum.status}`)

  const d1 = await call('DELETE', `/kids/${kidId}`, undefined, token)
  ok('删除成功', d1.status === 200 || d1.status === 204, `status=${d1.status}`)

  const after = await call('GET', '/kids', undefined, token)
  ok('删除后列表为空', Array.isArray(after.json) && after.json.length === 0, `len=${after.json?.length}`)

  console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => {
  console.error('冒烟测试异常：', e)
  process.exit(1)
})
