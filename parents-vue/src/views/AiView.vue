<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import { useAi } from '@/stores/ai'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import { useUi } from '@/stores/ui'
import { TPL_CATS, tplList, type TplDef } from '@/lib/aiTpl'
import { exportWord, mdToHtml } from '@/lib/ai'
import { copyText } from '@/lib/download'
import { fmtTime } from '@/lib/date'

const ai = useAi()
const data = useData()
const dialogs = useDialogs()
const ui = useUi()
const route = useRoute()
const router = useRouter()

const state = computed(() => data.state)
const k = computed(() => data.curKid)
const input = ref('')
const threadEl = ref<HTMLElement | null>(null)

/** 家庭教育助手的头像 */
function aiAvatar(size: number): string {
  return (
    `<svg class="ava" viewBox="-24 -24 48 48" width="${size}" height="${size}" aria-hidden="true"><circle r="24" fill="#171717"/>` +
    '<circle cx="0" cy="-1" r="11" fill="#fff"/><path d="M-5 -10 L-3 -15 L0 -11 L3 -16 L5 -10 Z" fill="#fff"/>' +
    '<ellipse cx="-4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/><ellipse cx="4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/>' +
    '<path d="M-10 10 Q0 15 10 10 L11 15 Q0 20 -11 15 Z" fill="#2f7ff0"/></svg>'
  )
}
const avatarBig = computed(() => aiAvatar(60))

const list = computed(() => tplList(state.value, ai.tab, k.value))
const recent = computed(() => state.value.chats.slice(0, 8))
const placeholder = computed(
  () => '直接说遇到了什么，比如：' + (k.value ? k.value.name : '孩子') + '最近写作业总是拖到很晚，我该怎么办？'
)

function toggleCtx(key: 'kid' | 'people' | 'cal') {
  ai.ctx[key] = !ai.ctx[key]
}

function send() {
  const t = input.value.trim()
  if (!t) return
  if (ai.chat) {
    ai.followUp(t)
    input.value = ''
    return
  }
  ai.ask(t)
  input.value = ''
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

function goSettings() {
  router.push({ path: '/settings', query: { sec: 'ai' } })
}

function openTpl(t: TplDef) {
  if (!state.value.kids.length) {
    ui.toast('先添加孩子')
    return
  }
  dialogs.open({ k: 'aiTpl', id: t.id })
}

/* ---------- 对话线程 ---------- */
const chat = computed(() => ai.chat)
const msgs = computed(() => (chat.value ? chat.value.msgs : []))
/** 当前对话关联的孩子 id，决定能不能存进成长日记 */
const chatKid = computed(() => (chat.value ? chat.value.kid || '' : ''))

function scrollBottom(force = false) {
  const el = threadEl.value
  if (!el) return
  if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 180) el.scrollTop = el.scrollHeight
}

watch(
  () => {
    const c = chat.value
    if (!c) return 0
    const last = c.msgs[c.msgs.length - 1]
    return c.msgs.length * 100000 + (last ? last.content.length : 0)
  },
  () => nextTick(() => scrollBottom())
)

function mdHtml(m: { content: string; streaming?: boolean }): string {
  return mdToHtml(m.content) + (m.streaming ? '<span class="cursor"></span>' : '')
}

function copyMsg(i: number) {
  copyText(ai.msgText(i))
}

function exportMsg(i: number) {
  const c = chat.value
  if (c) exportWord(c.title, c.msgs[i].content)
}

function exportChat() {
  const c = chat.value
  if (!c) return
  exportWord(c.title, ai.chatMarkdown())
}

/* ---------- 路由 ---------- */
function handleQuery() {
  const q = route.query
  if (q.tpl) {
    const id = String(q.tpl)
    if (!state.value.kids.length) {
      ui.toast('先添加孩子')
    } else {
      dialogs.open({
        k: 'aiTpl',
        id,
        person: q.person ? String(q.person) : undefined,
        skill: q.skill ? String(q.skill) : undefined
      })
    }
    router.replace({ path: '/ai' })
    return
  }
  const id = q.chat ? String(q.chat) : null
  if (id !== ai.chatId) ai.chatId = id
}

onMounted(() => {
  handleQuery()
  nextTick(() => scrollBottom(true))
})

watch(() => route.query.chat, handleQuery)
watch(() => route.query.tpl, handleQuery)

// 进入某个对话、新增消息、生成结束时都滚到底
watch(
  () => ai.chatId,
  () => nextTick(() => scrollBottom(true))
)
watch(
  () => msgs.value.length,
  () => nextTick(() => scrollBottom(true))
)
watch(
  () => ai.busy,
  (v) => {
    if (!v) nextTick(() => scrollBottom(true))
  }
)
</script>

<template>
  <div class="ai-page">
    <!-- 首页 -->
    <div v-if="!chat" class="ai-home scroll">
      <div class="ai-wrap">
        <div class="ai-hello">
          <span class="ai-ava" v-html="avatarBig"></span>
          <div>
            <h1>家庭教育助手</h1>
            <p>
              {{ state.settings.parent.name }}，出游规划、学习计划、睡前故事、和孩子谈心都可以问我 ·
              <button class="api-pill" :class="{ ok: ai.ready }" title="AI 接口设置" @click="goSettings">
                <i></i>{{ ai.ready ? ai.label : '未配置 AI 接口 · 生成时可复制提示词' }}
              </button>
            </p>
          </div>
        </div>

        <div class="composer">
          <textarea v-model="input" :placeholder="placeholder" @keydown="onKey"></textarea>
          <div class="composer-bar">
            <template v-if="k">
              <button class="ctx-chip" :class="{ on: ai.ctx.kid }" @click="toggleCtx('kid')">
                <Icon :name="ai.ctx.kid ? 'check' : 'plus'" :size="13" />{{ k.name }}的情况
              </button>
              <button class="ctx-chip" :class="{ on: ai.ctx.people }" @click="toggleCtx('people')">
                <Icon :name="ai.ctx.people ? 'check' : 'plus'" :size="13" />关系网
              </button>
              <button class="ctx-chip" :class="{ on: ai.ctx.cal }" @click="toggleCtx('cal')">
                <Icon :name="ai.ctx.cal ? 'check' : 'plus'" :size="13" />近期日程
              </button>
            </template>
            <span class="grow"></span>
            <label class="chk muted mask-chk" title="孩子和朋友的名字会替换成【孩子01】这样的编号再发给 AI，结果回来后自动换回">
              <input v-model="state.settings.ai.mask" type="checkbox" />隐去名字
            </label>
            <button class="send" aria-label="发送" @click="send"><Icon name="send" :size="17" /></button>
          </div>
        </div>

        <div class="tpl-tabs">
          <button v-for="c in TPL_CATS" :key="c[0]" :class="{ on: ai.tab === c[0] }" @click="ai.tab = c[0]">
            {{ c[1] }}
          </button>
        </div>
        <div class="tpl-grid">
          <button v-for="t in list" :key="t.id" class="tpl" @click="openTpl(t)">
            <div class="t">
              <i :style="{ background: t.color + '1a', color: t.color }">{{ t.ico }}</i>{{ t.title }}
            </div>
            <div class="d">{{ t.desc }}</div>
          </button>
        </div>

        <template v-if="recent.length">
          <div class="tpl-tabs"><button class="on static">最近对话</button></div>
          <div class="mini-list">
            <button v-for="c in recent" :key="c.id" class="mini-item chat-item" @click="ai.openChat(c.id)">
              <span class="grow"><b>{{ c.title }}</b></span>
              <span class="r">{{ fmtTime(c.t) }}</span>
            </button>
          </div>
        </template>

        <div class="ai-note">
          <Icon name="lock" :size="12" class="note-ico" /> 只有你点击发送时，才会把选中的资料发给你配置的 AI 服务
        </div>
      </div>
    </div>

    <!-- 会话 -->
    <template v-else>
      <div class="thread-head">
        <button class="btn btn-ghost btn-sm" @click="ai.goHome()"><Icon name="back" :size="15" />新对话</button>
        <div class="t">{{ chat.title }}</div>
        <button class="api-pill" :class="{ ok: ai.ready }" title="AI 接口设置" @click="goSettings">
          <i></i>{{ ai.ready ? ai.label : '未配置 AI 接口' }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="exportChat"><Icon name="doc" :size="15" />导出 Word</button>
        <button class="btn btn-ghost btn-sm btn-icon" title="删除对话" aria-label="删除对话" @click="ai.delChat()">
          <Icon name="trash" :size="15" />
        </button>
      </div>

      <div ref="threadEl" class="ai-thread scroll">
        <div class="ai-wrap">
          <template v-for="(m, i) in chat.msgs" :key="i">
            <div v-if="m.role === 'user'" class="msg user">
              <div class="bubble">{{ m.show || m.content }}</div>
            </div>
            <div v-else class="msg bot">
              <span class="ai-ava sm" v-html="aiAvatar(30)"></span>
              <div class="body">
                <div class="who">家庭教育助手{{ m.streaming ? ' · 正在写…' : '' }}</div>
                <div v-if="m.err" class="msg-err">
                  {{ m.err }}
                  <div class="err-tools">
                    <button v-if="i === msgs.length - 1" class="btn btn-xs btn-dark" @click="ai.regen()">重试</button>
                    <button class="btn btn-xs btn-light" @click="goSettings">检查 AI 设置</button>
                    <button class="btn btn-xs btn-light" @click="ai.copyChatPrompt()">改为复制提示词</button>
                  </div>
                </div>
                <div v-else class="md" v-html="mdHtml(m)"></div>
                <div v-if="!m.streaming && !m.err && !m.batch" class="msg-tools">
                  <button class="btn btn-xs btn-ghost" @click="copyMsg(i)"><Icon name="copy" :size="13" />复制</button>
                  <button class="btn btn-xs btn-ghost" @click="exportMsg(i)"><Icon name="doc" :size="13" />导出 Word</button>
                  <button
                    v-if="chatKid && state.kids.some((x) => x.id === chatKid)"
                    class="btn btn-xs btn-ghost"
                    @click="ai.saveToJournal(i)"
                  >
                    <Icon name="pen" :size="13" />存进成长日记
                  </button>
                  <button v-if="i === msgs.length - 1" class="btn btn-xs btn-ghost" @click="ai.regen()">
                    <Icon name="refresh" :size="13" />重新生成
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="ai-foot">
        <div class="ai-wrap foot-wrap">
          <div class="composer">
            <textarea
              v-model="input"
              :placeholder="chat.batchOnly ? '批量任务不支持追问' : '继续追问，比如：再精简一点 / 换成更口语的说法'"
              :disabled="chat.batchOnly"
              @keydown="onKey"
            ></textarea>
            <div class="composer-bar">
              <span class="muted hint">Enter 发送 · Shift + Enter 换行</span>
              <span class="grow"></span>
              <button v-if="ai.busy" class="btn btn-sm btn-light" @click="ai.stop()">
                <Icon name="stop" :size="13" />停止
              </button>
              <button v-else class="send" aria-label="发送" :disabled="chat.batchOnly" @click="send">
                <Icon name="send" :size="17" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.ai-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ai-home {
  flex: 1;
  overflow-y: auto;
  padding: 48px 34px 40px;
}
.ai-wrap {
  max-width: 860px;
  margin: 0 auto;
}
.ai-ava {
  flex: none;
  border-radius: 50%;
  display: block;
  :deep(svg) {
    border-radius: 50%;
    display: block;
  }
}
.ai-hello {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  h1 {
    font-size: 26px;
    margin: 0;
    font-weight: 800;
    letter-spacing: 0.3px;
  }
  p {
    margin: 0;
    color: var(--ink2);
    font-size: 13.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
}
.composer {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 0 0 1px var(--line), 0 6px 24px rgba(0, 0, 0, 0.04);
  padding: 14px 16px 12px;
  textarea {
    width: 100%;
    border: 0;
    outline: none;
    resize: none;
    min-height: 72px;
    max-height: 220px;
    font-size: 14.5px;
    line-height: 1.6;
    background: transparent;
    font-family: inherit;
    color: var(--ink);
  }
}
.composer-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
  .grow {
    flex: 1;
  }
}
.mask-chk {
  font-size: 12px;
}
.ctx-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--fill);
  font-size: 12.5px;
  color: var(--ink2);
  &:hover {
    color: var(--ink);
    background: var(--fill2);
  }
  &.on {
    background: var(--ink);
    color: #fff;
  }
}
.send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  flex: none;
  &:hover {
    background: #333;
  }
  &[disabled] {
    background: #cfcfcd;
  }
}
.api-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink2);
  background: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  box-shadow: 0 0 0 1px var(--line2);
  max-width: 100%;
  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c9c9c6;
    flex: none;
  }
  &.ok i {
    background: var(--green);
  }
}
.tpl-tabs {
  display: flex;
  gap: 18px;
  margin: 26px 0 12px;
  font-size: 13px;
  button {
    color: var(--ink3);
    &.on {
      color: var(--ink);
      font-weight: 600;
    }
    &.static {
      cursor: default;
    }
  }
}
.tpl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.tpl {
  background: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
  box-shadow: 0 0 0 1px var(--line);
  transition: box-shadow 0.15s, transform 0.15s;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  &:hover {
    box-shadow: 0 0 0 1px var(--line2), 0 8px 24px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  .t {
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    i {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      font-style: normal;
      font-size: 11.5px;
      flex: none;
    }
  }
  .d {
    font-size: 12.5px;
    color: var(--ink3);
    margin-top: 6px;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
.chat-item {
  background: #fff;
  box-shadow: 0 0 0 1px var(--line);
  margin-bottom: 6px;
  padding: 10px 14px;
  b {
    font-weight: 600;
  }
}
.ai-note {
  text-align: center;
  font-size: 11.5px;
  color: var(--ink3);
  margin-top: 8px;
  :deep(svg) {
    display: inline-block;
    vertical-align: -2px;
  }
}
.thread-head {
  display: flex;
  align-items: center;
  gap: 10px;
  /* 右边留出全屏按钮的位置 */
  padding: 18px 150px 0 34px;
  .t {
    font-size: 15px;
    font-weight: 700;
    flex: 1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.ai-thread {
  flex: 1;
  overflow-y: auto;
  padding: 20px 34px 10px;
  .ai-wrap {
    max-width: 820px;
  }
}
.msg {
  margin: 16px 0;
  display: flex;
  gap: 10px;
  &.user {
    justify-content: flex-end;
    .bubble {
      background: #fff;
      box-shadow: 0 0 0 1px var(--line);
      border-radius: 14px 14px 4px 14px;
      padding: 10px 14px;
      max-width: 76%;
      font-size: 13.5px;
      white-space: pre-wrap;
    }
  }
  &.bot {
    .body {
      flex: 1;
      min-width: 0;
    }
    .who {
      font-size: 12px;
      color: var(--ink3);
      margin-bottom: 4px;
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
}
.md {
  font-size: 14px;
  line-height: 1.8;
  color: #222;
  background: #fff;
  border-radius: 4px 14px 14px 14px;
  padding: 14px 18px;
  box-shadow: 0 0 0 1px var(--line);
  overflow-wrap: anywhere;
  :deep(h1),
  :deep(h2),
  :deep(h3) {
    font-size: 15.5px;
    margin: 14px 0 6px;
    line-height: 1.5;
  }
  :deep(h1) {
    font-size: 17px;
  }
  :deep(p) {
    margin: 6px 0;
  }
  :deep(ul),
  :deep(ol) {
    margin: 6px 0;
    padding-left: 22px;
  }
  :deep(li) {
    margin: 2px 0;
  }
  :deep(table) {
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 13px;
  }
  :deep(td),
  :deep(th) {
    border: 1px solid var(--line2);
    padding: 4px 8px;
  }
  :deep(blockquote) {
    margin: 8px 0;
    padding: 4px 12px;
    border-left: 3px solid var(--line2);
    color: var(--ink2);
  }
  :deep(code) {
    background: var(--fill);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12.5px;
  }
  :deep(hr) {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 12px 0;
  }
  :deep(.cursor) {
    display: inline-block;
    width: 7px;
    height: 15px;
    background: var(--ink);
    vertical-align: -2px;
    animation: blink 1s steps(2) infinite;
    margin-left: 2px;
  }
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
.msg-tools {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.msg-err {
  background: var(--red-soft);
  color: #a8322a;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  .err-tools {
    margin-top: 8px;
    display: flex;
    gap: 6px;
  }
}
.ai-foot {
  padding: 10px 34px 18px;
  .composer textarea {
    min-height: 44px;
  }
  .hint {
    font-size: 12px;
  }
  .foot-wrap {
    max-width: 820px;
  }
}

@media (max-width: 1280px) {
  .tpl-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 760px) {
  .tpl-grid {
    grid-template-columns: 1fr;
  }
}
</style>
