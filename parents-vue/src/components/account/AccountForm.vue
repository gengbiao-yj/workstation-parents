<script setup lang="ts">
/**
 * 登录 / 注册表单。
 *
 * 抽出来是因为有两个入口要用：
 * 1. 设置 → 云端同步（CloudSync.vue）
 * 2. 欢迎页的「已有账号，登录载入」（WelcomeView.vue）—— 清空浏览器数据后靠它找回云端记录
 *
 * 登录成功后在这里直接接管数据（data.attach），父组件只负责处理结果。
 */
import { computed, ref } from 'vue'
import { useAuth } from '@/stores/auth'
import { useData, type AttachResult } from '@/stores/data'

const props = withDefaults(defineProps<{ tip?: string; autofocus?: boolean }>(), {
  tip: '登录后会自动判断：云端有记录就用云端，云端为空就把本机记录传上去',
  autofocus: false
})

const emit = defineEmits<{ done: [result: AttachResult, username: string] }>()

const auth = useAuth()
const data = useData()

// 记住上次用过的账号：清空浏览器数据后仍知道该登哪个
const mode = ref<'login' | 'register'>('login')
const username = ref(auth.lastUser || '')
const password = ref('')
const nickname = ref('')
const msg = ref('')
const busy = ref(false)

const actionText = computed(() => {
  if (busy.value) return '请稍候…'
  return mode.value === 'login' ? '登录并同步' : '注册并同步'
})

function switchMode(next: 'login' | 'register') {
  mode.value = next
  msg.value = ''
  auth.error = ''
}

async function submit() {
  msg.value = ''
  auth.error = ''
  const name = username.value.trim()
  if (name.length < 3) {
    msg.value = '账号至少 3 位（字母、数字或下划线）'
    return
  }
  if (password.value.length < 6) {
    msg.value = '密码至少 6 位'
    return
  }

  busy.value = true
  const ok =
    mode.value === 'login'
      ? await auth.login(name, password.value)
      : await auth.register(name, password.value, nickname.value.trim() || undefined)

  if (!ok) {
    msg.value = auth.error || '操作失败'
    busy.value = false
    return
  }

  const result = await data.attach()
  busy.value = false
  password.value = ''
  if (result === 'fail') msg.value = '登录成功，但拉取云端数据失败，可稍后点「立即同步」'
  emit('done', result, name)
}
</script>

<template>
  <div class="acc-form">
    <div class="seg light acc-seg">
      <button :class="{ on: mode === 'login' }" @click="switchMode('login')">登录</button>
      <button :class="{ on: mode === 'register' }" @click="switchMode('register')">注册新账号</button>
    </div>

    <div class="acc-row">
      <div class="field">
        <label>账号</label>
        <input
          v-model="username"
          class="inp"
          autocomplete="username"
          placeholder="字母 / 数字 / 下划线"
          :autofocus="props.autofocus"
        />
      </div>
      <div class="field">
        <label>密码</label>
        <input
          v-model="password"
          class="inp"
          type="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          placeholder="至少 6 位"
          @keyup.enter="submit"
        />
      </div>
    </div>

    <div v-if="mode === 'register'" class="field acc-nick">
      <label>昵称（可不填）</label>
      <input v-model="nickname" class="inp" placeholder="显示在账号信息里" @keyup.enter="submit" />
    </div>

    <div v-if="msg" class="acc-err">{{ msg }}</div>

    <div class="acc-actions">
      <button class="btn btn-dark" :disabled="busy" @click="submit">{{ actionText }}</button>
      <span v-if="tip" class="muted acc-tip">{{ tip }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acc-seg {
  max-width: 240px;
  margin-bottom: 16px;
}
.acc-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 520px;
}
.acc-nick {
  max-width: 320px;
  margin-top: 12px;
}
.acc-err {
  margin-top: 10px;
  font-size: 12px;
  color: #c23a2e;
}
.acc-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.acc-tip {
  font-size: 12px;
}
@media (max-width: 720px) {
  .acc-row {
    grid-template-columns: 1fr;
  }
}
</style>
