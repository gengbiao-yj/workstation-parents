/** 前端习惯用空字符串表示“没填”，数据库统一存 NULL */
export function emptyToNull(v?: string | null): string | null {
  return v === undefined || v === null || v === '' ? null : v
}

export function nullToEmpty(v?: string | null): string {
  return v === undefined || v === null ? '' : v
}
