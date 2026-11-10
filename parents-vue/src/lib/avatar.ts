import { adultAvatar, avatar, kidColor } from '@/art/home'
import { isAdultRel } from '@/lib/query'
import { relOf } from '@/lib/query'
import type { Kid, Person } from '@/types'

export function kidAva(k: Kid | null | undefined, size: number): string {
  return avatar(k, size, { color: kidColor(k ? k.color || 0 : 0) })
}

export function personAva(p: Person, size: number): string {
  if (isAdultRel(p)) {
    return adultAvatar(
      { gender: p.gender || 'F', old: /爷|奶|外公|外婆|姥/.test(p.label || ''), color: relOf(p.rel).color },
      size
    )
  }
  return avatar({ id: p.id, gender: p.gender || 'M', color: 0 }, size, { color: relOf(p.rel).color })
}

/** AI 助手头像 */
export function aiAvatar(size: number): string {
  return (
    `<svg class="ava" viewBox="-24 -24 48 48" width="${size}" height="${size}" aria-hidden="true"><circle r="24" fill="#171717"/>` +
    '<circle cx="0" cy="-1" r="11" fill="#fff"/><path d="M-5 -10 L-3 -15 L0 -11 L3 -16 L5 -10 Z" fill="#fff"/>' +
    '<ellipse cx="-4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/><ellipse cx="4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/>' +
    '<path d="M-10 10 Q0 15 10 10 L11 15 Q0 20 -11 15 Z" fill="#2f7ff0"/></svg>'
  )
}

/** 品牌图标 */
export const brandMark =
  '<svg class="brand-mark" viewBox="-24 -24 48 48" aria-hidden="true"><rect x="-24" y="-24" width="48" height="48" rx="13" fill="#171717"/>' +
  '<path d="M-13 -2 L0 -14 L13 -2 V8 H-13 Z" fill="#fff" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<ellipse cx="-4.2" cy="0.5" rx="2.4" ry="2.9" fill="#171717"/><ellipse cx="4.2" cy="0.5" rx="2.4" ry="2.9" fill="#171717"/>' +
  '<path d="M-11 11 Q0 16 11 11 L12 16 Q0 21 -12 16 Z" fill="#f2b01e"/></svg>'
