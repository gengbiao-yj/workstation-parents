/**
 * 前端 AppState 的宽松类型定义。
 *
 * 这里刻意不写死每个字段：
 * 1) 它是从 localStorage 导入的「外部输入」，字段可能缺失或类型不严谨，服务层统一做归一化；
 * 2) 导出时以它作为「接口契约」，字段名与 parents-vue/src/types/index.ts 一一对应。
 */
export interface AppStateDto {
  v?: number
  demo?: boolean
  settings?: SettingsDto
  kids?: any[]
  habits?: any[]
  /** kidId -> date -> habitId -> true | number */
  checks?: Record<string, Record<string, Record<string, true | number>>>
  skills?: any[]
  events?: any[]
  people?: any[]
  growth?: any[]
  journal?: any[]
  abilities?: any[]
  books?: any[]
  exams?: any[]
  todos?: any[]
  chats?: any[]
}

export interface SettingsDto {
  parent?: { name?: string; gender?: string }
  partner?: { name?: string; gender?: string; show?: boolean }
  anim?: boolean
  cat?: boolean
  ai?: {
    provider?: string
    base?: string
    key?: string
    model?: string
    mask?: boolean
    temp?: number
  }
  lastBackup?: number
  onboarded?: boolean
  cur?: string
  maskSeq?: number
}

export interface ImportBody {
  mode?: 'replace' | 'merge'
  /** 完整状态；不传则把整个 body 当作状态 */
  state?: AppStateDto
}

export interface ImportResult {
  mode: 'replace' | 'merge'
  counts: Record<string, number>
  /** 旧 id -> 新 id（字符串形式），前端可用它做本地映射 */
  idMap: Record<string, Record<string, string>>
}
