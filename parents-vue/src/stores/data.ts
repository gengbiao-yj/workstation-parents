import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { STORE_KEY, VERSION } from '@/data/constants'
import { defaultState, migrate } from '@/data/demo'
import { kidColor } from '@/art/home'
import type { AppState, Kid } from '@/types'
import { todayStr } from '@/lib/date'

/** localStorage 不可用时（隐私模式等）自动降级为内存 */
const mem: Record<string, string> = {}
const memStore = {
  ok: false,
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return mem[k] || null
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v)
      return true
    } catch {
      mem[k] = v
      return false
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
    delete mem[k]
  }
}
try {
  const probe = '__jz_probe__'
  localStorage.setItem(probe, '1')
  localStorage.removeItem(probe)
  memStore.ok = true
} catch {
  memStore.ok = false
}

export function rawLoad(): AppState | null {
  const raw = memStore.get(STORE_KEY)
  if (!raw) return null
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return null
  }
}

export const useData = defineStore('data', () => {
  const state = ref<AppState>(rawLoad() || defaultState())
  const storageOk = ref(memStore.ok)
  let timer: number | undefined

  function serialize() {
    return JSON.stringify(state.value)
  }

  function persist(now = false) {
    if (now) {
      window.clearTimeout(timer)
      const ok = memStore.set(STORE_KEY, serialize())
      storageOk.value = ok
      return ok
    }
    window.clearTimeout(timer)
    timer = window.setTimeout(() => persist(true), 250)
  }

  /** 供视图在改完数据后调用（也支持直接依赖深度 watch 自动保存） */
  function save(now = false) {
    persist(now)
  }

  // 深度自动保存：任何字段变动 250ms 后落盘，等价于原版 save()
  watch(state, () => persist(), { deep: true })

  const curKid = computed<Kid | null>(() => {
    const k = state.value.kids.find((x) => x.id === state.value.settings.cur)
    if (k) return k
    return state.value.kids[0] || null
  })

  function setCur(id: string) {
    state.value.settings.cur = id
  }

  function kidHex(k?: Kid | null): string {
    return kidColor(k ? k.color || 0 : 0)
  }

  function replaceAll(next: AppState) {
    state.value = next
    persist(true)
  }

  function resetAll(keepSettings = true) {
    const d = defaultState()
    if (keepSettings) {
      d.settings = state.value.settings
      d.demo = false
    }
    replaceAll(d)
  }

  function importBackup(raw: string): boolean {
    try {
      const obj = JSON.parse(raw)
      if (!obj || typeof obj !== 'object') return false
      const next = migrate(obj)
      next.v = VERSION === obj.v ? obj.v : obj.v || 1
      replaceAll(next)
      return true
    } catch {
      return false
    }
  }

  /** 今天这一天的默认日期，多个视图共用 */
  const today = computed(() => todayStr())

  return { state, curKid, storageOk, today, save, setCur, kidHex, replaceAll, resetAll, importBackup, serialize }
})

export type DataStore = ReturnType<typeof useData>
