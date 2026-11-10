<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NeedKid from '@/components/ui/NeedKid.vue'
import KidPick from '@/components/ui/KidPick.vue'
import ChartBox from '@/components/ui/ChartBox.vue'
import Icon from '@/components/ui/Icon.vue'
import { ABILITIES, BOOK_COLORS, DIM } from '@/data/constants'
import { hash, icon as artIcon } from '@/art/home'
import {
  addDays,
  daysBetween,
  fmtMD,
  fmtShort,
  mondayOf,
  parseDate,
  round1,
  todayStr
} from '@/lib/date'
import {
  abilitiesOf,
  booksOf,
  examsOf,
  habitText,
  habitsOf,
  occOn,
  readMinutes
} from '@/lib/query'
import { bars, lines, radar } from '@/lib/chart'
import { clip, daysText } from '@/lib/widgets'
import { useData } from '@/stores/data'
import { useDialogs } from '@/stores/dialogs'
import type { Book, Exam, Occurrence } from '@/types'

const data = useData()
const dialogs = useDialogs()
const route = useRoute()
const router = useRouter()

const t = todayStr()
const tab = ref<'ability' | 'plan' | 'books' | 'score'>('ability')
const week = ref(0)

const kid = computed(() => data.curKid)
const kidId = computed(() => (kid.value ? kid.value.id : ''))
const kidHexVal = computed(() => data.kidHex(kid.value))

const TABS = [
  ['ability', '学习能力'],
  ['plan', '学习计划'],
  ['books', '阅读书架'],
  ['score', '学校成绩']
] as const

const tabs = computed(() => TABS.filter((x) => !(x[0] === 'score' && kid.value && kid.value.stage === 'k')))

function monthText(mk: string) {
  return +mk.slice(5, 7) + '月'
}

/* ================= 学习能力 ================= */
const ablList = computed(() => abilitiesOf(data.state, kidId.value))
const ablCur = computed(() => (ablList.value.length ? ablList.value[ablList.value.length - 1] : null))
const ablFirst = computed(() => (ablList.value.length > 1 ? ablList.value[0] : null))
const ablPrev = computed(() =>
  ablList.value.length > 1 ? ablList.value[ablList.value.length - 2] : null
)
const thisMonth = computed(() => t.slice(0, 7))
const rated = computed(() => !!ablCur.value && ablCur.value.month === thisMonth.value)

function drawAbilityRadar(w: number) {
  const cur = ablCur.value
  if (!cur) return ''
  const first = ablFirst.value
  const se: any[] = []
  if (first) {
    se.push({
      name: monthText(first.month),
      color: '#b8b7b1',
      values: ABILITIES.map((a) => (first.s[a.id] || 0) / 5),
      fill: false
    })
  }
  se.push({
    name: monthText(cur.month),
    color: kidHexVal.value,
    values: ABILITIES.map((a) => (cur.s[a.id] || 0) / 5)
  })
  return radar(ABILITIES.map((a) => a.t), se, w, { h: 270 })
}

const AB_COLS = ['#2f7ff0', '#e5483b', '#1d9a57', '#7a5af5', '#e89a0c', '#14b0a6']

function drawAbilityLines(w: number) {
  return lines(
    ABILITIES.map((a, i) => ({
      name: a.t,
      color: AB_COLS[i],
      values: ablList.value.map((r) => r.s[a.id] || null),
      width: 1.8,
      dot: 3.4
    })),
    ablList.value.map((r) => monthText(r.month)),
    w,
    { h: 250, min: 1, max: 5, ticks: 4, fmt: (v: number) => String(Math.round(v)), endLabel: false }
  )
}

/* ================= 学习计划 ================= */
const PLAN_TIP: Record<string, string> = {
  k: '幼儿园不用排功课，用游戏和共读代替，每次 15 分钟左右。',
  p1: '一二年级没有书面作业，每天排 1–2 项、20 分钟以内就够了。',
  p2: '让孩子自己往里排计划，家长只负责周末一起看看完成得怎么样。',
  m: '计划以「当天弄懂」为主，别排太满，给运动和睡眠留出时间。',
  h: '计划交给孩子自己定，家长只在 TA 需要时帮忙找资源。'
}

const pmon = computed(() => addDays(mondayOf(t), week.value * 7))
const planCols = computed(() => {
  const out: { i: number; ds: string; today: boolean; occ: Occurrence[] }[] = []
  for (let i = 0; i < 7; i++) {
    const ds = addDays(pmon.value, i)
    const occ = occOn(data.state, ds, kidId.value, { nobd: true }).filter((o) => o.type === 'study')
    out.push({ i, ds, today: ds === t, occ })
  }
  return out
})
const planStat = computed(() => {
  let tot = 0
  let done = 0
  planCols.value.forEach((c) =>
    c.occ.forEach((o) => {
      tot++
      if (o.done) done++
    })
  )
  return { tot, done }
})
const weeklyFixed = computed(
  () =>
    data.state.events.filter(
      (e) => e.type === 'study' && e.kid === kidId.value && e.repeat === 'weekly' && (!e.until || e.until >= t)
    ).length
)
const zhiHabits = computed(() => habitsOf(data.state, kidId.value, 'zhi'))

function shiftWeek(d: number) {
  week.value = d === 0 ? 0 : week.value + d
}

function openOcc(o: Occurrence) {
  if (o.ev) dialogs.open({ k: 'event', ev: o.ev, ds: o.ds })
}

function toggleOcc(o: Occurrence, e: Event) {
  e.stopPropagation()
  const ev = o.ev
  if (!ev) return
  const d = ev.done || (ev.done = {})
  if (d[o.ds]) delete d[o.ds]
  else d[o.ds] = true
  data.save()
}

function addPlan(ds: string) {
  dialogs.open({ k: 'event', preset: { type: 'study', date: ds } })
}

/* ================= 阅读书架 ================= */
const books = computed(() => booksOf(data.state, kidId.value))
const mm = t.slice(0, 8) + '01'
const doneMonth = computed(() => books.value.filter((b) => b.status === 'done' && b.date >= mm).length)
const reading = computed(() => books.value.filter((b) => b.status === 'reading'))
const want = computed(() => books.value.filter((b) => b.status === 'want'))
const readMin = computed(() => readMinutes(data.state, kidId.value, mm, t))

const shelfRows = computed(() => {
  const order = { reading: 0, done: 1, want: 2 } as Record<string, number>
  const arr = books.value
    .slice()
    .sort((a, b) => order[a.status] - order[b.status] || (b.date || '').localeCompare(a.date || ''))
  const per = 16
  const rows: Book[][] = []
  const total = Math.max(1, Math.ceil((arr.length + 1) / per))
  for (let i = 0; i < total; i++) rows.push(arr.slice(i * per, (i + 1) * per))
  return rows
})

const weekRead = computed(() => {
  const out: { label: string; value: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const m0 = addDays(mondayOf(t), -w * 7)
    const end = addDays(m0, 6) > t ? t : addDays(m0, 6)
    out.push({ label: fmtShort(m0), value: readMinutes(data.state, kidId.value, m0, end) })
  }
  return out
})

function drawReadBars(w: number) {
  return bars(
    weekRead.value.map((x) => ({ label: x.label, value: x.value, tip: `${x.label} 那周：${x.value} 分钟`, color: kidHexVal.value })),
    w,
    { h: 210 }
  )
}

function openBook(b?: Book) {
  dialogs.open({ k: 'book', book: b })
}

/* ================= 学校成绩 ================= */
const exams = computed(() => examsOf(data.state, kidId.value))
const subjects = computed(() => {
  const subs: string[] = []
  exams.value.forEach((e) => e.items.forEach((it) => subs.indexOf(it.sub) < 0 && subs.push(it.sub)))
  return subs
})
const EX_COLS = ['#2f7ff0', '#e5483b', '#1d9a57', '#7a5af5', '#e89a0c', '#14b0a6', '#e2569a', '#8a6d3b', '#5c5c5a']

function drawScoreLines(w: number) {
  return lines(
    subjects.value.map((s, i) => ({
      name: s,
      color: EX_COLS[i % EX_COLS.length],
      values: exams.value.map((e) => {
        const it = e.items.filter((x) => x.sub === s)[0]
        return it && it.score !== null && (it.score as any) !== '' ? (it.score / it.full) * 100 : null
      }),
      width: 1.8,
      dot: 3.4
    })),
    exams.value.map((e) => e.name),
    w,
    {
      h: 230,
      min: 40,
      max: 100,
      fmt: (v: number) => Math.round(v) + '%',
      tipFmt: (v: number) => round1(v) + '%',
      endLabel: false
    }
  )
}

const scoreRows = computed(() =>
  exams.value
    .slice()
    .reverse()
    .map((e: Exam) => ({
      e,
      cells: subjects.value.map((s) => {
        const it = e.items.filter((x) => x.sub === s)[0]
        const has = it && it.score !== null && (it.score as any) !== ''
        return { s, has, score: has ? it.score : null, full: has ? it.full : null }
      })
    }))
)

function openExam(e?: Exam) {
  dialogs.open({ k: 'exam', exam: e })
}

/* ================= 路由参数 ================= */
onMounted(() => {
  const sec = String(route.query.tab || route.query.sec || '')
  if (sec === 'ability' || sec === 'plan' || sec === 'books' || sec === 'score') {
    if (sec === 'score' && kid.value && kid.value.stage === 'k') tab.value = 'ability'
    else tab.value = sec
  }
})

function setTab(id: 'ability' | 'plan' | 'books' | 'score') {
  tab.value = id
  router.replace({ query: { tab: id } })
}

function bookHeight(b: Book) {
  return 118 + (hash(b.id) % 34)
}
</script>

<template>
  <NeedKid v-if="!kid" />
  <div v-else class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">学习力</h1>
        <div class="page-desc">会学、想学，比一次考了多少分更能决定孩子走多远</div>
      </div>
      <KidPick />
      <div class="grow"></div>
      <button class="btn btn-light" @click="$router.push('/ai?tpl=studyplan')">
        <Icon name="spark" :size="15" />AI 帮我定学习计划
      </button>
    </div>

    <div class="ptabs">
      <button v-for="x in tabs" :key="x[0]" :class="{ on: tab === x[0] }" @click="setTab(x[0])">
        {{ x[1] }}
        <span v-if="x[0] === 'score'" class="tag gray">只是其中一项</span>
      </button>
    </div>

    <!-- ============ 学习能力 ============ -->
    <template v-if="tab === 'ability'">
      <div class="note-bar">
        <Icon name="bulb" :size="16" />
        <span>
          六项学习能力每个月评一次，按孩子平时的表现打分，不用和别人比，只和上个月的自己比。{{
            rated ? '这个月已经评过了，可以再改。' : '这个月还没评。'
          }}
        </span>
        <button class="btn btn-xs btn-dark" style="margin-left: auto; flex: none" @click="dialogs.open({ k: 'ability' })">
          <Icon name="edit" :size="13" />{{ rated ? '修改本月评估' : '评一下这个月' }}
        </button>
      </div>

      <div v-if="!ablCur" class="panel">
        <div class="empty">还没有评估记录。点上面「评一下这个月」，花两分钟给六项能力打个分</div>
      </div>

      <template v-else>
        <div class="grid2" style="grid-template-columns: 380px minmax(0, 1fr); margin-bottom: 16px">
          <div class="panel">
            <div class="panel-title">能力画像</div>
            <div class="panel-sub">
              {{ monthText(ablCur.month) }}<template v-if="ablFirst"> · 对比 {{ monthText(ablFirst.month) }}</template>
            </div>
            <ChartBox :draw="drawAbilityRadar" />
            <div class="legend">
              <span><i :style="{ background: kidHexVal }"></i>{{ monthText(ablCur.month) }}</span>
              <span v-if="ablFirst"><i style="background: #b8b7b1"></i>{{ monthText(ablFirst.month) }}</span>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">每项能力的变化</div>
            <div class="panel-sub">1 刚刚起步 · 3 经常做到 · 5 能带动别人</div>
            <ChartBox :draw="drawAbilityLines" />
            <div class="legend">
              <span v-for="(a, i) in ABILITIES" :key="a.id"><i :style="{ background: AB_COLS[i] }"></i>{{ a.t }}</span>
            </div>
            <div v-if="ablCur.note" class="status-card" style="margin-top: 12px">
              <div class="meta">{{ monthText(ablCur.month) }} 的观察</div>{{ ablCur.note }}
            </div>
          </div>
        </div>

        <div class="ab-grid">
          <div v-for="a in ABILITIES" :key="a.id" class="ab-card">
            <div class="h">
              {{ a.t }}
              <span
                v-if="ablPrev && (ablCur.s[a.id] || 0) !== (ablPrev.s[a.id] || 0)"
                :class="(ablCur.s[a.id] || 0) > (ablPrev.s[a.id] || 0) ? 'up' : 'dn'"
                style="font-size: 12px"
              >
                {{ (ablCur.s[a.id] || 0) > (ablPrev.s[a.id] || 0) ? '↑' : '↓' }}
              </span>
              <span class="lv">{{ ablCur.s[a.id] ? ['刚刚起步', '偶尔做到', '经常做到', '稳定做到', '能带动别人'][ablCur.s[a.id] - 1] : '未评' }}</span>
            </div>
            <div class="d">{{ a.d }}</div>
            <div class="lv-dots">
              <i
                v-for="n in [1, 2, 3, 4, 5]"
                :key="n"
                :class="{ on: n <= (ablCur.s[a.id] || 0) }"
                :style="n <= (ablCur.s[a.id] || 0) ? { background: kidHexVal } : ''"
              ></i>
            </div>
            <div class="ab-tip">
              <span v-html="artIcon('spark', 13, '#f2a71b')" style="vertical-align: -2px"></span> {{ a.tip }}
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; display: flex; gap: 8px">
          <button class="btn btn-light" @click="$router.push('/ai?tpl=ability')">
            <Icon name="spark" :size="15" />根据评估给我提升建议
          </button>
        </div>
      </template>
    </template>

    <!-- ============ 学习计划 ============ -->
    <template v-else-if="tab === 'plan'">
      <div class="note-bar">
        <Icon name="cal" :size="16" />
        <span>学习计划会同步到成长日历和书房的软木板上。{{ PLAN_TIP[kid.stage] }}</span>
      </div>
      <div class="sec-h">
        <div class="seg light">
          <button aria-label="上一周" @click="shiftWeek(-1)"><Icon name="back" :size="15" /></button>
          <button :class="{ on: week === 0 }" @click="shiftWeek(0)">
            {{ week === 0 ? '本周' : fmtMD(pmon) + ' 那周' }}
          </button>
          <button aria-label="下一周" @click="shiftWeek(1)"><Icon name="fwd" :size="15" /></button>
        </div>
        <span class="pill">完成 <b class="num">{{ planStat.done }}/{{ planStat.tot }}</b></span>
        <span class="pill">每周固定 {{ weeklyFixed }} 项</span>
        <span class="grow"></span>
      </div>
      <div class="plan-grid">
        <div v-for="c in planCols" :key="c.ds" class="plan-col" :class="{ today: c.today }">
          <div class="h">周{{ '一二三四五六日'[c.i] }}<small>{{ fmtShort(c.ds) }}</small></div>
          <div class="plan-day">
            <button
              v-for="(o, oi) in c.occ"
              :key="o.ds + '-' + oi"
              class="plan-item"
              :class="{ done: o.done }"
              @click="openOcc(o)"
            >
              <b>{{ o.title }}</b>
              <span>{{ o.start }}{{ o.endT ? '–' + o.endT : '' }}</span>
              <i class="ok" @click="toggleOcc(o, $event)">
                <Icon v-if="o.done" name="check" :size="11" :stroke-width="2.4" />
              </i>
            </button>
            <button class="plan-add" @click="addPlan(c.ds)">+ 加计划</button>
          </div>
        </div>
      </div>
      <div v-if="zhiHabits.length" class="panel" style="margin-top: 16px">
        <div class="panel-title">每天的学习习惯</div>
        <div class="panel-sub">在五育打卡里打卡</div>
        <div class="tags">
          <span v-for="x in zhiHabits" :key="x.id" class="tag blue">{{ habitText(x) }} · {{ daysText(x.days) }}</span>
        </div>
      </div>
    </template>

    <!-- ============ 阅读书架 ============ -->
    <template v-else-if="tab === 'books'">
      <div class="stat-row">
        <div class="kpi"><div class="k">本月读完</div><div class="v">{{ doneMonth }}<small>本</small></div></div>
        <div class="kpi">
          <div class="k">本月阅读</div>
          <div class="v">{{ readMin }}<small>分钟</small></div>
          <div class="d muted">来自阅读打卡</div>
        </div>
        <div class="kpi">
          <div class="k">一共读完</div>
          <div class="v">{{ books.filter((b) => b.status === 'done').length }}<small>本</small></div>
        </div>
        <div class="kpi">
          <div class="k">在读 / 想读</div>
          <div class="v">{{ reading.length }}<small>/ {{ want.length }}</small></div>
        </div>
      </div>

      <div class="shelf">
        <template v-for="(r, ri) in shelfRows" :key="ri">
          <div class="shelf-row">
            <button
              v-for="b in r"
              :key="b.id"
              class="book"
              :class="b.status"
              :style="{ height: bookHeight(b) + 'px', background: b.color || '#2f7ff0' }"
              :title="b.title + (b.author ? ' · ' + b.author : '')"
              @click="openBook(b)"
            >
              {{ clip(b.title, 9) }}
              <span v-if="b.status === 'done' && b.rating" class="st">{{ '★'.repeat(b.rating) }}</span>
            </button>
            <button v-if="ri === shelfRows.length - 1" class="book-add" title="添加一本书" @click="openBook()">
              <Icon name="plus" :size="16" />
            </button>
          </div>
          <div class="shelf-board"></div>
        </template>
      </div>

      <div class="grid2" style="margin-top: 16px">
        <div class="panel">
          <div class="panel-title">最近 8 周阅读时长</div>
          <div class="panel-sub">分钟 · 来自阅读打卡</div>
          <ChartBox :draw="drawReadBars" />
        </div>
        <div class="panel">
          <div class="sec-h">
            <div class="panel-title">在读和想读</div>
            <span class="grow"></span>
            <button class="btn btn-xs btn-light" @click="$router.push('/ai?tpl=books')">
              <Icon name="spark" :size="13" />AI 推荐书单
            </button>
          </div>
          <template v-if="reading.length + want.length">
            <button v-for="b in reading.concat(want)" :key="b.id" class="p-row" @click="openBook(b)">
              <i
                :style="{
                  width: '10px',
                  height: '34px',
                  borderRadius: '2px',
                  background: b.color || '#2f7ff0',
                  flex: 'none'
                }"
              ></i>
              <span class="grow"><b style="font-weight: 600">《{{ b.title }}》</b><span>{{ b.author }}</span></span>
              <span class="tag" :class="b.status === 'reading' ? 'blue' : 'gray'">
                {{ b.status === 'reading' ? '在读' : '想读' }}
              </span>
            </button>
          </template>
          <div v-else class="muted" style="font-size: 12.5px">书架上的书都读完了，再添几本吧</div>
        </div>
      </div>
    </template>

    <!-- ============ 学校成绩 ============ -->
    <template v-else>
      <div class="note-bar">
        <Icon name="heart" :size="16" />
        <span>
          成绩只是成长的一面镜子。这里只记孩子自己的分数，看趋势、看努力，不排名、不和别人比。比分数更值得关注的，是学习能力和学习习惯。
        </span>
        <button class="btn btn-xs btn-dark" style="margin-left: auto; flex: none" @click="openExam()">
          <Icon name="plus" :size="13" />记一次考试
        </button>
      </div>

      <div v-if="!exams.length" class="panel">
        <div class="empty">
          {{ kid.stage === 'k' ? '幼儿园阶段没有考试，好好玩就是最好的学习' : '还没有记录' }}
        </div>
      </div>

      <template v-else>
        <div class="grid2" style="grid-template-columns: minmax(0, 1fr) 340px">
          <div class="panel">
            <div class="panel-title">各科得分率变化</div>
            <div class="panel-sub">分数 ÷ 满分</div>
            <ChartBox :draw="drawScoreLines" />
            <div class="legend">
              <span v-for="(s, i) in subjects" :key="s"><i :style="{ background: EX_COLS[i % 9] }"></i>{{ s }}</span>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">怎么看成绩</div>
            <ul style="margin: 8px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.9; color: #333">
              <li>先问孩子自己怎么看，再说家长的看法</li>
              <li>只和孩子自己的上一次比</li>
              <li>错题比分数更有用：哪些是粗心，哪些是没懂</li>
              <li>考好了夸努力和方法，考差了一起找原因</li>
            </ul>
            <button class="btn btn-sm btn-light" style="margin-top: 12px" @click="$router.push('/ai?tpl=exam-talk')">
              <Icon name="spark" :size="14" />考试后怎么和孩子聊
            </button>
          </div>
        </div>

        <div class="tbl-wrap" style="margin-top: 16px">
          <table class="tbl">
            <thead>
              <tr>
                <th>考试</th>
                <th v-for="s in subjects" :key="s" class="c">{{ s }}</th>
                <th>老师说的 / 备注</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in scoreRows" :key="r.e.id">
                <td>
                  <b style="font-weight: 600">{{ r.e.name }}</b><br />
                  <span class="muted num" style="font-size: 12px">{{ r.e.date }}</span>
                </td>
                <td v-for="c in r.cells" :key="c.s" class="c num">
                  <template v-if="c.has">{{ c.score }}<span class="muted" style="font-size: 11px">/{{ c.full }}</span></template>
                  <span v-else class="muted">—</span>
                </td>
                <td class="sub" style="white-space: normal; min-width: 180px">{{ r.e.note }}</td>
                <td class="r"><button class="btn btn-xs btn-ghost" @click="openExam(r.e)">编辑</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.plan-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.plan-col {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 0 0 1px var(--line);
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 240px;
  &.today {
    box-shadow: 0 0 0 1.5px var(--blue);
  }
  .h {
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 8px;
    small {
      font-weight: 400;
      color: var(--ink3);
      font-family: var(--num);
      font-size: 11.5px;
    }
  }
}
.plan-day {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 180px;
}
.plan-item {
  border-radius: 9px;
  border-left: 3px solid var(--blue);
  background: #eef5fe;
  padding: 6px 8px;
  font-size: 12.5px;
  line-height: 1.35;
  text-align: left;
  width: 100%;
  position: relative;
  &:hover {
    filter: brightness(0.98);
  }
  b {
    display: block;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 18px;
  }
  span {
    font-size: 11px;
    color: var(--ink2);
    font-family: var(--num);
  }
  &.done {
    background: #f0f8f3;
    border-left-color: var(--green);
    b {
      color: var(--ink3);
      text-decoration: line-through;
    }
  }
  .ok {
    position: absolute;
    right: 7px;
    top: 7px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    box-shadow: 0 0 0 1.5px #c9c9c6 inset;
    display: grid;
    place-items: center;
    color: #fff;
  }
  &.done .ok {
    background: var(--green);
    box-shadow: none;
  }
}
.plan-add {
  border: 1.5px dashed var(--line2);
  border-radius: 9px;
  height: 30px;
  color: var(--ink3);
  font-size: 12px;
  display: grid;
  place-items: center;
  margin-top: auto;
  &:hover {
    color: var(--ink);
    border-color: #c9c9c6;
  }
}
.shelf {
  background: linear-gradient(#fbf7f1, #f6efe4);
  border-radius: 16px;
  box-shadow: 0 0 0 1px #ece3d5;
  padding: 18px 18px 0;
}
.shelf-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  min-height: 152px;
  padding: 0 10px;
  position: relative;
  flex-wrap: wrap;
}
.shelf-board {
  height: 12px;
  margin: 0 -18px 18px;
  background: linear-gradient(#e6d7bf, #d8c5a5);
  box-shadow: 0 6px 10px -6px rgba(90, 60, 20, 0.35);
}
.book {
  width: 40px;
  border-radius: 3px 3px 1px 1px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 10px 0;
  box-shadow:
    inset -4px 0 0 rgba(0, 0, 0, 0.1),
    inset 3px 0 0 rgba(255, 255, 255, 0.18);
  transition: transform 0.15s;
  cursor: pointer;
  overflow: hidden;
  &:hover {
    transform: translateY(-6px);
  }
  &.want {
    opacity: 0.5;
  }
  &.reading::after {
    content: '在读';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    writing-mode: horizontal-tb;
    font-size: 9.5px;
    background: rgba(0, 0, 0, 0.25);
    text-align: center;
    letter-spacing: 0;
    padding: 1px 0;
  }
  .st {
    position: absolute;
    bottom: 4px;
    writing-mode: horizontal-tb;
    font-size: 9px;
    letter-spacing: 0;
    opacity: 0.85;
  }
}
.book-add {
  width: 40px;
  height: 120px;
  border-radius: 4px;
  border: 1.5px dashed #d8c5a5;
  color: #a8936e;
  display: grid;
  place-items: center;
  align-self: flex-end;
  &:hover {
    background: rgba(255, 255, 255, 0.6);
  }
}

.ab-tip {
  font-size: 12px;
  color: var(--ink2);
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line2);
  line-height: 1.6;
  :deep(svg) {
    display: inline;
    vertical-align: -2px;
  }
}

@media (max-width: 1200px) {
  .plan-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
