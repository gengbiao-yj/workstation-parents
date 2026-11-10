/**
 * 字段映射工具。
 *
 * 领域接口的入参直接沿用前端实体的形状（见 parents-vue/src/types/index.ts），
 * 每个服务用一份 FieldSpec 声明「实体字段 ← 前端字段」的转换规则，
 * 读写两侧都不用手写一堆 if。
 *
 * 设计取舍：前端习惯用空字符串表示“没填”，数据库列统一 NULL；
 * decimal 列在 TypeORM 里是 string，出参再转回 number —— 这两件事都在这里收口。
 */

export type FieldKind = 'text' | 'nullable' | 'date' | 'month' | 'decimal' | 'int' | 'bool' | 'json' | 'ref' | 'big'

export interface FieldSpec {
  /** 实体上的属性名 */
  key: string
  kind: FieldKind
  /** 入参字段名与实体属性名不一致时用这个（例如前端 text → 列 content）；可给多个别名 */
  from?: string | string[]
  /** text / nullable 的最大长度，超出截断而不是让 MySQL 报错 */
  max?: number
  /** int 的下限 */
  min?: number
  /** int 的上限 */
  high?: number
  /** 新建时的默认值，缺省按 kind 推导 */
  def?: unknown
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/
const BIGINT_RE = /^\d+$/

export function coerceField(spec: FieldSpec, v: unknown): unknown {
  const max = spec.max ?? 255
  switch (spec.kind) {
    case 'text':
      return v === undefined || v === null ? '' : String(v).slice(0, max)
    case 'nullable': {
      if (v === undefined || v === null) return null
      const s = String(v).slice(0, max).trim()
      return s === '' ? null : s
    }
    case 'date':
      return typeof v === 'string' && DATE_RE.test(v) ? v : null
    case 'month':
      return typeof v === 'string' && MONTH_RE.test(v) ? v : null
    case 'decimal': {
      if (v === undefined || v === null || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? String(n) : null
    }
    case 'int': {
      const n = Number(v)
      if (!Number.isFinite(n)) return spec.def ?? 0
      const lo = spec.min ?? -2147483648
      const hi = spec.high ?? 2147483647
      return Math.min(hi, Math.max(lo, Math.round(n)))
    }
    case 'bool':
      return Boolean(v)
    case 'json':
      return v === undefined ? null : v
    case 'ref':
      return typeof v === 'string' && BIGINT_RE.test(v) ? v : typeof v === 'number' && v > 0 ? String(v) : null
    case 'big': {
      const n = Number(v)
      return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : '0'
    }
    default:
      return v
  }
}

function defaultValue(spec: FieldSpec): unknown {
  if (spec.def !== undefined) return spec.def
  switch (spec.kind) {
    case 'text':
      return ''
    case 'int':
      return 0
    case 'bool':
      return false
    case 'big':
      return '0'
    default:
      return null
  }
}

/** 新建实体的初始值：把每个字段都填上，避免列 NOT NULL 无默认值时报错 */
export function fieldDefaults(specs: FieldSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const s of specs) out[s.key] = defaultValue(s)
  return out
}

/** 把入参里出现的字段写进实体，未出现的保持不动（PATCH 语义） */
export function applyFields(target: Record<string, unknown>, dto: Record<string, unknown>, specs: FieldSpec[]) {
  for (const spec of specs) {
    const keys = spec.from === undefined ? [spec.key] : Array.isArray(spec.from) ? spec.from : [spec.from]
    let value: unknown
    for (const k of keys) {
      if (dto[k] !== undefined) {
        value = dto[k]
        break
      }
    }
    if (value === undefined) continue
    target[spec.key] = coerceField(spec, value)
  }
}

/** 只挑选出参里允许暴露的字段，并把 decimal 转成 number */
export function numOrUndefined(v: string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function numOr0(v: string | null | undefined): number {
  return numOrUndefined(v) ?? 0
}

export function textOrEmpty(v: string | null | undefined): string {
  return v === null || v === undefined ? '' : v
}

export function bigintOrNull(v: string | null | undefined): string | null {
  return v === null || v === undefined ? null : String(v)
}

/** 校验并解析路由里的 :id，非数字直接 404 语义交给 ParseIntPipe，这里只做字符串化 */
export function strId(v: unknown): string {
  return String(v)
}
