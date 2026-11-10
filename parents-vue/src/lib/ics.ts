import { BDAY_COLOR } from '@/data/constants'
import { addDays, pad2, todayStr } from './date'
import { evById, kidById } from './query'
import { mdOf } from './query'
import type { AppState, Ev } from '@/types'
import { downloadFile } from './download'

function icsEsc(s?: string): string {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
function icsDT(ds: string, hm: string): string {
  return ds.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'
}

/** 生成 .ics 内容并返回事件数 */
export function buildIcs(s: AppState): { content: string; n: number } {
  const L = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//cyberdad//jz-workbench//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEsc('孩子成长日历'),
    'X-WR-TIMEZONE:Asia/Shanghai',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Shanghai',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'END:STANDARD',
    'END:VTIMEZONE'
  ]
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  let n = 0
  const t = todayStr()
  s.events.forEach((e) => {
    if (e.repeat === 'none' && e.date < t) return
    const who = e.kid && kidById(s, e.kid) ? (kidById(s, e.kid) as any).name + '·' : ''
    L.push('BEGIN:VEVENT', 'UID:' + e.id + '@jz-workbench', 'DTSTAMP:' + stamp)
    if (e.start) {
      L.push('DTSTART;TZID=Asia/Shanghai:' + icsDT(e.date, e.start))
      L.push('DTEND;TZID=Asia/Shanghai:' + icsDT(e.date, e.endT || pad2(Math.min(23, +e.start.slice(0, 2) + 1)) + e.start.slice(2)))
    } else {
      L.push('DTSTART;VALUE=DATE:' + e.date.replace(/-/g, ''))
      L.push('DTEND;VALUE=DATE:' + addDays(e.date, 1).replace(/-/g, ''))
    }
    L.push('SUMMARY:' + icsEsc(who + e.title))
    if (e.place) L.push('LOCATION:' + icsEsc(e.place))
    if (e.note) L.push('DESCRIPTION:' + icsEsc(e.note))
    if (e.repeat === 'weekly' || e.repeat === 'daily')
      L.push('RRULE:FREQ=' + (e.repeat === 'weekly' ? 'WEEKLY' : 'DAILY') + (e.until ? ';UNTIL=' + e.until.replace(/-/g, '') + 'T155959Z' : ''))
    const ex = Object.keys(e.skip || {})
    if (ex.length && e.start) L.push('EXDATE;TZID=Asia/Shanghai:' + ex.map((x) => icsDT(x, e.start)).join(','))
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:' + (e.type === 'outing' || e.type === 'school' || e.type === 'health' ? '-PT12H' : '-PT15M'), 'END:VALARM', 'END:VEVENT')
    n++
  })
  s.people.forEach((p) => {
    const md = mdOf(p.birthday)
    if (!md) return
    const k = kidById(s, p.kid)
    L.push(
      'BEGIN:VEVENT',
      'UID:bd-' + p.id + '@jz-workbench',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + t.slice(0, 4) + md.replace('-', ''),
      'DTEND;VALUE=DATE:' + addDays(t.slice(0, 4) + '-' + md, 1).replace(/-/g, ''),
      'RRULE:FREQ=YEARLY',
      'SUMMARY:' + icsEsc(p.name + ' 生日' + (k ? '（提醒' + k.name + '祝贺）' : '')),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsEsc('明天是' + p.name + '的生日'),
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT'
    )
    n++
  })
  L.push('END:VCALENDAR')
  return { content: L.join('\r\n'), n }
}

export function downloadIcs(s: AppState): number {
  const { content, n } = buildIcs(s)
  if (!n) return 0
  downloadFile('孩子成长日历.ics', content, 'text/calendar;charset=utf-8')
  return n
}

export { BDAY_COLOR }
