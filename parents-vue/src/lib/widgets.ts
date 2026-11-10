import { DIM, MOOD } from '@/data/constants'
import { clamp } from './date'

export function clip(s: unknown, n: number): string {
  const t = String(s || '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/** 五育小方块 */
export function dimDotHtml(dim: string, sm = false): string {
  const d = DIM[dim]
  if (!d) return ''
  return `<i class="dim-dot${sm ? ' sm' : ''}" style="background:${d.color}">${d.t}</i>`
}

/** 进度环 */
export function ringHtml(rate: number | null | undefined, size = 44, color?: string, label?: string, sw = 5): string {
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const v = rate === null || rate === undefined ? 0 : clamp(rate, 0, 1)
  return (
    `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#efefed" stroke-width="${sw}"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color || '#171717'}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` +
    (label !== undefined
      ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" class="ring-txt" font-size="${Math.round(size * 0.27)}" fill="#171717">${label}</text>`
      : '') +
    '</svg>'
  )
}

const MOUTHS: Record<string, string> = {
  happy: 'M7.5 13.5 Q12 18 16.5 13.5',
  excited: 'M7.5 13 Q12 19.5 16.5 13 Z',
  calm: 'M8.5 14.5 H15.5',
  tired: 'M8.5 15 Q12 13.5 15.5 15',
  worried: 'M8 15.5 Q12 12.5 16 15.5',
  sad: 'M8 16 Q12 12 16 16',
  angry: 'M8 15.5 Q12 13 16 15.5'
}

/** 心情表情 */
export function moodFaceHtml(id: string, size = 20): string {
  const m = MOOD[id] || MOOD.calm
  const mouth = MOUTHS[m.id]
  const eyes =
    m.id === 'tired'
      ? '<path d="M7.5 10h3M13.5 10h3" stroke="#171717" stroke-width="1.6" stroke-linecap="round"/>'
      : m.id === 'angry'
        ? '<path d="M7 8l3.5 1.5M17 8l-3.5 1.5" stroke="#171717" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="11" r="1.3" fill="#171717"/><circle cx="15" cy="11" r="1.3" fill="#171717"/>'
        : '<circle cx="9" cy="10" r="1.4" fill="#171717"/><circle cx="15" cy="10" r="1.4" fill="#171717"/>'
  return `<svg class="mood-face" width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="${m.t}"><circle cx="12" cy="12" r="10.5" fill="${m.c}"/>${eyes}<path d="${mouth}" fill="${m.id === 'excited' ? '#171717' : 'none'}" stroke="#171717" stroke-width="1.6" stroke-linecap="round"/></svg>`
}

export const REDUCED =
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 撒花 */
export function confetti(): void {
  if (REDUCED) return
  const box = document.createElement('div')
  box.className = 'confetti'
  const cs = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#e2569a', '#3ea35c']
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i')
    c.style.left = Math.random() * 100 + '%'
    c.style.background = cs[i % cs.length]
    c.style.animationDelay = Math.random() * 0.6 + 's'
    c.style.animationDuration = 1.6 + Math.random() * 1.4 + 's'
    c.style.transform = 'rotate(' + Math.random() * 180 + 'deg)'
    box.appendChild(c)
  }
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 3400)
}

/** 日程标题建议 */
export const TITLE_SUG: Record<string, any> = {
  study: {
    k: ['亲子共读', '数字小游戏', '认识汉字'],
    p1: ['口算练习', '英语绘本', '拼音复习', '练字 10 分钟'],
    p2: ['错题整理', '英语听读', '作文练笔', '科学阅读'],
    m: ['数学专题', '英语听力', '预习新课', '周复盘'],
    h: ['刷题专项', '英语阅读', '错题本复盘', '周复盘']
  },
  sport: ['游泳', '跳绳', '骑车', '打篮球', '踢足球', '跑步', '羽毛球'],
  class: ['钢琴课', '美术课', '舞蹈课', '编程课', '游泳课', '围棋课', '书法课'],
  family: ['家庭桌游夜', '一起做晚饭', '家庭电影夜', '饭后散步', '亲子共读'],
  school: ['家长会', '运动会', '开放日', '期中考试', '研学活动'],
  health: ['体检', '牙科检查', '疫苗接种', '视力检查'],
  outing: [],
  other: []
}

/** 打卡日描述：每天 / 周一到周五 / 周末 / 每周一、三 */
export function daysText(days: number[]): string {
  const a = days.slice().sort((x, y) => x - y)
  const s = a.join(',')
  if (s === '1,2,3,4,5,6,7') return '每天'
  if (s === '1,2,3,4,5') return '周一到周五'
  if (s === '6,7') return '周末'
  return '每周' + a.map((d) => '一二三四五六日'[d - 1]).join('、')
}
