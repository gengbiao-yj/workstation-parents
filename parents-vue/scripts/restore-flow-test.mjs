/**
 * 找回流程测试：「清空浏览器数据 → 登录 → 云端记录载入」。
 *
 * 用无头 Chrome（CDP）打开真实的开发服务器，在全新的浏览器 profile 里
 * 走一遍完整路径，验证欢迎页的登录入口、账号记忆、云端覆盖本地、刷新后保持。
 *
 * 前置：后端 npm run dev（3000）+ 前端 npm run dev（5173），且库里有带数据的测试账号。
 * 运行：npm run test:restore
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
// 一个在库里确实有数据的账号（同步测试脚本留下的）
const USER = process.env.TEST_USER || 'sync_mwaglghj'
const PASS = process.env.TEST_PASS || 'Sync#2026'
const APP = process.env.APP_BASE || 'http://localhost:5173/'
const profile = mkdtempSync(join(tmpdir(), 'jz-cdp-'))
let pass = 0
let fail = 0
const ok = (cond, label, extra = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${label}${extra ? ' — ' + extra : ''}`)
  } else {
    fail++
    console.log(`  FAIL  ${label}${extra ? ' — ' + extra : ''}`)
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank',
])

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      const j = await r.json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch {
      /* 还没起来 */
    }
    await sleep(250)
  }
  throw new Error('Chrome 没起来')
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.waiters = new Map()
    this.events = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.waiters.has(msg.id)) {
        const { resolve, reject } = this.waiters.get(msg.id)
        this.waiters.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      } else if (msg.method) {
        this.events.push(msg)
      }
    })
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id
    const sid = sessionId ?? this.sessionId
    return new Promise((resolve, reject) => {
      this.waiters.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }))
    })
  }
  async evaluate(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }
}

const main = async () => {
  const browserWs = await wsUrl()
  const ws = new WebSocket(browserWs)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
  const cdp = new Cdp(ws)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  cdp.sessionId = sessionId
  const s = (m, p) => cdp.send(m, p, sessionId)

  await s('Page.enable')
  await s('Runtime.enable')
  await s('Page.navigate', { url: APP })
  await sleep(3500)

  // 0) 确认是「清空过数据」的初始态：本地空、未登录
  const boot = await cdp.evaluate(`
    const raw = localStorage.getItem('jz-workbench-v1');
    return { hasData: !!raw, token: !!localStorage.getItem('jz-api-token'), welcome: !!document.querySelector('.welcome') };
  `)
  ok(boot.hasData === false, '模拟清空浏览器数据：localStorage 无数据')
  ok(boot.token === false, '模拟清空浏览器数据：没有 token')
  ok(boot.welcome === true, '首屏显示欢迎页')

  // 1) 欢迎页是否有「已有账号，登录载入」入口
  const entry = await cdp.evaluate(`
    const btn = document.querySelector('.w-restore button');
    return { text: btn ? btn.textContent.trim() : '', hint: (document.querySelector('.w-restore span')||{}).textContent || '' };
  `)
  ok(!!entry.text && entry.text.includes('已有账号'), '欢迎页出现登录入口', entry.text)
  console.log(`        提示文案：${entry.hint.trim()}`)

  // 2) 点开弹窗
  await cdp.evaluate(`document.querySelector('.w-restore button').click(); return 1;`)
  await sleep(400)
  const modal = await cdp.evaluate(`
    const m = document.querySelector('.w-modal');
    return { open: !!m, inputs: m ? m.querySelectorAll('input.inp').length : 0, title: m ? m.querySelector('.w-modal-head b').textContent : '' };
  `)
  ok(modal.open === true, '点击后弹出登录框', modal.title)
  ok(modal.inputs >= 2, '登录框有账号 / 密码输入框', `inputs=${modal.inputs}`)

  // 3) 填入库里真实有数据的账号并登录
  await cdp.evaluate(`
    const set = (el, v) => {
      const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      d.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const box = document.querySelector('.w-modal');
    const ins = box.querySelectorAll('input.inp');
    set(ins[0], '${USER}');
    set(ins[1], '${PASS}');
    return 1;
  `)
  await sleep(200)
  await cdp.evaluate(`
    const btns = [...document.querySelectorAll('.w-modal button.btn-dark')];
    btns[btns.length - 1].click();
    return 1;
  `)
  await sleep(4000)

  // 4) 登录后：欢迎页应消失，数据应变成云端的两个孩子
  const after = await cdp.evaluate(`
    const raw = localStorage.getItem('jz-workbench-v1');
    let st = null;
    try { st = JSON.parse(raw || 'null'); } catch {}
    return {
      welcome: !!document.querySelector('.welcome'),
      token: !!localStorage.getItem('jz-api-token'),
      last: localStorage.getItem('jz-last-user') || '',
      kids: st ? (st.kids || []).map(k => k.name) : null,
      habits: st ? (st.habits || []).length : -1,
      onboarded: st ? !!(st.settings && st.settings.onboarded) : false,
      url: location.hash,
    };
  `)
  ok(after.token === true, '登录成功并保存 token')
  ok(after.last === USER, '记住上次账号', after.last)
  ok(after.welcome === false, '云端有数据时欢迎页自动关闭')
  ok(after.onboarded === true, '引导态来自云端数据')
  ok(Array.isArray(after.kids) && after.kids.length === 2, '云端两个孩子已载入本机', JSON.stringify(after.kids))
  ok(after.habits === 3, '云端打卡项已载入本机', `habits=${after.habits}`)
  ok(after.url.includes('/home'), '登录后进入工作台', after.url)

  // 5) 刷新页面：应走 restore + attach 自动接回云端数据
  await s('Page.navigate', { url: APP })
  await sleep(3500)
  const reload = await cdp.evaluate(`
    const raw = localStorage.getItem('jz-workbench-v1');
    let st = null;
    try { st = JSON.parse(raw || 'null'); } catch {}
    return { welcome: !!document.querySelector('.welcome'), kids: st ? (st.kids || []).length : -1 };
  `)
  ok(reload.welcome === false, '刷新后不再弹引导页')
  ok(reload.kids === 2, '刷新后数据仍是云端的两个孩子', `kids=${reload.kids}`)

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
}

main()
  .catch((e) => {
    console.error('脚本出错：', e.message)
    fail++
  })
  .finally(async () => {
    try {
      chrome.kill()
    } catch {
      /* ignore */
    }
    await sleep(600)
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    process.exit(fail ? 1 : 0)
  })
