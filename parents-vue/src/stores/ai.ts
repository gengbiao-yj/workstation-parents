import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import { aiLabel, aiReady, aiStream, maskApply, maskRestore, sysPrompt, type ChatMsg as ApiMsg } from '@/lib/ai'
import { kidContext } from '@/lib/aiCtx'
import type { TplJob } from '@/lib/aiTpl'
import { kidById } from '@/lib/query'
import { clip } from '@/lib/widgets'
import { todayStr, uid } from '@/lib/date'
import type { Chat } from '@/types'

export const useAi = defineStore('ai', () => {
  const data = useData()
  const dialogs = useDialogs()
  const ui = useUi()

  /** 当前模板分类 */
  const tab = ref('rec')
  /** 当前打开的对话 id，null 表示首页 */
  const chatId = ref<string | null>(null)
  /** 正在生成 */
  const busy = ref(false)
  /** 模板表单里选中的孩子（多孩子时用于联动 person / skill 下拉） */
  const formKid = ref('')
  /** 首页 composer 勾选的上下文 */
  const ctx = ref({ kid: true, people: false, cal: false })

  let ctrl: AbortController | null = null

  const s = computed(() => data.state)
  const ready = computed(() => aiReady(data.state))
  const label = computed(() => aiLabel(data.state))
  const chat = computed<Chat | null>(() => s.value.chats.find((c) => c.id === chatId.value) || null)

  /** 完整提示词（含系统提示词、资料、任务），供复制用 */
  function fullPrompt(job: TplJob): string {
    return maskApply(s.value, sysPrompt(s.value) + '\n\n' + (job.ctx || []).join('\n') + '\n' + job.prompt)
  }
  /** 实际发送的用户消息内容 */
  function userContent(job: TplJob): string {
    return maskApply(s.value, (job.ctx && job.ctx.length ? job.ctx.join('\n') + '\n【任务】\n' : '') + job.prompt)
  }

  function promptModal(text: string) {
    dialogs.open({ k: 'prompt', text })
  }

  function busyGuard(): boolean {
    if (busy.value) {
      ui.toast('上一个任务还在生成，等它写完或先点「停止」')
      return true
    }
    return false
  }

  /** 开始一个新对话；没配置接口时改为复制提示词 */
  function startChat(job: TplJob) {
    if (!ready.value) {
      promptModal(fullPrompt(job))
      return
    }
    if (busyGuard()) return
    dialogs.close()
    const c: Chat = {
      id: uid('c'),
      title: job.title || '新对话',
      t: Date.now(),
      tpl: job.tpl || '',
      kid: job.kid || '',
      msgs: [{ role: 'user', show: job.show, content: userContent(job) }]
    }
    s.value.chats.unshift(c)
    data.save(true)
    chatId.value = c.id
    router.push({ path: '/ai', query: { chat: c.id } })
    runChat(c)
  }

  /** 首页输入框直接提问 */
  function ask(text: string) {
    const t = text.trim()
    if (!t || busy.value) return
    if (chatId.value) {
      followUp(t)
      return
    }
    const k = data.curKid
    const c: string[] = []
    if (k && (ctx.value.kid || ctx.value.people || ctx.value.cal)) {
      c.push(kidContext(s.value, k, { people: ctx.value.people, cal: ctx.value.cal, journal: ctx.value.kid ? 5 : 0 }))
    }
    startChat({ title: t.slice(0, 26), show: t, prompt: t, ctx: c, kid: k ? k.id : '' })
  }

  function followUp(text: string) {
    const c = chat.value
    if (!c) return
    if (busyGuard()) return
    c.msgs.push({ role: 'user', show: text, content: maskApply(s.value, text) })
    data.save(true)
    runChat(c)
  }

  async function runChat(c: Chat) {
    const hist: ApiMsg[] = c.msgs
      .filter((m) => !m.err && !m.batch && (m.role === 'user' || (m.content && m.content.trim())))
      .map((m) => ({
        role: (m.role === 'bot' ? 'assistant' : 'user') as ApiMsg['role'],
        content: m.role === 'bot' ? maskApply(s.value, m.content) : m.content
      }))
    const msgs: ApiMsg[] = [{ role: 'system', content: sysPrompt(s.value) }, ...hist]
    c.msgs.push({ role: 'bot', content: '', streaming: true })
    const bot = c.msgs[c.msgs.length - 1]
    busy.value = true
    ctrl = new AbortController()
    try {
      await aiStream(
        s.value,
        msgs,
        (_d, full) => {
          bot.content = maskRestore(s.value, full)
        },
        ctrl.signal
      )
      bot.streaming = false
      busy.value = false
      c.t = Date.now()
      data.save()
    } catch (e: any) {
      bot.streaming = false
      busy.value = false
      if (!bot.content) bot.err = e.message
      else bot.content += '\n\n（' + e.message + '）'
      data.save()
    }
  }

  function stop() {
    if (ctrl) ctrl.abort()
  }

  function regen() {
    const c = chat.value
    if (!c || busy.value) return
    while (c.msgs.length && c.msgs[c.msgs.length - 1].role === 'bot') c.msgs.pop()
    if (!c.msgs.length) return
    runChat(c)
  }

  function openChat(id: string) {
    chatId.value = id
    router.push({ path: '/ai', query: { chat: id } })
  }

  function goHome() {
    chatId.value = null
    router.push({ path: '/ai' })
  }

  async function delChat() {
    const c = chat.value
    if (!c) return
    const ok = await ui.confirm('删除对话', `确定删除「${c.title}」吗？`, '删除', true)
    if (!ok) return
    s.value.chats = s.value.chats.filter((x) => x.id !== c.id)
    chatId.value = null
    data.save(true)
    router.push({ path: '/ai' })
  }

  /** 把某条回答存进成长日记 */
  function saveToJournal(i: number) {
    const c = chat.value
    if (!c) return
    const k = kidById(s.value, c.kid || '')
    if (!k) return
    const txt = (c.msgs[i].content || '').replace(/[#*>`|]/g, '').trim()
    s.value.journal.push({
      id: uid('j'),
      kid: k.id,
      date: todayStr(),
      mood: '',
      text: '【' + c.title + '】' + clip(txt.replace(/\s+/g, ' '), 400),
      dim: '',
      first: false,
      t: Date.now()
    })
    data.save(true)
    ui.toast('已存进' + k.name + '的成长日记')
  }

  /** 复制某条消息 */
  function msgText(i: number): string {
    const c = chat.value
    return (c && c.msgs[i] && c.msgs[i].content) || ''
  }

  /** 整段对话导出用的 markdown */
  function chatMarkdown(): string {
    const c = chat.value
    if (!c) return ''
    return c.msgs
      .filter((m) => m.role === 'bot' && !m.err)
      .map((m) => m.content)
      .join('\n\n---\n\n')
  }

  /** 改为复制提示词（对话失败时的兜底） */
  function copyChatPrompt() {
    const c = chat.value
    if (!c) return
    const all =
      sysPrompt(s.value) +
      '\n\n' +
      c.msgs
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n\n')
    promptModal(all)
  }

  return {
    tab,
    chatId,
    busy,
    formKid,
    ctx,
    ready,
    label,
    chat,
    ask,
    startChat,
    followUp,
    stop,
    regen,
    openChat,
    goHome,
    delChat,
    saveToJournal,
    msgText,
    chatMarkdown,
    copyChatPrompt,
    fullPrompt,
    promptModal,
    busyGuard
  }
})

export type AiStore = ReturnType<typeof useAi>
