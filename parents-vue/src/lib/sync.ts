/**
 * 增量同步引擎。
 *
 * 前端仍然是「一整份 AppState + 深度 watch 自动保存」的写法（46 个视图都不用改），
 * 这里在 watch 之后做一层差分：按集合比对上一次同步的快照，只把新增 / 修改 / 删除
 * 的条目逐条发给 REST 接口。新建条目用的是前端临时 id（k1、h3 这种），
 * 服务端返回自增 id 后在这里就地替换，并顺手把其他集合里的引用一起改掉。
 *
 * 三个兜底：
 * 1. 断网时只存本地（localStorage 照旧写），恢复后自动重试；
 * 2. 单条失败不会卡死队列，会记录错误继续推进；
 * 3. 首次登录 / 换设备时，若云端为空且本地有数据，直接整库导入（POST /import）。
 */
import { ref, type Ref } from 'vue'
import api, { ApiError, getToken, requestJson } from './api'
import type { AppState } from '@/types'

type Rec = Record<string, any>

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

const REAL_ID = /^\d+$/
const isRealId = (v: unknown): v is string => typeof v === 'string' && REAL_ID.test(v)

interface ColDef {
  key: string
  path: string
  /** 其他集合里引用本集合 id 的字段 */
  refs?: { col: string; field: string }[]
}

/** 顺序很重要：孩子 → 习惯/技能/... → 打卡（打卡依赖习惯的真实 id） */
const COLS: ColDef[] = [
  {
    key: 'kids',
    path: '/kids',
    refs: [
      { col: 'habits', field: 'kid' },
      { col: 'skills', field: 'kid' },
      { col: 'events', field: 'kid' },
      { col: 'people', field: 'kid' },
      { col: 'growth', field: 'kid' },
      { col: 'journal', field: 'kid' },
      { col: 'abilities', field: 'kid' },
      { col: 'books', field: 'kid' },
      { col: 'exams', field: 'kid' },
      { col: 'chats', field: 'kid' },
    ],
  },
  { key: 'habits', path: '/habits' },
  { key: 'skills', path: '/skills' },
  { key: 'events', path: '/events' },
  { key: 'people', path: '/people' },
  { key: 'growth', path: '/growth' },
  { key: 'journal', path: '/journal' },
  { key: 'abilities', path: '/abilities' },
  { key: 'books', path: '/books' },
  { key: 'exams', path: '/exams' },
  { key: 'todos', path: '/todos' },
  { key: 'chats', path: '/chats' },
]

function stripId(item: Rec): Rec {
  const { id, ...rest } = item
  void id
  return rest
}

export class SyncEngine {
  readonly status = ref<SyncStatus>('idle')
  readonly error = ref('')
  readonly lastSyncAt = ref(0)

  private snap: Record<string, Map<string, string>> = {}
  private checkSnap = new Map<string, string>()
  private settingsSnap = ''
  private timer: number | undefined
  private retry: number | undefined
  private running = false
  private dirty = false
  private backoff = 0

  constructor(private readonly state: Ref<AppState>) {
    this.reset()
  }

  /** 用当前状态重建快照，表示「这些内容服务端已经有了」 */
  reset() {
    this.snap = {}
    for (const col of COLS) {
      const map = new Map<string, string>()
      for (const item of this.listOf(col.key)) map.set(String(item.id), JSON.stringify(item))
      this.snap[col.key] = map
    }
    this.checkSnap = new Map()
    const checks = this.state.value.checks ?? {}
    for (const [kid, byDate] of Object.entries(checks)) {
      for (const [date, byHabit] of Object.entries(byDate ?? {})) {
        for (const [habit, value] of Object.entries(byHabit ?? {})) {
          this.checkSnap.set(`${kid}|${date}|${habit}`, String(value))
        }
      }
    }
    this.settingsSnap = JSON.stringify(this.state.value.settings)
  }

  private listOf(key: string): Rec[] {
    const v = (this.state.value as unknown as Rec)[key]
    return Array.isArray(v) ? v : []
  }

  get enabled() {
    return !!getToken()
  }

  /** 视图改完数据后调用，做 800ms 防抖（和 localStorage 的 250ms 分开） */
  schedule(delay = 800) {
    if (!this.enabled) return
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => void this.flush(), delay)
  }

  /** 立即推一次（设置里的「立即同步」按钮） */
  async syncNow() {
    window.clearTimeout(this.timer)
    await this.flush()
  }

  async flush(): Promise<void> {
    if (!this.enabled) {
      this.status.value = 'idle'
      return
    }
    if (this.running) {
      this.dirty = true
      return
    }
    this.running = true
    this.status.value = 'syncing'
    window.clearTimeout(this.retry)

    try {
      await this.pushSettings()
      for (const col of COLS) await this.pushCol(col)
      await this.pushChecks()
      this.status.value = 'idle'
      this.error.value = ''
      this.lastSyncAt.value = Date.now()
      this.backoff = 0
    } catch (e) {
      const err = e as ApiError
      const offline = !err.status || err.status === 0
      this.status.value = offline ? 'offline' : err.status === 401 ? 'offline' : 'error'
      this.error.value = err.message || '同步失败'
      if (offline || err.status === 401) {
        this.backoff = Math.min(this.backoff ? this.backoff * 2 : 5000, 60000)
        this.retry = window.setTimeout(() => void this.flush(), this.backoff)
      }
    } finally {
      this.running = false
      if (this.dirty) {
        this.dirty = false
        this.schedule(300)
      }
    }
  }

  /* ---------- 集合 ---------- */

  private async pushCol(col: ColDef) {
    const list = this.listOf(col.key)
    const snap = this.snap[col.key]
    const current = new Map<string, Rec>()
    for (const item of list) current.set(String(item.id), item)

    // 删除：快照里有、当前没有
    for (const id of [...snap.keys()]) {
      if (current.has(id)) continue
      await this.removeOne(col, id)
      snap.delete(id)
    }

    for (const item of list) {
      const id = String(item.id)
      const body = stripId(item)
      try {
        if (isRealId(id) && snap.has(id)) {
          if (snap.get(id) === JSON.stringify(item)) continue
          const resp = await this.patch(col, id, body)
          this.merge(item, resp)
          snap.set(String(item.id), JSON.stringify(item))
        } else {
          const resp = await this.create(col, body)
          const realId = String(resp.id)
          this.remap(col, id, realId)
          this.merge(item, resp)
          snap.set(String(item.id), JSON.stringify(item))
        }
      } catch (e) {
        this.handleItemError(e, col.key, id)
      }
    }
  }

  private merge(item: Rec, resp: Rec) {
    if (!resp || typeof resp !== 'object') return
    Object.assign(item, resp)
  }

  /** 新建条目后：把旧 id 换成服务端 id，并修正其他集合里的引用 */
  private remap(col: ColDef, oldId: string, newId: string) {
    if (oldId === newId) return
    for (const ref of col.refs ?? []) {
      for (const other of this.listOf(ref.col)) {
        if (other[ref.field] === oldId) other[ref.field] = newId
      }
    }
    // 特化：日程/联系人/会话的 kid 允许空字符串，上面已经覆盖；这里处理孩子特有的引用
    if (col.key === 'kids') {
      if (this.state.value.settings.cur === oldId) this.state.value.settings.cur = newId
      const byKid = this.state.value.checks[oldId]
      if (byKid) {
        this.state.value.checks[newId] = byKid
        delete this.state.value.checks[oldId]
      }
      this.dropCheckKeys('kid', oldId)
    }
    if (col.key === 'habits') {
      // checks 的第三层 key 是习惯 id，习惯拿到真实 id 后要把整列搬过去
      for (const byDate of Object.values(this.state.value.checks ?? {})) {
        for (const byHabit of Object.values(byDate ?? {})) {
          const slot = byHabit as Record<string, true | number>
          if (!slot || slot[oldId] === undefined) continue
          slot[newId] = slot[oldId]
          delete slot[oldId]
        }
      }
      this.dropCheckKeys('habit', oldId)
    }
    if (col.key === 'people') {
      for (const p of this.listOf('people')) if (p.sibling === oldId) p.sibling = newId
    }
    if (col.key === 'skills') {
      for (const s of this.listOf('skills')) if (s.pre === oldId) s.pre = newId
    }
  }

  private dropCheckKeys(kind: 'kid' | 'habit', id: string) {
    for (const key of [...this.checkSnap.keys()]) {
      const [kid, , habit] = key.split('|')
      if ((kind === 'kid' && kid === id) || (kind === 'habit' && habit === id)) this.checkSnap.delete(key)
    }
  }

  /** 单条失败不阻断整队：记录后继续，下一轮还会重试 */
  private handleItemError(e: unknown, col: string, id: string) {
    const err = e as ApiError
    if (!err.status) throw e // 网络问题整队退出，走退避重试
    if (err.status === 401) throw e
    this.error.value = `${col}#${id} 同步失败：${err.message}`
    // 404 说明服务端已经不在了，从快照里摘掉避免死循环
    if (err.status === 404) this.snap[col]?.delete(id)
  }

  /* ---------- 单个资源操作（统一在这里兜 404） ---------- */

  private async create(col: ColDef, body: Rec): Promise<Rec> {
    return (await apiRequest('POST', col.path, body)) as Rec
  }

  private async patch(col: ColDef, id: string, body: Rec): Promise<Rec> {
    return (await apiRequest('PATCH', `${col.path}/${id}`, body)) as Rec
  }

  private async removeOne(col: ColDef, id: string) {
    try {
      await apiRequest('DELETE', `${col.path}/${id}`)
    } catch (e) {
      const err = e as ApiError
      if (err.status === 404) return
      throw e
    }
  }

  /* ---------- 打卡 ---------- */

  private async pushChecks() {
    const checks = this.state.value.checks ?? {}
    for (const [kid, byDate] of Object.entries(checks)) {
      if (!isRealId(kid)) continue
      for (const [date, byHabit] of Object.entries(byDate ?? {})) {
        for (const [habit, value] of Object.entries(byHabit ?? {})) {
          if (!isRealId(habit)) continue
          const key = `${kid}|${date}|${habit}`
          const json = String(value)
          if (this.checkSnap.get(key) === json) continue
          await api.habits.setCheck(habit, date, value)
          this.checkSnap.set(key, json)
        }
      }
    }
    // 取消的打卡
    for (const key of [...this.checkSnap.keys()]) {
      const [kid, date, habit] = key.split('|')
      const cur = (checks as Rec)[kid]?.[date]?.[habit]
      if (cur !== undefined) continue
      await api.habits.setCheck(habit, date, null)
      this.checkSnap.delete(key)
    }
  }

  /* ---------- 设置 ---------- */

  private async pushSettings() {
    const json = JSON.stringify(this.state.value.settings)
    if (json === this.settingsSnap) return
    await api.settings.update(this.state.value.settings as unknown as Rec)
    this.settingsSnap = json
  }

  /* ---------- 云端读取 / 上传 ---------- */

  /** 拉取云端状态；force=true 时直接用云端覆盖本地 */
  async pull(): Promise<AppState> {
    const remote = await api.state.export()
    this.state.value = remote
    this.reset()
    this.lastSyncAt.value = Date.now()
    this.status.value = 'idle'
    this.error.value = ''
    return remote
  }

  /** 把本地整份状态推上云端（首次上云 / 手动覆盖） */
  async pushAll(): Promise<void> {
    await api.state.import(this.state.value as unknown as Rec, 'replace')
    await this.pull()
  }

  /**
   * 登录后的入口：
   * - 云端有数据 → 以云端为准（换设备/多浏览器一致）
   * - 云端为空且本地有数据 → 把本地存量传上去
   */
  async bootstrap(): Promise<'pulled' | 'pushed' | 'empty'> {
    const remote = await api.state.export()
    const remoteEmpty = !Array.isArray(remote?.kids) || remote.kids.length === 0
    const localEmpty = this.state.value.kids.length === 0

    if (remoteEmpty && !localEmpty) {
      await this.pushAll()
      return 'pushed'
    }
    if (!remoteEmpty) {
      this.state.value = remote
      this.reset()
      this.lastSyncAt.value = Date.now()
      return 'pulled'
    }
    this.reset()
    return 'empty'
  }

  /** 退出登录后停止同步（本地数据保留，回到纯 localStorage 模式） */
  detach() {
    window.clearTimeout(this.timer)
    window.clearTimeout(this.retry)
    this.reset()
    this.status.value = 'idle'
    this.error.value = ''
  }
}

/** 集合是动态的，统一走通用请求入口 */
function apiRequest(method: string, path: string, body?: Rec): Promise<unknown> {
  return requestJson<unknown>(method, path, body)
}

export function createSync(state: Ref<AppState>) {
  return new SyncEngine(state)
}

export type Sync = SyncEngine
