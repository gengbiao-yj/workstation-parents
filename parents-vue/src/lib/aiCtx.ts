import { ABILITIES, CLOSE, DIMS, MOOD, REL } from '@/data/constants'
import { addDays, fmtMD, todayStr } from '@/lib/date'
import {
  abilitiesOf,
  ageText,
  bdayAge,
  booksOf,
  examsOf,
  habitText,
  habitsOf,
  journalOf,
  latestGrowth,
  nextBday,
  peopleOf,
  rangeStats,
  readMinutes,
  skillProg,
  skillsOf,
  stageOf,
  upcoming,
  weekStats,
  yearGain
} from '@/lib/query'
import { dimRates } from '@/lib/ai'
import type { AppState, Kid, Person } from '@/types'

export interface CtxOpt {
  people?: boolean
  cal?: boolean
  journal?: number
  exam?: boolean
}

/** 孩子情况上下文，只包含家长勾选的资料 */
export function kidContext(s: AppState, k: Kid, opt: CtxOpt = {}): string {
  const t = todayStr()
  const st = stageOf(k)
  let h = `【孩子情况】${k.name}，${k.gender === 'F' ? '女孩' : '男孩'}，${ageText(k) || '年龄未填'}，${st.name}${k.grade ? ' ' + k.grade : ''}\n`
  if (k.interests) h += '兴趣：' + k.interests + '\n'
  if (k.personality) h += '性格：' + k.personality + '\n'
  if (k.health) h += '健康注意：' + k.health + '\n'
  if (k.note) h += '其他：' + k.note + '\n'
  const lg = latestGrowth(s, k.id, 'h')
  const yg = yearGain(s, k.id)
  if (lg) h += `身高：${lg.h} cm（${fmtMD(lg.date)}）${yg ? '，近一年约长高 ' + yg.per + ' cm' : ''}\n`
  h += '本周五育打卡完成率：' + dimRates(s, k.id, (d) => weekStats(s, k.id, t, d).rate) + '\n'
  const m30 = addDays(t, -29)
  h += '近 30 天五育完成率：' + dimRates(s, k.id, (d) => rangeStats(s, k.id, m30, t, d).rate) + '\n'
  const hs = habitsOf(s, k.id)
  if (hs.length) h += '正在打卡的习惯：' + hs.map((x) => habitText(x)).join('、') + '\n'
  const sk = skillsOf(s, k.id)
  if (sk.length) {
    h +=
      '技能挑战：' +
      sk
        .map((x) => {
          const p = skillProg(x)
          return `${x.name}（${p.finished ? '已完成' : `第 ${(p.cur ? p.cur.i : 0) + 1}/${p.n} 步：${p.cur ? p.cur.s.t : ''}`}）`
        })
        .join('；') +
      '\n'
  }
  const ab = abilitiesOf(s, k.id).slice(-1)[0]
  if (ab) {
    h +=
      `学习能力自评（${+ab.month.slice(5, 7)}月，1–5 分）：` +
      ABILITIES.map((a) => `${a.t} ${ab.s[a.id] || '-'}`).join('、') +
      (ab.note ? '；家长观察：' + ab.note : '') +
      '\n'
  }
  const bs = booksOf(s, k.id)
  if (bs.length) {
    h +=
      `阅读：读完 ${bs.filter((b) => b.status === 'done').length} 本，在读 ` +
      bs
        .filter((b) => b.status === 'reading')
        .map((b) => `《${b.title}》`)
        .join('') +
      `；本月阅读 ${readMinutes(s, k.id, t.slice(0, 8) + '01', t)} 分钟\n`
  }
  const jn = journalOf(s, k.id).slice(0, opt.journal || 5)
  if (jn.length) {
    h +=
      '最近的情况：\n' +
      jn.map((j) => `- ${j.date.slice(5)}${j.mood ? ' ' + MOOD[j.mood].t : ''}：${j.text}`).join('\n') +
      '\n'
  }
  if (opt.cal) {
    const up = upcoming(s, k.id, 14).filter((o) => o.type !== 'bday')
    if (up.length) {
      h += '未来两周的安排：' + up.slice(0, 10).map((o) => `${o.ds.slice(5)} ${o.start || ''} ${o.title}`).join('；') + '\n'
    }
  }
  if (opt.people) {
    const ps = peopleOf(s, k.id)
    if (ps.length) {
      h +=
        '身边的人：' +
        ps
          .map((p) => `${p.name}（${p.label || REL[p.rel].t}，${CLOSE[p.close]}${p.note ? '，' + p.note : ''}）`)
          .join('；') +
        '\n'
    }
  }
  if (opt.exam) {
    const ex = examsOf(s, k.id).slice(-1)[0]
    if (ex) {
      h +=
        `最近一次考试（${ex.name}）：` +
        ex.items.map((it) => `${it.sub} ${it.score}/${it.full}`).join('、') +
        (ex.note ? '；' + ex.note : '') +
        '\n'
    }
  }
  return h
}

/** 对方（朋友 / 家人）上下文 */
export function personContext(p: Person): string {
  const nb = nextBday(p.birthday)
  const age = nb ? bdayAge(p.birthday, nb.date) : null
  return (
    '【对方】' +
    p.name +
    '，' +
    (p.label || REL[p.rel].t) +
    '，' +
    (p.gender === 'M' ? '男' : '女') +
    (age ? `，快 ${age} 岁` : '') +
    (nb ? `，生日 ${fmtMD(nb.date)}（${nb.days ? nb.days + ' 天后' : '今天'}）` : '') +
    (p.likes ? '，喜欢：' + p.likes : '') +
    (p.met ? '，' + p.met : '') +
    (p.note ? '，最近：' + p.note : '') +
    '\n'
  )
}

export { DIMS }
