import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api, { ApiError, getToken, setToken, type AuthUserView } from '@/lib/api'

/**
 * 账号状态。
 *
 * 没登录时整个应用维持原来的纯 localStorage 模式；
 * 登录后由 data store 接管：先拉云端，之后每次改动增量同步。
 */
const LAST_KEY = 'jz-last-user'

function readLastUser(): string {
  try {
    return localStorage.getItem(LAST_KEY) || ''
  } catch {
    return ''
  }
}

function writeLastUser(name: string) {
  try {
    localStorage.setItem(LAST_KEY, name)
  } catch {
    /* 隐私模式下忽略 */
  }
}

export const useAuth = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const user = ref<AuthUserView | null>(null)
  const busy = ref(false)
  const error = ref('')

  /**
   * 上次登录过的账号名。
   * 清空浏览器数据（token 一并没了）之后，靠它提醒用户「该登哪个账号」——
   * 这是「数据在云端、但不知道用哪个账号进去」的唯一线索。
   */
  const lastUser = ref(readLastUser())

  const loggedIn = computed(() => !!token.value)

  function signOut() {
    setToken(null)
    token.value = null
    user.value = null
    error.value = ''
  }

  /** 页面刷新后恢复登录态 */
  async function restore(): Promise<boolean> {
    if (!token.value) return false
    try {
      user.value = await api.auth.me()
      return true
    } catch (e) {
      if ((e as ApiError).status === 401) signOut()
      return false
    }
  }

  function accept(resp: { token: string; user: AuthUserView }) {
    setToken(resp.token)
    token.value = resp.token
    user.value = resp.user
    error.value = ''
    if (resp.user?.username) {
      lastUser.value = resp.user.username
      writeLastUser(resp.user.username)
    }
  }

  async function login(username: string, password: string) {
    busy.value = true
    error.value = ''
    try {
      accept(await api.auth.login({ username: username.trim(), password }))
      return true
    } catch (e) {
      error.value = (e as ApiError).message || '登录失败'
      return false
    } finally {
      busy.value = false
    }
  }

  async function register(username: string, password: string, nickname?: string) {
    busy.value = true
    error.value = ''
    try {
      accept(await api.auth.register({ username: username.trim(), password, nickname }))
      return true
    } catch (e) {
      error.value = (e as ApiError).message || '注册失败'
      return false
    } finally {
      busy.value = false
    }
  }

  return { token, user, lastUser, busy, error, loggedIn, restore, login, register, signOut }
})

export type AuthStore = ReturnType<typeof useAuth>
