import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, EntityManager, ObjectLiteral } from 'typeorm'
import { Book } from '../book/entities/book.entities'
import { Chat, ChatMessage } from '../chat/entities/chat.entities'
import { Ev, EventDayLog, EventItem } from '../event/entities/event.entities'
import { Exam, ExamItem } from '../exam/entities/exam.entities'
import { Habit, HabitCheck } from '../habit/entities/habit.entities'
import { Kid } from '../kid/entities/kid.entity'
import { Person, PersonGreeting } from '../person/entities/person.entities'
import { AbilityRecord, GrowthRecord, JournalEntry } from '../record/entities/record.entities'
import { Skill, SkillStep } from '../skill/entities/skill.entities'
import { Todo } from '../todo/entities/todo.entities'
import { UserSetting } from '../user/entities/user-setting.entity'
import { AppStateDto, ImportResult, SettingsDto } from './state.types'

/* ---------------- 归一化工具 ---------------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/

function text(v: unknown, max: number): string {
  if (v === undefined || v === null) return ''
  return String(v).slice(0, max)
}

/** 空字符串 / undefined / null 统一存 NULL，避免唯一索引和日期列被空串污染 */
function nullable(v: unknown, max: number): string | null {
  const s = text(v, max).trim()
  return s === '' ? null : s
}

function dateOrNull(v: unknown): string | null {
  const s = text(v, 10)
  return DATE_RE.test(s) ? s : null
}

function monthOrNull(v: unknown): string | null {
  const s = text(v, 7)
  return MONTH_RE.test(s) ? s : null
}

/** decimal 列统一以字符串写入，读出来再转数字 */
function decimalOrNull(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : null
}

function intOf(v: unknown, def = 0, min = -2147483648, max = 2147483647): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.round(n)))
}

function boolOf(v: unknown, def = false): boolean {
  if (v === undefined || v === null) return def
  return Boolean(v)
}

/** 前端用毫秒时间戳，数据库列是 BIGINT，typeorm 以字符串收发 */
function bigOf(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : '0'
}

function numOrUndefined(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name)

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /* ================= 导入 ================= */

  async importState(userId: string, state: AppStateDto, mode: 'replace' | 'merge'): Promise<ImportResult> {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new BadRequestException('state 必须是对象')
    }

    const counts: Record<string, number> = {}
    const idMap: Record<string, Record<string, string>> = {}

    await this.ds.transaction(async (m) => {
      if (mode === 'replace') await this.wipe(m, userId)

      await this.saveSettings(m, userId, state.settings)

      /* --- 孩子 --- */
      const kidInput = this.rows(state.kids)
      const kidBefore = mode === 'merge' ? await this.legacyMap(m, Kid, userId) : new Map<string, string>()
      const kidRows = kidInput
        .filter((k) => k && k.id && text(k.name, 32).trim())
        .filter((k) => !kidBefore.has(String(k.id)))
        .map((k) => ({
          userId,
          legacyId: text(k.id, 64),
          name: text(k.name, 32).trim(),
          gender: k.gender === 'M' ? 'M' : 'F',
          birthday: dateOrNull(k.birthday),
          stage: text(k.stage, 8) || 'k',
          color: intOf(k.color, 0, 0, 255),
          school: text(k.school, 64),
          grade: text(k.grade, 32),
          cls: text(k.cls, 32),
          teacher: text(k.teacher, 32),
          interests: text(k.interests, 255),
          personality: text(k.personality, 255),
          health: text(k.health, 255),
          note: nullable(k.note, 65535),
          tags: Array.isArray(k.tags) ? k.tags.map((t: unknown) => text(t, 32)).slice(0, 32) : null,
          mk: k.mk === undefined || k.mk === null ? null : intOf(k.mk),
        }))
      await this.bulk(m, Kid, kidRows)
      const kidMap = await this.legacyMap(m, Kid, userId)
      counts.kids = kidMap.size
      idMap.kids = Object.fromEntries(kidMap)

      /** 孩子被引用时统一在这里解析；'' 或找不到 = 不挂孩子 */
      const kidId = (legacy: unknown): string | null => {
        const key = text(legacy, 64)
        return key && kidMap.has(key) ? kidMap.get(key)! : null
      }

      /* --- 习惯 + 打卡 --- */
      const habitRows = this.rows(state.habits)
        .filter((h) => h && h.id && kidId(h.kid) && text(h.name, 32).trim())
        .map((h) => ({
          userId,
          legacyId: text(h.id, 64),
          kidId: kidId(h.kid)!,
          dim: text(h.dim, 4) || 'de',
          name: text(h.name, 32).trim(),
          unit: text(h.unit, 16),
          target: decimalOrNull(h.target) ?? '1',
          days: Array.isArray(h.days) && h.days.length ? h.days.map((d: unknown) => intOf(d, 1, 1, 7)) : [1, 2, 3, 4, 5, 6, 7],
          on: boolOf(h.on, true),
          kind: text(h.kind, 32),
          since: dateOrNull(h.since),
        }))
      await this.insertNew(m, Habit, userId, habitRows, mode === 'merge')
      const habitMap = await this.legacyMap(m, Habit, userId)
      counts.habits = habitMap.size
      idMap.habits = Object.fromEntries(habitMap)

      const checkRows: ObjectLiteral[] = []
      for (const [kidLegacy, byDate] of Object.entries(state.checks ?? {})) {
        const kId = kidId(kidLegacy)
        if (!kId || !byDate || typeof byDate !== 'object') continue
        for (const [ds, byHabit] of Object.entries(byDate)) {
          if (!DATE_RE.test(ds) || !byHabit || typeof byHabit !== 'object') continue
          for (const [habitLegacy, value] of Object.entries(byHabit)) {
            const hId = habitMap.get(habitLegacy)
            const raw = value as unknown
            if (!hId || raw === null || raw === undefined || raw === false || raw === 0) continue
            checkRows.push({
              userId,
              kidId: kId,
              habitId: hId,
              date: ds,
              value: raw === true ? null : decimalOrNull(raw),
            })
          }
        }
      }
      if (checkRows.length) {
        await m.createQueryBuilder().insert().into(HabitCheck).values(checkRows).orIgnore().execute()
      }
      counts.checks = checkRows.length

      /* --- 技能 + 步骤 --- */
      const skillRows = this.rows(state.skills)
        .filter((s) => s && s.id && kidId(s.kid) && text(s.name, 64).trim())
        .map((s) => ({
          userId,
          legacyId: text(s.id, 64),
          kidId: kidId(s.kid)!,
          pre: nullable(s.pre, 64),
          name: text(s.name, 64).trim(),
          dim: text(s.dim, 4) || 'zhi',
          icon: text(s.icon, 32),
          tip: text(s.tip, 255),
          start: dateOrNull(s.start),
          note: nullable(s.note, 65535),
        }))
      const newSkills = await this.insertNew(m, Skill, userId, skillRows, mode === 'merge')
      const skillMap = await this.legacyMap(m, Skill, userId)
      counts.skills = skillMap.size
      idMap.skills = Object.fromEntries(skillMap)

      const stepRows: ObjectLiteral[] = []
      const preFix: { id: string; pre: string }[] = []
      for (const s of this.rows(state.skills)) {
        if (!s || !s.id) continue
        if (!newSkills.has(String(s.id))) continue
        const sId = skillMap.get(String(s.id))
        if (!sId) continue
        if (s.pre) preFix.push({ id: sId, pre: text(s.pre, 64) })
        const steps = Array.isArray(s.steps) ? s.steps : []
        steps.forEach((st: any, i: number) => {
          if (!st) return
          stepRows.push({
            userId,
            skillId: sId,
            sort: i,
            title: text(st.t, 128),
            done: dateOrNull(st.done),
          })
        })
      }
      await this.bulk(m, SkillStep, stepRows)
      counts.skillSteps = stepRows.length
      // pre 存的是另一个技能的旧 id，技能表建好后再映射成新 id
      for (const p of preFix) {
        const mapped = skillMap.get(p.pre)
        if (mapped) await m.update(Skill, { id: p.id }, { pre: mapped })
      }

      /* --- 日程 + 清单 + 每日状态 --- */
      const eventRows = this.rows(state.events)
        .filter((e) => e && e.id && dateOrNull(e.date))
        .map((e) => ({
          userId,
          legacyId: text(e.id, 64),
          kidId: kidId(e.kid),
          type: text(e.type, 16) || 'other',
          title: text(e.title, 128),
          date: dateOrNull(e.date)!,
          start: text(e.start, 5),
          endT: text(e.endT, 5),
          repeat: text(e.repeat, 8) || 'none',
          until: dateOrNull(e.until),
          end: dateOrNull(e.end),
          place: text(e.place, 128),
          note: nullable(e.note, 65535),
          review: nullable(e.review, 65535),
          fav: text(e.fav, 32),
          rating: intOf(e.rating, 0, 0, 255),
          budget: decimalOrNull(e.budget),
        }))
      const newEvents = await this.insertNew(m, Ev, userId, eventRows, mode === 'merge')
      const eventMap = await this.legacyMap(m, Ev, userId)
      counts.events = eventMap.size
      idMap.events = Object.fromEntries(eventMap)

      const itemRows: ObjectLiteral[] = []
      const logRows: ObjectLiteral[] = []
      for (const e of this.rows(state.events)) {
        if (!e || !e.id) continue
        if (!newEvents.has(String(e.id))) continue
        const eId = eventMap.get(String(e.id))
        if (!eId) continue
        if (Array.isArray(e.list)) {
          e.list.forEach((it: any, i: number) => {
            if (!it) return
            itemRows.push({ userId, eventId: eId, sort: i, title: text(it.t, 128), ok: boolOf(it.ok) })
          })
        }
        const done = e.done && typeof e.done === 'object' ? e.done : {}
        const skip = e.skip && typeof e.skip === 'object' ? e.skip : {}
        const days = new Set<string>([...Object.keys(done), ...Object.keys(skip)])
        for (const ds of days) {
          if (!DATE_RE.test(ds)) continue
          const dayState = skip[ds] ? 'skip' : done[ds] ? 'done' : ''
          if (!dayState) continue
          logRows.push({ userId, eventId: eId, date: ds, state: dayState })
        }
      }
      await this.bulk(m, EventItem, itemRows)
      if (logRows.length) {
        await m.createQueryBuilder().insert().into(EventDayLog).values(logRows).orIgnore().execute()
      }
      counts.eventItems = itemRows.length
      counts.eventDayLogs = logRows.length

      /* --- 关系网 + 生日祝福 --- */
      const personRows = this.rows(state.people)
        .filter((p) => p && p.id && text(p.name, 32).trim())
        .map((p) => ({
          userId,
          legacyId: text(p.id, 64),
          kidId: kidId(p.kid),
          name: text(p.name, 32).trim(),
          rel: text(p.rel, 16) || 'friend',
          label: text(p.label, 32),
          close: intOf(p.close, 1, 1, 3),
          gender: p.gender === 'M' ? 'M' : 'F',
          birthday: dateOrNull(p.birthday),
          likes: text(p.likes, 255),
          contact: text(p.contact, 128),
          note: nullable(p.note, 65535),
          met: dateOrNull(p.met),
          sibling: nullable(p.sibling, 64),
          adult: boolOf(p.adult),
          mk: p.mk === undefined || p.mk === null ? null : intOf(p.mk),
        }))
      const newPeople = await this.insertNew(m, Person, userId, personRows, mode === 'merge')
      const personMap = await this.legacyMap(m, Person, userId)
      counts.people = personMap.size
      idMap.people = Object.fromEntries(personMap)

      const greetRows: ObjectLiteral[] = []
      const siblingFix: { id: string; sibling: string }[] = []
      for (const p of this.rows(state.people)) {
        if (!p || !p.id) continue
        if (!newPeople.has(String(p.id))) continue
        const pId = personMap.get(String(p.id))
        if (!pId) continue
        if (p.sibling) siblingFix.push({ id: pId, sibling: text(p.sibling, 64) })
        const greeted = p.greeted && typeof p.greeted === 'object' ? p.greeted : {}
        for (const [year, ok] of Object.entries(greeted)) {
          const y = intOf(year, 0, 1900, 2999)
          if (!ok || !y) continue
          greetRows.push({ userId, personId: pId, year: y })
        }
      }
      if (greetRows.length) {
        await m.createQueryBuilder().insert().into(PersonGreeting).values(greetRows).orIgnore().execute()
      }
      counts.greetings = greetRows.length
      for (const s of siblingFix) {
        const mapped = personMap.get(s.sibling)
        if (mapped) await m.update(Person, { id: s.id }, { sibling: mapped })
      }

      /* --- 成长档案 --- */
      const growthRows = this.rows(state.growth)
        .filter((g) => g && g.id && kidId(g.kid) && dateOrNull(g.date))
        .map((g) => ({
          userId,
          legacyId: text(g.id, 64),
          kidId: kidId(g.kid)!,
          date: dateOrNull(g.date)!,
          h: decimalOrNull(g.h),
          w: decimalOrNull(g.w),
          vl: decimalOrNull(g.vl),
          vr: decimalOrNull(g.vr),
        }))
      await this.insertNew(m, GrowthRecord, userId, growthRows, mode === 'merge')
      counts.growth = (await this.legacyMap(m, GrowthRecord, userId)).size

      const journalRows = this.rows(state.journal)
        .filter((j) => j && j.id && kidId(j.kid) && dateOrNull(j.date))
        .map((j) => ({
          userId,
          legacyId: text(j.id, 64),
          kidId: kidId(j.kid)!,
          date: dateOrNull(j.date)!,
          mood: text(j.mood, 16),
          content: text(j.text, 65535),
          dim: text(j.dim, 4),
          first: boolOf(j.first),
          t: bigOf(j.t),
        }))
      await this.insertNew(m, JournalEntry, userId, journalRows, mode === 'merge')
      counts.journal = (await this.legacyMap(m, JournalEntry, userId)).size

      const abilityRows = this.rows(state.abilities)
        .filter((a) => a && a.id && kidId(a.kid) && monthOrNull(a.month))
        .map((a) => ({
          userId,
          legacyId: text(a.id, 64),
          kidId: kidId(a.kid)!,
          month: monthOrNull(a.month)!,
          scores: a.s && typeof a.s === 'object' ? a.s : null,
          note: nullable(a.note, 65535),
        }))
      await this.insertNew(m, AbilityRecord, userId, abilityRows, mode === 'merge')
      counts.abilities = (await this.legacyMap(m, AbilityRecord, userId)).size

      const bookRows = this.rows(state.books)
        .filter((b) => b && b.id && kidId(b.kid) && text(b.title, 128).trim())
        .map((b) => ({
          userId,
          legacyId: text(b.id, 64),
          kidId: kidId(b.kid)!,
          title: text(b.title, 128).trim(),
          author: text(b.author, 64),
          status: text(b.status, 16) || 'want',
          date: dateOrNull(b.date),
          rating: intOf(b.rating, 0, 0, 255),
          note: nullable(b.note, 65535),
          color: text(b.color, 16),
        }))
      await this.insertNew(m, Book, userId, bookRows, mode === 'merge')
      counts.books = (await this.legacyMap(m, Book, userId)).size

      /* --- 成绩单 --- */
      const examRows = this.rows(state.exams)
        .filter((e) => e && e.id && kidId(e.kid) && dateOrNull(e.date))
        .map((e) => ({
          userId,
          legacyId: text(e.id, 64),
          kidId: kidId(e.kid)!,
          date: dateOrNull(e.date)!,
          name: text(e.name, 64),
          note: nullable(e.note, 65535),
        }))
      const newExams = await this.insertNew(m, Exam, userId, examRows, mode === 'merge')
      const examMap = await this.legacyMap(m, Exam, userId)
      counts.exams = examMap.size
      idMap.exams = Object.fromEntries(examMap)

      const examItemRows: ObjectLiteral[] = []
      for (const e of this.rows(state.exams)) {
        if (!e || !e.id) continue
        if (!newExams.has(String(e.id))) continue
        const eId = examMap.get(String(e.id))
        if (!eId) continue
        for (const it of Array.isArray(e.items) ? e.items : []) {
          if (!it) continue
          examItemRows.push({
            userId,
            examId: eId,
            subject: text(it.sub, 32),
            score: decimalOrNull(it.score),
            full: decimalOrNull(it.full),
          })
        }
      }
      await this.bulk(m, ExamItem, examItemRows)
      counts.examItems = examItemRows.length

      /* --- 待办 --- */
      const todoRows = this.rows(state.todos)
        .filter((t) => t && t.id && text(t.text, 255).trim())
        .map((t, i) => ({
          userId,
          legacyId: text(t.id, 64),
          text: text(t.text, 255).trim(),
          done: boolOf(t.done),
          sort: i,
        }))
      await this.insertNew(m, Todo, userId, todoRows, mode === 'merge')
      const todoMap = await this.legacyMap(m, Todo, userId)
      counts.todos = todoMap.size
      idMap.todos = Object.fromEntries(todoMap)

      /* --- AI 会话 --- */
      const chatRows = this.rows(state.chats)
        .filter((c) => c && c.id)
        .map((c) => ({
          userId,
          legacyId: text(c.id, 64),
          kidId: kidId(c.kid),
          title: text(c.title, 128),
          tpl: nullable(c.tpl, 32),
          t: bigOf(c.t) === '0' ? bigOf(Date.now()) : bigOf(c.t),
          batchOnly: boolOf(c.batchOnly),
        }))
      const newChats = await this.insertNew(m, Chat, userId, chatRows, mode === 'merge')
      const chatMap = await this.legacyMap(m, Chat, userId)
      counts.chats = chatMap.size
      idMap.chats = Object.fromEntries(chatMap)

      const msgRows: ObjectLiteral[] = []
      for (const c of this.rows(state.chats)) {
        if (!c || !c.id) continue
        if (!newChats.has(String(c.id))) continue
        const cId = chatMap.get(String(c.id))
        if (!cId) continue
        ;(Array.isArray(c.msgs) ? c.msgs : []).forEach((msg: any, i: number) => {
          if (!msg) return
          msgRows.push({
            userId,
            chatId: cId,
            role: msg.role === 'user' ? 'user' : 'bot',
            content: text(msg.content, 16777215),
            show: nullable(msg.show, 65535),
            streaming: boolOf(msg.streaming),
            err: nullable(msg.err, 65535),
            batch: boolOf(msg.batch),
            t: bigOf(msg.t),
            model: text(msg.model, 64),
            sort: i,
          })
        })
      }
      await this.bulk(m, ChatMessage, msgRows)
      counts.chatMessages = msgRows.length

      /* settings.cur 指向孩子旧 id，孩子建好后回填成新 id */
      const setting = await m.findOne(UserSetting, { where: { userId } })
      if (setting) {
        const cur = text(setting.cur, 64)
        const mappedCur = cur && kidMap.get(cur) ? kidMap.get(cur)! : [...kidMap.values()][0] ?? ''
        if (mappedCur !== setting.cur) await m.update(UserSetting, { userId }, { cur: mappedCur })
      }
    })

    this.log.log(`导入完成 user=${userId} mode=${mode} ${JSON.stringify(counts)}`)
    return { mode, counts, idMap }
  }

  /* ================= 导出 ================= */

  async exportState(userId: string) {
    const m = this.ds.manager
    const [settings, kids, habits, checks, skills, steps, events, items, logs, people, greets,
      growth, journal, abilities, books, exams, examItems, todos, chats, msgs] = await Promise.all([
      m.findOne(UserSetting, { where: { userId } }),
      m.find(Kid, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Habit, { where: { userId }, order: { id: 'ASC' } }),
      m.find(HabitCheck, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Skill, { where: { userId }, order: { id: 'ASC' } }),
      m.find(SkillStep, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Ev, { where: { userId }, order: { id: 'ASC' } }),
      m.find(EventItem, { where: { userId }, order: { id: 'ASC' } }),
      m.find(EventDayLog, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Person, { where: { userId }, order: { id: 'ASC' } }),
      m.find(PersonGreeting, { where: { userId }, order: { id: 'ASC' } }),
      m.find(GrowthRecord, { where: { userId }, order: { id: 'ASC' } }),
      m.find(JournalEntry, { where: { userId }, order: { id: 'ASC' } }),
      m.find(AbilityRecord, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Book, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Exam, { where: { userId }, order: { id: 'ASC' } }),
      m.find(ExamItem, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Todo, { where: { userId }, order: { id: 'ASC' } }),
      m.find(Chat, { where: { userId }, order: { id: 'ASC' } }),
      m.find(ChatMessage, { where: { userId }, order: { id: 'ASC' } }),
    ])

    const group = <T extends { }>(rows: T[], key: (r: T) => string) => {
      const map = new Map<string, T[]>()
      for (const r of rows) {
        const k = key(r)
        const list = map.get(k)
        if (list) list.push(r)
        else map.set(k, [r])
      }
      return map
    }

    const stepsBySkill = group(steps, (s) => String(s.skillId))
    const itemsByEvent = group(items, (i) => String(i.eventId))
    const logsByEvent = group(logs, (l) => String(l.eventId))
    const greetsByPerson = group(greets, (g) => String(g.personId))
    const itemsByExam = group(examItems, (i) => String(i.examId))
    const msgsByChat = group(msgs, (c) => String(c.chatId))

    const checkMap: Record<string, Record<string, Record<string, true | number>>> = {}
    for (const c of checks) {
      const kidKey = String(c.kidId)
      const habitKey = String(c.habitId)
      const day = (checkMap[kidKey] ??= {})
      const slot = (day[c.date] ??= {})
      slot[habitKey] = numOrUndefined(c.value) ?? true
    }

    return {
      v: 1,
      demo: false,
      settings: this.settingsView(settings, kids[0] ? String(kids[0].id) : ''),
      kids: kids.map((k) => ({
        id: String(k.id),
        name: k.name,
        gender: k.gender as 'M' | 'F',
        birthday: k.birthday ?? '',
        stage: k.stage,
        color: k.color,
        school: k.school,
        grade: k.grade,
        cls: k.cls,
        teacher: k.teacher,
        interests: k.interests,
        personality: k.personality,
        health: k.health,
        note: k.note ?? '',
        tags: k.tags ?? [],
        ...(k.mk === null ? {} : { mk: k.mk }),
      })),
      habits: habits.map((h) => ({
        id: String(h.id),
        kid: String(h.kidId),
        dim: h.dim,
        name: h.name,
        unit: h.unit,
        target: Number(h.target),
        days: h.days ?? [1, 2, 3, 4, 5, 6, 7],
        on: h.on,
        kind: h.kind,
        since: h.since ?? '',
      })),
      checks: checkMap,
      skills: skills.map((s) => ({
        id: String(s.id),
        kid: String(s.kidId),
        ...(s.pre ? { pre: s.pre } : {}),
        name: s.name,
        dim: s.dim,
        icon: s.icon,
        tip: s.tip,
        start: s.start ?? '',
        note: s.note ?? '',
        steps: (stepsBySkill.get(String(s.id)) ?? []).map((st) => ({
          t: st.title,
          done: st.done ?? '',
        })),
      })),
      events: events.map((e) => {
        const done: Record<string, boolean> = {}
        const skip: Record<string, boolean> = {}
        for (const l of logsByEvent.get(String(e.id)) ?? []) {
          if (l.state === 'skip') skip[l.date] = true
          else done[l.date] = true
        }
        return {
          id: String(e.id),
          kid: e.kidId === null ? '' : String(e.kidId),
          type: e.type,
          title: e.title,
          date: e.date,
          start: e.start,
          endT: e.endT,
          repeat: e.repeat,
          until: e.until ?? '',
          ...(e.end ? { end: e.end } : {}),
          place: e.place,
          note: e.note ?? '',
          list: (itemsByEvent.get(String(e.id)) ?? []).map((it) => ({ t: it.title, ok: it.ok })),
          done,
          skip,
          review: e.review ?? '',
          fav: e.fav,
          rating: e.rating,
          ...(e.budget === null ? {} : { budget: Number(e.budget) }),
        }
      }),
      people: people.map((p) => {
        const greeted: Record<string, boolean> = {}
        for (const g of greetsByPerson.get(String(p.id)) ?? []) greeted[String(g.year)] = true
        return {
          id: String(p.id),
          kid: p.kidId === null ? '' : String(p.kidId),
          name: p.name,
          rel: p.rel,
          label: p.label,
          close: p.close,
          gender: p.gender as 'M' | 'F',
          birthday: p.birthday ?? '',
          likes: p.likes,
          contact: p.contact,
          note: p.note ?? '',
          met: p.met ?? '',
          greeted,
          ...(p.mk === null ? {} : { mk: p.mk }),
          ...(p.sibling ? { sibling: p.sibling } : {}),
          ...(p.adult ? { adult: true } : {}),
        }
      }),
      growth: growth.map((g) => ({
        id: String(g.id),
        kid: String(g.kidId),
        date: g.date,
        h: numOrUndefined(g.h) ?? 0,
        w: numOrUndefined(g.w) ?? 0,
        ...(g.vl === null ? {} : { vl: Number(g.vl) }),
        ...(g.vr === null ? {} : { vr: Number(g.vr) }),
      })),
      journal: journal.map((j) => ({
        id: String(j.id),
        kid: String(j.kidId),
        date: j.date,
        mood: j.mood,
        text: j.content,
        dim: j.dim,
        ...(j.first ? { first: true } : {}),
        t: Number(j.t),
      })),
      abilities: abilities.map((a) => ({
        id: String(a.id),
        kid: String(a.kidId),
        month: a.month,
        s: a.scores ?? {},
        note: a.note ?? '',
      })),
      books: books.map((b) => ({
        id: String(b.id),
        kid: String(b.kidId),
        title: b.title,
        author: b.author,
        status: b.status,
        date: b.date ?? '',
        rating: b.rating,
        note: b.note ?? '',
        color: b.color,
      })),
      exams: exams.map((e) => ({
        id: String(e.id),
        kid: String(e.kidId),
        date: e.date,
        name: e.name,
        note: e.note ?? '',
        items: (itemsByExam.get(String(e.id)) ?? []).map((it) => ({
          sub: it.subject,
          score: numOrUndefined(it.score) ?? 0,
          full: numOrUndefined(it.full) ?? 0,
        })),
      })),
      todos: todos.map((t) => ({ id: String(t.id), text: t.text, done: t.done })),
      chats: chats.map((c) => ({
        id: String(c.id),
        title: c.title,
        ...(c.kidId === null ? {} : { kid: String(c.kidId) }),
        ...(c.tpl ? { tpl: c.tpl } : {}),
        t: Number(c.t),
        ...(c.batchOnly ? { batchOnly: true } : {}),
        msgs: (msgsByChat.get(String(c.id)) ?? []).map((msg) => ({
          role: msg.role as 'user' | 'bot',
          content: msg.content,
          ...(msg.show === null ? {} : { show: msg.show }),
          ...(msg.streaming ? { streaming: true } : {}),
          ...(msg.err === null ? {} : { err: msg.err }),
          ...(msg.batch ? { batch: true } : {}),
          ...(Number(msg.t) ? { t: Number(msg.t) } : {}),
          ...(msg.model ? { model: msg.model } : {}),
        })),
      })),
    }
  }

  /* ================= 内部工具 ================= */

  private settingsView(s: UserSetting | null, fallbackCur: string) {
    if (!s) {
      return {
        parent: { name: '', gender: 'F' },
        partner: { name: '', gender: 'M', show: false },
        anim: true,
        cat: true,
        ai: { provider: '', base: '', key: '', model: '', mask: true, temp: 0.7 },
        lastBackup: 0,
        onboarded: false,
        cur: fallbackCur,
        maskSeq: 0,
      }
    }
    return {
      parent: { name: s.parentName, gender: s.parentGender },
      partner: { name: s.partnerName, gender: s.partnerGender, show: s.partnerShow },
      anim: s.anim,
      cat: s.cat,
      ai: {
        provider: s.aiProvider,
        base: s.aiBase,
        key: s.aiKey,
        model: s.aiModel,
        mask: s.aiMask,
        temp: s.aiTemp,
      },
      lastBackup: Number(s.lastBackup || 0),
      onboarded: s.onboarded,
      cur: s.cur || fallbackCur,
      maskSeq: s.maskSeq,
    }
  }

  private async saveSettings(m: EntityManager, userId: string, dto?: SettingsDto) {
    if (!dto) return
    let row = await m.findOne(UserSetting, { where: { userId } })
    if (!row) row = m.create(UserSetting, { userId })

    if (dto.parent) {
      if (dto.parent.name !== undefined) row.parentName = text(dto.parent.name, 32)
      if (dto.parent.gender !== undefined) row.parentGender = dto.parent.gender === 'M' ? 'M' : 'F'
    }
    if (dto.partner) {
      if (dto.partner.name !== undefined) row.partnerName = text(dto.partner.name, 32)
      if (dto.partner.gender !== undefined) row.partnerGender = dto.partner.gender === 'M' ? 'M' : 'F'
      if (dto.partner.show !== undefined) row.partnerShow = boolOf(dto.partner.show, true)
    }
    if (dto.ai) {
      if (dto.ai.provider !== undefined) row.aiProvider = text(dto.ai.provider, 32)
      if (dto.ai.base !== undefined) row.aiBase = text(dto.ai.base, 255)
      if (dto.ai.key !== undefined) row.aiKey = text(dto.ai.key, 255)
      if (dto.ai.model !== undefined) row.aiModel = text(dto.ai.model, 64)
      if (dto.ai.mask !== undefined) row.aiMask = boolOf(dto.ai.mask, true)
      if (dto.ai.temp !== undefined) {
        const t = Number(dto.ai.temp)
        row.aiTemp = Number.isFinite(t) ? Math.min(2, Math.max(0, t)) : 0.7
      }
    }
    if (dto.anim !== undefined) row.anim = boolOf(dto.anim, true)
    if (dto.cat !== undefined) row.cat = boolOf(dto.cat, true)
    if (dto.lastBackup !== undefined) row.lastBackup = bigOf(dto.lastBackup)
    if (dto.onboarded !== undefined) row.onboarded = boolOf(dto.onboarded)
    if (dto.cur !== undefined) row.cur = text(dto.cur, 64)
    if (dto.maskSeq !== undefined) row.maskSeq = intOf(dto.maskSeq, 0, 0)

    await m.save(UserSetting, row)
  }

  private rows(v: unknown): any[] {
    return Array.isArray(v) ? v : []
  }

  /**
   * 合并模式：把库里已有 legacy_id 的行过滤掉，避免重复插入。
   * 返回「本次真正写进去的 legacy_id 集合」——子表据此判断父级是不是新建的，
   * 否则合并时会给老父级再插一遍子记录（步骤/清单/成绩/消息都会翻倍）。
   */
  private async insertNew(
    m: EntityManager,
    entity: any,
    userId: string,
    rows: ObjectLiteral[],
    merge: boolean,
  ): Promise<Set<string>> {
    if (!rows.length) return new Set()
    if (!merge) {
      await this.bulk(m, entity, rows)
      return new Set(rows.map((r) => String(r.legacyId)))
    }
    const existing = await this.legacyMap(m, entity, userId)
    const fresh = rows.filter((r) => !existing.has(String(r.legacyId)))
    await this.bulk(m, entity, fresh)
    return new Set(fresh.map((r) => String(r.legacyId)))
  }

  private async bulk(m: EntityManager, entity: any, rows: ObjectLiteral[]) {
    if (!rows.length) return
    // 分批写入，避免单条 SQL 过大（chat_messages 可能是 mediumtext）
    const size = 200
    for (let i = 0; i < rows.length; i += size) {
      await m.createQueryBuilder().insert().into(entity).values(rows.slice(i, i + size)).execute()
    }
  }

  private async legacyMap(m: EntityManager, entity: any, userId: string): Promise<Map<string, string>> {
    const rows = (await m.find(entity as never, { where: { userId } })) as unknown as {
      id: string
      legacyId: string | null
    }[]
    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.legacyId) map.set(String(r.legacyId), String(r.id))
    }
    return map
  }

  /** 清空该账号的全部业务数据（保留 user_settings），按子表优先顺序删 */
  private async wipe(m: EntityManager, userId: string) {
    const order = [
      HabitCheck, SkillStep, EventItem, EventDayLog, PersonGreeting, ExamItem, ChatMessage,
      Habit, Skill, Ev, Person, Exam, Chat, Kid,
      GrowthRecord, JournalEntry, AbilityRecord, Book, Todo,
    ]
    for (const entity of order) {
      await m.delete(entity as never, { userId } as never)
    }
  }
}
