<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '@/stores/auth'
import { useData, type AttachResult } from '@/stores/data'
import { useUi } from '@/stores/ui'
import AccountForm from './AccountForm.vue'

const auth = useAuth()
const data = useData()
const ui = useUi()

/** 登录成功之后的提示（表单自己的校验错误由 AccountForm 内部显示） */
const msg = ref('')
const busy = ref(false)

const sync = data.sync
const statusKind = computed(() => sync.status.value)
const errMsg = computed(() => sync.error.value)
const lastAt = computed(() => sync.lastSyncAt.value)
const status = computed(() => {
  if (!auth.loggedIn) return '未登录'
  switch (statusKind.value) {
    case 'syncing':
      return '同步中…'
    case 'offline':
      return '离线（改动会稍后自动重试）'
    case 'error':
      return '同步出错'
    default:
      return lastAt.value ? '已同步' : '已连接'
  }
})
const lastText = computed(() => {
  if (!lastAt.value) return '—'
  const d = new Date(lastAt.value)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
})

function onAuthDone(result: AttachResult) {
  msg.value = ''
  if (result === 'pushed') ui.toast('已把本机的记录上传到云端')
  else if (result === 'pulled') ui.toast('已从云端载入记录')
  else if (result === 'empty') ui.toast('登录成功，云端还没有记录')
  else if (result === 'fail') msg.value = '登录成功，但拉取云端数据失败，可稍后点「立即同步」'
}

async function syncNow() {
  busy.value = true
  await sync.syncNow()
  busy.value = false
  ui.toast(sync.status.value === 'idle' ? '已同步' : sync.error.value || '同步未完成')
}

async function uploadLocal() {
  const ok = await ui.confirm(
    '用本机数据覆盖云端',
    '云端已有的记录会被本机这份替换掉，不可撤销。确定继续？',
    '覆盖云端',
    true
  )
  if (!ok) return
  busy.value = true
  try {
    await sync.pushAll()
    ui.toast('已用本机数据覆盖云端')
  } catch {
    ui.toast('上传失败，请检查后端是否在运行')
  } finally {
    busy.value = false
  }
}

async function downloadRemote() {
  const ok = await ui.confirm('用云端数据覆盖本机', '本机未同步的改动会丢失。确定继续？', '从云端载入', true)
  if (!ok) return
  busy.value = true
  try {
    await sync.pull()
    data.save(true)
    ui.toast('已从云端载入')
  } catch {
    ui.toast('载入失败，请检查后端是否在运行')
  } finally {
    busy.value = false
  }
}

async function signOut() {
  const ok = await ui.confirm('退出登录', '退出后回到只存本机的模式，本机数据不会删除。', '退出')
  if (!ok) return
  data.detach()
  auth.signOut()
  ui.toast('已退出登录')
}
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title">云端同步</div>
    <div class="panel-sub">
      登录后记录会存进自己的数据库，换电脑、换浏览器都能接着记；不登录仍然只存在本机。
    </div>

    <!-- 未登录 -->
    <template v-if="!auth.loggedIn">
      <AccountForm @done="onAuthDone" />
      <div v-if="msg" class="cloud-err">{{ msg }}</div>
    </template>

    <!-- 已登录 -->
    <template v-else>
      <div class="cloud-card">
        <div class="cloud-row">
          <span class="cloud-k">账号</span>
          <b>{{ auth.user?.nickname || auth.user?.username }}</b>
          <span class="muted">（{{ auth.user?.username }}）</span>
        </div>
        <div class="cloud-row">
          <span class="cloud-k">状态</span>
          <span class="cloud-dot" :class="statusKind"></span>
          <span>{{ status }}</span>
          <span class="muted" style="margin-left: auto">最近同步 {{ lastText }}</span>
        </div>
        <div v-if="errMsg" class="cloud-err">{{ errMsg }}</div>
      </div>

      <div class="cloud-actions">
        <button class="btn btn-dark" :disabled="busy" @click="syncNow">立即同步</button>
        <button class="btn btn-light" :disabled="busy" @click="downloadRemote">从云端载入</button>
        <button class="btn btn-light" :disabled="busy" @click="uploadLocal">用本机覆盖云端</button>
        <span class="grow"></span>
        <button class="btn btn-light cloud-quit" :disabled="busy" @click="signOut">退出登录</button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.cloud-seg {
  max-width: 240px;
  margin-bottom: 16px;
}
.cloud-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.cloud-tip {
  font-size: 12px;
}
.cloud-err {
  margin-top: 10px;
  font-size: 12px;
  color: #c23a2e;
}
.cloud-card {
  background: var(--bg2, #f7f7f6);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
}
.cloud-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}
.cloud-k {
  color: var(--ink3, #8b9099);
  width: 48px;
}
.cloud-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1d9a57;
  &.syncing {
    background: #f2a71b;
  }
  &.offline {
    background: #9a9a97;
  }
  &.error {
    background: #e5483b;
  }
}
.cloud-quit {
  color: #c23a2e;
}
</style>
