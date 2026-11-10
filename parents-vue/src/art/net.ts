import { CLOSE, REL } from '@/data/constants'
import { kidAva, personAva } from '@/lib/avatar'
import { clamp, esc, addDays } from '@/lib/date'
import { nextBday } from '@/lib/query'
import type { Kid, Person, RelId } from '@/types'

export const REL_ORDER: RelId[] = ['family', 'friend', 'classmate', 'neighbor', 'coach', 'teacher']

interface Item {
  p: Person
  a: number
  r0: number
  x: number
  y: number
  sz: number
  w: number
  h: number
}

/** 关系网：以孩子为中心，按亲近程度分半径，组间留空，再做碰撞推开 */
export function netSVG(k: Kid, ps: Person[], hex: string): string {
  const W = 780
  const H = 620
  const cx = W / 2
  const cy = H / 2 - 14
  const R: Record<number, number> = { 3: 150, 2: 214, 1: 268 }
  let s = ''
  s += `<svg class="net-svg" viewBox="0 0 ${W} ${H}">`
  s += `<defs><radialGradient id="nBg"><stop offset="0" stop-color="${hex}" stop-opacity=".10"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></radialGradient></defs>`
  s += `<circle cx="${cx}" cy="${cy}" r="300" fill="url(#nBg)"/>`
    ;[3, 2, 1].forEach((c) => {
      s += `<circle cx="${cx}" cy="${cy}" r="${R[c]}" fill="none" stroke="#e8e8e5" stroke-dasharray="${c === 3 ? '0' : '4 6'}"/>`
      s += `<text x="${cx}" y="${cy - R[c] - 6}" text-anchor="middle" font-size="11" fill="#b0b0ad">${CLOSE[c]}</text>`
    })

  const groups = REL_ORDER.map((r) => ({
    r,
    list: ps.filter((p) => p.rel === r).sort((a, b) => b.close - a.close)
  })).filter((g) => g.list.length)

  const slots = ps.length + groups.length * 0.8 || 1
  const step = (Math.PI * 2) / slots
  let ang = -Math.PI / 2 - step * 0.4
  const items: Item[] = []
  let nodes = ''
  let edges = ''
  let labels = ''
  const am: Record<string, number> = {}

  groups.forEach((g) => {
    const gs = ang
    g.list.forEach((p, i) => {
      const a = ang + step * (i + 0.5)
      const r = R[p.close] + (g.list.length > 3 && i % 2 ? 26 : 0)
      const sz = p.close === 3 ? 52 : p.close === 2 ? 44 : 38
      items.push({
        p,
        a,
        r0: r,
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        sz,
        w: Math.max(sz + 10, Math.max(p.name.length, (p.label || REL[p.rel].t).length * 0.85) * 13 + 8),
        h: sz + 40
      })
    })
    ang += step * (g.list.length + 0.8)
    am[g.r] = (gs + ang - step * 0.8) / 2
  })

  const ctr = { x: cx, y: cy + 16, w: 128, h: 168, fixed: true }
  for (let it = 0; it < 120; it++) {
    const all: (Item | typeof ctr)[] = (items as (Item | typeof ctr)[]).concat([ctr])
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const A = items[i]
        const B: any = all[j]
        const dx = B.x - A.x
        const dy = B.y + (B.fixed ? 0 : 16) - (A.y + 16)
        const ox = (A.w + B.w) / 2 + 6 - Math.abs(dx)
        const oy = (A.h + B.h) / 2 + 2 - Math.abs(dy)
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const mx = ((dx >= 0 ? -1 : 1) * ox) / (B.fixed ? 1 : 2)
            A.x += mx
            if (!B.fixed) B.x -= mx
          } else {
            const my = ((dy >= 0 ? -1 : 1) * oy) / (B.fixed ? 1 : 2)
            A.y += my
            if (!B.fixed) B.y -= my
          }
        }
      }
    }
    items.forEach((A) => {
      const tx = cx + Math.cos(A.a) * A.r0
      const ty = cy + Math.sin(A.a) * A.r0
      A.x += (tx - A.x) * 0.04
      A.y += (ty - A.y) * 0.04
      A.x = clamp(A.x, A.w / 2 + 8, W - A.w / 2 - 8)
      A.y = clamp(A.y, A.sz / 2 + 22, H - A.sz / 2 - 46)
    })
  }

  items.forEach((A) => {
    const p = A.p
    const x = A.x
    const y = A.y
    const sz = A.sz
    const c = REL[p.rel].color
    const nb = nextBday(p.birthday)
    const soon = nb && nb.days <= 14 && !(p.greeted && p.greeted[nb.date.slice(0, 4)])
    edges +=
      `<line class="edge" data-p="${p.id}" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${c}" stroke-opacity=".32" stroke-width="${p.close === 3 ? 3 : p.close === 2 ? 1.8 : 1.1}"${p.close === 1 ? ' stroke-dasharray="3 4"' : ''}/>`
    nodes +=
      `<g class="node" data-p="${p.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><circle class="nb" r="${sz / 2 + 3}" fill="#fff" stroke="${c}" stroke-width="2.5"/>` +
      `<g transform="translate(${-sz / 2},${-sz / 2})">${personAva(p, sz)}</g>` +
      `<text y="${sz / 2 + 17}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#2a2a29" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(p.name)}</text>` +
      `<text y="${sz / 2 + 31}" text-anchor="middle" font-size="10.5" fill="#9a9a97" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(p.label || REL[p.rel].t)}</text>` +
      (soon
        ? `<g transform="translate(${sz / 2 - 2},${-sz / 2 + 2})"><circle r="11" fill="#e2569a" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${nb!.days === 0 ? '今' : nb!.days}</text></g>`
        : '') +
      '</g>'
  })

  groups.forEach((g) => {
    const mine = items.filter((A) => A.p.rel === g.r)
    const far = Math.max(...mine.map((A) => Math.sqrt((A.x - cx) ** 2 + (A.y - cy) ** 2)))
    const lw = REL[g.r].t.length * 12 + 12
    let lx = 0
    let ly = 0
    let okPos = false
    const cas = [0, 0.12, -0.12, 0.24, -0.24, 0.36, -0.36]
    const rrs = [far + 46, far + 66, far + 24]
    for (const da of cas) {
      if (okPos) break
      for (const rr of rrs) {
        const x = clamp(cx + Math.cos(am[g.r] + da) * rr, lw / 2 + 6, W - lw / 2 - 6)
        const y = clamp(cy + Math.sin(am[g.r] + da) * rr * 0.92, 18, H - 44)
        const hit = items.some(
          (A) => Math.abs(A.x - x) < (A.w + lw) / 2 && y > A.y - A.sz / 2 - 14 && y < A.y + A.sz / 2 + 40
        )
        if (!hit) {
          lx = x
          ly = y
          okPos = true
          break
        }
      }
    }
    if (okPos) {
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${REL[g.r].color}" opacity=".9">${REL[g.r].t}</text>`
    }
  })

  s += edges + labels
  s +=
    `<g transform="translate(${cx},${cy})"><circle r="54" fill="#fff" stroke="${hex}" stroke-width="4"/><g transform="translate(-48,-48)">${kidAva(k, 96)}</g>` +
    `<g transform="translate(0,74)"><rect x="${-(k.name.length * 7 + 14)}" y="-13" width="${k.name.length * 14 + 28}" height="26" rx="13" fill="${hex}"/><text y="5" text-anchor="middle" font-size="13.5" font-weight="700" fill="#fff">${esc(k.name)}</text></g></g>`
  s += nodes
  if (!ps.length) {
    s += `<text x="${cx}" y="${cy + 130}" text-anchor="middle" font-size="13" fill="#9a9a97">点右上角「添加」，把家人和朋友放进来</text>`
  }
  s += `<text x="${W - 8}" y="${H - 6}" text-anchor="end" font-size="9.5" fill="#c4c4c1">Developed by @沐沐宝贝</text>`
  return s + '</svg>'
}

/** 生日祝福话术 */
export function greetLines(k: Kid, p: Person, age: number | null): string[] {
  const young = k.stage === 'k' || k.stage === 'p1'
  const n = p.name
  const lk = p.likes || ''
  const out: string[] = []
  if (p.rel === 'family') {
    out.push(`${n}，祝你生日快乐！我爱你，祝你身体健康，天天开心！`)
    out.push(`亲爱的${p.label || n}，生日快乐！谢谢你一直照顾我，我会乖乖的，也会好好照顾你。`)
  } else if (p.rel === 'teacher' || p.rel === 'coach') {
    out.push(`${n}，祝您生日快乐！谢谢您的教导，我会继续努力的！`)
    out.push(`${n}生日快乐！祝您每天都开心，工作顺利！`)
  } else if (young) {
    out.push(`${n}，生日快乐！谢谢你一直和我玩，祝你${age ? age + ' 岁' : '新的一岁'}天天开心！`)
    out.push(`${n}，祝你生日快乐！${lk ? '我知道你' + lk.replace(/^喜欢/, '喜欢') + '，' : ''}我给你准备了一个小惊喜！`)
    out.push(`祝我最好的朋友${n}生日快乐！我们要一直做好朋友！`)
  } else {
    out.push(`${n}，生日快乐！${age ? age + ' 岁' : '新的一岁'}的每一天都要开心，我们一起加油！`)
    out.push('生日快乐！谢谢你这一路的陪伴，有你这个朋友真好。')
    out.push(
      `${n}，祝你生日快乐，想做的事都能做成！${lk ? '下次一起' + lk.replace(/^喜欢/, '').split(/[、，,和]/)[0] + '！' : ''}`
    )
  }
  return out
}

/** 礼物小点子 */
export function giftIdeas(k: Kid, p: Person): string[] {
  const lk = p.likes || ''
  const g: string[] = []
  const young = k.stage === 'k' || k.stage === 'p1'
  const map: [RegExp, string][] = [
    [/画|美术/, '一盒好用的彩笔或画本'],
    [/乐高|积木/, '一盒小颗粒积木'],
    [/恐龙/, '恐龙模型或恐龙绘本'],
    [/书|读/, '一本自己读过、觉得好看的书'],
    [/球|篮|足/, '一个球或运动护腕'],
    [/音乐|歌|乐队|吉他/, '自己录一段祝福的歌'],
    [/手工|折纸/, '亲手做的手工礼物'],
    [/猫|兔|狗|动物/, '动物造型的小文具'],
    [/编程|科学|实验/, '一套科学小实验'],
    [/摄影|拍/, '把一起拍的照片冲洗出来做成小相册'],
    [/花|戏/, '一束花或一张手写贺卡'],
    [/奶茶|零食/, '请 TA 喝一杯奶茶']
  ]
  map.forEach((m) => {
    if (m[0].test(lk) && g.length < 3) g.push(m[1])
  })
  if (p.rel === 'family') g.push('一张手绘贺卡，写上想说的话')
  if (young) g.push('孩子亲手画的贺卡')
  else g.push('一张手写贺卡，写一件你们之间的小事')
  if (g.length < 3) g.push('不贵的小礼物 + 当面说一句生日快乐')
  return g.slice(0, 4)
}

/** 生日前一天（或当天）的提醒日期 */
export function greetRemindDate(days: number, date: string): string {
  return days >= 1 ? addDays(date, -1) : date
}
