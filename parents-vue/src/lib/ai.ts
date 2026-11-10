import { AI_PRESETS, DIMS, type AiPreset } from '@/data/constants'
import { pad2 } from '@/lib/date'
import { ageText, stageOf } from '@/lib/query'
import { downloadFile } from '@/lib/download'
import type { AppState } from '@/types'

export function presetOf(id: string): AiPreset {
  return AI_PRESETS.find((p) => p.id === id) || AI_PRESETS[AI_PRESETS.length - 1]
}

/** 系统提示词 */
export function sysPrompt(s: AppState): string {
  const p = s.settings.parent
  return (
    '你是一位温和、专业、务实的家庭教育顾问，熟悉儿童发展心理学、中国中小学教育和家庭教育，主张德智体美劳五育并举，尊重每个孩子自己的节奏。\n' +
    '写作要求：\n1. 使用简体中文，具体、口语化、能直接照着做，避免空话套话；\n2. 用 Markdown 组织内容（标题、列表，需要时用表格）；\n' +
    '3. 只依据家长提供的信息，不编造事实；信息不够时用「（可补充：……）」提示家长；\n' +
    '4. 不制造焦虑，不鼓励攀比和超前学习，看重习惯、能力和身心健康，多从孩子的角度想；不给孩子贴标签；\n' +
    '5. 涉及身体发育、疾病、心理问题时只给一般性建议，并提醒必要时咨询医生或专业人员；\n' +
    '6. 资料里「【孩子01】」「【人物07】」这样的占位符代表某个人，请原样保留，不要改写。\n' +
    `当前家长：${p.name}（${p.gender === 'F' ? '妈妈' : '爸爸'}）。家里的孩子：` +
    s.kids
      .map(
        (k) =>
          `${k.name}（${k.gender === 'F' ? '女' : '男'}，${ageText(k) || '年龄未填'}，${stageOf(k).name}${k.grade ? ' ' + k.grade : ''}）`
      )
      .join('、') +
    '。'
  )
}

const GENERIC_NAMES = /^(爸爸|妈妈|爷爷|奶奶|外公|外婆|姥姥|姥爷|哥哥|姐姐|弟弟|妹妹)$/

/* ---------- 名字脱敏 ---------- */
export function maskEnsure(s: AppState) {
  let seq = s.settings.maskSeq || 0
  s.kids.concat(s.people as any[]).forEach((x: any) => {
    if (x.mk) seq = Math.max(seq, x.mk)
  })
  s.kids.concat(s.people as any[]).forEach((x: any) => {
    if (!x.mk) x.mk = ++seq
  })
  s.settings.maskSeq = seq
}

export function maskList(s: AppState): [string, string][] {
  maskEnsure(s)
  const out: [string, string][] = []
  const seen: Record<string, 1> = {}
  s.kids.forEach((k) => {
    if (k.name && !seen[k.name]) {
      seen[k.name] = 1
      out.push([k.name, `【孩子${pad2(k.mk || 0)}】`])
    }
  })
  s.people.forEach((p) => {
    if (p.name && !seen[p.name] && !GENERIC_NAMES.test(p.name) && p.name.length >= 2) {
      seen[p.name] = 1
      out.push([p.name, `【人物${pad2(p.mk || 0)}】`])
    }
  })
  return out
}

export function maskApply(s: AppState, t: string): string {
  if (!s.settings.ai.mask || !t) return t
  maskList(s)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach((p) => {
      t = t.split(p[0]).join(p[1])
    })
  return t
}

export function maskRestore(s: AppState, t: string): string {
  if (!t) return t
  const m: Record<string, string> = {}
  maskList(s).forEach((p) => {
    m[p[1].replace(/[【】]/g, '')] = p[0]
  })
  return t.replace(/[【[](孩子|人物)(\d{1,3})[】\]]/g, (all, a, n) => m[a + pad2(+n)] || all)
}

/* ---------- 接口 ---------- */
export function aiReady(s: AppState): boolean {
  const a = s.settings.ai
  return !!(a.base && a.model && (a.key || /localhost|127\.0\.0\.1/.test(a.base)))
}
export function aiIsClaude(s: AppState): boolean {
  const a = s.settings.ai
  return a.provider === 'claude' || /anthropic\.com/.test(a.base)
}
export function aiLabel(s: AppState): string {
  const a = s.settings.ai
  return presetOf(a.provider).name.replace(/（.*）/, '') + ' · ' + (a.model || '未填模型')
}
function tempOf(a: AppState['settings']['ai']): number {
  const t = parseFloat(String(a.temp))
  return isNaN(t) ? 0.7 : Math.max(0, Math.min(1.5, t))
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function httpErr(status: number, text: string) {
  let msg = ''
  let detail = ''
  try {
    const j = JSON.parse(text)
    detail = (j.error && (j.error.message || j.error.msg)) || j.message || ''
  } catch {
    detail = String(text || '').slice(0, 160)
  }
  if (status === 401 || status === 403) msg = 'API Key 无效或没有权限，请到「设置 → AI 接口」检查。'
  else if (status === 404) msg = '接口地址或模型名不对，请检查 Base URL 和模型名称。'
  else if (status === 429) msg = '请求太频繁或额度用完了，稍后再试，或到服务商后台看看余额。'
  else if (status === 402) msg = '账户余额不足，请到服务商后台充值。'
  else if (status >= 500) msg = `AI 服务暂时出错（${status}），稍后再试。`
  else msg = `请求被拒绝（${status}）。`
  const e: any = new Error(msg + (detail ? '\n服务返回：' + detail : ''))
  e.isAI = true
  e.status = status
  return e
}

export async function aiStream(
  s: AppState,
  messages: ChatMsg[],
  onDelta: (d: string, full: string) => void,
  signal?: AbortSignal,
  maxTokens?: number
): Promise<string> {
  const a = s.settings.ai
  const base = String(a.base || '').replace(/\/+$/, '')
  let url = ''
  let req: RequestInit

  if (aiIsClaude(s)) {
    const sys = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    url = base + '/messages'
    req = {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': a.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: a.model,
        max_tokens: maxTokens || 4096,
        system: sys,
        stream: true,
        temperature: Math.min(1, tempOf(a)),
        messages: messages.filter((m) => m.role !== 'system')
      })
    }
  } else {
    url = base + '/chat/completions'
    const hd: Record<string, string> = { 'Content-Type': 'application/json' }
    if (a.key) hd.Authorization = 'Bearer ' + a.key
    const body: any = { model: a.model, messages, stream: true, temperature: tempOf(a) }
    if (maxTokens) body.max_tokens = maxTokens
    req = { method: 'POST', signal, headers: hd, body: JSON.stringify(body) }
  }

  let full = ''
  const push = (t?: string) => {
    if (t) {
      full += t
      onDelta(t, full)
    }
  }

  try {
    const res = await fetch(url, req)
    if (!res.ok) {
      const t = await res.text()
      throw httpErr(res.status, t)
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.indexOf('application/json') >= 0) {
      const j: any = await res.json()
      const t =
        j.choices && j.choices[0] && j.choices[0].message
          ? j.choices[0].message.content
          : j.content && j.content[0]
            ? j.content[0].text
            : ''
      push(t || '')
      return full
    }
    const reader = (res.body as ReadableStream<Uint8Array>).getReader()
    const dec = new TextDecoder('utf-8')
    let buf = ''
    for (;;) {
      const r = await reader.read()
      if (r.done) break
      buf += dec.decode(r.value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (let ln of lines) {
        ln = ln.trim()
        if (ln.indexOf('data:') !== 0) continue
        const p = ln.slice(5).trim()
        if (!p || p === '[DONE]') continue
        try {
          const j = JSON.parse(p)
          if (j.error) throw httpErr(400, JSON.stringify(j.error))
          if (j.type === 'content_block_delta' && j.delta) push(j.delta.text || '')
          else if (j.choices && j.choices[0] && j.choices[0].delta) push(j.choices[0].delta.content || '')
        } catch (e: any) {
          if (e && e.isAI) throw e
        }
      }
    }
    return full
  } catch (e: any) {
    if (e && e.isAI) throw e
    if (e && e.name === 'AbortError') {
      const ab: any = new Error('已停止生成')
      ab.isAI = true
      ab.abort = true
      throw ab
    }
    const ne: any = new Error(
      '连不上 AI 服务。常见原因：① 网络不通或地址填错；② 这家服务不允许网页直接调用（跨域限制）。可以换 DeepSeek、Kimi 等试试，或运行开源包里的 ai-proxy.js 做本地中转。'
    )
    ne.isAI = true
    throw ne
  }
}

/** 五育完成率一行文字（给上下文用） */
export function dimRates(s: AppState, k: string, rateOf: (d: string) => number | null): string {
  return DIMS.map((d) => {
    const r = rateOf(d.id)
    return d.t + ' ' + (r === null ? '无' : Math.round(r * 100) + '%')
  }).join('、')
}

/* ---------- Markdown ---------- */
function mdInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function mdToHtml(md: string): string {
  const lines = escHtml(md || '').split('\n')
  const out: string[] = []
  let list: { t: string; items: string[] } | null = null
  let para: string[] = []
  let tbl: string[] | null = null

  const flushP = () => {
    if (para.length) {
      out.push('<p>' + mdInline(para.join('<br>')) + '</p>')
      para = []
    }
  }
  const flushL = () => {
    if (list) {
      out.push('<' + list.t + '>' + list.items.map((x) => '<li>' + mdInline(x) + '</li>').join('') + '</' + list.t + '>')
      list = null
    }
  }
  const flushT = () => {
    if (!tbl) return
    const rows = tbl.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r))
    out.push(
      '<table>' +
        rows
          .map((r, i) => {
            const cells = r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
            return (
              '<tr>' +
              cells.map((c) => (i === 0 ? '<th>' : '<td>') + mdInline(c.trim()) + (i === 0 ? '</th>' : '</td>')).join('') +
              '</tr>'
            )
          })
          .join('') +
        '</table>'
    )
    tbl = null
  }

  lines.forEach((ln) => {
    let m: RegExpMatchArray | null
    if (/^\s*\|.*\|\s*$/.test(ln)) {
      flushP()
      flushL()
      ;(tbl = tbl || []).push(ln)
      return
    } else flushT()
    if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
      flushP()
      flushL()
      const lv = Math.min(3, m[1].length)
      out.push(`<h${lv}>` + mdInline(m[2]) + `</h${lv}>`)
      return
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) {
      flushP()
      flushL()
      out.push('<hr>')
      return
    }
    if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) {
      flushP()
      if (!list || list.t !== 'ul') {
        flushL()
        list = { t: 'ul', items: [] }
      }
      list.items.push(m[1])
      return
    }
    if ((m = ln.match(/^\s*\d+[.、)]\s+(.*)$/))) {
      flushP()
      if (!list || list.t !== 'ol') {
        flushL()
        list = { t: 'ol', items: [] }
      }
      list.items.push(m[1])
      return
    }
    if ((m = ln.match(/^\s*&gt;\s?(.*)$/))) {
      flushP()
      flushL()
      out.push('<blockquote>' + mdInline(m[1]) + '</blockquote>')
      return
    }
    if (!ln.trim()) {
      flushP()
      flushL()
      return
    }
    flushL()
    para.push(ln)
  })
  flushP()
  flushL()
  flushT()
  return out.join('')
}

/** 导出 Word（.doc） */
export function exportWord(title: string, md: string) {
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' +
    escHtml(title) +
    '</title>' +
    '<style>body{font-family:"宋体",SimSun,"Songti SC",serif;font-size:12pt;line-height:1.8}h1{font-size:18pt;text-align:center}h2{font-size:15pt}h3{font-size:13pt}table{border-collapse:collapse;margin:6pt 0}td,th{border:1px solid #999;padding:4pt 8pt}blockquote{color:#555;border-left:3px solid #ccc;padding-left:8pt}</style></head><body><h1>' +
    escHtml(title) +
    '</h1>' +
    mdToHtml(md) +
    '</body></html>'
  downloadFile(String(title).replace(/[\\/:*?"<>|]/g, '_') + '.doc', '\ufeff' + html, 'application/msword')
}
