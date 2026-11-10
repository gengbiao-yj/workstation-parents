/** 五育维度 id */
export type DimId = 'de' | 'zhi' | 'ti' | 'mei' | 'lao'
/** 孩子阶段 */
export type StageId = 'k' | 'p1' | 'p2' | 'm' | 'h'
/** 房间 id */
export type RoomId = 'study' | 'living' | 'art' | 'sport' | 'kitchen' | 'bedroom'
/** 日程类型 */
export type EvTypeId =
  | 'study'
  | 'sport'
  | 'class'
  | 'outing'
  | 'family'
  | 'school'
  | 'health'
  | 'other'
/** 关系类型 */
export type RelId = 'family' | 'friend' | 'classmate' | 'teacher' | 'coach' | 'neighbor'
/** 书的状态 */
export type BookStatus = 'want' | 'reading' | 'done'

export interface Kid {
  id: string
  name: string
  gender: 'M' | 'F'
  birthday: string
  stage: StageId
  color: number
  school: string
  grade: string
  cls: string
  teacher: string
  interests: string
  personality: string
  health: string
  note: string
  tags: string[]
  /** 脱敏编号 */
  mk?: number
}

export interface Habit {
  id: string
  kid: string
  dim: DimId
  name: string
  /** 空字符串 = 做到就算 */
  unit: string
  target: number
  /** 1-7，周一为 1 */
  days: number[]
  on: boolean
  /** 特殊类型，例如 read 用于统计阅读分钟数 */
  kind: string
  since: string
}

export interface SkillStep {
  t: string
  /** 完成日期，空表示未完成 */
  done: string
}

export interface Skill {
  id: string
  kid: string
  pre?: string
  name: string
  dim: DimId
  icon: string
  tip: string
  start: string
  note: string
  steps: SkillStep[]
}

export interface OutListItem {
  t: string
  ok: boolean
}

export interface Ev {
  id: string
  /** 空字符串表示全家 */
  kid: string
  type: EvTypeId
  title: string
  date: string
  start: string
  endT: string
  repeat: 'none' | 'daily' | 'weekly'
  until: string
  end?: string
  place: string
  note: string
  list: OutListItem[]
  /** 某一天的完成情况 */
  done: Record<string, boolean>
  /** 某一天单独取消 */
  skip: Record<string, boolean>
  review: string
  fav: string
  rating: number
  budget?: number
}

export interface Person {
  id: string
  kid: string
  name: string
  rel: RelId
  label: string
  /** 1-3 亲近程度 */
  close: number
  gender: 'M' | 'F'
  birthday: string
  likes: string
  contact: string
  note: string
  met: string
  /** 年份 -> 已祝福 */
  greeted: Record<string, boolean>
  /** 脱敏编号 */
  mk?: number
  sibling?: string
  adult?: boolean
}

export interface GrowthRecord {
  id: string
  kid: string
  date: string
  h: number
  w: number
  vl?: number
  vr?: number
}

export interface JournalEntry {
  id: string
  kid: string
  date: string
  mood: string
  text: string
  dim: DimId | ''
  first?: boolean
  t: number
}

export interface AbilityRecord {
  id: string
  kid: string
  /** YYYY-MM */
  month: string
  s: Record<string, number>
  note: string
}

export interface Book {
  id: string
  kid: string
  title: string
  author: string
  status: BookStatus
  date: string
  rating: number
  note: string
  color: string
}

export interface ExamItem {
  sub: string
  score: number
  full: number
}

export interface Exam {
  id: string
  kid: string
  date: string
  name: string
  note: string
  items: ExamItem[]
}

export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface ChatMsg {
  role: 'user' | 'bot'
  content: string
  /** 气泡里显示的短文本（提问时用原话） */
  show?: string
  streaming?: boolean
  err?: string
  /** 批量任务（不支持追问） */
  batch?: boolean
  t?: number
  model?: string
}

export interface Chat {
  id: string
  title: string
  /** 空字符串表示没有关联孩子 */
  kid?: string
  /** 来源模板 id */
  tpl?: string
  t: number
  batchOnly?: boolean
  msgs: ChatMsg[]
}

export interface ParentProfile {
  name: string
  gender: 'M' | 'F'
}

export interface PartnerProfile extends ParentProfile {
  show: boolean
}

export interface AiSettings {
  provider: string
  base: string
  key: string
  model: string
  mask: boolean
  temp: number
}

export interface Settings {
  parent: ParentProfile
  partner: PartnerProfile
  anim: boolean
  cat: boolean
  ai: AiSettings
  lastBackup: number
  onboarded: boolean
  cur: string
  maskSeq: number
}

export interface AppState {
  v: number
  demo: boolean
  settings: Settings
  kids: Kid[]
  habits: Habit[]
  /** kid -> date -> habitId -> 值 */
  checks: Record<string, Record<string, Record<string, true | number>>>
  skills: Skill[]
  events: Ev[]
  people: Person[]
  growth: GrowthRecord[]
  journal: JournalEntry[]
  abilities: AbilityRecord[]
  books: Book[]
  exams: Exam[]
  todos: Todo[]
  chats: Chat[]
}

/** 日程在某一天的一次发生 */
export interface Occurrence {
  ev?: Ev
  bday?: Person
  kidBday?: Kid
  ds: string
  start: string
  endT?: string
  done?: boolean
  color: string
  title: string
  type: EvTypeId | 'bday'
}
