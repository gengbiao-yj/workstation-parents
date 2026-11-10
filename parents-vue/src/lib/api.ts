/**
 * 后端 API 客户端。
 *
 * 约定：
 * - 开发环境走 Vite 代理（/api → http://127.0.0.1:3000），生产可用 VITE_API_BASE 覆盖；
 * - 所有接口返回的 id 都是字符串（BIGINT 由 mysql2 以字符串返回），和前端 `id: string` 契约一致；
 * - 出错统一抛 ApiError，调用方按 status 判断（0 = 网络不通 / 401 = 需要重新登录）。
 */
import type { AppState } from '@/types'

const ENV_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api'
const TOKEN_KEY = 'jz-api-token'

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

let token: string | null = readToken()

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return token
}

export function setToken(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 隐私模式下忽略 */
  }
}

export interface AuthUserView {
  id: string
  username: string
  nickname?: string
}

export interface AuthResp {
  token: string
  user: AuthUserView
}

export interface ImportResp {
  mode: 'replace' | 'merge'
  counts: Record<string, number>
  idMap: Record<string, Record<string, string>>
}

function qs(params?: Record<string, unknown>): string {
  if (!params) return ''
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

/** 通用请求入口（供 sync 层按动态路径调用） */
export async function requestJson<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(method, path, body)
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(ENV_BASE + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '连不上服务，请确认后端已启动（npm run dev）')
  }

  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
  }

  if (!res.ok) {
    if (res.status === 401) setToken(null)
    const msg =
      (json as { message?: string | string[] })?.message ??
      (typeof json === 'string' && json ? json : `请求失败（${res.status}）`)
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join('；') : String(msg), json)
  }
  return json as T
}

/** 一套标准 CRUD，路径与后端 @Controller 一致 */
function crud<T = Record<string, unknown>>(path: string) {
  return {
    list: (params?: Record<string, unknown>) => request<T[]>('GET', path + qs(params)),
    get: (id: string) => request<T>('GET', `${path}/${id}`),
    create: (body: Record<string, unknown>) => request<T>('POST', path, body),
    update: (id: string, body: Record<string, unknown>) => request<T>('PATCH', `${path}/${id}`, body),
    remove: (id: string) => request<unknown>('DELETE', `${path}/${id}`),
  }
}

export const api = {
  health: () => request<{ status: string; db?: string }>('GET', '/health'),

  auth: {
    register: (body: { username: string; password: string; nickname?: string }) =>
      request<AuthResp>('POST', '/auth/register', body),
    login: (body: { username: string; password: string }) => request<AuthResp>('POST', '/auth/login', body),
    me: () => request<AuthUserView>('GET', '/auth/me'),
  },

  /** 整库同步：导入 localStorage 存量 / 拉取云端状态 / 清空 */
  state: {
    export: () => request<AppState>('GET', '/export'),
    import: (state: AppState | Record<string, unknown>, mode: 'replace' | 'merge' = 'replace') =>
      request<ImportResp>('POST', '/import', { mode, state }),
    clear: () => request<unknown>('DELETE', '/state'),
  },

  settings: {
    get: () => request<Record<string, unknown>>('GET', '/settings'),
    update: (body: Record<string, unknown>) => request<Record<string, unknown>>('PATCH', '/settings', body),
  },

  kids: crud('/kids'),
  skills: crud('/skills'),
  events: crud('/events'),
  people: crud('/people'),
  growth: crud('/growth'),
  journal: crud('/journal'),
  abilities: crud('/abilities'),
  books: crud('/books'),
  exams: crud('/exams'),
  todos: crud('/todos'),
  chats: crud('/chats'),

  habits: {
    ...crud('/habits'),
    /** 打卡区间，返回 {kidId: {date: {habitId: 值}}} */
    checks: (params?: { from?: string; to?: string; kidId?: string }) =>
      request<Record<string, Record<string, Record<string, true | number>>>>('GET', '/habits/checks' + qs(params)),
    /** value 传 null 表示取消 */
    setCheck: (habitId: string, date: string, value: true | number | null) =>
      request<unknown>('PUT', `/habits/${habitId}/checks`, { date, value }),
  },
}

export default api
